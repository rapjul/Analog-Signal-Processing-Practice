/**
 * Continuous-Time Convolution Math Engine.
 * Implements analytical piecewise convolution solvers for rectangular pulses,
 * exponential decays, triangular functions, step functions, and problem generator.
 */

import { sanitizeLatexMath } from "$lib/math-engine/formatting";
import {
	createRandomSeed,
	createSeededPrng,
	randomChoice,
	randomInt,
} from "$lib/math-engine/random";
import type { SolutionStep } from "$lib/math-engine/types";
import {
	type ConvolutionProblemSelection,
	DEFAULT_CONVOLUTION_SELECTION,
	type ResolvedConvolutionSelection,
	resolveConvolutionSelection,
} from "./configuration";
import { solveConfiguredConvolution } from "./configured-solver";
import { evalExpDecay, evalRect, evalTri } from "./evaluators";
import {
	solveExpExpConvolution,
	solveRectExpConvolution,
} from "./exponential-solvers";
import {
	buildConvolutionItsData,
	type ConvolutionItsData,
	type ConvolutionSignalSection,
} from "./its-scaffolding/index";
import { generateLegacyConvolutionProblem } from "./problem-generator";
import { formatRectPulseLatex } from "./pulse-formatting";
import {
	solveMultiRectConvolution,
	solveRectRectConvolution,
	solveShiftedRectConvolution,
} from "./rect-solvers";
import {
	solveStepExpConvolution,
	solveStepRectConvolution,
} from "./step-solvers";
import {
	solveShiftedTriTriConvolution,
	solveTriRectConvolution,
} from "./triangle-solvers";
import type {
	ConvolutionGenerationOptions,
	ConvolutionInterval,
	ConvolutionPairType,
	ConvolutionResult,
	ExpSignal,
	RectSignal,
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
	CONVOLUTION_SIGNAL_TYPES,
	DEFAULT_CONVOLUTION_SELECTION,
	DEFAULT_CONVOLUTION_SIGNAL_SELECTION,
	resolveConvolutionSelection,
	resolveConvolutionSignal,
	TEXTBOOK_CONVOLUTION_SELECTION,
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
} from "./configuration";
export { solveConfiguredConvolution } from "./configured-solver";
export { evalExpDecay, evalRect, evalTri } from "./evaluators";
export {
	solveExpExpConvolution,
	solveRectExpConvolution,
} from "./exponential-solvers";
export {
	solveMultiRectConvolution,
	solveRectRectConvolution,
	solveShiftedRectConvolution,
} from "./rect-solvers";
export {
	solveStepExpConvolution,
	solveStepRectConvolution,
} from "./step-solvers";
export {
	solveShiftedTriTriConvolution,
	solveTriRectConvolution,
} from "./triangle-solvers";
export type {
	ConvolutionGenerationOptions,
	ConvolutionInterval,
	ConvolutionPairType,
	ConvolutionResult,
	ConvolutionSignalSection,
	ExpSignal,
	RectSignal,
} from "./types";

/** Generates a seeded practice problem from the legacy category catalog. */
export function generateConvolutionProblem(
	pairType: ConvolutionPairType = "rect_rect",
	options: ConvolutionGenerationOptions = {},
): ConvolutionProblem {
	return generateLegacyConvolutionProblem(
		pairType,
		options,
		withConvolutionItsData,
	);
}
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
	xBreakpoints?: number[] | undefined;
	/** Support edges and interior breakpoints for the impulse response. */
	hBreakpoints?: number[] | undefined;
	/** Start and end edges for every connected input-signal section. */
	xSupportEdges: number[];
	/** Start and end edges for every connected impulse-response section. */
	hSupportEdges: number[];
	/** Time range [min, max] for visualization */
	timeRange?: [number, number] | undefined;
	/** Structured seven-step Intelligent Tutoring System data. */
	itsData: ConvolutionItsData;
	/** Independent selections used by the configured generator. */
	selection?: ConvolutionProblemSelection | undefined;
	/** Concrete resolved signals used by the configured generator. */
	resolvedSignals?: ResolvedConvolutionSelection | undefined;
	/** Number of finite transition regions shown before tutoring begins. */
	regionCount?: number | undefined;
}

/** Convolution problem before its standardized tutor scaffold is attached. */
export type ConvolutionProblemSource = Omit<
	ConvolutionProblem,
	"itsData" | "xSupportEdges" | "hSupportEdges"
> & {
	xSections?: ConvolutionSignalSection[];
	hSections?: ConvolutionSignalSection[];
};

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
		supportIntersectionLatex: interval.supportIntersectionLatex
			? sanitizeLatexMath(interval.supportIntersectionLatex)
			: undefined,
		integralSetupLatex: interval.integralSetupLatex
			? sanitizeLatexMath(interval.integralSetupLatex)
			: undefined,
		flipXSupportIntersectionLatex: interval.flipXSupportIntersectionLatex
			? sanitizeLatexMath(interval.flipXSupportIntersectionLatex)
			: undefined,
		flipXIntegralSetupLatex: interval.flipXIntegralSetupLatex
			? sanitizeLatexMath(interval.flipXIntegralSetupLatex)
			: undefined,
	}));
	const section = (
		id: string,
		start: number,
		end: number,
		startIncluded = true,
		endIncluded = false,
	) => ({ id, start, end, startIncluded, endIncluded });
	const xBreakpoints = problem.xBreakpoints ?? [0];
	const hBreakpoints = problem.hBreakpoints ?? [0];
	let xSections = problem.xSections ?? [
		section(
			"x-1",
			xBreakpoints[0] ?? 0,
			xBreakpoints.at(-1) ?? Number.POSITIVE_INFINITY,
		),
	];
	let hSections = problem.hSections ?? [
		section(
			"h-1",
			hBreakpoints[0] ?? 0,
			hBreakpoints.at(-1) ?? Number.POSITIVE_INFINITY,
		),
	];
	if (!problem.xSections || !problem.hSections)
		switch (problem.pairType) {
			case "multi_rect":
				xSections = [section("x-1", 0, 1), section("x-2", 3, 4)];
				hSections = [section("h-1", 0, 2)];
				break;
			case "rect_exp":
				hSections = [section("h-1", 0, Number.POSITIVE_INFINITY)];
				break;
			case "exp_exp":
			case "step_exp":
				xSections = [section("x-1", 0, Number.POSITIVE_INFINITY)];
				hSections = [section("h-1", 0, Number.POSITIVE_INFINITY)];
				break;
			case "step_rect":
				xSections = [section("x-1", 0, Number.POSITIVE_INFINITY)];
				break;
			case "tri_rect":
				xSections = [section("x-1", -2, 2, false, false)];
				hSections = [section("h-1", -1, 1)];
				break;
			case "tri_shifted_tri":
				xSections = [section("x-1", -2, 2, false, false)];
				hSections = [
					section(
						"h-1",
						hBreakpoints[0] ?? -2,
						hBreakpoints.at(-1) ?? 2,
						false,
						false,
					),
				];
				break;
			case "rect_rect":
			case "rect_shifted_rect":
			case "rect_both_shifted":
			case "bilateral_exp_rect":
				break;
			default:
				break;
		}
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
			xBreakpoints,
			hBreakpoints,
			resolvedSignals: problem.resolvedSignals,
		}),
	};
}

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
		xSections: resolvedSignals.x.sections,
		hSections: resolvedSignals.h.sections,
		timeRange: [minimum - 2, maximum + 4],
		selection,
		resolvedSignals,
		regionCount: result.intervals.length,
	});
}
