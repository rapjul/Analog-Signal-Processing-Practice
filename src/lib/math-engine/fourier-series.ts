/**
 * Fourier Series & Harmonic Spectrum Math Engine.
 * Calculates Trigonometric (a0, an, bn) and Exponential (Fn) Fourier coefficients,
 * N-harmonic partial sums S_N(t), Parseval signal power, and problem generator.
 */

import {
	createRandomSeed,
	createSeededPrng,
	type RandomSource,
	randomChoice,
	shuffleWithRandom,
} from "./random";
import type { BaseItsStep, ItsOption, SolutionStep } from "./types";

/** Supported classic periodic waveform categories */
export type FourierWaveformType =
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
export const FOURIER_WAVEFORM_TYPES: readonly FourierWaveformType[] = [
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

/** @deprecated Use OriginParity; half-wave symmetry is modeled independently. */
export type SignalSymmetry = OriginParity;

/** Cartesian complex coefficient value. */
export interface ComplexCoefficient {
	/** Real component. */
	re: number;
	/** Imaginary component. */
	im: number;
}

/** Evaluated Fourier series coefficients representation */
export interface FourierCoefficients {
	/** Waveform type category */
	waveformType: FourierWaveformType;
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
	/** @deprecated Compatibility alias for originParity. */
	symmetry: SignalSymmetry;
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
export type FourierItsOption = ItsOption;

/** Fourier representation selected as the most efficient derivation path. */
export type FourierPrimaryForm = "trig" | "exp";

/** Coefficient family evaluated by one focused tutor sub-step. */
export type FourierCoefficientTarget = "a0" | "an" | "bn" | "Fn";

/** One coefficient that symmetry carries into the derivation without a quiz. */
export interface FourierCarriedCoefficient {
	/** Stable coefficient-family identifier. */
	id: Exclude<FourierCoefficientTarget, "Fn">;
	/** Exact carried result. */
	latex: string;
	/** Short explanation of the symmetry shortcut. */
	reason: string;
}

/** One focused setup or evaluation part for a single coefficient family. */
export interface FourierCoefficientPart extends BaseItsStep {
	/** Stable sub-step identifier. */
	id: string;
	/** Coefficient family addressed by this part. */
	target: FourierCoefficientTarget;
	/** User-facing sub-step title. */
	title: string;
	/** User-facing prompt. */
	prompt: string;
	/** Exact result displayed in completed summaries. */
	resultLatex: string;
	/** Four structurally parallel, deterministic answer options. */
	options: FourierItsOption[];
}

/** ITS Step 1: Period and Fundamental Frequency metadata */
export interface FourierItsStep1 extends BaseItsStep {
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
export interface FourierItsStep2 extends BaseItsStep {
	/** @deprecated Compatibility alias for correctOriginParity. */
	correctSymmetry: SignalSymmetry;
	/** Correct parity classification about the time origin. */
	correctOriginParity: OriginParity;
	/** Correct independent half-wave symmetry classification. */
	correctHalfWaveSymmetry: boolean;
	/** Diagnostic feedback for incorrect symmetry choices */
	misconceptions: Record<string, string>;
}

/** ITS Step 3: Vanishing coefficients metadata */
export interface FourierItsStep3 extends BaseItsStep {
	/** Correct vanishing coefficient identifier */
	correctVanishing: "an_zero" | "bn_zero" | "none" | "both_even";
	/** Diagnostic feedback for incorrect vanishing choices */
	misconceptions: Record<string, string>;
}

/** ITS Step 4: Representation form selection metadata */
export interface FourierItsStep4 extends BaseItsStep {
	/** Correct representation form */
	correctForm: FourierPrimaryForm;
	/** Diagnostic feedback for incorrect form choices */
	misconceptions: Record<string, string>;
}

/** ITS Step 5: Integral formulation setup metadata */
export interface FourierItsStep5 extends BaseItsStep {
	/** Success alert message */
	successMsg: string;
	/** Ordered setup parts for the selected primary representation. */
	parts: FourierCoefficientPart[];
	/** Coefficients already known from symmetry and not re-queried. */
	carriedCoefficients: FourierCarriedCoefficient[];
}

/** ITS Step 6: Evaluated Fourier coefficient metadata */
export interface FourierItsStep6 extends BaseItsStep {
	/** Ordered evaluation parts matching Step 5. */
	parts: FourierCoefficientPart[];
	/** Coefficients already known from symmetry and not re-queried. */
	carriedCoefficients: FourierCarriedCoefficient[];
}

/** ITS Step 7: Final series summation evaluation metadata */
export interface FourierItsStep7 extends BaseItsStep {
	/** Representation synthesized by the required workflow. */
	form: FourierPrimaryForm;
	/** Shuffled multiple-choice options with distractors */
	options: FourierItsOption[];
}

/** Optional post-completion conversion part. */
export interface FourierConversionPart extends BaseItsStep {
	/** Stable part identifier. */
	id: "alternate" | "compact";
	/** User-facing part title. */
	title: string;
	/** Conversion prompt. */
	prompt: string;
	/** Exact conversion revealed in the worked solution after completion. */
	resultLatex: string;
	/** Four structurally parallel conversion choices. */
	options: FourierItsOption[];
}

/** Optional two-part conversion challenge metadata. */
export interface FourierConversionChallenge {
	/** Ordered alternate-representation and Compact-form parts. */
	parts: [FourierConversionPart, FourierConversionPart];
}

/** Builds four full-series choices that differ without changing visual shape. */
function buildPrimarySeriesOptions(
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

/** Complete ITS problem data container */
export interface FourierItsData {
	/** Step 1: Period and Frequency */
	step1: FourierItsStep1;
	/** Step 2: Symmetry */
	step2: FourierItsStep2;
	/** Step 3: Vanishing Coefficients */
	step3: FourierItsStep3;
	/** Step 4: Representation Form */
	step4: FourierItsStep4;
	/** Step 5: Integral Setup */
	step5: FourierItsStep5;
	/** Step 6: Harmonic Coefficient Evaluation */
	step6: FourierItsStep6;
	/** Step 7: Final Series Expression */
	step7: FourierItsStep7;
}

/** Fourier Series practice problem definition */
export interface FourierSeriesProblem {
	/** Unique identifier */
	id: string;
	/** Unsigned seed used to reproduce this problem. */
	seed: number;
	/** Waveform type */
	waveformType: FourierWaveformType;
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
	coeffs: FourierCoefficients;
	/** Intelligent Tutoring System step-by-step metadata */
	itsData: FourierItsData;
	/** Optional post-completion representation-conversion challenge. */
	conversionChallenge: FourierConversionChallenge;
	/** Worked conversions appended only after the optional challenge is solved. */
	conversionSolutionSteps: SolutionStep[];
}

/** Optional controls for deterministic Fourier problem generation. */
export interface FourierGenerationOptions {
	/** Explicit pseudo-random number generator seed. */
	seed?: number;
	/** Fixed amplitude override used by tests and authored examples. */
	A?: number;
	/** Fixed fundamental period override used by tests and authored examples. */
	T0?: number;
}

/**
 * Derives exact Trigonometric and Exponential Fourier series coefficients.
 * @param {FourierWaveformType} waveformType Waveform category
 * @param {object} [params] Optional parameters for amplitude A and period T0
 * @param {number} [params.A] Amplitude height (default 1)
 * @param {number} [params.T0] Fundamental period (default 2)
 * @returns {FourierCoefficients} Calculated coefficient structure
 */
export function computeFourierCoefficients(
	waveformType: FourierWaveformType,
	params?: { A?: number; T0?: number },
): FourierCoefficients {
	const A = params?.A ?? 1;
	const T0 = params?.T0 ?? 2;
	if (!Number.isFinite(A) || A <= 0) {
		throw new RangeError(
			"Fourier amplitude A must be a positive finite number.",
		);
	}
	if (!Number.isFinite(T0) || T0 <= 0) {
		throw new RangeError(
			"Fourier period T0 must be a positive finite number.",
		);
	}
	const w0 = (2 * Math.PI) / T0;

	/**
	 * Completes a real trigonometric coefficient definition with exponential
	 * coefficients and symmetry metadata.
	 *
	 * @param {object} definition Waveform-specific coefficient definition
	 * @param {number} definition.a0 Standard trigonometric DC coefficient
	 * @param {(n: number) => number} definition.an Cosine coefficient evaluator
	 * @param {(n: number) => number} definition.bn Sine coefficient evaluator
	 * @param {OriginParity} definition.originParity Parity about the origin
	 * @param {boolean} definition.hasHalfWaveSymmetry Half-wave symmetry flag
	 * @param {boolean} definition.hasJumpDiscontinuities Jump discontinuity flag
	 * @returns {FourierCoefficients} Complete Fourier coefficient model
	 */
	function completeCoefficients(definition: {
		a0: number;
		an: (n: number) => number;
		bn: (n: number) => number;
		originParity: OriginParity;
		hasHalfWaveSymmetry: boolean;
		hasJumpDiscontinuities: boolean;
	}): FourierCoefficients {
		/**
		 * Evaluates the exponential coefficient for an integer harmonic index.
		 * @param {number} n Integer harmonic index
		 * @returns {ComplexCoefficient} Exponential Fourier coefficient F_n
		 */
		const Fn = (n: number): ComplexCoefficient => {
			if (!Number.isInteger(n)) {
				throw new RangeError(
					"Fourier harmonic index n must be an integer.",
				);
			}
			if (n === 0) return { re: definition.a0 / 2, im: 0 };
			const harmonic = Math.abs(n);
			return {
				re: definition.an(harmonic) / 2,
				im: (-Math.sign(n) * definition.bn(harmonic)) / 2,
			};
		};

		return {
			waveformType,
			A,
			T0,
			w0,
			a0: definition.a0,
			originParity: definition.originParity,
			hasHalfWaveSymmetry: definition.hasHalfWaveSymmetry,
			hasJumpDiscontinuities: definition.hasJumpDiscontinuities,
			symmetry: definition.originParity,
			an: definition.an,
			bn: definition.bn,
			Fn,
		};
	}

	switch (waveformType) {
		case "square":
		case "square_odd": {
			// Odd square wave: b_n = 4A/(n pi) for odd n.
			const an = (): number => 0;
			const bn = (n: number): number => {
				if (n % 2 === 0) return 0;
				return (4 * A) / (n * Math.PI);
			};
			return completeCoefficients({
				a0: 0,
				an,
				bn,
				originParity: "odd",
				hasHalfWaveSymmetry: true,
				hasJumpDiscontinuities: true,
			});
		}
		case "square_even": {
			// Even square wave: a_n = 4A sin(n pi/2)/(n pi).
			const an = (n: number): number => {
				if (n % 2 === 0) return 0;
				const sign = (n - 1) % 4 === 0 ? 1 : -1;
				return ((4 * A) / (n * Math.PI)) * sign;
			};
			const bn = (): number => 0;
			return completeCoefficients({
				a0: 0,
				an,
				bn,
				originParity: "even",
				hasHalfWaveSymmetry: true,
				hasJumpDiscontinuities: true,
			});
		}
		case "triangle":
		case "triangle_even": {
			// Even bipolar triangle: a_n = 8A/(n^2 pi^2) for odd n.
			const an = (n: number): number => {
				if (n % 2 === 0) return 0;
				return (8 * A) / (n * n * Math.PI * Math.PI);
			};
			const bn = (): number => 0;
			return completeCoefficients({
				a0: 0,
				an,
				bn,
				originParity: "even",
				hasHalfWaveSymmetry: true,
				hasJumpDiscontinuities: false,
			});
		}
		case "triangle_odd": {
			// Quarter-period shift of the even triangle wave.
			const an = (): number => 0;
			const bn = (n: number): number => {
				if (n % 2 === 0) return 0;
				const sign = (n - 1) % 4 === 0 ? 1 : -1;
				return ((8 * A) / (n * n * Math.PI * Math.PI)) * sign;
			};
			return completeCoefficients({
				a0: 0,
				an,
				bn,
				originParity: "odd",
				hasHalfWaveSymmetry: true,
				hasJumpDiscontinuities: false,
			});
		}
		case "sawtooth": {
			// Rising odd sawtooth: b_n = 2A(-1)^(n+1)/(n pi).
			const an = (): number => 0;
			const bn = (n: number): number => {
				const sign = n % 2 === 1 ? 1 : -1;
				return ((2 * A) / (n * Math.PI)) * sign;
			};
			return completeCoefficients({
				a0: 0,
				an,
				bn,
				originParity: "odd",
				hasHalfWaveSymmetry: false,
				hasJumpDiscontinuities: true,
			});
		}
		case "half_wave_sine": {
			// Half-wave rectified sine over one period.
			const a0 = (2 * A) / Math.PI;
			const an = (n: number): number => {
				if (n % 2 !== 0) return 0;
				return (2 * A) / (Math.PI * (1 - n * n));
			};
			const bn = (n: number): number => {
				if (n === 1) return A / 2;
				return 0;
			};
			return completeCoefficients({
				a0,
				an,
				bn,
				originParity: "none",
				hasHalfWaveSymmetry: false,
				hasJumpDiscontinuities: false,
			});
		}
		case "full_wave_sine": {
			// x(t) = A |sin(pi t / T0)|, whose fundamental period is T0.
			const a0 = (4 * A) / Math.PI;
			const an = (n: number): number =>
				(-4 * A) / (Math.PI * (4 * n * n - 1));
			const bn = (): number => 0;
			return completeCoefficients({
				a0,
				an,
				bn,
				originParity: "even",
				hasHalfWaveSymmetry: false,
				hasJumpDiscontinuities: false,
			});
		}
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Checks whether an unknown value is a supported Fourier waveform identifier.
 * @param {unknown} value Candidate waveform identifier
 * @returns {value is FourierWaveformType} Whether the identifier is supported
 */
export function isFourierWaveformType(
	value: unknown,
): value is FourierWaveformType {
	return (
		typeof value === "string" &&
		FOURIER_WAVEFORM_TYPES.some((waveformType) => waveformType === value)
	);
}

/**
 * Wraps a time sample into the centered fundamental-period interval.
 * @param {number} t Time sample
 * @param {number} T0 Fundamental period
 * @returns {number} Equivalent sample in [-T0/2, T0/2)
 */
function wrapCenteredTime(t: number, T0: number): number {
	return ((((t + T0 / 2) % T0) + T0) % T0) - T0 / 2;
}

/**
 * Evaluates the ideal periodic waveform represented by a coefficient model.
 * Values at jump discontinuities use the right-hand waveform value; Fourier
 * partial sums converge to the midpoint there.
 *
 * @param {FourierCoefficients} coeffs Waveform coefficient model
 * @param {number} t Time sample
 * @returns {number} Ideal periodic waveform value x(t)
 */
export function evaluateFourierWaveform(
	coeffs: FourierCoefficients,
	t: number,
): number {
	if (!Number.isFinite(t)) {
		throw new RangeError("Fourier waveform time t must be finite.");
	}
	const { A, T0, waveformType } = coeffs;
	const centered = wrapCenteredTime(t, T0);

	switch (waveformType) {
		case "square":
		case "square_odd":
			return centered >= 0 ? A : -A;
		case "square_even":
			return Math.abs(centered) < T0 / 4 ? A : -A;
		case "triangle":
		case "triangle_even":
			return A * (1 - (4 * Math.abs(centered)) / T0);
		case "triangle_odd": {
			const shifted = wrapCenteredTime(centered - T0 / 4, T0);
			return A * (1 - (4 * Math.abs(shifted)) / T0);
		}
		case "sawtooth":
			return (2 * A * centered) / T0;
		case "half_wave_sine": {
			const positivePeriod = ((t % T0) + T0) % T0;
			return positivePeriod < T0 / 2
				? A * Math.sin(coeffs.w0 * positivePeriod)
				: 0;
		}
		case "full_wave_sine":
			return A * Math.abs(Math.sin((Math.PI * centered) / T0));
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Computes N-harmonic partial sum approximation S_N(t) = a0/2 + sum_{n=1}^N [a_n cos(n w0 t) + b_n sin(n w0 t)].
 * @param {FourierCoefficients} coeffs Calculated coefficients
 * @param {number} N Number of harmonics (1 to 50)
 * @param {number} t Time sample point
 * @returns {number} Partial sum S_N(t)
 */
export function computePartialSum(
	coeffs: FourierCoefficients,
	N: number,
	t: number,
): number {
	if (!Number.isInteger(N) || N < 0) {
		throw new RangeError(
			"Fourier harmonic count N must be a non-negative integer.",
		);
	}
	if (!Number.isFinite(t)) {
		throw new RangeError("Fourier partial-sum time t must be finite.");
	}
	let sum = coeffs.a0 / 2;
	for (let n = 1; n <= N; n++) {
		const anVal = coeffs.an(n);
		const bnVal = coeffs.bn(n);
		if (anVal !== 0) {
			sum += anVal * Math.cos(n * coeffs.w0 * t);
		}
		if (bnVal !== 0) {
			sum += bnVal * Math.sin(n * coeffs.w0 * t);
		}
	}
	return sum;
}

/**
 * Computes total signal power and power in first N harmonics via Parseval's Theorem.
 * @param {FourierCoefficients} coeffs Waveform coefficients
 * @param {number} N Harmonic limit
 * @returns {SignalPower} Total power, harmonic power, and power ratio
 */
export function computeSignalPower(
	coeffs: FourierCoefficients,
	N: number,
): SignalPower {
	if (!Number.isInteger(N) || N < 0) {
		throw new RangeError(
			"Fourier harmonic count N must be a non-negative integer.",
		);
	}
	let totalPower = 0;
	switch (coeffs.waveformType) {
		case "square":
		case "square_odd":
		case "square_even":
			totalPower = coeffs.A * coeffs.A;
			break;
		case "triangle":
		case "triangle_odd":
		case "triangle_even":
			totalPower = (coeffs.A * coeffs.A) / 3;
			break;
		case "sawtooth":
			totalPower = (coeffs.A * coeffs.A) / 3;
			break;
		case "half_wave_sine":
			totalPower = (coeffs.A * coeffs.A) / 4;
			break;
		case "full_wave_sine":
			totalPower = (coeffs.A * coeffs.A) / 2;
			break;
		default: {
			const _exhaustiveCheck: never = coeffs.waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}

	let harmonicPower = (coeffs.a0 * coeffs.a0) / 4;
	for (let n = 1; n <= N; n++) {
		const an = coeffs.an(n);
		const bn = coeffs.bn(n);
		// Parseval: P = a0^2/4 + 1/2 sum (an^2 + bn^2)
		harmonicPower += 0.5 * (an * an + bn * bn);
	}

	const powerRatio = totalPower > 0 ? harmonicPower / totalPower : 0;
	return {
		totalPower,
		harmonicPower,
		powerRatio: Math.min(1.0, powerRatio),
	};
}

/**
 * Finds the smallest harmonic limit that reaches 90%, 95%, and 99% power.
 * The cumulative power includes the DC contribution at N = 0.
 *
 * @param {FourierCoefficients} coeffs Waveform coefficients
 * @param {number} maxHarmonics Search guard for slowly converging spectra
 * @returns {HarmonicPowerThresholds} Minimum harmonic limits for each target
 */
export function computeHarmonicPowerThresholds(
	coeffs: FourierCoefficients,
	maxHarmonics = 100_000,
): HarmonicPowerThresholds {
	if (!Number.isInteger(maxHarmonics) || maxHarmonics < 1) {
		throw new RangeError(
			"Fourier threshold search limit must be a positive integer.",
		);
	}

	const totalPower = computeSignalPower(coeffs, 0).totalPower;
	let cumulativePower = (coeffs.a0 * coeffs.a0) / 4;
	let n90: number | undefined;
	let n95: number | undefined;
	let n99: number | undefined;

	for (let n = 0; n <= maxHarmonics; n += 1) {
		if (n > 0) {
			const an = coeffs.an(n);
			const bn = coeffs.bn(n);
			cumulativePower += 0.5 * (an * an + bn * bn);
		}
		const ratio = cumulativePower / totalPower;
		if (n90 === undefined && ratio >= 0.9) n90 = n;
		if (n95 === undefined && ratio >= 0.95) n95 = n;
		if (n99 === undefined && ratio >= 0.99) n99 = n;
		if (n90 !== undefined && n95 !== undefined && n99 !== undefined) {
			return { n90, n95, n99 };
		}
	}

	throw new RangeError(
		`Fourier power thresholds did not converge within ${maxHarmonics} harmonics.`,
	);
}

/**
 * Shuffles an array randomly to prevent positional distractor memorization.
 * @template T
 * @param {T[]} array Original array
 * @param {RandomSource} random Pseudo-random source
 * @returns {T[]} Shuffled new array
 */
function shuffleArray<T>(array: T[], random: RandomSource): T[] {
	return shuffleWithRandom(array, random);
}

/**
 * Determines the vanishing Fourier series coefficient identifier based on signal symmetry.
 * @param {SignalSymmetry} symmetry Signal symmetry classification
 * @returns {FourierItsStep3["correctVanishing"]} Vanishing coefficient choice for ITS Step 3
 */
function getVanishingCoefficients(
	symmetry: SignalSymmetry,
): FourierItsStep3["correctVanishing"] {
	switch (symmetry) {
		case "even":
			return "bn_zero";
		case "odd":
			return "an_zero";
		case "none":
			return "none";
		default: {
			const _exhaustiveCheck: never = symmetry;
			return "none";
		}
	}
}

/** Exact symbolic forms reused by the tutor, problem fields, and derivation. */
interface FourierSymbolicDerivation {
	a0Latex: string;
	anLatex: string;
	bnLatex: string;
	FnLatex: string;
	a0IntegralLatex: string;
	anIntegralLatex: string;
	bnIntegralLatex: string;
	integralLatex: string;
	expIntegralLatex: string;
	evaluationLatex: string;
	finalTrigLatex: string;
	finalExpLatex: string;
}

/** Builds the exact symbolic derivation for one supported waveform. */
function buildFourierSymbolicDerivation(
	coeffs: FourierCoefficients,
	w0Latex: string,
): FourierSymbolicDerivation {
	const { A, T0, waveformType } = coeffs;
	const amplitude = `(${A})`;
	const finalTrigLatex = buildFinalSeriesLatex(coeffs, w0Latex);
	let a0Latex: string;
	let anLatex: string;
	let bnLatex: string;
	let FnLatex: string;
	let a0IntegralLatex: string;
	let integralLatex: string;
	let expIntegralLatex: string;
	let evaluationLatex: string;

	switch (waveformType) {
		case "square":
		case "square_odd":
			a0Latex = "0";
			anLatex = "0";
			bnLatex = `\\begin{cases}\\dfrac{4${amplitude}}{n\\pi},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			FnLatex = `\\begin{cases}-j\\dfrac{2${amplitude}}{n\\pi},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\,dt`;
			integralLatex = `b_n=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\sin(n\\omega_0t)\\,dt`;
			expIntegralLatex = `F_n=\\frac{1}{T_0}\\left[\\int_{-T_0/2}^{0}-${A}e^{-jn\\omega_0t}\\,dt+\\int_0^{T_0/2}${A}e^{-jn\\omega_0t}\\,dt\\right]`;
			evaluationLatex = `b_n=\\frac{4${amplitude}}{T_0}\\left[-\\frac{\\cos(n\\omega_0t)}{n\\omega_0}\\right]_0^{T_0/2}=\\frac{2${amplitude}}{n\\pi}\\left(1-(-1)^n\\right)=${bnLatex}`;
			break;
		case "square_even":
			a0Latex = "0";
			anLatex = `\\frac{4${amplitude}}{n\\pi}\\sin\\left(\\frac{n\\pi}{2}\\right)`;
			bnLatex = "0";
			FnLatex = `\\begin{cases}0,&n=0\\\\\\dfrac{2${amplitude}}{n\\pi}\\sin\\left(\\dfrac{n\\pi}{2}\\right),&n\\ne0\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\left[\\int_0^{T_0/4}${A}\\,dt-\\int_{T_0/4}^{T_0/2}${A}\\,dt\\right]`;
			integralLatex = `a_n=\\frac{4}{T_0}\\left[\\int_0^{T_0/4}${A}\\cos(n\\omega_0t)\\,dt-\\int_{T_0/4}^{T_0/2}${A}\\cos(n\\omega_0t)\\,dt\\right]`;
			expIntegralLatex = `F_n=\\frac{2}{T_0}\\left[\\int_0^{T_0/4}${A}\\cos(n\\omega_0t)\\,dt-\\int_{T_0/4}^{T_0/2}${A}\\cos(n\\omega_0t)\\,dt\\right]`;
			evaluationLatex = `a_n=\\frac{4${amplitude}}{n\\pi}\\sin\\left(\\frac{n\\pi}{2}\\right),\\qquad b_n=0`;
			break;
		case "triangle":
		case "triangle_even":
			a0Latex = "0";
			anLatex = `\\begin{cases}\\dfrac{8${amplitude}}{n^2\\pi^2},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			bnLatex = "0";
			FnLatex = `\\begin{cases}\\dfrac{4${amplitude}}{n^2\\pi^2},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\left(1-\\frac{4t}{T_0}\\right)\\,dt`;
			integralLatex = `a_n=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\left(1-\\frac{4t}{T_0}\\right)\\cos(n\\omega_0t)\\,dt`;
			expIntegralLatex = `F_n=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\left(1-\\frac{4t}{T_0}\\right)\\cos(n\\omega_0t)\\,dt`;
			evaluationLatex = `a_n=\\frac{4${amplitude}}{n^2\\pi^2}\\left(1-(-1)^n\\right)=${anLatex},\\qquad b_n=0`;
			break;
		case "triangle_odd":
			a0Latex = "0";
			anLatex = "0";
			bnLatex = `\\frac{8${amplitude}}{n^2\\pi^2}\\sin\\left(\\frac{n\\pi}{2}\\right)`;
			FnLatex = `\\begin{cases}-j\\dfrac{4${amplitude}}{n^2\\pi^2}\\sin\\left(\\dfrac{n\\pi}{2}\\right),&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\left(1-\\frac{4t}{T_0}\\right)\\,dt`;
			integralLatex = `b_n=\\frac{4}{T_0}\\left[\\int_0^{T_0/4}\\frac{4${amplitude}t}{T_0}\\sin(n\\omega_0t)\\,dt+\\int_{T_0/4}^{T_0/2}\\left(2${amplitude}-\\frac{4${amplitude}t}{T_0}\\right)\\sin(n\\omega_0t)\\,dt\\right]`;
			expIntegralLatex = `F_n=-\\frac{2j}{T_0}\\left[\\int_0^{T_0/4}\\frac{4${amplitude}t}{T_0}\\sin(n\\omega_0t)\\,dt+\\int_{T_0/4}^{T_0/2}\\left(2${amplitude}-\\frac{4${amplitude}t}{T_0}\\right)\\sin(n\\omega_0t)\\,dt\\right]`;
			evaluationLatex = `b_n=\\frac{8${amplitude}}{n^2\\pi^2}\\sin\\left(\\frac{n\\pi}{2}\\right),\\qquad a_0=a_n=0`;
			break;
		case "sawtooth":
			a0Latex = "0";
			anLatex = "0";
			bnLatex = `\\frac{2${amplitude}(-1)^{n+1}}{n\\pi}`;
			FnLatex = `\\begin{cases}0,&n=0\\\\-j\\dfrac{${A}(-1)^{n+1}}{n\\pi},&n\\ne0\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\int_0^{T_0/2}\\frac{2${amplitude}t}{T_0}\\,dt`;
			integralLatex = `b_n=\\frac{4}{T_0}\\int_0^{T_0/2}\\frac{2${amplitude}t}{T_0}\\sin(n\\omega_0t)\\,dt`;
			expIntegralLatex = `F_n=-\\frac{2j}{T_0}\\int_0^{T_0/2}\\frac{2${amplitude}t}{T_0}\\sin(n\\omega_0t)\\,dt`;
			evaluationLatex = `b_n=\\frac{8${amplitude}}{T_0^2}\\left[-\\frac{t\\cos(n\\omega_0t)}{n\\omega_0}+\\frac{\\sin(n\\omega_0t)}{n^2\\omega_0^2}\\right]_0^{T_0/2}=\\frac{2${amplitude}(-1)^{n+1}}{n\\pi}`;
			break;
		case "half_wave_sine":
			a0Latex = `\\frac{2${amplitude}}{\\pi}`;
			anLatex = `\\begin{cases}\\dfrac{2${amplitude}}{\\pi(1-n^2)},&n\\text{ even}\\\\0,&n\\text{ odd}\\end{cases}`;
			bnLatex = `\\begin{cases}\\dfrac{${A}}{2},&n=1\\\\0,&n\\ne1\\end{cases}`;
			FnLatex = `\\begin{cases}\\dfrac{${A}}{\\pi},&n=0\\\\-j\\dfrac{${A}}{4},&n=1\\\\j\\dfrac{${A}}{4},&n=-1\\\\\\dfrac{${A}}{\\pi(1-n^2)},&n\\ne0\\text{ even}\\\\0,&|n|>1\\text{ odd}\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)\\,dt`;
			integralLatex = `F_n=\\frac{1}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)e^{-jn\\omega_0t}\\,dt`;
			expIntegralLatex = integralLatex;
			evaluationLatex = `a_0=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)\\,dt=\\frac{2${amplitude}}{\\pi},\\quad b_1=\\frac{${A}}{2},\\quad a_n=${anLatex}`;
			break;
		case "full_wave_sine":
			a0Latex = `\\frac{4${amplitude}}{\\pi}`;
			anLatex = `-\\frac{4${amplitude}}{\\pi(4n^2-1)}`;
			bnLatex = "0";
			FnLatex = `\\begin{cases}\\dfrac{2${amplitude}}{\\pi},&n=0\\\\-\\dfrac{2${amplitude}}{\\pi(4n^2-1)},&n\\ne0\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\sin\\left(\\frac{\\pi t}{T_0}\\right)\\,dt`;
			integralLatex = `a_n=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\sin\\left(\\frac{\\pi t}{T_0}\\right)\\cos(n\\omega_0t)\\,dt`;
			expIntegralLatex = `F_n=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin\\left(\\frac{\\pi t}{T_0}\\right)\\cos(n\\omega_0t)\\,dt`;
			evaluationLatex = `a_0=\\frac{4${amplitude}}{\\pi},\\qquad a_n=-\\frac{4${amplitude}}{\\pi(4n^2-1)},\\qquad b_n=0`;
			break;
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}

	const finalExpLatex = `x(t)=\\sum_{n=-\\infty}^{\\infty}F_ne^{j n ${w0Latex} t},\\qquad F_n=${FnLatex}`;
	const anIntegralLatex =
		waveformType === "half_wave_sine"
			? `a_n=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)\\cos(n\\omega_0t)\\,dt`
			: integralLatex;
	const bnIntegralLatex =
		waveformType === "half_wave_sine"
			? `b_n=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)\\sin(n\\omega_0t)\\,dt`
			: integralLatex;
	return {
		a0Latex,
		anLatex,
		bnLatex,
		FnLatex,
		a0IntegralLatex,
		anIntegralLatex,
		bnIntegralLatex,
		integralLatex,
		expIntegralLatex,
		evaluationLatex,
		finalTrigLatex,
		finalExpLatex,
	};
}

/** Builds one correct integral choice and three misconception-driven distractors. */
function buildIntegralOptions(correct: string): FourierItsOption[] {
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

/** Returns the coefficient families that the selected primary form must derive. */
function getPrimaryCoefficientTargets(
	form: FourierPrimaryForm,
	originParity: OriginParity,
): FourierCoefficientTarget[] {
	if (form === "exp") return ["Fn"];
	if (originParity === "even") return ["a0", "an"];
	if (originParity === "odd") return ["bn"];
	return ["a0", "an", "bn"];
}

/** Returns coefficients that symmetry has already proved to be zero. */
function buildCarriedCoefficients(
	form: FourierPrimaryForm,
	originParity: OriginParity,
): FourierCarriedCoefficient[] {
	if (form === "exp" || originParity === "none") return [];
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
		{
			id: "bn",
			latex: "b_n=0",
			reason: "Even symmetry eliminates every sine coefficient.",
		},
	];
}

/** Builds four parallel evaluation choices for exactly one coefficient family. */
function buildEvaluationOptions(
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

/** Builds the ordered single-coefficient setup and evaluation metadata. */
function buildCoefficientParts(
	form: FourierPrimaryForm,
	originParity: OriginParity,
	derivation: FourierSymbolicDerivation,
	random: RandomSource,
): { setup: FourierCoefficientPart[]; evaluation: FourierCoefficientPart[] } {
	const targets = getPrimaryCoefficientTargets(form, originParity);
	const resultByTarget: Record<FourierCoefficientTarget, string> = {
		a0: derivation.a0Latex,
		an: derivation.anLatex,
		bn: derivation.bnLatex,
		Fn: derivation.FnLatex,
	};
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

	return {
		setup: targets.map((target) => ({
			id: `setup-${target}`,
			target,
			title: `Set Up ${titleByTarget[target]}`,
			prompt: `Select the integral that computes $${target === "a0" ? "a_0" : target === "Fn" ? "F_n" : `${target[0]}_n`}$.`,
			resultLatex: integralByTarget[target],
			options: shuffleArray(
				buildIntegralOptions(integralByTarget[target]),
				random,
			),
			hints: [
				"Keep the selected representation's normalization and kernel unchanged.",
				"Substitute the waveform value on every non-zero interval.",
				`The required setup is $${integralByTarget[target]}$.`,
			],
		})),
		evaluation: targets.map((target) => ({
			id: `evaluate-${target}`,
			target,
			title: `Evaluate ${titleByTarget[target]}`,
			prompt: `Apply the bounds and simplify $${target === "a0" ? "a_0" : target === "Fn" ? "F_n" : `${target[0]}_n`}$.`,
			resultLatex: `${target === "a0" ? "a_0" : target === "Fn" ? "F_n" : `${target[0]}_n`}=${resultByTarget[target]}`,
			options: shuffleArray(
				buildEvaluationOptions(target, resultByTarget[target]),
				random,
			),
			hints: [
				"Apply the antiderivative at every piecewise boundary.",
				"Simplify parity and harmonic-index factors after combining all terms.",
				`The evaluated coefficient is $${target === "a0" ? "a_0" : target === "Fn" ? "F_n" : `${target[0]}_n`}=${resultByTarget[target]}$.`,
			],
		})),
	};
}

/**
 * Builds Intelligent Tutoring System (ITS) step-by-step metadata for Fourier Series problems.
 * @param {FourierCoefficients} coeffs Calculated waveform coefficients
 * @param {RandomSource} [random] Pseudo-random source for option ordering
 * @returns {FourierItsData} Complete ITS step data
 */
export function generateFourierItsData(
	coeffs: FourierCoefficients,
	random: RandomSource = Math.random,
	primaryForm?: FourierPrimaryForm,
): FourierItsData {
	const { T0, w0, symmetry } = coeffs;
	const w0Latex = T0 === 2 ? "\\pi" : "\\frac{\\pi}{2}";

	// Step 1: Period and Frequency
	const tAliases = [String(T0), `${T0}.0`];
	const w0Aliases =
		T0 === 2
			? ["pi", "\\pi", "1pi", "3.14", "3.1415", "3.1416"]
			: ["pi/2", "\\pi/2", "0.5pi", "0.5\\pi", "1/2pi", "1.57", "1.5708"];

	const step1: FourierItsStep1 = {
		expectedT: T0,
		expectedTUnit: "s",
		expectedW0: w0,
		expectedW0Unit: "rad/s",
		tAliases,
		w0Aliases,
		hints: [
			"Look at the bounds of the definition. Over what duration does the signal repeat itself entirely?",
			`The signal repeats every period $T_0 = ${T0}\\text{ s}$. The fundamental frequency is $\\omega_0 = \\frac{2\\pi}{T_0}$.`,
			`Substitute $T_0 = ${T0}$: $\\omega_0 = \\frac{2\\pi}{${T0}} = ${w0Latex}\\text{ rad/s}$. Ensure units are $\\text{s}$ and $\\text{rad/s}$.`,
		],
	};

	// Step 2: Symmetry
	const step2: FourierItsStep2 = {
		correctSymmetry: symmetry,
		correctOriginParity: coeffs.originParity,
		correctHalfWaveSymmetry: coeffs.hasHalfWaveSymmetry,
		hints: [
			"Test if the waveform mirrors across the vertical y-axis (even) or reflects through the origin (odd).",
			"Check algebraically if $x(-t) = x(t)$ (even) or $x(-t) = -x(t)$ (odd).",
			symmetry === "even"
				? "The signal satisfies $x(-t) = x(t)$, perfectly mirroring across the vertical axis: Even symmetry."
				: symmetry === "odd"
					? "The signal satisfies $x(-t) = -x(t)$, reflecting through the origin: Odd symmetry."
					: "The signal is shifted or asymmetric around $t=0$, so it has Neither centered symmetry.",
		],
		misconceptions: {
			even: "Even signals mirror across the vertical axis ($x(-t) = x(t)$).",
			odd: "Odd signals reflect across the origin ($x(-t) = -x(t)$).",
			none: "Check symmetry around $t=0$. Notice if the left and right halves mirror or invert.",
			half_wave:
				"Half-wave odd symmetry requires $x(t - T_0/2) = -x(t)$.",
		},
	};

	// Step 3: Vanishing Coefficients
	const correctVanishing = getVanishingCoefficients(symmetry);

	const step3: FourierItsStep3 = {
		correctVanishing,
		hints: [
			"Which trigonometric function (sine or cosine) shares the same symmetry as your signal?",
			symmetry === "even"
				? "Cosine is an even function. An even signal consists solely of cosine terms."
				: symmetry === "odd"
					? "Sine is an odd function. An odd signal consists solely of sine terms."
					: "Without centered symmetry, both sine and cosine harmonics exist.",
			symmetry === "even"
				? "Since only cosine terms are needed, all sine coefficients vanish: $b_n = 0$."
				: symmetry === "odd"
					? "Since only sine terms are needed, all cosine coefficients and DC offset vanish: $a_0 = 0, a_n = 0$."
					: "No symmetry shortcuts apply: you must compute both $a_n$ and $b_n$ (or use $F_n$).",
		],
		misconceptions: {
			an_zero:
				symmetry === "even"
					? "Cosine is an even function! An even signal *will* have cosine terms ($a_n$). It is the sine terms ($b_n$) that vanish."
					: "Odd signals have $a_n = 0$.",
			bn_zero:
				symmetry === "odd"
					? "Sine is an odd function! An odd signal *will* have sine terms ($b_n$). It is the cosine terms ($a_n$) that vanish."
					: "Even signals have $b_n = 0$.",
			none:
				symmetry !== "none"
					? "Take advantage of symmetry! Even and odd symmetries always set half the Fourier coefficients to zero."
					: "Without symmetry, all harmonic components must be computed.",
		},
	};

	// Step 4: Representation Form
	const correctForm = primaryForm ?? (symmetry !== "none" ? "trig" : "exp");
	const step4: FourierItsStep4 = {
		correctForm,
		hints: [
			symmetry !== "none"
				? "You already know that half the coefficients are zero. Which form separates sine and cosine terms?"
				: "Without symmetry, which representation evaluates both real and imaginary parts in a single integral?",
			"Trigonometric form separates $a_n$ and $b_n$. Exponential form $F_n$ combines them using $e^{-j n \\omega_0 t}$.",
			symmetry !== "none"
				? "Since one set of coefficients is zero, the Trigonometric form is the most efficient (requiring only one real-valued integral)."
				: "Evaluating $F_n$ via the Exponential form evaluates both components in one complex integral.",
		],
		misconceptions: {
			trig:
				symmetry === "none"
					? "Using Trigonometric form without symmetry requires solving two separate integrals ($a_n$ and $b_n$). Exponential form $F_n$ is faster."
					: "Trigonometric form is preferred here.",
			exp:
				symmetry !== "none"
					? "While Exponential form is valid, Trigonometric form is faster because we can directly set the vanishing coefficients to 0."
					: "Exponential form is preferred here.",
			compact:
				"Compact polar form ($C_n, \\theta_n$) is derived from Trigonometric or Exponential coefficients, not integrated directly.",
		},
	};

	const derivation = buildFourierSymbolicDerivation(coeffs, w0Latex);
	const coefficientParts = buildCoefficientParts(
		correctForm,
		coeffs.originParity,
		derivation,
		random,
	);
	const carriedCoefficients = buildCarriedCoefficients(
		correctForm,
		coeffs.originParity,
	);

	// Step 5: Piecewise Integral Setup
	const step5: FourierItsStep5 = {
		successMsg:
			"Correct integral formulation. The scale, kernel, and non-zero piecewise intervals all match the waveform.",
		parts: coefficientParts.setup,
		carriedCoefficients,
		hints: [
			"Use symmetry to choose the non-zero coefficient family before writing an integral.",
			"Trigonometric coefficients use $2/T_0$; exponential coefficients use $1/T_0$ and $e^{-jn\\omega_0t}$.",
			"Split the integral exactly where the waveform definition changes and omit intervals where the signal is zero.",
		],
	};

	// Step 6: Harmonic Coefficient Evaluation
	const step6: FourierItsStep6 = {
		parts: coefficientParts.evaluation,
		carriedCoefficients,
		hints: [
			"Apply the antiderivative to every non-zero interval before simplifying the harmonic index.",
			"Use $\\cos(n\\pi)=(-1)^n$ and $\\sin(n\\pi/2)$ to expose vanished or alternating harmonics.",
			`The evaluated result is $${derivation.evaluationLatex}$. Then use $F_n=(a_n-jb_n)/2$.`,
		],
	};

	// Step 7: Final series in the selected primary representation
	const synthesisLatex =
		correctForm === "trig"
			? derivation.finalTrigLatex
			: derivation.finalExpLatex;
	const step7: FourierItsStep7 = {
		form: correctForm,
		options: shuffleArray(
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

/**
 * Builds the exact trigonometric Fourier series for a supported waveform.
 * @param {FourierCoefficients} coeffs Waveform coefficients and parameters
 * @param {string} w0Latex Fundamental radian frequency LaTeX
 * @returns {string} Exact final Fourier series LaTeX
 */
function buildFinalSeriesLatex(
	coeffs: FourierCoefficients,
	w0Latex: string,
): string {
	const { A, waveformType } = coeffs;
	switch (waveformType) {
		case "square":
		case "square_odd":
			return `x(t) = \\sum_{n=1,3,5,\\dots}^{\\infty} \\frac{4(${A})}{n\\pi} \\sin\\left(n ${w0Latex} t\\right)`;
		case "square_even":
			return `x(t) = \\sum_{n=1,3,5,\\dots}^{\\infty} \\frac{4(${A})}{n\\pi} \\sin\\left(\\frac{n\\pi}{2}\\right) \\cos\\left(n ${w0Latex} t\\right)`;
		case "triangle":
		case "triangle_even":
			return `x(t) = \\sum_{n=1,3,5,\\dots}^{\\infty} \\frac{8(${A})}{n^2\\pi^2} \\cos\\left(n ${w0Latex} t\\right)`;
		case "triangle_odd":
			return `x(t) = \\sum_{n=1,3,5,\\dots}^{\\infty} \\frac{8(${A})}{n^2\\pi^2} \\sin\\left(\\frac{n\\pi}{2}\\right) \\sin\\left(n ${w0Latex} t\\right)`;
		case "sawtooth":
			return `x(t) = \\sum_{n=1}^{\\infty} \\frac{2(${A})(-1)^{n+1}}{n\\pi} \\sin\\left(n ${w0Latex} t\\right)`;
		case "half_wave_sine":
			return `x(t) = \\frac{${A}}{\\pi} + \\frac{${A}}{2}\\sin\\left(${w0Latex} t\\right) + \\sum_{k=1}^{\\infty} \\frac{2(${A})}{\\pi(1-4k^2)} \\cos\\left(2k ${w0Latex} t\\right)`;
		case "full_wave_sine":
			return `x(t) = \\frac{2(${A})}{\\pi} - \\sum_{n=1}^{\\infty} \\frac{4(${A})}{\\pi(4n^2-1)} \\cos\\left(n ${w0Latex} t\\right)`;
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/** Builds the amplitude-phase series with c_n >= 0 and explicit phase. */
function buildCompactSeriesLatex(
	coeffs: FourierCoefficients,
	w0Latex: string,
): string {
	const { A, waveformType } = coeffs;
	const harmonic = (body: string): string =>
		`x(t)=\\frac{c_0}{2}+\\sum_{n=1}^{\\infty}c_n\\cos(n ${w0Latex} t+\\theta_n),\\qquad ${body}`;
	switch (waveformType) {
		case "square":
		case "square_odd":
			return harmonic(
				`c_0=0,\\quad c_n=\\begin{cases}\\dfrac{4(${A})}{n\\pi},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases},\\quad \\theta_n=-\\dfrac{\\pi}{2}\\ (n\\text{ odd})`,
			);
		case "square_even":
			return harmonic(
				`c_0=0,\\quad c_n=\\begin{cases}\\dfrac{4(${A})}{n\\pi},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases},\\quad \\theta_n=\\begin{cases}0,&n\\equiv1\\pmod4\\\\\\pi,&n\\equiv3\\pmod4\\end{cases}`,
			);
		case "triangle":
		case "triangle_even":
			return harmonic(
				`c_0=0,\\quad c_n=\\begin{cases}\\dfrac{8(${A})}{n^2\\pi^2},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases},\\quad \\theta_n=0\\ (n\\text{ odd})`,
			);
		case "triangle_odd":
			return harmonic(
				`c_0=0,\\quad c_n=\\begin{cases}\\dfrac{8(${A})}{n^2\\pi^2},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases},\\quad \\theta_n=\\begin{cases}-\\dfrac{\\pi}{2},&n\\equiv1\\pmod4\\\\\\dfrac{\\pi}{2},&n\\equiv3\\pmod4\\end{cases}`,
			);
		case "sawtooth":
			return harmonic(
				`c_0=0,\\quad c_n=\\dfrac{2(${A})}{n\\pi},\\quad \\theta_n=\\dfrac{(-1)^n\\pi}{2}`,
			);
		case "half_wave_sine":
			return harmonic(
				`c_0=\\dfrac{2(${A})}{\\pi},\\quad c_1=\\dfrac{${A}}{2},\\ \theta_1=-\\dfrac{\\pi}{2},\\quad c_{2k}=\\dfrac{2(${A})}{\\pi(4k^2-1)},\\ \theta_{2k}=\\pi,\\quad c_n=0\\ (n>1\\text{ odd})`,
			);
		case "full_wave_sine":
			return harmonic(
				`c_0=\\dfrac{4(${A})}{\\pi},\\quad c_n=\\dfrac{4(${A})}{\\pi(4n^2-1)},\\quad \\theta_n=\\pi`,
			);
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Builds a waveform definition consistent with its coefficient convention.
 * @param {FourierWaveformType} waveformType Waveform variant
 * @param {number} A Peak amplitude
 * @param {number} T0 Fundamental period
 * @returns {string} One-period waveform LaTeX
 */
function buildSignalLatex(
	waveformType: FourierWaveformType,
	A: number,
	T0: number,
): string {
	switch (waveformType) {
		case "square":
		case "square_odd":
			return `x(t)=\\begin{cases}-${A}&-${T0 / 2}<t<0\\\\${A}&0<t<${T0 / 2}\\end{cases}`;
		case "square_even":
			return `x(t)=\\begin{cases}${A}&|t|<${T0 / 4}\\\\-${A}&${T0 / 4}<|t|<${T0 / 2}\\end{cases}`;
		case "triangle":
		case "triangle_even":
			return `x(t)=${A}\\left(1-\\frac{4|t|}{${T0}}\\right),\\quad |t|<${T0 / 2}`;
		case "triangle_odd":
			return `x(t)=\\begin{cases}-2(${A})-\\frac{4(${A})}{${T0}}t&-${T0 / 2}<t<-${T0 / 4}\\\\\\frac{4(${A})}{${T0}}t&-${T0 / 4}<t<${T0 / 4}\\\\2(${A})-\\frac{4(${A})}{${T0}}t&${T0 / 4}<t<${T0 / 2}\\end{cases}`;
		case "sawtooth":
			return `x(t)=\\frac{2(${A})}{${T0}}t,\\quad -${T0 / 2}<t<${T0 / 2}`;
		case "half_wave_sine":
			return `x(t)=\\begin{cases}${A}\\sin(\\omega_0t)&0<t<${T0 / 2}\\\\0&${T0 / 2}<t<${T0}\\end{cases}`;
		case "full_wave_sine":
			return `x(t)=${A}\\left|\\sin\\left(\\frac{\\pi t}{${T0}}\\right)\\right|`;
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Generates a practice Fourier Series problem with randomized parameters and ITS step metadata.
 *
 * Mathematical derivation process:
 * 1. Randomly samples peak amplitude A and fundamental period T0 (with w0 = 2 pi / T0).
 * 2. Computes trigonometric coefficients via symmetry rules:
 *    - Even symmetry (x(-t) = x(t)): b_n = 0, a_n = (4/T0) \int_0^{T0/2} x(t) \cos(n w0 t) dt.
 *    - Odd symmetry (x(-t) = -x(t)): a_0 = 0, a_n = 0, b_n = (4/T0) \int_0^{T0/2} x(t) \sin(n w0 t) dt.
 *    - Half-wave / Full-wave rectified sines: DC term a_0 = A / pi, even harmonics a_n = 2A / (pi (1 - n^2)).
 * 3. Converts to exponential Fourier series coefficients F_n = (a_n - j b_n) / 2.
 * 4. Synthesizes 7-step ITS metadata for interactive step-by-step guidance.
 *
 * @param {FourierWaveformType} waveformType Selected waveform category
 * @param {FourierGenerationOptions} [options] Deterministic generation controls
 * @returns {FourierSeriesProblem} FourierSeriesProblem instance containing LaTeX representations and steps
 */
export function generateFourierSeriesProblem(
	waveformType: FourierWaveformType = "square",
	options: FourierGenerationOptions = {},
): FourierSeriesProblem {
	const seed = Number.isFinite(options.seed)
		? Math.trunc(options.seed ?? 0) >>> 0
		: createRandomSeed();
	const random = createSeededPrng(seed);
	const aValues = [1, 2, 3, 5, 10];
	const t0Values = [2, 4];
	const A = options.A ?? randomChoice(random, aValues);
	const T0 = options.T0 ?? randomChoice(random, t0Values);

	const coeffs = computeFourierCoefficients(waveformType, { A, T0 });
	const id = `fs_${waveformType}_${seed}`;
	const itsData = generateFourierItsData(coeffs, random);
	const w0Latex = coeffs.w0 === Math.PI ? "\\pi" : "\\frac{\\pi}{2}";
	const derivation = buildFourierSymbolicDerivation(coeffs, w0Latex);
	const alternateForm: FourierPrimaryForm =
		itsData.step4.correctForm === "trig" ? "exp" : "trig";
	const alternateLatex =
		alternateForm === "trig"
			? derivation.finalTrigLatex
			: derivation.finalExpLatex;
	const compactLatex = buildCompactSeriesLatex(coeffs, w0Latex);
	const conversionChallenge: FourierConversionChallenge = {
		parts: [
			{
				id: "alternate",
				title: `Convert to ${alternateForm === "trig" ? "Trigonometric" : "Exponential"} Form`,
				prompt: `Convert the completed ${itsData.step4.correctForm === "trig" ? "trigonometric" : "exponential"} series to its equivalent ${alternateForm === "trig" ? "trigonometric" : "exponential"} representation.`,
				resultLatex: alternateLatex,
				options: shuffleArray(
					buildPrimarySeriesOptions(alternateLatex, alternateForm),
					random,
				),
				hints: [
					"Use $F_0=a_0/2$ and $F_n=(a_n-jb_n)/2$ for positive indices.",
					"For a real signal, pair $F_n$ with $F_{-n}=F_n^*$ when returning to trigonometric form.",
					`The equivalent ${alternateForm === "trig" ? "trigonometric" : "exponential"} representation is $${alternateLatex}$.`,
				],
			},
			{
				id: "compact",
				title: "Convert to Compact Harmonic Form",
				prompt: "Convert the harmonic coefficients to nonnegative amplitudes $c_n$ and phases $\\theta_n$.",
				resultLatex: compactLatex,
				options: shuffleArray(
					buildPrimarySeriesOptions(compactLatex, "trig"),
					random,
				),
				hints: [
					"Use $c_0=a_0=2F_0$ for the constant coefficient.",
					"For $n>0$, use $c_n=2|F_n|=\\sqrt{a_n^2+b_n^2}$.",
					"Assign phase only to nonzero harmonics with $\\theta_n=\\operatorname{atan2}(-b_n,a_n)=\\angle F_n$.",
				],
			},
		],
	};

	const steps: SolutionStep[] = [
		{
			title: "Period and Fundamental Frequency",
			description:
				"Read one complete repetition from the waveform and convert its period to angular frequency.",
			latex: `T_0=${T0}\\text{ s},\\qquad \\omega_0=\\frac{2\\pi}{T_0}=\\frac{2\\pi}{${T0}}=${w0Latex}\\text{ rad/s}`,
		},
		{
			title: "Symmetry and Vanishing Terms",
			description:
				"Test origin parity and half-wave symmetry independently, then remove coefficient families that must vanish.",
			latex: `\\begin{gathered}\\text{origin parity: }${coeffs.originParity},\\qquad \\text{half-wave symmetry: }${coeffs.hasHalfWaveSymmetry ? "\\text{yes}" : "\\text{no}"}\\\\${coeffs.originParity === "odd" ? "a_0=a_n=0" : coeffs.originParity === "even" ? "b_n=0" : "a_n\\text{ and }b_n\\text{ must both be evaluated}"}\\end{gathered}`,
		},
		{
			title: "Representation Selection",
			description:
				coeffs.originParity === "none"
					? "Without centered parity, the exponential form evaluates both real and imaginary parts in one integral."
					: "Centered parity leaves one real coefficient family, so the trigonometric form is most efficient.",
			latex:
				coeffs.originParity === "none"
					? "F_n=\\frac{1}{T_0}\\int_{T_0}x(t)e^{-jn\\omega_0t}\\,dt"
					: "x(t)=\\frac{a_0}{2}+\\sum_{n=1}^{\\infty}[a_n\\cos(n\\omega_0t)+b_n\\sin(n\\omega_0t)]",
		},
		{
			title: "Piecewise Integral Setup",
			description:
				"Substitute the waveform on each non-zero interval, retaining the normalization and Fourier kernel.",
			latex: derivation.integralLatex,
		},
		{
			title: "Definite Integral Evaluation",
			description:
				"Apply the bounds and simplify parity factors such as $(-1)^n$ and $\\sin(n\\pi/2)$.",
			latex: derivation.evaluationLatex,
		},
		{
			title: "DC Offset Derivation",
			description:
				"Evaluate the average separately; the constant appearing in the trigonometric series is $a_0/2$.",
			latex: `a_0=\\frac{2}{T_0}\\int_{T_0}x(t)\\,dt=${derivation.a0Latex},\\qquad F_0=\\frac{a_0}{2}`,
		},
		{
			title:
				itsData.step4.correctForm === "trig"
					? "Trigonometric Synthesis"
					: "Exponential Synthesis",
			description:
				"Insert only the evaluated non-zero coefficients into the selected primary Fourier representation.",
			latex:
				itsData.step4.correctForm === "trig"
					? derivation.finalTrigLatex
					: derivation.finalExpLatex,
		},
	];

	const signalLatex = buildSignalLatex(waveformType, A, T0);

	return {
		id,
		seed,
		waveformType,
		title: "Practice Problem: Periodic Waveform",
		periodLatex: `T_0 = ${T0}\\text{ s}`,
		omega0Latex: `\\omega_0 = \\frac{2\\pi}{${T0}} = ${w0Latex}\\text{ rad/s}`,
		signalLatex,
		a0Latex: derivation.a0Latex,
		anLatex: derivation.anLatex,
		bnLatex: derivation.bnLatex,
		FnLatex: derivation.FnLatex,
		solutionSteps: steps,
		coeffs,
		itsData,
		conversionChallenge,
		conversionSolutionSteps: [
			{
				title: `${alternateForm === "trig" ? "Trigonometric" : "Exponential"} Form Conversion`,
				description:
					"Convert the primary coefficients without re-integrating the waveform.",
				latex: alternateLatex,
			},
			{
				title: "Compact Harmonic Form Conversion",
				description:
					"Use nonnegative harmonic amplitudes and define phase only where the amplitude is nonzero.",
				latex: compactLatex,
			},
		],
	};
}
