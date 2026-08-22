/**
 * URL parsing and serialization for reproducible Fourier Series drills.
 */

import {
	FOURIER_SERIES_WAVEFORM_TYPES,
	type FourierSeriesWaveformType,
} from "../math-engine/fourier-series/index";
import {
	createRandomSeed,
	createSeededPrng,
	randomChoice,
} from "../math-engine/random";
import type { WithRandom } from "../math-engine/types";
import { parseEnumParam, parseSafeSeedParam } from "./url-params";

/** Exact waveform selection or seeded random selection across all waveforms. */
export type FourierSeriesWaveformSelection =
	WithRandom<FourierSeriesWaveformType>;

/** URL-safe selector values, including the random sentinel. */
export const FOURIER_SERIES_WAVEFORM_SELECTIONS: readonly FourierSeriesWaveformSelection[] =
	["random", ...FOURIER_SERIES_WAVEFORM_TYPES] as const;

// Backward-compatibility aliases
export type FourierWaveformSelection = FourierSeriesWaveformSelection;
export const FOURIER_WAVEFORM_SELECTIONS = FOURIER_SERIES_WAVEFORM_SELECTIONS;

/** Fourier filter selections stored in shareable URL state. */
export interface FourierSeriesFilterSelections {
	/** Selected periodic waveform variant. */
	waveform: FourierWaveformSelection;
	/** Unsigned 32-bit deterministic problem seed. */
	seed: number;
}

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
		allowedValues: FOURIER_WAVEFORM_SELECTIONS,
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

/** Resolves a concrete waveform while preserving deterministic random drills. */
export function resolveFourierWaveformSelection(
	selection: FourierSeriesWaveformSelection,
	seed: number,
): FourierSeriesWaveformType {
	if (selection !== "random") return selection;
	return randomChoice(createSeededPrng(seed), FOURIER_SERIES_WAVEFORM_TYPES);
}
