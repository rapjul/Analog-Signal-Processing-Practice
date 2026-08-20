import { describe, expect, it } from "vitest";
import { OdeStepSolverState } from "../../src/lib/components/solvers/ode-step-solver.svelte";
import {
	type ForcingType,
	generateOdeProblem,
	type SecondOrderRootType,
	type WithRandom,
} from "../../src/lib/math-engine/odes/index";

/**
 * Helper to generate second-order ODE problem for validation tests.
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

describe("OdeStepSolverState Input Validation & Misconceptions", () => {
	describe("Step 1: Characteristic Equation Validation", () => {
		/**
		 * Verifies dynamic preview equation across multiple signs and formats.
		 */
		it("renders dynamic preview equation across all sign and magnitude branches", () => {
			const problem = generateSecondOrderProblem("distinct_real");
			const solver = new OdeStepSolverState(() => problem);

			expect(solver.previewCharEq).toBe("a_2 s^2 + a_1 s + a_0 = 0");

			solver.step1.a2 = "1";
			solver.step1.a1 = "1";
			solver.step1.a0 = "6";
			expect(solver.previewCharEq).toBe("s^2 + s + 6 = 0");

			solver.step1.a2 = "-1";
			solver.step1.a1 = "-1";
			solver.step1.a0 = "-6";
			expect(solver.previewCharEq).toBe("-s^2 - s - 6 = 0");

			solver.step1.a2 = "2";
			solver.step1.a1 = "-5";
			solver.step1.a0 = "4";
			expect(solver.previewCharEq).toBe("2s^2 - 5s + 4 = 0");

			solver.step1.a2 = "m";
			solver.step1.a1 = "c";
			solver.step1.a0 = "k";
			expect(solver.previewCharEq).toBe("ms^2 + cs + k = 0");
		});

		/**
		 * Verifies Step 1 input validation error messages and misconceptions.
		 */
		it("validates Step 1 characteristic equation inputs and catches misconceptions", () => {
			const problem = generateSecondOrderProblem("distinct_real");
			const solver = new OdeStepSolverState(() => problem);

			// Empty inputs
			solver.checkStep1();
			expect(solver.currentStep).toBe(1);
			expect(solver.currentFeedback).toContain(
				"Please enter numeric values for all",
			);

			// Invalid non-numeric input
			solver.step1.a2 = "abc";
			solver.step1.a1 = "2";
			solver.step1.a0 = "1";
			solver.checkStep1();
			expect(solver.currentStep).toBe(1);
			expect(solver.currentFeedback).toContain(
				"Please enter numeric values",
			);

			// Incorrect values
			solver.step1.a2 = "1";
			solver.step1.a1 = "99";
			solver.step1.a0 = "99";
			solver.checkStep1();
			expect(solver.currentStep).toBe(1);
			expect(solver.currentFeedback).toContain("Incorrect coefficients");

			// Correct inputs
			solver.step1.a2 = String(problem.params.a2);
			solver.step1.a1 = String(problem.params.a1);
			solver.step1.a0 = String(problem.params.a0);
			solver.checkStep1();
			expect(solver.currentStep).toBe(2);
			expect(solver.step1.isValid).toBe(true);
		});
	});

	describe("Step 2: Characteristic Roots Validation", () => {
		/**
		 * Verifies distinct real roots validation with order insensitivity.
		 */
		it("validates distinct real roots in Step 2 with order insensitivity", () => {
			const problem = generateSecondOrderProblem("distinct_real");
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(2);
			solver.selectStep2Strategy("quadratic");
			solver.checkStep2QuadClass("distinct_real");

			const r1 = problem.params.roots.r1;
			const r2 = problem.params.roots.r2 ?? 0;

			// Non-numeric roots
			solver.step2.r1 = "invalid";
			solver.step2.r2 = String(r2);
			solver.checkStep2QuadRoots();
			expect(solver.currentStep).toBe(2);
			expect(solver.currentFeedback).toContain(
				"Please enter numeric values",
			);

			// Reversed order of roots (both r1, r2 and r2, r1 should be accepted)
			solver.step2.r1 = String(r2);
			solver.step2.r2 = String(r1);
			solver.checkStep2QuadRoots();
			expect(solver.currentStep).toBe(3);
			expect(solver.step2.isValid).toBe(true);
		});

		/**
		 * Verifies repeated real roots validation.
		 */
		it("validates repeated real roots in Step 2", () => {
			const problem = generateSecondOrderProblem("repeated_real");
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(2);
			solver.selectStep2Strategy("quadratic");
			solver.checkStep2QuadClass("repeated_real");

			const r = problem.params.roots.r1;

			// Incorrect root
			solver.step2.r1 = String(r + 1);
			solver.checkStep2QuadRoots();
			expect(solver.currentStep).toBe(2);
			expect(solver.currentFeedback).toContain("Incorrect repeated root");

			// Correct root
			solver.step2.r1 = String(r);
			solver.checkStep2QuadRoots();
			expect(solver.currentStep).toBe(3);
			expect(solver.step2.isValid).toBe(true);
		});

		/**
		 * Verifies complex conjugate roots, remediation, and discriminant calculation.
		 */
		it("validates complex conjugate roots, classification remediation, and discriminant calculation in Step 2", () => {
			const problem = generateSecondOrderProblem("complex_conjugate");
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(2);
			solver.selectStep2Strategy("quadratic");

			// Wrong classification selection triggers remedial discriminant calculation
			solver.checkStep2QuadClass("distinct_real");
			expect(solver.step2.activeSubStepId).toBe("remedial_discriminant");
			expect(solver.step2.quadNeedsDiscriminantCalc).toBe(true);

			// Remedial discriminant non-numeric
			solver.step2.quadDiscriminantInput = "nan";
			solver.checkStep2Discriminant();
			expect(solver.currentFeedback).toContain(
				"Please enter a numeric value",
			);

			// Remedial discriminant incorrect value
			solver.step2.quadDiscriminantInput = "100";
			solver.checkStep2Discriminant();
			expect(solver.currentFeedback).toContain("Incorrect discriminant");

			// Correct discriminant
			const a2 = problem.params.a2 ?? 1;
			const a1 = problem.params.a1;
			const a0 = problem.params.a0;
			const expectedDisc = a1 * a1 - 4 * a2 * a0;
			solver.step2.quadDiscriminantInput = String(expectedDisc);
			solver.checkStep2Discriminant();
			expect(solver.step2.quadDiscriminantVerified).toBe(true);
			expect(solver.step2.activeSubStepId).toBe("quad_root_inputs");

			// Complex conjugate roots input validation
			const sigma = problem.params.roots.r1;
			const omegaD = problem.params.roots.im ?? 1;

			solver.step2.sigma = String(sigma);
			solver.step2.omegaD = String(omegaD);
			solver.checkStep2QuadRoots();
			expect(solver.currentStep).toBe(3);
		});
	});

	describe("Step 3: Homogeneous Form Template Validation", () => {
		/**
		 * Verifies template distractors and misconceptions for first- and second-order problems.
		 */
		it("evaluates Step 3 template distractors and misconceptions for first- and second-order problems", () => {
			const p1 = generateOdeProblem({
				order: 1,
				forcingType: "constant",
				seed: 70,
			});
			const s1 = new OdeStepSolverState(() => p1);
			s1.currentStep = 3;

			s1.checkStep3("distinct_real");
			expect(s1.currentStep).toBe(3);
			expect(s1.currentFeedback).toContain(
				"only one characteristic root",
			);

			s1.checkStep3("repeated_real");
			expect(s1.currentStep).toBe(3);
			expect(s1.currentFeedback).toContain(
				"second-order characteristic polynomial",
			);

			s1.checkStep3("complex_conjugate");
			expect(s1.currentStep).toBe(3);
			expect(s1.currentFeedback).toContain(
				"oscillatory modes require at least a second-order",
			);

			s1.checkStep3("single_real");
			expect(s1.currentStep).toBe(4);

			// 2nd-order distinct real
			const p2 = generateOdeProblem({
				order: 2,
				rootType: "distinct_real",
				forcingType: "constant",
				seed: 71,
			});
			const s2 = new OdeStepSolverState(() => p2);
			s2.currentStep = 3;

			s2.checkStep3("single_real");
			expect(s2.currentStep).toBe(3);
			expect(s2.currentFeedback).toContain(
				"two characteristic roots and two independent modes",
			);

			s2.checkStep3("distinct_real");
			expect(s2.currentStep).toBe(4);
		});
	});

	describe("Step 4: Particular Ansatz Option Validation", () => {
		/**
		 * Verifies ansatz option selection with distractors and correct choice.
		 */
		it("validates Step 4 ansatz option selection with distractors and correct choice", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"exponential",
			);
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(4);

			const incorrectOpt = problem.itsData.step4.options.find(
				(o) => !o.isCorrect,
			);
			const correctOpt = problem.itsData.step4.options.find(
				(o) => o.isCorrect,
			);

			if (incorrectOpt) {
				solver.checkStep4(incorrectOpt);
				expect(solver.currentStep).toBe(4);
				expect(solver.step4.isValid).toBe(false);
				expect(solver.currentFeedback).toContain(incorrectOpt.feedback);
			}

			if (correctOpt) {
				solver.checkStep4(correctOpt);
				expect(solver.currentStep).toBe(5);
				expect(solver.step4.isValid).toBe(true);
			}
		});
	});

	describe("Step 5: Undetermined Coefficients Validation", () => {
		/**
		 * Verifies progressive disclosure and feedback for sinusoidal systems in Step 5.
		 */
		it("validates Step 5 multi-part progressive disclosure for sinusoidal forcing", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"sinusoid",
			);
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(5);

			// First derivative
			const wrongD1 = problem.itsData.step5.firstDerivativeOptions?.find(
				(o) => !o.isCorrect,
			);
			const correctD1 =
				problem.itsData.step5.firstDerivativeOptions?.find(
					(o) => o.isCorrect,
				);
			if (wrongD1) {
				solver.checkStep5FirstDeriv(wrongD1);
				expect(solver.step5.activeSubStepId).toBe("first_deriv");
			}
			if (correctD1) {
				solver.checkStep5FirstDeriv(correctD1);
				expect(solver.step5.activeSubStepId).toBe("second_deriv");
			}

			// Second derivative
			const wrongD2 = problem.itsData.step5.secondDerivativeOptions?.find(
				(o) => !o.isCorrect,
			);
			const correctD2 =
				problem.itsData.step5.secondDerivativeOptions?.find(
					(o) => o.isCorrect,
				);
			if (wrongD2) {
				solver.checkStep5SecondDeriv(wrongD2);
				expect(solver.step5.activeSubStepId).toBe("second_deriv");
			}
			if (correctD2) {
				solver.checkStep5SecondDeriv(correctD2);
				expect(solver.step5.activeSubStepId).toBe("system_setup");
			}

			// System setup
			const wrongSys = problem.itsData.step5.systemOptions?.find(
				(o) => !o.isCorrect,
			);
			const correctSys = problem.itsData.step5.systemOptions?.find(
				(o) => o.isCorrect,
			);
			if (wrongSys) {
				solver.checkStep5System(wrongSys);
				expect(solver.step5.activeSubStepId).toBe("system_setup");
			}
			if (correctSys) {
				solver.checkStep5System(correctSys);
				expect(solver.step5.activeSubStepId).toBe("solve");
			}

			// Undetermined coefficients solving (A, B)
			solver.step5.a = "invalid";
			solver.step5.b = "1";
			solver.checkStep5Coeffs();
			expect(solver.currentFeedback).toContain(
				"Please enter numeric values for both coefficients",
			);

			solver.step5.a = String(problem.itsData.step5.expectedA ?? 0);
			solver.step5.b = String(problem.itsData.step5.expectedB ?? 0);
			solver.checkStep5Coeffs();
			expect(solver.currentStep).toBe(6);
		});

		/**
		 * Verifies checkStep5Derivatives helper function.
		 */
		it("validates checkStep5Derivatives option handling", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"exponential",
			);
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(5);

			const correctD1 =
				problem.itsData.step5.firstDerivativeOptions?.find(
					(o) => o.isCorrect,
				);
			if (correctD1) {
				solver.checkStep5Derivatives(correctD1);
				expect(solver.step5.selectedDerivatives).toBe(correctD1.id);
			}
		});
	});

	describe("Step 6: Initial Conditions Validation", () => {
		/**
		 * Verifies target values, particular-offset misconceptions, and constants solving in Step 6.
		 */
		it("validates Step 6 target values, misconceptions, and integration constants", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"constant",
			);
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(6);

			// Empty inputs
			solver.step6.yh0 = "";
			solver.checkStep6TargetValues();
			expect(solver.currentFeedback).toContain(
				"Please enter numeric values or fractions for both target values",
			);

			// Forgetting particular offset misconception
			solver.step6.yh0 = String(problem.initialConditions.y0);
			solver.step6.dyh0 = String(problem.initialConditions.dy0 ?? 0);
			if (
				problem.itsData.step6.yp0 !== 0 ||
				problem.itsData.step6.dyp0 !== 0
			) {
				solver.checkStep6TargetValues();
				expect(solver.currentFeedback).toContain(
					"Forgetting Particular Contribution",
				);
			}

			// Correct target values
			solver.step6.yh0 = String(problem.itsData.step6.targetYh0);
			solver.step6.dyh0 = String(problem.itsData.step6.targetDYh0 ?? 0);
			solver.checkStep6TargetValues();
			expect(solver.step6.activeSubStepId).toBe("solve_constants");

			// Invalid constants
			solver.step6.c1 = "xyz";
			solver.checkStep6Constants();
			expect(solver.currentFeedback).toContain(
				"Please enter numeric values for both constants",
			);

			// Incorrect constants
			solver.step6.c1 = "999";
			solver.step6.c2 = "999";
			solver.checkStep6Constants();
			expect(solver.currentFeedback).toContain("Incorrect constants");

			// Correct constants
			solver.step6.c1 = String(problem.itsData.step6.expectedC1);
			solver.step6.c2 = String(problem.itsData.step6.expectedC2 ?? 0);
			solver.checkStep6Constants();
			expect(solver.currentStep).toBe(7);
		});
	});

	describe("Step 7: Response Decomposition Validation", () => {
		/**
		 * Verifies Step 7 zero-input separation, transient vs steady-state, and concept choices.
		 */
		it("validates Step 7 zero-input separation, transient/steady-state, and concept selection", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"constant",
			);
			const solver = new OdeStepSolverState(() => problem);
			solver.advanceToStep(7);

			// Non-numeric zero-input constants
			solver.step7.ziC1 = "abc";
			solver.checkStep7ZI();
			expect(solver.currentFeedback).toContain(
				"numeric values or fractions",
			);

			// Incorrect zero-input constants
			solver.step7.ziC1 = "999";
			solver.step7.ziC2 = "999";
			solver.checkStep7ZI();
			expect(solver.currentFeedback).toContain(
				"Incorrect Zero-Input constants",
			);

			// Correct zero-input constants
			solver.step7.ziC1 = String(problem.itsData.step7.ziConstants.C1);
			solver.step7.ziC2 = String(
				problem.itsData.step7.ziConstants.C2 ?? 0,
			);
			solver.checkStep7ZI();
			expect(solver.step7.activeSubStepId).toBe("tr_ss");

			// Transient & steady-state selection
			const wrongTr = problem.itsData.step7.transientOptions.find(
				(o) => !o.isCorrect,
			);
			const correctTr = problem.itsData.step7.transientOptions.find(
				(o) => o.isCorrect,
			);
			const wrongSS = problem.itsData.step7.steadyStateOptions.find(
				(o) => !o.isCorrect,
			);
			const correctSS = problem.itsData.step7.steadyStateOptions.find(
				(o) => o.isCorrect,
			);

			if (wrongTr && correctSS) {
				solver.step7.selectedTransient = wrongTr.id;
				solver.step7.selectedSteadyState = correctSS.id;
				solver.checkStep7TrSS();
				expect(solver.step7.activeSubStepId).toBe("tr_ss");
			}

			if (correctTr && wrongSS) {
				solver.step7.selectedTransient = correctTr.id;
				solver.step7.selectedSteadyState = wrongSS.id;
				solver.checkStep7TrSS();
				expect(solver.step7.activeSubStepId).toBe("tr_ss");
			}

			if (correctTr && correctSS) {
				solver.step7.selectedTransient = correctTr.id;
				solver.step7.selectedSteadyState = correctSS.id;
				solver.checkStep7TrSS();
				expect(solver.step7.activeSubStepId).toBe("concept");
			}

			// Concept question
			const wrongConcept =
				problem.itsData.step7.conceptQuestion.options.find(
					(o) => !o.isCorrect,
				);
			const correctConcept =
				problem.itsData.step7.conceptQuestion.options.find(
					(o) => o.isCorrect,
				);

			if (wrongConcept) {
				solver.checkStep7Concept(wrongConcept);
				expect(solver.isCompleted).toBe(false);
			}

			if (correctConcept) {
				solver.checkStep7Concept(correctConcept);
				expect(solver.isCompleted).toBe(true);
			}
		});
	});

	describe("Defensive Guards & Cross-Order Handling", () => {
		/**
		 * Verifies defensive runtime guards prevent state corruption when calling 2nd-order methods on 1st-order ODEs.
		 */
		it("safely handles defensive runtime guard calls on first-order problems without state corruption", () => {
			const p1 = generateOdeProblem({
				order: 1,
				forcingType: "constant",
				seed: 60,
			});
			const solver = new OdeStepSolverState(() => p1);
			solver.currentStep = 2;
			solver.step2.activeSubStepId = "factoring_inputs";

			solver.checkStep2QuadClass("distinct_real");
			expect(solver.currentStep).toBe(2);
			expect(solver.step2.activeSubStepId).toBe("factoring_inputs");
			expect(solver.currentFeedback).toContain(
				"linear and do not use quadratic classification",
			);

			solver.checkStep2Discriminant();
			expect(solver.currentStep).toBe(2);
			expect(solver.currentFeedback).toContain(
				"do not have a quadratic discriminant",
			);

			solver.checkStep2QuadRoots();
			expect(solver.currentStep).toBe(2);
			expect(solver.currentFeedback).toContain(
				"do not use quadratic root formulas",
			);

			solver.currentStep = 5;
			solver.step5.activeSubStepId = "first_deriv";
			const dummyOption = { id: "dummy", latex: "y''", isCorrect: true };
			solver.checkStep5SecondDeriv(dummyOption);
			expect(solver.currentStep).toBe(5);
			expect(solver.step5.activeSubStepId).toBe("first_deriv");
			expect(solver.currentFeedback).toContain(
				"do not have a second derivative",
			);
		});
	});

	describe("First-Order Complete Interactive Validation", () => {
		/**
		 * Verifies complete first-order problem validation from Step 1 through Step 7.
		 */
		it("validates all steps for a first-order ODE with exponential forcing", () => {
			const problem = generateOdeProblem({
				order: 1,
				forcingType: "exponential",
				seed: 142,
			});
			const solver = new OdeStepSolverState(() => problem);

			// Step 1
			solver.step1.a1 = String(problem.params.a1);
			solver.step1.a0 = String(problem.params.a0);
			solver.checkStep1();
			expect(solver.currentStep).toBe(2);

			// Step 2 Factoring
			solver.step2.r1 = "nan";
			solver.checkStep2Factoring();
			expect(solver.currentFeedback).toContain(
				"Please enter a numeric value or fraction",
			);

			solver.step2.r1 = "999";
			solver.checkStep2Factoring();
			expect(solver.currentFeedback).toContain("Incorrect root");

			solver.step2.r1 = String(problem.itsData.step2.r1);
			solver.checkStep2Factoring();
			expect(solver.currentStep).toBe(3);

			// Step 3 Homogeneous Template
			solver.checkStep3("single_real");
			expect(solver.currentStep).toBe(4);

			// Step 4 Particular Ansatz
			const correctAnsatz = problem.itsData.step4.options.find(
				(o) => o.isCorrect,
			);
			if (correctAnsatz) {
				solver.checkStep4(correctAnsatz);
				expect(solver.currentStep).toBe(5);
			}

			// Step 5 First Derivative & Coeffs
			const correctD1 =
				problem.itsData.step5.firstDerivativeOptions?.find(
					(o) => o.isCorrect,
				);
			if (correctD1) {
				solver.checkStep5FirstDeriv(correctD1);
				expect(solver.step5.activeSubStepId).toBe("solve");
			}

			solver.step5.kp = "nan";
			solver.checkStep5Coeffs();
			expect(solver.currentFeedback).toContain(
				"Please enter a numeric value",
			);

			solver.step5.kp = "999";
			solver.checkStep5Coeffs();
			expect(solver.currentFeedback).toContain("Incorrect coefficient");

			solver.step5.kp = String(problem.itsData.step5.expectedKp ?? 0);
			solver.checkStep5();
			expect(solver.currentStep).toBe(6);

			// Step 6 Initial Condition
			solver.step6.yh0 = "nan";
			solver.checkStep6TargetValues();
			expect(solver.currentFeedback).toContain(
				"Please enter a numeric value",
			);

			solver.step6.yh0 = String(problem.initialConditions.y0);
			if (problem.itsData.step6.yp0 !== 0) {
				solver.checkStep6TargetValues();
				expect(solver.currentFeedback).toContain(
					"Forgetting Particular Contribution",
				);
			}

			solver.step6.yh0 = String(problem.itsData.step6.targetYh0);
			solver.checkStep6();
			expect(solver.currentStep).toBe(7);

			// Step 7 ZI/ZS
			solver.step7.ziC1 = String(problem.itsData.step7.ziConstants.C1);
			solver.checkStep7ZI();
			expect(solver.step7.activeSubStepId).toBe("tr_ss");

			const correctTr = problem.itsData.step7.transientOptions.find(
				(o) => o.isCorrect,
			);
			const correctSS = problem.itsData.step7.steadyStateOptions.find(
				(o) => o.isCorrect,
			);
			if (correctTr && correctSS) {
				solver.step7.selectedTransient = correctTr.id;
				solver.step7.selectedSteadyState = correctSS.id;
				solver.checkStep7TrSS();
				expect(solver.step7.activeSubStepId).toBe("concept");
			}

			const correctConcept =
				problem.itsData.step7.conceptQuestion.options.find(
					(o) => o.isCorrect,
				);
			if (correctConcept) {
				solver.checkStep7Concept(correctConcept);
				expect(solver.isCompleted).toBe(true);
			}
		});
	});

	describe("Preview and Derived Property Assertions", () => {
		/**
		 * Verifies previewZI and previewZS across repeated real and complex conjugate root types.
		 */
		it("generates correct previewZI and previewZS for repeated real and complex conjugate problems", () => {
			const repProblem = generateSecondOrderProblem(
				"repeated_real",
				"constant",
			);
			const repSolver = new OdeStepSolverState(() => repProblem);
			repSolver.step7.ziC1 = "2";
			repSolver.step7.ziC2 = "3";
			expect(repSolver.previewZI).toContain("e^{");
			expect(repSolver.derivedZSC1).toBeDefined();
			expect(repSolver.derivedZSC2).toBeDefined();
			expect(repSolver.previewZS).toBeDefined();

			const ccProblem = generateSecondOrderProblem(
				"complex_conjugate",
				"sinusoid",
			);
			const ccSolver = new OdeStepSolverState(() => ccProblem);
			ccSolver.step7.ziC1 = "1";
			ccSolver.step7.ziC2 = "2";
			expect(ccSolver.previewZI).toContain("\\cos");
			expect(ccSolver.previewZI).toContain("\\sin");
			expect(ccSolver.previewZS).toBeDefined();
		});
	});
});
