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
	// Coefficient definitions follow the synthesis expression and must stay intact.
	const definitionIndex = correct.indexOf(",\\qquad");
	const synthesis =
		definitionIndex < 0 ? correct : correct.slice(0, definitionIndex);
	const definitions =
		definitionIndex < 0 ? "" : correct.slice(definitionIndex);
	const rhs = synthesis.slice(synthesis.indexOf("=") + 1).trim();
	const signDistractor = `x(t)=-\\left(${rhs}\\right)${definitions}`;
	const scaleDistractor = `x(t)=\\frac{1}{2}\\left(${rhs}\\right)${definitions}`;
	// Double only the independent time symbol; preserve phase and coefficient symbols.
	const doubledTime = rhs.replace(/(?<![a-zA-Z\\])t(?![a-zA-Z])/g, "(2t)");
	const kernelDistractor = `x(t)=${doubledTime}${definitions}`;
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
					? "Harmonic Frequency Error: Use the fundamental frequency in the exponential synthesis kernel without doubling it."
					: "Harmonic Frequency Error: Use the fundamental frequency in the trigonometric basis without doubling it.",
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
