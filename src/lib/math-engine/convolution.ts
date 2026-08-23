/**
 * Continuous-Time Convolution Math Engine.
 * Implements analytical piecewise convolution solvers for rectangular pulses,
 * exponential decays, triangular functions, step functions, and problem generator.
 */

import {
	buildConvolutionItsData,
	type ConvolutionItsData,
} from "./convolution/its-scaffolding";
import {
	createRandomSeed,
	createSeededPrng,
	randomChoice,
	randomInt,
} from "./random";
import type { SolutionStep } from "./types";

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
	ConvolutionSignalSection,
	ConvolutionTimingPart,
	ConvolutionTransformedSection,
	ConvolutionTransitionGroup,
} from "./convolution/its-scaffolding";
export { getFiniteConvolutionTransitionTimes } from "./convolution/its-scaffolding";

/** Rectangular pulse signal parameters */
export interface RectSignal {
	/** Start time of pulse */
	tStart: number;
	/** Width of pulse */
	width: number;
	/** Amplitude height of pulse */
	height: number;
}

/** Exponential decay signal parameters K * exp(-a * t) * u(t) */
export interface ExpSignal {
	/** Decay rate parameter a > 0 */
	a: number;
	/** Scale coefficient K */
	K: number;
}

/** Piecewise convolution interval segment */
export interface ConvolutionInterval {
	/** LaTeX interval condition (e.g. "t < 0" or "0 \\le t < 2") */
	labelLatex: string;
	/** Minimum time threshold */
	min: number;
	/** Maximum time threshold */
	max: number;
	/** Piecewise formula in LaTeX */
	exprLatex: string;
	/** Exact active support intersection for this interval. */
	supportIntersectionLatex?: string;
	/** Exact unevaluated convolution integral for this interval. */
	integralSetupLatex?: string;
	/** Exact support intersection when x is the moving signal. */
	flipXSupportIntersectionLatex?: string;
	/** Exact integral setup when x is the moving signal. */
	flipXIntegralSetupLatex?: string;
	/** Numerical evaluator function for segment */
	eval: (t: number) => number;
}

/** Convolution result representation */
export interface ConvolutionResult {
	/** Convolution pair classification */
	pairType: string;
	/** List of piecewise intervals */
	intervals: ConvolutionInterval[];
	/** Overall numerical evaluation function y(t) = (x * h)(t) */
	eval: (t: number) => number;
	/** Evaluator function for x(tau) */
	evalX: (tau: number) => number;
	/** Evaluator function for h(tau) */
	evalH: (tau: number) => number;
}

/**
 * Supported continuous-time convolution signal pair categories for analytical solving.
 * Covers combinations of rectangular pulses, exponential decays, unit steps, and triangular signals.
 */
export type ConvolutionPairType =
	| "rect_rect" // Two rectangular pulses centered at zero
	| "rect_shifted_rect" // One centered and one shifted rectangular pulse
	| "rect_both_shifted" // Two shifted rectangular pulses
	| "multi_rect" // Multiple piecewise rectangular pulses
	| "rect_exp" // Rectangular pulse * Exponential decay
	| "exp_exp" // Exponential decay * Exponential decay
	| "tri_rect" // Triangular pulse * Rectangular pulse
	| "tri_shifted_tri" // Triangular pulse * Shifted triangular pulse
	| "step_exp" // Unit step * Exponential decay
	| "step_rect" // Unit step * Rectangular pulse
	| "bilateral_exp_rect"; // Bilateral exponential * Rectangular pulse

/** Convolution problem metadata and evaluation */
export interface ConvolutionProblem {
	/** Unique identifier */
	id: string;
	/** Convolution pair classification category */
	pairType: ConvolutionPairType;
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
	xBreakpoints?: number[];
	/** Support edges and interior breakpoints for the impulse response. */
	hBreakpoints?: number[];
	/** Start and end edges for every connected input-signal section. */
	xSupportEdges: number[];
	/** Start and end edges for every connected impulse-response section. */
	hSupportEdges: number[];
	/** Time range [min, max] for visualization */
	timeRange?: [number, number];
	/** Structured seven-step Intelligent Tutoring System data. */
	itsData: ConvolutionItsData;
}

/** Convolution problem before its standardized tutor scaffold is attached. */
type ConvolutionProblemSource = Omit<
	ConvolutionProblem,
	"itsData" | "xSupportEdges" | "hSupportEdges"
>;

/** Optional deterministic generation controls for convolution practice. */
export interface ConvolutionGenerationOptions {
	/** Unsigned seed used for every randomized parameter. */
	seed?: number;
}

/**
 * Attaches deterministic tutoring data to an exact convolution problem.
 *
 * @param problem - Analytical problem and interval result.
 * @returns Complete convolution problem with ITS scaffolding.
 */
function withConvolutionItsData(
	problem: ConvolutionProblemSource,
): ConvolutionProblem {
	const section = (
		id: string,
		start: number,
		end: number,
		startIncluded = true,
		endIncluded = false,
	) => ({ id, start, end, startIncluded, endIncluded });
	const xBreakpoints = problem.xBreakpoints ?? [0];
	const hBreakpoints = problem.hBreakpoints ?? [0];
	let xSections = [
		section(
			"x-1",
			xBreakpoints[0] ?? 0,
			xBreakpoints.at(-1) ?? Number.POSITIVE_INFINITY,
		),
	];
	let hSections = [
		section(
			"h-1",
			hBreakpoints[0] ?? 0,
			hBreakpoints.at(-1) ?? Number.POSITIVE_INFINITY,
		),
	];
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
		default: {
			const unhandledType: never = problem.pairType;
			throw new Error(`Unknown convolution pair type: ${unhandledType}`);
		}
	}
	return {
		...problem,
		xSupportEdges: xSections.flatMap(({ start, end }) => [start, end]),
		hSupportEdges: hSections.flatMap(({ start, end }) => [start, end]),
		itsData: buildConvolutionItsData({
			intervals: problem.intervals,
			xSections,
			hSections,
			xBreakpoints,
			hBreakpoints,
		}),
	};
}

/**
 * Solves unit step response u(t) * K exp(-a t) u(t).
 * @param {ExpSignal} exp Exponential signal parameters
 * @returns {ConvolutionResult} ConvolutionResult object
 */
export function solveStepExpConvolution(exp: ExpSignal): ConvolutionResult {
	const { a, K } = exp;
	const evalFn = (t: number): number => {
		if (t < 0) return 0;
		return (K / a) * (1 - Math.exp(-a * t));
	};

	return {
		pairType: "step_exp",
		intervals: [
			{
				labelLatex: "t < 0",
				min: Number.NEGATIVE_INFINITY,
				max: 0,
				exprLatex: "0",
				eval: (): number => 0,
			},
			{
				labelLatex: "t \\ge 0",
				min: 0,
				max: Number.POSITIVE_INFINITY,
				exprLatex: `\\frac{${K}}{${a}}\\left(1 - e^{-${a}t}\\right)`,
				eval: evalFn,
			},
		],
		eval: evalFn,
		evalX: (tau: number) => (tau >= 0 ? 1 : 0),
		evalH: (tau: number) => evalExpDecay(tau, a, K),
	};
}

/**
 * Solves unit step response u(t) * rect(t / W).
 * @param {number} width Rectangular pulse width
 * @returns {ConvolutionResult} ConvolutionResult object
 */
export function solveStepRectConvolution(width: number): ConvolutionResult {
	const evalFn = (t: number): number => {
		if (t < 0) return 0;
		if (t < width) return t;
		return width;
	};

	return {
		pairType: "step_rect",
		intervals: [
			{
				labelLatex: "t < 0",
				min: Number.NEGATIVE_INFINITY,
				max: 0,
				exprLatex: "0",
				eval: (): number => 0,
			},
			{
				labelLatex: `0 \\le t < ${width}`,
				min: 0,
				max: width,
				exprLatex: "t",
				eval: (t: number) => Math.max(0, t),
			},
			{
				labelLatex: `t \\ge ${width}`,
				min: width,
				max: Number.POSITIVE_INFINITY,
				exprLatex: `${width}`,
				eval: (): number => width,
			},
		],
		eval: evalFn,
		evalX: (tau: number) => (tau >= 0 ? 1 : 0),
		evalH: (tau: number) => evalRect(tau, 0, width, 1),
	};
}

/**
 * Generates a randomized Continuous-Time Convolution problem for practice.
 *
 * Mathematical derivation process:
 * 1. Randomizes pulse widths W1, W2, start times tStart, and decay rates a to yield well-behaved
 *    piecewise interval boundary points (t = 0, t = W1, t = W2, t = W1 + W2).
 * 2. Evaluates analytical convolution integral y(t) = (x * h)(t) = \int_{-\infty}^{\infty} x(\tau) h(t - \tau) d\tau
 *    by performing flip-and-shift operations on h(\tau) -> h(t - \tau).
 * 3. Builds granular solution steps detailing overlap region transitions (No Overlap, Growing Overlap, Plateau, Receding Overlap).
 *
 * @param {ConvolutionPairType} pairType Signal pair category key
 * @returns {ConvolutionProblem} Complete practice problem instance
 */
export function generateConvolutionProblem(
	pairType: ConvolutionPairType = "rect_rect",
	options: ConvolutionGenerationOptions = {},
): ConvolutionProblem {
	const seed = options.seed ?? createRandomSeed();
	const random = createSeededPrng(seed);
	const id = `conv_${pairType}_${seed >>> 0}`;

	switch (pairType) {
		case "rect_rect": {
			const w1 = randomInt(random, 1, 2);
			const w2 = w1 + randomInt(random, 1, 2);
			const h1 = 1;
			const h2 = randomInt(random, 1, 2);

			const rect1: RectSignal = {
				tStart: -w1 / 2,
				width: w1,
				height: h1,
			};
			const rect2: RectSignal = {
				tStart: -w2 / 2,
				width: w2,
				height: h2,
			};
			const res = solveRectRectConvolution(rect1, rect2);

			const xLatex = `\\operatorname{rect}\\left(\\frac{t}{${w1}}\\right)`;
			const hLatex =
				h2 === 1
					? `\\operatorname{rect}\\left(\\frac{t}{${w2}}\\right)`
					: `${h2} \\operatorname{rect}\\left(\\frac{t}{${w2}}\\right)`;
			const firstContact = -(w1 + w2) / 2;
			const fullOverlapStart = firstContact + w1;
			const fullOverlapEnd = firstContact + w2;
			const finalContact = (w1 + w2) / 2;

			const steps: SolutionStep[] = [
				{
					title: "Flip & Shift Transformation",
					description:
						"Flip $h(\\tau)$ to $h(-\\tau)$ and shift by $t$ to obtain $h(t - \\tau)$.",
					latex: "y(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) d\\tau",
				},
				{
					title: "Identify Region 1 (No Overlap)",
					description: `For $t < ${firstContact}$, there is zero signal overlap area.`,
					latex: `y(t) = 0 \\quad (t < ${firstContact})`,
				},
				{
					title: "Identify Region 2 (Partial Overlap)",
					description: `For $${firstContact} \\le t < ${fullOverlapStart}$, overlap area increases linearly.`,
					latex: `y(t) = ${res.intervals[1]?.exprLatex ?? "0"}`,
				},
				{
					title: "Identify Region 3 (Full Overlap)",
					description: `For $${fullOverlapStart} \\le t < ${fullOverlapEnd}$, overlap area plateaus at maximum value.`,
					latex: `y(t) = ${res.intervals[2]?.exprLatex ?? h2 * w1}`,
				},
				{
					title: "Identify Region 4 (Receding Overlap)",
					description: `For $${fullOverlapEnd} \\le t < ${finalContact}$, overlap area decreases linearly to $0$.`,
					latex: `y(t) = ${res.intervals.at(-2)?.exprLatex ?? "0"}`,
				},
			];

			return withConvolutionItsData({
				id,
				seed,
				pairType: "rect_rect",
				title: "Rectangular Pulse Convolution",
				xLatex,
				hLatex,
				solutionSteps: steps,
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				xBreakpoints: [-w1 / 2, w1 / 2],
				hBreakpoints: [-w2 / 2, w2 / 2],
				timeRange: [firstContact - 2, finalContact + 2],
			});
		}
		case "rect_shifted_rect": {
			const w1 = randomInt(random, 1, 2);
			const w2 = w1 + randomInt(random, 1, 2);
			const tShift = randomInt(random, 1, 2);
			const rect1: RectSignal = {
				tStart: -w1 / 2,
				width: w1,
				height: 1,
			};
			const rect2: RectSignal = {
				tStart: tShift - w2 / 2,
				width: w2,
				height: 1,
			};
			const res = solveRectRectConvolution(rect1, rect2);

			const xLatex = `\\operatorname{rect}\\left(\\frac{t}{${w1}}\\right)`;
			const hLatex = `\\operatorname{rect}\\left(\\frac{t - ${tShift}}{${w2}}\\right)`;
			const firstContact = tShift - (w1 + w2) / 2;
			const finalContact = tShift + (w1 + w2) / 2;

			const steps: SolutionStep[] = [
				{
					title: "Flip & Shift Transformation",
					description: `The centered pulse $x(\\tau)$ remains fixed while the pulse $h(\\tau)$ centered at $${tShift}$ is flipped and shifted to $h(t - \\tau)$.`,
					latex: "y(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) d\\tau",
				},
				{
					title: "Region 1 (No Overlap)",
					description: `For $t < ${firstContact}$, there is zero overlap.`,
					latex: `y(t) = 0 \\quad (t < ${firstContact})`,
				},
				{
					title: "Region 2 (Linear Growth)",
					description: `Overlap grows linearly from $t = ${firstContact}$.`,
					latex: `y(t) = ${res.intervals[1]?.exprLatex ?? "0"}`,
				},
				{
					title: "Region 3 (Plateau / Peak)",
					description: "Maximum overlap area achieved.",
					latex: `y(t) = ${Math.min(w1, w2)}`,
				},
				{
					title: "Region 4 (Receding Edge)",
					description: `Receding overlap returns to zero at $t = ${finalContact}$.`,
					latex: `y(t) = ${res.intervals.at(-2)?.exprLatex ?? "0"}`,
				},
			];

			return withConvolutionItsData({
				id,
				seed,
				pairType: "rect_shifted_rect",
				title: "Shifted Rect Pulse Convolution",
				xLatex,
				hLatex,
				solutionSteps: steps,
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				xBreakpoints: [-w1 / 2, w1 / 2],
				hBreakpoints: [tShift - w2 / 2, tShift + w2 / 2],
				timeRange: [firstContact - 2, finalContact + 2],
			});
		}
		case "rect_both_shifted": {
			const w1 = randomInt(random, 1, 2);
			const w2 = w1 + randomInt(random, 1, 2);
			const xShift = randomInt(random, 1, 2);
			const hShift = xShift + randomInt(random, 1, 2);
			const rect1: RectSignal = {
				tStart: xShift - w1 / 2,
				width: w1,
				height: 1,
			};
			const rect2: RectSignal = {
				tStart: hShift - w2 / 2,
				width: w2,
				height: 1,
			};
			const res = solveRectRectConvolution(rect1, rect2);
			const firstContact = xShift + hShift - (w1 + w2) / 2;
			const finalContact = xShift + hShift + (w1 + w2) / 2;

			return withConvolutionItsData({
				id,
				seed,
				pairType: "rect_both_shifted",
				title: "Two Shifted Rectangular Pulses Convolution",
				xLatex: `\\operatorname{rect}\\left(\\frac{t - ${xShift}}{${w1}}\\right)`,
				hLatex: `\\operatorname{rect}\\left(\\frac{t - ${hShift}}{${w2}}\\right)`,
				solutionSteps: [
					{
						title: "Flip & Shift Transformation",
						description: `The pulse centers are $${xShift}$ and $${hShift}$. Their convolution is centered at their sum, $${xShift + hShift}$.`,
						latex: "y(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) d\\tau",
					},
					{
						title: "Identify First Contact",
						description: `The shifted pulses first overlap at $t = ${firstContact}$.`,
						latex: `y(t)=0 \\quad (t<${firstContact})`,
					},
					{
						title: "Build the Trapezoid",
						description:
							"The overlap grows, reaches a plateau because the widths differ, and then recedes.",
						latex: `y(t)=${res.intervals[1]?.exprLatex ?? "0"},\\ldots,${res.intervals.at(-2)?.exprLatex ?? "0"}`,
					},
					{
						title: "Identify Final Contact",
						description: `The overlap ends at $t = ${finalContact}$.`,
						latex: `y(t)=0 \\quad (t\\ge ${finalContact})`,
					},
				],
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				xBreakpoints: [xShift - w1 / 2, xShift + w1 / 2],
				hBreakpoints: [hShift - w2 / 2, hShift + w2 / 2],
				timeRange: [firstContact - 2, finalContact + 2],
			});
		}
		case "multi_rect": {
			const res = solveMultiRectConvolution();
			const xLatex =
				"\\operatorname{rect}\\left(t - 0.5\\right) + \\operatorname{rect}\\left(t - 3.5\\right)";
			const hLatex =
				"\\operatorname{rect}\\left(\\frac{t - 1}{2}\\right)";

			const steps: SolutionStep[] = [
				{
					title: "Superposition Principle",
					description:
						"Convolve $x(t) = x_1(t) + x_2(t)$ separately with $h(t)$ using linearity.",
					latex: "y(t) = (x_1 * h)(t) + (x_2 * h)(t)",
				},
				{
					title: "Convolve First Pulse",
					description:
						"$\\operatorname{rect}(t - 0.5) * \\operatorname{rect}((t - 1)/2)$ produces a trapezoid in $[0, 3]$.",
					latex: "y_1(t) = \\text{trapezoid in } [0, 3]",
				},
				{
					title: "Convolve Second Pulse",
					description:
						"$\\operatorname{rect}(t - 3.5) * \\operatorname{rect}((t - 1)/2)$ produces an identical trapezoid shifted to $[3, 6]$.",
					latex: "y_2(t) = \\text{trapezoid in } [3, 6]",
				},
			];

			return withConvolutionItsData({
				id,
				seed,
				pairType: "multi_rect",
				title: "Multi-Rect Pulse Array Convolution",
				xLatex,
				hLatex,
				solutionSteps: steps,
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				xBreakpoints: [0, 1, 3, 4],
				hBreakpoints: [0, 2],
				timeRange: [-1, 7],
			});
		}
		case "rect_exp": {
			const w = randomInt(random, 1, 2);
			const a = randomInt(random, 1, 3);
			const rect: RectSignal = { tStart: 0, width: w, height: 1 };
			const expSignal: ExpSignal = { a, K: 1 };

			const res = solveRectExpConvolution(rect, expSignal);
			const xLatex = `\\operatorname{rect}\\left(\\frac{t - ${w / 2}}{${w}}\\right)`;
			const hLatex = `e^{-${a}t} u(t)`;

			const steps: SolutionStep[] = [
				{
					title: "Flip & Shift Transformation",
					description: `Flip $h(\\tau)$ to $h(t - \\tau) = e^{-${a}(t - \\tau)} u(t - \\tau)$.`,
					latex: "y(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) d\\tau",
				},
				{
					title: "Region 1 (t < 0)",
					description:
						"No overlap between pulse and exponential decay.",
					latex: "y(t) = 0",
				},
				{
					title: "Region 2 (0 <= t < w)",
					description: `Integration interval is $\\tau \\in [0, t]$.`,
					latex: `y(t) = \\int_0^t e^{-${a}(t - \\tau)} d\\tau = \\frac{1}{${a}}\\left(1 - e^{-${a}t}\\right)`,
				},
				{
					title: "Region 3 (t >= w)",
					description: `Integration interval is $\\tau \\in [0, ${w}]$.`,
					latex: `y(t) = \\int_0^{${w}} e^{-${a}(t - \\tau)} d\\tau = \\frac{1}{${a}}\\left(e^{-${a}(t - ${w})} - e^{-${a}t}\\right)`,
				},
			];

			return withConvolutionItsData({
				id,
				seed,
				pairType: "rect_exp",
				title: "Pulse-Exponential Convolution",
				xLatex,
				hLatex,
				solutionSteps: steps,
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				xBreakpoints: [0, w],
				hBreakpoints: [0],
				timeRange: [-2, w + 4],
			});
		}
		case "exp_exp": {
			const a1 = randomInt(random, 1, 2);
			const a2 = a1 + randomInt(random, 1, 2);
			const exp1: ExpSignal = { a: a1, K: 1 };
			const exp2: ExpSignal = { a: a2, K: 1 };

			const res = solveExpExpConvolution(exp1, exp2);
			const xLatex = `e^{-${a1}t} u(t)`;
			const hLatex = `e^{-${a2}t} u(t)`;

			const steps: SolutionStep[] = [
				{
					title: "Integral Setup",
					description:
						"Set up the convolution integral for $t \\ge 0$.",
					latex: `y(t) = \\int_0^t e^{-${a1}\\tau} e^{-${a2}(t - \\tau)} d\\tau`,
				},
				{
					title: "Factor Out Common Terms",
					description: "Factor out terms not depending on $\\tau$.",
					latex: `y(t) = e^{-${a2}t} \\int_0^t e^{(${a2} - ${a1})\\tau} d\\tau`,
				},
				{
					title: "Evaluate Definite Integral",
					description: "Integrate and simplify final response.",
					latex: `y(t) = \\frac{1}{${a2 - a1}}\\left(e^{-${a1}t} - e^{-${a2}t}\\right) u(t)`,
				},
			];

			return withConvolutionItsData({
				id,
				seed,
				pairType: "exp_exp",
				title: "Exponential-Exponential Convolution",
				xLatex,
				hLatex,
				solutionSteps: steps,
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				xBreakpoints: [0],
				hBreakpoints: [0],
				timeRange: [-1, 6],
			});
		}
		case "step_exp": {
			const a = randomInt(random, 1, 3);
			const res = solveStepExpConvolution({ a, K: 1 });
			const xLatex = "u(t)";
			const hLatex = `e^{-${a}t} u(t)`;

			return withConvolutionItsData({
				id,
				seed,
				pairType: "step_exp",
				title: "Unit Step Response of Exponential System",
				xLatex,
				hLatex,
				solutionSteps: [
					{
						title: "Integral Setup for Step Input",
						description:
							"Convolve $u(t)$ with exponential impulse response.",
						latex: `y(t) = \\int_0^t e^{-${a}\\tau} d\\tau \\quad (t \\ge 0)`,
					},
					{
						title: "Evaluate Step Response Integral",
						description: "Integrate from $0$ to $t$.",
						latex: `y(t) = \\frac{1}{${a}}\\left(1 - e^{-${a}t}\\right) u(t)`,
					},
				],
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				xBreakpoints: [0],
				hBreakpoints: [0],
				timeRange: [-1, 6],
			});
		}
		case "step_rect": {
			const w = randomInt(random, 1, 3);
			const res = solveStepRectConvolution(w);
			const xLatex = "u(t)";
			const hLatex = `\\operatorname{rect}\\left(\\frac{t - ${w / 2}}{${w}}\\right)`;

			return withConvolutionItsData({
				id,
				seed,
				pairType: "step_rect",
				title: "Unit Step Response of Rectangular Pulse System",
				xLatex,
				hLatex,
				solutionSteps: [
					{
						title: "Integrate Pulse Over Moving Limit",
						description: `For $0 \\le t < ${w}$, $y(t)$ integrates to $t$.`,
						latex: "y(t) = t",
					},
					{
						title: "Plateau for t >= w",
						description: `For $t \\ge ${w}$, full pulse is integrated yielding total area $${w}$.`,
						latex: `y(t) = ${w}`,
					},
				],
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				xBreakpoints: [0],
				hBreakpoints: [0, w],
				timeRange: [-1, w + 4],
			});
		}
		case "tri_rect": {
			const res = solveTriRectConvolution();
			return withConvolutionItsData({
				id,
				seed,
				pairType,
				title: "Triangular and Rectangular Pulse Convolution",
				xLatex: "\\operatorname{tri}(t/2)",
				hLatex: "\\operatorname{rect}(t/2)",
				solutionSteps: [
					{
						title: "Include the Triangle Apex",
						description:
							"Treat the apex at $t=0$ as an interior breakpoint when forming transition times.",
						latex: "t\\in\\{-3,-1,1,3\\}",
					},
					{
						title: "Split the Central Integral",
						description:
							"Split at the triangle apex whenever the rectangular window crosses both slopes.",
						latex: "y(t)=\\int_{t-1}^{0}\\left(1+\\frac{\\tau}{2}\\right)d\\tau+\\int_0^{t+1}\\left(1-\\frac{\\tau}{2}\\right)d\\tau",
					},
				],
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				xBreakpoints: [-2, 0, 2],
				hBreakpoints: [-1, 1],
				timeRange: [-4, 4],
			});
		}
		case "tri_shifted_tri": {
			const shift = randomChoice(random, [-2, -1, 1, 2] as const);
			const res = solveShiftedTriTriConvolution(shift);
			return withConvolutionItsData({
				id,
				seed,
				pairType,
				title: "Triangle and Shifted Triangle Convolution",
				xLatex: "\\operatorname{tri}(t/2)",
				hLatex: `\\operatorname{tri}\\left(\\frac{t-${shift}}{2}\\right)`,
				solutionSteps: [
					{
						title: "Find Edge and Apex Contacts",
						description:
							"Combine both support edges and both triangle apexes before forming the intervals.",
						latex: `t\\in\\{${shift - 4},${shift - 2},${shift},${shift + 2},${shift + 4}\\}`,
					},
					{
						title: "Evaluate the Piecewise Cubics",
						description:
							"Split each overlap whenever the moving apex crosses an edge or the fixed apex.",
						latex: "z=t-s,\\quad y(t)=(\\operatorname{tri}*\\operatorname{tri})(z)",
					},
				],
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				xBreakpoints: [-2, 0, 2],
				hBreakpoints: [shift - 2, shift, shift + 2],
				timeRange: [shift - 5, shift + 5],
			});
		}
		case "bilateral_exp_rect": {
			// Retain the legacy hidden fallback until an exact mode is specified.
			const rect1: RectSignal = { tStart: 0, width: 2, height: 1 };
			const rect2: RectSignal = { tStart: 0, width: 2, height: 1 };
			const res = solveRectRectConvolution(rect1, rect2);
			return withConvolutionItsData({
				id,
				seed,
				pairType,
				title: "Triangular Pulse Convolution",
				xLatex: "\\operatorname{tri}(t/2)",
				hLatex: "\\operatorname{rect}(t/2)",
				solutionSteps: [
					{
						title: "Piecewise Convolution Setup",
						description:
							"Integrate overlapping triangular and rectangular pulse regions.",
						latex: "y(t) = (\\operatorname{tri} * \\operatorname{rect})(t)",
					},
				],
				intervals: res.intervals,
				eval: res.eval,
				evalX: res.evalX,
				evalH: res.evalH,
				timeRange: [-2, 6],
			});
		}
		default: {
			const unhandledType: never = pairType;
			throw new Error(`Unknown convolution pair type: ${unhandledType}`);
		}
	}
}

/**
 * Evaluates rectangular pulse signal rect( (t - tStart - width/2) / width ).
 * @param {number} t Time sample point
 * @param {number} tStart Start time of pulse
 * @param {number} width Width of pulse
 * @param {number} height Pulse amplitude
 * @returns {number} Signal value
 */
export function evalRect(
	t: number,
	tStart: number,
	width: number,
	height: number,
): number {
	const tEnd = tStart + width;
	if (t >= tStart && t < tEnd) {
		return height;
	}
	return 0;
}

/**
 * Evaluates causal exponential decay K * exp(-a * t) * u(t).
 * @param {number} t Time sample point
 * @param {number} a Decay rate a > 0
 * @param {number} K Amplitude multiplier
 * @returns {number} Signal value
 */
export function evalExpDecay(t: number, a: number, K: number): number {
	if (t < 0) {
		return 0;
	}
	return K * Math.exp(-a * t);
}

/**
 * Evaluates symmetric triangular pulse centered at tCenter.
 * @param {number} t Time sample point
 * @param {number} tCenter Center time of triangular peak
 * @param {number} width Total base width of triangle
 * @param {number} height Peak height of triangle
 * @returns {number} Signal value
 */
export function evalTri(
	t: number,
	tCenter: number,
	width: number,
	height: number,
): number {
	const halfWidth = width / 2;
	const dist = Math.abs(t - tCenter);
	if (dist >= halfWidth) {
		return 0;
	}
	return height * (1 - dist / halfWidth);
}

/** Solves the exact convolution of `tri(t/2)` and `rect(t/2)`. */
export function solveTriRectConvolution(): ConvolutionResult {
	const evalFn = (t: number): number => {
		if (t < -3 || t >= 3) return 0;
		if (t < -1) return ((t + 3) * (t + 3)) / 4;
		if (t < 1) return (3 - t * t) / 2;
		return ((t - 3) * (t - 3)) / 4;
	};
	const intervals: ConvolutionInterval[] = [
		{
			labelLatex: "t < -3",
			min: Number.NEGATIVE_INFINITY,
			max: -3,
			exprLatex: "0",
			supportIntersectionLatex: "\\varnothing",
			integralSetupLatex: "y(t)=0",
			flipXSupportIntersectionLatex: "\\varnothing",
			flipXIntegralSetupLatex: "y(t)=0",
			eval: () => 0,
		},
		{
			labelLatex: "-3 \\le t < -1",
			min: -3,
			max: -1,
			exprLatex: "\\frac{(t+3)^2}{4}",
			supportIntersectionLatex: "[-2,t+1]",
			integralSetupLatex:
				"y(t)=\\int_{-2}^{t+1}\\left(1+\\frac{\\tau}{2}\\right)d\\tau",
			flipXSupportIntersectionLatex: "[-1,t+2]",
			flipXIntegralSetupLatex:
				"y(t)=\\int_{-1}^{t+2}\\left(1+\\frac{t-\\tau}{2}\\right)d\\tau",
			eval: evalFn,
		},
		{
			labelLatex: "-1 \\le t < 1",
			min: -1,
			max: 1,
			exprLatex: "\\frac{3-t^2}{2}",
			supportIntersectionLatex: "[t-1,t+1]",
			integralSetupLatex:
				"y(t)=\\int_{t-1}^{0}\\left(1+\\frac{\\tau}{2}\\right)d\\tau+\\int_0^{t+1}\\left(1-\\frac{\\tau}{2}\\right)d\\tau",
			flipXSupportIntersectionLatex: "[-1,1]",
			flipXIntegralSetupLatex:
				"y(t)=\\int_{-1}^{t}\\left(1-\\frac{t-\\tau}{2}\\right)d\\tau+\\int_t^1\\left(1+\\frac{t-\\tau}{2}\\right)d\\tau",
			eval: evalFn,
		},
		{
			labelLatex: "1 \\le t < 3",
			min: 1,
			max: 3,
			exprLatex: "\\frac{(t-3)^2}{4}",
			supportIntersectionLatex: "[t-1,2]",
			integralSetupLatex:
				"y(t)=\\int_{t-1}^{2}\\left(1-\\frac{\\tau}{2}\\right)d\\tau",
			flipXSupportIntersectionLatex: "[t-2,1]",
			flipXIntegralSetupLatex:
				"y(t)=\\int_{t-2}^{1}\\left(1-\\frac{t-\\tau}{2}\\right)d\\tau",
			eval: evalFn,
		},
		{
			labelLatex: "t \\ge 3",
			min: 3,
			max: Number.POSITIVE_INFINITY,
			exprLatex: "0",
			supportIntersectionLatex: "\\varnothing",
			integralSetupLatex: "y(t)=0",
			flipXSupportIntersectionLatex: "\\varnothing",
			flipXIntegralSetupLatex: "y(t)=0",
			eval: () => 0,
		},
	];
	return {
		pairType: "tri_rect",
		intervals,
		eval: evalFn,
		evalX: (tau) => evalTri(tau, 0, 4, 1),
		evalH: (tau) => evalRect(tau, -1, 2, 1),
	};
}

/** Solves two identical triangular pulses when the second is shifted by `shift`. */
export function solveShiftedTriTriConvolution(
	shift: number,
): ConvolutionResult {
	const evalFn = (t: number): number => {
		const z = t - shift;
		if (z < -4 || z >= 4) return 0;
		if (z < -2) return ((z + 4) * (z + 4) * (z + 4)) / 24;
		if (z < 0) return 4 / 3 - (z * z) / 2 - (z * z * z) / 8;
		if (z < 2) return 4 / 3 - (z * z) / 2 + (z * z * z) / 8;
		return ((4 - z) * (4 - z) * (4 - z)) / 24;
	};
	const boundaries = [shift - 4, shift - 2, shift, shift + 2, shift + 4];
	const expressions = [
		"0",
		`\\frac{(t-${shift}+4)^3}{24}`,
		`\\frac{4}{3}-\\frac{(t-${shift})^2}{2}-\\frac{(t-${shift})^3}{8}`,
		`\\frac{4}{3}-\\frac{(t-${shift})^2}{2}+\\frac{(t-${shift})^3}{8}`,
		`\\frac{(${shift}+4-t)^3}{24}`,
		"0",
	];
	const intervals: ConvolutionInterval[] = expressions.map(
		(exprLatex, index) => ({
			labelLatex:
				index === 0
					? `t < ${boundaries[0]}`
					: index === expressions.length - 1
						? `t \\ge ${boundaries.at(-1)}`
						: `${boundaries[index - 1]} \\le t < ${boundaries[index]}`,
			min:
				index === 0
					? Number.NEGATIVE_INFINITY
					: (boundaries[index - 1] ?? Number.NEGATIVE_INFINITY),
			max:
				index === expressions.length - 1
					? Number.POSITIVE_INFINITY
					: (boundaries[index] ?? Number.POSITIVE_INFINITY),
			exprLatex,
			supportIntersectionLatex:
				exprLatex === "0"
					? "\\varnothing"
					: `[-2,2]\\cap[t-${shift}-2,t-${shift}+2]`,
			integralSetupLatex:
				exprLatex === "0"
					? "y(t)=0"
					: `y(t)=\\int_{\\max(-2,t-${shift}-2)}^{\\min(2,t-${shift}+2)}\\operatorname{tri}(\\tau/2)\\operatorname{tri}((t-\\tau-${shift})/2)\\,d\\tau`,
			flipXSupportIntersectionLatex:
				exprLatex === "0"
					? "\\varnothing"
					: `[${shift - 2},${shift + 2}]\\cap[t-2,t+2]`,
			flipXIntegralSetupLatex:
				exprLatex === "0"
					? "y(t)=0"
					: `y(t)=\\int_{\\max(${shift - 2},t-2)}^{\\min(${shift + 2},t+2)}\\operatorname{tri}((\\tau-${shift})/2)\\operatorname{tri}((t-\\tau)/2)\\,d\\tau`,
			eval: exprLatex === "0" ? () => 0 : evalFn,
		}),
	);
	return {
		pairType: "tri_shifted_tri",
		intervals,
		eval: evalFn,
		evalX: (tau) => evalTri(tau, 0, 4, 1),
		evalH: (tau) => evalTri(tau, shift, 4, 1),
	};
}

/**
 * Solves continuous-time analytical convolution of two rectangular pulses rect1 * rect2.
 * @param {RectSignal} rect1 First rectangular pulse signal x(t)
 * @param {RectSignal} rect2 Second rectangular pulse signal h(t)
 * @returns {ConvolutionResult} Analytical piecewise convolution result
 */
export function solveRectRectConvolution(
	rect1: RectSignal,
	rect2: RectSignal,
): ConvolutionResult {
	const T1 = Math.min(rect1.width, rect2.width);
	const T2 = Math.max(rect1.width, rect2.width);
	const H = rect1.height * rect2.height;

	const t0 = rect1.tStart + rect2.tStart;
	const t1 = t0 + T1;
	const t2 = t0 + T2;
	const t3 = t0 + T1 + T2;
	const risingFactor =
		t0 === 0 ? "t" : t0 > 0 ? `t - ${t0}` : `t + ${Math.abs(t0)}`;
	const fallingFactor =
		t3 === 0 ? "-t" : t3 > 0 ? `${t3} - t` : `-${Math.abs(t3)} - t`;
	const scaleFactor = (factor: string): string =>
		H === 1 ? factor : `${H}\\left(${factor}\\right)`;

	const intervals: ConvolutionInterval[] = [
		{
			labelLatex: `t < ${t0}`,
			min: Number.NEGATIVE_INFINITY,
			max: t0,
			exprLatex: "0",
			eval: (): number => 0,
		},
		{
			labelLatex: `${t0} \\le t < ${t1}`,
			min: t0,
			max: t1,
			exprLatex: scaleFactor(risingFactor),
			eval: (t: number): number => H * (t - t0),
		},
	];

	if (T1 !== T2) {
		intervals.push({
			labelLatex: `${t1} \\le t < ${t2}`,
			min: t1,
			max: t2,
			exprLatex: `${H * T1}`,
			eval: (): number => H * T1,
		});
	}

	intervals.push(
		{
			labelLatex: `${t2} \\le t < ${t3}`,
			min: t2,
			max: t3,
			exprLatex: scaleFactor(fallingFactor),
			eval: (t: number): number => H * (t3 - t),
		},
		{
			labelLatex: `t \\ge ${t3}`,
			min: t3,
			max: Number.POSITIVE_INFINITY,
			exprLatex: "0",
			eval: (): number => 0,
		},
	);

	const evalFn = (t: number): number => {
		if (t < t0 || t >= t3) return 0;
		if (t < t1) return H * (t - t0);
		if (t < t2) return H * T1;
		return H * (t3 - t);
	};

	return {
		pairType: "rect_rect",
		intervals,
		eval: evalFn,
		evalX: (tau: number) =>
			evalRect(tau, rect1.tStart, rect1.width, rect1.height),
		evalH: (tau: number) =>
			evalRect(tau, rect2.tStart, rect2.width, rect2.height),
	};
}

/**
 * Solves convolution of Rectangular pulse x(t) and Shifted Rectangular pulse h(t) = rect((t - t0 - W2/2)/W2).
 * Resulting output y(t) is a trapezoid.
 * @param {RectSignal} rect1 Base rectangle pulse x(t) in [0, W1]
 * @param {RectSignal} rect2 Shifted rectangle pulse h(t) in [tShift, tShift + W2]
 * @returns {ConvolutionResult} Analytical piecewise result
 */
export function solveShiftedRectConvolution(
	rect1: RectSignal,
	rect2: RectSignal,
): ConvolutionResult {
	const w1 = rect1.width;
	const w2 = rect2.width;
	const tShift = rect2.tStart;
	const h = rect1.height * rect2.height;

	const T1 = Math.min(w1, w2);
	const T2 = Math.max(w1, w2);

	const t0 = tShift;
	const t1 = tShift + T1;
	const t2 = tShift + T2;
	const t3 = tShift + w1 + w2;

	const intervals: ConvolutionInterval[] = [
		{
			labelLatex: `t < ${t0}`,
			min: Number.NEGATIVE_INFINITY,
			max: t0,
			exprLatex: "0",
			eval: (): number => 0,
		},
		{
			labelLatex: `${t0} \\le t < ${t1}`,
			min: t0,
			max: t1,
			exprLatex: `${h}(t - ${t0})`,
			eval: (t: number): number => h * (t - t0),
		},
		{
			labelLatex: `${t1} \\le t < ${t2}`,
			min: t1,
			max: t2,
			exprLatex: `${h * T1}`,
			eval: (): number => h * T1,
		},
		{
			labelLatex: `${t2} \\le t < ${t3}`,
			min: t2,
			max: t3,
			exprLatex: `${h}(${t3} - t)`,
			eval: (t: number): number => h * (t3 - t),
		},
		{
			labelLatex: `t \\ge ${t3}`,
			min: t3,
			max: Number.POSITIVE_INFINITY,
			exprLatex: "0",
			eval: (): number => 0,
		},
	];

	const evalFn = (t: number): number => {
		if (t < t0 || t >= t3) return 0;
		if (t < t1) return h * (t - t0);
		if (t < t2) return h * T1;
		return h * (t3 - t);
	};

	return {
		pairType: "rect_shifted_rect",
		intervals,
		eval: evalFn,
		evalX: (tau: number) =>
			evalRect(tau, rect1.tStart, rect1.width, rect1.height),
		evalH: (tau: number) =>
			evalRect(tau, rect2.tStart, rect2.width, rect2.height),
	};
}

/**
 * Solves convolution of Multi-Rect pulse x(t) = rect(t - 0.5) + rect(t - 3.5) with single rect h(t) = rect(t - 1).
 * @returns {ConvolutionResult} Analytical composite convolution result
 */
export function solveMultiRectConvolution(): ConvolutionResult {
	// x(t) = rect in [0, 1] + rect in [3, 4]
	// h(t) = rect in [0, 2]
	const evalX = (tau: number) =>
		evalRect(tau, 0, 1, 1) + evalRect(tau, 3, 1, 1);
	const evalH = (tau: number) => evalRect(tau, 0, 2, 1);

	// y(t) = (rect[0,1] * rect[0,2]) + (rect[3,4] * rect[0,2])
	// Part 1: [0, 3] trapezoid/triangle, Part 2: [3, 6] trapezoid/triangle
	const evalY = (t: number): number => {
		// rect(0, 1) * rect(0, 2) active in [0, 3]
		let val1 = 0;
		if (t >= 0 && t < 1) val1 = t;
		else if (t >= 1 && t < 2) val1 = 1;
		else if (t >= 2 && t < 3) val1 = 3 - t;

		// rect(3, 4) * rect(0, 2) active in [3, 6]
		let val2 = 0;
		if (t >= 3 && t < 4) val2 = t - 3;
		else if (t >= 4 && t < 5) val2 = 1;
		else if (t >= 5 && t < 6) val2 = 6 - t;

		return val1 + val2;
	};

	const intervals: ConvolutionInterval[] = [
		{
			labelLatex: "t < 0",
			min: Number.NEGATIVE_INFINITY,
			max: 0,
			exprLatex: "0",
			eval: (): number => 0,
		},
		{
			labelLatex: "0 \\le t < 1",
			min: 0,
			max: 1,
			exprLatex: "t",
			eval: (t: number) => t,
		},
		{
			labelLatex: "1 \\le t < 2",
			min: 1,
			max: 2,
			exprLatex: "1",
			eval: () => 1,
		},
		{
			labelLatex: "2 \\le t < 3",
			min: 2,
			max: 3,
			exprLatex: "3 - t",
			eval: (t: number) => 3 - t,
		},
		{
			labelLatex: "3 \\le t < 4",
			min: 3,
			max: 4,
			exprLatex: "t - 3",
			eval: (t: number) => t - 3,
		},
		{
			labelLatex: "4 \\le t < 5",
			min: 4,
			max: 5,
			exprLatex: "1",
			eval: () => 1,
		},
		{
			labelLatex: "5 \\le t < 6",
			min: 5,
			max: 6,
			exprLatex: "6 - t",
			eval: (t: number) => 6 - t,
		},
		{
			labelLatex: "t \\ge 6",
			min: 6,
			max: Number.POSITIVE_INFINITY,
			exprLatex: "0",
			eval: (): number => 0,
		},
	];

	return {
		pairType: "multi_rect",
		intervals,
		eval: evalY,
		evalX,
		evalH,
	};
}

/**
 * Solves continuous-time analytical convolution of Rectangular pulse * Exponential decay.
 * @param {RectSignal} rect Rectangular pulse signal
 * @param {ExpSignal} expSignal Exponential decay signal K * exp(-a * t) * u(t)
 * @returns {ConvolutionResult} Analytical piecewise convolution result
 */
export function solveRectExpConvolution(
	rect: RectSignal,
	expSignal: ExpSignal,
): ConvolutionResult {
	const { tStart, width, height } = rect;
	const { a, K } = expSignal;

	const t0 = tStart;
	const t1 = tStart + width;
	const scale = (height * K) / a;

	const intervals: ConvolutionInterval[] = [
		{
			labelLatex: `t < ${t0}`,
			min: Number.NEGATIVE_INFINITY,
			max: t0,
			exprLatex: "0",
			eval: (): number => 0,
		},
		{
			labelLatex: `${t0} \\le t < ${t1}`,
			min: t0,
			max: t1,
			exprLatex: `${scale}(1 - e^{-${a}(t - ${t0})})`,
			eval: (t: number): number => scale * (1 - Math.exp(-a * (t - t0))),
		},
		{
			labelLatex: `t \\ge ${t1}`,
			min: t1,
			max: Number.POSITIVE_INFINITY,
			exprLatex: `${scale}(e^{-${a}(t - ${t1})} - e^{-${a}(t - ${t0})})`,
			eval: (t: number): number =>
				scale * (Math.exp(-a * (t - t1)) - Math.exp(-a * (t - t0))),
		},
	];

	const evalFn = (t: number): number => {
		if (t < t0) return 0;
		if (t < t1) return scale * (1 - Math.exp(-a * (t - t0)));
		return scale * (Math.exp(-a * (t - t1)) - Math.exp(-a * (t - t0)));
	};

	return {
		pairType: "rect_exp",
		intervals,
		eval: evalFn,
		evalX: (tau: number) =>
			evalRect(tau, rect.tStart, rect.width, rect.height),
		evalH: (tau: number) => evalExpDecay(tau, expSignal.a, expSignal.K),
	};
}

/**
 * Solves continuous-time analytical convolution of Exponential * Exponential decay signals.
 * @param {ExpSignal} exp1 First exponential signal K1 * exp(-a1 * t) * u(t)
 * @param {ExpSignal} exp2 Second exponential signal K2 * exp(-a2 * t) * u(t)
 * @returns {ConvolutionResult} Analytical convolution result
 */
export function solveExpExpConvolution(
	exp1: ExpSignal,
	exp2: ExpSignal,
): ConvolutionResult {
	const a1 = exp1.a;
	const a2 = exp2.a;
	const K = exp1.K * exp2.K;

	if (a1 === a2) {
		const evalFn = (t: number): number =>
			t < 0 ? 0 : K * t * Math.exp(-a1 * t);
		return {
			pairType: "exp_exp",
			intervals: [
				{
					labelLatex: "t < 0",
					min: Number.NEGATIVE_INFINITY,
					max: 0,
					exprLatex: "0",
					eval: (): number => 0,
				},
				{
					labelLatex: "t \\ge 0",
					min: 0,
					max: Number.POSITIVE_INFINITY,
					exprLatex: `${K} t e^{-${a1}t}`,
					eval: (t: number): number => K * t * Math.exp(-a1 * t),
				},
			],
			eval: evalFn,
			evalX: (tau: number) => evalExpDecay(tau, exp1.a, exp1.K),
			evalH: (tau: number) => evalExpDecay(tau, exp2.a, exp2.K),
		};
	}

	const scale = K / (a2 - a1);
	const evalFn = (t: number): number => {
		if (t < 0) return 0;
		return scale * (Math.exp(-a1 * t) - Math.exp(-a2 * t));
	};

	return {
		pairType: "exp_exp",
		intervals: [
			{
				labelLatex: "t < 0",
				min: Number.NEGATIVE_INFINITY,
				max: 0,
				exprLatex: "0",
				eval: (): number => 0,
			},
			{
				labelLatex: "t \\ge 0",
				min: 0,
				max: Number.POSITIVE_INFINITY,
				exprLatex: `\\frac{${K}}{${a2 - a1}} \\left( e^{-${a1}t} - e^{-${a2}t} \\right)`,
				eval: evalFn,
			},
		],
		eval: evalFn,
		evalX: (tau: number) => evalExpDecay(tau, exp1.a, exp1.K),
		evalH: (tau: number) => evalExpDecay(tau, exp2.a, exp2.K),
	};
}
