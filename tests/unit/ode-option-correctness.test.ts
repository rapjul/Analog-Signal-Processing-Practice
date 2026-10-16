import { describe, expect, it } from "vitest";
import { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
import {
	evaluateMathJsonStrict,
	parseStrictLatex,
	tryEvaluateLatexAt,
} from "$lib/math-engine/evaluator";
import {
	generateOdeProblem,
	type OdeItsOption,
} from "$lib/math-engine/odes/index";

/** @param option - Generated answer choice. @returns Whether it is the designated correct answer. */
function isCorrectOption(option: OdeItsOption): boolean {
	return option.isCorrect;
}

/**
 * Evaluates the right-hand side of a generated equation at explicit bindings.
 * @param latex - Generated equation.
 * @param bindings - Independent coefficients and time.
 * @returns Finite equation value.
 */
function evaluateEquation(
	latex: string,
	bindings: Record<string, number>,
): number {
	const value = evaluateMathJsonStrict(
		parseStrictLatex(latex.split("=")[1]!),
		bindings,
	);
	if (value === null) throw new Error(`Cannot evaluate ${latex}`);
	return value;
}

/**
 * Checks response choices independently of their IDs and correctness flags.
 * @param options - Generated response choices.
 */
function expectDistinctResponses(options: OdeItsOption[]): void {
	expect(options).toHaveLength(3);
	expect(options.filter(isCorrectOption)).toHaveLength(1);
	const samples: number[][] = [];
	for (const option of options) {
		const values: number[] = [];
		for (const t of [0, 0.137, 0.41, 1.17]) {
			const value = tryEvaluateLatexAt(
				option.latex
					.split("=")[1]!
					.replaceAll("[", "(")
					.replaceAll("]", ")"),
				t,
			);
			expect(value, option.latex).not.toBeNull();
			values.push(value!);
		}
		samples.push(values);
	}
	for (let i = 0; i < samples.length; i++) {
		for (let j = i + 1; j < samples.length; j++) {
			let distinct = false;
			for (let index = 0; index < samples[i]!.length; index++) {
				distinct ||=
					Math.abs(samples[i]![index]! - samples[j]![index]!) > 1e-8;
			}
			expect(distinct, JSON.stringify(options)).toBe(true);
		}
	}
}

/** Registers independent mathematical and grading regressions. */
describe("ODE option mathematical correctness", () => {
	/** @param order - Differential equation order under test. */
	it.each([1, 2] as const)(
		"keeps unit-frequency derivative and system distractors incorrect for order %i",
		(order) => {
			let unit = generateOdeProblem({
				order,
				forcingType: "sinusoid",
				resonance: "none",
				seed: 1,
			});
			// Find a unit-frequency fixture independently of random draws used by each order.
			for (let seed = 0; unit.forcing.omega !== 1 && seed < 30; seed++) {
				unit = generateOdeProblem({
					order,
					forcingType: "sinusoid",
					resonance: "none",
					seed,
				});
			}
			expect(unit.forcing.omega).toBe(1);
			const step = unit.itsData.step5;
			const bindings = { A: 2, B: 3, t: 0.37 };
			for (const options of [
				step.firstDerivativeOptions!,
				...("secondDerivativeOptions" in step
					? [step.secondDerivativeOptions!]
					: []),
			]) {
				expect(options).toHaveLength(4);
				const expected = evaluateEquation(
					options.find(isCorrectOption)!.latex,
					bindings,
				);
				for (const option of options) {
					if (option.isCorrect) continue;
					expect(
						evaluateEquation(option.latex, bindings),
					).not.toBeCloseTo(expected, 8);
				}
			}
			const correct = step.systemOptions!.find(isCorrectOption)!;
			expect(step.systemOptions).toHaveLength(5);
			for (const option of step.systemOptions!) {
				if (!option.isCorrect)
					expect(option.latex).not.toBe(correct.latex);
			}
		},
	);

	/** Ensures zero initial state cannot produce contradictory response grades. */
	it("keeps the seed-3 resonant response choices mathematically distinct", () => {
		const problem = generateOdeProblem({
			order: 1,
			forcingType: "exponential",
			resonance: "simple",
			seed: 3,
		});
		expect(problem.initialConditions.y0).toBe(0);
		expectDistinctResponses(problem.itsData.step7.transientOptions);
		expectDistinctResponses(problem.itsData.step7.steadyStateOptions);
	});

	/** Exercises zero and nonzero homogeneous responses across generated archetypes. */
	it("keeps response choices distinct and grading deterministic across a seed matrix", () => {
		for (const order of [1, 2] as const)
			for (const forcingType of [
				"constant",
				"sinusoid",
				"exponential",
			] as const)
				for (const resonance of ["none", "simple", "repeated"] as const)
					for (const seed of [0, 1, 3, 7, 19]) {
						const options = { order, forcingType, resonance, seed };
						const problem = generateOdeProblem(options);
						const repeated = generateOdeProblem(options);
						for (const key of [
							"transientOptions",
							"steadyStateOptions",
						] as const) {
							expectDistinctResponses(problem.itsData.step7[key]);
							expect(problem.itsData.step7[key]).toEqual(
								repeated.itsData.step7[key],
							);
						}
						const solver = new OdeStepSolverState(
							/** Supplies the active deterministic problem. */
							() => problem,
						);
						solver.advanceToStep(7);
						solver.step7.selectedTransient =
							problem.itsData.step7.transientOptions.find(
								isCorrectOption,
							)!.id;
						solver.step7.selectedSteadyState =
							problem.itsData.step7.steadyStateOptions.find(
								isCorrectOption,
							)!.id;
						solver.checkStep7TrSS();
						expect(solver.step7.trSsPassed).toBe(true);
					}
	});
});
