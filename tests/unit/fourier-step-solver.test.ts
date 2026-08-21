import { describe, expect, it, vi } from "vitest";
import { FourierStepSolverState } from "../../src/lib/components/solvers/fourier-step-solver.svelte";
import { generateFourierSeriesProblem } from "../../src/lib/math-engine/fourier-series";

describe("FourierStepSolverState Reactive Controller", () => {
	it("initializes in pristine state on Step 1", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierStepSolverState(() => problem);

		expect(solver.currentStep).toBe(1);
		expect(solver.isCompleted).toBe(false);
		expect(solver.hintTier).toBe(0);
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedback).toBeNull();
		expect(solver.activeHints.length).toBe(3);
		expect(solver.currentFeedback).toBe("");
	});

	it("reveals progressive hints up to Tier 3 and caps", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierStepSolverState(() => problem);

		expect(solver.hintTier).toBe(0);
		solver.revealNextHint();
		expect(solver.hintTier).toBe(1);
		solver.revealNextHint();
		expect(solver.hintTier).toBe(2);
		solver.revealNextHint();
		expect(solver.hintTier).toBe(3);
		// Should cap at 3
		solver.revealNextHint();
		expect(solver.hintTier).toBe(3);
	});

	it("derives the hint cap from the active hint count", () => {
		const problem = generateFourierSeriesProblem("square");
		problem.itsData.step1.hints.push("Fourth hint", "Fifth hint");
		const solver = new FourierStepSolverState(() => problem);

		for (let index = 0; index < 6; index += 1) solver.revealNextHint();

		expect(solver.activeHints).toHaveLength(5);
		expect(solver.hintTier).toBe(5);
	});

	it("validates Step 1 with tolerance, units, and alias checking across all branches", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierStepSolverState(() => problem);

		// 0. Empty inputs (validation)
		solver.step1.period = "";
		solver.step1.freq = "";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.step1.feedback).toContain("values for both");

		// 1. Invalid period value (incorrect)
		solver.step1.period = "999";
		solver.step1.freq = problem.itsData.step1.w0Aliases[0];
		solver.step1.periodUnit = "s";
		solver.step1.freqUnit = "rad/s";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.step1.feedback).toContain("Incorrect Period value");
		expect(solver.currentFeedback).toContain("Incorrect Period value");

		// 2. Unsupported period unit (validation)
		solver.step1.period = String(problem.itsData.step1.expectedT);
		solver.step1.periodUnit = "minutes";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.step1.feedback).toContain("Unsupported period unit");

		// 3. Invalid frequency value (incorrect)
		solver.step1.periodUnit = "s";
		solver.step1.freq = "999";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.step1.feedback).toContain(
			"Incorrect Fundamental Frequency",
		);

		// 4. Unsupported frequency unit (validation)
		solver.step1.freq = problem.itsData.step1.w0Aliases[0];
		solver.step1.freqUnit = "cycles/min";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.step1.feedback).toContain("Unsupported frequency unit");

		// 5. Correct inputs
		solver.step1.freqUnit = "rad/s";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(true);
		expect(solver.step1.feedback).toBeNull();
		expect(solver.step1.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(2);
		expect(solver.hintTier).toBe(0);
	});

	it("converts equivalent millisecond and hertz answers", () => {
		const problem = generateFourierSeriesProblem("square", {
			seed: 10,
			T0: 4,
		});
		const solver = new FourierStepSolverState(() => problem);

		solver.step1.period = "4000";
		solver.step1.periodUnit = "ms";
		solver.step1.freq = "0.25";
		solver.step1.freqUnit = "Hz";
		solver.checkStep1();

		expect(solver.step1.isValid).toBe(true);
		expect(solver.currentStep).toBe(2);
	});

	it("validates Step 2 (symmetry) with correct and misconception branches", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierStepSolverState(() => problem);
		solver.advanceToStep(2);

		// Incorrect symmetry (misconception)
		const wrongSymmetry =
			problem.itsData.step2.correctSymmetry === "even" ? "odd" : "even";
		solver.checkStep2(wrongSymmetry);
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("misconception");
		expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
		expect(solver.step2.feedback).toBeDefined();
		expect(solver.currentFeedback).toBe(solver.step2.feedback);

		// Correct symmetry
		solver.checkStep2(problem.itsData.step2.correctSymmetry);
		expect(solver.step2.isValid).toBe(true);
		expect(solver.step2.feedback).toBeNull();
		expect(solver.step2.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(3);
	});

	it("validates Step 3 (vanishing) with correct and misconception branches", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierStepSolverState(() => problem);
		solver.advanceToStep(3);

		// Incorrect vanishing (misconception)
		solver.checkStep3("none");
		expect(solver.step3.isValid).toBe(false);
		expect(solver.step3.feedbackType).toBe("misconception");
		expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
		expect(solver.step3.feedback).toBeDefined();

		// Correct vanishing
		solver.checkStep3(problem.itsData.step3.correctVanishing);
		expect(solver.step3.isValid).toBe(true);
		expect(solver.step3.feedback).toBeNull();
		expect(solver.step3.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(4);
	});

	it("validates Step 4 (representation form) with correct and misconception branches", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierStepSolverState(() => problem);
		solver.advanceToStep(4);

		// Incorrect form (misconception)
		const wrongForm =
			problem.itsData.step4.correctForm === "trig" ? "exp" : "trig";
		solver.checkStep4(wrongForm);
		expect(solver.step4.isValid).toBe(false);
		expect(solver.step4.feedbackType).toBe("misconception");
		expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
		expect(solver.step4.feedback).toBeDefined();

		// Correct form
		solver.checkStep4(problem.itsData.step4.correctForm);
		expect(solver.step4.isValid).toBe(true);
		expect(solver.step4.feedback).toBeNull();
		expect(solver.step4.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(5);
	});

	it("validates Step 5 (integral setup) with incorrect distractor and correct option", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierStepSolverState(() => problem);
		solver.advanceToStep(5);

		// Incorrect option (misconception)
		const wrongOpt = problem.itsData.step5.options.find(
			(o) => !o.isCorrect,
		);
		expect(wrongOpt).toBeDefined();
		if (wrongOpt) {
			solver.checkStep5(wrongOpt);
			expect(solver.step5.isValid).toBe(false);
			expect(solver.step5.feedbackType).toBe("misconception");
			expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
			expect(solver.step5.feedback).toBe(wrongOpt.feedback);
		}

		// Correct option
		const correctOpt = problem.itsData.step5.options.find(
			(o) => o.isCorrect,
		);
		expect(correctOpt).toBeDefined();
		if (correctOpt) {
			solver.checkStep5(correctOpt);
			expect(solver.step5.isValid).toBe(true);
			expect(solver.step5.feedback).toBeNull();
			expect(solver.step5.feedbackType).toBeNull();
			expect(solver.currentStep).toBe(6);
		}
	});

	it("validates Step 6 (final series expression) and executes onComplete callback", () => {
		const onComplete = vi.fn();
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierStepSolverState(
			() => problem,
			() => onComplete,
		);
		solver.advanceToStep(6);

		// Incorrect option (misconception)
		const wrongOpt = problem.itsData.step6.options.find(
			(o) => !o.isCorrect,
		);
		expect(wrongOpt).toBeDefined();
		if (wrongOpt) {
			solver.checkStep6(wrongOpt);
			expect(solver.step6.isValid).toBe(false);
			expect(solver.step6.feedbackType).toBe("misconception");
			expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
			expect(solver.step6.feedback).toBe(wrongOpt.feedback);
		}

		// Correct option
		const correctOpt = problem.itsData.step6.options.find(
			(o) => o.isCorrect,
		);
		expect(correctOpt).toBeDefined();
		if (correctOpt) {
			solver.checkStep6(correctOpt);
			expect(solver.step6.isValid).toBe(true);
			expect(solver.step6.feedback).toBeNull();
			expect(solver.step6.feedbackType).toBeNull();
			expect(solver.currentStep).toBe(7);
			expect(solver.isCompleted).toBe(true);
			expect(onComplete).toHaveBeenCalledTimes(1);
		}
	});

	it("verifies all option LaTeX math strings are valid and non-empty", () => {
		const problem = generateFourierSeriesProblem("sawtooth");

		// Step 5 option math strings
		for (const opt of problem.itsData.step5.options) {
			expect(opt.latex).toBeDefined();
			expect(opt.latex.length).toBeGreaterThan(0);
			expect(
				opt.latex.includes("=") ||
					opt.latex.includes("\\int") ||
					opt.latex.includes("0"),
			).toBe(true);
		}

		// Step 6 option math strings
		for (const opt of problem.itsData.step6.options) {
			expect(opt.latex).toBeDefined();
			expect(opt.latex.length).toBeGreaterThan(0);
			expect(
				opt.latex.includes("x(t)") ||
					opt.latex.includes("\\sin") ||
					opt.latex.includes("\\cos"),
			).toBe(true);
		}
	});

	it("resets state completely when reset() is called", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierStepSolverState(() => problem);

		solver.step1.period = String(problem.itsData.step1.expectedT);
		solver.step1.freq = problem.itsData.step1.w0Aliases[0];
		solver.checkStep1();
		solver.revealNextHint();
		expect(solver.currentStep).toBe(2);
		expect(solver.hintTier).toBe(1);

		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.hintTier).toBe(0);
		expect(solver.step1.period).toBe("");
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step2.selected).toBeNull();
		expect(solver.step3.selected).toBeNull();
		expect(solver.step4.selected).toBeNull();
		expect(solver.step5.selected).toBeNull();
		expect(solver.step6.selected).toBeNull();
	});
});
