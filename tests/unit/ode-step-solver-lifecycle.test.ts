import { describe, expect, it, vi } from "vitest";
import { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
import {
	type ForcingType,
	generateOdeProblem,
	type SecondOrderRootType,
} from "$lib/math-engine/odes/index";
import type { WithRandom } from "$lib/math-engine/types";

/**
 * Helper to generate second-order ODE problem for lifecycle tests.
 *
 * @param {WithRandom<SecondOrderRootType>} rootType Target root type configuration
 * @param {WithRandom<ForcingType>} [forcingType="random"] Target forcing function configuration
 * @returns Generated second-order ODE problem
 */
function generateSecondOrderProblem(
	rootType: WithRandom<SecondOrderRootType>,
	forcingType: WithRandom<ForcingType> = "random",
) {
	return generateOdeProblem({
		order: 2,
		rootType,
		forcingType,
		leadingCoefficient: "monic",
		resonance: "none",
	});
}

describe("OdeStepSolverState Lifecycle & Progression", () => {
	/**
	 * Verifies initial state defaults on solver instantiation.
	 */
	it("initializes on Step 1 with default empty inputs", () => {
		const problem = generateSecondOrderProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);

		expect(solver.currentStep).toBe(1);
		expect(solver.isCompleted).toBe(false);
		expect(solver.hintTier).toBe(0);
		expect(solver.step1.isValid).toBe(false);
		expect(solver.previewCharEq).toBe("a_2 s^2 + a_1 s + a_0 = 0");
		expect(solver.activeHints.length).toBe(3);
		expect(solver.currentFeedback).toBe("");
	});

	/**
	 * Verifies full end-to-end solution workflow for first-order ODE problems.
	 */
	it("executes complete lifecycle for first-order ODE problem", () => {
		const onCompleteMock = vi.fn();
		const problem = generateOdeProblem({
			order: 1,
			rootType: "random",
			forcingType: "constant",
			leadingCoefficient: "non_monic",
			resonance: "none",
			seed: 210,
		});
		const solver = new OdeStepSolverState(() => problem, onCompleteMock);

		// Step 1
		solver.step1.a1 = String(problem.params.a1);
		solver.step1.a0 = String(problem.params.a0);
		solver.checkStep1();
		expect(solver.currentStep).toBe(2);

		// Step 2 Factoring
		solver.step2.r1 = String(problem.params.roots.r1);
		solver.checkStep2();
		expect(solver.currentStep).toBe(3);

		// Step 3 Homogeneous Form
		solver.checkStep3("single_real");
		expect(solver.currentStep).toBe(4);

		// Step 4 Particular Ansatz
		const correctAnsatz = problem.itsData.step4.options.find(
			(o) => o.isCorrect,
		);
		expect(correctAnsatz).toBeDefined();
		if (correctAnsatz) solver.checkStep4(correctAnsatz);
		expect(solver.currentStep).toBe(5);

		// Step 5 Undetermined Coefficients (First order constant forcing)
		const d1 = problem.itsData.step5.firstDerivativeOptions?.find(
			(o) => o.isCorrect,
		);
		if (d1) solver.checkStep5FirstDeriv(d1);
		solver.step5.kp = String(problem.itsData.step5.expectedKp ?? 0);
		solver.checkStep5();
		expect(solver.currentStep).toBe(6);

		// Step 6 Initial Conditions (First order)
		solver.step6.yh0 = String(problem.itsData.step6.targetYh0);
		solver.checkStep6();
		expect(solver.currentStep).toBe(7);

		// Step 7 Response Decomposition
		solver.step7.ziC1 = String(problem.itsData.step7.ziConstants.C1);
		solver.checkStep7ZI();
		const correctTr = problem.itsData.step7.transientOptions.find(
			(o) => o.isCorrect,
		);
		const correctSS = problem.itsData.step7.steadyStateOptions.find(
			(o) => o.isCorrect,
		);
		if (correctTr) solver.step7.selectedTransient = correctTr.id;
		if (correctSS) solver.step7.selectedSteadyState = correctSS.id;
		solver.checkStep7TrSS();

		const correctConcept =
			problem.itsData.step7.conceptQuestion.options.find(
				(o) => o.isCorrect,
			);
		if (correctConcept) solver.checkStep7Concept(correctConcept);

		expect(solver.isCompleted).toBe(true);
		expect(onCompleteMock).toHaveBeenCalledTimes(1);
	});

	/**
	 * Verifies full end-to-end solution workflow for second-order distinct real root ODE problems.
	 */
	it("executes complete lifecycle for second-order distinct real ODE problem", () => {
		const onCompleteMock = vi.fn();
		const problem = generateOdeProblem({
			order: 2,
			rootType: "distinct_real",
			forcingType: "constant",
			leadingCoefficient: "monic",
			resonance: "none",
			seed: 310,
		});
		const solver = new OdeStepSolverState(() => problem, onCompleteMock);

		// Step 1
		solver.step1.a2 = String(problem.params.a2);
		solver.step1.a1 = String(problem.params.a1);
		solver.step1.a0 = String(problem.params.a0);
		solver.checkStep1();
		expect(solver.currentStep).toBe(2);

		// Step 2 (quadratic strategy)
		solver.selectStep2Strategy("quadratic");
		solver.checkStep2QuadClass("distinct_real");
		solver.step2.r1 = String(problem.params.roots.r1);
		solver.step2.r2 = String(problem.params.roots.r2);
		solver.checkStep2();
		expect(solver.currentStep).toBe(3);

		// Step 3
		solver.checkStep3("distinct_real");
		expect(solver.currentStep).toBe(4);

		// Step 4
		const correctAnsatz = problem.itsData.step4.options.find(
			(o) => o.isCorrect,
		);
		if (correctAnsatz) solver.checkStep4(correctAnsatz);
		expect(solver.currentStep).toBe(5);

		// Step 5
		const d1 = problem.itsData.step5.firstDerivativeOptions?.find(
			(o) => o.isCorrect,
		);
		const d2 = problem.itsData.step5.secondDerivativeOptions?.find(
			(o) => o.isCorrect,
		);
		if (d1) solver.checkStep5FirstDeriv(d1);
		if (d2) solver.checkStep5SecondDeriv(d2);
		solver.step5.kp = String(problem.itsData.step5.expectedKp ?? 0);
		solver.checkStep5();
		expect(solver.currentStep).toBe(6);

		// Step 6
		solver.step6.yh0 = String(problem.itsData.step6.targetYh0);
		solver.step6.dyh0 = String(problem.itsData.step6.targetDYh0 ?? 0);
		solver.checkStep6TargetValues();
		solver.step6.c1 = String(problem.itsData.step6.expectedC1);
		solver.step6.c2 = String(problem.itsData.step6.expectedC2 ?? 0);
		solver.checkStep6();
		expect(solver.currentStep).toBe(7);

		// Step 7
		solver.step7.ziC1 = String(problem.itsData.step7.ziConstants.C1);
		solver.step7.ziC2 = String(problem.itsData.step7.ziConstants.C2 ?? 0);
		solver.checkStep7();
		expect(solver.step7.ziZsPassed).toBe(true);

		const correctTr = problem.itsData.step7.transientOptions.find(
			(o) => o.isCorrect,
		);
		const correctSS = problem.itsData.step7.steadyStateOptions.find(
			(o) => o.isCorrect,
		);
		if (correctTr) solver.step7.selectedTransient = correctTr.id;
		if (correctSS) solver.step7.selectedSteadyState = correctSS.id;
		solver.checkStep7TrSS();

		const correctConcept =
			problem.itsData.step7.conceptQuestion.options.find(
				(o) => o.isCorrect,
			);
		if (correctConcept) solver.checkStep7Concept(correctConcept);

		expect(solver.isCompleted).toBe(true);
		expect(onCompleteMock).toHaveBeenCalledTimes(1);
	});

	/**
	 * Verifies reset() method clears all step states and returns to step 1.
	 */
	it("resets state completely when reset() is called", () => {
		const problem = generateSecondOrderProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);

		solver.step1.a2 = String(problem.params.a2);
		solver.step1.a1 = String(problem.params.a1);
		solver.step1.a0 = String(problem.params.a0);
		solver.checkStep1();
		expect(solver.currentStep).toBe(2);

		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.step1.a2).toBe("");
		expect(solver.step1.a1).toBe("");
		expect(solver.step1.a0).toBe("");
		expect(solver.isCompleted).toBe(false);
	});
});
