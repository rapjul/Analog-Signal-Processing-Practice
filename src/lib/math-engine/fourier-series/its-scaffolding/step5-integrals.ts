/**
 * Fourier ITS Step 5 Scaffolding Builder.
 *
 * Piecewise definite integral setup formulation for active Fourier coefficient families.
 */

import { type RandomSource, shuffleWithRandom } from "../../random";
import type {
	FourierCarriedCoefficient,
	FourierCoefficientPart,
	FourierCoefficientTarget,
	FourierItsOption,
	FourierItsStep5,
	FourierPrimaryForm,
	FourierSymbolicDerivation,
	OriginParity,
} from "../types";

/**
 * Builds one correct integral choice and three misconception-driven distractors.
 * @param {string} correct Correct integral LaTeX string
 * @param zeroResult Whether cancellation makes every rescaling of the integral equivalent.
 * @returns {FourierItsOption[]} Four options with feedback
 */
export function buildIntegralOptions(
	correct: string,
	zeroResult = false,
): FourierItsOption[] {
	if (zeroResult) {
		return [0, 1, -1, 2].map((offset, index) => ({
			id: index === 0 ? "c1" : `d${index}`,
			latex:
				offset === 0
					? correct
					: `${correct}${offset < 0 ? "-" : "+"}${Math.abs(offset)}`,
			isCorrect: index === 0,
			...(index === 0
				? {}
				: {
						feedback:
							"DC Offset Error: The integral already computes the average coefficient; do not add an offset.",
					}),
		}));
	}
	const scalingDistractor = correct.includes("\\frac{4}{T_0}")
		? correct.replace("\\frac{4}{T_0}", "\\frac{2}{T_0}")
		: correct.includes("\\frac{2j}{T_0}")
			? correct.replace("\\frac{2j}{T_0}", "\\frac{j}{T_0}")
			: correct.includes("\\frac{2}{T_0}")
				? correct.replace("\\frac{2}{T_0}", "\\frac{1}{T_0}")
				: correct.replace("\\frac{1}{T_0}", "\\frac{2}{T_0}");
	const kernelDistractor = correct.includes("e^{-jn\\omega_0t}")
		? correct.replace("e^{-jn\\omega_0t}", "e^{+jn\\omega_0t}")
		: correct.includes("\\cos(n\\omega_0t)")
			? correct.replaceAll("\\cos(n\\omega_0t)", "\\sin(n\\omega_0t)")
			: correct.includes("\\sin(n\\omega_0t)")
				? correct.replaceAll("\\sin(n\\omega_0t)", "\\cos(n\\omega_0t)")
				: correct.replace("\\,dt", "\\cos(n\\omega_0t)\\,dt");
	const fullIntervalDistractor = correct.includes("\\int_0^{T_0/2}")
		? correct.replace("\\int_0^{T_0/2}", "\\int_0^{T_0}")
		: correct.replace("\\int_0^{T_0/4}", "\\int_0^{T_0/2}");

	return [
		{ id: "c1", latex: correct, isCorrect: true },
		{
			id: "d1",
			latex: scalingDistractor,
			isCorrect: false,
			feedback:
				"Scaling Error: The normalization no longer matches the selected Fourier representation and symmetry reduction.",
		},
		{
			id: "d2",
			latex: kernelDistractor,
			isCorrect: false,
			feedback: correct.includes("e^{-jn\\omega_0t}")
				? "Sign Error: Exponential Fourier coefficients require the kernel $e^{-j n \\omega_0 t}$."
				: "Kernel Error: The selected sine or cosine kernel does not match the non-zero coefficient family.",
		},
		{
			id: "d3",
			latex: fullIntervalDistractor,
			isCorrect: false,
			feedback:
				"Interval Error: The bounds no longer match the non-zero waveform interval or one of its piecewise breakpoints.",
		},
	];
}

/**
 * Returns the coefficient families that the selected primary form must derive.
 * @param {FourierPrimaryForm} form Primary form
 * @param {OriginParity} originParity Parity about the origin
 * @param hasHalfWaveSymmetry - Whether half-wave symmetry already proves zero DC.
 * @returns {FourierCoefficientTarget[]} Ordered targets to evaluate
 */
export function getPrimaryCoefficientTargets(
	form: FourierPrimaryForm,
	originParity: OriginParity,
	hasHalfWaveSymmetry = false,
): FourierCoefficientTarget[] {
	if (form === "exp") return ["Fn"];
	if (originParity === "even")
		return hasHalfWaveSymmetry ? ["an"] : ["a0", "an"];
	if (originParity === "odd") return ["bn"];
	return hasHalfWaveSymmetry ? ["an", "bn"] : ["a0", "an", "bn"];
}

/**
 * Returns coefficients that symmetry has already proved to be zero.
 * @param {FourierPrimaryForm} form Primary form
 * @param {OriginParity} originParity Parity about the origin
 * @param hasHalfWaveSymmetry - Whether half-wave symmetry already proves zero DC.
 * @returns {FourierCarriedCoefficient[]} Carried zero coefficients
 */
export function buildCarriedCoefficients(
	form: FourierPrimaryForm,
	originParity: OriginParity,
	hasHalfWaveSymmetry = false,
): FourierCarriedCoefficient[] {
	if (form === "exp") return [];
	if (originParity === "none")
		return hasHalfWaveSymmetry
			? [
					{
						id: "a0",
						latex: "a_0=0",
						reason: "Half-wave symmetry makes the signal average zero.",
					},
				]
			: [];
	if (originParity === "odd") {
		return [
			{
				id: "a0",
				latex: "a_0=0",
				reason: "Odd symmetry makes the signal average zero.",
			},
			{
				id: "an",
				latex: "a_n=0",
				reason: "Odd symmetry eliminates every cosine coefficient.",
			},
		];
	}
	return [
		...(hasHalfWaveSymmetry
			? [
					{
						id: "a0" as const,
						latex: "a_0=0",
						reason: "Half-wave symmetry makes the signal average zero.",
					},
				]
			: []),
		{
			id: "bn",
			latex: "b_n=0",
			reason: "Even symmetry eliminates every sine coefficient.",
		},
	];
}

/**
 * Builds Step 5 integral setup scaffolding.
 *
 * @param {FourierPrimaryForm} form Selected primary series representation
 * @param {OriginParity} originParity Waveform origin parity
 * @param {FourierSymbolicDerivation} derivation Pre-computed symbolic derivations
 * @param {RandomSource} random PRNG source for distractor shuffling
 * @param hasHalfWaveSymmetry - Independent half-wave symmetry flag.
 * @returns {FourierItsStep5} Step 5 integral formulation metadata
 */
export function buildStep5Data(
	form: FourierPrimaryForm,
	originParity: OriginParity,
	derivation: FourierSymbolicDerivation,
	random: RandomSource,
	hasHalfWaveSymmetry = false,
): FourierItsStep5 {
	const targets = getPrimaryCoefficientTargets(
		form,
		originParity,
		hasHalfWaveSymmetry,
	);
	const integralByTarget: Record<FourierCoefficientTarget, string> = {
		a0: derivation.a0IntegralLatex,
		an: derivation.anIntegralLatex,
		bn: derivation.bnIntegralLatex,
		Fn: derivation.expIntegralLatex,
	};
	const titleByTarget: Record<FourierCoefficientTarget, string> = {
		a0: "DC Coefficient",
		an: "Cosine Coefficients",
		bn: "Sine Coefficients",
		Fn: "Exponential Coefficients",
	};

	const parts: FourierCoefficientPart[] = targets.map((target) => ({
		id: `setup-${target}`,
		target,
		title: `Set Up ${titleByTarget[target]}`,
		prompt: `Select the integral that computes $${target === "a0" ? "a_0" : target === "Fn" ? "F_n" : `${target[0]}_n`}$.`,
		resultLatex: integralByTarget[target],
		options: shuffleWithRandom(
			buildIntegralOptions(
				integralByTarget[target],
				target === "a0" && derivation.a0Latex === "0",
			),
			random,
		),
		hints: [
			"Keep the selected representation's normalization and kernel unchanged.",
			"Substitute the waveform value on every non-zero interval.",
			`The required setup is $${integralByTarget[target]}$.`,
		],
	}));

	const carriedCoefficients = buildCarriedCoefficients(
		form,
		originParity,
		hasHalfWaveSymmetry,
	);

	return {
		successMsg:
			"Correct integral formulation. The scale, kernel, and non-zero piecewise intervals all match the waveform.",
		parts,
		carriedCoefficients,
		hints: [
			"Use symmetry to choose the non-zero coefficient family before writing an integral.",
			"Trigonometric coefficients use $2/T_0$; exponential coefficients use $1/T_0$ and $e^{-jn\\omega_0t}$.",
			"Split the integral exactly where the waveform definition changes and omit intervals where the signal is zero.",
		],
	};
}
