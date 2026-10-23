/**
 * CTFT (Continuous-Time Fourier Transform) Math Engine.
 * Implements forward & inverse transform pairs, spectral magnitude/phase/energy
 * calculations, operational properties, and CTFT problem generation for UIUC ECE 210.
 */

import { CanonicalError } from "$lib/math-engine/canonical-algebra";
import { createCtftCanonicalTarget } from "$lib/math-engine/canonical-targets";
import { Complex } from "$lib/math-engine/complex";
import {
	type TransformValidationResult,
	validateTransformAnswer,
} from "$lib/math-engine/transform-validation";

/** Reproducible parameters for the currently generated forward transform drills. */
export interface CtftParameters {
	/** Exponential/Gaussian decay parameter. */
	a: number;
	/** Rectangular pulse width. */
	T: number;
	/** Cosine carrier frequency. */
	w0: number;
	/** Time translation, zero for an unshifted signal. */
	t0: number;
}

/** Generated forward drill with a parameter-based grading reference. */
export interface GeneratedCtftProblem extends CtftProblem {
	/** Base signal family. */
	signalType: CtftSignalType;
	/** Complete reproducible signal parameters. */
	params: CtftParameters;
}

/** Available CTFT transform signal types */
export type CtftSignalType =
	| "rect" // Rectangular pulse rect(t/T)
	| "exponential" // One-sided exponential decay e^(-at) u(t)
	| "gaussian" // Gaussian pulse e^(-at^2)
	| "delta" // Dirac delta function delta(t)
	| "cos"; // Cosine sinusoidal modulation

/** Interface representing a CTFT transform pair LaTeX output */
export interface CtftPair {
	/** Time-domain LaTeX representation x(t) */
	timeLatex: string;
	/** Frequency-domain LaTeX representation X(w) */
	freqLatex: string;
}

/** Interface representing spectral evaluation at a given frequency w */
export interface CtftSpectrumPoint {
	/** Frequency omega in rad/s */
	omega: number;
	/** Magnitude |X(w)| */
	magnitude: number;
	/** Phase angle Arg(X(w)) in radians */
	phase: number;
}

/** Interface for a step-by-step solution breakdown */
export interface CtftSolutionStep {
	/** Step title / concept */
	title: string;
	/** Detailed LaTeX or prose explanation */
	latex: string;
}

/** Interface representing a generated CTFT practice problem */
export interface CtftProblem {
	/** Unique problem identifier */
	id: string;
	/** Prompt equation x(t) or X(w) */
	promptLatex: string;
	/** Reference correct answer LaTeX */
	referenceAnswerLatex: string;
	/** Step-by-step diagnostic solution breakdown */
	solutionSteps: CtftSolutionStep[];
}

/**
 * Returns the exact LaTeX transform pair for a given signal type and parameters.
 * Enforces rule: \operatorname{rect} and \operatorname{sinc} instead of \text{...}.
 *
 * @param {CtftSignalType} type Signal type ('rect' | 'exponential' | 'gaussian' | 'delta' | 'cos')
 * @param {{ T?: number; a?: number; w0?: number }} params Signal parameters object (e.g. T, a, w0)
 * @returns {CtftPair} CtftPair containing timeLatex and freqLatex
 */
export function getCtftPairLatex(
	type: CtftSignalType,
	params: { T?: number; a?: number; w0?: number } = {},
): CtftPair {
	switch (type) {
		case "rect": {
			const T = params.T ?? 1;
			return {
				timeLatex: `\\operatorname{rect}\\left(\\frac{t}{${T}}\\right)`,
				freqLatex: `${T} \\operatorname{sinc}\\left(\\frac{${T} \\omega}{2 \\pi}\\right)`,
			};
		}
		case "exponential": {
			const a = params.a ?? 1;
			return {
				timeLatex: `e^{-${a} t} u(t)`,
				freqLatex: `\\frac{1}{${a} + j\\omega}`,
			};
		}
		case "gaussian": {
			const a = params.a ?? 1;
			return {
				timeLatex: `e^{-${a} t^2}`,
				freqLatex: String.raw`\sqrt{\frac{\pi}{${a}}} e^{-\frac{\omega^2}{${4 * a}}}`,
			};
		}
		case "delta": {
			return {
				timeLatex: "\\delta(t)",
				freqLatex: "1",
			};
		}
		case "cos": {
			const w0 = params.w0 ?? 1;
			return {
				timeLatex: `\\cos(${w0} t)`,
				freqLatex: `\\pi \\delta(\\omega - ${w0}) + \\pi \\delta(\\omega + ${w0})`,
			};
		}
		default: {
			const _exhaustiveCheck: never = type;
			throw new Error(
				`Unsupported CTFT signal type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Evaluates the CTFT spectrum point (|X(w)| and phase Arg(X(w))) at a specific frequency w.
 *
 * @param {CtftSignalType} type Signal type
 * @param {{ T?: number; a?: number; w0?: number }} params Parameter values (T, a, w0)
 * @param {number} omega Frequency omega in rad/s
 * @returns {CtftSpectrumPoint} CtftSpectrumPoint object with magnitude and phase
 * @throws {Error} Cosine spectra contain distributions rather than pointwise values.
 */
export function evaluateCtftSpectrum(
	type: CtftSignalType,
	params: { T?: number; a?: number; w0?: number },
	omega: number,
): CtftSpectrumPoint {
	switch (type) {
		case "exponential": {
			const a = params.a ?? 1;
			// X(w) = 1 / (a + j*omega)
			// |X(w)| = 1 / sqrt(a^2 + omega^2)
			// Arg(X(w)) = -atan2(omega, a)
			const magnitude = 1 / Math.sqrt(a * a + omega * omega);
			const phase = -Math.atan2(omega, a);
			return { omega, magnitude, phase };
		}
		case "rect": {
			const T = params.T ?? 1;
			// X(w) = T * sinc(T * w / (2 * pi)) = T * sin(T * w / 2) / (T * w / 2)
			const arg = (T * omega) / 2;
			const val = arg === 0 ? T : T * (Math.sin(arg) / arg);
			return {
				omega,
				magnitude: Math.abs(val),
				phase: val >= 0 ? 0 : Math.PI,
			};
		}
		case "gaussian": {
			const a = params.a ?? 1;
			const val =
				Math.sqrt(Math.PI / a) * Math.exp(-(omega * omega) / (4 * a));
			return { omega, magnitude: val, phase: 0 };
		}
		case "delta": {
			return { omega, magnitude: 1, phase: 0 };
		}
		case "cos": {
			throw new Error(
				"A cosine spectrum is a distribution; use weighted impulses, not pointwise heights.",
			);
		}
		default: {
			const _exhaustiveCheck: never = type;
			throw new Error(
				`Unsupported spectrum signal type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Calculates the energy density spectrum value |X(w)|^2 at a frequency w.
 *
 * @param {CtftSignalType} type Signal type
 * @param {{ T?: number; a?: number; w0?: number }} params Signal parameter values
 * @param {number} omega Frequency omega in rad/s
 * @returns {number} Numerical value of |X(w)|^2
 * @throws {Error} Distribution spectra cannot be squared as finite peak heights.
 */
export function evaluateEnergySpectrum(
	type: CtftSignalType,
	params: { T?: number; a?: number; w0?: number },
	omega: number,
): number {
	const point = evaluateCtftSpectrum(type, params, omega);
	return point.magnitude * point.magnitude;
}

/**
 * Generates a practice CTFT problem with dynamic parameter synthesis and operational properties.
 *
 * Mathematical derivation process:
 * 1. Randomly samples parameters a (exponential decay rate), T (pulse width), w0 (carrier frequency), and t0 (time shift).
 * 2. Evaluates fundamental CTFT pairs:
 *    - Exponential decay e^(-a t) u(t) <-> 1 / (a + j w)
 *    - Rectangular pulse rect(t / T) <-> T * sinc(T w / (2 pi))
 *    - Gaussian pulse e^(-a t^2) <-> sqrt(pi / a) e^(-w^2 / (4 a))
 * 3. With 40% probability, synthesizes a time-shift operational property x(t - t0) <-> X(w) e^(-j w t0),
 *    illustrating phase modulation in the frequency domain.
 *
 * @param {CtftSignalType} type Target signal type key
 * @returns {CtftProblem} CtftProblem object containing LaTeX prompt, reference answer, and steps
 */
export function generateCtftProblem(
	type: CtftSignalType = "exponential",
): GeneratedCtftProblem {
	const aValues = [1, 2, 3, 4, 5];
	const tValues = [1, 2, 4, 6];
	const w0Values = [2, 3, 4, 5, 10];
	const shiftValues = [1, 2, 3];

	const a = aValues[Math.floor(Math.random() * aValues.length)] ?? 1;
	const T = tValues[Math.floor(Math.random() * tValues.length)] ?? 1;
	const w0 = w0Values[Math.floor(Math.random() * w0Values.length)] ?? 2;
	const t0 = shiftValues[Math.floor(Math.random() * shiftValues.length)] ?? 1;

	return createCtftProblem(type, {
		a,
		T,
		w0,
		t0: Math.random() < 0.4 && type !== "delta" ? t0 : 0,
	});
}

/**
 * Builds a deterministic forward transform drill.
 * @param type - Base signal family.
 * @param params - Signal parameters and translation.
 * @returns Problem whose display and grading share the same parameters.
 */
export function createCtftProblem(
	type: CtftSignalType,
	params: CtftParameters,
): GeneratedCtftProblem {
	const { a, T, w0, t0 } = params;
	if (![a, T, w0, t0].every(Number.isFinite) || a <= 0 || T <= 0 || w0 <= 0)
		throw new Error("Invalid CTFT parameters");
	const pair = getCtftPairLatex(type, { a, T, w0 });
	const id = `ctft-${type}-${Date.now()}`;

	// The random wrapper selects shifts; this builder reproduces the supplied translation.
	const hasShift = t0 !== 0;

	if (hasShift) {
		const translatedTime = t0 < 0 ? `t + ${-t0}` : `t - ${t0}`;
		const shiftedTimeLatex =
			type === "rect"
				? String.raw`\operatorname{rect}\left(\frac{${translatedTime}}{${T}}\right)`
				: type === "exponential"
					? `e^{-${a}(${translatedTime})} u(${translatedTime})`
					: type === "gaussian"
						? String.raw`e^{-${a}(${translatedTime})^2}`
						: type === "cos"
							? String.raw`\cos(${w0}(${translatedTime}))`
							: String.raw`\delta(${translatedTime})`;

		const shiftedFreqLatex = String.raw`\left(${pair.freqLatex}\right) e^{${-t0} j \omega}`;

		return {
			id,
			signalType: type,
			params: { ...params },
			promptLatex: String.raw`\text{Find the CTFT } X(\omega) \text{ of time-shifted signal } x(t) = ${shiftedTimeLatex}`,
			referenceAnswerLatex: shiftedFreqLatex,
			solutionSteps: [
				{
					title: "Step 1: Identify Base Transform Pair",
					latex: `x_0(t) \\iff X_0(\\omega) = ${pair.freqLatex}`,
				},
				{
					title: "Step 2: Apply Time-Shift Property",
					latex: `x(t - t_0) \\iff X_0(\\omega) e^{-j \\omega t_0} \\quad \\text{with } t_0 = ${t0}`,
				},
				{
					title: "Step 3: Combine Terms for Final CTFT",
					latex: `X(\\omega) = ${shiftedFreqLatex}`,
				},
			],
		};
	}

	return {
		id,
		signalType: type,
		params: { ...params },
		promptLatex: String.raw`\text{Find the CTFT } X(\omega) \text{ of } x(t) = ${pair.timeLatex}`,
		referenceAnswerLatex: pair.freqLatex,
		solutionSteps: [
			{
				title: "Step 1: Identify Base Signal Pair",
				latex: `\\text{Recall standard CTFT transform pair: } x(t) \\iff X(\\omega)`,
			},
			{
				title: "Step 2: Substitute Parameter Values",
				latex: `X(\\omega) = \\int_{-\\infty}^{\\infty} x(t) e^{-j\\omega t} dt = ${pair.freqLatex}`,
			},
		],
	};
}

/**
 * Validates a forward transform using the generated signal rather than answer text.
 *
 * @param answer - Student input.
 * @param problem - Active generated forward drill.
 * @returns Mathematical verification and diagnostic feedback.
 */
export function validateCtftAnswer(
	answer: string,
	problem: GeneratedCtftProblem,
): TransformValidationResult {
	const { signalType: type, params } = problem;
	let canonicalTarget: ReturnType<typeof createCtftCanonicalTarget>;
	try {
		canonicalTarget = createCtftCanonicalTarget(type, params);
	} catch (error) {
		if (!(error instanceof CanonicalError)) throw error;
		return { status: error.status, message: error.message };
	}
	const { a, T, w0, t0 } = params;
	const scale =
		type === "rect"
			? 2 / T
			: type === "gaussian"
				? Math.sqrt(a)
				: type === "cos"
					? w0
					: a;
	const samples = [-3.17, -1.43, -0.71, -0.19, 0, 0.23, 0.83, 1.67, 3.41].map(
		(x) => x * scale,
	);
	return validateTransformAnswer(answer, {
		variable: "omega",
		canonicalTarget,
		samples,
		sampleScale: scale,
		/**
		 * Evaluates the regular spectrum including time-shift phase.
		 * @param omega - Frequency in radians per second.
		 * @returns Complex value of the ordinary spectrum, excluding impulses.
		 */
		evaluate: (omega) => {
			if (type === "cos") return new Complex(0);
			const point = evaluateCtftSpectrum(type, params, omega);
			return Complex.fromPolar(point.magnitude, point.phase - omega * t0);
		},
		impulses:
			type === "cos"
				? [-w0, w0].map((location) => ({
						location,
						weight: Complex.fromPolar(Math.PI, -location * t0),
					}))
				: [],
	});
}
