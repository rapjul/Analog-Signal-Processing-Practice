/** Shared Parseval definitions and safe conversion from normalized power. */
import type {
	FourierSeriesCoefficients,
	FourierSeriesWaveformType,
	HarmonicPowerThresholds,
} from "./types";

/** Average power is A² divided by this waveform-specific divisor. */
const POWER_DIVISORS: Readonly<Record<FourierSeriesWaveformType, number>> =
	Object.freeze({
		square: 1,
		square_odd: 1,
		square_even: 1,
		triangle: 3,
		triangle_odd: 3,
		triangle_even: 3,
		sawtooth: 3,
		half_wave_sine: 4,
		full_wave_sine: 2,
	});

/** Shared percentages for searching, rounding protection, and display. */
export const FOURIER_POWER_TARGETS = [
	{ key: "n90", percent: 90 },
	{ key: "n95", percent: 95 },
	{ key: "n99", percent: 99 },
] as const satisfies readonly {
	readonly key: keyof HarmonicPowerThresholds;
	readonly percent: number;
}[];

/** Smallest normal binary64 value; smaller squares need a single final rounding. */
const MIN_NORMAL_POWER = 2 ** -1022;

/** @param waveform - Supported waveform. @returns Its exhaustive average-power divisor. */
function powerDivisor(waveform: FourierSeriesWaveformType): number {
	if (!Object.hasOwn(POWER_DIVISORS, waveform))
		throw new Error(`Unsupported waveform type: ${String(waveform)}`);
	return POWER_DIVISORS[waveform];
}

/** @param waveform - Supported waveform. @returns Average power at unit amplitude. */
export function computeFourierUnitPower(
	waveform: FourierSeriesWaveformType,
): number {
	return 1 / powerDivisor(waveform);
}

/**
 * Preserves ordinary A²/divisor arithmetic while avoiding premature overflow or subnormal rounding.
 * @param waveform - Supported waveform.
 * @param amplitude - Positive finite amplitude.
 * @returns Physical average power, possibly zero or infinite when unrepresentable.
 */
export function computeFourierTotalPower(
	waveform: FourierSeriesWaveformType,
	amplitude: number,
): number {
	const divisor = powerDivisor(waveform);
	const squared = amplitude * amplitude;
	return Number.isFinite(squared) && squared >= MIN_NORMAL_POWER
		? squared / divisor
		: amplitude * (amplitude / divisor);
}

/**
 * Computes one normalized DC or positive-frequency pair contribution.
 * @param coeffs - Real waveform coefficient model.
 * @param n - Nonnegative safe integer harmonic index.
 * @returns Contribution divided by A².
 */
export function computeNormalizedHarmonicPower(
	coeffs: FourierSeriesCoefficients,
	n: number,
): number {
	if (!Number.isSafeInteger(n) || n < 0)
		throw new RangeError(
			"Fourier power index must be a non-negative safe integer.",
		);
	if (n === 0) return (coeffs.a0 / coeffs.A / 2) ** 2;
	const an = coeffs.an(n) / coeffs.A;
	const bn = coeffs.bn(n) / coeffs.A;
	return 0.5 * (an * an + bn * bn);
}

/**
 * Converts normalized power without squaring extreme amplitudes prematurely.
 * @param amplitude - Positive finite amplitude.
 * @param normalizedPower - Amplitude-independent contribution.
 * @returns Physical power rounded after scaling.
 */
export function scaleFourierPower(
	amplitude: number,
	normalizedPower: number,
): number {
	const squared = amplitude * amplitude;
	return Number.isFinite(squared) && squared >= MIN_NORMAL_POWER
		? squared * normalizedPower
		: amplitude * (amplitude * normalizedPower);
}

/**
 * Computes physical DC or paired harmonic power for coefficient tables.
 * @param coeffs - Real waveform coefficient model.
 * @param n - Nonnegative safe integer harmonic index.
 * @returns Physical contribution using the same normalized definition as Parseval analysis.
 */
export function computeHarmonicPowerContribution(
	coeffs: FourierSeriesCoefficients,
	n: number,
): number {
	return scaleFourierPower(
		coeffs.A,
		computeNormalizedHarmonicPower(coeffs, n),
	);
}
