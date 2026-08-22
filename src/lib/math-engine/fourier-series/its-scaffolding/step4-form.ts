/**
 * Fourier ITS Step 4 Scaffolding Builder.
 *
 * Optimal representation form selection (Trigonometric vs Exponential).
 */

import type {
	FourierItsStep4,
	FourierPrimaryForm,
	OriginParity,
} from "../types";

/**
 * Builds Step 4 representation form selection scaffolding.
 *
 * @param {OriginParity} originParity Signal origin parity classification
 * @param {FourierPrimaryForm} [primaryForm] Explicit primary form override
 * @returns {FourierItsStep4} Step 4 form selection scaffolding metadata
 */
export function buildStep4Data(
	originParity: OriginParity,
	primaryForm?: FourierPrimaryForm,
): FourierItsStep4 {
	const correctForm =
		primaryForm ?? (originParity !== "none" ? "trig" : "exp");

	return {
		correctForm,
		hints: [
			originParity !== "none"
				? "You already know that half the coefficients are zero. Which form separates sine and cosine terms?"
				: "Without symmetry, which representation evaluates both real and imaginary parts in a single integral?",
			"Trigonometric form separates $a_n$ and $b_n$. Exponential form $F_n$ combines them using $e^{-j n \\omega_0 t}$.",
			originParity !== "none"
				? "Since one set of coefficients is zero, the Trigonometric form is the most efficient (requiring only one real-valued integral)."
				: "Evaluating $F_n$ via the Exponential form evaluates both components in one complex integral.",
		],
		misconceptions: {
			trig:
				originParity === "none"
					? "Using Trigonometric form without symmetry requires solving two separate integrals ($a_n$ and $b_n$). Exponential form $F_n$ is faster."
					: "Trigonometric form is preferred here.",
			exp:
				originParity !== "none"
					? "While Exponential form is valid, Trigonometric form is faster because we can directly set the vanishing coefficients to 0."
					: "Exponential form is preferred here.",
			compact:
				"Compact polar form ($C_n, \\theta_n$) is derived from Trigonometric or Exponential coefficients, not integrated directly.",
		},
	};
}
