/**
 * Developer & Testing Fixtures for Reactive ODE Step Solver.
 *
 * Provides visual state enumeration, deterministic state machine navigation,
 * and automated step filling routines for test runners and demo harnesses.
 */

import type { SolverVisualStateDescriptor } from "$lib/components/solvers/base-step-solver.svelte";
import { toFractionLatex } from "$lib/math-engine/fraction";
import type {
	OdeProblem,
	SecondOrderOdeItsStep2,
	SecondOrderRootType,
} from "$lib/math-engine/odes/index";
import type { OdeStepSolverState } from "./controller.svelte";
import type { OdeStep5SubStepId } from "./ode-step-types";

/**
 * Named visual states supported by the active ODE archetype.
 *
 * @param {OdeProblem} problem - Active ODE problem instance.
 * @returns {SolverVisualStateDescriptor[]} List of supported visual states.
 */
export function odeDevGetVisualStates(
	problem: OdeProblem,
): SolverVisualStateDescriptor[] {
	const states: SolverVisualStateDescriptor[] = [
		{
			id: "ode.step-01.characteristic-equation",
			label: "Step 1 · Characteristic Equation",
			step: 1,
			kind: "interactive",
		},
	];
	if (problem.params.order === 2) {
		states.push({
			id: "ode.step-02.strategy-gate",
			label: "Step 2 · Solving Strategy",
			step: 2,
			subStep: "strategy_gate",
			kind: "interactive",
		});
	}

	if (
		problem.params.order === 1 ||
		("isFactorable" in problem.itsData.step2 &&
			problem.itsData.step2.isFactorable &&
			problem.params.rootType !== "complex_conjugate")
	) {
		states.push({
			id: "ode.step-02.factoring-inputs",
			label: "Step 2 · Factoring Inputs",
			step: 2,
			subStep: "factoring_inputs",
			kind: "interactive",
		});
	}

	if (problem.params.order === 2) {
		states.push(
			{
				id: "ode.step-02.quadratic-classification",
				label: "Step 2 · Quadratic Classification",
				step: 2,
				subStep: "quad_classification",
				kind: "interactive",
			},
			{
				id: "ode.step-02.remedial-discriminant",
				label: "Step 2 · Discriminant Remediation",
				step: 2,
				subStep: "remedial_discriminant",
				kind: "diagnostic",
			},
			{
				id: "ode.step-02.quadratic-roots",
				label: "Step 2 · Quadratic Root Inputs",
				step: 2,
				subStep: "quad_root_inputs",
				kind: "interactive",
			},
		);
	}

	states.push(
		{
			id: "ode.step-03.homogeneous-form",
			label: "Step 3 · Homogeneous Form",
			step: 3,
			kind: "interactive",
		},
		{
			id: "ode.step-04.particular-ansatz",
			label: "Step 4 · Particular Ansatz",
			step: 4,
			kind: "interactive",
		},
		{
			id: "ode.step-05.first-derivative",
			label: "Step 5A-1 · First Derivative",
			step: 5,
			subStep: "first_deriv",
			kind: "interactive",
		},
	);
	if (problem.params.order === 2) {
		states.push({
			id: "ode.step-05.second-derivative",
			label: "Step 5A-2 · Second Derivative",
			step: 5,
			subStep: "second_deriv",
			kind: "interactive",
		});
	}

	if (problem.forcing.type === "sinusoid") {
		states.push({
			id: "ode.step-05.system-setup",
			label: "Step 5B · Harmonic System Setup",
			step: 5,
			subStep: "system_setup",
			kind: "interactive",
		});
	}

	states.push(
		{
			id: "ode.step-05.solve-coefficients",
			label: "Step 5 · Solve Coefficients",
			step: 5,
			subStep: "solve",
			kind: "interactive",
		},
		{
			id: "ode.step-05.solve-coefficients.hints",
			label: "Step 5 · Solve Coefficients · All Hints",
			step: 5,
			subStep: "solve",
			kind: "hint",
		},
	);

	if (problem.params.order === 1) {
		states.push(
			{
				id: "ode.step-06.target-values",
				label: "Step 6 · Initial Condition & Constant",
				step: 6,
				subStep: "target_values",
				kind: "interactive",
			},
			{
				id: "ode.step-06.target-values.misconception",
				label: "Step 6 · Particular-Offset Misconception",
				step: 6,
				subStep: "target_values",
				kind: "diagnostic",
			},
		);
	} else {
		states.push(
			{
				id: "ode.step-06.target-values",
				label: "Step 6A · Target Initial Values",
				step: 6,
				subStep: "target_values",
				kind: "interactive",
			},
			{
				id: "ode.step-06.target-values.misconception",
				label: "Step 6A · Particular-Offset Misconception",
				step: 6,
				subStep: "target_values",
				kind: "diagnostic",
			},
			{
				id: "ode.step-06.integration-constants",
				label: "Step 6B · Integration Constants",
				step: 6,
				subStep: "solve_constants",
				kind: "interactive",
			},
			{
				id: "ode.step-06.integration-constants.hints",
				label: "Step 6B · Integration Constants · All Hints",
				step: 6,
				subStep: "solve_constants",
				kind: "hint",
			},
		);
	}

	states.push(
		{
			id: "ode.step-07.zero-input-state",
			label: "Step 7A · Zero-Input and Zero-State",
			step: 7,
			subStep: "zi_zs",
			kind: "interactive",
		},
		{
			id: "ode.step-07.transient-steady-state",
			label: "Step 7B · Transient and Steady-State",
			step: 7,
			subStep: "tr_ss",
			kind: "interactive",
		},
		{
			id: "ode.step-07.concept",
			label: "Step 7C · Conceptual Mastery",
			step: 7,
			subStep: "concept",
			kind: "interactive",
		},
	);

	return states;
}

/** Advances through complete parent steps using the same validation path as the UI. */
function devPrepareParentStep(
	solver: OdeStepSolverState,
	targetStep: number,
): boolean {
	solver.reset();
	let guard = 0;
	while (solver.currentStep < targetStep && guard < solver.totalSteps) {
		const before = solver.currentStep;
		solver.devAutoFillStep(before);
		if (solver.currentStep === before) return false;
		guard += 1;
	}
	return solver.currentStep === targetStep;
}

/** Selects the correct derivative choices needed to reveal a Step 5 sub-step. */
function devPrepareStep5SubStep(
	solver: OdeStepSolverState,
	target: OdeStep5SubStepId,
): boolean {
	if (!devPrepareParentStep(solver, 5)) return false;
	if (target === "first_deriv") return true;

	const first = solver.problem.itsData.step5.firstDerivativeOptions?.find(
		(option) => option.isCorrect,
	);
	if (!first) return false;
	solver.checkStep5FirstDeriv(first);
	if (target === "second_deriv") {
		return solver.problem.params.order === 2;
	}

	if (solver.problem.params.order === 2) {
		const second =
			solver.problem.itsData.step5.secondDerivativeOptions?.find(
				(option) => option.isCorrect,
			);
		if (!second) return false;
		solver.checkStep5SecondDeriv(second);
	}
	if (target === "system_setup") {
		return solver.problem.forcing.type === "sinusoid";
	}

	if (solver.problem.forcing.type === "sinusoid") {
		const system = solver.problem.itsData.step5.systemOptions?.find(
			(option) => option.isCorrect,
		);
		if (!system) return false;
		solver.checkStep5System(system);
	}
	return solver.step5.activeSubStepId === "solve";
}

/**
 * Resets and prepares one named ODE visual state deterministically.
 *
 * @param {OdeStepSolverState} solver - Active solver controller.
 * @param {string} stateId - Target visual state identifier.
 * @returns {boolean} Whether navigation succeeded.
 */
export function odeDevGoToVisualState(
	solver: OdeStepSolverState,
	stateId: string,
): boolean {
	if (!import.meta.env.DEV) return false;
	if (!solver.devGetVisualStates().some((state) => state.id === stateId)) {
		return false;
	}

	switch (stateId) {
		case "ode.step-01.characteristic-equation":
			return devPrepareParentStep(solver, 1);
		case "ode.step-02.strategy-gate":
			return devPrepareParentStep(solver, 2);
		case "ode.step-02.factoring-inputs":
			if (!devPrepareParentStep(solver, 2)) return false;
			solver.selectStep2Strategy("factoring");
			return solver.step2.activeSubStepId === "factoring_inputs";
		case "ode.step-02.quadratic-classification":
			if (!devPrepareParentStep(solver, 2)) return false;
			solver.selectStep2Strategy("quadratic");
			return solver.step2.activeSubStepId === "quad_classification";
		case "ode.step-02.remedial-discriminant": {
			if (!devPrepareParentStep(solver, 2)) return false;
			solver.selectStep2Strategy("quadratic");
			if (solver.problem.params.order === 2) {
				const wrongChoice: SecondOrderRootType =
					solver.problem.params.rootType === "distinct_real"
						? "repeated_real"
						: "distinct_real";
				solver.checkStep2QuadClass(wrongChoice);
			}
			return solver.step2.activeSubStepId === "remedial_discriminant";
		}
		case "ode.step-02.quadratic-roots":
			if (!devPrepareParentStep(solver, 2)) return false;
			solver.selectStep2Strategy("quadratic");
			if (solver.problem.params.order === 2) {
				solver.checkStep2QuadClass(solver.problem.params.rootType);
			}
			return solver.step2.activeSubStepId === "quad_root_inputs";
		case "ode.step-03.homogeneous-form":
			return devPrepareParentStep(solver, 3);
		case "ode.step-04.particular-ansatz":
			return devPrepareParentStep(solver, 4);
		case "ode.step-05.first-derivative":
			return devPrepareStep5SubStep(solver, "first_deriv");
		case "ode.step-05.second-derivative":
			return devPrepareStep5SubStep(solver, "second_deriv");
		case "ode.step-05.system-setup":
			return devPrepareStep5SubStep(solver, "system_setup");
		case "ode.step-05.solve-coefficients":
			return devPrepareStep5SubStep(solver, "solve");
		case "ode.step-05.solve-coefficients.hints":
			if (!devPrepareStep5SubStep(solver, "solve")) return false;
			solver.devRevealAllHints();
			return true;
		case "ode.step-06.target-values":
			return devPrepareParentStep(solver, 6);
		case "ode.step-06.target-values.misconception":
			if (!devPrepareParentStep(solver, 6)) return false;
			solver.step6.yh0 = String(solver.problem.initialConditions.y0);
			solver.step6.dyh0 = String(solver.problem.initialConditions.dy0);
			solver.checkStep6TargetValues();
			if (solver.currentFeedbackType !== "misconception") {
				solver.setSubStepMisconception(
					solver.step6,
					"target_values",
					"Initial conditions apply to the total response. Subtract the particular-solution offsets before solving for the homogeneous constants.",
				);
			}
			return true;
		case "ode.step-06.integration-constants":
			if (!devPrepareParentStep(solver, 6)) return false;
			solver.step6.yh0 = toFractionLatex(
				solver.problem.itsData.step6.targetYh0,
			);
			solver.step6.dyh0 = toFractionLatex(
				solver.problem.itsData.step6.targetDYh0 ?? 0,
			);
			solver.checkStep6TargetValues();
			return solver.step6.activeSubStepId === "solve_constants";
		case "ode.step-06.integration-constants.hints":
			if (!devPrepareParentStep(solver, 6)) return false;
			solver.step6.yh0 = toFractionLatex(
				solver.problem.itsData.step6.targetYh0,
			);
			solver.step6.dyh0 = toFractionLatex(
				solver.problem.itsData.step6.targetDYh0 ?? 0,
			);
			solver.checkStep6TargetValues();
			if (solver.step6.activeSubStepId !== "solve_constants")
				return false;
			solver.devRevealAllHints();
			return true;
		case "ode.step-07.zero-input-state":
			return devPrepareParentStep(solver, 7);
		case "ode.step-07.transient-steady-state":
			if (!devPrepareParentStep(solver, 7)) return false;
			solver.step7.ziC1 = toFractionLatex(
				solver.problem.itsData.step7.ziConstants.C1,
			);
			solver.step7.ziC2 = toFractionLatex(
				solver.problem.itsData.step7.ziConstants.C2 ?? 0,
			);
			solver.checkStep7ZI();
			return solver.step7.activeSubStepId === "tr_ss";
		case "ode.step-07.concept": {
			if (
				!odeDevGoToVisualState(
					solver,
					"ode.step-07.transient-steady-state",
				)
			) {
				return false;
			}
			const transient =
				solver.problem.itsData.step7.transientOptions.find(
					(option) => option.isCorrect,
				);
			const steady =
				solver.problem.itsData.step7.steadyStateOptions.find(
					(option) => option.isCorrect,
				);
			if (!transient || !steady) return false;
			solver.step7.selectedTransient = transient.id;
			solver.step7.selectedSteadyState = steady.id;
			solver.checkStep7TrSS();
			return solver.step7.activeSubStepId === "concept";
		}
		default:
			return false;
	}
}

/**
 * Developer / Test mode method: Automatically fills and validates an ODE step.
 *
 * @param {OdeStepSolverState} solver - Active solver controller.
 * @param {number} [stepIndex] - Target 1-based step index (defaults to currentStep).
 */
export function odeDevAutoFillStep(
	solver: OdeStepSolverState,
	stepIndex?: number,
): void {
	if (!import.meta.env.DEV) return;
	const target = stepIndex ?? solver.currentStep;
	switch (target) {
		case 1: {
			solver.step1.a2 = String(
				solver.problem.params.order === 1
					? 0
					: (solver.problem.params.a2 ?? 1),
			);
			solver.step1.a1 = String(solver.problem.params.a1);
			solver.step1.a0 = String(solver.problem.params.a0);
			solver.checkStep1();
			break;
		}
		case 2: {
			const s2 = solver.problem.itsData.step2;
			if (solver.problem.params.order === 1) {
				solver.step2.strategy = "factoring";
				solver.step2.activeSubStepId = "factoring_inputs";
				solver.step2.r1 = toFractionLatex(s2.r1);
				solver.checkStep2Factoring();
			} else if (solver.problem.params.rootType === "distinct_real") {
				const s2Quad = s2 as SecondOrderOdeItsStep2;
				solver.step2.strategy = "quadratic";
				solver.step2.activeSubStepId = "quad_classification";
				solver.checkStep2QuadClass("distinct_real");
				solver.step2.r1 = toFractionLatex(s2Quad.r1);
				solver.step2.r2 = toFractionLatex(s2Quad.r2);
				solver.checkStep2QuadRoots();
			} else if (solver.problem.params.rootType === "repeated_real") {
				const s2Quad = s2 as SecondOrderOdeItsStep2;
				solver.step2.strategy = "quadratic";
				solver.step2.activeSubStepId = "quad_classification";
				solver.checkStep2QuadClass("repeated_real");
				solver.step2.r1 = toFractionLatex(s2Quad.r1);
				solver.checkStep2QuadRoots();
			} else if (
				solver.problem.params.rootType === "complex_conjugate"
			) {
				const s2Quad = s2 as SecondOrderOdeItsStep2;
				solver.step2.strategy = "quadratic";
				solver.step2.activeSubStepId = "quad_classification";
				solver.checkStep2QuadClass("complex_conjugate");
				solver.step2.sigma = toFractionLatex(s2Quad.r1);
				solver.step2.omegaD = toFractionLatex(s2Quad.im ?? 0);
				solver.checkStep2QuadRoots();
			} else {
				solver.advanceToStep(3);
			}
			break;
		}
		case 3: {
			solver.checkStep3(solver.problem.params.rootType);
			break;
		}
		case 4: {
			const correctAnsatz = solver.problem.itsData.step4.options.find(
				(o) => o.isCorrect,
			);
			if (correctAnsatz) {
				solver.checkStep4(correctAnsatz);
			} else {
				solver.advanceToStep(5);
			}
			break;
		}
		case 5: {
			const s5 = solver.problem.itsData.step5;
			const isSinusoid = solver.problem.forcing.type === "sinusoid";
			if (isSinusoid) {
				const d1 = s5.firstDerivativeOptions?.find((o) => o.isCorrect);
				if (d1) solver.checkStep5FirstDeriv(d1);
				if (solver.problem.params.order >= 2) {
					const d2 = s5.secondDerivativeOptions?.find(
						(o) => o.isCorrect,
					);
					if (d2) solver.checkStep5SecondDeriv(d2);
				}
				const sys = s5.systemOptions?.find((o) => o.isCorrect);
				if (sys) solver.checkStep5System(sys);
				solver.step5.a = toFractionLatex(s5.expectedA ?? 0);
				solver.step5.b = toFractionLatex(s5.expectedB ?? 0);
				solver.checkStep5Coeffs();
			} else {
				const d1 = s5.firstDerivativeOptions?.find((o) => o.isCorrect);
				if (d1) solver.checkStep5FirstDeriv(d1);
				if (solver.problem.params.order >= 2) {
					const d2 = s5.secondDerivativeOptions?.find(
						(o) => o.isCorrect,
					);
					if (d2) solver.checkStep5SecondDeriv(d2);
				}
				const sys = s5.systemOptions?.find((o) => o.isCorrect);
				if (sys) solver.checkStep5System(sys);
				solver.step5.kp = toFractionLatex(s5.expectedKp ?? 0);
				solver.checkStep5Coeffs();
			}
			break;
		}
		case 6: {
			solver.step6.yh0 = toFractionLatex(
				solver.problem.itsData.step6.targetYh0,
			);
			if (solver.problem.params.order === 1) {
				solver.checkStep6TargetValues();
			} else {
				solver.step6.dyh0 = toFractionLatex(
					solver.problem.itsData.step6.targetDYh0 ?? 0,
				);
				solver.checkStep6TargetValues();
				solver.step6.c1 = toFractionLatex(
					solver.problem.itsData.step6.expectedC1,
				);
				solver.step6.c2 = toFractionLatex(
					solver.problem.itsData.step6.expectedC2 ?? 0,
				);
				solver.checkStep6Constants();
			}
			break;
		}
		case 7: {
			solver.step7.ziC1 = toFractionLatex(
				solver.problem.itsData.step7.ziConstants.C1,
			);
			solver.step7.ziC2 = toFractionLatex(
				solver.problem.itsData.step7.ziConstants.C2 ?? 0,
			);
			solver.checkStep7ZI();
			const correctTr =
				solver.problem.itsData.step7.transientOptions.find(
					(o) => o.isCorrect,
				);
			const correctSS =
				solver.problem.itsData.step7.steadyStateOptions.find(
					(o) => o.isCorrect,
				);
			if (correctTr) solver.step7.selectedTransient = correctTr.id;
			if (correctSS) solver.step7.selectedSteadyState = correctSS.id;
			solver.checkStep7TrSS();
			const correctConcept =
				solver.problem.itsData.step7.conceptQuestion.options.find(
					(o) => o.isCorrect,
				);
			if (correctConcept) solver.checkStep7Concept(correctConcept);
			break;
		}
		default:
			break;
	}
}
