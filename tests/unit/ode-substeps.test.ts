/**
 * Unit Test Suite for ODE Solver Multi-Part Sub-Steps & State-Machine Remediation.
 *
 * Implements ADR 0027 (Domain-Safe Terminology) and ADR 0028 (Exhaustive State Machine
 * Path and Remediation Testing) validation matrices.
 */

import { describe, expect, it, vi } from "vitest";
import { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
import {
	type ForcingType,
	generateOdeProblem,
	type SecondOrderRootType,
} from "$lib/math-engine/odes/index";
import type { WithRandom } from "$lib/math-engine/types";

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

describe("ADR 0028: Exhaustive ODE State Machine & Remediation Paths", () => {
	describe("Step 2 State Machine Branches", () => {
		it("Branch 1: Factoring Strategy Direct Path (distinct real roots)", () => {
			const problem = generateSecondOrderProblem("distinct_real");
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(2);

			solver.selectStep2Strategy("factoring");
			expect(solver.step2.strategy).toBe("factoring");
			expect(solver.step2.activeSubStepId).toBe("factoring_inputs");

			// Swapped entry order validation
			solver.step2.r1 = String(problem.itsData.step2.r2 ?? 0);
			solver.step2.r2 = String(problem.itsData.step2.r1);
			solver.checkStep2Factoring();

			expect(solver.step2.subSteps.factoring_inputs.isValid).toBe(true);
			expect(solver.step2.isValid).toBe(true);
			expect(solver.currentStep).toBe(3);
		});

		it("Branch 2: Quadratic Formula Direct Correct Classification Path", () => {
			const problem = generateSecondOrderProblem("complex_conjugate");
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(2);

			solver.selectStep2Strategy("quadratic");
			expect(solver.step2.strategy).toBe("quadratic");
			expect(solver.step2.activeSubStepId).toBe("quad_classification");

			// Correct classification bypasses discriminant calculation
			solver.checkStep2QuadClass("complex_conjugate");
			expect(solver.step2.subSteps.quad_classification.isValid).toBe(
				true,
			);
			expect(solver.step2.activeSubStepId).toBe("quad_root_inputs");
			expect(solver.step2.quadNeedsDiscriminantCalc).toBe(false);

			// Enter correct complex roots
			solver.step2.sigma = String(problem.itsData.step2.r1);
			solver.step2.omegaD = String(
				Math.abs(problem.itsData.step2.im ?? 0),
			);
			solver.checkStep2QuadRoots();

			expect(solver.step2.subSteps.quad_root_inputs.isValid).toBe(true);
			expect(solver.step2.isValid).toBe(true);
			expect(solver.currentStep).toBe(3);
		});

		it("Branch 3: Quadratic Formula Wrong Classification -> Remediation Loop Path", () => {
			const problem = generateSecondOrderProblem("complex_conjugate");
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(2);

			solver.selectStep2Strategy("quadratic");

			// Wrong classification triggers remediation
			solver.checkStep2QuadClass("distinct_real");
			expect(solver.step2.quadNeedsDiscriminantCalc).toBe(true);
			expect(solver.step2.activeSubStepId).toBe("remedial_discriminant");
			expect(solver.step2.feedbackType).toBe("misconception");

			// Incorrect discriminant calculation fails
			solver.step2.quadDiscriminantInput = "999";
			solver.checkStep2Discriminant();
			expect(solver.step2.subSteps.remedial_discriminant.isValid).toBe(
				false,
			);
			expect(solver.step2.feedbackType).toBe("incorrect");

			// Correct discriminant calculation remediates and advances to root inputs
			solver.step2.quadDiscriminantInput = String(
				problem.itsData.step2.discriminant,
			);
			solver.checkStep2Discriminant();
			expect(solver.step2.subSteps.remedial_discriminant.isValid).toBe(
				true,
			);
			expect(solver.step2.quadDiscriminantVerified).toBe(true);
			expect(solver.step2.activeSubStepId).toBe("quad_root_inputs");

			// Complete root input
			solver.step2.sigma = String(problem.itsData.step2.r1);
			solver.step2.omegaD = String(
				Math.abs(problem.itsData.step2.im ?? 0),
			);
			solver.checkStep2QuadRoots();
			expect(solver.currentStep).toBe(3);
		});

		it("Branch 4: Non-factorable polynomial factoring strategy rejection", () => {
			const problem = generateSecondOrderProblem("complex_conjugate");
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(2);

			solver.selectStep2Strategy("factoring");
			solver.checkStep2Factoring();

			expect(solver.step2.isValid).toBe(false);
			expect(solver.step2.feedbackType).toBe("incorrect");
			expect(solver.step2.feedback).toContain(
				"cannot be factored over real integers",
			);
		});
	});

	describe("Step 5 Multi-Part Sub-Steps Flow", () => {
		it("Sinusoidal 4-part flow: Part 5A-1 -> Part 5A-2 -> Part 5B -> Part 5C", () => {
			let problem = generateSecondOrderProblem("distinct_real");
			while (problem.forcing.type !== "sinusoid") {
				problem = generateSecondOrderProblem("distinct_real");
			}

			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(5);

			expect(solver.step5.activeSubStepId).toBe("first_deriv");

			// Complete Part 5A-1
			const cFirstDeriv =
				problem.itsData.step5.firstDerivativeOptions?.find(
					(o) => o.isCorrect,
				);
			expect(cFirstDeriv).toBeDefined();
			if (cFirstDeriv) solver.checkStep5FirstDeriv(cFirstDeriv);

			expect(solver.step5.subSteps.first_deriv.isValid).toBe(true);
			expect(solver.step5.activeSubStepId).toBe("second_deriv");

			// Complete Part 5A-2
			const cSecondDeriv =
				problem.itsData.step5.secondDerivativeOptions?.find(
					(o) => o.isCorrect,
				);
			expect(cSecondDeriv).toBeDefined();
			if (cSecondDeriv) solver.checkStep5SecondDeriv(cSecondDeriv);

			expect(solver.step5.subSteps.second_deriv.isValid).toBe(true);
			expect(solver.step5.activeSubStepId).toBe("system_setup");

			// Complete Part 5B
			const cSys = problem.itsData.step5.systemOptions?.find(
				(o) => o.isCorrect,
			);
			expect(cSys).toBeDefined();
			if (cSys) solver.checkStep5System(cSys);

			expect(solver.step5.subSteps.system_setup.isValid).toBe(true);
			expect(solver.step5.activeSubStepId).toBe("solve");

			// Complete Part 5C
			solver.step5.a = String(problem.itsData.step5.expectedA);
			solver.step5.b = String(problem.itsData.step5.expectedB);
			solver.checkStep5Coeffs();

			expect(solver.step5.subSteps.solve.isValid).toBe(true);
			expect(solver.step5.isValid).toBe(true);
			expect(solver.currentStep).toBe(6);
		});

		it("Constant/Exponential 3-part flow: Part 5A-1 -> Part 5A-2 -> Part 5C (solve)", () => {
			let problem = generateSecondOrderProblem("distinct_real");
			while (problem.forcing.type === "sinusoid") {
				problem = generateSecondOrderProblem("distinct_real");
			}

			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(5);

			expect(solver.step5.activeSubStepId).toBe("first_deriv");

			// Complete Part 5A-1
			const cFirstDeriv =
				problem.itsData.step5.firstDerivativeOptions?.find(
					(o) => o.isCorrect,
				);
			expect(cFirstDeriv).toBeDefined();
			if (cFirstDeriv) solver.checkStep5FirstDeriv(cFirstDeriv);

			expect(solver.step5.subSteps.first_deriv.isValid).toBe(true);
			expect(solver.step5.activeSubStepId).toBe("second_deriv");

			// Complete Part 5A-2
			const cSecondDeriv =
				problem.itsData.step5.secondDerivativeOptions?.find(
					(o) => o.isCorrect,
				);
			expect(cSecondDeriv).toBeDefined();
			if (cSecondDeriv) solver.checkStep5SecondDeriv(cSecondDeriv);

			expect(solver.step5.subSteps.second_deriv.isValid).toBe(true);
			expect(solver.step5.activeSubStepId).toBe("solve");

			// Complete solve
			solver.step5.kp = String(problem.itsData.step5.expectedKp);
			solver.checkStep5Coeffs();

			expect(solver.step5.isValid).toBe(true);
			expect(solver.currentStep).toBe(6);
		});
	});

	describe("Step 6 Multi-Part Sub-Steps Flow", () => {
		it("Part 6A Target Values -> Part 6B Integration Constants", () => {
			const problem = generateSecondOrderProblem("distinct_real");
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(6);

			expect(solver.step6.activeSubStepId).toBe("target_values");
			expect(solver.step6.subStepOrder).toEqual([
				"target_values",
				"solve_constants",
			]);

			// Part 6A: Target values verification
			solver.step6.yh0 = String(problem.itsData.step6.targetYh0);
			solver.step6.dyh0 = String(problem.itsData.step6.targetDYh0);
			solver.checkStep6TargetValues();

			expect(solver.step6.subSteps.target_values.isValid).toBe(true);
			expect(solver.step6.activeSubStepId).toBe("solve_constants");

			// Part 6B: Constants verification
			solver.step6.c1 = String(problem.itsData.step6.expectedC1);
			solver.step6.c2 = String(problem.itsData.step6.expectedC2);
			solver.checkStep6Constants();

			expect(solver.step6.subSteps.solve_constants.isValid).toBe(true);
			expect(solver.step6.isValid).toBe(true);
			expect(solver.currentStep).toBe(7);
		});
	});

	describe("Step 7 Multi-Part Decomposition Flow", () => {
		it("Part 7A -> Part 7B -> Part 7C with Completion Callback", () => {
			const onComplete = vi.fn();
			const problem = generateSecondOrderProblem("distinct_real");
			const solver = new OdeStepSolverState(
				() => problem,
				() => onComplete,
			);
			solver.advanceToStep(7);

			expect(solver.step7.activeSubStepId).toBe("zi_zs");

			// Part 7A: ZI/ZS Decomposition
			solver.step7.ziC1 = String(problem.itsData.step7.ziConstants.C1);
			solver.step7.ziC2 = String(problem.itsData.step7.ziConstants.C2);
			solver.checkStep7ZI();

			expect(solver.step7.ziZsPassed).toBe(true);
			expect(solver.step7.activeSubStepId).toBe("tr_ss");

			// Part 7B: Transient/Steady-State Identification
			solver.step7.selectedTransient = "tr_correct";
			solver.step7.selectedSteadyState = "ss_correct";
			solver.checkStep7TrSS();

			expect(solver.step7.trSsPassed).toBe(true);
			expect(solver.step7.activeSubStepId).toBe("concept");

			// Part 7C: Conceptual Mastery Check
			const correctOption =
				problem.itsData.step7.conceptQuestion.options.find(
					(o) => o.isCorrect,
				);
			expect(correctOption).toBeDefined();
			if (correctOption) solver.checkStep7Concept(correctOption);

			expect(solver.step7.conceptPassed).toBe(true);
			expect(solver.isCompleted).toBe(true);
			expect(onComplete).toHaveBeenCalledTimes(1);
		});
	});

	describe("Hint Tier Isolation and Scoping", () => {
		it("resets hint tier to 0 upon step transition", () => {
			const problem = generateSecondOrderProblem("distinct_real");
			const solver = new OdeStepSolverState(() => problem);

			solver.revealNextHint();
			solver.revealNextHint();
			expect(solver.hintTier).toBe(2);

			solver.step1.a2 = String(problem.itsData.step1.expectedA2);
			solver.step1.a1 = String(problem.itsData.step1.expectedA1);
			solver.step1.a0 = String(problem.itsData.step1.expectedA0);
			solver.checkStep1();

			expect(solver.currentStep).toBe(2);
			expect(solver.hintTier).toBe(0);
		});

		it("resets hint tier to 0 upon sub-step transition within multi-part step", () => {
			const problem = generateSecondOrderProblem("distinct_real");
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(6);

			solver.revealNextHint();
			expect(solver.hintTier).toBe(1);

			solver.step6.yh0 = String(problem.itsData.step6.targetYh0);
			solver.step6.dyh0 = String(problem.itsData.step6.targetDYh0);
			solver.checkStep6TargetValues();

			expect(solver.step6.activeSubStepId).toBe("solve_constants");
			expect(solver.hintTier).toBe(0);
		});

		it("dynamically returns sub-step-scoped hints", () => {
			const problem = generateSecondOrderProblem("distinct_real");
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(6);

			const targetHints = solver.activeHints;
			expect(targetHints.length).toBeGreaterThan(0);
			expect(
				problem.itsData.step6.subStepHints?.target_values,
			).toBeDefined();
			expect(targetHints).toEqual(
				problem.itsData.step6.subStepHints?.target_values,
			);
		});
	});
});
