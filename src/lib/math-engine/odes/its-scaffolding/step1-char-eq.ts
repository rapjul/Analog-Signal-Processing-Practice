/**
 * Step 1 Characteristic Equation ITS Scaffolding Builder.
 *
 * Formulates the characteristic polynomial equation $a_2 s^2 + a_1 s + a_0 = 0$,
 * pedagogical 3-tier hints, and common student misconceptions.
 */

import { formatQuadraticPolynomial } from "../../formatting";
import type { OdeItsStep1, OdeOrder } from "../types";

/**
 * Parameters required to build Step 1 ITS data.
 */
export interface BuildStep1Params {
	/** Differential equation order (1 or 2) */
	resolvedOrder: OdeOrder;
	/** Second-derivative coefficient $a_2$ ($0$ for 1st-order) */
	a2: number;
	/** First-derivative coefficient $a_1$ */
	a1: number;
	/** Zero-derivative coefficient $a_0$ */
	a0: number;
	/** Formatted polynomial LHS string (e.g. "s + 2" or "s^2 + 5s + 6") */
	charEqLhs: string;
}

/**
 * Builds the Step 1 (Characteristic Equation) ITS metadata.
 *
 * @param {BuildStep1Params} params Configuration parameters for Step 1
 * @returns {OdeItsStep1} Step 1 problem data, hints, and misconceptions
 */
export function buildStep1Data(params: BuildStep1Params): OdeItsStep1 {
	const { resolvedOrder, a2, a1, a0, charEqLhs } = params;

	const charEqFormatted =
		resolvedOrder === 1
			? `${charEqLhs} = 0`
			: formatQuadraticPolynomial(a2, a1, a0, "s");

	return {
		expectedA2: a2,
		expectedA1: a1,
		expectedA0: a0,
		latex: charEqFormatted,
		hints: [
			resolvedOrder === 1
				? String.raw`Map $\frac{d}{dt}\to s$ and $y(t)\to1$.`
				: String.raw`Map $\frac{d^2}{dt^2}\to s^2$, $\frac{d}{dt}\to s$, and $y(t)\to1$.`,
			resolvedOrder === 1
				? "Set $x(t)=0$ to obtain $a_1s+a_0=0$."
				: "Set $x(t)=0$ to obtain $a_2s^2+a_1s+a_0=0$.",
			`For this differential equation, the characteristic equation is $${charEqFormatted}$.`,
		],
		misconceptions: {
			forcing_rhs:
				"The characteristic equation reflects the unforced (homogeneous) system response with $x(t) = 0$, not the forcing amplitude.",
			sign_error:
				"Watch the signs: maintain the exact signs of the derivative coefficients from the original ODE.",
			operator_power: String.raw`Each derivative order corresponds to a power of $s$: $\frac{d^2 y}{dt^2} \to s^2$, $\frac{dy}{dt} \to s^1$, and $y(t) \to s^0 = 1$.`,
		},
	};
}
