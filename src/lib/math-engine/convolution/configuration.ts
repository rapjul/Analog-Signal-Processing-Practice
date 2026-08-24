import {
	formatScaledMathBody,
	formatTranslatedArgument,
	sanitizeLatexMath,
} from "$lib/math-engine/formatting";
import {
	createSeededPrng,
	randomChoice,
	randomInt,
} from "$lib/math-engine/random";
import type { WithRandom } from "$lib/math-engine/types";
import { formatRectPulseLatex } from "./pulse-formatting";
import type { ConvolutionSignalSection } from "./types";

export const CONVOLUTION_SIGNAL_TYPES = [
	"rect",
	"triangle",
	"multi_rect",
	"exponential",
] as const;

export type ConvolutionSignalType = (typeof CONVOLUTION_SIGNAL_TYPES)[number];
export type ConvolutionSignalTypeSelection = WithRandom<ConvolutionSignalType>;
export type ConvolutionParameterMode = WithRandom<"default">;
type ConvolutionFixedAmplitude =
	"default" | "-3" | "-2" | "-1" | "1" | "2" | "3";
export type ConvolutionAmplitudeSelection = WithRandom<
	ConvolutionFixedAmplitude,
	"random_signed"
>;
export type ConvolutionShiftState = WithRandom<"unshifted" | "shifted">;
type ConvolutionFixedShiftValue =
	"-5" | "-4" | "-3" | "-2" | "-1" | "1" | "2" | "3" | "4" | "5";
export type ConvolutionShiftValueSelection = WithRandom<
	ConvolutionFixedShiftValue,
	"random_signed" | "random_negative" | "random_positive"
>;

export interface ConvolutionSignalSelection {
	type: ConvolutionSignalTypeSelection;
	parameterMode: ConvolutionParameterMode;
	amplitude: ConvolutionAmplitudeSelection;
	componentAmplitudes: [
		ConvolutionAmplitudeSelection,
		ConvolutionAmplitudeSelection,
	];
	shiftState: ConvolutionShiftState;
	shiftValue: ConvolutionShiftValueSelection;
}

export interface ConvolutionProblemSelection {
	x: ConvolutionSignalSelection;
	h: ConvolutionSignalSelection;
}

export interface ConvolutionPolynomialPiece {
	id: string;
	start: number;
	end: number;
	/** Global polynomial coefficients c0 + c1*t. */
	coefficients: [number, number];
}

export interface ResolvedConvolutionSignal {
	kind: ConvolutionSignalType;
	parameter: number;
	shift: number;
	amplitude: number;
	componentAmplitudes?: [number, number];
	latex: string;
	sections: ConvolutionSignalSection[];
	breakpoints: number[];
	pieces: ConvolutionPolynomialPiece[];
	eval: (t: number) => number;
}

export interface ResolvedConvolutionSelection {
	x: ResolvedConvolutionSignal;
	h: ResolvedConvolutionSignal;
}

/** Canonical unshifted unit rectangular signal used by the textbook preset. */
export const TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION: ConvolutionSignalSelection =
	{
		type: "rect",
		parameterMode: "default",
		amplitude: "default",
		componentAmplitudes: ["default", "default"],
		shiftState: "unshifted",
		shiftValue: "random_signed",
	};

/** Fixed ECE 210 introductory example with two unit rectangular pulses. */
export const TEXTBOOK_CONVOLUTION_SELECTION: ConvolutionProblemSelection = {
	x: {
		...TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
		componentAmplitudes: ["default", "default"],
	},
	h: {
		...TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
		componentAmplitudes: ["default", "default"],
	},
};

/** Beginner-safe random signal with textbook scale and unit amplitude. */
export const BEGINNER_RANDOM_CONVOLUTION_SIGNAL_SELECTION: ConvolutionSignalSelection =
	{
		type: "random",
		parameterMode: "default",
		amplitude: "default",
		componentAmplitudes: ["default", "default"],
		shiftState: "random",
		shiftValue: "random_signed",
	};

/** Default random problem preset used for bare convolution routes. */
export const DEFAULT_CONVOLUTION_SELECTION: ConvolutionProblemSelection = {
	x: {
		...BEGINNER_RANDOM_CONVOLUTION_SIGNAL_SELECTION,
		componentAmplitudes: ["default", "default"],
	},
	h: {
		...BEGINNER_RANDOM_CONVOLUTION_SIGNAL_SELECTION,
		componentAmplitudes: ["default", "default"],
	},
};

/** Backward-compatible alias for callers expecting the default signal constant. */
export const DEFAULT_CONVOLUTION_SIGNAL_SELECTION =
	BEGINNER_RANDOM_CONVOLUTION_SIGNAL_SELECTION;

function derivedSeed(seed: number, key: string): number {
	let hash = seed >>> 0;
	for (const character of key) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash;
}

function fieldRandom(seed: number, key: string): () => number {
	return createSeededPrng(derivedSeed(seed, key));
}

function resolveAmplitude(
	selection: ConvolutionAmplitudeSelection,
	seed: number,
	key: string,
): number {
	if (selection === "default") return 1;
	if (selection !== "random_signed") return Number(selection);
	return randomChoice(fieldRandom(seed, key), [-3, -2, -1, 1, 2, 3]);
}

function resolveShift(
	selection: ConvolutionSignalSelection,
	seed: number,
	key: string,
): number {
	const shifted =
		selection.shiftState === "shifted" ||
		(selection.shiftState === "random" &&
			fieldRandom(seed, `${key}:shift-state`)() >= 0.5);
	if (!shifted) return 0;
	if (!selection.shiftValue.startsWith("random_"))
		return Number(selection.shiftValue);
	const random = fieldRandom(seed, `${key}:shift-value`);
	if (selection.shiftValue === "random_negative")
		return randomInt(random, -5, -1);
	if (selection.shiftValue === "random_positive")
		return randomInt(random, 1, 5);
	return randomChoice(random, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
}

function formatShiftedArgument(shift: number): string {
	return formatTranslatedArgument("t", shift);
}

function scaleLatex(amplitude: number, body: string): string {
	return sanitizeLatexMath(formatScaledMathBody(amplitude, body));
}

function section(
	id: string,
	start: number,
	end: number,
): ConvolutionSignalSection {
	return { id, start, end, startIncluded: true, endIncluded: false };
}

export function resolveConvolutionSignal(
	selection: ConvolutionSignalSelection,
	seed: number,
	key: "x" | "h",
): ResolvedConvolutionSignal {
	const kind =
		selection.type === "random"
			? randomChoice(
					fieldRandom(seed, `${key}:type`),
					CONVOLUTION_SIGNAL_TYPES,
				)
			: selection.type;
	const parameter =
		selection.parameterMode === "default"
			? kind === "triangle"
				? 2
				: 1
			: randomInt(fieldRandom(seed, `${key}:parameter`), 1, 3);
	const shift = resolveShift(selection, seed, key);
	const amplitude = resolveAmplitude(
		selection.amplitude,
		seed,
		`${key}:amplitude`,
	);
	const argument = formatShiftedArgument(shift);

	if (kind === "exponential") {
		const latex = scaleLatex(
			amplitude,
			`e^{-${parameter}(${argument})}u(${argument})`,
		);
		return {
			kind,
			parameter,
			shift,
			amplitude,
			latex,
			sections: [section(`${key}-1`, shift, Number.POSITIVE_INFINITY)],
			breakpoints: [shift],
			pieces: [],
			eval: (t) =>
				t >= shift ? amplitude * Math.exp(-parameter * (t - shift)) : 0,
		};
	}

	if (kind === "rect") {
		const start = shift - parameter / 2;
		const end = shift + parameter / 2;
		return {
			kind,
			parameter,
			shift,
			amplitude,
			latex: formatRectPulseLatex(parameter, shift, amplitude),
			sections: [section(`${key}-1`, start, end)],
			breakpoints: [start, end],
			pieces: [
				{
					id: `${key}-piece-1`,
					start,
					end,
					coefficients: [amplitude, 0],
				},
			],
			eval: (t) => (t >= start && t < end ? amplitude : 0),
		};
	}

	if (kind === "triangle") {
		const start = shift - parameter / 2;
		const end = shift + parameter / 2;
		const rising: [number, number] = [
			amplitude * (1 - (2 * shift) / parameter),
			(2 * amplitude) / parameter,
		];
		const falling: [number, number] = [
			amplitude * (1 + (2 * shift) / parameter),
			(-2 * amplitude) / parameter,
		];
		return {
			kind,
			parameter,
			shift,
			amplitude,
			latex: scaleLatex(
				amplitude,
				parameter === 2
					? `\\Delta\\left(${argument}\\right)`
					: `\\Delta\\left(\\frac{2(${argument})}{${parameter}}\\right)`,
			),
			sections: [section(`${key}-1`, start, end)],
			breakpoints: [start, shift, end],
			pieces: [
				{
					id: `${key}-piece-1`,
					start,
					end: shift,
					coefficients: rising,
				},
				{
					id: `${key}-piece-2`,
					start: shift,
					end,
					coefficients: falling,
				},
			],
			eval: (t) => {
				const distance = Math.abs(t - shift);
				return distance <= parameter / 2
					? amplitude * (1 - (2 * distance) / parameter)
					: 0;
			},
		};
	}

	const componentAmplitudes: [number, number] = [
		resolveAmplitude(
			selection.componentAmplitudes[0],
			seed,
			`${key}:component-1`,
		),
		resolveAmplitude(
			selection.componentAmplitudes[1],
			seed,
			`${key}:component-2`,
		),
	];
	const centers: [number, number] = [shift - parameter, shift + parameter];
	const starts: [number, number] = [
		centers[0] - parameter / 2,
		centers[1] - parameter / 2,
	];
	const ends: [number, number] = [
		centers[0] + parameter / 2,
		centers[1] + parameter / 2,
	];
	const componentLatex = centers.map((center, index) => {
		return formatRectPulseLatex(
			parameter,
			center,
			componentAmplitudes[index],
		);
	});
	return {
		kind,
		parameter,
		shift,
		amplitude: 1,
		componentAmplitudes,
		latex: componentLatex.join(componentAmplitudes[1] < 0 ? "" : "+"),
		sections: [
			section(`${key}-1`, starts[0], ends[0]),
			section(`${key}-2`, starts[1], ends[1]),
		],
		breakpoints: [starts[0], ends[0], starts[1], ends[1]],
		pieces: [
			{
				id: `${key}-piece-1`,
				start: starts[0],
				end: ends[0],
				coefficients: [componentAmplitudes[0], 0],
			},
			{
				id: `${key}-piece-2`,
				start: starts[1],
				end: ends[1],
				coefficients: [componentAmplitudes[1], 0],
			},
		],
		eval: (t) =>
			(t >= starts[0] && t < ends[0] ? componentAmplitudes[0] : 0) +
			(t >= starts[1] && t < ends[1] ? componentAmplitudes[1] : 0),
	};
}

export function resolveConvolutionSelection(
	selection: ConvolutionProblemSelection,
	seed: number,
): ResolvedConvolutionSelection {
	return {
		x: resolveConvolutionSignal(selection.x, seed, "x"),
		h: resolveConvolutionSignal(selection.h, seed, "h"),
	};
}
