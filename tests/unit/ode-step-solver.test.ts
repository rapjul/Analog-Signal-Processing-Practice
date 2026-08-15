import { describe, expect, it, vi } from "vitest";
import { OdeStepSolverState } from "../../src/lib/components/solvers/ode-step-solver.svelte";
import { generateOdeProblem } from "../../src/lib/math-engine/odes";

describe("OdeStepSolverState Reactive Controller", () => {
	it("initializes on Step 1 with default empty inputs", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);

		expect(solver.currentStep).toBe(1);
		expect(solver.isCompleted).toBe(false);
		expect(solver.hintTier).toBe(0);
		expect(solver.step1.isValid).toBe(false);
		expect(solver.previewCharEq).toBe("a_2 s^2 + a_1 s + a_0 = 0");
		expect(solver.activeHints.length).toBe(3);
		expect(solver.currentFeedback).toBe("");
	});

	it("renders dynamic preview equation across all sign and magnitude branches", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);

		// Default
		expect(solver.previewCharEq).toBe("a_2 s^2 + a_1 s + a_0 = 0");

		// a2 = 1, a1 = 1, a0 = 6
		solver.step1.a2 = "1";
		solver.step1.a1 = "1";
		solver.step1.a0 = "6";
		expect(solver.previewCharEq).toBe("s^2 + s + 6 = 0");

		// a2 = -1, a1 = -1, a0 = -6
		solver.step1.a2 = "-1";
		solver.step1.a1 = "-1";
		solver.step1.a0 = "-6";
		expect(solver.previewCharEq).toBe("-s^2 - s - 6 = 0");

		// a2 = 2, a1 = -5, a0 = 4
		solver.step1.a2 = "2";
		solver.step1.a1 = "-5";
		solver.step1.a0 = "4";
		expect(solver.previewCharEq).toBe("2s^2 - 5s + 4 = 0");

		// Non-numeric custom text fallback
		solver.step1.a2 = "m";
		solver.step1.a1 = "c";
		solver.step1.a0 = "k";
		expect(solver.previewCharEq).toBe("ms^2 + cs + k = 0");
	});

	it("derives the correct particular solution ansatz LaTeX for Step 4", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);
		const expectedLatex =
			problem.itsData.step4.options.find((o) => o.isCorrect)?.latex ?? "";

		expect(solver.correctAnsatz).toBe(expectedLatex);
		expect(solver.correctAnsatz.length).toBeGreaterThan(0);
		expect(
			solver.correctAnsatz.includes("y_p(t)") ||
				solver.correctAnsatz.includes("="),
		).toBe(true);
	});

	it("validates Step 1 characteristic equation and catches misconceptions", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);

		// Non-numeric / empty inputs (validation)
		solver.step1.a2 = "abc";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.step1.feedback).toContain("numeric values");
		expect(solver.currentFeedback).toContain("numeric values");

		// Misconception: student entered RHS forcing amplitude for a0
		solver.step1.a2 = String(problem.itsData.step1.expectedA2);
		solver.step1.a1 = String(problem.itsData.step1.expectedA1);
		solver.step1.a0 = String(problem.forcing.K);
		if (
			Math.abs(problem.forcing.K - problem.itsData.step1.expectedA0) >=
			0.05
		) {
			solver.checkStep1();
			expect(solver.step1.isValid).toBe(false);
			expect(solver.step1.feedbackType).toBe("misconception");
			expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
			expect(solver.step1.feedback).toBe(
				problem.itsData.step1.misconceptions.forcing_rhs,
			);
		}

		// Wrong coefficients fallback error message (incorrect)
		solver.step1.a0 = "999";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.step1.feedback).toContain("Incorrect coefficients");

		// Valid coefficients
		solver.step1.a0 = String(problem.itsData.step1.expectedA0);
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(true);
		expect(solver.step1.feedback).toBeNull();
		expect(solver.step1.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(2);
	});

	it("validates distinct real roots in Step 2 with order insensitivity", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);

		solver.advanceToStep(2);

		// Missing/non-numeric input (validation)
		solver.step2.r1 = "";
		solver.step2.r2 = "";
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.step2.feedback).toContain("numeric values");

		// Incorrect roots (incorrect)
		solver.step2.r1 = "999";
		solver.step2.r2 = "888";
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.step2.feedback).toContain("Incorrect roots");

		// Swapped order (valid)
		solver.step2.r1 = String(problem.itsData.step2.r2);
		solver.step2.r2 = String(problem.itsData.step2.r1);
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(true);
		expect(solver.step2.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(3);
	});

	it("validates repeated real roots in Step 2", () => {
		const problem = generateOdeProblem("repeated_real");
		const solver = new OdeStepSolverState(() => problem);

		solver.advanceToStep(2);

		// Non-numeric input (validation)
		solver.step2.r1 = "";
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");

		// Incorrect repeated root
		solver.step2.r1 = "999";
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.step2.feedback).toContain("Incorrect repeated root");

		// Correct repeated root
		solver.step2.r1 = String(problem.itsData.step2.r1);
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(true);
		expect(solver.step2.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(3);
	});

	it("validates complex conjugate roots in Step 2", () => {
		const problem = generateOdeProblem("complex_conjugate");
		const solver = new OdeStepSolverState(() => problem);

		solver.advanceToStep(2);

		// Non-numeric input (validation)
		solver.step2.sigma = "";
		solver.step2.omegaD = "";
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");

		// Incorrect complex roots
		solver.step2.sigma = "999";
		solver.step2.omegaD = "999";
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.step2.feedback).toContain(
			"Incorrect complex root components",
		);

		// Correct complex roots
		solver.step2.sigma = String(problem.itsData.step2.r1);
		solver.step2.omegaD = String(problem.itsData.step2.im);
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(true);
		expect(solver.step2.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(3);
	});

	it("validates Step 3 template selection and misconception feedback", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);
		solver.advanceToStep(3);

		// Incorrect template (misconception)
		solver.checkStep3("complex_conjugate");
		expect(solver.step3.isValid).toBe(false);
		expect(solver.step3.feedbackType).toBe("misconception");
		expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
		expect(solver.step3.feedback).toBe(
			problem.itsData.step3.misconceptions.complex_conjugate,
		);

		// Correct template
		solver.checkStep3(problem.itsData.step3.correctTemplate);
		expect(solver.step3.isValid).toBe(true);
		expect(solver.step3.feedback).toBeNull();
		expect(solver.step3.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(4);
	});

	it("validates Step 4 ansatz option selection with distractors and correct choice", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);
		solver.advanceToStep(4);

		// Incorrect option (misconception)
		const wrongOpt = problem.itsData.step4.options.find(
			(o) => !o.isCorrect,
		);
		expect(wrongOpt).toBeDefined();
		if (wrongOpt) {
			solver.checkStep4(wrongOpt);
			expect(solver.step4.isValid).toBe(false);
			expect(solver.step4.feedbackType).toBe("misconception");
			expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
			expect(solver.step4.feedback).toBe(wrongOpt.feedback);
		}

		// Correct option
		const correctOpt = problem.itsData.step4.options.find(
			(o) => o.isCorrect,
		);
		expect(correctOpt).toBeDefined();
		if (correctOpt) {
			solver.checkStep4(correctOpt);
			expect(solver.step4.isValid).toBe(true);
			expect(solver.step4.feedback).toBeNull();
			expect(solver.step4.feedbackType).toBeNull();
			expect(solver.currentStep).toBe(5);
		}
	});

	it("validates Step 5 particular coefficients for constant/exponential and sinusoidal forcing", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);
		solver.advanceToStep(5);

		if (problem.forcing.type === "sinusoid") {
			// Non-numeric input (validation)
			solver.step5.a = "";
			solver.step5.b = "";
			solver.checkStep5();
			expect(solver.step5.isValid).toBe(false);
			expect(solver.step5.feedbackType).toBe("validation");
			expect(solver.currentFeedbackTitle).toBe("Input Required:");

			// Incorrect numeric input
			solver.step5.a = "999";
			solver.step5.b = "999";
			solver.checkStep5();
			expect(solver.step5.isValid).toBe(false);
			expect(solver.step5.feedbackType).toBe("incorrect");
			expect(solver.currentFeedbackTitle).toBe("Incorrect:");
			expect(solver.step5.feedback).toContain(
				"Incorrect coefficients $A$ and $B$",
			);

			solver.step5.a = String(problem.itsData.step5.expectedA);
			solver.step5.b = String(problem.itsData.step5.expectedB);
			solver.checkStep5();
			expect(solver.step5.isValid).toBe(true);
			expect(solver.step5.feedback).toBeNull();
			expect(solver.step5.feedbackType).toBeNull();
		} else {
			// Non-numeric input (validation)
			solver.step5.kp = "";
			solver.checkStep5();
			expect(solver.step5.isValid).toBe(false);
			expect(solver.step5.feedbackType).toBe("validation");
			expect(solver.currentFeedbackTitle).toBe("Input Required:");

			// Incorrect numeric input
			solver.step5.kp = "999";
			solver.checkStep5();
			expect(solver.step5.isValid).toBe(false);
			expect(solver.step5.feedbackType).toBe("incorrect");
			expect(solver.currentFeedbackTitle).toBe("Incorrect:");
			expect(solver.step5.feedback).toContain(
				"Incorrect $K_p$ coefficient",
			);

			solver.step5.kp = String(problem.itsData.step5.expectedKp);
			solver.checkStep5();
			expect(solver.step5.isValid).toBe(true);
			expect(solver.step5.feedback).toBeNull();
			expect(solver.step5.feedbackType).toBeNull();
		}
		expect(solver.currentStep).toBe(6);
	});

	it("validates Step 6 initial condition constants C1, C2", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);
		solver.advanceToStep(6);

		// Non-numeric input (validation)
		solver.step6.c1 = "";
		solver.step6.c2 = "";
		solver.checkStep6();
		expect(solver.step6.isValid).toBe(false);
		expect(solver.step6.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");

		// Incorrect constants (incorrect)
		solver.step6.c1 = "999";
		solver.step6.c2 = "888";
		solver.checkStep6();
		expect(solver.step6.isValid).toBe(false);
		expect(solver.step6.feedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.step6.feedback).toContain(
			"Incorrect constants $C_1$, $C_2$",
		);

		// Correct constants
		solver.step6.c1 = String(problem.itsData.step6.expectedC1);
		solver.step6.c2 = String(problem.itsData.step6.expectedC2);
		solver.checkStep6();
		expect(solver.step6.isValid).toBe(true);
		expect(solver.step6.feedback).toBeNull();
		expect(solver.step6.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(7);
	});

	it("validates Step 7 response input and triggers onComplete", () => {
		const onComplete = vi.fn();
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(
			() => problem,
			() => onComplete,
		);
		solver.advanceToStep(7);

		// Empty/short response (validation)
		solver.handleStep7Submit("y");
		expect(solver.step7.isValid).toBe(false);
		expect(solver.step7.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.step7.feedback).toContain("total response");

		// Valid response
		solver.handleStep7Submit("y_{ZI}(t) + y_{ZS}(t)");
		expect(solver.step7.isValid).toBe(true);
		expect(solver.step7.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(8);
		expect(solver.isCompleted).toBe(true);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it("resets state completely when reset() is called", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);

		solver.step1.a2 = String(problem.itsData.step1.expectedA2);
		solver.step1.a1 = String(problem.itsData.step1.expectedA1);
		solver.step1.a0 = String(problem.itsData.step1.expectedA0);
		solver.checkStep1();
		solver.revealNextHint();
		expect(solver.currentStep).toBe(2);
		expect(solver.hintTier).toBe(1);

		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.hintTier).toBe(0);
		expect(solver.step1.a2).toBe("");
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step2.r1).toBe("");
		expect(solver.step3.selected).toBeNull();
		expect(solver.step4.selected).toBeNull();
		expect(solver.step5.kp).toBe("");
		expect(solver.step6.c1).toBe("");
		expect(solver.step7.latex).toBe("");
	});

	it("verifies all option LaTeX math strings in ODE steps are valid", () => {
		const problem = generateOdeProblem("distinct_real");

		// Step 4 option math strings
		for (const opt of problem.itsData.step4.options) {
			expect(opt.latex).toBeDefined();
			expect(opt.latex.length).toBeGreaterThan(0);
			expect(
				opt.latex.includes("y_p") ||
					opt.latex.includes("e^{") ||
					opt.latex.includes("\\cos") ||
					opt.latex.includes("="),
			).toBe(true);
		}
	});
});
