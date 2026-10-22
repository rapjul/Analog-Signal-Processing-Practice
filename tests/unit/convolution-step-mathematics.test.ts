/** Independent mathematical checks for configured finite and causal signals. */
import { describe, expect, it } from "vitest";
import {
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION as base,
	CONVOLUTION_SIGNAL_TYPES,
	generateConfiguredConvolutionProblem,
	type ResolvedConvolutionSelection,
	resolveConvolutionSelection,
	resolveConvolutionSignal,
	solveConfiguredConvolution,
} from "$lib/math-engine/convolution/index";
import {
	evaluateMathJsonStrict,
	parseStrictLatex,
	tryEvaluateLatexAt,
} from "$lib/math-engine/evaluator";

/**
 * Integrates the actual signal product with Simpson quadrature at every change.
 * @param signals - Concrete signals, independent of analytical interval metadata.
 * @param time - Output time.
 * @returns Integral over the complete, finite overlap at this output time.
 */
function quadrature(
	signals: ResolvedConvolutionSelection,
	time: number,
): number {
	const { x, h } = signals;
	const lower = Math.max(x.sections[0]!.start, time - h.sections.at(-1)!.end);
	const upper = Math.min(x.sections.at(-1)!.end, time - h.sections[0]!.start);
	if (lower >= upper) return 0;
	const boundaries = [
		...new Set([
			lower,
			upper,
			...x.breakpoints,
			...h.breakpoints.map(
				/** @param point - Original moving breakpoint. @returns Its transformed position. */
				(point) => time - point,
			),
		]),
	]
		.filter(
			/** @param point - Candidate cut. @returns Whether it lies in the overlap. */
			(point) => point >= lower && point <= upper,
		)
		.sort(
			/** @param a - First cut. @param b - Second cut. @returns Ascending order. */ (
				a,
				b,
			) => a - b,
		);
	let total = 0;
	for (let part = 1; part < boundaries.length; part++) {
		const start = boundaries[part - 1]!;
		const end = boundaries[part]!;
		const count = 512;
		const width = (end - start) / count;
		for (let index = 0; index <= count; index++) {
			// One-sided endpoints avoid crossing discontinuities between segments.
			const tau =
				index === 0
					? start + width * 1e-8
					: index === count
						? end - width * 1e-8
						: start + width * index;
			const weight =
				index === 0 || index === count ? 1 : index % 2 === 0 ? 2 : 4;
			total += (weight * x.eval(tau) * h.eval(time - tau) * width) / 3;
		}
	}
	return total;
}

describe("configured causal step mathematics", () => {
	/** A step has no random width or decay and uses the declared endpoint convention. */
	it("resolves a signed shifted step as a causal constant piece", () => {
		const step = resolveConvolutionSignal(
			{
				...base,
				type: "step",
				parameterMode: "random",
				amplitude: "-3",
				shiftState: "shifted",
				shiftValue: "2",
			},
			17,
			"x",
		);
		expect(step).toMatchObject({
			kind: "step",
			parameter: 1,
			shift: 2,
			amplitude: -3,
			breakpoints: [2],
			pieces: [{ start: 2, end: Infinity, coefficients: [-3, 0] }],
		});
		expect(step.eval(1.99)).toBe(0);
		expect(step.eval(2)).toBe(-3);
		expect(step.eval(100)).toBe(-3);
	});

	/** Independent known formulas cover ramps, plateaus, and exponential approach. */
	it("matches signed translated textbook step formulas", () => {
		const step = {
			...base,
			type: "step" as const,
			amplitude: "-2" as const,
			shiftState: "shifted" as const,
			shiftValue: "2" as const,
		};
		const ramp = generateConfiguredConvolutionProblem({
			x: step,
			h: {
				...base,
				type: "step",
				amplitude: "3",
				shiftState: "shifted",
				shiftValue: "-1",
			},
		});
		const rectangle = generateConfiguredConvolutionProblem({
			x: step,
			h: base,
		});
		const exponential = generateConfiguredConvolutionProblem({
			x: step,
			h: { ...base, type: "exponential" },
		});
		for (const time of [-2, 1, 1.75, 2.25, 3, 8]) {
			expect(ramp.eval(time)).toBeCloseTo(-6 * Math.max(0, time - 1), 10);
			expect(rectangle.eval(time)).toBeCloseTo(
				-2 * Math.min(1, Math.max(0, time - 1.5)),
				10,
			);
			expect(exponential.eval(time)).toBeCloseTo(
				time < 2 ? 0 : -2 * (1 - Math.exp(-(time - 2))),
				10,
			);
		}
	});

	for (const x of CONVOLUTION_SIGNAL_TYPES)
		for (const h of CONVOLUTION_SIGNAL_TYPES) {
			/** Compare both teaching paths and output against an independent integral. */
			it(`checks signed shifted ${x} * ${h} against quadrature and continuity`, () => {
				for (const seed of [7, 41]) {
					const problem = generateConfiguredConvolutionProblem(
						{
							x: {
								...base,
								type: x,
								parameterMode: "random",
								amplitude: "-2",
								componentAmplitudes: ["3", "-1"],
								shiftState: "shifted",
								shiftValue: "-3",
							},
							h: {
								...base,
								type: h,
								parameterMode: "random",
								amplitude: "3",
								componentAmplitudes: ["-2", "1"],
								shiftState: "shifted",
								shiftValue: "2",
							},
						},
						{ seed },
					);
					const signals = problem.resolvedSignals!;
					const reversed = solveConfiguredConvolution({
						x: signals.h,
						h: signals.x,
					});
					for (const [
						index,
						interval,
					] of problem.intervals.entries()) {
						const time = Number.isFinite(interval.min)
							? Number.isFinite(interval.max)
								? (interval.min + interval.max) / 2
								: interval.min + 3
							: interval.max - 1;
						const numeric = quadrature(signals, time);
						expect(problem.eval(time)).toBeCloseTo(numeric, 5);
						expect(reversed.eval(time)).toBeCloseTo(
							problem.eval(time),
							8,
						);
						expect(
							tryEvaluateLatexAt(interval.exprLatex, time),
						).toBeCloseTo(numeric, 5);
						for (const moving of ["x", "h"] as const) {
							const terms =
								problem.itsData.step6.parts[index]!
									.evaluationBySignal![moving];
							let sum = 0;
							for (const term of terms) {
								const lower = tryEvaluateLatexAt(
									term.lowerLatex,
									time,
								)!;
								const upper = tryEvaluateLatexAt(
									term.upperLatex,
									time,
								)!;
								const tau = (lower + upper) / 2;
								const fixed =
									moving === "x" ? signals.h : signals.x;
								const shifted = signals[moving];
								expect(
									evaluateMathJsonStrict(
										parseStrictLatex(term.fixedPieceLatex),
										{ t: time, tau },
									),
								).toBeCloseTo(fixed.eval(tau), 8);
								expect(
									evaluateMathJsonStrict(
										parseStrictLatex(term.movingPieceLatex),
										{ t: time, tau },
									),
								).toBeCloseTo(shifted.eval(time - tau), 8);
								sum += tryEvaluateLatexAt(
									term.differenceLatex,
									time,
								)!;
							}
							expect(sum).toBeCloseTo(numeric, 5);
						}
						if (Number.isFinite(interval.max)) {
							expect(
								problem.eval(interval.max - 1e-7),
							).toBeCloseTo(problem.eval(interval.max + 1e-7), 4);
						}
					}
				}
			}, 30_000);
		}
});
