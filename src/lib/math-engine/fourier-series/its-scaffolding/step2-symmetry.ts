/**
 * Fourier ITS Step 2 Scaffolding Builder.
 *
 * Origin parity (even/odd/neither) and half-wave symmetry classification scaffolding.
 */

import type { FourierCoefficients, FourierItsStep2 } from "../types";

/**
 * Builds Step 2 waveform symmetry analysis scaffolding.
 *
 * @param {FourierCoefficients} coeffs Waveform coefficients model
 * @returns {FourierItsStep2} Step 2 symmetry scaffolding metadata
 */
export function buildStep2Data(coeffs: FourierCoefficients): FourierItsStep2 {
	const { originParity } = coeffs;

	return {
		correctOriginParity: originParity,
		correctHalfWaveSymmetry: coeffs.hasHalfWaveSymmetry,
		hints: [
			"Test if the waveform mirrors across the vertical y-axis (even) or reflects through the origin (odd).",
			"Check algebraically if $x(-t) = x(t)$ (even) or $x(-t) = -x(t)$ (odd).",
			originParity === "even"
				? "The signal satisfies $x(-t) = x(t)$, perfectly mirroring across the vertical axis: Even symmetry."
				: originParity === "odd"
					? "The signal satisfies $x(-t) = -x(t)$, reflecting through the origin: Odd symmetry."
					: "The signal is shifted or asymmetric around $t=0$, so it has Neither centered symmetry.",
		],
		halfWaveHints: [
			"Compare the second half of one period with the first. Half-wave symmetry requires the same shape flipped vertically.",
			"Shift the signal by half a period and test whether every value changes sign: $x(t+T_0/2)=-x(t)$.",
			coeffs.hasHalfWaveSymmetry
				? "The second half-period is the sign-reversed copy of the first, so the signal has half-wave symmetry."
				: "The shifted waveform is not the sign-reversed copy of the original for the entire period, so the signal does not have half-wave symmetry.",
		],
		misconceptions: {
			even: "Even signals mirror across the vertical axis ($x(-t) = x(t)$).",
			odd: "Odd signals reflect across the origin ($x(-t) = -x(t)$).",
			none: "Check symmetry around $t=0$. Notice if the left and right halves mirror or invert.",
			half_wave:
				"Half-wave odd symmetry requires $x(t - T_0/2) = -x(t)$.",
		},
	};
}
