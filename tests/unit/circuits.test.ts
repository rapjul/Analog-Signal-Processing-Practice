import { describe, expect, it } from "vitest";
import {
	type CircuitTopology,
	evaluateBodePoint,
	evaluateTransferFunction,
	generateCircuitProblem,
} from "$lib/math-engine/circuits";
import { tryEvaluateLatexAt } from "$lib/math-engine/evaluator";

describe("Circuit Analysis & Transfer Functions Math Engine (circuits.ts)", () => {
	/** Rounded-equal coefficients must retain the exact formula belonging to each slot. */
	it("does not merge exact coefficients that share a floating-point map key", () => {
		const params = { R: 0.3, L: 0.3, C: 3.3333333333333335 };
		const exact = String.raw`\frac{20000000000000000}{20000000000000001}`;
		const result = evaluateTransferFunction("series-rlc-lpf", params);
		expect(result.numCoeffs).toEqual([1]);
		expect(result.hLatex).toBe(
			String.raw`\frac{${exact}}{s^2 + s + ${exact}}`,
		);
	});
	/** A fixed independent table guards every topology while displays use paired exact coefficients. */
	it.each([
		["series-rlc", [1.5, 0], [1, 1.5, 5]],
		["series-rlc-lpf", [5], [1, 1.5, 5]],
		["series-rlc-hpf", [1, 0, 0], [1, 1.5, 5]],
		["parallel-rlc", [10 / 3, 0], [1, 10 / 3, 5]],
		["parallel-lc-series-r", [1, 0, 5], [1, 10 / 3, 5]],
		["parallel-rc-series-l", [1, 10 / 3, 0], [1, 10 / 3, 5]],
		["rc-lpf", [10 / 3], [1, 10 / 3]],
		["rc-hpf", [1, 0], [1, 10 / 3]],
		["rl-lpf", [1.5], [1, 1.5]],
		["rl-hpf", [1, 0], [1, 1.5]],
		["active-sallen-key", [100 / 9], [1, 20 / 3, 100 / 9]],
		["active-sallen-key-hpf", [1, 0, 0], [1, 20 / 3, 100 / 9]],
		["active-bpf", [-20 / 3, 0], [1, 20 / 3, 100 / 9]],
		["twin-t-notch", [1, 0, 100 / 9], [1, 40 / 3, 100 / 9]],
		["active-integrator", [-10 / 3], [1, 0]],
		["active-differentiator", [-0.3, 0], [1]],
	] satisfies [CircuitTopology, number[], number[]][])(
		"preserves coefficients and exact display for %s",
		/**
		 * @param topology - Supported topology under verification.
		 * @param numerator - Independent expected numerator coefficients.
		 * @param denominator - Independent expected denominator coefficients.
		 * @returns Nothing after checking both numeric and analytical outputs.
		 */
		(topology, numerator, denominator) => {
			const result = evaluateTransferFunction(topology, {
				R: 3,
				L: 2,
				C: 0.1,
			});
			for (const [actual, expected] of [
				[result.numCoeffs, numerator],
				[result.denCoeffs, denominator],
			] as const) {
				expect(actual).toHaveLength(expected.length);
				for (const [index, coefficient] of expected.entries())
					expect(actual[index]).toBeCloseTo(coefficient, 12);
			}
			for (const s of [0.3, 1, 2.7]) {
				/**
				 * @param coefficients - Descending independently specified coefficients.
				 * @returns Polynomial value at the current sample.
				 */
				const polynomial = (coefficients: number[]) =>
					coefficients.reduce(
						(sum, coefficient) => sum * s + coefficient,
						0,
					);
				expect(tryEvaluateLatexAt(result.hLatex, s)).toBeCloseTo(
					polynomial(numerator) / polynomial(denominator),
					10,
				);
			}
		},
	);
	describe("Expanded Circuit Topologies Transfer Functions H(s)", () => {
		it("should calculate Series RLC Bandpass transfer function H(s)", () => {
			const tf = evaluateTransferFunction("series-rlc", {
				R: 10,
				L: 1,
				C: 0.01,
			});
			expect(tf.numCoeffs).toEqual([10, 0]);
			expect(tf.denCoeffs).toEqual([1, 10, 100]);
		});

		it("should calculate 1st-Order RC Lowpass Filter H(s)", () => {
			const tf = evaluateTransferFunction("rc-lpf", { R: 1000, C: 1e-6 });
			expect(tf.numCoeffs).toEqual([1000]);
			expect(tf.denCoeffs).toEqual([1, 1000]);
		});

		it("should calculate 1st-Order RC Highpass Filter H(s)", () => {
			const tf = evaluateTransferFunction("rc-hpf", { R: 1000, C: 1e-6 });
			expect(tf.numCoeffs).toEqual([1, 0]);
			expect(tf.denCoeffs).toEqual([1, 1000]);
		});

		it("should calculate Active Op-Amp Integrator transfer function H(s)", () => {
			const tf = evaluateTransferFunction("active-integrator", {
				R: 1000,
				C: 1e-6,
			});
			expect(tf.numCoeffs).toEqual([-1000]);
			expect(tf.denCoeffs).toEqual([1, 0]);
			expect(tf.hLatex).toContain("-\\frac{1000}{s}");
		});
	});

	describe("Bode Plot Magnitude |H(jw)| dB & Phase Angle Evaluation", () => {
		it("should evaluate Bode magnitude and phase for RC LPF at corner frequency w_c = 1000 rad/s", () => {
			const point = evaluateBodePoint(
				"rc-lpf",
				{ R: 1000, C: 1e-6 },
				1000,
			);
			expect(point.magnitudeDb).toBeCloseTo(-3.01, 1);
			expect(point.phaseDeg).toBeCloseTo(-45, 1);
		});
	});

	describe("Circuit Practice Problem Generator", () => {
		it("should generate dynamic practice problems with circuit schematic parameters", () => {
			const problem1 = generateCircuitProblem("series-rlc");
			const problem2 = generateCircuitProblem("rc-hpf");

			expect(problem1.id).toBeDefined();
			expect(problem1.promptLatex).toContain("H(s)");
			expect(problem1.solutionSteps.length).toBeGreaterThanOrEqual(2);

			expect(problem2.id).toBeDefined();
			expect(problem2.promptLatex).toContain("High-Pass Filter");
		});
	});
});
