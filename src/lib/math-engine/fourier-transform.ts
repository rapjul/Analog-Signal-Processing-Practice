/**
 * CTFT (Continuous-Time Fourier Transform) Math Engine.
 * Implements forward & inverse transform pairs, spectral magnitude/phase/energy
 * calculations, operational properties, and CTFT problem generation for UIUC ECE 210.
 */

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
				freqLatex: `\\sqrt{\\frac{\\pi}{${a}}} e^{-\\frac{\\omega^2}{4 ${a}}}`,
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
			const w0 = params.w0 ?? 1;
			const isImpulse = Math.abs(Math.abs(omega) - w0) < 1e-4;
			return { omega, magnitude: isImpulse ? Math.PI : 0, phase: 0 };
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
): CtftProblem {
	const aValues = [1, 2, 3, 4, 5];
	const tValues = [1, 2, 4, 6];
	const w0Values = [2, 3, 4, 5, 10];
	const shiftValues = [1, 2, 3];

	const a = aValues[Math.floor(Math.random() * aValues.length)];
	const T = tValues[Math.floor(Math.random() * tValues.length)];
	const w0 = w0Values[Math.floor(Math.random() * w0Values.length)];
	const t0 = shiftValues[Math.floor(Math.random() * shiftValues.length)];

	const pair = getCtftPairLatex(type, { a, T, w0 });
	const id = `ctft-${type}-${Date.now()}`;

	// With 40% probability, add a time-shift operational property
	const hasShift = Math.random() < 0.4 && type !== "delta";

	if (hasShift) {
		const shiftedTimeLatex =
			type === "rect"
				? `\\operatorname{rect}\\left(\\frac{t - ${t0}}{${T}}\\right)`
				: type === "exponential"
					? `e^{-${a}(t - ${t0})} u(t - ${t0})`
					: `${pair.timeLatex.replace("t", `(t - ${t0})`)}`;

		const shiftedFreqLatex = `${pair.freqLatex} e^{-j ${t0} \\omega}`;

		return {
			id,
			promptLatex: `\\text{Find the CTFT } X(\\omega) \\text{ of time-shifted signal } x(t) = ${shiftedTimeLatex}`,
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
		promptLatex: `\\text{Find the CTFT } X(\\omega) \\text{ of } x(t) = ${pair.timeLatex}`,
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
