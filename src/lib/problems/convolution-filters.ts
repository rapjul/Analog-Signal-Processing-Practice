/** Seeded URL filtering for reproducible convolution drills. */

import type { ConvolutionPairType } from "$lib/math-engine/convolution";
import {
	createRandomSeed,
	createSeededPrng,
	randomChoice,
} from "$lib/math-engine/random";
import type { WithRandom } from "$lib/math-engine/types";
import { parseEnumParam, parseSafeSeedParam } from "$lib/problems/url-params";

/** Fully implemented signal pairs exposed by the practice route. */
export type ConvolutionDrillPairType = Extract<
	ConvolutionPairType,
	| "rect_rect"
	| "rect_shifted_rect"
	| "rect_both_shifted"
	| "multi_rect"
	| "rect_exp"
	| "exp_exp"
	| "tri_rect"
	| "tri_shifted_tri"
>;

/** Concrete pair selection or the seeded Random sentinel. */
export type ConvolutionPairSelection = WithRandom<ConvolutionDrillPairType>;

/** Ordered signal pairs used by the selector and Random resolver. */
export const CONVOLUTION_DRILL_PAIR_TYPES: readonly ConvolutionDrillPairType[] =
	[
		"rect_rect",
		"rect_shifted_rect",
		"rect_both_shifted",
		"multi_rect",
		"rect_exp",
		"exp_exp",
		"tri_rect",
		"tri_shifted_tri",
	] as const;

/** All URL-safe selector values. */
export const CONVOLUTION_PAIR_SELECTIONS: readonly ConvolutionPairSelection[] =
	["random", ...CONVOLUTION_DRILL_PAIR_TYPES] as const;

/** Canonical route state for a convolution drill. */
export interface ConvolutionFilterSelections {
	/** Selected concrete pair or Random mode. */
	pair: ConvolutionPairSelection;
	/** Unsigned deterministic seed. */
	seed: number;
}

/** Parses safe convolution filters, defaulting missing and invalid pairs to Random. */
export function parseConvolutionFilters(
	searchParams: URLSearchParams,
	fallbackSeed: number = createRandomSeed(),
): ConvolutionFilterSelections {
	const pair = parseEnumParam(searchParams, {
		key: "pair",
		allowedValues: CONVOLUTION_PAIR_SELECTIONS,
		fallback: "random",
	}).value;
	const seed = parseSafeSeedParam(searchParams, {
		fallbackGenerator: () => fallbackSeed,
	}).value;
	return { pair, seed };
}

/** Serializes canonical shareable convolution filters. */
export function serializeConvolutionFilters(
	filters: ConvolutionFilterSelections,
): URLSearchParams {
	const params = new URLSearchParams();
	params.set("pair", filters.pair);
	params.set("seed", String(filters.seed >>> 0));
	return params;
}

/** Resolves Random deterministically while preserving concrete selections. */
export function resolveConvolutionPairSelection(
	selection: ConvolutionPairSelection,
	seed: number,
): ConvolutionDrillPairType {
	if (selection !== "random") return selection;
	return randomChoice(createSeededPrng(seed), CONVOLUTION_DRILL_PAIR_TYPES);
}
