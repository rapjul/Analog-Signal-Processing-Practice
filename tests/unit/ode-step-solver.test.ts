import { describe, expect, it, vi } from "vitest";
import { OdeStepSolverState } from "../../src/lib/components/solvers/ode-step-solver.svelte";
import {
	type ForcingType,
	generateOdeProblem,
	type RootType,
} from "../../src/lib/math-engine/odes";

function generateSecondOrderProblem(
	rootType: RootType | "random",
	forcingType: ForcingType | "random" = "random",
) {
	return generateOdeProblem({
		order: 2,
		rootType,
		forcingType,
		leadingCoefficient: "monic",
		resonance: "none",
	});
}

describe("OdeStepSolverState Reactive Controller", () => {
	it("uses order-aware inputs and validation for first-order problems", () => {
		const problem = generateOdeProblem({
			order: 1,
			rootType: "random",
			forcingType: "constant",
			leadingCoefficient: "non_monic",
			resonance: "none",
			seed: 210,
		});
		const solver = new OdeStepSolverState(() => problem);
		expect(solver.step2.strategy).toBe("factoring");
		expect(solver.step2.activeSubStepId).toBe("factoring_inputs");

		solver.step1.a1 = String(problem.params.a1);
		solver.step1.a0 = String(problem.params.a0);
		solver.checkStep1();
		expect(solver.currentStep).toBe(2);

		solver.step2.r1 = String(problem.params.roots.r1);
		solver.checkStep2Factoring();
		expect(solver.currentStep).toBe(3);

		solver.advanceToStep(6);
		solver.step6.yh0 = String(problem.itsData.step6.targetYh0);
		solver.checkStep6TargetValues();
		expect(solver.step6.subSteps.target_values.isValid).toBe(true);
		solver.step6.c1 = String(problem.itsData.step6.expectedC1);
		solver.checkStep6Constants();
		expect(solver.currentStep).toBe(7);

		solver.step7.ziC1 = String(problem.itsData.step7.ziConstants.C1);
		solver.checkStep7ZI();
		expect(solver.step7.ziZsPassed).toBe(true);
	});

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

	it("renders dynamic preview equation across all sign and magnitude branches", () => {
		const problem = generateSecondOrderProblem("distinct_real");
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
		const problem = generateSecondOrderProblem("distinct_real");
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
		const problem = generateSecondOrderProblem("distinct_real");
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
		const problem = generateSecondOrderProblem("distinct_real");
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
		const problem = generateSecondOrderProblem("repeated_real");
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
		const problem = generateSecondOrderProblem("complex_conjugate");
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
		expect(solver.step2.feedbackType).toBe("misconception");
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
		const problem = generateSecondOrderProblem("distinct_real");
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
		const problem = generateSecondOrderProblem("distinct_real");
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

	it("validates Step 5 multi-part progressive disclosure (first_deriv, second_deriv, system, coefficients)", () => {
		// Test sinusoidal forcing (4-part step)
		let sinProblem = generateSecondOrderProblem("distinct_real");
		while (sinProblem.forcing.type !== "sinusoid") {
			sinProblem = generateSecondOrderProblem("distinct_real");
		}

		const sinSolver = new OdeStepSolverState(() => sinProblem);
		sinSolver.advanceToStep(5);

		expect(sinSolver.step5.activeSubStepId).toBe("first_deriv");
		expect(sinSolver.step5.subSteps.first_deriv.isValid).toBe(false);

		// Part 5A-1: Wrong derivative distractor
		const wrongFirstDeriv =
			sinProblem.itsData.step5.firstDerivativeOptions?.find(
				(o) => !o.isCorrect,
			);
		if (wrongFirstDeriv) {
			sinSolver.checkStep5FirstDeriv(wrongFirstDeriv);
			expect(sinSolver.step5.subSteps.first_deriv.isValid).toBe(false);
			expect(sinSolver.step5.feedbackType).toBe("misconception");
			expect(sinSolver.step5.feedback).toBe(wrongFirstDeriv.feedback);
		}

		// Part 5A-1: Correct first derivative
		const correctFirstDeriv =
			sinProblem.itsData.step5.firstDerivativeOptions?.find(
				(o) => o.isCorrect,
			);
		expect(correctFirstDeriv).toBeDefined();
		if (correctFirstDeriv) {
			sinSolver.checkStep5FirstDeriv(correctFirstDeriv);
			expect(sinSolver.step5.subSteps.first_deriv.isValid).toBe(true);
			expect(sinSolver.step5.activeSubStepId).toBe("second_deriv");
		}

		// Part 5A-2: Correct second derivative
		const correctSecondDeriv =
			sinProblem.itsData.step5.secondDerivativeOptions?.find(
				(o) => o.isCorrect,
			);
		expect(correctSecondDeriv).toBeDefined();
		if (correctSecondDeriv) {
			sinSolver.checkStep5SecondDeriv(correctSecondDeriv);
			expect(sinSolver.step5.subSteps.second_deriv.isValid).toBe(true);
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

		// Test constant forcing (3-part step)
		let constProblem = generateSecondOrderProblem("distinct_real");
		while (constProblem.forcing.type === "sinusoid") {
			constProblem = generateSecondOrderProblem("distinct_real");
		}
		const constSolver = new OdeStepSolverState(() => constProblem);
		constSolver.advanceToStep(5);

		expect(constSolver.step5.activeSubStepId).toBe("first_deriv");
		const cFirst = constProblem.itsData.step5.firstDerivativeOptions?.find(
			(o) => o.isCorrect,
		);
		if (cFirst) {
			constSolver.checkStep5FirstDeriv(cFirst);
			expect(constSolver.step5.subSteps.first_deriv.isValid).toBe(true);
			expect(constSolver.step5.activeSubStepId).toBe("second_deriv");
		}
		const cSecond =
			constProblem.itsData.step5.secondDerivativeOptions?.find(
				(o) => o.isCorrect,
			);
		if (cSecond) {
			constSolver.checkStep5SecondDeriv(cSecond);
			expect(constSolver.step5.subSteps.second_deriv.isValid).toBe(true);
			expect(constSolver.step5.activeSubStepId).toBe("solve");
		}

		constSolver.step5.kp = String(constProblem.itsData.step5.expectedKp);
		constSolver.checkStep5Coeffs();
		expect(constSolver.step5.isValid).toBe(true);
		expect(constSolver.currentStep).toBe(6);
	});

	it("validates Step 6 multi-part progressive disclosure (target values, solved constants)", () => {
		const problem = generateSecondOrderProblem("distinct_real");
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
			Math.abs(problem.itsData.step6.dyp0 ?? 0) > 0.05
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
		const problem = generateSecondOrderProblem("distinct_real");
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

		// Part 7A: Total vs Zero-Input Confusion misconception
		const expC1 = problem.itsData.step7.ziConstants.C1;
		const expC2 = problem.itsData.step7.ziConstants.C2;
		solver.step7.ziC1 = String(problem.itsData.step6.expectedC1);
		solver.step7.ziC2 = String(problem.itsData.step6.expectedC2);
		solver.checkStep7ZI();
		if (
			Math.abs(problem.itsData.step6.expectedC1 - expC1) > 0.01 ||
			Math.abs((problem.itsData.step6.expectedC2 ?? 0) - (expC2 ?? 0)) >
				0.01
		) {
			expect(solver.step7.feedbackType).toBe("misconception");
		}

		// Part 7A: Incorrect numeric constants
		solver.step7.ziC1 = "999";
		solver.step7.ziC2 = "999";
		solver.checkStep7ZI();
		expect(solver.step7.feedbackType).toBe("incorrect");

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
			solver.checkStep7Concept(wrongOption);
			expect(solver.step7.conceptPassed).toBe(false);
			expect(solver.step7.feedbackType).toBe("misconception");
			expect(solver.step7.feedback).toBe(wrongOption.feedback);
		}

		// Part 7C: Correct conceptual option
		const correctOption =
			problem.itsData.step7.conceptQuestion.options.find(
				(o) => o.isCorrect,
			);
		expect(correctOption).toBeDefined();
		if (correctOption) solver.checkStep7Concept(correctOption);
		expect(solver.step7.conceptPassed).toBe(true);
		expect(solver.step7.activeSubStepId).toBe("concept");
		expect(solver.currentStep).toBe(8);
		expect(solver.isCompleted).toBe(true);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it("resets state completely when reset() is called", () => {
		const problem = generateSecondOrderProblem("distinct_real");
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
		const problem = generateSecondOrderProblem("distinct_real");

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

	it("computes accurate step badges and subpart progress descriptors across all steps", () => {
		const problemExp = generateSecondOrderProblem(
			"distinct_real",
			"exponential",
		);
		const solverExp = new OdeStepSolverState(() => problemExp);

		// Step 5 on exponential forcing (total parts = 3)
		solverExp.currentStep = 5;
		solverExp.step5.activeSubStepId = "first_deriv";
		expect(solverExp.step5Badge).toBe("Step 5A-1");
		expect(solverExp.step5Progress).toEqual({
			current: 1,
			total: 3,
			label: "Part 1 of 3",
		});

		solverExp.step5.activeSubStepId = "second_deriv";
		expect(solverExp.step5Badge).toBe("Step 5A-2");
		expect(solverExp.step5Progress).toEqual({
			current: 2,
			total: 3,
			label: "Part 2 of 3",
		});

		solverExp.step5.activeSubStepId = "solve";
		expect(solverExp.step5Badge).toBe("Step 5C");
		expect(solverExp.step5Progress).toEqual({
			current: 3,
			total: 3,
			label: "Part 3 of 3",
		});
		expect(solverExp.step5CSubpartBadge).toBe("Part 5B");

		// Step 5 on sinusoidal forcing (total parts = 4)
		const problemSin = generateSecondOrderProblem(
			"distinct_real",
			"sinusoid",
		);
		const solverSin = new OdeStepSolverState(() => problemSin);
		solverSin.currentStep = 5;
		solverSin.step5.activeSubStepId = "system_setup";
		expect(solverSin.step5Badge).toBe("Step 5B");
		expect(solverSin.step5Progress).toEqual({
			current: 3,
			total: 4,
			label: "Part 3 of 4",
		});
		expect(solverSin.step5CSubpartBadge).toBe("Part 5C");

		// Step 6
		solverExp.currentStep = 6;
		solverExp.step6.activeSubStepId = "target_values";
		expect(solverExp.step6Badge).toBe("Step 6A");
		expect(solverExp.step6Progress).toEqual({
			current: 1,
			total: 2,
			label: "Part 1 of 2",
		});

		solverExp.step6.activeSubStepId = "solve_constants";
		expect(solverExp.step6Badge).toBe("Step 6B");
		expect(solverExp.step6Progress).toEqual({
			current: 2,
			total: 2,
			label: "Part 2 of 2",
		});

		// Step 7
		solverExp.currentStep = 7;
		solverExp.step7.activeSubStepId = "zi_zs";
		expect(solverExp.step7Badge).toBe("Step 7A");
		expect(solverExp.step7Progress).toEqual({
			current: 1,
			total: 3,
			label: "Part 1 of 3",
		});

		solverExp.step7.activeSubStepId = "tr_ss";
		expect(solverExp.step7Badge).toBe("Step 7B");
		expect(solverExp.step7Progress).toEqual({
			current: 2,
			total: 3,
			label: "Part 2 of 3",
		});

		solverExp.step7.activeSubStepId = "concept";
		expect(solverExp.step7Badge).toBe("Step 7C");
		expect(solverExp.step7Progress).toEqual({
			current: 3,
			total: 3,
			label: "Part 3 of 3",
		});
	});
});
