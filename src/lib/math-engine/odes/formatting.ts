/**
 * ODE Response LaTeX Formatting Utilities.
 *
 * Provides standardized symbolic and preview formatting helpers for
 * natural homogeneous responses and decomposition terms across ODE archetypes.
 */

import {
	formatExpTerm,
	formatLinearCombination,
	formatSignedLinearTerm,
	sanitizeLatexMath,
} from "$lib/math-engine/formatting";
import { toFractionLatex } from "$lib/math-engine/fraction";
import type { OdeParams } from "./types";

/**
 * Formats a harmonic scalar without erasing finite nonzero values or emitting raw exponent syntax.
 * @param value - Harmonic amplitude or angular frequency.
 * @returns Existing fraction format, or round-trip scientific LaTeX when required.
 */
export function formatHarmonicScalar(value: number): string {
	const ordinary = toFractionLatex(value);
	if (!Number.isFinite(value) || value === 0) return ordinary;
	if (ordinary !== "0" && !/[eE][+-]?\d/.test(ordinary)) return ordinary;
	const [mantissa, exponent] = value.toExponential().split("e");
	return `${mantissa} \\times 10^{${Number(exponent)}}`;
}

/**
 * Formats the natural homogeneous response y_h(t) LaTeX string for given integration constants and ODE parameters.
 *
 * Handles 1st-order linear responses as well as 2nd-order distinct real,
 * repeated real, and complex conjugate root structures.
 *
 * @param {string} c1 - First constant expression or symbol (e.g. "C_1", "C_{1,ZI}", "3", "\\frac{1}{2}").
 * @param {string} c2 - Second constant expression or symbol (e.g. "C_2", "C_{2,ZI}", "-5", "\\frac{3}{4}").
 * @param {OdeParams} params - Structural parameters of the ODE including order, roots, and root classification.
 * @returns {string} Clean, sanitized LaTeX string representing the homogeneous response y_h(t).
 */
export function formatHomogeneousResponse(
	c1: string,
	c2: string,
	params: OdeParams,
): string {
	if (params.order === 1) {
		return sanitizeLatexMath(
			formatSignedLinearTerm(c1, formatExpTerm(params.roots.r1), true),
		);
	}

	const rootType = params.rootType;
	const roots = params.roots;

	let raw = "";
	switch (rootType) {
		case "distinct_real": {
			const term1 = formatSignedLinearTerm(
				c1,
				formatExpTerm(roots.r1),
				true,
			);
			const term2 = formatSignedLinearTerm(
				c2,
				formatExpTerm(roots.r2 ?? 0),
				false,
			);
			raw = `${term1} ${term2}`;
			break;
		}
		case "repeated_real": {
			const inner = formatLinearCombination(c1, c2);
			raw = `(${inner}) ${formatExpTerm(roots.r1)}`;
			break;
		}
		case "complex_conjugate": {
			const term1 = formatSignedLinearTerm(
				c1,
				`\\cos(${roots.im ?? 0}t)`,
				true,
			);
			const term2 = formatSignedLinearTerm(
				c2,
				`\\sin(${roots.im ?? 0}t)`,
				false,
			);
			const expTerm = roots.r1 !== 0 ? formatExpTerm(roots.r1) : "";
			raw = expTerm
				? `${expTerm} [${term1} ${term2}]`
				: `${term1} ${term2}`;
			break;
		}
		default: {
			raw = `${c1} + ${c2}`;
			break;
		}
	}

	return sanitizeLatexMath(raw);
}
