import { fraction } from "$lib/math-engine/laplace/algebra";
import { decompose } from "$lib/math-engine/laplace/pfd";
import { evaluateResponse } from "$lib/math-engine/laplace/signals";
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
	const samples = Array.from({ length: 241 }, (_, index) => {
		const t = min + ((max - min) * index) / 240;
		return { t, value: evaluateResponse(problem.terms, t) };
	});
	const finite = samples.filter((point) => Number.isFinite(point.value));
	const peak = Math.max(1, ...finite.map((point) => Math.abs(point.value)));
	let path = "",
		open = false,
		previous = min;
	for (const sample of samples) {
		const crossesBoundary = problem.terms.some((term) => {
			const delay = fraction(term.delay).toNumber();
			return previous < delay && sample.t >= delay;
		});
		if (!Number.isFinite(sample.value)) {
			open = false;
			continue;
		}
		if (crossesBoundary) open = false;
		path += `${open ? "L" : "M"}${timeX(sample.t).toFixed(2)},${(80 - (55 * sample.value) / peak).toFixed(2)} `;
		open = true;
		previous = sample.t;
	}
	const zeros =
		problem.spec.workflow === "inverse" || problem.spec.workflow === "roc"
			? decompose(problem.spec.rational).zeros
			: [];
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
					label: `${kind}: ${factor.real}${imaginary ? ` ${imaginary < 0 ? "-" : "+"} j${factor.frequency}` : ""}, multiplicity ${factor.multiplicity}`,
					kind,
				}),
			);
		});
	return {
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
		impulses: problem.terms
			.filter((term) => term.kind === "impulse")
			.map((term) => ({
				x: timeX(fraction(term.delay).toNumber()),
				label: `At t=${term.delay}: impulse weight ${term.amplitude}`,
			})),
	};
}
