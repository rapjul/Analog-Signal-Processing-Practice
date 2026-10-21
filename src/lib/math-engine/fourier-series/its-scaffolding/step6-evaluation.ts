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
	if (resultLatex === "0") {
		return [0, 1, -1, 2].map((value, index) => ({
			id: `${target}-${["correct", "scale", "sign", "support"][index]}`,
			latex: `${label}=${value}`,
			isCorrect: index === 0,
			...(index === 0
				? {}
				: {
						feedback:
							"DC Error: The positive and negative areas cancel, so the average is zero.",
					}),
		}));
	}
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
			latex: `${label}=2\\left(${resultLatex}\\right)`,
			isCorrect: false,
			feedback:
				"Scale Factor Error: Do not apply the Fourier normalization a second time.",
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
 * @param hasHalfWaveSymmetry - Independent half-wave symmetry flag.
 * @returns {FourierItsStep6} Step 6 coefficient evaluation metadata
 */
export function buildStep6Data(
	form: FourierPrimaryForm,
	originParity: OriginParity,
	derivation: FourierSymbolicDerivation,
	random: RandomSource,
	hasHalfWaveSymmetry = false,
): FourierItsStep6 {
	const targets = getPrimaryCoefficientTargets(
		form,
		originParity,
		hasHalfWaveSymmetry,
	);
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
			target === "Fn"
				? "Evaluate $F_0$ separately. If a denominator vanishes at an integer index, evaluate that integral directly before simplifying the general formula."
				: "Simplify parity and harmonic-index factors after combining all terms.",
			target === "Fn"
				? `The exponential integral evaluates to $${derivation.expEvaluationLatex ?? `F_n=${derivation.FnLatex}`}$.`
				: `The evaluated coefficient is $${target === "a0" ? "a_0" : `${target[0]}_n`}=${resultByTarget[target]}$.`,
		],
	}));

	const carriedCoefficients = buildCarriedCoefficients(
		form,
		originParity,
		hasHalfWaveSymmetry,
	);

	return {
		parts,
		carriedCoefficients,
		hints: [
			"Apply the antiderivative to every non-zero interval before simplifying the harmonic index.",
			"Use $\\cos(n\\pi)=(-1)^n$ and $\\sin(n\\pi/2)$ to expose vanished or alternating harmonics.",
			form === "exp"
				? `The exponential integral evaluates to $${derivation.expEvaluationLatex ?? `F_n=${derivation.FnLatex}`}$.`
				: `The evaluated result is $${derivation.evaluationLatex}$.`,
		],
	};
}
