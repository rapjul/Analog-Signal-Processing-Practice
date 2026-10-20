/**
 * Fourier Series ITS Scaffolding Builders.
 *
 * Re-exports individual step data builders and provides the orchestrator function
 * `generateFourierSeriesItsData` for assembling full 7-step ITS scaffolding data.
 */

import { formatFourierFrequency } from "$lib/math-engine/fourier-series/frequency";
import { buildFourierSeriesSymbolicDerivation } from "$lib/math-engine/fourier-series/solver";
import type {
	FourierSeriesCoefficients,
	FourierSeriesItsData,
	FourierSeriesPrimaryForm,
} from "$lib/math-engine/fourier-series/types";
import type { RandomSource } from "$lib/math-engine/random";
import { buildStep1Data } from "./step1-period-freq";
import { buildStep2Data } from "./step2-symmetry";
import { buildStep3Data, getVanishingCoefficients } from "./step3-shortcuts";
import { buildStep4Data } from "./step4-form";
import {
	buildCarriedCoefficients,
	buildIntegralOptions,
	buildStep5Data,
	getPrimaryCoefficientTargets,
} from "./step5-integrals";
import { buildEvaluationOptions, buildStep6Data } from "./step6-evaluation";
import { buildPrimarySeriesOptions, buildStep7Data } from "./step7-series";

export {
	buildCarriedCoefficients,
	buildEvaluationOptions,
	buildIntegralOptions,
	buildPrimarySeriesOptions,
	buildStep1Data,
	buildStep2Data,
	buildStep3Data,
	buildStep4Data,
	buildStep5Data,
	buildStep6Data,
	buildStep7Data,
	getPrimaryCoefficientTargets,
	getVanishingCoefficients,
};

/**
 * Builds Intelligent Tutoring System (ITS) step-by-step metadata for Fourier Series problems.
 * @param {FourierSeriesCoefficients} coeffs Calculated waveform coefficients
 * @param {RandomSource} [random] Pseudo-random source for option ordering
 * @param {FourierSeriesPrimaryForm} [primaryForm] Optional primary form override
 * @returns {FourierSeriesItsData} Complete ITS step data
 */
export function generateFourierSeriesItsData(
	coeffs: FourierSeriesCoefficients,
	random: RandomSource = Math.random,
	primaryForm?: FourierSeriesPrimaryForm,
): FourierSeriesItsData {
	const { T0, w0, originParity } = coeffs;
	const w0Latex = formatFourierFrequency(T0);

	// Step 1: Period and Frequency
	const step1 = buildStep1Data(T0, w0, w0Latex);

	// Step 2: Symmetry
	const step2 = buildStep2Data(coeffs);

	// Step 3: Vanishing Coefficients
	const step3 = buildStep3Data(originParity, coeffs.hasHalfWaveSymmetry);

	// Step 4: Representation Form
	const step4 = buildStep4Data(originParity, primaryForm);
	const correctForm = step4.correctForm;

	// Pre-compute exact derivations
	const derivation = buildFourierSeriesSymbolicDerivation(coeffs, w0Latex);

	// Step 5: Piecewise Integral Setup
	const step5 = buildStep5Data(
		correctForm,
		coeffs.originParity,
		derivation,
		random,
		coeffs.hasHalfWaveSymmetry,
	);

	// Step 6: Harmonic Coefficient Evaluation
	const step6 = buildStep6Data(
		correctForm,
		coeffs.originParity,
		derivation,
		random,
		coeffs.hasHalfWaveSymmetry,
	);

	// Step 7: Final series in the selected primary representation
	const synthesisLatex =
		correctForm === "trig"
			? derivation.finalTrigLatex
			: derivation.finalExpLatex;
	const step7 = buildStep7Data(correctForm, synthesisLatex, random);

	return {
		step1,
		step2,
		step3,
		step4,
		step5,
		step6,
		step7,
	};
}

// Alias for compatibility
export const generateFourierItsData = generateFourierSeriesItsData;
