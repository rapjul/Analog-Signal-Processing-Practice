/**
 * Fourier Series Analytical Solvers & Signal Evaluation.
 *
 * Implements analytical coefficient calculation (a0, an, bn, Fn),
 * waveform reconstruction, partial sum approximations, and Parseval power distribution.
 */

import type {
	ComplexCoefficient,
	FourierSeriesCoefficients,
	FourierSeriesSymbolicDerivation,
	FourierSeriesWaveformType,
	HarmonicPowerThresholds,
	OriginParity,
	SignalPower,
} from "./types";
import { FOURIER_SERIES_WAVEFORM_TYPES } from "./types";

/**
 * Formats a captured-power ratio without rounding across common Parseval
 * thresholds. Two decimals are preferred; extra precision is used only when a
 * rounded value would imply that 90%, 95%, or 99% has been reached incorrectly.
 *
 * @param {number} powerRatio Fraction of total signal power captured
 * @returns {string} Formatted power capture percentage
 */
export function formatPowerCapturePercent(powerRatio: number): string {
	if (!Number.isFinite(powerRatio)) {
		throw new RangeError("Fourier power ratio must be finite.");
	}
	const percent = Math.max(0, Math.min(1, powerRatio)) * 100;
	const thresholds = [90, 95, 99];
	for (let decimals = 2; decimals <= 8; decimals += 1) {
		const formatted = percent.toFixed(decimals);
		const rounded = Number(formatted);
		const crossesThreshold = thresholds.some(
			(target) =>
				(percent < target && rounded >= target) ||
				(percent >= target && rounded < target),
		);
		if (!crossesThreshold) return formatted;
	}
	return percent.toFixed(8);
}

/**
 * Checks whether an unknown value is a supported Fourier waveform identifier.
 * @param {unknown} value Candidate waveform identifier
 * @returns {value is FourierSeriesWaveformType} Whether the identifier is supported
 */
export function isFourierSeriesWaveformType(
	value: unknown,
): value is FourierSeriesWaveformType {
	return (
		typeof value === "string" &&
		FOURIER_SERIES_WAVEFORM_TYPES.some(
			(waveformType) => waveformType === value,
		)
	);
}

// Alias for compatibility
export const isFourierWaveformType = isFourierSeriesWaveformType;

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
 * Derives exact Trigonometric and Exponential Fourier series coefficients.
 * @param {FourierSeriesWaveformType} waveformType Waveform category
 * @param {object} [params] Optional parameters for amplitude A and period T0
 * @param {number} [params.A] Amplitude height (default 1)
 * @param {number} [params.T0] Fundamental period (default 2)
 * @returns {FourierSeriesCoefficients} Calculated coefficient structure
 */
export function computeFourierSeriesCoefficients(
	waveformType: FourierSeriesWaveformType,
	params?: { A?: number; T0?: number },
): FourierSeriesCoefficients {
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
	 * @returns {FourierSeriesCoefficients} Complete Fourier coefficient model
	 */
	function completeCoefficients(definition: {
		a0: number;
		an: (n: number) => number;
		bn: (n: number) => number;
		originParity: OriginParity;
		hasHalfWaveSymmetry: boolean;
		hasJumpDiscontinuities: boolean;
	}): FourierSeriesCoefficients {
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

// Alias for compatibility
export const computeFourierCoefficients = computeFourierSeriesCoefficients;

/**
 * Evaluates the ideal periodic waveform represented by a coefficient model.
 * Values at jump discontinuities use the right-hand waveform value; Fourier
 * partial sums converge to the midpoint there.
 *
 * @param {FourierSeriesCoefficients} coeffs Waveform coefficient model
 * @param {number} t Time sample
 * @returns {number} Ideal periodic waveform value x(t)
 */
export function evaluateFourierSeriesWaveform(
	coeffs: FourierSeriesCoefficients,
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

// Alias for compatibility
export const evaluateFourierWaveform = evaluateFourierSeriesWaveform;

/**
 * Computes N-harmonic partial sum approximation S_N(t) = a0/2 + sum_{n=1}^N [a_n cos(n w0 t) + b_n sin(n w0 t)].
 * @param {FourierSeriesCoefficients} coeffs Calculated coefficients
 * @param {number} N Number of harmonics (1 to 50)
 * @param {number} t Time sample point
 * @returns {number} Partial sum S_N(t)
 */
export function computePartialSum(
	coeffs: FourierSeriesCoefficients,
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
 * /**
 * Computes total signal power and power in first N harmonics via Parseval's Theorem.
 * @param {FourierSeriesCoefficients} coeffs Waveform coefficients
 * @param {number} N Harmonic limit
 * @returns {SignalPower} Total power, harmonic power, and power ratio
 */
export function computeSignalPower(
	coeffs: FourierSeriesCoefficients,
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
 * @param {FourierSeriesCoefficients} coeffs Waveform coefficients
 * @param {number} maxHarmonics Search guard for slowly converging spectra
 * @returns {HarmonicPowerThresholds} Minimum harmonic limits for each target
 */
export function computeHarmonicPowerThresholds(
	coeffs: FourierSeriesCoefficients,
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
		const ratio = totalPower > 0 ? cumulativePower / totalPower : 0;
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
 * Builds the standard final series LaTeX representation.
 * @param {FourierSeriesCoefficients} coeffs Calculated coefficients
 * @param {string} w0Latex Fundamental frequency LaTeX
 * @returns {string} LaTeX series expression
 */
function buildFinalSeriesLatex(
	coeffs: FourierSeriesCoefficients,
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
			return `x(t) = \\frac{${A}}{\\pi} + \\frac{${A}}{2}\\sin\\left(${w0Latex} t\\right) + \\sum_{n=2,4,6,\\dots}^{\\infty} \\frac{2(${A})}{\\pi(1-n^2)} \\cos\\left(n ${w0Latex} t\\right)`;
		case "full_wave_sine":
			return `x(t) = \\frac{2(${A})}{\\pi} - \\sum_{n=1}^{\\infty} \\frac{4(${A})}{\\pi(4n^2-1)} \\cos\\left(2n ${w0Latex} t\\right)`;
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Builds the exact compact trigonometric series (cosine with phase angle).
 * @param {FourierSeriesCoefficients} coeffs Waveform coefficients and parameters
 * @param {string} w0Latex Fundamental radian frequency LaTeX
 * @returns {string} Exact compact harmonic series LaTeX
 */
export function buildCompactSeriesLatex(
	coeffs: FourierSeriesCoefficients,
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
				`c_0=\\dfrac{2(${A})}{\\pi},\\quad c_1=\\dfrac{${A}}{2},\\ \\theta_1=-\\dfrac{\\pi}{2},\\quad c_{2k}=\\dfrac{2(${A})}{\\pi(4k^2-1)},\\ \\theta_{2k}=\\pi,\\quad c_n=0\\ (n>1\\text{ odd})`,
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
 * @param {FourierSeriesWaveformType} waveformType Waveform variant
 * @param {number} A Peak amplitude
 * @param {number} T0 Fundamental period
 * @returns {string} One-period waveform LaTeX
 */
export function buildSignalLatex(
	waveformType: FourierSeriesWaveformType,
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
 * Builds the exact symbolic derivation for one supported waveform.
 * @param {FourierSeriesCoefficients} coeffs Waveform coefficients
 * @param {string} w0Latex Fundamental frequency LaTeX
 * @returns {FourierSeriesSymbolicDerivation} Symbolic derivation expressions
 */
export function buildFourierSeriesSymbolicDerivation(
	coeffs: FourierSeriesCoefficients,
	w0Latex: string,
): FourierSeriesSymbolicDerivation {
	const { A, waveformType } = coeffs;
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

// Alias for compatibility
export const buildFourierSymbolicDerivation =
	buildFourierSeriesSymbolicDerivation;
