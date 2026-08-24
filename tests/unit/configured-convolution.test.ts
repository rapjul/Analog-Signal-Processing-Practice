import { describe, expect, it } from "vitest";
import {
	CONVOLUTION_SIGNAL_TYPES,
	type ConvolutionProblemSelection,
	type ConvolutionSignalSelection,
	type ConvolutionSignalType,
	DEFAULT_CONVOLUTION_SIGNAL_SELECTION,
	generateConfiguredConvolutionProblem,
	type ResolvedConvolutionSignal,
	resolveConvolutionSelection,
	resolveConvolutionSignal,
	solveConfiguredConvolution,
} from "$lib/math-engine/convolution/index";

function selection(
	type: ConvolutionSignalType,
	overrides: Partial<ConvolutionSignalSelection> = {},
): ConvolutionSignalSelection {
	return {
		...DEFAULT_CONVOLUTION_SIGNAL_SELECTION,
		componentAmplitudes: ["default", "default"],
		type,
		...overrides,
	};
}

function numericalConvolution(
	x: ResolvedConvolutionSignal,
	h: ResolvedConvolutionSignal,
	time: number,
): number {
	const min = -18;
	const max = 18;
	const count = 36_000;
	const step = (max - min) / count;
	let total = 0;
	for (let index = 0; index < count; index += 1) {
		const tau = min + (index + 0.5) * step;
		total += x.eval(tau) * h.eval(time - tau);
	}
	return total * step;
}

describe("independently configured convolution signals", () => {
	it("keeps the textbook default as two unshifted unit rectangles", () => {
		const problem = generateConfiguredConvolutionProblem(undefined, {
			seed: 9,
		});
		expect(problem.resolvedSignals?.x).toMatchObject({
			kind: "rect",
			parameter: 1,
			shift: 0,
			amplitude: 1,
		});
		expect(problem.resolvedSignals?.h).toMatchObject({
			kind: "rect",
			parameter: 1,
			shift: 0,
			amplitude: 1,
		});
		expect(problem.eval(0)).toBeCloseTo(1);
		expect(problem.eval(1)).toBeCloseTo(0);
	});

	it("solves every ordered signal-type combination and matches quadrature", () => {
		for (const xType of CONVOLUTION_SIGNAL_TYPES) {
			for (const hType of CONVOLUTION_SIGNAL_TYPES) {
				const configured: ConvolutionProblemSelection = {
					x: selection(xType),
					h: selection(hType),
				};
				const resolved = resolveConvolutionSelection(configured, 41);
				const result = solveConfiguredConvolution(resolved);
				for (const time of [-1.25, 0.25, 1.75]) {
					expect(
						result.eval(time),
						`${xType} * ${hType} at ${time}`,
					).toBeCloseTo(
						numericalConvolution(resolved.x, resolved.h, time),
						2,
					);
				}
			}
		}
	});

	it("is commutative for shifted, random-width, signed signals", () => {
		const configured: ConvolutionProblemSelection = {
			x: selection("triangle", {
				parameterMode: "random",
				amplitude: "-2",
				shiftState: "shifted",
				shiftValue: "-3",
			}),
			h: selection("multi_rect", {
				parameterMode: "random",
				componentAmplitudes: ["3", "-1"],
				shiftState: "shifted",
				shiftValue: "2",
			}),
		};
		const forward = solveConfiguredConvolution(
			resolveConvolutionSelection(configured, 77),
		);
		const reverse = solveConfiguredConvolution(
			resolveConvolutionSelection(
				{ x: configured.h, h: configured.x },
				77,
			),
		);
		for (const time of [-5, -1.25, 0, 2.75, 6])
			expect(forward.eval(time)).toBeCloseTo(reverse.eval(time), 8);
	});

	it("resolves every random field deterministically and within its domain", () => {
		const random: ConvolutionSignalSelection = {
			type: "random",
			parameterMode: "random",
			amplitude: "random_signed",
			componentAmplitudes: ["random_signed", "random_signed"],
			shiftState: "random",
			shiftValue: "random_signed",
		};
		const seenTypes = new Set<ConvolutionSignalType>();
		const seenSigns = new Set<number>();
		for (let seed = 0; seed < 200; seed += 1) {
			const first = resolveConvolutionSignal(random, seed, "x");
			const second = resolveConvolutionSignal(random, seed, "x");
			expect(second.kind).toBe(first.kind);
			expect(second.parameter).toBe(first.parameter);
			expect(second.shift).toBe(first.shift);
			expect(second.amplitude).toBe(first.amplitude);
			expect(second.componentAmplitudes).toEqual(
				first.componentAmplitudes,
			);
			expect(first.parameter).toBeGreaterThanOrEqual(1);
			expect(first.parameter).toBeLessThanOrEqual(3);
			expect(Math.abs(first.shift)).toBeLessThanOrEqual(5);
			seenTypes.add(first.kind);
			seenSigns.add(Math.sign(first.amplitude));
		}
		expect(seenTypes).toEqual(new Set(CONVOLUTION_SIGNAL_TYPES));
		expect(seenSigns).toEqual(new Set([-1, 1]));
	});

	it("honors exact signed amplitudes and directional shift choices", () => {
		const negative = resolveConvolutionSignal(
			selection("rect", {
				amplitude: "-3",
				shiftState: "shifted",
				shiftValue: "random_negative",
			}),
			22,
			"x",
		);
		const positive = resolveConvolutionSignal(
			selection("exponential", {
				amplitude: "2",
				shiftState: "shifted",
				shiftValue: "random_positive",
			}),
			22,
			"h",
		);
		expect(negative.amplitude).toBe(-3);
		expect(negative.shift).toBeLessThan(0);
		expect(positive.amplitude).toBe(2);
		expect(positive.shift).toBeGreaterThan(0);
	});

	it("uses the textbook unit triangle with base width two", () => {
		const triangle = resolveConvolutionSignal(
			selection("triangle"),
			0,
			"x",
		);
		expect(triangle.parameter).toBe(2);
		expect(triangle.breakpoints).toEqual([-1, 0, 1]);
		expect(triangle.latex).toBe("\\Delta\\left(t\\right)");
		expect(triangle.eval(-1)).toBe(0);
		expect(triangle.eval(0)).toBe(1);
		expect(triangle.eval(0.5)).toBe(0.5);
	});

	it("retains geometric overlap across signed component contributions", () => {
		const resolved = resolveConvolutionSelection(
			{
				x: selection("multi_rect", {
					componentAmplitudes: ["1", "-1"],
				}),
				h: selection("rect", { parameterMode: "random" }),
			},
			2,
		);
		const result = solveConfiguredConvolution(resolved);
		const signedOverlap = result.intervals.filter(
			(interval) => interval.hasGeometricOverlap,
		);
		expect(signedOverlap.length).toBeGreaterThan(1);
		expect(
			signedOverlap.some((interval) => interval.exprLatex.includes("-")),
		).toBe(true);
	});

	it("handles equal and unequal exponential decay rates with signed scaling", () => {
		const equal = resolveConvolutionSelection(
			{
				x: selection("exponential", { amplitude: "-2" }),
				h: selection("exponential", { amplitude: "3" }),
			},
			1,
		);
		const equalResult = solveConfiguredConvolution(equal);
		expect(equalResult.eval(1)).toBeCloseTo(-6 / Math.E);

		const unequal = resolveConvolutionSelection(
			{
				x: selection("exponential", { parameterMode: "random" }),
				h: selection("exponential"),
			},
			4,
		);
		const unequalResult = solveConfiguredConvolution(unequal);
		expect(unequal.x.parameter).not.toBe(unequal.h.parameter);
		expect(unequalResult.eval(2)).toBeCloseTo(
			numericalConvolution(unequal.x, unequal.h, 2),
			3,
		);
	});
});
