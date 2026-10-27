import { fraction } from "$lib/math-engine/laplace/algebra";
import { completionZeros } from "$lib/math-engine/laplace/completion";
import { fractionLatex } from "$lib/math-engine/laplace/pfd";
import { evaluateResponse } from "$lib/math-engine/laplace/signals";
import { collectTerms } from "$lib/math-engine/laplace/transform";
import type {
	LaplaceExercise,
	LaplaceFactor,
} from "$lib/math-engine/laplace/types";

/** One accessible root marker in the completed s-plane. */
export interface LaplaceRootMarker {
	/** Horizontal SVG coordinate. */ x: number;
	/** Vertical SVG coordinate. */ y: number;
	/** Mathematical root and multiplicity. */ label: string;
	/** Marker classification. */ kind: "pole" | "zero" | "canceled";
}

/** One ordinary-response sample belonging to an open support interval. */
interface ResponseSample {
	/** Actual evaluation time. */ t: number;
	/** Regular response, excluding distributions. */ value: number;
	/** Interval identity; paths never bridge different support intervals. */ interval: number;
}

/** @param problem - Verified response. @param min - Plot window start. @param max - Plot window end. @returns Uniform and one-sided interior samples on every distinct support interval. */
function responseSamples(
	problem: LaplaceExercise,
	min: number,
	max: number,
): ResponseSample[] {
	const boundaries = [
		...new Set([
			min,
			max,
			...problem.terms
				.filter((term) => term.kind !== "impulse")
				.map((term) => fraction(term.delay).toNumber()),
		]),
	]
		.filter((time) => time >= min && time <= max)
		.sort((a, b) => a - b);
	const uniform = Array.from(
		{ length: 241 },
		(_entry, index) => min + ((max - min) * index) / 240,
	);
	return boundaries.slice(0, -1).flatMap((left, interval) => {
		const right = boundaries[interval + 1]!;
		const width = right - left;
		const inset = Math.min(width / 4, (max - min) / 24000);
		const times = [
			...new Set([
				...uniform.filter((time) => time > left && time < right),
				left + inset,
				left + width / 2,
				right - inset,
				...(left === min ? [min] : []),
				...(right === max ? [max] : []),
			]),
		].sort((a, b) => a - b);
		return times.map((t) => ({
			t,
			value: evaluateResponse(problem.terms, t),
			interval,
		}));
	});
}

/** @param problem - Completed exercise. @returns Finite SVG paths, root markers, and exact impulse metadata. */
export function laplacePlot(problem: LaplaceExercise) {
	const maxDelay = Math.max(
		0,
		...problem.terms.map((term) => fraction(term.delay).toNumber()),
	);
	const min = -2,
		max = maxDelay + 4;
	/** @param t - Time coordinate. @returns Horizontal response-plot coordinate. */
	const timeX = (t: number): number => 20 + (280 * (t - min)) / (max - min);
	const samples = responseSamples(problem, min, max);
	const finite = samples.filter((point) => Number.isFinite(point.value));
	const peak = Math.max(1, ...finite.map((point) => Math.abs(point.value)));
	let path = "",
		open = false,
		previousInterval = -1;
	for (const sample of samples) {
		if (!Number.isFinite(sample.value)) {
			open = false;
			continue;
		}
		if (sample.interval !== previousInterval) open = false;
		path += `${open ? "L" : "M"}${timeX(sample.t).toFixed(2)},${(80 - (55 * sample.value) / peak).toFixed(2)} `;
		open = true;
		previousInterval = sample.interval;
	}
	const zeroInfo = completionZeros(problem);
	const zeros = zeroInfo.factors;
	const all = [...problem.poles, ...problem.canceled, ...zeros];
	const realScale = Math.max(
		1,
		...all.map((factor) => Math.abs(fraction(factor.real).toNumber())),
	);
	const imaginaryScale = Math.max(
		1,
		...all.map((factor) => fraction(factor.frequency).toNumber()),
	);
	/** @param value - Real coordinate. @returns Horizontal s-plane coordinate. */
	const realX = (value: number): number =>
		Math.max(20, Math.min(300, 160 + (125 * value) / realScale));
	/** @param factors - Root factors. @param kind - Marker kind. @returns Both conjugate markers where needed. */
	const markers = (
		factors: LaplaceFactor[],
		kind: LaplaceRootMarker["kind"],
	): LaplaceRootMarker[] =>
		factors.flatMap((factor) => {
			const real = fraction(factor.real).toNumber(),
				frequency = fraction(factor.frequency).toNumber();
			return (frequency ? [-frequency, frequency] : [0]).map(
				(imaginary) => ({
					x: realX(real),
					y: 80 - (50 * imaginary) / imaginaryScale,
					label: `${kind === "canceled" ? "removed factor copies" : kind}: ${factor.real}${imaginary ? ` ${imaginary < 0 ? "-" : "+"} j${factor.frequency}` : ""}, ${kind === "canceled" ? "removed" : "surviving"} multiplicity ${factor.multiplicity}`,
					kind,
				}),
			);
		});
	return {
		samples,
		zeroInfo,
		path,
		min,
		max,
		peak,
		omitted: finite.length !== samples.length,
		roots: [
			...markers(problem.poles, "pole"),
			...markers(zeros, "zero"),
			...markers(problem.canceled, "canceled"),
		],
		rocLeft: realX(problem.roc[0]),
		rocRight: realX(problem.roc[1]),
		impulses: collectTerms(problem.terms)
			.filter((term) => term.kind === "impulse")
			.map((term) => ({
				x: timeX(fraction(term.delay).toNumber()),
				direction:
					fractionLatex(term.amplitude).numerator < 0n ? -1 : 1,
				label: `At t=${term.delay}: impulse weight ${term.amplitude}`,
			})),
	};
}
