import { createSeededPrng, randomChoice, randomInt } from "../random";
import type { ConvolutionSignalSection } from "./its-scaffolding";

export const CONVOLUTION_SIGNAL_TYPES = [
	"rect",
	"triangle",
	"multi_rect",
	"exponential",
] as const;

export type ConvolutionSignalType = (typeof CONVOLUTION_SIGNAL_TYPES)[number];
export type ConvolutionSignalTypeSelection = ConvolutionSignalType | "random";
export type ConvolutionParameterMode = "default" | "random";
export type ConvolutionAmplitudeSelection =
	"default" | "random_signed" | "-3" | "-2" | "-1" | "1" | "2" | "3";
export type ConvolutionShiftState = "unshifted" | "shifted" | "random";
export type ConvolutionShiftValueSelection =
	| "random_signed"
	| "random_negative"
	| "random_positive"
	| "-5"
	| "-4"
	| "-3"
	| "-2"
	| "-1"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5";

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

export const DEFAULT_CONVOLUTION_SIGNAL_SELECTION: ConvolutionSignalSelection =
	{
		type: "rect",
		parameterMode: "default",
		amplitude: "default",
		componentAmplitudes: ["default", "default"],
		shiftState: "unshifted",
		shiftValue: "random_signed",
	};

export const DEFAULT_CONVOLUTION_SELECTION: ConvolutionProblemSelection = {
	x: {
		...DEFAULT_CONVOLUTION_SIGNAL_SELECTION,
		componentAmplitudes: ["default", "default"],
	},
	h: {
		...DEFAULT_CONVOLUTION_SIGNAL_SELECTION,
		componentAmplitudes: ["default", "default"],
	},
};

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
	if (shift === 0) return "t";
	return shift > 0 ? `t-${shift}` : `t+${Math.abs(shift)}`;
}

function scaleLatex(amplitude: number, body: string): string {
	if (amplitude === 1) return body;
	if (amplitude === -1) return `-${body}`;
	return `${amplitude}${body}`;
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
			latex: scaleLatex(
				amplitude,
				`\\operatorname{rect}\\left(\\frac{${argument}}{${parameter}}\\right)`,
			),
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
		const termArgument = formatShiftedArgument(center);
		return scaleLatex(
			componentAmplitudes[index],
			`\\operatorname{rect}\\left(\\frac{${termArgument}}{${parameter}}\\right)`,
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
