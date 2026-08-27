/**
 * Step 5 Undetermined Particular Solution Coefficients Validation Helpers.
 *
 * Validates trial derivative choices, linear system setup options, and solved
 * undetermined coefficients (Kp, A, B).
 */

import { parseNumericInput, toFractionLatex } from "$lib/math-engine/fraction";
import { approximatelyEqual } from "$lib/math-engine/numeric";
import type { OdeProblem } from "$lib/math-engine/odes/types";
import type { OdeStep5State } from "./ode-step-types";
import type { StepValidationResult } from "./step2-roots-validation";

/**
 * Validates Step 5 solved undetermined coefficients (A and B for sinusoids, Kp for step/exponential).
 *
 * @param {OdeStep5State} step5 - Step 5 reactive state.
 * @param {OdeProblem} problem - Active ODE problem.
 * @returns {StepValidationResult} Validation outcome.
 */
export function validateStep5Coefficients(
	step5: OdeStep5State,
	problem: OdeProblem,
): StepValidationResult {
	const s5Data = problem.itsData.step5;

	if (problem.forcing.type === "sinusoid") {
		const vA = parseNumericInput(step5.a);
		const vB = parseNumericInput(step5.b);

		if (Number.isNaN(vA) || Number.isNaN(vB)) {
			return {
				kind: "validation",
				message:
					"Please enter numeric values for both coefficients: $A$ and $B$.",
			};
		}

		const expA = s5Data.expectedA ?? 0;
		const expB = s5Data.expectedB ?? 0;

		if (approximatelyEqual(vA, expA) && approximatelyEqual(vB, expB)) {
			return { kind: "pass" };
		}

		return {
			kind: "incorrect",
			message:
				"Incorrect coefficients $A$ and $B$. Solve the $2\\times 2$ system by substitution or Cramer's Rule.",
		};
	}

	const vKp = parseNumericInput(step5.kp);

	if (Number.isNaN(vKp)) {
		return {
			kind: "validation",
			message: "Please enter a numeric value for $K_p$.",
		};
	}

	const expKp = s5Data.expectedKp ?? 0;

	if (approximatelyEqual(vKp, expKp)) {
		return { kind: "pass" };
	}

	return {
		kind: "incorrect",
		message: `Incorrect coefficient $K_p$. Expected $K_p = ${toFractionLatex(expKp)}$.`,
	};
}
