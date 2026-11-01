/** Frozen share-state parsing for independently configured convolution signals. */

import type { ReadonlyURLSearchParams } from "$app/state";
import {
	CONVOLUTION_SIGNAL_TYPES,
	type ConvolutionAmplitudeSelection,
	type ConvolutionParameterMode,
	type ConvolutionProblemSelection,
	type ConvolutionShiftState,
	type ConvolutionShiftValueSelection,
	type ConvolutionSignalSelection,
	type ConvolutionSignalTypeSelection,
	DEFAULT_CONVOLUTION_SELECTION,
} from "$lib/math-engine/convolution/index";
import { createRandomSeed } from "$lib/math-engine/random";
import { parseSafeSeedParam } from "$lib/problems/url-params";

export const CONVOLUTION_SHARE_VERSION = "2";
export const CONVOLUTION_SIGNAL_TYPE_SELECTIONS = [
	"random",
	...CONVOLUTION_SIGNAL_TYPES,
] as const;
export const CONVOLUTION_PARAMETER_MODES = ["default", "random"] as const;
export const CONVOLUTION_AMPLITUDE_SELECTIONS = [
	"default",
	"random_signed",
	"-3",
	"-2",
	"-1",
	"1",
	"2",
	"3",
] as const;
export const CONVOLUTION_SHIFT_STATES = [
	"unshifted",
	"shifted",
	"random",
] as const;
export const CONVOLUTION_SHIFT_VALUE_SELECTIONS = [
	"random_signed",
	"random_negative",
	"random_positive",
	"-5",
	"-4",
	"-3",
	"-2",
	"-1",
	"1",
	"2",
	"3",
	"4",
	"5",
] as const;

export interface ConvolutionFilterSelections {
	selection: ConvolutionProblemSelection;
	seed: number;
	isShared: boolean;
}

function cloneDefaultSelection(): ConvolutionProblemSelection {
	return {
		x: {
			...DEFAULT_CONVOLUTION_SELECTION.x,
			componentAmplitudes: [
				...DEFAULT_CONVOLUTION_SELECTION.x.componentAmplitudes,
			],
		},
		h: {
			...DEFAULT_CONVOLUTION_SELECTION.h,
			componentAmplitudes: [
				...DEFAULT_CONVOLUTION_SELECTION.h.componentAmplitudes,
			],
		},
	};
}

function enumValue<T extends string>(
	value: string | null,
	allowed: readonly T[],
	fallback: T,
): T {
	return value !== null && allowed.includes(value as T)
		? (value as T)
		: fallback;
}

function parseSignal(
	params: ReadonlyURLSearchParams,
	prefix: "x" | "h",
	fallback: ConvolutionSignalSelection,
): ConvolutionSignalSelection {
	return {
		type: enumValue<ConvolutionSignalTypeSelection>(
			params.get(`${prefix}Type`),
			CONVOLUTION_SIGNAL_TYPE_SELECTIONS,
			fallback.type,
		),
		parameterMode: enumValue<ConvolutionParameterMode>(
			params.get(`${prefix}Parameter`),
			CONVOLUTION_PARAMETER_MODES,
			fallback.parameterMode,
		),
		amplitude: enumValue<ConvolutionAmplitudeSelection>(
			params.get(`${prefix}Amplitude`),
			CONVOLUTION_AMPLITUDE_SELECTIONS,
			fallback.amplitude,
		),
		componentAmplitudes: [
			enumValue<ConvolutionAmplitudeSelection>(
				params.get(`${prefix}Amplitude1`),
				CONVOLUTION_AMPLITUDE_SELECTIONS,
				fallback.componentAmplitudes[0],
			),
			enumValue<ConvolutionAmplitudeSelection>(
				params.get(`${prefix}Amplitude2`),
				CONVOLUTION_AMPLITUDE_SELECTIONS,
				fallback.componentAmplitudes[1],
			),
		],
		shiftState: enumValue<ConvolutionShiftState>(
			params.get(`${prefix}Shift`),
			CONVOLUTION_SHIFT_STATES,
			fallback.shiftState,
		),
		shiftValue: enumValue<ConvolutionShiftValueSelection>(
			params.get(`${prefix}ShiftValue`),
			CONVOLUTION_SHIFT_VALUE_SELECTIONS,
			fallback.shiftValue,
		),
	};
}

/** Parses only versioned Share URLs; bare, legacy, and partial URLs use defaults. */
export function parseConvolutionFilters(
	searchParams: ReadonlyURLSearchParams,
	fallbackSeed: number = createRandomSeed(),
): ConvolutionFilterSelections {
	const defaults = cloneDefaultSelection();
	const isShared =
		searchParams.get("share") === "1" &&
		searchParams.get("v") === CONVOLUTION_SHARE_VERSION;
	if (!isShared)
		return { selection: defaults, seed: fallbackSeed, isShared: false };
	const seed = parseSafeSeedParam(searchParams, {
		fallbackGenerator: () => fallbackSeed,
	}).value;
	return {
		selection: {
			x: parseSignal(searchParams, "x", defaults.x),
			h: parseSignal(searchParams, "h", defaults.h),
		},
		seed,
		isShared: true,
	};
}

function serializeSignal(
	params: URLSearchParams,
	prefix: "x" | "h",
	selection: ConvolutionSignalSelection,
): void {
	params.set(`${prefix}Type`, selection.type);
	params.set(`${prefix}Parameter`, selection.parameterMode);
	params.set(`${prefix}Amplitude`, selection.amplitude);
	params.set(`${prefix}Amplitude1`, selection.componentAmplitudes[0]);
	params.set(`${prefix}Amplitude2`, selection.componentAmplitudes[1]);
	params.set(`${prefix}Shift`, selection.shiftState);
	params.set(`${prefix}ShiftValue`, selection.shiftValue);
}

/** Serializes one frozen, versioned, reproducible Share URL query. */
export function serializeConvolutionFilters(
	filters: Omit<ConvolutionFilterSelections, "isShared">,
): URLSearchParams {
	const params = new URLSearchParams();
	params.set("share", "1");
	params.set("v", CONVOLUTION_SHARE_VERSION);
	params.set("seed", String(filters.seed >>> 0));
	serializeSignal(params, "x", filters.selection.x);
	serializeSignal(params, "h", filters.selection.h);
	return params;
}
