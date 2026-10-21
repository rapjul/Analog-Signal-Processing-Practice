/**
 * Fourier Series & Harmonic Spectrum Domain Types.
 *
 * Defines domain models, coefficient evaluators, Parseval power metrics,
 * and Intelligent Tutoring System (ITS) step data contracts for Fourier Series.
 */

import type { BaseItsStep, ItsOption, SolutionStep } from "../types";

/** Supported classic periodic waveform categories for Fourier Series */
export type FourierSeriesWaveformType =
	| "square" // Standard square wave
	| "square_odd" // Odd-symmetric square wave
	| "square_even" // Even-symmetric square wave
	| "triangle" // Standard triangle wave
	| "triangle_odd" // Odd-symmetric triangle wave
	| "triangle_even" // Even-symmetric triangle wave
	| "sawtooth" // Sawtooth waveform
	| "half_wave_sine" // Half-wave rectified sine
	| "full_wave_sine"; // Full-wave rectified sine

/** Supported waveform identifiers for validation and selector construction. */
export const FOURIER_SERIES_WAVEFORM_TYPES: readonly FourierSeriesWaveformType[] =
	[
		"square",
		"square_odd",
		"square_even",
		"triangle",
		"triangle_odd",
		"triangle_even",
		"sawtooth",
		"half_wave_sine",
		"full_wave_sine",
	] as const;

/** Waveform parity about the time origin. */
export type OriginParity = "even" | "odd" | "none";

/** Cartesian complex coefficient value. */
export interface ComplexCoefficient {
	/** Real component. */
	re: number;
	/** Imaginary component. */
	im: number;
}

/** Evaluated Fourier series coefficients representation */
export interface FourierSeriesCoefficients {
	/** Waveform type category */
	waveformType: FourierSeriesWaveformType;
	/** Amplitude scale A */
	A: number;
	/** Fundamental period T0 */
	T0: number;
	/** Fundamental frequency omega0 = 2 * pi / T0 */
	w0: number;
	/** Standard trigonometric coefficient a0; the DC component is a0 / 2. */
	a0: number;
	/** Waveform parity about the time origin. */
	originParity: OriginParity;
	/** Whether x(t + T0 / 2) = -x(t). */
	hasHalfWaveSymmetry: boolean;
	/** Whether the periodic waveform contains jump discontinuities. */
	hasJumpDiscontinuities: boolean;
	/** Cosine coefficient evaluator function a_n */
	an: (n: number) => number;
	/** Sine coefficient evaluator function b_n */
	bn: (n: number) => number;
	/** Exponential coefficient evaluator F_n for every integer n. */
	Fn: (n: number) => ComplexCoefficient;
}

/** Parseval power distribution analysis */
export interface SignalPower {
	/** Total average signal power P_x */
	totalPower: number;
	/** Harmonic power in first N harmonics */
	harmonicPower: number;
	/** Fraction of total power captured (harmonicPower / totalPower) */
	powerRatio: number;
}

/** Minimum harmonic limits required to capture common power targets. */
export interface HarmonicPowerThresholds {
	/** Smallest N with at least 90% captured power. */
	n90: number;
	/** Smallest N with at least 95% captured power. */
	n95: number;
	/** Smallest N with at least 99% captured power. */
	n99: number;
}

/** Evaluation option for ITS multiple-choice steps (alias to shared ItsOption) */
export type FourierSeriesItsOption = ItsOption;

/** Fourier representation selected as the most efficient derivation path. */
export type FourierSeriesPrimaryForm = "trig" | "exp";

/** Coefficient family evaluated by one focused tutor sub-step. */
export type FourierSeriesCoefficientTarget = "a0" | "an" | "bn" | "Fn";

/** One coefficient that symmetry carries into the derivation without a quiz. */
export interface FourierSeriesCarriedCoefficient {
	/** Stable coefficient-family identifier. */
	id: Exclude<FourierSeriesCoefficientTarget, "Fn">;
	/** Exact carried result. */
	latex: string;
	/** Short explanation of the symmetry shortcut. */
	reason: string;
}

/** One focused setup or evaluation part for a single coefficient family. */
export interface FourierSeriesCoefficientPart extends BaseItsStep {
	/** Stable sub-step identifier. */
	id: string;
	/** Coefficient family addressed by this part. */
	target: FourierSeriesCoefficientTarget;
	/** User-facing sub-step title. */
	title: string;
	/** User-facing prompt. */
	prompt: string;
	/** Exact result displayed in completed summaries. */
	resultLatex: string;
	/** Four structurally parallel, deterministic answer options. */
	options: FourierSeriesItsOption[];
}

/** ITS Step 1: Period and Fundamental Frequency metadata */
export interface FourierSeriesItsStep1 extends BaseItsStep {
	/** Target period value */
	expectedT: number;
	/** Target period unit (always 's') */
	expectedTUnit: string;
	/** Target fundamental frequency value */
	expectedW0: number;
	/** Target fundamental frequency unit (always 'rad/s') */
	expectedW0Unit: string;
	/** Acceptable string aliases for T */
	tAliases: string[];
	/** Acceptable string aliases for omega0 */
	w0Aliases: string[];
}

/** ITS Step 2: Symmetry classification metadata */
export interface FourierSeriesItsStep2 extends BaseItsStep {
	/** Correct parity classification about the time origin. */
	correctOriginParity: OriginParity;
	/** Correct independent half-wave symmetry classification. */
	correctHalfWaveSymmetry: boolean;
	/** Progressive hints used only for the half-wave symmetry sub-step. */
	halfWaveHints: string[];
	/** Diagnostic feedback for incorrect symmetry choices */
	misconceptions: Record<string, string>;
}

/** ITS Step 3: Vanishing coefficients metadata */
export interface FourierSeriesItsStep3 extends BaseItsStep {
	/** Correct vanishing coefficient identifier */
	correctVanishing: "an_zero" | "bn_zero" | "none" | "both_even";
	/** Diagnostic feedback for incorrect vanishing choices */
	misconceptions: Record<string, string>;
}

/** ITS Step 4: Representation form selection metadata */
export interface FourierSeriesItsStep4 extends BaseItsStep {
	/** Correct representation form */
	correctForm: FourierSeriesPrimaryForm;
	/** Diagnostic feedback for incorrect form choices */
	misconceptions: Record<string, string>;
}

/** ITS Step 5: Integral formulation setup metadata */
export interface FourierSeriesItsStep5 extends BaseItsStep {
	/** Success alert message */
	successMsg: string;
	/** Ordered setup parts for the selected primary representation. */
	parts: FourierSeriesCoefficientPart[];
	/** Coefficients already known from symmetry and not re-queried. */
	carriedCoefficients: FourierSeriesCarriedCoefficient[];
}

/** ITS Step 6: Evaluated Fourier coefficient metadata */
export interface FourierSeriesItsStep6 extends BaseItsStep {
	/** Ordered evaluation parts matching Step 5. */
	parts: FourierSeriesCoefficientPart[];
	/** Coefficients already known from symmetry and not re-queried. */
	carriedCoefficients: FourierSeriesCarriedCoefficient[];
}

/** ITS Step 7: Final series summation evaluation metadata */
export interface FourierSeriesItsStep7 extends BaseItsStep {
	/** Representation synthesized by the required workflow. */
	form: FourierSeriesPrimaryForm;
	/** Shuffled multiple-choice options with distractors */
	options: FourierSeriesItsOption[];
}

/** Optional post-completion conversion part. */
export interface FourierSeriesConversionPart extends BaseItsStep {
	/** Stable part identifier. */
	id: "alternate" | "compact";
	/** User-facing part title. */
	title: string;
	/** Conversion prompt. */
	prompt: string;
	/** Exact conversion revealed in the worked solution after completion. */
	resultLatex: string;
	/** Four structurally parallel conversion choices. */
	options: FourierSeriesItsOption[];
}

/** Optional two-part conversion challenge metadata. */
export interface FourierSeriesConversionChallenge {
	/** Ordered alternate-representation and Compact-form parts. */
	parts: [FourierSeriesConversionPart, FourierSeriesConversionPart];
}

/** Complete ITS problem data container */
export interface FourierSeriesItsData {
	/** Step 1: Period and Frequency */
	step1: FourierSeriesItsStep1;
	/** Step 2: Symmetry */
	step2: FourierSeriesItsStep2;
	/** Step 3: Vanishing Coefficients */
	step3: FourierSeriesItsStep3;
	/** Step 4: Representation Form */
	step4: FourierSeriesItsStep4;
	/** Step 5: Integral Setup */
	step5: FourierSeriesItsStep5;
	/** Step 6: Harmonic Coefficient Evaluation */
	step6: FourierSeriesItsStep6;
	/** Step 7: Final Series Expression */
	step7: FourierSeriesItsStep7;
}

/** Exact symbolic forms reused by the tutor, problem fields, and derivation. */
export interface FourierSeriesSymbolicDerivation {
	a0Latex: string;
	anLatex: string;
	bnLatex: string;
	FnLatex: string;
	a0IntegralLatex: string;
	anIntegralLatex: string;
	bnIntegralLatex: string;
	integralLatex: string;
	expIntegralLatex: string;
	/** Direct exponential-integral evaluation; optional for existing callers. */
	expEvaluationLatex?: string;
	evaluationLatex: string;
	finalTrigLatex: string;
	finalExpLatex: string;
}

/** Fourier Series practice problem definition */
export interface FourierSeriesProblem {
	/** Unique identifier */
	id: string;
	/** Unsigned seed used to reproduce this problem. */
	seed: number;
	/** Waveform type */
	waveformType: FourierSeriesWaveformType;
	/** Title of problem */
	title: string;
	/** Period LaTeX representation */
	periodLatex: string;
	/** Fundamental frequency LaTeX representation */
	omega0Latex: string;
	/** Time-domain waveform LaTeX representation */
	signalLatex: string;
	/** Closed-form a0 LaTeX */
	a0Latex: string;
	/** Closed-form an LaTeX */
	anLatex: string;
	/** Closed-form bn LaTeX */
	bnLatex: string;
	/** Closed-form exponential coefficient F_n LaTeX. */
	FnLatex: string;
	/** Step-by-step solution derivation */
	solutionSteps: SolutionStep[];
	/** Mathematical coefficient evaluator instance */
	coeffs: FourierSeriesCoefficients;
	/** Intelligent Tutoring System step-by-step metadata */
	itsData: FourierSeriesItsData;
	/** Optional post-completion representation-conversion challenge. */
	conversionChallenge: FourierSeriesConversionChallenge;
	/** Worked conversions appended only after the optional challenge is solved. */
	conversionSolutionSteps: SolutionStep[];
}

/** Optional controls for deterministic Fourier problem generation. */
export interface FourierSeriesGenerationOptions {
	/** Explicit guided representation; symmetry supplies the default recommendation. */
	primaryForm?: FourierSeriesPrimaryForm;
	/** Explicit pseudo-random number generator seed. */
	seed?: number;
	/** Fixed amplitude override used by tests and authored examples. */
	A?: number;
	/** Fixed fundamental period override used by tests and authored examples. */
	T0?: number;
}

// Backward-compatibility aliases
export const FOURIER_WAVEFORM_TYPES = FOURIER_SERIES_WAVEFORM_TYPES;
export type FourierWaveformType = FourierSeriesWaveformType;
export type FourierCoefficients = FourierSeriesCoefficients;
export type FourierItsOption = FourierSeriesItsOption;
export type FourierPrimaryForm = FourierSeriesPrimaryForm;
export type FourierCoefficientTarget = FourierSeriesCoefficientTarget;
export type FourierCarriedCoefficient = FourierSeriesCarriedCoefficient;
export type FourierCoefficientPart = FourierSeriesCoefficientPart;
export type FourierItsStep1 = FourierSeriesItsStep1;
export type FourierItsStep2 = FourierSeriesItsStep2;
export type FourierItsStep3 = FourierSeriesItsStep3;
export type FourierItsStep4 = FourierSeriesItsStep4;
export type FourierItsStep5 = FourierSeriesItsStep5;
export type FourierItsStep6 = FourierSeriesItsStep6;
export type FourierItsStep7 = FourierSeriesItsStep7;
export type FourierConversionPart = FourierSeriesConversionPart;
export type FourierConversionChallenge = FourierSeriesConversionChallenge;
export type FourierItsData = FourierSeriesItsData;
export type FourierSymbolicDerivation = FourierSeriesSymbolicDerivation;
export type FourierGenerationOptions = FourierSeriesGenerationOptions;
