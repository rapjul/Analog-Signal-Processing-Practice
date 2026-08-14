/**
 * Fourier Series & Harmonic Spectrum Math Engine.
 * Calculates Trigonometric (a0, an, bn) and Exponential (cn) Fourier coefficients,
 * N-harmonic partial sums S_N(t), Parseval signal power, and problem generator.
 */

import type { SolutionStep } from "./types";

/** Supported classic periodic waveform categories */
export type FourierWaveformType =
	| "square"
	| "square_odd"
	| "square_even"
	| "triangle"
	| "triangle_odd"
	| "triangle_even"
	| "sawtooth"
	| "half_wave_sine"
	| "full_wave_sine";

/** Waveform symmetry classification */
export type SignalSymmetry = "even" | "odd" | "half_wave" | "none";

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
	/** DC offset coefficient a0 */
	a0: number;
	/** Signal symmetry property */
	symmetry: SignalSymmetry;
	/** Cosine coefficient evaluator function a_n */
	an: (n: number) => number;
	/** Sine coefficient evaluator function b_n */
	bn: (n: number) => number;
	/** Exponential coefficient evaluator function c_n = (a_n - j b_n) / 2 */
	cn: (n: number) => { re: number; im: number };
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
	const w0 = (2 * Math.PI) / T0;

	switch (waveformType) {
		case "square":
		case "square_odd": {
			// Odd square wave: +A in [0, T0/2), -A in [T0/2, T0) => a0 = 0, an = 0, bn = 4A / (n pi) for odd n
			const an = (): number => 0;
			const bn = (n: number): number => {
				if (n % 2 === 0) return 0;
				return (4 * A) / (n * Math.PI);
			};
			const cn = (n: number): { re: number; im: number } => ({
				re: 0,
				im: -bn(n) / 2,
			});

			return {
				waveformType,
				A,
				T0,
				w0,
				a0: 0,
				symmetry: "odd",
				an,
				bn,
				cn,
			};
		}
		case "square_even": {
			// Even square wave: +A in [-T0/4, T0/4], -A elsewhere => a0 = 0, bn = 0, an = 4A / (n pi) * sin(n pi / 2)
			const an = (n: number): number => {
				if (n % 2 === 0) return 0;
				const sign = (n - 1) % 4 === 0 ? 1 : -1;
				return ((4 * A) / (n * Math.PI)) * sign;
			};
			const bn = (): number => 0;
			const cn = (n: number): { re: number; im: number } => ({
				re: an(n) / 2,
				im: 0,
			});

			return {
				waveformType,
				A,
				T0,
				w0,
				a0: 0,
				symmetry: "even",
				an,
				bn,
				cn,
			};
		}
		case "triangle":
		case "triangle_even": {
			// Symmetric triangle wave: Even function => a0 = 0, bn = 0, an = 8A / (n^2 pi^2) for odd n
			const an = (n: number): number => {
				if (n % 2 === 0) return 0;
				return (8 * A) / (n * n * Math.PI * Math.PI);
			};
			const bn = (): number => 0;
			const cn = (n: number): { re: number; im: number } => ({
				re: an(n) / 2,
				im: 0,
			});

			return {
				waveformType,
				A,
				T0,
				w0,
				a0: 0,
				symmetry: "even",
				an,
				bn,
				cn,
			};
		}
		case "triangle_odd": {
			// Shifted triangle wave with Odd symmetry
			const an = (): number => 0;
			const bn = (n: number): number => {
				if (n % 2 === 0) return 0;
				const sign = (n - 1) % 4 === 0 ? 1 : -1;
				return ((8 * A) / (n * n * Math.PI * Math.PI)) * sign;
			};
			const cn = (n: number): { re: number; im: number } => ({
				re: 0,
				im: -bn(n) / 2,
			});

			return {
				waveformType,
				A,
				T0,
				w0,
				a0: 0,
				symmetry: "odd",
				an,
				bn,
				cn,
			};
		}
		case "sawtooth": {
			// Sawtooth wave: Odd function => a0 = 0, an = 0, bn = (2A / (n pi)) * (-1)^(n+1)
			const an = (): number => 0;
			const bn = (n: number): number => {
				const sign = n % 2 === 1 ? 1 : -1;
				return ((2 * A) / (n * Math.PI)) * sign;
			};
			const cn = (n: number): { re: number; im: number } => ({
				re: 0,
				im: -bn(n) / 2,
			});

			return {
				waveformType: "sawtooth",
				A,
				T0,
				w0,
				a0: 0,
				symmetry: "odd",
				an,
				bn,
				cn,
			};
		}
		case "half_wave_sine": {
			// Half-wave rectified sine: A sin(w0 t) for t in [0, T0/2], 0 in [T0/2, T0)
			const a0 = A / Math.PI;
			const an = (n: number): number => {
				if (n % 2 !== 0) return 0;
				return (2 * A) / (Math.PI * (1 - n * n));
			};
			const bn = (n: number): number => {
				if (n === 1) return A / 2;
				return 0;
			};
			const cn = (n: number): { re: number; im: number } => ({
				re: an(n) / 2,
				im: -bn(n) / 2,
			});

			return {
				waveformType: "half_wave_sine",
				A,
				T0,
				w0,
				a0,
				symmetry: "none",
				an,
				bn,
				cn,
			};
		}
		case "full_wave_sine": {
			// Full-wave rectified sine: A |sin(w0 t)| => Even symmetry
			const a0 = (2 * A) / Math.PI;
			const an = (n: number): number => {
				if (n % 2 !== 0) return 0;
				return (4 * A) / (Math.PI * (1 - n * n));
			};
			const bn = (): number => 0;
			const cn = (n: number): { re: number; im: number } => ({
				re: an(n) / 2,
				im: 0,
			});

			return {
				waveformType: "full_wave_sine",
				A,
				T0,
				w0,
				a0,
				symmetry: "even",
				an,
				bn,
				cn,
			};
		}
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(`Unsupported waveform type: ${String(_exhaustiveCheck)}`);
		}
	}
}

/**
 * Computes N-harmonic partial sum approximation S_N(t) = a0 + sum_{n=1}^N [a_n cos(n w0 t) + b_n sin(n w0 t)].
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
	let sum = coeffs.a0;
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
	let totalPower = 0;
	switch (coeffs.waveformType) {
		case "square":
			totalPower = coeffs.A * coeffs.A;
			break;
		case "triangle":
			totalPower = (coeffs.A * coeffs.A) / 3;
			break;
		case "sawtooth":
			totalPower = (coeffs.A * coeffs.A) / 3;
			break;
		case "half_wave_sine":
			totalPower = (coeffs.A * coeffs.A) / 4;
			break;
		default:
			totalPower = 1;
	}

	let harmonicPower = coeffs.a0 * coeffs.a0;
	for (let n = 1; n <= N; n++) {
		const an = coeffs.an(n);
		const bn = coeffs.bn(n);
		// Parseval: P = a0^2 + 1/2 sum (an^2 + bn^2)
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
 * Generates a practice Fourier Series problem with randomized parameters.
 *
 * Mathematical derivation process:
 * 1. Randomly samples peak amplitude A and fundamental period T0 (with w0 = 2 pi / T0).
 * 2. Computes trigonometric coefficients via symmetry rules:
 *    - Even symmetry (x(-t) = x(t)): b_n = 0, a_n = (4/T0) \int_0^{T0/2} x(t) \cos(n w0 t) dt.
 *    - Odd symmetry (x(-t) = -x(t)): a_0 = 0, a_n = 0, b_n = (4/T0) \int_0^{T0/2} x(t) \sin(n w0 t) dt.
 *    - Half-wave / Full-wave rectified sines: DC term a_0 = A / pi, even harmonics a_n = 2A / (pi (1 - n^2)).
 * 3. Converts to exponential Fourier series coefficients c_n = (a_n - j b_n) / 2.
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

	const titleMap: Record<FourierWaveformType, string> = {
		square: "Square Wave Fourier Series",
		square_odd: "Odd Square Wave Fourier Series",
		square_even: "Even Square Wave Fourier Series",
		triangle: "Triangle Wave Fourier Series",
		triangle_odd: "Odd Triangle Wave Fourier Series",
		triangle_even: "Even Triangle Wave Fourier Series",
		sawtooth: "Sawtooth Wave Fourier Series",
		half_wave_sine: "Half-Wave Rectified Sine Fourier Series",
		full_wave_sine: "Full-Wave Rectified Sine Fourier Series",
	};

	const steps: SolutionStep[] = [
		{
			title: "Step 1: Symmetry Classification",
			description: `Determine signal symmetry (${coeffs.symmetry}).`,
			latex: `\\text{Symmetry: } ${coeffs.symmetry} \\implies a_0 = ${coeffs.a0}`,
		},
		{
			title: "Step 2: Calculate Trigonometric Coefficients",
			description: "Calculate trigonometric harmonic coefficients over one period.",
			latex: `a_n = ${coeffs.symmetry === "odd" ? "0" : `\\frac{4(${A})}{\\pi n}`}, \\quad b_n = ${coeffs.symmetry === "even" ? "0" : `\\frac{4(${A})}{\\pi n}`}`,
		},
		{
			title: "Step 3: Convert to Exponential Series (cn)",
			description: "Exponential series coefficient relationship c_n = (a_n - j b_n)/2.",
			latex: `c_n = \\frac{${A}}{\\pi n}`,
		},
	];

	return {
		id,
		waveformType,
		title: titleMap[waveformType] ?? `${waveformType} Fourier Series`,
		periodLatex: `T_0 = ${T0}`,
		omega0Latex: `\\omega_0 = \\frac{2\\pi}{${T0}}`,
		signalLatex: `x(t) \\text{ with amplitude } A = ${A}, T_0 = ${T0}`,
		a0Latex: `${coeffs.a0}`,
		anLatex: coeffs.symmetry === "odd" ? "0" : `\\frac{4(${A})}{\\pi n}`,
		bnLatex: coeffs.symmetry === "even" ? "0" : `\\frac{4(${A})}{\\pi n}`,
		cnLatex: `\\frac{${A}}{\\pi n}`,
		solutionSteps: steps,
		coeffs,
	};
}

