/** Exact configured examples and coherent seven-step scaffold regressions. */
import { describe, expect, it } from "vitest";
import {
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION as base,
	CONVOLUTION_SIGNAL_TYPES,
	type ConvolutionSignalType,
	generateConfiguredConvolutionProblem,
	type ResolvedConvolutionSignal,
	resolveConvolutionSignal,
	solveConfiguredConvolution,
} from "$lib/math-engine/convolution/index";
import {
	formatConvolutionPiecewiseLatex,
	getFiniteConvolutionTransitionTimes,
} from "$lib/math-engine/convolution/its-scaffolding/index";

/**
 * Obtains a concrete supported width or rate without duplicating signal formulas.
 * @param kind - Explicit signal family.
 * @param parameter - Required width or decay rate from the supported domain.
 * @returns The production resolver's concrete signal.
 */
function signal(
	kind: ConvolutionSignalType,
	parameter: number,
): ResolvedConvolutionSignal {
	for (let seed = 0; seed < 100; seed++) {
		const resolved = resolveConvolutionSignal(
			{ ...base, type: kind, parameterMode: "random" },
			seed,
			"x",
		);
		if (resolved.parameter === parameter) return resolved;
	}
	throw new Error(
		"Expected a supported width or rate in the deterministic sample.",
	);
}

describe("configured convolution examples", () => {
	/** The half-open rectangle convention agrees with the signal statement. */
	it("evaluates rectangle, triangle, and causal exponential primitives", () => {
		const rect = signal("rect", 2);
		expect([rect.eval(-1), rect.eval(0), rect.eval(1)]).toEqual([1, 1, 0]);
		const triangle = signal("triangle", 2);
		expect([
			triangle.eval(-1),
			triangle.eval(0),
			triangle.eval(0.5),
			triangle.eval(1),
		]).toEqual([0, 1, 0.5, 0]);
		const exponential = signal("exponential", 2);
		expect(exponential.eval(-1)).toBe(0);
		expect(exponential.eval(0)).toBe(1);
		expect(exponential.eval(1)).toBeCloseTo(Math.exp(-2), 12);
	});

	/** Equal rectangles produce a triangle, while unequal widths produce a plateau. */
	it("solves equal and unequal width rectangles exactly", () => {
		const equal = solveConfiguredConvolution({
			x: signal("rect", 2),
			h: signal("rect", 2),
		});
		for (const time of [-3, -2, -1, 0, 1, 2, 3])
			expect(equal.eval(time)).toBeCloseTo(
				Math.max(0, 2 - Math.abs(time)),
				12,
			);
		const unequal = solveConfiguredConvolution({
			x: signal("rect", 1),
			h: signal("rect", 3),
		});
		expect(unequal.eval(-1.5)).toBeCloseTo(0.5, 12);
		expect(unequal.eval(0)).toBeCloseTo(1, 12);
		expect(unequal.eval(1.5)).toBeCloseTo(0.5, 12);
		expect(unequal.eval(3)).toBe(0);
	});

	/** Triangle integration retains its apex and cubic symmetry. */
	it("solves triangle-rectangle and triangle-triangle examples", () => {
		const triangle = signal("triangle", 2);
		const rect = solveConfiguredConvolution({
			x: triangle,
			h: signal("rect", 1),
		});
		expect(rect.eval(0)).toBeCloseTo(0.75, 12);
		expect(rect.eval(-1)).toBeCloseTo(0.125, 12);
		expect(rect.eval(1)).toBeCloseTo(0.125, 12);
		const cubic = solveConfiguredConvolution({ x: triangle, h: triangle });
		expect(cubic.eval(0)).toBeCloseTo(2 / 3, 12);
		expect(cubic.eval(1.5)).toBeCloseTo(1 / 48, 12);
		expect(cubic.eval(-1.5)).toBeCloseTo(cubic.eval(1.5), 12);
		expect(cubic.eval(2)).toBe(0);
	});

	/** Causal exponentials keep their complete tails for equal and unequal rates. */
	it("solves rectangle-exponential and exponential pairs exactly", () => {
		const exponential = signal("exponential", 1);
		const rectangle = solveConfiguredConvolution({
			x: signal("rect", 2),
			h: exponential,
		});
		expect(rectangle.eval(0)).toBeCloseTo(1 - Math.exp(-1), 12);
		expect(rectangle.eval(3)).toBeCloseTo(Math.exp(-2) - Math.exp(-4), 12);
		const unequal = solveConfiguredConvolution({
			x: exponential,
			h: signal("exponential", 2),
		});
		const equal = solveConfiguredConvolution({
			x: exponential,
			h: exponential,
		});
		for (const time of [0, 1, 2, 12]) {
			expect(unequal.eval(time)).toBeCloseTo(
				Math.exp(-time) - Math.exp(-2 * time),
				12,
			);
			expect(equal.eval(time)).toBeCloseTo(time * Math.exp(-time), 12);
		}
	});

	for (const x of CONVOLUTION_SIGNAL_TYPES)
		for (const h of CONVOLUTION_SIGNAL_TYPES) {
			/** Generated tutor parts correspond to complete, concrete mathematical intervals. */
			it(`builds a reproducible complete scaffold for ${x} * ${h}`, () => {
				const selection = {
					x: { ...base, type: x },
					h: { ...base, type: h },
				};
				const first = generateConfiguredConvolutionProblem(selection, {
					seed: 42,
				});
				const second = generateConfiguredConvolutionProblem(selection, {
					seed: 42,
				});
				expect(second.id).toBe(first.id);
				expect(second.itsData).toEqual(first.itsData);
				expect(first.itsData.step1.parts).toHaveLength(3);
				expect(first.itsData.step2.options).toHaveLength(4);
				expect(
					first.itsData.step2.options.filter(
						/** @param option - Definition choice. @returns Whether it is correct. */ (
							option,
						) => option.isCorrect,
					),
				).toHaveLength(1);
				expect(first.itsData.step4.intervalBoundaries).toEqual(
					getFiniteConvolutionTransitionTimes(first.intervals),
				);
				expect(first.itsData.step5.parts).toHaveLength(
					first.intervals.length,
				);
				expect(first.itsData.step6.parts).toHaveLength(
					first.intervals.length,
				);
				expect(first.itsData.step7.resultLatex).toBe(
					formatConvolutionPiecewiseLatex(first.intervals),
				);
				for (const [index, interval] of first.intervals.entries()) {
					const evaluation = first.itsData.step6.parts[index]!;
					expect(evaluation.carriedZero).toBe(
						interval.hasGeometricOverlap === false,
					);
					for (const moving of ["x", "h"] as const) {
						const terms = evaluation.evaluationBySignal![moving];
						if (interval.hasGeometricOverlap) {
							expect(terms.length).toBeGreaterThan(0);
							for (const term of terms)
								expect(term.primitiveLatex).toContain("F(");
						} else expect(terms).toHaveLength(0);
					}
				}
			});
		}
});
