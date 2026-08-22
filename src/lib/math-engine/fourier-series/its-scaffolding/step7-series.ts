/**
 * Fourier ITS Step 7 Scaffolding Builder.
 *
 * Final Fourier series expression options and distractor synthesis.
 */

import { type RandomSource, shuffleWithRandom } from "../../random";
import type {
	FourierItsOption,
	FourierItsStep7,
	FourierPrimaryForm,
} from "../types";

/**
 * Builds four full-series choices that differ without changing visual shape.
 * @param {string} correct Correct series formula LaTeX
 * @param {FourierPrimaryForm} form Representation form (trig or exp)
 * @returns {FourierItsOption[]} Four multiple choice options
 */
export function buildPrimarySeriesOptions(
	correct: string,
	form: FourierPrimaryForm,
): FourierItsOption[] {
	const signDistractor = correct
		.replace("x(t)=", "x(t)=-")
		.replace("x(t) =", "x(t) = -");
	const kernelDistractor =
		form === "exp"
			? correct.replace("e^{j n", "e^{-j n")
			: correct.includes("\\sin\\left(")
				? correct.replaceAll("\\sin\\left(", "\\cos\\left(")
				: correct.includes("\\cos\\left(")
					? correct.replaceAll("\\cos\\left(", "\\sin\\left(")
					: correct.replaceAll("\\cos(", "\\sin(");
	const scaleDistractor = correct.includes("\\frac{")
		? correct.replace("\\frac{", "\\frac{1}{2}\\frac{")
		: correct.replace("\\dfrac{", "\\frac{1}{2}\\dfrac{");
	return [
		{ id: "series-correct", latex: correct, isCorrect: true },
		{
			id: "series-sign",
			latex: signDistractor,
			isCorrect: false,
			feedback:
				"Sign Error: Preserve the signs of the evaluated coefficients during synthesis.",
		},
		{
			id: "series-kernel",
			latex: kernelDistractor,
			isCorrect: false,
			feedback:
				form === "exp"
					? "Kernel Sign Error: Synthesis uses $e^{j n \\omega_0 t}$ after analysis used the negative exponent."
					: "Kernel Error: Match each evaluated coefficient family to its sine or cosine basis function.",
		},
		{
			id: "series-scale",
			latex: scaleDistractor,
			isCorrect: false,
			feedback:
				"Scale Factor Error: The evaluated coefficients already include the Fourier normalization.",
		},
	];
}

/**
 * Builds Step 7 final Fourier series expression scaffolding.
 *
 * @param {FourierPrimaryForm} correctForm Selected primary representation form
 * @param {string} synthesisLatex Synthesis formula LaTeX
 * @param {RandomSource} random PRNG source for distractor shuffling
 * @returns {FourierItsStep7} Step 7 scaffolding metadata
 */
export function buildStep7Data(
	correctForm: FourierPrimaryForm,
	synthesisLatex: string,
	random: RandomSource,
): FourierItsStep7 {
	return {
		form: correctForm,
		options: shuffleWithRandom(
			buildPrimarySeriesOptions(synthesisLatex, correctForm),
			random,
		),
		hints: [
			"Insert the evaluated DC, cosine, and sine coefficients into the standard trigonometric series.",
			"Keep only harmonic indices whose evaluated coefficients are non-zero.",
			correctForm === "exp"
				? "Synthesize with $x(t)=\\sum_{n=-\\infty}^{\\infty}F_ne^{j n \\omega_0 t}$."
				: "Synthesize with $x(t)=a_0/2+\\sum_{n=1}^{\\infty}[a_n\\cos(n\\omega_0t)+b_n\\sin(n\\omega_0t)]$.",
		],
	};
}
