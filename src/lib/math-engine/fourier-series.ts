/**
 * Fourier Series & Harmonic Spectrum Math Engine.
 * Calculates Trigonometric (a0, an, bn) and Exponential (Fn) Fourier coefficients,
 * N-harmonic partial sums S_N(t), Parseval signal power, and problem generator.
 */

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
	/** @deprecated Compatibility alias for Fn during the notation migration. */
	cn: (n: number) => ComplexCoefficient;
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

/** Evaluation option for ITS multiple-choice steps (alias to shared ItsOption) */
export type FourierItsOption = ItsOption;

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
	/** Correct signal symmetry */
	correctSymmetry: SignalSymmetry;
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
	correctForm: "trig" | "exp" | "compact";
	/** Diagnostic feedback for incorrect form choices */
	misconceptions: Record<string, string>;
}

/** ITS Step 5: Integral formulation setup metadata */
export interface FourierItsStep5 extends BaseItsStep {
	/** Success alert message */
	successMsg: string;
	/** Shuffled multiple-choice options with distractors */
	options: FourierItsOption[];
}

/** ITS Step 6: Final series summation evaluation metadata */
export interface FourierItsStep6 extends BaseItsStep {
	/** Shuffled multiple-choice options with distractors */
	options: FourierItsOption[];
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
	/** Step 6: Final Series Expression */
	step6: FourierItsStep6;
}

/** Fourier Series practice problem definition */
export interface FourierSeriesProblem {
	/** Unique identifier */
	id: string;
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
	/** Closed-form cn LaTeX */
	cnLatex: string;
	/** Step-by-step solution derivation */
	solutionSteps: SolutionStep[];
	/** Mathematical coefficient evaluator instance */
	coeffs: FourierCoefficients;
	/** Intelligent Tutoring System step-by-step metadata */
	itsData: FourierItsData;
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
		throw new RangeError("Fourier amplitude A must be a positive finite number.");
	}
	if (!Number.isFinite(T0) || T0 <= 0) {
		throw new RangeError("Fourier period T0 must be a positive finite number.");
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
				throw new RangeError("Fourier harmonic index n must be an integer.");
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
			cn: Fn,
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
		throw new RangeError("Fourier harmonic count N must be a non-negative integer.");
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
		throw new RangeError("Fourier harmonic count N must be a non-negative integer.");
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
 * Shuffles an array randomly to prevent positional distractor memorization.
 * @template T
 * @param {T[]} array Original array
 * @returns {T[]} Shuffled new array
 */
function shuffleArray<T>(array: T[]): T[] {
	const copy = [...array];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
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

/**
 * Builds Intelligent Tutoring System (ITS) step-by-step metadata for Fourier Series problems.
 * @param {FourierCoefficients} coeffs Calculated waveform coefficients
 * @returns {FourierItsData} Complete ITS step data
 */
export function generateFourierItsData(
	coeffs: FourierCoefficients,
): FourierItsData {
	const { A, T0, w0, symmetry } = coeffs;
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
					: "No symmetry shortcuts apply: you must compute both $a_n$ and $b_n$ (or use $c_n$).",
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
	const correctForm = symmetry !== "none" ? "trig" : "exp";
	const step4: FourierItsStep4 = {
		correctForm,
		hints: [
			symmetry !== "none"
				? "You already know that half the coefficients are zero. Which form separates sine and cosine terms?"
				: "Without symmetry, which representation evaluates both real and imaginary parts in a single integral?",
			"Trigonometric form separates $a_n$ and $b_n$. Exponential form $c_n$ combines them using $e^{-j n \\omega_0 t}$.",
			symmetry !== "none"
				? "Since one set of coefficients is zero, the Trigonometric form is the most efficient (requiring only one real-valued integral)."
				: "Evaluating $c_n$ via the Exponential form evaluates both components in one complex integral.",
		],
		misconceptions: {
			trig:
				symmetry === "none"
					? "Using Trigonometric form without symmetry requires solving two separate integrals ($a_n$ and $b_n$). Exponential form $c_n$ is faster."
					: "Trigonometric form is preferred here.",
			exp:
				symmetry !== "none"
					? "While Exponential form is valid, Trigonometric form is faster because we can directly set the vanishing coefficients to 0."
					: "Exponential form is preferred here.",
			compact:
				"Compact polar form ($C_n, \\theta_n$) is derived from Trigonometric or Exponential coefficients, not integrated directly.",
		},
	};

	// Step 5: Integral Setup
	const step5OptionsRaw: FourierItsOption[] =
		symmetry === "odd"
			? [
					{
						id: "c1",
						latex: `b_n = \\frac{2}{${T0}} \\int_{0}^{${T0}} x(t) \\sin\\left(n ${w0Latex} t\\right) dt`,
						isCorrect: true,
					},
					{
						id: "d1",
						latex: `b_n = \\frac{1}{${T0}} \\int_{0}^{${T0}} x(t) \\sin\\left(n ${w0Latex} t\\right) dt`,
						isCorrect: false,
						feedback:
							"Misconception: You used $1/T_0$. Trigonometric coefficients require a scaling factor of $2/T_0$.",
					},
					{
						id: "d2",
						latex: `a_n = \\frac{2}{${T0}} \\int_{0}^{${T0}} x(t) \\cos\\left(n ${w0Latex} t\\right) dt`,
						isCorrect: false,
						feedback:
							"Misconception: You are setting up the integral for $a_n$ (cosine), but we already determined $a_n=0$ due to odd symmetry!",
					},
					{
						id: "d3",
						latex: `c_n = \\frac{1}{${T0}} \\int_{0}^{${T0}} x(t) e^{j n ${w0Latex} t} dt`,
						isCorrect: false,
						feedback:
							"Sign Error: Exponential Fourier coefficients require $e^{-j n \\omega_0 t}$ with a negative exponent.",
					},
				]
			: symmetry === "even"
				? [
						{
							id: "c1",
							latex: `a_n = \\frac{2}{${T0}} \\int_{-${T0 / 2}}^{${T0 / 2}} x(t) \\cos\\left(n ${w0Latex} t\\right) dt`,
							isCorrect: true,
						},
						{
							id: "d1",
							latex: `a_n = \\frac{1}{${T0}} \\int_{-${T0 / 2}}^{${T0 / 2}} x(t) \\cos\\left(n ${w0Latex} t\\right) dt`,
							isCorrect: false,
							feedback:
								"Misconception: You used $1/T_0$. Trigonometric Fourier coefficients require $2/T_0$.",
						},
						{
							id: "d2",
							latex: `b_n = \\frac{2}{${T0}} \\int_{-${T0 / 2}}^{${T0 / 2}} x(t) \\sin\\left(n ${w0Latex} t\\right) dt`,
							isCorrect: false,
							feedback:
								"Misconception: You are setting up the integral for $b_n$ (sine), but $b_n=0$ for even symmetry!",
						},
						{
							id: "d3",
							latex: `a_n = \\frac{2}{${T0}} \\int_{-${T0 / 2}}^{${T0 / 2}} x(t) \\cos(2 n \\pi t) dt`,
							isCorrect: false,
							feedback:
								"Frequency Error: Fundamental frequency must be $\\omega_0 = \\frac{2\\pi}{T_0}$, not $2\\pi$.",
						},
					]
				: [
						{
							id: "c1",
							latex: `c_n = \\frac{1}{${T0}} \\int_{0}^{${T0}} x(t) e^{-j n ${w0Latex} t} dt`,
							isCorrect: true,
						},
						{
							id: "d1",
							latex: `c_n = \\frac{2}{${T0}} \\int_{0}^{${T0}} x(t) e^{-j n ${w0Latex} t} dt`,
							isCorrect: false,
							feedback:
								"Misconception: You used $2/T_0$. Exponential coefficients require a factor of $1/T_0$.",
						},
						{
							id: "d2",
							latex: `c_n = \\frac{1}{${T0}} \\int_{0}^{${T0}} x(t) e^{j n ${w0Latex} t} dt`,
							isCorrect: false,
							feedback:
								"Sign Error: The exponential transform kernel requires $e^{-j n \\omega_0 t}$ with a negative sign.",
						},
						{
							id: "d3",
							latex: `a_n = \\frac{2}{${T0}} \\int_{0}^{${T0}} x(t) \\cos\\left(n ${w0Latex} t\\right) dt`,
							isCorrect: false,
							feedback:
								"Without symmetry, using Trigonometric form requires evaluating both $a_n$ and $b_n$. Exponential form $c_n$ is preferred.",
						},
					];

	const step5: FourierItsStep5 = {
		successMsg:
			"Correct Integral Formulation! Notice the scaling constant and kernel match the symmetry.",
		options: shuffleArray(step5OptionsRaw),
		hints: [
			"Identify the standard definition for your chosen coefficient type ($a_n, b_n$, or $c_n$).",
			`Use $\\frac{2}{T_0} \\int_{T_0} x(t) \\dots dt$ for trigonometric form or $\\frac{1}{T_0} \\int_{T_0} x(t) e^{-j n \\omega_0 t} dt$ for exponential form.`,
			`Substitute $T_0 = ${T0}$ and $\\omega_0 = ${w0Latex}$ with proper integration bounds.`,
		],
	};

	// Step 6: Final Series Expression
	const step6OptionsRaw: FourierItsOption[] =
		symmetry === "odd"
			? [
					{
						id: "c1",
						latex: `x(t) = \\sum_{n=1,3,5\\dots}^{\\infty} \\frac{4(${A})}{n \\pi} \\sin\\left(n ${w0Latex} t\\right)`,
						isCorrect: true,
					},
					{
						id: "d1",
						latex: `x(t) = \\sum_{n=1,3,5\\dots}^{\\infty} \\frac{4(${A})}{n \\pi} \\cos\\left(n ${w0Latex} t\\right)`,
						isCorrect: false,
						feedback:
							"Trigonometric Mismatch: Odd signals must evaluate to sine harmonics, not cosines.",
					},
					{
						id: "d2",
						latex: `x(t) = \\frac{${A}}{2} + \\sum_{n=1,3,5\\dots}^{\\infty} \\frac{4(${A})}{n \\pi} \\sin\\left(n ${w0Latex} t\\right)`,
						isCorrect: false,
						feedback:
							"DC Offset Error: Odd signals have zero average area, so $a_0 = 0$.",
					},
					{
						id: "d3",
						latex: `x(t) = \\sum_{n=1,3,5\\dots}^{\\infty} \\frac{2(${A})}{n \\pi} \\sin\\left(n ${w0Latex} t\\right)`,
						isCorrect: false,
						feedback:
							"Scale Factor Error: Missed a factor of 2 in coefficient integration evaluation.",
					},
				]
			: symmetry === "even"
				? [
						{
							id: "c1",
							latex: `x(t) = \\sum_{n=1,3,5\\dots}^{\\infty} \\frac{4(${A})}{n \\pi} \\sin\\left(n \\frac{\\pi}{2}\\right) \\cos\\left(n ${w0Latex} t\\right)`,
							isCorrect: true,
						},
						{
							id: "d1",
							latex: `x(t) = \\sum_{n=1,3,5\\dots}^{\\infty} \\frac{4(${A})}{n \\pi} \\cos\\left(n ${w0Latex} t\\right)`,
							isCorrect: false,
							feedback:
								"Harmonic Sign Error: Missing the alternating $\\sin(n\\pi/2)$ factor that alternates signs for odd $n$.",
						},
						{
							id: "d2",
							latex: `x(t) = \\sum_{n=1,3,5\\dots}^{\\infty} \\frac{4(${A})}{n \\pi} \\sin\\left(n \\frac{\\pi}{2}\\right) \\sin\\left(n ${w0Latex} t\\right)`,
							isCorrect: false,
							feedback:
								"Trigonometric Mismatch: Even signals must be composed of cosine terms, not sines.",
						},
						{
							id: "d3",
							latex: `x(t) = ${A} + \\sum_{n=1,3,5\\dots}^{\\infty} \\frac{2(${A})}{n \\pi} \\cos\\left(n ${w0Latex} t\\right)`,
							isCorrect: false,
							feedback:
								"Multiple Errors: Check DC offset $a_0$ and the integration scaling factor.",
						},
					]
				: [
						{
							id: "c1",
							latex: `x(t) = \\frac{${A}}{\\pi} + \\sum_{n=1}^{\\infty} \\frac{2(${A})}{\\pi(1 - n^2)} \\cos\\left(n ${w0Latex} t\\right)`,
							isCorrect: true,
						},
						{
							id: "d1",
							latex: `x(t) = \\sum_{n=1}^{\\infty} \\frac{2(${A})}{\\pi(1 - n^2)} \\cos\\left(n ${w0Latex} t\\right)`,
							isCorrect: false,
							feedback:
								"DC Offset Error: Rectified sines have a non-zero average DC value $a_0 = A/\\pi$.",
						},
						{
							id: "d2",
							latex: `x(t) = \\frac{${A}}{\\pi} + \\sum_{n=1}^{\\infty} \\frac{2(${A})}{\\pi(1 + n^2)} \\cos\\left(n ${w0Latex} t\\right)`,
							isCorrect: false,
							feedback:
								"Denominator Sign Error: Check the $(1 - n^2)$ term from integration by parts.",
						},
						{
							id: "d3",
							latex: `x(t) = \\frac{${A}}{\\pi} + \\sum_{n=1}^{\\infty} \\frac{2(${A})}{\\pi(1 - n^2)} \\sin\\left(n ${w0Latex} t\\right)`,
							isCorrect: false,
							feedback:
								"Harmonic Mismatch: Even harmonics of rectified waveforms appear with cosine basis functions.",
						},
					];

	const step6: FourierItsStep6 = {
		options: shuffleArray(step6OptionsRaw),
		hints: [
			"Evaluate the definite integral over the non-zero intervals.",
			`For odd $n$, substitute the bounds into $\\frac{2}{${T0}} \\int \\dots$. Remember $\\cos(n\\pi) = (-1)^n$.`,
			"Combine the DC offset $a_0$ with the evaluated summation coefficients.",
		],
	};

	return {
		step1,
		step2,
		step3,
		step4,
		step5,
		step6,
	};
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
 * 3. Converts to exponential Fourier series coefficients c_n = (a_n - j b_n) / 2.
 * 4. Synthesizes 6-step ITS metadata for interactive step-by-step guidance.
 *
 * @param {FourierWaveformType} waveformType Selected waveform category
 * @returns {FourierSeriesProblem} FourierSeriesProblem instance containing LaTeX representations and steps
 */
export function generateFourierSeriesProblem(
	waveformType: FourierWaveformType = "square",
): FourierSeriesProblem {
	const aValues = [1, 2, 3, 5, 10];
	const t0Values = [2, 4];
	const A = aValues[Math.floor(Math.random() * aValues.length)];
	const T0 = t0Values[Math.floor(Math.random() * t0Values.length)];

	const coeffs = computeFourierCoefficients(waveformType, { A, T0 });
	const id = `fs_${waveformType}_${Date.now()}`;
	const itsData = generateFourierItsData(coeffs);

	const steps: SolutionStep[] = [
		{
			title: "Step 1: Period & Fundamental Frequency",
			description: `Determine the fundamental period and frequency.`,
			latex: `T_0 = ${T0}\\text{ s}, \\quad \\omega_0 = \\frac{2\\pi}{T_0} = ${coeffs.w0 === Math.PI ? "\\pi" : "\\frac{\\pi}{2}"}\\text{ rad/s}`,
		},
		{
			title: "Step 2: Symmetry Classification",
			description: `Determine signal symmetry (${coeffs.symmetry}).`,
			latex: `\\text{Symmetry: } ${coeffs.symmetry} \\implies a_0 = ${coeffs.a0}`,
		},
		{
			title: "Step 3: Vanishing Coefficients",
			description: `Identify vanishing harmonics based on symmetry shortcuts.`,
			latex:
				coeffs.symmetry === "odd"
					? "a_0 = 0, \\; a_n = 0 \\quad (\\text{sine harmonics only})"
					: coeffs.symmetry === "even"
						? "b_n = 0 \\quad (\\text{cosine harmonics only})"
						: "\\text{All coefficients must be computed.}",
		},
		{
			title: "Step 4: Calculate Coefficients",
			description:
				"Calculate non-zero harmonic coefficients over one period.",
			latex: `a_n = ${coeffs.symmetry === "odd" ? "0" : `\\frac{4(${A})}{\\pi n}`}, \\quad b_n = ${coeffs.symmetry === "even" ? "0" : `\\frac{4(${A})}{\\pi n}`}`,
		},
		{
			title: "Step 5: Convert to Exponential Series (cn)",
			description:
				"Exponential series coefficient relationship c_n = (a_n - j b_n)/2.",
			latex: `c_n = \\frac{${A}}{\\pi n}`,
		},
	];

	// Piecewise signal LaTeX representation for problem display
	let signalLatex = `x(t) = \\begin{cases} ${A} & 0 < t < ${T0 / 2} \\\\ -${A} & ${T0 / 2} < t < ${T0} \\end{cases}`;
	if (waveformType === "triangle" || waveformType === "triangle_even") {
		signalLatex = `x(t) = ${A}\\left(1 - \\frac{2|t|}{${T0 / 2}}\\right) \\quad \\text{for } -${T0 / 2} < t < ${T0 / 2}`;
	} else if (waveformType === "sawtooth") {
		signalLatex = `x(t) = \\frac{2(${A})}{${T0}} t \\quad \\text{for } -${T0 / 2} < t < ${T0 / 2}`;
	} else if (waveformType === "half_wave_sine") {
		signalLatex = `x(t) = \\begin{cases} ${A} \\sin(\\omega_0 t) & 0 < t < ${T0 / 2} \\\\ 0 & ${T0 / 2} < t < ${T0} \\end{cases}`;
	}

	return {
		id,
		waveformType,
		title: "Practice Problem: Periodic Waveform",
		periodLatex: `T_0 = ${T0}\\text{ s}`,
		omega0Latex: `\\omega_0 = \\frac{2\\pi}{${T0}} = ${coeffs.w0 === Math.PI ? "\\pi" : "\\frac{\\pi}{2}"}\\text{ rad/s}`,
		signalLatex,
		a0Latex: `${coeffs.a0}`,
		anLatex: coeffs.symmetry === "odd" ? "0" : `\\frac{4(${A})}{\\pi n}`,
		bnLatex: coeffs.symmetry === "even" ? "0" : `\\frac{4(${A})}{\\pi n}`,
		cnLatex: `\\frac{${A}}{\\pi n}`,
		solutionSteps: steps,
		coeffs,
		itsData,
	};
}
