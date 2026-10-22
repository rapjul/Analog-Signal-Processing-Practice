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
	const assignedName =
		correctForm === "trig" ? "Trigonometric" : "Exponential";

	return {
		correctForm,
		hints: [
			`This guided problem uses the ${assignedName} form. Both Trigonometric and Exponential representations are mathematically valid.`,
			"Trigonometric form separates $a_n$ and $b_n$. Exponential form $F_n$ combines them using $e^{-j n \\omega_0 t}$.",
			correctForm === "trig"
				? "Follow the Trigonometric path by evaluating DC and the real coefficient families not already eliminated by symmetry."
				: "Follow the Exponential path by evaluating $F_n$, including its DC case separately.",
		],
		misconceptions: {
			trig: `Trigonometric form is valid. Select the assigned ${assignedName} form for this guided derivation.`,
			exp: `Exponential form is valid. Select the assigned ${assignedName} form for this guided derivation.`,
			compact:
				"Compact polar form ($C_n, \\theta_n$) is derived from Trigonometric or Exponential coefficients, not integrated directly.",
		},
	};
}
