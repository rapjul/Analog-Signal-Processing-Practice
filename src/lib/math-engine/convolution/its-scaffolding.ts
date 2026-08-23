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
	/** Progressive hints specific to this interval. */
	hints: string[];
}

/** Complete five-step tutoring scaffold for a convolution problem. */
export interface ConvolutionItsData {
	/** Step 1: choose the defining convolution integral. */
	step1: ConvolutionItsChoiceStep;
	/** Step 2: apply the correct flip-and-shift transformation. */
	step2: ConvolutionItsChoiceStep;
	/** Step 3: partition time at every finite transition. */
	step3: ConvolutionItsChoiceStep;
	/** Step 4: evaluate the output on every interval. */
	step4: {
		/** Ordered interval challenges. */
		parts: ConvolutionItsIntervalPart[];
	};
	/** Step 5: assemble the verified expressions into one response. */
	step5: ConvolutionItsChoiceStep & {
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
	if (times.length === 0) return "\\text{No finite transition times}";
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

/**
 * Builds the complete guided convolution tutoring dataset.
 *
 * @param intervals - Exact analytical piecewise convolution result.
 * @returns Five-step ITS scaffold consumed by the reactive solver.
 */
export function buildConvolutionItsData(
	intervals: ConvolutionInterval[],
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
		step2: {
			prompt: "After flipping $h(\\tau)$ and shifting it by $t$, which signal should overlap $x(\\tau)$?",
			options: [
				{
					id: "flip-shift-correct",
					latex: "h(t-\\tau)",
					isCorrect: true,
				},
				{
					id: "shift-without-flip",
					latex: "h(\\tau-t)",
					isCorrect: false,
					feedback:
						"This shifts the original orientation. Substitute $\\tau\\mapsto-\\tau$ before applying the shift.",
				},
				{
					id: "addition-shift",
					latex: "h(t+\\tau)",
					isCorrect: false,
					feedback:
						"The plus sign places the flip and shift in the wrong order. Track the transformed argument algebraically.",
				},
			],
			hints: [
				"First reflect $h(\\tau)$ about the vertical axis.",
				"Reflection gives $h(-\\tau)$; replacing $\\tau$ by $\\tau-t$ then shifts it.",
				"Simplify $h(-(\\tau-t))$ to $h(t-\\tau)$.",
			],
		},
		step3: {
			prompt: "Which partition captures every time at which the overlap geometry or integration bounds change?",
			options: [
				{
					id: "all-transition-times",
					latex: `\\text{Transitions: } ${transitionLatex} \\\\ \\text{Regions: } ${intervalPartitionLatex}`,
					isCorrect: true,
				},
				{
					id: "missing-transition-time",
					latex: `\\text{Transitions: } ${incompleteTransitionLatex}`,
					isCorrect: false,
					feedback:
						"At least one edge-contact event is missing. Include the first contact, every change of active bound, and the final contact.",
				},
				{
					id: "reflected-transition-times",
					latex: `\\text{Transitions: } ${reflectedTransitionLatex}`,
					isCorrect: false,
					feedback:
						"These times reflect the output support. Transition times come from adding the original signal-edge locations.",
				},
			],
			hints: [
				"A new region begins whenever an edge of $h(t-\\tau)$ meets an edge of $x(\\tau)$.",
				"List every finite boundary appearing in the analytical interval partition.",
				`The complete transition set is $${transitionLatex}$.`,
			],
		},
		step4: {
			parts: intervals.map(buildIntervalPart),
		},
		step5: {
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
				"Copy each verified Step 4 result into the matching row of a cases expression.",
				`The assembled response is $${finalLatex}$.`,
			],
		},
	};
}
