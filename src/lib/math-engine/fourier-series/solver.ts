/**
 * Fourier Series Analytical Solvers & Signal Evaluation.
 *
 * Implements analytical coefficient calculation (a0, an, bn, Fn),
 * waveform reconstruction, partial sum approximations, and Parseval power distribution.
 */

import {
	computeFourierTotalPower,
	computeFourierUnitPower,
	computeNormalizedHarmonicPower,
	FOURIER_POWER_TARGETS,
	scaleFourierPower,
} from "./power";
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
	for (let decimals = 2; decimals <= 8; decimals += 1) {
		const formatted = percent.toFixed(decimals);
		const rounded = Number(formatted);
		const crossesThreshold = FOURIER_POWER_TARGETS.some(
			({ percent: target }) =>
				(percent < target && rounded >= target) ||
				(percent >= target && rounded < target),
		);
		if (!crossesThreshold) return formatted;
	}
	// Preserve the actual percentage when fixed decimals would cross a target.
	return percent.toString();
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
	const phase = (t % T0) / T0;
	return (phase >= 0.5 ? phase - 1 : phase < -0.5 ? phase + 1 : phase) * T0;
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
	if (!Number.isFinite(w0) || T0 / 4 === 0) {
		throw new RangeError(
			"Fourier period must produce a finite frequency and nonzero quarter-period.",
		);
	}
	const totalPower = computeFourierTotalPower(waveformType, A);
	if (!Number.isFinite(totalPower) || totalPower === 0) {
		throw new RangeError(
			"Fourier amplitude must produce representable signal power.",
		);
	}

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
		 * Validates a trigonometric harmonic before evaluating its coefficient.
		 * @param evaluate - Waveform-specific coefficient evaluator.
		 * @param n - Positive safe integer harmonic index.
		 * @returns The evaluated real coefficient.
		 */
		function evaluateHarmonic(
			evaluate: (n: number) => number,
			n: number,
		): number {
			if (!Number.isSafeInteger(n) || n < 1) {
				throw new RangeError(
					"Trigonometric harmonic index must be a positive safe integer.",
				);
			}
			return evaluate(n);
		}
		/**
		 * Evaluates the exponential coefficient for an integer harmonic index.
		 * @param {number} n Integer harmonic index
		 * @returns {ComplexCoefficient} Exponential Fourier coefficient F_n
		 */
		const Fn = (n: number): ComplexCoefficient => {
			if (!Number.isSafeInteger(n)) {
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
			/** @param n - Positive harmonic index. @returns Cosine coefficient. */
			an: (n: number): number => evaluateHarmonic(definition.an, n),
			/** @param n - Positive harmonic index. @returns Sine coefficient. */
			bn: (n: number): number => evaluateHarmonic(definition.bn, n),
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
			return centered >= -T0 / 4 && centered < T0 / 4 ? A : -A;
		case "triangle":
		case "triangle_even":
			return A * (1 - 4 * (Math.abs(centered) / T0));
		case "triangle_odd": {
			const shifted = wrapCenteredTime(centered - T0 / 4, T0);
			return A * (1 - 4 * (Math.abs(shifted) / T0));
		}
		case "sawtooth":
			return 2 * A * (centered / T0);
		case "half_wave_sine": {
			const remainder = (t % T0) / T0;
			const phase = remainder < 0 ? remainder + 1 : remainder;
			return phase < 0.5 ? A * Math.sin(2 * Math.PI * phase) : 0;
		}
		case "full_wave_sine":
			return A * Math.abs(Math.sin(Math.PI * (centered / T0)));
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
	if (!Number.isSafeInteger(N) || N < 0) {
		throw new RangeError(
			"Fourier harmonic count N must be a non-negative integer.",
		);
	}
	if (!Number.isFinite(t)) {
		throw new RangeError("Fourier partial-sum time t must be finite.");
	}
	let sum = coeffs.a0 / 2;
	const phase = 2 * Math.PI * ((t % coeffs.T0) / coeffs.T0);
	for (let n = 1; n <= N; n++) {
		const anVal = coeffs.an(n);
		const bnVal = coeffs.bn(n);
		if (anVal !== 0) {
			sum += anVal * Math.cos(n * phase);
		}
		if (bnVal !== 0) {
			sum += bnVal * Math.sin(n * phase);
		}
	}
	return sum;
}

/**
 * Computes total signal power and power in first N harmonics via Parseval's Theorem.
 * @param {FourierSeriesCoefficients} coeffs Waveform coefficients
 * @param {number} N Harmonic limit
 * @returns {SignalPower} Total power, harmonic power, and power ratio
 */
export function computeSignalPower(
	coeffs: FourierSeriesCoefficients,
	N: number,
): SignalPower {
	if (!Number.isSafeInteger(N) || N < 0) {
		throw new RangeError(
			"Fourier harmonic count N must be a non-negative integer.",
		);
	}
	const totalPower = computeFourierTotalPower(coeffs.waveformType, coeffs.A);
	let normalizedPower = computeNormalizedHarmonicPower(coeffs, 0);
	for (let n = 1; n <= N; n++) {
		normalizedPower += computeNormalizedHarmonicPower(coeffs, n);
	}

	const unitPower = computeFourierUnitPower(coeffs.waveformType);
	const powerRatio = normalizedPower / unitPower;
	return {
		totalPower,
		harmonicPower: Math.min(
			totalPower,
			scaleFourierPower(coeffs.A, normalizedPower),
		),
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
	if (!Number.isSafeInteger(maxHarmonics) || maxHarmonics < 1) {
		throw new RangeError(
			"Fourier threshold search limit must be a positive integer.",
		);
	}

	const totalPower = computeFourierUnitPower(coeffs.waveformType);
	let cumulativePower = computeNormalizedHarmonicPower(coeffs, 0);
	const limits: Partial<HarmonicPowerThresholds> = {};

	for (let n = 0; n <= maxHarmonics; n += 1) {
		if (n > 0) {
			cumulativePower += computeNormalizedHarmonicPower(coeffs, n);
		}
		const ratio = totalPower > 0 ? cumulativePower / totalPower : 0;
		for (const { key, percent } of FOURIER_POWER_TARGETS) {
			if (limits[key] === undefined && ratio >= percent / 100)
				limits[key] = n;
		}
		if (
			FOURIER_POWER_TARGETS.every(({ key }) => limits[key] !== undefined)
		) {
			return limits as HarmonicPowerThresholds;
		}
	}

	throw new RangeError(
		`Fourier power thresholds did not converge within ${maxHarmonics} harmonics.`,
	);
}
export {
	buildCompactSeriesLatex,
	buildFinalSeriesLatex,
	buildFourierSeriesSymbolicDerivation,
	buildFourierSymbolicDerivation,
	buildSignalLatex,
} from "./symbolic-derivations";
