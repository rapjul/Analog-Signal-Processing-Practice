import {
	evaluateBodePoint,
	evaluateTransferFunction,
	generateCircuitProblem,
} from "$lib/math-engine/circuits";
import { describe, expect, it } from "vitest";

describe("Circuit Analysis & Transfer Functions Math Engine (circuits.ts)", () => {
	describe("Expanded Circuit Topologies Transfer Functions H(s)", () => {
		it("should calculate Series RLC Bandpass transfer function H(s)", () => {
			const tf = evaluateTransferFunction("series-rlc", { R: 10, L: 1, C: 0.01 });
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
			const tf = evaluateTransferFunction("active-integrator", { R: 1000, C: 1e-6 });
			expect(tf.numCoeffs).toEqual([-1000]);
			expect(tf.denCoeffs).toEqual([1, 0]);
			expect(tf.hLatex).toContain("-\\frac{1000}{s}");
		});
	});

	describe("Bode Plot Magnitude |H(jw)| dB & Phase Angle Evaluation", () => {
		it("should evaluate Bode magnitude and phase for RC LPF at corner frequency w_c = 1000 rad/s", () => {
			const point = evaluateBodePoint("rc-lpf", { R: 1000, C: 1e-6 }, 1000);
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

