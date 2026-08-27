/**
 * Step 1 and Step 2 Characteristic Equation & Roots Validation Helpers.
 *
 * Implements validation, order-invariant root comparison, and pedagogical
 * misconception diagnostics for factoring and quadratic formula solving strategies.
 */

import { parseNumericInput } from "$lib/math-engine/fraction";
import { approximatelyEqual } from "$lib/math-engine/numeric";
import {
	matchRootPair,
	type SecondOrderOdeItsStep2,
	type SecondOrderRootType,
} from "$lib/math-engine/odes/index";
import type { OdeProblem } from "$lib/math-engine/odes/types";
import type {
	OdeStep1State,
	OdeStep2State,
} from "./ode-step-types";

/** Validation outcome result descriptor */
export type StepValidationResult =
	| { kind: "pass" }
	| { kind: "validation" | "misconception" | "incorrect"; message: string };

/**
 * Validates Step 1 Characteristic Equation coefficients.
 *
 * @param {OdeStep1State} step1 - Step 1 reactive state.
 * @param {OdeProblem} problem - Active ODE problem.
 * @returns {StepValidationResult} Validation outcome.
 */
export function validateStep1CharEq(
	step1: OdeStep1State,
	problem: OdeProblem,
): StepValidationResult {
	const s1Data = problem.itsData.step1;
	const isFirstOrder = problem.params.order === 1;
	const vA2 = isFirstOrder ? 0 : parseNumericInput(step1.a2);
	const vA1 = parseNumericInput(step1.a1);
	const vA0 = parseNumericInput(step1.a0);

	if (Number.isNaN(vA2) || Number.isNaN(vA1) || Number.isNaN(vA0)) {
		return {
			kind: "validation",
			message: isFirstOrder
				? "Please enter numeric values for both coefficients: $a_1$ and $a_0$."
				: "Please enter numeric values for all three coefficients: $a_2$, $a_1$, and $a_0$.",
		};
	}

	if (
		approximatelyEqual(vA0, problem.forcing.K) &&
		!approximatelyEqual(vA0, s1Data.expectedA0)
	) {
		return {
			kind: "misconception",
			message: s1Data.misconceptions.forcing_rhs,
		};
	}

	if (
		approximatelyEqual(vA2, s1Data.expectedA2) &&
		approximatelyEqual(vA1, s1Data.expectedA1) &&
		approximatelyEqual(vA0, s1Data.expectedA0)
	) {
		return { kind: "pass" };
	}

	return {
		kind: "incorrect",
		message: isFirstOrder
			? "Incorrect coefficients. Substitute $\\frac{dy}{dt} \\to s$ and $y(t) \\to 1$, setting the homogeneous right-hand side to $0$."
			: "Incorrect coefficients. Substitute $\\frac{d^2 y}{dt^2} \\to s^2$, $\\frac{dy}{dt} \\to s$, and $y(t) \\to 1$, setting the homogeneous right-hand side to $0$.",
	};
}

/**
 * Validates Step 2 Factoring Path root inputs.
 *
 * @param {OdeStep2State} step2 - Step 2 reactive state.
 * @param {OdeProblem} problem - Active ODE problem.
 * @returns {StepValidationResult} Validation outcome.
 */
export function validateFactoringRoots(
	step2: OdeStep2State,
	problem: OdeProblem,
): StepValidationResult {
	const s2Data = problem.itsData.step2;
	const rootType = s2Data.rootType;

	if (problem.params.order === 1) {
		const value = parseNumericInput(step2.r1);
		if (Number.isNaN(value)) {
			return {
				kind: "validation",
				message:
					"Please enter a numeric value or fraction for the root $r$.",
			};
		}
		if (approximatelyEqual(value, s2Data.r1)) {
			return { kind: "pass" };
		}
		return {
			kind: "incorrect",
			message: `Incorrect root. Isolate $s$ in $${problem.params.a1}s + ${problem.params.a0} = 0$.`,
		};
	}

	const s2Quad = s2Data as SecondOrderOdeItsStep2;
	if (!s2Quad.isFactorable || rootType === "complex_conjugate") {
		return {
			kind: "incorrect",
			message:
				"This polynomial cannot be factored over real integers. Please use the quadratic formula strategy.",
		};
	}

	switch (rootType) {
		case "distinct_real": {
			const v1 = parseNumericInput(step2.r1);
			const v2 = parseNumericInput(step2.r2);

			if (Number.isNaN(v1) || Number.isNaN(v2)) {
				return {
					kind: "validation",
					message:
						"Please enter numeric values or fractions for both roots $r_1$ and $r_2$.",
				};
			}

			const r1 = s2Quad.r1;
			const r2 = s2Quad.r2 ?? 0;
			const matchStatus = matchRootPair(v1, v2, r1, r2);

			if (matchStatus === "exact" || matchStatus === "swapped") {
				return { kind: "pass" };
			}
			if (matchStatus === "both_inverted") {
				return {
					kind: "misconception",
					message:
						"Check your signs. Remember that factoring as $(s - r_1)(s - r_2) = 0$ means the roots are $s = r_1$ and $s = r_2$.",
				};
			}
			if (matchStatus === "one_inverted") {
				return {
					kind: "misconception",
					message:
						"Check the sign of your roots. One of your factored roots has an inverted sign.",
				};
			}

			return {
				kind: "incorrect",
				message: `Incorrect roots. Factoring $${problem.itsData.step1.latex}$ gives $${s2Quad.factoredFormLatex}$.`,
			};
		}

		case "repeated_real": {
			const v1 = parseNumericInput(step2.r1);

			if (Number.isNaN(v1)) {
				return {
					kind: "validation",
					message:
						"Please enter a numeric value or fraction for the repeated root $r$.",
				};
			}

			const r1 = s2Quad.r1;
			if (approximatelyEqual(v1, r1)) {
				return { kind: "pass" };
			}
			if (approximatelyEqual(v1, -r1) && Math.abs(r1) > 0.01) {
				return {
					kind: "misconception",
					message:
						"Check your sign. If factored as $(s - r)^2 = 0$, then the root is $s = r$.",
				};
			}
			return {
				kind: "incorrect",
				message: `Incorrect repeated root. Factoring gives $(s - (${r1}))^2 = 0$.`,
			};
		}

		default:
			throw new Error(
				`Unhandled root type in factoring branch: ${rootType}`,
			);
	}
}

/**
 * Validates Step 2 Quadratic Formula root classification choice.
 *
 * @param {SecondOrderRootType} choice - Student selected root type.
 * @param {OdeProblem} problem - Active ODE problem.
 * @returns {{ kind: "pass" } | { kind: "first_order_guard" | "misconception"; message: string }} Classification result.
 */
export function validateQuadClassChoice(
	choice: SecondOrderRootType,
	problem: OdeProblem,
): { kind: "pass" } | { kind: "first_order_guard" | "misconception"; message: string } {
	if (problem.params.order === 1) {
		return {
			kind: "first_order_guard",
			message:
				"First-order differential equations are linear and do not use quadratic classification.",
		};
	}
	const s2Data = problem.itsData.step2 as SecondOrderOdeItsStep2;
	if (choice === s2Data.rootType) {
		return { kind: "pass" };
	}
	return {
		kind: "misconception",
		message:
			"Incorrect classification. Calculate the discriminant $\\Delta = b^2 - 4ac$ to confirm whether $\\Delta > 0$, $\\Delta = 0$, or $\\Delta < 0$.",
	};
}

/**
 * Validates Step 2 Remedial Discriminant Calculation.
 *
 * @param {string} input - Discriminant input text.
 * @param {OdeProblem} problem - Active ODE problem.
 * @returns {StepValidationResult} Validation outcome.
 */
export function validateDiscriminantInput(
	input: string,
	problem: OdeProblem,
): StepValidationResult {
	if (problem.params.order === 1) {
		return {
			kind: "validation",
			message:
				"First-order differential equations do not have a quadratic discriminant.",
		};
	}
	const s2Data = problem.itsData.step2 as SecondOrderOdeItsStep2;
	const vDisc = parseNumericInput(input);

	if (Number.isNaN(vDisc)) {
		return {
			kind: "validation",
			message:
				"Please enter a numeric value for $\\Delta = b^2 - 4ac$.",
		};
	}

	const expDisc = s2Data.discriminant;
	if (approximatelyEqual(vDisc, expDisc)) {
		return { kind: "pass" };
	}

	return {
		kind: "incorrect",
		message: `Incorrect discriminant. $\\Delta = (${problem.params.a1})^2 - 4(${problem.params.a2})(${problem.params.a0}) = ${expDisc}$.`,
	};
}

/**
 * Validates Step 2 Quadratic Formula root calculations.
 *
 * @param {OdeStep2State} step2 - Step 2 reactive state.
 * @param {OdeProblem} problem - Active ODE problem.
 * @returns {StepValidationResult} Validation outcome.
 */
export function validateQuadRoots(
	step2: OdeStep2State,
	problem: OdeProblem,
): StepValidationResult {
	if (problem.params.order === 1) {
		return {
			kind: "validation",
			message:
				"First-order differential equations do not use quadratic root formulas.",
		};
	}
	const s2Data = problem.itsData.step2 as SecondOrderOdeItsStep2;
	const rootType = s2Data.rootType;

	switch (rootType) {
		case "complex_conjugate": {
			const vSig = parseNumericInput(step2.sigma);
			const vOm = parseNumericInput(step2.omegaD);

			if (Number.isNaN(vSig) || Number.isNaN(vOm)) {
				return {
					kind: "validation",
					message:
						"Please enter numeric values for both real part $\\sigma$ and damped frequency $\\omega_d$.",
				};
			}

			const expSig = s2Data.r1;
			const expOm = s2Data.im ?? 0;
			const isOmMatch = approximatelyEqual(
				Math.abs(vOm),
				Math.abs(expOm),
			);

			if (approximatelyEqual(vSig, expSig) && isOmMatch) {
				return { kind: "pass" };
			}
			if (approximatelyEqual(vSig, -expSig) && isOmMatch) {
				return {
					kind: "misconception",
					message:
						"Check the sign of $\\sigma$. In the quadratic formula, $\\sigma = \\frac{-b}{2a}$.",
				};
			}
			return {
				kind: "incorrect",
				message: `Incorrect roots. $\\sigma = \\frac{-(${problem.params.a1})}{${2 * problem.params.a2}} = ${expSig}$ and $\\omega_d = \\frac{\\sqrt{${Math.abs(s2Data.discriminant)}}}{${2 * Math.abs(problem.params.a2)}} = ${expOm}$.`,
			};
		}

		case "distinct_real": {
			const v1 = parseNumericInput(step2.r1);
			const v2 = parseNumericInput(step2.r2);

			if (Number.isNaN(v1) || Number.isNaN(v2)) {
				return {
					kind: "validation",
					message:
						"Please enter numeric values for both roots $r_1$ and $r_2$.",
				};
			}

			const r1 = s2Data.r1;
			const r2 = s2Data.r2 ?? 0;
			const matchStatus = matchRootPair(v1, v2, r1, r2);

			if (matchStatus === "exact" || matchStatus === "swapped") {
				return { kind: "pass" };
			}
			if (matchStatus === "both_inverted") {
				return {
					kind: "misconception",
					message:
						"Check the signs of your roots. In the quadratic formula, the leading numerator term is $-b$.",
				};
			}
			if (matchStatus === "one_inverted") {
				return {
					kind: "misconception",
					message:
						"Check the sign of your roots. One of your roots has an inverted sign.",
				};
			}
			return {
				kind: "incorrect",
				message: `Incorrect roots. $s = \\frac{-(${problem.params.a1}) \\pm \\sqrt{${s2Data.discriminant}}}{${2 * problem.params.a2}}$, yielding $r_1 = ${r1}, r_2 = ${r2}$.`,
			};
		}

		case "repeated_real": {
			const v1 = parseNumericInput(step2.r1);

			if (Number.isNaN(v1)) {
				return {
					kind: "validation",
					message:
						"Please enter a numeric value for the repeated root $r$.",
				};
			}

			const r1 = s2Data.r1;
			if (approximatelyEqual(v1, r1)) {
				return { kind: "pass" };
			}
			if (approximatelyEqual(v1, -r1) && Math.abs(r1) > 0.01) {
				return {
					kind: "misconception",
					message:
						"Check your sign. For a repeated root with $\\Delta = 0$, $r = \\frac{-b}{2a}$.",
				};
			}
			return {
				kind: "incorrect",
				message: `Incorrect repeated root. With $\\Delta = 0$, $r = \\frac{-b}{2a} = \\frac{${-problem.params.a1}}{${2 * problem.params.a2}}$.`,
			};
		}

		default:
			throw new Error(
				`Unhandled root classification choice: ${String(step2.quadClassChoice)}`,
			);
	}
}
