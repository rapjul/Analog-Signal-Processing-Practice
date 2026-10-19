/**
 * Step 6 Initial Conditions & Integration Constants Validation Helpers.
 *
 * Validates homogeneous target initial values ($y_h(0^+), y_h'(0^+)$) accounting for
 * particular-solution offsets, and validates integration constants ($C_1, C_2$).
 */

import { parseNumericInput, toFractionLatex } from "$lib/math-engine/fraction";
import { approximatelyEqual } from "$lib/math-engine/numeric";
import type { OdeProblem } from "$lib/math-engine/odes/types";
import type { OdeStep6State } from "./ode-step-types";
import type { StepValidationResult } from "./step2-roots-validation";

/**
 * Validates Step 6 Part 6A: Target homogeneous initial values (y_h(0+) and y_h'(0+))
 * or direct C_1 calculation for 1st-order equations.
 *
 * @param {OdeStep6State} step6 - Step 6 reactive state.
 * @param {OdeProblem} problem - Active ODE problem.
 * @returns {StepValidationResult} Validation outcome.
 */
export function validateStep6TargetValues(
	step6: OdeStep6State,
	problem: OdeProblem,
): StepValidationResult {
	const s6Data = problem.itsData.step6;
	const isFirstOrder = problem.params.order === 1;
	const vYh0 = parseNumericInput(step6.yh0);
	const vDYh0 = isFirstOrder ? 0 : parseNumericInput(step6.dyh0);

	if (Number.isNaN(vYh0) || (!isFirstOrder && Number.isNaN(vDYh0))) {
		return {
			kind: "validation",
			message: isFirstOrder
				? "Please enter a numeric value or fraction for the constant $C_1 = y_h(0^+)$."
				: "Please enter numeric values or fractions for both target values: $y_h(0^+)$ and $y_h'(0^+)$.",
		};
	}

	const expYh0 = s6Data.targetYh0;
	const expDYh0 = s6Data.targetDYh0;

	if (
		approximatelyEqual(vYh0, expYh0) &&
		(isFirstOrder || approximatelyEqual(vDYh0, expDYh0 ?? 0))
	) {
		return { kind: "pass" };
	}

	if (
		approximatelyEqual(vYh0, problem.initialConditions.y0) &&
		(isFirstOrder ||
			approximatelyEqual(vDYh0, problem.initialConditions.dy0 ?? 0))
	) {
		return {
			kind: "misconception",
			message:
				"Forgetting Particular Contribution: Initial conditions apply to the TOTAL response $y(t) = y_h(t) + y_p(t)$. You must subtract $y_p(0^+)$ to find the homogeneous contribution $y_h(0^+)$.",
		};
	}

	return {
		kind: "incorrect",
		message: isFirstOrder
			? `Incorrect value. $C_1 = y_h(0^+) = y(0^+) - y_p(0^+) = ${toFractionLatex(expYh0)}$.`
			: `Incorrect target values. $y_h(0^+) = y(0^+) - y_p(0^+) = ${toFractionLatex(expYh0)}$ and $y_h'(0^+) = y'(0^+) - y_p'(0^+) = ${toFractionLatex(expDYh0 ?? 0)}$.`,
	};
}

/**
 * Validates Step 6 Part 6B (Integration Constants).
 *
 * @param {OdeStep6State} step6 - Step 6 reactive state.
 * @param {OdeProblem} problem - Active ODE problem.
 * @returns {StepValidationResult} Validation outcome.
 */
export function validateStep6Constants(
	step6: OdeStep6State,
	problem: OdeProblem,
): StepValidationResult {
	const s6Data = problem.itsData.step6;
	const isFirstOrder = problem.params.order === 1;
	const vC1 = parseNumericInput(step6.c1);
	const vC2 = isFirstOrder ? 0 : parseNumericInput(step6.c2);

	if (Number.isNaN(vC1) || Number.isNaN(vC2)) {
		return {
			kind: "validation",
			message: isFirstOrder
				? "Please enter a numeric value for $C_1$."
				: "Please enter numeric values for both constants: $C_1$ and $C_2$.",
		};
	}

	if (
		approximatelyEqual(vC1, s6Data.expectedC1) &&
		(isFirstOrder || approximatelyEqual(vC2, s6Data.expectedC2 ?? 0))
	) {
		return { kind: "pass" };
	}

	return {
		kind: "incorrect",
		message: isFirstOrder
			? "Incorrect constant $C_1$. Use $C_1=y(0^+)-y_p(0^+)$."
			: "Incorrect constants $C_1$, $C_2$. Solve the linear system matching $y_h(0^+)$ and $y_h'(0^+)$.",
	};
}
