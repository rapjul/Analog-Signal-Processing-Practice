/** Causal-step cancellation and conservative contact feedback regressions. */
import { describe, expect, it, vi } from "vitest";
import { verifyConvolutionContactEquation } from "$lib/components/solvers/convolution-solver-state/expression-validation";
import { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
import {
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION as base,
	generateConfiguredConvolutionProblem,
} from "$lib/math-engine/convolution/index";

describe("step tutor workflow", () => {
	/** Geometric overlap is not proof of a nonzero output. */
	it.each(["x", "h"] as const)(
		"requires evaluating the cancelling tail with %s moving",
		/** @param moving - Learner-selected moving signal. */ (moving) => {
			const problem = generateConfiguredConvolutionProblem(
				{
					x: { ...base, type: "step" },
					h: {
						...base,
						type: "multi_rect",
						componentAmplitudes: ["1", "-1"],
					},
				},
				{ seed: 41 },
			);
			const onComplete = vi.fn();
			const solver = new ConvolutionStepSolverState(
				/** Returns the signed regression problem. */ () => problem,
				/** Returns the completion observer. */ () => onComplete,
			);
			const index = problem.intervals.length - 1;
			expect(problem.intervals[index]).toMatchObject({
				exprLatex: "0",
				hasGeometricOverlap: true,
				max: Infinity,
			});
			expect(problem.itsData.step1.parts[2]).toMatchObject({
				end: Infinity,
				title: "Calculate the Possible Overlap Span",
			});
			expect(problem.itsData.step1.intro).toContain("cancel");
			for (let step = 1; step <= 2; step++) solver.devAutoFillStep(step);
			solver.chooseMovingSignal(moving);
			const formula = problem.itsData.step3.formulaBySignal[
				moving
			].options.find(
				/** @param choice - Path formula. @returns Whether it matches. */ (
					choice,
				) => choice.isCorrect,
			)!;
			solver.checkStep3Formula(formula);
			for (const section of problem.itsData.step3.sectionsBySignal[
				moving
			])
				solver.step3.edgeInputs[section.id] = {
					left: section.leftLatex,
					right: section.rightLatex,
				};
			solver.checkStep3Edges();
			for (let step = 4; step <= 5; step++) solver.devAutoFillStep(step);
			const tail = problem.itsData.step6.parts[index]!;
			expect(tail.carriedZero).toBe(false);
			expect(tail.evaluationBySignal![moving]).toHaveLength(2);
			expect(solver.step6.subStepOrder).toContain(tail.id);
			expect(solver.step6.subSteps[tail.id]!.isValid).toBe(false);
			expect(solver.step7.rows[index]).toMatchObject({
				isLocked: false,
				isValid: false,
			});
			solver.devAutoFillStep(6);
			expect(solver.currentStep).toBe(7);
			solver.devAutoFillStep(7);
			expect(solver.isCompleted).toBe(true);
			expect(onComplete).toHaveBeenCalledOnce();
			solver.reset();
			expect(solver.currentStep).toBe(1);
			expect(solver.step7.rows[index]!.isValid).toBe(false);
		},
	);

	/** Unsupported mathematics gets validation feedback instead of being declared false. */
	it.each(["(t", "1/0", "sqrt(t)", "0=sqrt(t)", "0=t=1"])(
		"preserves contact diagnostics for %s and recovers",
		/** @param answer - Malformed or unsupported contact formulation. */ (
			answer,
		) => {
			const problem = generateConfiguredConvolutionProblem(
				{ x: { ...base, type: "step" }, h: { ...base, type: "step" } },
				{ seed: 1 },
			);
			const solver = new ConvolutionStepSolverState(
				/** Returns the step pair. */ () => problem,
			);
			for (let step = 1; step <= 3; step++) solver.devAutoFillStep(step);
			for (let count = 0; count < 2; count++) {
				const state =
					solver.step4.subSteps[solver.step4.activeSubStepId]!;
				state.input = "1";
				solver.checkStep4();
			}
			const id = solver.step4.activeSubStepId;
			const state = solver.step4.subSteps[id]!;
			state.input = answer;
			solver.checkStep4();
			expect(solver.currentFeedbackType).toBe("validation");
			expect(solver.step4.activeSubStepId).toBe(id);
			expect(state.isValid).toBe(false);
			state.input = "0=t";
			solver.checkStep4();
			expect(state.isValid).toBe(true);
			expect(solver.step4.activeSubStepId).not.toBe(id);
		},
	);

	/** Both orientations and bare expressions have identical mathematical meaning. */
	it("accepts equivalent contact equations and rejects supported mismatches", () => {
		for (const answer of ["t+1", "2=t+1", "t+1=2", "1+1=(t+2)-1"])
			expect(
				verifyConvolutionContactEquation(answer, 2, "t+1").status,
			).toBe("correct");
		expect(verifyConvolutionContactEquation("2=t-1", 2, "t+1").status).toBe(
			"incorrect",
		);
	});
});
