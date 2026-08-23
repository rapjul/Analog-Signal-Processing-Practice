/**
 * Intelligent Tutoring System scaffolding for continuous-time convolution.
 *
 * Converts an exact analytical interval result into the guided choices used by
 * the convolution step solver. Keeping this builder in the math engine mirrors
 * the ODE and Fourier Series separation between derivation data and UI state.
 */

import type { ConvolutionInterval } from "$lib/math-engine/convolution";

/** One selectable mathematical response in a convolution tutor step. */
export interface ConvolutionItsOption {
	/** Stable answer identifier. */
	id: string;
	/** Mathematical response rendered as LaTeX. */
	latex: string;
	/** Whether this response is the expected answer. */
	isCorrect: boolean;
	/** Targeted explanation shown when this response is selected. */
	feedback?: string;
}

/** Data for one single-choice convolution tutor step. */
export interface ConvolutionItsChoiceStep {
	/** Student-facing prompt with optional inline LaTeX delimiters. */
	prompt: string;
	/** Selectable answer choices. */
	options: ConvolutionItsOption[];
	/** Progressive conceptual, setup, and worked hints. */
	hints: string[];
}

/** One interval challenge within the multi-part overlap-evaluation step. */
export interface ConvolutionItsIntervalPart {
	/** Stable interval part identifier. */
	id: string;
	/** Short title for the interval challenge. */
	title: string;
	/** Interval condition rendered as LaTeX. */
	intervalLatex: string;
	/** Correct interval result rendered in completed summaries. */
	resultLatex: string;
	/** Selectable interval expressions. */
	options: ConvolutionItsOption[];
	/** Correct setup summary when x is selected as the moving signal. */
	flipXResultLatex?: string;
	/** Setup choices when x is selected as the moving signal. */
	flipXOptions?: ConvolutionItsOption[];
	/** Progressive hints specific to this interval. */
	hints: string[];
}

/** Complete seven-step tutoring scaffold for a convolution problem. */
export interface ConvolutionItsData {
	/** Step 1: analyze input and output supports. */
	step1: ConvolutionItsChoiceStep;
	/** Step 2: choose the defining convolution integral. */
	step2: ConvolutionItsChoiceStep;
	/** Step 3: choose a valid signal to flip and shift. */
	step3: ConvolutionItsChoiceStep;
	/** Step 4: partition time at every finite transition. */
	step4: ConvolutionItsChoiceStep;
	/** Step 5: set up every overlap integral. */
	step5: {
		/** Ordered setup challenges. */
		parts: ConvolutionItsIntervalPart[];
	};
	/** Step 6: evaluate the output on every interval. */
	step6: {
		/** Ordered interval challenges. */
		parts: ConvolutionItsIntervalPart[];
	};
	/** Step 7: assemble the verified expressions into one response. */
	step7: ConvolutionItsChoiceStep & {
		/** Exact final piecewise response. */
		resultLatex: string;
	};
}

/**
 * Formats the exact convolution intervals as one LaTeX cases expression.
 *
 * @param intervals - Ordered analytical convolution intervals.
 * @param expressions - Optional replacement expressions in interval order.
 * @returns Exact piecewise response rendered as LaTeX.
 */
export function formatConvolutionPiecewiseLatex(
	intervals: ConvolutionInterval[],
	expressions = intervals.map(({ exprLatex }) => exprLatex),
): string {
	const rows = intervals.map(
		(interval, index) =>
			`${expressions[index] ?? interval.exprLatex} & ${interval.labelLatex}`,
	);
	return `y(t) = \\begin{cases} ${rows.join(" \\\\ ")} \\end{cases}`;
}

/**
 * Returns every distinct finite interval boundary in ascending order.
 *
 * @param intervals - Ordered analytical convolution intervals.
 * @returns Sorted finite transition times.
 */
export function getFiniteConvolutionTransitionTimes(
	intervals: ConvolutionInterval[],
): number[] {
	return [
		...new Set(
			intervals
				.flatMap(({ min, max }) => [min, max])
				.filter(Number.isFinite),
		),
	].sort((left, right) => left - right);
}

/**
 * Builds a LaTeX list of transition-time equations.
 *
 * @param times - Ordered finite transition times.
 * @returns LaTeX transition-time list.
 */
function formatTransitionTimes(times: number[]): string {
	if (times.length === 0) return "\\varnothing";
	return times.map((time) => `t = ${time}`).join(", \\quad ");
}

/**
 * Produces a deterministic expression distractor distinct from the expected result.
 *
 * @param expression - Correct interval expression.
 * @param alternate - Neighboring interval expression when available.
 * @returns Distinct plausible alternative expression.
 */
function createExpressionDistractor(
	expression: string,
	alternate: string | undefined,
): string {
	if (alternate && alternate !== expression) return alternate;
	if (expression !== "0") return "0";
	return "1";
}

/**
 * Builds one interval-specific multiple-choice challenge.
 *
 * @param interval - Exact interval result.
 * @param index - Zero-based interval position.
 * @param intervals - Complete ordered interval list.
 * @returns Interval tutoring part.
 */
function buildIntervalPart(
	interval: ConvolutionInterval,
	index: number,
	intervals: ConvolutionInterval[],
): ConvolutionItsIntervalPart {
	const neighbor = intervals[index + 1] ?? intervals[index - 1];
	const distractor = createExpressionDistractor(
		interval.exprLatex,
		neighbor?.exprLatex,
	);
	const initialSecondDistractor =
		interval.exprLatex === "0"
			? "t"
			: interval.exprLatex === "t"
				? "1 - t"
				: `-\\left(${interval.exprLatex}\\right)`;
	const secondDistractor =
		initialSecondDistractor === distractor
			? interval.exprLatex === "0"
				? "-1"
				: `1+\\left(${interval.exprLatex}\\right)`
			: initialSecondDistractor;

	return {
		id: `interval-${String(index + 1).padStart(2, "0")}`,
		title: `Evaluate Region ${index + 1}`,
		intervalLatex: interval.labelLatex,
		resultLatex: `y(t) = ${interval.exprLatex}, \\quad ${interval.labelLatex}`,
		options: [
			{
				id: `interval-${index + 1}-correct`,
				latex: `y(t) = ${interval.exprLatex}`,
				isCorrect: true,
			},
			{
				id: `interval-${index + 1}-neighbor`,
				latex: `y(t) = ${distractor}`,
				isCorrect: false,
				feedback:
					"That expression belongs to a different overlap region. Recompute the active bounds before evaluating the integral.",
			},
			{
				id: `interval-${index + 1}-sign`,
				latex: `y(t) = ${secondDistractor}`,
				isCorrect: false,
				feedback:
					"The product area and exponential kernels must preserve their sign. Check the evaluated definite integral.",
			},
		],
		hints: [
			`Work only within the active time region $${interval.labelLatex}$.`,
			"The integration bounds are the intersection of the supports of $x(\\tau)$ and $h(t-\\tau)$.",
			`Evaluating those bounds gives $y(t)=${interval.exprLatex}$ on this region.`,
		],
	};
}

/** Builds one support-intersection and integral-setup challenge. */
function buildIntegralSetupPart(
	interval: ConvolutionInterval,
	index: number,
): ConvolutionItsIntervalPart {
	const isZero = interval.exprLatex === "0";
	const support =
		interval.supportIntersectionLatex ??
		(isZero
			? "\\varnothing"
			: `\\operatorname{supp}(x)\\cap(t-\\operatorname{supp}(h)),\\quad ${interval.labelLatex}`);
	const setup =
		interval.integralSetupLatex ??
		(isZero
			? "y(t)=0"
			: `y(t)=\\int_{\\mathcal I_${index + 1}(t)}x(\\tau)h(t-\\tau)\\,d\\tau`);
	const flipXSupport =
		interval.flipXSupportIntersectionLatex ??
		(isZero
			? "\\varnothing"
			: `\\operatorname{supp}(h)\\cap(t-\\operatorname{supp}(x)),\\quad ${interval.labelLatex}`);
	const flipXSetup =
		interval.flipXIntegralSetupLatex ??
		(isZero
			? "y(t)=0"
			: `y(t)=\\int_{\\mathcal J_${index + 1}(t)}h(\\tau)x(t-\\tau)\\,d\\tau`);
	return {
		id: `setup-${String(index + 1).padStart(2, "0")}`,
		title: `Set Up Region ${index + 1}`,
		intervalLatex: interval.labelLatex,
		resultLatex: `\\mathcal I_${index + 1}(t)=${support},\\quad ${setup}`,
		flipXResultLatex: `\\mathcal J_${index + 1}(t)=${flipXSupport},\\quad ${flipXSetup}`,
		options: [
			{
				id: `setup-${index + 1}-correct`,
				latex: `\\mathcal I_${index + 1}(t)=${support},\\quad ${setup}`,
				isCorrect: true,
			},
			{
				id: `setup-${index + 1}-empty`,
				latex: "\\mathcal I(t)=\\varnothing,\\quad y(t)=0",
				isCorrect: !isZero ? false : false,
				feedback:
					"This does not match the active overlap geometry. Intersect the fixed and moving supports on this interval.",
			},
			{
				id: `setup-${index + 1}-unbounded`,
				latex: "y(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(t-\\tau)\\,d\\tau",
				isCorrect: false,
				feedback:
					"The definition is correct globally, but this step requires the active finite or semi-infinite support intersection.",
			},
		],
		flipXOptions: [
			{
				id: `setup-${index + 1}-flip-x-correct`,
				latex: `\\mathcal J_${index + 1}(t)=${flipXSupport},\\quad ${flipXSetup}`,
				isCorrect: true,
			},
			{
				id: `setup-${index + 1}-flip-x-empty`,
				latex: "\\mathcal J(t)=\\varnothing,\\quad y(t)=0",
				isCorrect: false,
				feedback:
					"This does not match the active overlap geometry for the selected moving signal.",
			},
			{
				id: `setup-${index + 1}-flip-x-unbounded`,
				latex: "y(t)=\\int_{-\\infty}^{\\infty}h(\\tau)x(t-\\tau)\\,d\\tau",
				isCorrect: false,
				feedback:
					"Use the active support intersection to replace the global limits.",
			},
		],
		hints: [
			`Work on the already verified interval $${interval.labelLatex}$.`,
			"Intersect the support of the fixed signal with the transformed support of the moving signal.",
			`The active intersection is $${support}$ and its setup is $${setup}$.`,
		],
	};
}

/**
 * Builds the complete guided convolution tutoring dataset.
 *
 * @param intervals - Exact analytical piecewise convolution result.
 * @returns Five-step ITS scaffold consumed by the reactive solver.
 */
export function buildConvolutionItsData(
	intervals: ConvolutionInterval[],
	supportSummaryLatex = "\\operatorname{supp}(y)=\\operatorname{supp}(x)+\\operatorname{supp}(h)",
): ConvolutionItsData {
	const transitionTimes = getFiniteConvolutionTransitionTimes(intervals);
	const transitionLatex = formatTransitionTimes(transitionTimes);
	const incompleteTransitionLatex = formatTransitionTimes(
		transitionTimes.length > 1
			? transitionTimes.slice(0, -1)
			: transitionTimes.length === 1
				? transitionTimes.map((time) => time + 1)
				: [0],
	);
	const reflectedTransitionCandidate = formatTransitionTimes(
		transitionTimes
			.map((time) => -time)
			.sort((left, right) => left - right),
	);
	const reflectedTransitionLatex =
		reflectedTransitionCandidate === transitionLatex
			? formatTransitionTimes(
					transitionTimes.length > 0
						? transitionTimes.map((time) => time - 1)
						: [1],
				)
			: reflectedTransitionCandidate;
	const intervalPartitionLatex = intervals
		.map(({ labelLatex }) => labelLatex)
		.join(", \\quad ");
	const finalLatex = formatConvolutionPiecewiseLatex(intervals);
	const reversedExpressions = intervals
		.map(({ exprLatex }) => exprLatex)
		.reverse();
	const reversedLatex = formatConvolutionPiecewiseLatex(
		intervals,
		reversedExpressions,
	);

	return {
		step1: {
			prompt: "Which statement correctly relates the supports and widths of the two signals to the convolution output?",
			options: [
				{
					id: "support-sum",
					latex: supportSummaryLatex,
					isCorrect: true,
				},
				{
					id: "support-intersection",
					latex: "\\operatorname{supp}(y)=\\operatorname{supp}(x)\\cap\\operatorname{supp}(h)",
					isCorrect: false,
					feedback:
						"Convolution adds support locations. Intersection is used later for the active integration bounds.",
				},
				{
					id: "support-difference",
					latex: "W_y=|W_x-W_h|",
					isCorrect: false,
					feedback:
						"For finite connected supports, convolution width is the sum of the two widths.",
				},
			],
			hints: [
				"Record each signal's start, end, and width before sliding anything.",
				"The first output contact occurs when the two starting edges add.",
				"For finite connected supports, add the start times, end times, and widths.",
			],
		},
		step2: {
			prompt: "Which expression correctly defines the continuous-time convolution output $y(t)$?",
			options: [
				{
					id: "convolution-integral",
					latex: "y(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(t-\\tau)\\,d\\tau",
					isCorrect: true,
				},
				{
					id: "pointwise-product",
					latex: "y(t)=x(t)h(t)",
					isCorrect: false,
					feedback:
						"A pointwise product does not slide one signal across the other. Convolution requires integration over a dummy variable.",
				},
				{
					id: "correlation-integral",
					latex: "y(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(\\tau-t)\\,d\\tau",
					isCorrect: false,
					feedback:
						"The shift direction is reversed. Flip $h(\\tau)$ first, then shift it to obtain $h(t-\\tau)$.",
				},
			],
			hints: [
				"Convolution combines a flip, a shift, a product, and an integral.",
				"Use $\\tau$ as the integration variable while $t$ remains the output-time parameter.",
				"The required kernel is $h(t-\\tau)$, integrated from $-\\infty$ to $\\infty$.",
			],
		},
		step3: {
			prompt: "Which signal may be flipped and shifted when evaluating convolution? Choose the path you want to use.",
			options: [
				{
					id: "flip-h",
					latex: "y(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(t-\\tau)\\,d\\tau",
					isCorrect: true,
				},
				{
					id: "flip-x",
					latex: "y(t)=\\int_{-\\infty}^{\\infty}h(\\tau)x(t-\\tau)\\,d\\tau",
					isCorrect: true,
				},
				{
					id: "shift-without-flip",
					latex: "y(t)=\\int x(\\tau)h(\\tau-t)\\,d\\tau",
					isCorrect: false,
					feedback:
						"The selected moving signal must be reflected before it is shifted.",
				},
			],
			hints: [
				"Convolution is commutative, so either signal can be the moving signal.",
				"The fixed signal keeps the argument $\\tau$.",
				"The moving signal receives the argument $t-\\tau$.",
			],
		},
		step4: {
			prompt: "First identify every interior slope or formula change. Then choose the complete breakpoint-contact set and resulting interval partition.",
			options: [
				{
					id: "all-transition-times",
					latex: `\\mathcal T=\\{${transitionLatex}\\} \\\\ \\mathcal R=\\{${intervalPartitionLatex}\\}`,
					isCorrect: true,
				},
				{
					id: "missing-transition-time",
					latex: `\\mathcal T=\\{${incompleteTransitionLatex}\\}`,
					isCorrect: false,
					feedback:
						"At least one edge-contact event is missing. Include the first contact, every change of active bound, and the final contact.",
				},
				{
					id: "reflected-transition-times",
					latex: `\\mathcal T=\\{${reflectedTransitionLatex}\\}`,
					isCorrect: false,
					feedback:
						"These times reflect the output support. Transition times come from adding the original signal-edge locations.",
				},
			],
			hints: [
				"Before using support edges, include every interior apex, slope change, or piecewise formula change.",
				"A new region begins whenever a transformed edge or interior breakpoint meets one on the fixed signal.",
				`The complete transition set is $${transitionLatex}$.`,
			],
		},
		step5: {
			parts: intervals.map(buildIntegralSetupPart),
		},
		step6: {
			parts: intervals.map(buildIntervalPart),
		},
		step7: {
			prompt: "Which piecewise expression assembles every verified interval into the complete output $y(t)$?",
			resultLatex: finalLatex,
			options: [
				{
					id: "final-piecewise-correct",
					latex: finalLatex,
					isCorrect: true,
				},
				{
					id: "final-piecewise-reversed",
					latex: reversedLatex,
					isCorrect: false,
					feedback:
						"The interval conditions are correct, but their expressions are attached in reverse order. Preserve the result verified for each region.",
				},
				{
					id: "final-pointwise-product",
					latex: "y(t)=x(t)h(t)",
					isCorrect: false,
					feedback:
						"The final answer must assemble the evaluated overlap integrals, not replace convolution with pointwise multiplication.",
				},
			],
			hints: [
				"Keep the interval conditions in chronological order.",
				"Copy each verified Step 6 result into the matching row of a cases expression.",
				`The assembled response is $${finalLatex}$.`,
			],
		},
	};
}
