import { describe, expect, it } from "vitest";
import { tryEvaluateLatexAt } from "$lib/math-engine/evaluator";
import { generateOdeProblem } from "$lib/math-engine/odes/index";

/**
 * Evaluates rendered response notation with brackets interpreted as grouping.
 * @param latex - Response expression without an equation prefix.
 * @param t - Evaluation time.
 * @returns Evaluated response.
 */
function evaluateResponse(latex: string, t: number): number {
	const value = tryEvaluateLatexAt(
		latex.replaceAll("[", "(").replaceAll("]", ")"),
		t,
	);
	if (value === null) throw new Error(`Cannot evaluate ${latex}`);
	return value;
}

/** Registers decay, persistence, and superposition regressions. */
describe("ODE transient and steady-state decomposition", () => {
	/** Verifies that a fully decaying forced response is entirely transient. */
	it("classifies the seed-3 resonant response as transient", () => {
		const problem = generateOdeProblem({
			order: 1,
			forcingType: "exponential",
			resonance: "simple",
			seed: 3,
		});
		expect(problem.solutions.y_ss_latex).toBe("0");
		expect(problem.solutions.y_tr_latex).toBe(
			problem.solutions.y_complete_latex,
		);
		expect(evaluateResponse(problem.solutions.y_tr_latex, 0.5)).toBeCloseTo(
			2 * Math.exp(-0.5),
			8,
		);
		expect(problem.evalZI(0.5)).toBe(0);
		expect(problem.evalZS(0.5)).toBeCloseTo(problem.evalComplete(0.5), 8);
	});

	/** Exercises asymptotic response splitting independently of homogeneous/particular labels. */
	it("preserves superposition and the persistent part across forcing and resonance configurations", () => {
		for (const order of [1, 2] as const)
			for (const forcingType of [
				"constant",
				"sinusoid",
				"exponential",
			] as const)
				for (const resonance of [
					"none",
					"simple",
					"repeated",
				] as const) {
					const problem = generateOdeProblem({
						order,
						forcingType,
						resonance,
						seed: 42,
					});
					const decays = problem.forcing.type === "exponential";
					expect(problem.solutions.y_ss_latex).toBe(
						decays ? "0" : problem.solutions.y_p_latex,
					);
					for (const t of [0, 0.17, 0.83, 2]) {
						const transient = evaluateResponse(
							problem.solutions.y_tr_latex,
							t,
						);
						const steady = evaluateResponse(
							problem.solutions.y_ss_latex,
							t,
						);
						expect(transient + steady).toBeCloseTo(
							problem.evalComplete(t),
							3,
						);
						expect(
							problem.evalZI(t) + problem.evalZS(t),
						).toBeCloseTo(problem.evalComplete(t), 8);
					}
					expect(
						Math.abs(
							evaluateResponse(problem.solutions.y_tr_latex, 100),
						),
					).toBeLessThan(1e-6);
					const correctTransient =
						problem.itsData.step7.transientOptions.find(
							/** @param option - Candidate transient response. */
							(option) => option.isCorrect,
						)!;
					const correctSteady =
						problem.itsData.step7.steadyStateOptions.find(
							/** @param option - Candidate persistent response. */
							(option) => option.isCorrect,
						)!;
					expect(correctTransient.latex).toBe(
						`y_{tr}(t) = ${problem.solutions.y_tr_latex}`,
					);
					expect(correctSteady.latex).toBe(
						`y_{ss}(t) = ${problem.solutions.y_ss_latex}`,
					);
				}
	});
});
