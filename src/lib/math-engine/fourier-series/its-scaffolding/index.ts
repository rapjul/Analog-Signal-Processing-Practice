/**
 * Fourier Series ITS Scaffolding Builders.
 *
 * Re-exports individual step data builders and provides the orchestrator function
 * `generateFourierSeriesItsData` for assembling full 7-step ITS scaffolding data.
 */

import type {
	FourierSeriesCoefficients,
	FourierSeriesItsData,
	FourierSeriesPrimaryForm,
} from "$lib/math-engine/fourier-series/types";
import type { RandomSource } from "$lib/math-engine/random";
import { assembleFourierSeriesData } from "./assembly";
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
	return assembleFourierSeriesData(coeffs, random, primaryForm).itsData;
}

// Alias for compatibility
export const generateFourierItsData = generateFourierSeriesItsData;
