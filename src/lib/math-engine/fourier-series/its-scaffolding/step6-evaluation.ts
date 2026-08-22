/**
 * Fourier ITS Step 6 Scaffolding Builder.
 *
 * Harmonic coefficient algebraic evaluation and simplification scaffolding.
 */

import { type RandomSource, shuffleWithRandom } from "../../random";
import type {
	FourierCoefficientPart,
	FourierCoefficientTarget,
	FourierItsOption,
	FourierItsStep6,
	FourierPrimaryForm,
	FourierSymbolicDerivation,
	OriginParity,
} from "../types";
import {
	buildCarriedCoefficients,
	getPrimaryCoefficientTargets,
} from "./step5-integrals";

/**
 * Builds four parallel evaluation choices for exactly one coefficient family.
 * @param {FourierCoefficientTarget} target Target coefficient
 * @param {string} resultLatex Correct result LaTeX
 * @returns {FourierItsOption[]} Four multiple choice options
 */
export function buildEvaluationOptions(
	target: FourierCoefficientTarget,
	resultLatex: string,
): FourierItsOption[] {
	const label =
		target === "a0" ? "a_0" : `${target === "Fn" ? "F" : target[0]}_n`;
	return [
		{
			id: `${target}-correct`,
			latex: `${label}=${resultLatex}`,
			isCorrect: true,
		},
		{
			id: `${target}-scale`,
			latex: `${label}=\\frac{1}{2}\\left(${resultLatex}\\right)`,
			isCorrect: false,
			feedback:
				"Scale Factor Error: Recheck the Fourier normalization before applying the integration bounds.",
		},
		{
			id: `${target}-sign`,
			latex: `${label}=-\\left(${resultLatex}\\right)`,
			isCorrect: false,
			feedback:
				"Sign Error: Re-evaluate the antiderivative at the upper and lower bounds in order.",
		},
		{
			id: `${target}-support`,
			latex: `${label}=\\left(${resultLatex}\\right)(-1)^n`,
			isCorrect: false,
			feedback:
				"Harmonic Support Error: Simplify the parity factor only after applying all piecewise bounds.",
		},
	];
}

/**
 * Builds Step 6 harmonic coefficient evaluation scaffolding.
 *
 * @param {FourierPrimaryForm} form Selected primary series representation
 * @param {OriginParity} originParity Waveform origin parity
 * @param {FourierSymbolicDerivation} derivation Pre-computed symbolic derivations
 * @param {RandomSource} random PRNG source for distractor shuffling
 * @returns {FourierItsStep6} Step 6 coefficient evaluation metadata
 */
export function buildStep6Data(
	form: FourierPrimaryForm,
	originParity: OriginParity,
	derivation: FourierSymbolicDerivation,
	random: RandomSource,
): FourierItsStep6 {
	const targets = getPrimaryCoefficientTargets(form, originParity);
	const resultByTarget: Record<FourierCoefficientTarget, string> = {
		a0: derivation.a0Latex,
		an: derivation.anLatex,
		bn: derivation.bnLatex,
		Fn: derivation.FnLatex,
	};
	const titleByTarget: Record<FourierCoefficientTarget, string> = {
		a0: "DC Coefficient",
		an: "Cosine Coefficients",
		bn: "Sine Coefficients",
		Fn: "Exponential Coefficients",
	};

	const parts: FourierCoefficientPart[] = targets.map((target) => ({
		id: `evaluate-${target}`,
		target,
		title: `Evaluate ${titleByTarget[target]}`,
		prompt: `Apply the bounds and simplify $${target === "a0" ? "a_0" : target === "Fn" ? "F_n" : `${target[0]}_n`}$.`,
		resultLatex: `${target === "a0" ? "a_0" : target === "Fn" ? "F_n" : `${target[0]}_n`}=${resultByTarget[target]}`,
		options: shuffleWithRandom(
			buildEvaluationOptions(target, resultByTarget[target]),
			random,
		),
		hints: [
			"Apply the antiderivative at every piecewise boundary.",
			"Simplify parity and harmonic-index factors after combining all terms.",
			`The evaluated coefficient is $${target === "a0" ? "a_0" : target === "Fn" ? "F_n" : `${target[0]}_n`}=${resultByTarget[target]}$.`,
		],
	}));

	const carriedCoefficients = buildCarriedCoefficients(form, originParity);

	return {
		parts,
		carriedCoefficients,
		hints: [
			"Apply the antiderivative to every non-zero interval before simplifying the harmonic index.",
			"Use $\\cos(n\\pi)=(-1)^n$ and $\\sin(n\\pi/2)$ to expose vanished or alternating harmonics.",
			`The evaluated result is $${derivation.evaluationLatex}$. Then use $F_n=(a_n-jb_n)/2$.`,
		],
	};
}
