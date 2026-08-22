import { describe, expect, it } from "vitest";
import { OdeStepSolverState } from "../../src/lib/components/solvers/ode-step-solver.svelte";
import {
	type ForcingType,
	generateOdeProblem,
	type SecondOrderRootType,
} from "../../src/lib/math-engine/odes/index";
import type { WithRandom } from "../../src/lib/math-engine/types";

/**
 * Helper to generate second-order ODE problem for harness tests.
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

describe("OdeStepSolverState Developer Harness & Visual States", () => {
	describe("Visual States Discovery & Navigation", () => {
		/**
		 * Verifies devGetVisualStates returns valid descriptors for first-order ODEs.
		 */
		it("returns appropriate visual states for first-order ODEs", () => {
			const problem = generateOdeProblem({
				order: 1,
				forcingType: "constant",
				seed: 10,
			});
			const solver = new OdeStepSolverState(() => problem);
			const states = solver.devGetVisualStates();
			expect(states.length).toBeGreaterThan(0);
			expect(
				states.some(
					(s) => s.id === "ode.step-01.characteristic-equation",
				),
			).toBe(true);
			expect(
				states.some((s) => s.id === "ode.step-02.factoring-inputs"),
			).toBe(true);
			expect(
				states.some(
					(s) => s.id === "ode.step-02.quadratic-classification",
				),
			).toBe(false);
		});

		/**
		 * Verifies devGetVisualStates returns appropriate descriptors for sinusoidal second-order ODEs.
		 */
		it("returns appropriate visual states for second-order sinusoidal ODEs", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"sinusoid",
			);
			const solver = new OdeStepSolverState(() => problem);
			const states = solver.devGetVisualStates();
			expect(
				states.some((s) => s.id === "ode.step-02.strategy-gate"),
			).toBe(true);
			expect(
				states.some((s) => s.id === "ode.step-05.system-setup"),
			).toBe(true);
			expect(
				states.some(
					(s) => s.id === "ode.step-06.integration-constants",
				),
			).toBe(true);
		});

		/**
		 * Verifies devGoToVisualState successfully navigates to every registered state for a 2nd-order ODE.
		 */
		it("successfully navigates to all registered visual states for a second-order sinusoidal problem", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"sinusoid",
			);
			const solver = new OdeStepSolverState(() => problem);
			const states = solver.devGetVisualStates();

			for (const state of states) {
				const success = solver.devGoToVisualState(state.id);
				expect({ stateId: state.id, success }).toEqual({
					stateId: state.id,
					success: true,
				});
				expect(solver.currentStep).toBe(state.step);
			}

			// Unknown state returns false
			expect(solver.devGoToVisualState("non.existent.state")).toBe(false);
		});

		/**
		 * Verifies devGoToVisualState navigation for first-order ODE problems.
		 */
		it("successfully navigates to all registered visual states for a first-order problem", () => {
			const problem = generateOdeProblem({
				order: 1,
				forcingType: "constant",
				seed: 25,
			});
			const solver = new OdeStepSolverState(() => problem);
			const states = solver.devGetVisualStates();

			for (const state of states) {
				const success = solver.devGoToVisualState(state.id);
				expect(success).toBe(true);
				expect(solver.currentStep).toBe(state.step);
			}
		});

		/**
		 * Verifies devGoToVisualState navigation for second-order repeated-real and complex-conjugate problems.
		 */
		it("successfully navigates to all registered visual states for repeated real and complex conjugate problems", () => {
			const repProblem = generateSecondOrderProblem(
				"repeated_real",
				"exponential",
			);
			const repSolver = new OdeStepSolverState(() => repProblem);
			for (const state of repSolver.devGetVisualStates()) {
				expect(repSolver.devGoToVisualState(state.id)).toBe(true);
			}

			const ccProblem = generateSecondOrderProblem(
				"complex_conjugate",
				"sinusoid",
			);
			const ccSolver = new OdeStepSolverState(() => ccProblem);
			for (const state of ccSolver.devGetVisualStates()) {
				expect(ccSolver.devGoToVisualState(state.id)).toBe(true);
			}
		});

		/**
		 * Verifies devGoToVisualState specific target branches including misconceptions and hints.
		 */
		it("navigates to intermediate visual states, misconceptions, and hint disclosures", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"constant",
			);
			const solver = new OdeStepSolverState(() => problem);

			expect(
				solver.devGoToVisualState(
					"ode.step-06.target-values.misconception",
				),
			).toBe(true);
			expect(solver.currentFeedbackType).toBe("misconception");

			expect(
				solver.devGoToVisualState("ode.step-06.integration-constants"),
			).toBe(true);
			expect(solver.step6.activeSubStepId).toBe("solve_constants");

			expect(
				solver.devGoToVisualState(
					"ode.step-06.integration-constants.hints",
				),
			).toBe(true);
			expect(solver.hintTier).toBe(3);

			expect(
				solver.devGoToVisualState("ode.step-07.transient-steady-state"),
			).toBe(true);
			expect(solver.step7.activeSubStepId).toBe("tr_ss");

			expect(solver.devGoToVisualState("ode.step-07.concept")).toBe(true);
			expect(solver.step7.activeSubStepId).toBe("concept");
		});

		/**
		 * Verifies solver reset restores initial pristine state.
		 */
		it("resets solver state cleanly back to Step 1", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"constant",
			);
			const solver = new OdeStepSolverState(() => problem);
			solver.devSolveAll();
			expect(solver.isCompleted).toBe(true);

			solver.reset();
			expect(solver.currentStep).toBe(1);
			expect(solver.isCompleted).toBe(false);
			expect(solver.step1.isValid).toBe(false);
		});
	});

	describe("devAutoFillStep Method", () => {
		/**
		 * Verifies devAutoFillStep successfully auto-completes each step for first-order problems.
		 */
		it("autofills all steps for first-order ODEs", () => {
			const problem = generateOdeProblem({
				order: 1,
				forcingType: "constant",
				seed: 35,
			});
			const solver = new OdeStepSolverState(() => problem);

			for (let step = 1; step <= 7; step++) {
				solver.devAutoFillStep(step);
				if (step < 7) {
					expect(solver.currentStep).toBe(step + 1);
				}
			}
			expect(solver.isCompleted).toBe(true);
		});

		/**
		 * Verifies devAutoFillStep across different root types for second-order ODEs.
		 */
		it("autofills all steps for second-order distinct real, repeated real, and complex conjugate problems", () => {
			const rootTypes: SecondOrderRootType[] = [
				"distinct_real",
				"repeated_real",
				"complex_conjugate",
			];

			for (const rootType of rootTypes) {
				const problem = generateSecondOrderProblem(
					rootType,
					"sinusoid",
				);
				const solver = new OdeStepSolverState(() => problem);

				for (let step = 1; step <= 7; step++) {
					solver.devAutoFillStep(step);
					if (step < 7) {
						expect(solver.currentStep).toBe(step + 1);
					}
				}
				expect(solver.isCompleted).toBe(true);
			}
		});

		/**
		 * Verifies devAutoFillStep gracefully ignores out-of-bounds step indices.
		 */
		it("safely handles out-of-bounds step index calls in devAutoFillStep", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"constant",
			);
			const solver = new OdeStepSolverState(() => problem);
			solver.devAutoFillStep(0);
			expect(solver.currentStep).toBe(1);

			solver.devAutoFillStep(99);
			expect(solver.currentStep).toBe(1);
		});
	});

	describe("Badges & Progress Descriptors", () => {
		/**
		 * Verifies Step 5 progress calculation for first-order constant and sinusoidal forcing.
		 */
		it("computes accurate Step 5 progress sequences for first-order problems", () => {
			const p1Const = generateOdeProblem({
				order: 1,
				forcingType: "constant",
				seed: 50,
			});
			const s1Const = new OdeStepSolverState(() => p1Const);
			s1Const.step5.activeSubStepId = "first_deriv";
			expect(s1Const.step5Progress).toEqual({
				current: 1,
				total: 2,
				label: "Part 1 of 2",
			});
			s1Const.step5.activeSubStepId = "solve";
			expect(s1Const.step5Progress).toEqual({
				current: 2,
				total: 2,
				label: "Part 2 of 2",
			});

			const p1Sin = generateOdeProblem({
				order: 1,
				forcingType: "sinusoid",
				seed: 51,
			});
			const s1Sin = new OdeStepSolverState(() => p1Sin);
			s1Sin.step5.activeSubStepId = "first_deriv";
			expect(s1Sin.step5Progress).toEqual({
				current: 1,
				total: 3,
				label: "Part 1 of 3",
			});
			s1Sin.step5.activeSubStepId = "system_setup";
			expect(s1Sin.step5Progress).toEqual({
				current: 2,
				total: 3,
				label: "Part 2 of 3",
			});
			s1Sin.step5.activeSubStepId = "solve";
			expect(s1Sin.step5Progress).toEqual({
				current: 3,
				total: 3,
				label: "Part 3 of 3",
			});
		});

		/**
		 * Verifies step badges and subpart progress descriptors across all steps.
		 */
		it("computes accurate step badges and subpart progress descriptors across all steps", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"sinusoid",
			);
			const solver = new OdeStepSolverState(() => problem);

			solver.currentStep = 5;
			solver.step5.activeSubStepId = "first_deriv";
			expect(solver.step5Badge).toBe("Step 5A-1");

			solver.step5.activeSubStepId = "second_deriv";
			expect(solver.step5Badge).toBe("Step 5A-2");

			solver.step5.activeSubStepId = "system_setup";
			expect(solver.step5Badge).toBe("Step 5B");

			solver.step5.activeSubStepId = "solve";
			expect(solver.step5Badge).toBe("Step 5C");
			expect(solver.step5CSubpartBadge).toBe("Part 5C");

			solver.currentStep = 6;
			solver.step6.activeSubStepId = "target_values";
			expect(solver.step6Badge).toBe("Step 6A");

			solver.step6.activeSubStepId = "solve_constants";
			expect(solver.step6Badge).toBe("Step 6B");

			solver.currentStep = 7;
			solver.step7.activeSubStepId = "zi_zs";
			expect(solver.step7Badge).toBe("Step 7A");

			solver.step7.activeSubStepId = "tr_ss";
			expect(solver.step7Badge).toBe("Step 7B");

			solver.step7.activeSubStepId = "concept";
			expect(solver.step7Badge).toBe("Step 7C");
		});
	});
});
