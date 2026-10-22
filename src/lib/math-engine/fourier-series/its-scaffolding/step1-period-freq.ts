/**
 * Fourier ITS Step 1 Scaffolding Builder.
 *
 * Fundamental period (T_0) and radian frequency (omega_0) extraction scaffolding.
 */

import { formatFourierNumber } from "$lib/math-engine/fourier-series/frequency";
import type { FourierItsStep1 } from "../types";

/**
 * Builds Step 1 period and fundamental frequency scaffolding.
 *
 * @param {number} T0 Fundamental period value
 * @param {number} w0 Fundamental radian frequency value
 * @param {string} w0Latex Exact symbolic LaTeX string for omega_0
 * @returns {FourierItsStep1} Step 1 scaffolding metadata
 */
export function buildStep1Data(
	T0: number,
	w0: number,
	w0Latex: string,
): FourierItsStep1 {
	const tAliases = [String(T0)];
	const periodLatex = formatFourierNumber(T0);
	const w0Aliases =
		T0 === 2
			? ["pi", "\\pi", "1pi", "3.14", "3.1415", "3.1416"]
			: T0 === 4
				? ["pi/2", "\\pi/2", "0.5pi", "0.5\\pi", "1.57", "1.5708"]
				: [w0Latex, formatFourierNumber(w0)];

	return {
		expectedT: T0,
		expectedTUnit: "s",
		expectedW0: w0,
		expectedW0Unit: "rad/s",
		tAliases,
		w0Aliases,
		hints: [
			"Look at the bounds of the definition. Over what duration does the signal repeat itself entirely?",
			`The signal repeats every period $T_0 = ${periodLatex}\\text{ s}$. The fundamental frequency is $\\omega_0 = \\frac{2\\pi}{T_0}$.`,
			`Substitute $T_0 = ${periodLatex}$: $\\omega_0 = \\frac{2\\pi}{${periodLatex}} = ${w0Latex}\\text{ rad/s}$. Ensure units are $\\text{s}$ and $\\text{rad/s}$.`,
		],
	};
}
