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

		// Unselected strategy validation
		expect(solver.step2.strategy).toBeNull();
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("validation");
		expect(solver.step2.feedback).toContain("select a solving strategy");

		// Select factoring strategy
		solver.step2.strategy = "factoring";

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
		// Both roots sign flipped (misconception)
		solver.step2.r1 = String(-problem.itsData.step2.r1);
		solver.step2.r2 = String(-(problem.itsData.step2.r2 ?? 0));
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("misconception");
		expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
		expect(solver.step2.feedback).toContain("Check your signs");

		// One root sign flipped (misconception)
		solver.step2.r1 = String(-problem.itsData.step2.r1);
		solver.step2.r2 = String(problem.itsData.step2.r2 ?? 0);
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("misconception");
		expect(solver.step2.feedback).toContain("Check the sign of your roots");

		// Swapped order (valid)
		solver.step2.r1 = String(problem.itsData.step2.r2 ?? 0);
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
		solver.step2.strategy = "factoring";

		// Missing/non-numeric input (validation)
		solver.step2.r1 = "";
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");

		// Sign flipped repeated root (misconception)
		if (Math.abs(problem.itsData.step2.r1) > 0.01) {
			solver.step2.r1 = String(-problem.itsData.step2.r1);
			solver.checkStep2();
			expect(solver.step2.isValid).toBe(false);
			expect(solver.step2.feedbackType).toBe("misconception");
			expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
			expect(solver.step2.feedback).toContain("Check your sign");
		}

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

	it("validates complex conjugate roots, classification remediation, and discriminant calculation in Step 2", () => {
		const problem = generateOdeProblem("complex_conjugate");
		const solver = new OdeStepSolverState(() => problem);

		solver.advanceToStep(2);

		expect(problem.itsData.step2.isFactorable).toBe(false);

		// Attempting factoring on complex polynomial produces pedagogical discriminant misconception
		solver.step2.strategy = "factoring";
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("incorrect");
		expect(solver.step2.feedback).toContain(
			"cannot be factored over real integers",
		);

		// Switch to quadratic formula path
		solver.step2.strategy = "quadratic";

		// Unselected classification/discriminant validation
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("validation");
		expect(solver.step2.feedback).toContain("root classification");

		// Guessing incorrect classification triggers forced discriminant remediation
		solver.selectQuadRootClassification("distinct_real");
		expect(solver.step2.quadNeedsDiscriminantCalc).toBe(true);
		expect(solver.step2.quadClassChoice).toBeNull();
		expect(solver.step2.feedbackType).toBe("incorrect");
		expect(solver.step2.feedback).toContain("Calculate the discriminant");

		// Non-numeric discriminant calculation
		solver.step2.quadDiscriminantInput = "abc";
		solver.verifyDiscriminant();
		expect(solver.step2.feedbackType).toBe("validation");
		expect(solver.step2.feedback).toContain("numeric value");

		// Incorrect discriminant value
		solver.step2.quadDiscriminantInput = "999";
		solver.verifyDiscriminant();
		expect(solver.step2.feedbackType).toBe("incorrect");
		expect(solver.step2.feedback).toContain("Incorrect discriminant");

		// Correct discriminant value unlocks complex roots entry
		solver.step2.quadDiscriminantInput = String(
			problem.itsData.step2.discriminant,
		);
		solver.verifyDiscriminant();
		expect(solver.step2.quadDiscriminantVerified).toBe(true);
		expect(solver.step2.quadClassChoice).toBe("complex_conjugate");
		expect(solver.step2.quadNeedsDiscriminantCalc).toBe(false);
		expect(solver.step2.feedbackType).toBeNull();

		// Missing/non-numeric complex roots (validation)
		solver.step2.sigma = "";
		solver.step2.omegaD = "";
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("validation");
		expect(solver.step2.feedback).toContain("numeric values");

		// Incorrect complex roots
		solver.step2.sigma = "999";
		solver.step2.omegaD = "999";
		solver.checkStep2();
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("incorrect");
		expect(solver.step2.feedback).toContain("Incorrect roots");

		// Correct complex roots (sigma and omega_d)
		solver.step2.sigma = String(problem.itsData.step2.r1);
		solver.step2.omegaD = String(Math.abs(problem.itsData.step2.im ?? 0));
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

	it("validates Step 5 multi-part progressive disclosure (derivatives, system, coefficients)", () => {
		// Test sinusoidal forcing (3-part step)
		let sinProblem = generateOdeProblem("distinct_real");
		while (sinProblem.forcing.type !== "sinusoid") {
			sinProblem = generateOdeProblem("distinct_real");
		}

		const sinSolver = new OdeStepSolverState(() => sinProblem);
		sinSolver.advanceToStep(5);

		expect(sinSolver.step5.activeSubStepId).toBe("derivatives");
		expect(sinSolver.step5.subSteps.derivatives.isValid).toBe(false);

		// Part 5A: Wrong derivatives distractor
		const wrongDeriv = sinProblem.itsData.step5.derivativeOptions?.find(
			(o) => !o.isCorrect,
		);
		if (wrongDeriv) {
			sinSolver.checkStep5Derivatives(wrongDeriv);
			expect(sinSolver.step5.subSteps.derivatives.isValid).toBe(false);
			expect(sinSolver.step5.feedbackType).toBe("misconception");
			expect(sinSolver.step5.feedback).toBe(wrongDeriv.feedback);
		}

		// Part 5A: Correct derivatives
		const correctDeriv = sinProblem.itsData.step5.derivativeOptions?.find(
			(o) => o.isCorrect,
		);
		expect(correctDeriv).toBeDefined();
		if (correctDeriv) {
			sinSolver.checkStep5Derivatives(correctDeriv);
			expect(sinSolver.step5.subSteps.derivatives.isValid).toBe(true);
			expect(sinSolver.step5.activeSubStepId).toBe("system_setup");
		}

		// Part 5B: Wrong system setup distractor
		const wrongSys = sinProblem.itsData.step5.systemOptions?.find(
			(o) => !o.isCorrect,
		);
		if (wrongSys) {
			sinSolver.checkStep5System(wrongSys);
			expect(sinSolver.step5.subSteps.system_setup.isValid).toBe(false);
			expect(sinSolver.step5.feedbackType).toBe("misconception");
			expect(sinSolver.step5.feedback).toBe(wrongSys.feedback);
		}

		// Part 5B: Correct system setup
		const correctSys = sinProblem.itsData.step5.systemOptions?.find(
			(o) => o.isCorrect,
		);
		expect(correctSys).toBeDefined();
		if (correctSys) {
			sinSolver.checkStep5System(correctSys);
			expect(sinSolver.step5.subSteps.system_setup.isValid).toBe(true);
			expect(sinSolver.step5.activeSubStepId).toBe("solve");
		}

		// Part 5C: Non-numeric input
		sinSolver.step5.a = "";
		sinSolver.step5.b = "";
		sinSolver.checkStep5Coeffs();
		expect(sinSolver.step5.subSteps.solve.isValid).toBe(false);
		expect(sinSolver.step5.feedbackType).toBe("validation");

		// Part 5C: Correct coefficients
		sinSolver.step5.a = String(sinProblem.itsData.step5.expectedA);
		sinSolver.step5.b = String(sinProblem.itsData.step5.expectedB);
		sinSolver.checkStep5Coeffs();
		expect(sinSolver.step5.subSteps.solve.isValid).toBe(true);
		expect(sinSolver.step5.isValid).toBe(true);
		expect(sinSolver.currentStep).toBe(6);

		// Test constant forcing (2-part step)
		let constProblem = generateOdeProblem("distinct_real");
		while (constProblem.forcing.type === "sinusoid") {
			constProblem = generateOdeProblem("distinct_real");
		}
		const constSolver = new OdeStepSolverState(() => constProblem);
		constSolver.advanceToStep(5);

		expect(constSolver.step5.activeSubStepId).toBe("derivatives");
		const cDeriv = constProblem.itsData.step5.derivativeOptions?.find(
			(o) => o.isCorrect,
		);
		if (cDeriv) {
			constSolver.checkStep5Derivatives(cDeriv);
			expect(constSolver.step5.subSteps.derivatives.isValid).toBe(true);
			expect(constSolver.step5.activeSubStepId).toBe("solve");
		}

		constSolver.step5.kp = String(constProblem.itsData.step5.expectedKp);
		constSolver.checkStep5Coeffs();
		expect(constSolver.step5.isValid).toBe(true);
		expect(constSolver.currentStep).toBe(6);
	});

	it("validates Step 6 multi-part progressive disclosure (target values, solved constants)", () => {
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(() => problem);
		solver.advanceToStep(6);

		expect(solver.step6.activeSubStepId).toBe("target_values");
		expect(solver.step6.subSteps.target_values.isValid).toBe(false);

		// Part 6A: Missing target values
		solver.step6.yh0 = "";
		solver.step6.dyh0 = "";
		solver.checkStep6TargetValues();
		expect(solver.step6.subSteps.target_values.isValid).toBe(false);
		expect(solver.step6.feedbackType).toBe("validation");

		// Part 6A: Wrong target values (forgetting to subtract yp)
		solver.step6.yh0 = String(problem.initialConditions.y0);
		solver.step6.dyh0 = String(problem.initialConditions.dy0);
		if (
			Math.abs(problem.itsData.step6.yp0) > 0.05 ||
			Math.abs(problem.itsData.step6.dyp0) > 0.05
		) {
			solver.checkStep6TargetValues();
			expect(solver.step6.subSteps.target_values.isValid).toBe(false);
			expect(solver.step6.feedbackType).toBe("misconception");
		}

		// Part 6A: Correct target values
		solver.step6.yh0 = String(problem.itsData.step6.targetYh0);
		solver.step6.dyh0 = String(problem.itsData.step6.targetDYh0);
		solver.checkStep6TargetValues();
		expect(solver.step6.subSteps.target_values.isValid).toBe(true);
		expect(solver.step6.activeSubStepId).toBe("solve_constants");

		// Part 6B: Missing constants
		solver.step6.c1 = "";
		solver.step6.c2 = "";
		solver.checkStep6Constants();
		expect(solver.step6.subSteps.solve_constants.isValid).toBe(false);
		expect(solver.step6.feedbackType).toBe("validation");

		// Part 6B: Incorrect constants
		solver.step6.c1 = "999";
		solver.step6.c2 = "888";
		solver.checkStep6Constants();
		expect(solver.step6.subSteps.solve_constants.isValid).toBe(false);
		expect(solver.step6.feedbackType).toBe("incorrect");

		// Part 6B: Correct constants
		solver.step6.c1 = String(problem.itsData.step6.expectedC1);
		solver.step6.c2 = String(problem.itsData.step6.expectedC2);
		solver.checkStep6Constants();
		expect(solver.step6.subSteps.solve_constants.isValid).toBe(true);
		expect(solver.step6.isValid).toBe(true);
		expect(solver.currentStep).toBe(7);
	});

	it("validates Step 7 multi-part response decomposition and triggers onComplete", () => {
		const onComplete = vi.fn();
		const problem = generateOdeProblem("distinct_real");
		const solver = new OdeStepSolverState(
			() => problem,
			() => onComplete,
		);
		solver.advanceToStep(7);

		expect(solver.step7.activeSubStepId).toBe("zi_zs");

		// Part 7A: Missing input
		solver.step7.ziC1 = "";
		solver.step7.ziC2 = "";
		solver.checkStep7ZI();
		expect(solver.step7.ziZsPassed).toBe(false);
		expect(solver.step7.feedbackType).toBe("validation");

		// Part 7A: Incorrect sign misconception
		const expC1 = problem.itsData.step7.ziConstants.C1;
		const expC2 = problem.itsData.step7.ziConstants.C2;
		if (Math.abs(expC1) > 0.01) {
			solver.step7.ziC1 = String(-expC1);
			solver.step7.ziC2 = String(expC2);
			solver.checkStep7ZI();
			expect(solver.step7.feedbackType).toBe("misconception");
		}

		// Part 7A: Correct constants
		solver.step7.ziC1 = String(expC1);
		solver.step7.ziC2 = String(expC2);
		solver.checkStep7ZI();
		expect(solver.step7.ziZsPassed).toBe(true);
		expect(solver.step7.activeSubStepId).toBe("tr_ss");

		// Part 7B: Missing transient / steady-state selection
		solver.checkStep7TrSS();
		expect(solver.step7.trSsPassed).toBe(false);
		expect(solver.step7.feedbackType).toBe("validation");

		// Part 7B: Wrong transient selection
		solver.step7.selectedTransient = "tr_yp";
		solver.step7.selectedSteadyState = "ss_correct";
		solver.checkStep7TrSS();
		expect(solver.step7.trSsPassed).toBe(false);
		expect(solver.step7.feedbackType).toBe("misconception");

		// Part 7B: Correct transient and steady-state selection
		solver.step7.selectedTransient = "tr_correct";
		solver.step7.selectedSteadyState = "ss_correct";
		solver.checkStep7TrSS();
		expect(solver.step7.trSsPassed).toBe(true);
		expect(solver.step7.activeSubStepId).toBe("concept");

		// Part 7C: Missing conceptual answer
		solver.checkStep7Concept();
		expect(solver.step7.conceptPassed).toBe(false);
		expect(solver.step7.feedbackType).toBe("validation");

		// Part 7C: Incorrect conceptual option
		const wrongOption = problem.itsData.step7.conceptQuestion.options.find(
			(o) => !o.isCorrect,
		);
		if (wrongOption) {
			solver.step7.selectedConcept = wrongOption.id;
			solver.checkStep7Concept();
			expect(solver.step7.conceptPassed).toBe(false);
			expect(solver.step7.feedbackType).toBe("misconception");
		}

		// Part 7C: Correct conceptual option
		const correctOption =
			problem.itsData.step7.conceptQuestion.options.find(
				(o) => o.isCorrect,
			);
		expect(correctOption).toBeDefined();
		solver.step7.selectedConcept = correctOption?.id ?? "";
		solver.checkStep7Concept();

		expect(solver.step7.conceptPassed).toBe(true);
		expect(solver.step7.activeSubStepId).toBe("concept");
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
		expect(solver.step7.ziC1).toBe("");
		expect(solver.step7.ziZsPassed).toBe(false);
		expect(solver.step7.activeSubStepId).toBe("zi_zs");
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
