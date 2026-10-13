import { describe, expect, it } from "vitest";
import {
	type CircuitTopology,
	circuitUsesInductor,
	createCircuitProblem,
	evaluateTransferFunction,
} from "$lib/math-engine/circuits";
import { tryEvaluateLatexAt } from "$lib/math-engine/evaluator";
import { CIRCUITS_EXAM_BANK } from "$lib/problems/bank/circuits-bank";

describe("circuit practice model", () => {
	/** Analytical coefficients must come from exact decimal arithmetic while plots retain numbers. */
	it("renders exact fractions for decimal slider values", () => {
		const tf = evaluateTransferFunction("series-rlc", {
			R: 10,
			L: 1,
			C: 0.003,
		});
		expect(tf.hLatex).toContain(String.raw`\frac{1000}{3}`);
		expect(tf.hLatex).not.toContain("333.333");
		expect(tf.denCoeffs[2]).toBeCloseTo(1000 / 3, 12);
		const active = evaluateTransferFunction("active-sallen-key", {
			R: 199,
			L: 0,
			C: 0.099,
		});
		expect(active.hLatex).toContain(String.raw`\frac{1000000}{388129401}`);
	});
	/** Unused inputs must not participate in validation or analytical display. */
	it("ignores unused components and omits them from worked steps", () => {
		const rc = createCircuitProblem("rc-lpf", { R: 10, L: 0, C: 0.003 });
		expect(rc.solutionSteps[0]?.latex).not.toContain("Z_L");
		expect(rc.promptLatex).not.toContain("L =");
		const rl = createCircuitProblem("rl-lpf", {
			R: 10,
			L: 1,
			C: Number.NaN,
		});
		expect(rl.solutionSteps[0]?.latex).not.toContain("Z_C");
		expect(rl.promptLatex).not.toContain("C =");
	});
	/** Regeneration and sliders must build equivalent transfer functions for their component model. */
	it("builds all currently exposed circuit families from one component set", () => {
		for (const topology of [
			"series-rlc",
			"parallel-rlc",
			"parallel-lc-series-r",
			"parallel-rc-series-l",
			"rc-lpf",
			"active-sallen-key",
		] as CircuitTopology[]) {
			const components = { R: 200, L: 2, C: 0.05 };
			const problem = createCircuitProblem(topology, components);
			expect(problem.components).toEqual(components);
			expect(problem.promptLatex).toContain("R = 200");
			expect(problem.promptLatex.includes("L =")).toBe(
				circuitUsesInductor(topology),
			);
			expect(problem.referenceAnswerLatex).toBe(
				evaluateTransferFunction(topology, components).hLatex,
			);
		}
		for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
			expect(() =>
				createCircuitProblem("series-rlc", { R: value, L: 1, C: 0.01 }),
			).toThrow();
	});
	/** Independently evaluate curated transfer answers against their component-derived coefficients. */
	it("keeps circuit bank answers consistent with their stated components", () => {
		for (const problem of CIRCUITS_EXAM_BANK) {
			const tf = evaluateTransferFunction(
				problem.topology,
				problem.components,
			);
			if (problem.id === "circuits-bank-10") {
				expect(1 / (problem.components.R * problem.components.C)).toBe(
					1000,
				);
				continue;
			}
			for (const s of [0.3, 1, 2.7]) {
				/**
				 * Evaluates a polynomial in descending coefficient order.
				 * @param coefficients - Polynomial coefficients.
				 * @returns Polynomial value at the current sample.
				 */
				const polynomial = (coefficients: number[]) =>
					coefficients.reduce(
						(sum, coefficient) => sum * s + coefficient,
						0,
					);
				expect(
					tryEvaluateLatexAt(problem.referenceAnswerLatex, s),
				).toBeCloseTo(
					polynomial(tf.numCoeffs) / polynomial(tf.denCoeffs),
					10,
				);
			}
		}
	});
});
