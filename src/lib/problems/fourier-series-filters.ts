/**
 * URL parsing and serialization for reproducible Fourier Series drills.
 */

import {
	FOURIER_WAVEFORM_TYPES,
	type FourierWaveformType,
} from "../math-engine/fourier-series";
import { createRandomSeed } from "../math-engine/random";
import { parseEnumParam, parseSafeSeedParam } from "./url-params";

/** Fourier filter selections stored in shareable URL state. */
export interface FourierSeriesFilterSelections {
	/** Selected periodic waveform variant. */
	waveform: FourierWaveformType;
	/** Unsigned 32-bit deterministic problem seed. */
	seed: number;
}

/** Waveforms intentionally shown in the primary drill selector. */
export const FOURIER_DRILL_WAVEFORMS: readonly FourierWaveformType[] = [
	"square",
	"triangle",
	"sawtooth",
	"half_wave_sine",
] as const;

/**
 * Parses a safe Fourier filter selection from URL query parameters.
 * @param {URLSearchParams} searchParams Route query parameters
 * @param {number} [fallbackSeed] Optional deterministic fallback seed
 * @returns {FourierSeriesFilterSelections} Validated filter selections
 */
export function parseFourierSeriesFilters(
	searchParams: URLSearchParams,
	fallbackSeed: number = createRandomSeed(),
): FourierSeriesFilterSelections {
	const waveform = parseEnumParam(searchParams, {
		key: "waveform",
		allowedValues: FOURIER_WAVEFORM_TYPES,
		fallback: "square",
	}).value;
	const seed = parseSafeSeedParam(searchParams, {
		fallbackGenerator: () => fallbackSeed,
	}).value;

	return { waveform, seed };
}

/**
 * Serializes Fourier filter selections into canonical shareable URL state.
 * @param {FourierSeriesFilterSelections} filters Validated filter selections
 * @returns {URLSearchParams} Canonical query parameters
 */
export function serializeFourierSeriesFilters(
	filters: FourierSeriesFilterSelections,
): URLSearchParams {
	const params = new URLSearchParams();
	params.set("waveform", filters.waveform);
	params.set("seed", String(filters.seed >>> 0));
	return params;
}

/**
 * Reports whether a waveform is part of the compact primary drill selector.
 * @param {FourierWaveformType} waveform Waveform variant
 * @returns {boolean} Whether the selector exposes the variant by default
 */
export function isPrimaryFourierDrillWaveform(
	waveform: FourierWaveformType,
): boolean {
	return FOURIER_DRILL_WAVEFORMS.some((candidate) => candidate === waveform);
}
