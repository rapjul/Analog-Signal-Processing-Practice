/**
 * Reactive ODE Equation Preview Derivations.
 *
 * Computes live mathematical preview equations for characteristic equations,
 * quadratic formula setups, complex conjugate roots, and decomposed responses (Zero-Input & Zero-State).
 */

import { sanitizeLatexMath } from "$lib/math-engine/formatting";
import { parseNumericInput, toFractionLatex } from "$lib/math-engine/fraction";
import { formatHomogeneousResponse } from "$lib/math-engine/odes/formatting";
import type { OdeOrder, OdeParams } from "$lib/math-engine/odes/types";
import type {
	OdeStep1State,
	OdeStep7State,
} from "./ode-step-types";

/**
 * Live rendered preview equation for Step 1 Characteristic Equation.
 *
 * @param {OdeStep1State} step1 - Step 1 reactive state with coefficient inputs a2, a1, a0.
 * @param {OdeOrder} order - Differential equation order (1 or 2).
 * @returns {string} LaTeX equation string (e.g. "s^2 + 3s + 2 = 0" or "s + 4 = 0").
 */
export function derivePreviewCharEq(
	step1: OdeStep1State,
	order: OdeOrder,
): string {
	const a2Str = step1.a2.trim();
	const a1Str = step1.a1.trim();
	const a0Str = step1.a0.trim();

	let term2 = "s^2";
	if (a2Str !== "") {
		const n2 = parseNumericInput(a2Str);
		if (!Number.isNaN(n2)) {
			if (n2 === 1) term2 = "s^2";
			else if (n2 === -1) term2 = "-s^2";
			else term2 = `${a2Str}s^2`;
		} else {
			term2 = `${a2Str}s^2`;
		}
	} else {
		term2 = "a_2 s^2";
	}

	let term1 = "+ a_1 s";
	if (a1Str !== "") {
		const n1 = parseNumericInput(a1Str);
		if (!Number.isNaN(n1)) {
			if (n1 === 1) term1 = "+ s";
			else if (n1 === -1) term1 = "- s";
			else if (n1 >= 0) term1 = `+ ${a1Str}s`;
			else
				term1 = `- ${a1Str.startsWith("-") ? a1Str.slice(1).trim() : Math.abs(n1)}s`;
		} else {
			term1 = `+ ${a1Str}s`;
		}
	} else {
		term1 = "+ a_1 s";
	}

	let term0 = "+ a_0";
	if (a0Str !== "") {
		const n0 = parseNumericInput(a0Str);
		if (!Number.isNaN(n0)) {
			if (n0 >= 0) term0 = `+ ${a0Str}`;
			else
				term0 = `- ${a0Str.startsWith("-") ? a0Str.slice(1).trim() : Math.abs(n0)}`;
		} else {
			term0 = `+ ${a0Str}`;
		}
	} else {
		term0 = "+ a_0";
	}

	return order === 1
		? `${term1.replace(/^\+\s*/, "")} ${term0} = 0`
		: `${term2} ${term1} ${term0} = 0`;
}

/**
 * Formatted LaTeX preview string of the substituted quadratic formula.
 *
 * @param {number} a2 - Second derivative coefficient a2.
 * @param {number} a1 - First derivative coefficient a1.
 * @param {number} a0 - Zero derivative coefficient a0.
 * @returns {string} LaTeX quadratic formula substitution string.
 */
export function derivePreviewQuadSetup(
	a2: number,
	a1: number,
	a0: number,
): string {
	const disc = a1 * a1 - 4 * a2 * a0;
	const negB = -a1;
	return `s = \\frac{-(${a1}) \\pm \\sqrt{(${a1})^2 - 4(${a2})(${a0})}}{2(${a2})} = \\frac{${negB} \\pm \\sqrt{${disc}}}{${2 * a2}}`;
}

/**
 * Live rendered preview equation for Step 2 complex roots.
 *
 * @param {string} sigma - Input string for real attenuation sigma.
 * @param {string} omegaD - Input string for damped frequency omega_d.
 * @returns {string} LaTeX complex conjugate roots preview.
 */
export function derivePreviewComplexRoots(
	sigma: string,
	omegaD: string,
): string {
	const sigStr = sigma.trim() !== "" ? sigma.trim() : "\\sigma";
	const omStr = omegaD.trim() !== "" ? omegaD.trim() : "\\omega_d";
	return `s = ${sigStr} \\pm j${omStr}`;
}

/**
 * Formatted LaTeX preview string of the Zero-Input response y_{ZI}(t).
 *
 * @param {OdeStep7State} step7 - Step 7 reactive state.
 * @param {OdeParams} params - ODE structural parameters.
 * @returns {string} LaTeX representation of y_{ZI}(t).
 */
export function derivePreviewZI(
	step7: OdeStep7State,
	params: OdeParams,
): string {
	const c1 = step7.ziC1.trim() !== "" ? step7.ziC1.trim() : "C_{1,ZI}";
	const c2 = step7.ziC2.trim() !== "" ? step7.ziC2.trim() : "C_{2,ZI}";
	return formatHomogeneousResponse(c1, c2, params);
}

/**
 * Calculates derived Zero-State constant C_{1,ZS} = C_1 - C_{1,ZI}.
 *
 * @param {string} ziC1Str - Student input for C_{1,ZI}.
 * @param {number} totalC1 - Total response constant C_1 from Step 6.
 * @returns {string} Fraction LaTeX string or default symbol "C_{1,ZS}".
 */
export function deriveZSC1(ziC1Str: string, totalC1: number): string {
	const vC1 = parseNumericInput(ziC1Str);
	if (Number.isNaN(vC1)) return "C_{1,ZS}";
	const zsC1 = totalC1 - vC1;
	return toFractionLatex(zsC1);
}

/**
 * Calculates derived Zero-State constant C_{2,ZS} = C_2 - C_{2,ZI}.
 *
 * @param {string} ziC2Str - Student input for C_{2,ZI}.
 * @param {number} [totalC2] - Total response constant C_2 from Step 6.
 * @returns {string} Fraction LaTeX string or default symbol "C_{2,ZS}".
 */
export function deriveZSC2(ziC2Str: string, totalC2?: number): string {
	const vC2 = parseNumericInput(ziC2Str);
	if (Number.isNaN(vC2)) return "C_{2,ZS}";
	const zsC2 = (totalC2 ?? 0) - vC2;
	return toFractionLatex(zsC2);
}

/**
 * Formatted LaTeX preview string of the Zero-State response y_{ZS}(t).
 *
 * @param {string} c1 - Derived C_{1,ZS} string.
 * @param {string} c2 - Derived C_{2,ZS} string.
 * @param {OdeParams} params - ODE structural parameters.
 * @param {string} ypLatex - Solved particular solution LaTeX y_p(t).
 * @returns {string} LaTeX representation of y_{ZS}(t).
 */
export function derivePreviewZS(
	c1: string,
	c2: string,
	params: OdeParams,
	ypLatex: string,
): string {
	const homoPart = formatHomogeneousResponse(c1, c2, params);
	let full = "";
	if (ypLatex === "0" || ypLatex === "") {
		full = homoPart;
	} else if (homoPart === "0" || homoPart === "") {
		full = ypLatex;
	} else {
		full = `${homoPart} + ${ypLatex}`;
	}
	return sanitizeLatexMath(full);
}
