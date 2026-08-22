/**
 * Fourier ITS Step 3 Scaffolding Builder.
 *
 * Vanishing coefficient shortcuts (a_0=0, a_n=0, b_n=0) derived from waveform symmetries.
 */

import type { FourierItsStep3, OriginParity } from "../types";

/**
 * Determines the vanishing Fourier series coefficient identifier based on signal origin parity.
 * @param {OriginParity} originParity Signal origin parity classification
 * @returns {FourierItsStep3["correctVanishing"]} Vanishing coefficient choice for ITS Step 3
 */
export function getVanishingCoefficients(
	originParity: OriginParity,
): FourierItsStep3["correctVanishing"] {
	switch (originParity) {
		case "even":
			return "bn_zero";
		case "odd":
			return "an_zero";
		case "none":
			return "none";
		default: {
			const _exhaustiveCheck: never = originParity;
			return "none";
		}
	}
}

/**
 * Builds Step 3 vanishing coefficient shortcuts scaffolding.
 *
 * @param {OriginParity} originParity Signal origin parity
 * @returns {FourierItsStep3} Step 3 shortcuts scaffolding metadata
 */
export function buildStep3Data(originParity: OriginParity): FourierItsStep3 {
	const correctVanishing = getVanishingCoefficients(originParity);

	return {
		correctVanishing,
		hints: [
			"Which trigonometric function (sine or cosine) shares the same symmetry as your signal?",
			originParity === "even"
				? "Cosine is an even function. An even signal consists solely of cosine terms."
				: originParity === "odd"
					? "Sine is an odd function. An odd signal consists solely of sine terms."
					: "Without centered symmetry, both sine and cosine harmonics exist.",
			originParity === "even"
				? "Since only cosine terms are needed, all sine coefficients vanish: $b_n = 0$."
				: originParity === "odd"
					? "Since only sine terms are needed, all cosine coefficients and DC offset vanish: $a_0 = 0, a_n = 0$."
					: "No symmetry shortcuts apply: you must compute both $a_n$ and $b_n$ (or use $F_n$).",
		],
		misconceptions: {
			an_zero:
				originParity === "even"
					? "Cosine is an even function! An even signal *will* have cosine terms ($a_n$). It is the sine terms ($b_n$) that vanish."
					: "Odd signals have $a_n = 0$.",
			bn_zero:
				originParity === "odd"
					? "Sine is an odd function! An odd signal *will* have sine terms ($b_n$). It is the cosine terms ($a_n$) that vanish."
					: "Even signals have $b_n = 0$.",
			none:
				originParity !== "none"
					? "Take advantage of symmetry! Even and odd symmetries always set half the Fourier coefficients to zero."
					: "Without symmetry, all harmonic components must be computed.",
		},
	};
}
