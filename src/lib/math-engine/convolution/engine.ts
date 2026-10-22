/**
 * Continuous-Time Convolution Math Engine.
 * Implements analytical piecewise convolution solvers for rectangular pulses,
 * exponential decays, triangular functions, step functions, and problem generator.
 */

import { sanitizeLatexMath } from "$lib/math-engine/formatting";
import { createRandomSeed } from "$lib/math-engine/random";
import type { SolutionStep } from "$lib/math-engine/types";
import {
	type ConvolutionProblemSelection,
	DEFAULT_CONVOLUTION_SELECTION,
	type ResolvedConvolutionSelection,
	resolveConvolutionSelection,
} from "./configuration";
import { solveConfiguredConvolution } from "./configured-solver";
import {
	buildConvolutionItsData,
	type ConvolutionItsData,
} from "./its-scaffolding/index";
import type {
	ConvolutionGenerationOptions,
	ConvolutionInterval,
} from "./types";

export type {
	ConvolutionAmplitudeSelection,
	ConvolutionParameterMode,
	ConvolutionProblemSelection,
	ConvolutionShiftState,
	ConvolutionShiftValueSelection,
	ConvolutionSignalSelection,
	ConvolutionSignalType,
	ConvolutionSignalTypeSelection,
	ResolvedConvolutionSelection,
	ResolvedConvolutionSignal,
} from "./configuration";
export {
	BEGINNER_RANDOM_CONVOLUTION_SIGNAL_SELECTION,
	CONVOLUTION_RANDOM_SIGNAL_TYPES,
	CONVOLUTION_SIGNAL_TYPES,
	DEFAULT_CONVOLUTION_SELECTION,
	resolveConvolutionSelection,
	resolveConvolutionSignal,
	TEXTBOOK_CONVOLUTION_SELECTION,
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
} from "./configuration";
export { solveConfiguredConvolution } from "./configured-solver";
export type {
	ConvolutionBreakpointContact,
	ConvolutionBreakpointPart,
	ConvolutionIntegralPathSetup,
	ConvolutionItsChoiceStep,
	ConvolutionItsData,
	ConvolutionItsIntervalPart,
	ConvolutionItsOption,
	ConvolutionItsTimingStep,
	ConvolutionItsTransitionStep,
	ConvolutionMovingSignal,
	ConvolutionOverlapBounds,
	ConvolutionTimingPart,
	ConvolutionTransformedSection,
	ConvolutionTransitionGroup,
} from "./its-scaffolding/index";
export {
	formatConvolutionScalar,
	getFiniteConvolutionTransitionTimes,
} from "./its-scaffolding/index";
export type {
	ConvolutionGenerationOptions,
	ConvolutionInterval,
	ConvolutionResult,
	ConvolutionSignalSection,
} from "./types";

/** Convolution problem metadata and evaluation */
export interface ConvolutionProblem {
	/** Unique identifier */
	id: string;
	/** Convolution pair classification category */
	pairType: string;
	/** Unsigned seed used to reproduce the problem. */
	seed: number;
	/** Title of problem */
	title: string;
	/** Input signal x(t) LaTeX representation */
	xLatex: string;
	/** Impulse response h(t) LaTeX representation */
	hLatex: string;
	/** Step-by-step solution breakdown */
	solutionSteps: SolutionStep[];
	/** Piecewise intervals */
	intervals: ConvolutionInterval[];
	/** Closed-form numerical evaluator y(t) */
	eval: (t: number) => number;
	/** Evaluator function for input signal x(tau) */
	evalX: (tau: number) => number;
	/** Evaluator function for impulse response h(tau) */
	evalH: (tau: number) => number;
	/** Support edges and interior breakpoints for the input signal. */
	xBreakpoints: number[];
	/** Support edges and interior breakpoints for the impulse response. */
	hBreakpoints: number[];
	/** Start and end edges for every connected input-signal section. */
	xSupportEdges: number[];
	/** Start and end edges for every connected impulse-response section. */
	hSupportEdges: number[];
	/** Time range [min, max] for visualization */
	timeRange: [number, number];
	/** Structured seven-step Intelligent Tutoring System data. */
	itsData: ConvolutionItsData;
	/** Independent selections used by the configured generator. */
	selection: ConvolutionProblemSelection;
	/** Concrete resolved signals used by the configured generator. */
	resolvedSignals: ResolvedConvolutionSelection;
	/** Number of finite transition regions shown before tutoring begins. */
	regionCount: number;
}

/** Convolution problem before its standardized tutor scaffold is attached. */
export type ConvolutionProblemSource = Omit<
	ConvolutionProblem,
	"itsData" | "xSupportEdges" | "hSupportEdges"
>;

/**
 * Attaches deterministic tutoring data to an exact convolution problem.
 *
 * @param problem - Analytical problem and interval result.
 * @returns Complete convolution problem with ITS scaffolding.
 */
export function withConvolutionItsData(
	problem: ConvolutionProblemSource,
): ConvolutionProblem {
	const intervals = problem.intervals.map((interval) => ({
		...interval,
		labelLatex: sanitizeLatexMath(interval.labelLatex),
		exprLatex: sanitizeLatexMath(interval.exprLatex),
	}));
	const { x, h } = problem.resolvedSignals;
	const xSections = x.sections;
	const hSections = h.sections;
	return {
		...problem,
		xLatex: sanitizeLatexMath(problem.xLatex),
		hLatex: sanitizeLatexMath(problem.hLatex),
		intervals,
		xSupportEdges: xSections.flatMap(({ start, end }) => [start, end]),
		hSupportEdges: hSections.flatMap(({ start, end }) => [start, end]),
		itsData: buildConvolutionItsData({
			seed: problem.seed,
			intervals,
			xSections,
			hSections,
			xBreakpoints: x.breakpoints,
			hBreakpoints: h.breakpoints,
			resolvedSignals: problem.resolvedSignals,
		}),
	};
}

/** @param kind - Resolved family. @returns Its learner-facing name. */
function configuredSignalName(
	kind: ResolvedConvolutionSelection["x"]["kind"],
): string {
	switch (kind) {
		case "rect":
			return "Rectangular Pulse";
		case "triangle":
			return "Triangular Pulse";
		case "multi_rect":
			return "Multiple Rectangular Pulses";
		case "exponential":
			return "Causal Exponential";
		case "step":
			return "Unit Step";
	}
}

/**
 * Generates one exact problem from independent x(t) and h(t) selections.
 * @param selection - Independently configured signal families and parameters.
 * @param options - Optional reproducible generation seed.
 * @returns Complete tutor problem with input and output animation bounds.
 */
export function generateConfiguredConvolutionProblem(
	selection: ConvolutionProblemSelection = DEFAULT_CONVOLUTION_SELECTION,
	options: ConvolutionGenerationOptions = {},
): ConvolutionProblem {
	const seed = options.seed ?? createRandomSeed();
	const resolvedSignals = resolveConvolutionSelection(selection, seed);
	const result = solveConfiguredConvolution(resolvedSignals);
	const finiteEdges = [
		...resolvedSignals.x.sections.flatMap(({ start, end }) => [start, end]),
		...resolvedSignals.h.sections.flatMap(({ start, end }) => [start, end]),
		...result.intervals.flatMap(({ min, max }) => [min, max]),
	].filter(Number.isFinite);
	const minimum = Math.min(...finiteEdges, -1);
	const maximum = Math.max(...finiteEdges, 1);
	const pairType = `${resolvedSignals.x.kind}_${resolvedSignals.h.kind}`;
	const configurationKey = [resolvedSignals.x, resolvedSignals.h]
		.map((signal) =>
			[
				signal.kind,
				signal.parameter,
				signal.shift,
				signal.amplitude,
				...(signal.componentAmplitudes ?? []),
			].join("_"),
		)
		.join("__");
	return withConvolutionItsData({
		id: `conv_configured_${seed >>> 0}_${configurationKey}`,
		seed,
		pairType,
		title: `${configuredSignalName(resolvedSignals.x.kind)} and ${configuredSignalName(resolvedSignals.h.kind)} Convolution`,
		xLatex: resolvedSignals.x.latex,
		hLatex: resolvedSignals.h.latex,
		solutionSteps: [
			{
				title: "Identify the Two Configured Signals",
				description:
					"Record each signal's exact support, breakpoints, amplitude, and translation.",
				latex: `x(t)=${resolvedSignals.x.latex},\\quad h(t)=${resolvedSignals.h.latex}`,
			},
			{
				title: "Build Every Geometric Overlap Region",
				description:
					"Add fixed and moving breakpoints, then integrate every connected overlap component.",
				latex: "y(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(t-\\tau)\\,d\\tau",
			},
			{
				title: "Combine Signed Contributions",
				description:
					"Add positive and negative component integrals before simplifying each region.",
				latex: result.intervals
					.map(
						(interval) =>
							`y(t)=${interval.exprLatex}\\quad(${interval.labelLatex})`,
					)
					.join(",\\quad "),
			},
		],
		intervals: result.intervals,
		eval: result.eval,
		evalX: result.evalX,
		evalH: result.evalH,
		xBreakpoints: resolvedSignals.x.breakpoints,
		hBreakpoints: resolvedSignals.h.breakpoints,
		timeRange: [minimum - 2, maximum + 4],
		selection,
		resolvedSignals,
		regionCount: result.intervals.length,
	});
}
