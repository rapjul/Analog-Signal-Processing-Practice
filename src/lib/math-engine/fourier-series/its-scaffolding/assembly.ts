/** Internal assembly shared by the public ITS wrapper and complete problem generation. */

import type { RandomSource } from "../../random";
import { formatFourierFrequency } from "../frequency";
import { buildFourierSeriesSymbolicDerivation } from "../symbolic-derivations";
import type {
	FourierSeriesCoefficients,
	FourierSeriesItsData,
	FourierSeriesPrimaryForm,
	FourierSeriesSymbolicDerivation,
} from "../types";
import { buildStep1Data } from "./step1-period-freq";
import { buildStep2Data } from "./step2-symmetry";
import { buildStep3Data } from "./step3-shortcuts";
import { buildStep4Data } from "./step4-form";
import { buildStep5Data } from "./step5-integrals";
import { buildStep6Data } from "./step6-evaluation";
import { buildStep7Data } from "./step7-series";

/** Data constructed once for a single coefficient model and generation invocation. */
interface FourierSeriesAssembly {
	/** Exact formatted fundamental frequency. */
	w0Latex: string;
	/** Shared symbolic definitions for questions and worked solutions. */
	derivation: FourierSeriesSymbolicDerivation;
	/** Seven-step intelligent tutoring metadata. */
	itsData: FourierSeriesItsData;
}

/**
 * Assembles a derivation and its tutoring questions without changing random consumption.
 * @param coeffs - Validated waveform coefficient model.
 * @param random - Seeded source used only for the existing option shuffles.
 * @param primaryForm - Optional explicit representation override.
 * @returns Per-invocation frequency, derivation, and tutoring data.
 */
export function assembleFourierSeriesData(
	coeffs: FourierSeriesCoefficients,
	random: RandomSource,
	primaryForm?: FourierSeriesPrimaryForm,
): FourierSeriesAssembly {
	const { T0, w0, originParity, hasHalfWaveSymmetry } = coeffs;
	const w0Latex = formatFourierFrequency(T0);
	const step1 = buildStep1Data(T0, w0, w0Latex);
	const step2 = buildStep2Data(coeffs);
	const step3 = buildStep3Data(originParity, hasHalfWaveSymmetry);
	const step4 = buildStep4Data(originParity, primaryForm);
	const derivation = buildFourierSeriesSymbolicDerivation(coeffs, w0Latex);
	const step5 = buildStep5Data(
		step4.correctForm,
		originParity,
		derivation,
		random,
		hasHalfWaveSymmetry,
	);
	const step6 = buildStep6Data(
		step4.correctForm,
		originParity,
		derivation,
		random,
		hasHalfWaveSymmetry,
	);
	const synthesisLatex =
		step4.correctForm === "trig"
			? derivation.finalTrigLatex
			: derivation.finalExpLatex;
	const step7 = buildStep7Data(step4.correctForm, synthesisLatex, random);
	return {
		w0Latex,
		derivation,
		itsData: { step1, step2, step3, step4, step5, step6, step7 },
	};
}
