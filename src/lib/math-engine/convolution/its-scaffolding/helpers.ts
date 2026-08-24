/** Structured tutoring scaffolding for continuous-time convolution. */

import type {
	ConvolutionBreakpointContact,
	ConvolutionItsBuildContext,
	ConvolutionItsData,
	ConvolutionMovingSignal,
	ConvolutionTimingPart,
	ConvolutionTransitionGroup,
} from "$lib/math-engine/convolution/its-types";
import { formatSubstitutedDifference } from "$lib/math-engine/formatting";
import { buildEvaluationPart, buildSetupPart } from "./intervals";
import {
	buildFormulaStep,
	buildTransformedSections,
	formatConvolutionPiecewiseLatex,
	formatConvolutionScalar,
	formatTranslatedEdge,
	getFiniteConvolutionTransitionTimes,
} from "./presentation";

export type {
	ConvolutionBreakpointContact,
	ConvolutionBreakpointPart,
	ConvolutionIntegralPathSetup,
	ConvolutionItsBuildContext,
	ConvolutionItsChoiceStep,
	ConvolutionItsData,
	ConvolutionItsFlipStep,
	ConvolutionItsIntervalPart,
	ConvolutionItsOption,
	ConvolutionItsTimingStep,
	ConvolutionItsTransitionStep,
	ConvolutionMovingSignal,
	ConvolutionOverlapBounds,
	ConvolutionTimingPart,
	ConvolutionTransformedSection,
	ConvolutionTransitionGroup,
} from "$lib/math-engine/convolution/its-types";
export type { ConvolutionSignalSection } from "$lib/math-engine/convolution/types";

export {
	formatConvolutionPiecewiseLatex,
	formatConvolutionScalar,
	getFiniteConvolutionTransitionTimes,
} from "./presentation";

/** Builds grouped transition contacts from original breakpoints. */
function buildTransitionGroups(
	context: ConvolutionItsBuildContext,
): ConvolutionTransitionGroup[] {
	return getFiniteConvolutionTransitionTimes(context.intervals).map(
		(time, index) => {
			const groupId = `transition-${String(index + 1).padStart(2, "0")}`;
			const contactsFor = (
				moving: ConvolutionMovingSignal,
			): ConvolutionBreakpointContact[] => {
				const fixedBreakpoints =
					moving === "h"
						? context.xBreakpoints
						: context.hBreakpoints;
				const movingBreakpoints =
					moving === "h"
						? context.hBreakpoints
						: context.xBreakpoints;
				const matches = fixedBreakpoints.flatMap((fixed) =>
					movingBreakpoints
						.filter((point) => fixed + point === time)
						.map((point) => ({ fixed, moving: point })),
				);
				return matches.map(
					({ fixed, moving: movingPoint }, contactIndex) => {
						const id = `${moving}-${groupId}-contact-${contactIndex + 1}`;
						const transformedLatex =
							formatTranslatedEdge(movingPoint);
						const equationLatex = `${formatConvolutionScalar(fixed)}=${formatSubstitutedDifference("t", movingPoint)}`;
						return {
							id,
							fixed,
							moving: movingPoint,
							transformedLatex,
							equationLatex,
							transitionTime: time,
							transitionGroupId: groupId,
							duplicateOf:
								contactIndex > 0
									? `${moving}-${groupId}-contact-1`
									: undefined,
							formulationHints: [
								`The fixed breakpoint is $\\tau=${formatConvolutionScalar(fixed)}$.`,
								`After reflection and translation, moving breakpoint $${formatConvolutionScalar(movingPoint)}$ appears at $\\tau=${transformedLatex}$.`,
								`Set the breakpoint positions equal: $${equationLatex}$.`,
							],
							solutionHints: [
								"Isolate $t$ in the verified contact equation.",
								`Add the original moving breakpoint $${formatConvolutionScalar(movingPoint)}$ to the fixed breakpoint $${formatConvolutionScalar(fixed)}$.`,
								`This contact occurs at $t=${formatConvolutionScalar(time)}$.`,
							],
						};
					},
				);
			};
			return {
				id: groupId,
				time,
				contactsBySignal: { x: contactsFor("x"), h: contactsFor("h") },
			};
		},
	);
}

/** Builds one exact Step 1 timing part. */
function timingPart(
	id: ConvolutionTimingPart["id"],
	start: number,
	end: number,
): ConvolutionTimingPart {
	const width =
		Number.isFinite(start) && Number.isFinite(end)
			? end - start
			: Number.POSITIVE_INFINITY;
	const signalLatex = id === "y" ? "y(t)" : `${id}(t)`;
	return {
		id,
		title:
			id === "y"
				? "Calculate the Convolution Timing"
				: `Read the Timing of ${id}(t)`,
		signalLatex,
		start,
		end,
		width,
		resultLatex: `${id}_{\\mathrm{start}}=${formatConvolutionScalar(start)},\\quad ${id}_{\\mathrm{end}}=${formatConvolutionScalar(end)},\\quad W_${id}=${formatConvolutionScalar(width)}`,
		hints:
			id === "y"
				? [
						"Add the two input start times.",
						"Add the two input end times.",
						"For finite spans, the output width is the sum of the input widths.",
					]
				: [
						"Find the first time where the signal can be nonzero.",
						"Find the last time where the signal can be nonzero.",
						"The overall width is end time minus start time.",
					],
	};
}

/** Builds the complete guided convolution tutoring dataset. */
export function buildConvolutionItsData(
	context: ConvolutionItsBuildContext,
): ConvolutionItsData {
	const outputIntervals = context.intervals.filter(
		({ exprLatex, hasGeometricOverlap }) =>
			hasGeometricOverlap ?? exprLatex !== "0",
	);
	const xStart = context.xSections[0]?.start ?? Number.NEGATIVE_INFINITY;
	const xEnd = context.xSections.at(-1)?.end ?? Number.POSITIVE_INFINITY;
	const hStart = context.hSections[0]?.start ?? Number.NEGATIVE_INFINITY;
	const hEnd = context.hSections.at(-1)?.end ?? Number.POSITIVE_INFINITY;
	const yStart = outputIntervals[0]?.min ?? Number.NEGATIVE_INFINITY;
	const yEnd = outputIntervals.at(-1)?.max ?? Number.POSITIVE_INFINITY;
	const transitionGroups = buildTransitionGroups(context);
	const intervalBoundaries = transitionGroups.map(({ time }) => time);
	const finalLatex = formatConvolutionPiecewiseLatex(context.intervals);
	const reversedLatex = formatConvolutionPiecewiseLatex(
		context.intervals,
		context.intervals.map(({ exprLatex }) => exprLatex).reverse(),
	);
	const missingExteriorLatex = formatConvolutionPiecewiseLatex(
		context.intervals.slice(1),
	);
	const recommendationScore = (signal: "x" | "h"): number => {
		const sections = signal === "x" ? context.xSections : context.hSections;
		const breakpoints =
			signal === "x" ? context.xBreakpoints : context.hBreakpoints;
		const infinitePenalty = sections.some(
			({ start, end }) =>
				!Number.isFinite(start) || !Number.isFinite(end),
		)
			? 10
			: 0;
		return sections.length * 4 + breakpoints.length + infinitePenalty;
	};
	const xScore = recommendationScore("x");
	const hScore = recommendationScore("h");
	const recommendedSignal: ConvolutionMovingSignal =
		xScore < hScore ? "x" : "h";
	const definitionOptions = [
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
				"A pointwise product does not slide one signal across the other.",
		},
		{
			id: "correlation-integral",
			latex: "y(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(\\tau-t)\\,d\\tau",
			isCorrect: false,
			feedback:
				"The moving argument has the wrong orientation; reflection requires $t-\\tau$.",
		},
		{
			id: "outside-variable",
			latex: "y(t)=x(t)\\int_{-\\infty}^{\\infty}h(t-\\tau)\\,d\\tau",
			isCorrect: false,
			feedback:
				"Both signals must depend on the integration variable inside the convolution integral.",
		},
	];
	const definitionOffset = (context.seed ?? 0) % definitionOptions.length;
	const shuffledDefinitionOptions = definitionOptions.map(
		(_, index) =>
			definitionOptions[
				(index + definitionOffset) % definitionOptions.length
			] ?? definitionOptions[0],
	);
	return {
		step1: {
			intro: "A signal's support is all times where it can be non-zero. Its start time, end time, and signal width tell us when overlap can begin, when it must end, and how wide the convolution can be. For disconnected signals, the tutor calls the earliest-to-latest measurement the overall span width.",
			parts: [
				timingPart("x", xStart, xEnd),
				timingPart("h", hStart, hEnd),
				timingPart("y", yStart, yEnd),
			],
		},
		step2: {
			prompt: "Which expression correctly defines the continuous-time convolution output $y(t)$?",
			options: shuffledDefinitionOptions,
			hints: [
				"Convolution combines reflection, translation, multiplication, and integration.",
				"Use $\\tau$ as the integration variable while $t$ remains a parameter.",
				"One signal is fixed in $\\tau$ and the other uses $t-\\tau$.",
			],
		},
		step3: {
			prompt: "Choose one signal to reflect and slide now. Either path is valid; this choice controls the notation, bounds, and animator in the remaining work.",
			recommendedSignal,
			recommendation:
				xScore === hScore
					? `Recommended: move $${recommendedSignal}(t)$, following the textbook tie-breaking convention.`
					: `Recommended: move $${recommendedSignal}(t)$ because it has fewer connected sections, breakpoints, or infinite edges to track.`,
			formulaBySignal: {
				x: buildFormulaStep("x", context.seed ?? 0),
				h: buildFormulaStep("h", context.seed ?? 0),
			},
			sectionsBySignal: {
				x: buildTransformedSections(context.xSections),
				h: buildTransformedSections(context.hSections),
			},
			choiceHints: [
				"Both choices produce the same convolution because convolution is commutative.",
				"Keep one signal fixed in $\\tau$ and reflect and translate the other.",
				"Choose the shape whose reflected edges are easiest for you to track.",
			],
			edgeHints: [
				"If the original section is $[c,d]$, reflection and translation reverse its edges.",
				"The transformed left edge is $t-d$ and the transformed right edge is $t-c$.",
				"Reflection also swaps which endpoint is included.",
			],
		},
		step4: {
			sectionCounts: {
				x: context.xSections.length,
				h: context.hSections.length,
			},
			sectionHints: {
				x: [
					"Trace each connected non-zero section of $x(t)$ from its left boundary to its right boundary.",
					"A gap where the signal is zero separates two connected sections.",
					`The verified count for $x(t)$ is ${context.xSections.length}.`,
				],
				h: [
					"Trace each connected non-zero section of $h(t)$ from its left boundary to its right boundary.",
					"A gap where the signal is zero separates two connected sections.",
					`The verified count for $h(t)$ is ${context.hSections.length}.`,
				],
			},
			breakpointParts: [
				...context.xBreakpoints.slice(1, -1).map((value, index) => ({
					id: `x-breakpoint-${index + 1}`,
					signal: "x" as const,
					index: index + 1,
					value,
					title: `Find Interior Change ${index + 1} of x(t)`,
					hints: [
						"Look inside the support, excluding its outer left and right boundaries.",
						"Find where the slope or piecewise formula of $x(t)$ changes.",
						`This interior breakpoint is at $t=${formatConvolutionScalar(value)}$.`,
					],
				})),
				...context.hBreakpoints.slice(1, -1).map((value, index) => ({
					id: `h-breakpoint-${index + 1}`,
					signal: "h" as const,
					index: index + 1,
					value,
					title: `Find Interior Change ${index + 1} of h(t)`,
					hints: [
						"Look inside the support, excluding its outer left and right boundaries.",
						"Find where the slope or piecewise formula of $h(t)$ changes.",
						`This interior breakpoint is at $t=${formatConvolutionScalar(value)}$.`,
					],
				})),
			],
			transitionGroups,
			intervalBoundaries,
			intervalLabels: context.intervals.map(
				({ labelLatex }) => labelLatex,
			),
			transitionCountHints: [
				"Count each distinct verified contact time once.",
				"Contacts grouped under the same time contribute one transition, not several.",
				`There are ${transitionGroups.length} distinct transition times.`,
			],
			intervalCountHints: [
				"Every transition divides the time axis into one additional region.",
				"Include the region before the first transition and the region after the last transition.",
				`The ${transitionGroups.length} transitions create ${context.intervals.length} output intervals.`,
			],
			intervalBuilderHints: [
				"Use the verified transition times from smallest to largest.",
				"The first interval is left-unbounded and the final interval is right-unbounded.",
				`The ordered boundaries are $${intervalBoundaries.map(formatConvolutionScalar).join(",\\;")}$.`,
			],
		},
		step5: {
			parts: context.intervals.map((interval, index) =>
				buildSetupPart(interval, index, context),
			),
		},
		step6: { parts: context.intervals.map(buildEvaluationPart) },
		step7: {
			prompt: "Which piecewise expression attaches every evaluated result to its verified interval?",
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
						"The expressions are attached in reverse interval order.",
				},
				{
					id: "final-pointwise-product",
					latex: "y(t)=x(t)h(t)",
					isCorrect: false,
					feedback:
						"The final response must assemble the evaluated convolution integrals.",
				},
				{
					id: "final-missing-exterior",
					latex: missingExteriorLatex,
					isCorrect: false,
					feedback:
						"At least one exterior or boundary region is missing from this response.",
				},
			],
			hints: [
				"Keep the verified interval conditions in chronological order.",
				"Copy each Step 6 expression into its matching interval row.",
				`The complete response is $${finalLatex}$.`,
			],
		},
	};
}
