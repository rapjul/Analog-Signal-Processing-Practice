/**
 * Step 7 Response Decomposition & Conceptual Mastery Validation Helpers.
 *
 * Validates Zero-Input / Zero-State constants, transient and steady-state
 * response classifications, and conceptual question scoring.
 */

import { parseNumericInput } from "$lib/math-engine/fraction";
import { approximatelyEqual } from "$lib/math-engine/numeric";
import type { OdeItsOption } from "$lib/math-engine/odes/index";
import type { OdeProblem } from "$lib/math-engine/odes/types";
import type { OdeStep7State } from "./ode-step-types";
import type { StepValidationResult } from "./step2-roots-validation";

/**
 * Validates Step 7 Part 7A: Zero-Input (y_{ZI}) and Zero-State (y_{ZS}) decomposition constants.
 *
 * @param {OdeStep7State} step7 - Step 7 reactive state.
 * @param {OdeProblem} problem - Active ODE problem.
 * @returns {StepValidationResult} Validation outcome.
 */
export function validateStep7ZIConstants(
	step7: OdeStep7State,
	problem: OdeProblem,
): StepValidationResult {
	const s7Data = problem.itsData.step7;
	const isFirstOrder = problem.params.order === 1;
	const vC1 = parseNumericInput(step7.ziC1);
	const vC2 = isFirstOrder ? 0 : parseNumericInput(step7.ziC2);

	if (Number.isNaN(vC1) || Number.isNaN(vC2)) {
		return {
			kind: "validation",
			message:
				"Please enter numeric values or fractions for both Zero-Input constants: $C_{1,ZI}$ and $C_{2,ZI}$.",
		};
	}

	const expC1 = s7Data.ziConstants.C1;
	const expC2 = s7Data.ziConstants.C2;

	if (
		approximatelyEqual(vC1, expC1) &&
		(isFirstOrder || approximatelyEqual(vC2, expC2 ?? 0))
	) {
		return { kind: "pass" };
	}

	if (
		approximatelyEqual(vC1, problem.itsData.step6.expectedC1) &&
		approximatelyEqual(vC2, problem.itsData.step6.expectedC2 ?? 0)
	) {
		return {
			kind: "misconception",
			message:
				"Total vs Zero-Input Confusion: You entered the complete constants $C_1, C_2$ from Step 6. Zero-Input constants are determined by satisfying initial conditions with $x(t) = 0$ (so target values are original $y(0^-), y'(0^-)$ without subtracting $y_p$).",
		};
	}

	return {
		kind: "incorrect",
		message: `Incorrect Zero-Input constants. Solve the homogeneous initial conditions with $y_h(0) = y(0^-) = ${problem.initialConditions.y0}$ and $y_h'(0) = y'(0^-) = ${problem.initialConditions.dy0}$.`,
	};
}

/**
 * Validates Step 7 Part 7B: Transient and Steady-State response selection.
 *
 * @param {OdeStep7State} step7 - Step 7 reactive state.
 * @param {OdeProblem} problem - Active ODE problem.
 * @returns {StepValidationResult} Validation outcome.
 */
export function validateStep7TransientSteadyState(
	step7: OdeStep7State,
	problem: OdeProblem,
): StepValidationResult {
	const s7Data = problem.itsData.step7;
	if (!step7.selectedTransient || !step7.selectedSteadyState) {
		return {
			kind: "validation",
			message:
				"Please select both the transient response and the steady-state response options.",
		};
	}

	const correctTr = s7Data.transientOptions.find((o) => o.isCorrect)?.id;
	const correctSS = s7Data.steadyStateOptions.find((o) => o.isCorrect)?.id;

	const isTrCorrect = step7.selectedTransient === correctTr;
	const isSSCorrect = step7.selectedSteadyState === correctSS;

	if (isTrCorrect && isSSCorrect) {
		return { kind: "pass" };
	}

	if (!isTrCorrect) {
		const chosenOpt = s7Data.transientOptions.find(
			(o) => o.id === step7.selectedTransient,
		);
		return {
			kind: "misconception",
			message:
				chosenOpt?.feedback ??
				"Incorrect transient response. Transient components must decay asymptotically to $0$ as $t \\to \\infty$.",
		};
	}

	const chosenOpt = s7Data.steadyStateOptions.find(
		(o) => o.id === step7.selectedSteadyState,
	);
	return {
		kind: "misconception",
		message:
			chosenOpt?.feedback ??
			"Incorrect steady-state response. Steady-state response persists indefinitely as $t \\to \\infty$.",
	};
}

/**
 * Validates Step 7 Part 7C: Conceptual Mastery question.
 *
 * @param {OdeStep7State} step7 - Step 7 reactive state.
 * @param {OdeProblem} problem - Active ODE problem.
 * @param {OdeItsOption} [opt] - Selected concept option.
 * @returns {StepValidationResult} Validation outcome.
 */
export function validateStep7Concept(
	step7: OdeStep7State,
	problem: OdeProblem,
	opt?: OdeItsOption,
): StepValidationResult {
	if (opt) {
		step7.selectedConcept = opt.id;
	}

	if (!step7.selectedConcept) {
		return {
			kind: "validation",
			message:
				"Please select an answer for the conceptual mastery question.",
		};
	}

	const s7Data = problem.itsData.step7;
	const chosen =
		opt ??
		s7Data.conceptQuestion.options.find(
			(o) => o.id === step7.selectedConcept,
		);

	if (chosen?.isCorrect) {
		return { kind: "pass" };
	}

	return {
		kind: "misconception",
		message:
			chosen?.feedback ??
			"Incorrect answer. Review linearity, zero-input, and stability principles.",
	};
}
