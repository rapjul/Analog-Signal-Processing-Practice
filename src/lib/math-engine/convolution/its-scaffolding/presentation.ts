/** Presentation and option builders shared by convolution tutor steps. */

import type {
	ConvolutionItsChoiceStep,
	ConvolutionItsOption,
	ConvolutionMovingSignal,
	ConvolutionTransformedSection,
} from "$lib/math-engine/convolution/its-types";
import type {
	ConvolutionInterval,
	ConvolutionSignalSection,
} from "$lib/math-engine/convolution/types";
import {
	formatTranslatedArgument,
	sanitizeLatexMath,
} from "$lib/math-engine/formatting";
import { createSeededPrng, shuffleWithRandom } from "$lib/math-engine/random";

/** Formats one finite or infinite scalar as exact LaTeX. */
export function formatConvolutionScalar(value: number): string {
	if (value === Number.POSITIVE_INFINITY) return "\\infty";
	if (value === Number.NEGATIVE_INFINITY) return "-\\infty";
	return String(value);
}

/** Formats the exact convolution intervals as one LaTeX cases expression. */
export function formatConvolutionPiecewiseLatex(
	intervals: ConvolutionInterval[],
	expressions = intervals.map(({ exprLatex }) => exprLatex),
): string {
	const rows = intervals.map(
		(interval, index) =>
			`${expressions[index] ?? interval.exprLatex} & ${interval.labelLatex}`,
	);
	return sanitizeLatexMath(
		`y(t) = \\begin{cases} ${rows.join(" \\\\ ")} \\end{cases}`,
	);
}

/** Returns every distinct finite interval boundary in ascending order. */
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

/** Formats one transformed moving edge. */
export function formatTranslatedEdge(value: number): string {
	if (value === Number.POSITIVE_INFINITY) return "-\\infty";
	if (value === Number.NEGATIVE_INFINITY) return "\\infty";
	return formatTranslatedArgument("t", value);
}

/** Formats one original connected section. */
function formatSection(section: ConvolutionSignalSection): string {
	const left = section.startIncluded ? "[" : "(";
	const right = section.endIncluded ? "]" : ")";
	return `${left}${formatConvolutionScalar(section.start)},${formatConvolutionScalar(section.end)}${right}`;
}

/** Returns endpoint inclusion after reflection. */
function transformedInclusion(
	section: ConvolutionSignalSection,
): ConvolutionTransformedSection["includedEndpoint"] {
	if (section.startIncluded && section.endIncluded) return "both";
	if (!section.startIncluded && !section.endIncluded) return "neither";
	return section.endIncluded ? "left" : "right";
}

/** Builds transformed sections for one moving signal. */
export function buildTransformedSections(
	sections: ConvolutionSignalSection[],
): ConvolutionTransformedSection[] {
	return sections.map((section, index) => ({
		id: `section-${index + 1}`,
		index: index + 1,
		leftLatex: formatTranslatedEdge(section.end),
		rightLatex: formatTranslatedEdge(section.start),
		includedEndpoint: transformedInclusion(section),
		originalLatex: formatSection(section),
	}));
}

/** Builds four deterministic path-sensitive integral choices. */
export function buildFormulaStep(
	moving: ConvolutionMovingSignal,
	seed: number,
): ConvolutionItsChoiceStep {
	const matching =
		moving === "h"
			? "y(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(t-\\tau)\\,d\\tau"
			: "y(t)=\\int_{-\\infty}^{\\infty}h(\\tau)x(t-\\tau)\\,d\\tau";
	const selectedWithoutFlip =
		moving === "h"
			? "y(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(\\tau-t)\\,d\\tau"
			: "y(t)=\\int_{-\\infty}^{\\infty}h(\\tau)x(\\tau-t)\\,d\\tau";
	const otherCorrect =
		moving === "h"
			? "y(t)=\\int_{-\\infty}^{\\infty}h(\\tau)x(t-\\tau)\\,d\\tau"
			: "y(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(t-\\tau)\\,d\\tau";
	const otherWithoutFlip =
		moving === "h"
			? "y(t)=\\int_{-\\infty}^{\\infty}h(\\tau)x(\\tau-t)\\,d\\tau"
			: "y(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(\\tau-t)\\,d\\tau";
	const options: ConvolutionItsOption[] = [
		{ id: `formula-${moving}-correct`, latex: matching, isCorrect: true },
		{
			id: `formula-${moving}-no-flip`,
			latex: selectedWithoutFlip,
			isCorrect: false,
			feedback:
				"This shifts the selected signal without reflecting it. The moving argument must be $t-\\tau$.",
		},
		{
			id: `formula-${moving}-other-path`,
			latex: otherCorrect,
			isCorrect: false,
			feedback:
				"That identity is valid, but it moves the other signal instead of the selected path.",
		},
		{
			id: `formula-${moving}-other-no-flip`,
			latex: otherWithoutFlip,
			isCorrect: false,
			feedback:
				"This uses the unselected signal and omits the required reflection.",
		},
	];
	const optionSeed =
		(seed ^ (moving === "x" ? 0x58_33_ba_11 : 0x48_33_ba_11)) >>> 0;
	return {
		prompt: `Which integral keeps $${moving === "h" ? "x" : "h"}(\\tau)$ fixed and moves $${moving}(t)$?`,
		options: shuffleWithRandom(options, createSeededPrng(optionSeed)),
		hints: [
			"The fixed signal keeps the argument $\\tau$.",
			"The selected moving signal receives the argument $t-\\tau$.",
			`The matching path is $${matching}$.`,
		],
	};
}
