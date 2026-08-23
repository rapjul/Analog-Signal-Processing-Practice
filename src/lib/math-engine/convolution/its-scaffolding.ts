/** Structured tutoring scaffolding for continuous-time convolution. */

import type { ConvolutionInterval } from "$lib/math-engine/convolution";

/** Signal selected as the reflected and translated convolution operand. */
export type ConvolutionMovingSignal = "x" | "h";

/** One selectable mathematical response in a convolution tutor step. */
export interface ConvolutionItsOption {
	/** Stable answer identifier. */
	id: string;
	/** Mathematical response rendered as LaTeX. */
	latex: string;
	/** Whether this response is expected for the active path. */
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

/** One connected nonzero section of a signal. */
export interface ConvolutionSignalSection {
	/** Stable section identifier. */
	id: string;
	/** Finite or infinite left endpoint. */
	start: number;
	/** Finite or infinite right endpoint. */
	end: number;
	/** Whether the original signal includes its left endpoint. */
	startIncluded: boolean;
	/** Whether the original signal includes its right endpoint. */
	endIncluded: boolean;
}

/** Exact start, end, and overall span expected in one Step 1 part. */
export interface ConvolutionTimingPart {
	/** Stable part identifier. */
	id: "x" | "h" | "y";
	/** Student-facing part title. */
	title: string;
	/** Signal label rendered as LaTeX. */
	signalLatex: string;
	/** Expected start value. */
	start: number;
	/** Expected end value. */
	end: number;
	/** Expected overall start-to-end span. */
	width: number;
	/** Completed exact summary. */
	resultLatex: string;
	/** Progressive hints for this part. */
	hints: string[];
}

/** Multipart Step 1 timing and width data. */
export interface ConvolutionItsTimingStep {
	/** Plain-language explanation shown before the first part. */
	intro: string;
	/** Ordered timing challenges for x, h, and y. */
	parts: ConvolutionTimingPart[];
}

/** One transformed connected section entered in Step 3C. */
export interface ConvolutionTransformedSection {
	/** Stable section identifier. */
	id: string;
	/** One-based section number. */
	index: number;
	/** Expected left-edge expression after reflection and translation. */
	leftLatex: string;
	/** Expected right-edge expression after reflection and translation. */
	rightLatex: string;
	/** Expected endpoint inclusion after reflection. */
	includedEndpoint: "left" | "right" | "both" | "neither";
	/** Original section rendered for context. */
	originalLatex: string;
}

/** Multipart Step 3 moving-signal selection and transformation data. */
export interface ConvolutionItsFlipStep {
	/** Explanation shown before the binary path choice. */
	prompt: string;
	/** Formula challenge for each valid moving-signal choice. */
	formulaBySignal: Record<ConvolutionMovingSignal, ConvolutionItsChoiceStep>;
	/** Expected transformed connected sections for each path. */
	sectionsBySignal: Record<
		ConvolutionMovingSignal,
		ConvolutionTransformedSection[]
	>;
	/** Progressive hints for the path-selection part. */
	choiceHints: string[];
	/** Progressive hints for transformed edges. */
	edgeHints: string[];
}

/** One original breakpoint to be entered before contact calculations. */
export interface ConvolutionBreakpointPart {
	/** Stable breakpoint part identifier. */
	id: string;
	/** Owning signal. */
	signal: "x" | "h";
	/** One-based breakpoint number within the signal. */
	index: number;
	/** Expected breakpoint value. */
	value: number;
	/** Student-facing title. */
	title: string;
}

/** One edge or formula-change contact that creates a transition. */
export interface ConvolutionBreakpointContact {
	/** Fixed original breakpoint. */
	fixed: number;
	/** Original breakpoint of the moving signal. */
	moving: number;
	/** Contact equation rendered without separately revealing its solved time. */
	equationLatex: string;
}

/** Contacts grouped by their common output transition time. */
export interface ConvolutionTransitionGroup {
	/** Stable transition group identifier. */
	id: string;
	/** Expected transition time. */
	time: number;
	/** Contact equations for each moving-signal path. */
	contactsBySignal: Record<
		ConvolutionMovingSignal,
		ConvolutionBreakpointContact[]
	>;
}

/** Structured Step 4 breakpoint, contact, and interval data. */
export interface ConvolutionItsTransitionStep {
	/** Connected-section counts for the two signals. */
	sectionCounts: Record<"x" | "h", number>;
	/** Number of overlapping connected sections within each original signal. */
	sectionOverlapCounts: Record<"x" | "h", number>;
	/** Interior edges, slope changes, and formula changes. */
	breakpointParts: ConvolutionBreakpointPart[];
	/** Ordered transition groups, one challenge per distinct time. */
	transitionGroups: ConvolutionTransitionGroup[];
	/** Expected sorted interval boundaries. */
	intervalBoundaries: number[];
	/** Exact completed interval labels. */
	intervalLabels: string[];
	/** Progressive guidance shared by Step 4 parts. */
	hints: string[];
}

/** One connected overlap bound pair within a Step 5 region. */
export interface ConvolutionOverlapBounds {
	/** Stable overlap identifier. */
	id: string;
	/** Candidate expressions compared by max for the lower limit. */
	lowerCandidatesLatex: [string, string];
	/** Candidate expressions compared by min for the upper limit. */
	upperCandidatesLatex: [string, string];
	/** Simplified active lower limit. */
	lowerLatex: string;
	/** Simplified active upper limit. */
	upperLatex: string;
	/** Interior split expressions needed by piecewise signal formulas. */
	splitPointsLatex: string[];
}

/** Path-specific exact integration setup for one output interval. */
export interface ConvolutionIntegralPathSetup {
	/** Whether any connected overlap exists in this region. */
	hasOverlap: boolean;
	/** One or more connected overlap components. */
	overlaps: ConvolutionOverlapBounds[];
	/** Complete integral assembled from the verified bounds. */
	integralLatex: string;
}

/** One interval challenge within the setup/evaluation steps. */
export interface ConvolutionItsIntervalPart {
	/** Stable interval part identifier. */
	id: string;
	/** Short title for the interval challenge. */
	title: string;
	/** Interval condition rendered as LaTeX. */
	intervalLatex: string;
	/** Correct interval result rendered in completed summaries. */
	resultLatex: string;
	/** Legacy selectable responses retained for compatible tooling. */
	options: ConvolutionItsOption[];
	/** Exact setup for both valid moving-signal paths. */
	setupBySignal?: Record<
		ConvolutionMovingSignal,
		ConvolutionIntegralPathSetup
	>;
	/** Progressive hints specific to this interval. */
	hints: string[];
}

/** Complete seven-step tutoring scaffold for a convolution problem. */
export interface ConvolutionItsData {
	/** Step 1: type input and output timing values. */
	step1: ConvolutionItsTimingStep;
	/** Step 2: choose the defining convolution integral. */
	step2: ConvolutionItsChoiceStep;
	/** Step 3: choose and verify one flip-and-shift path. */
	step3: ConvolutionItsFlipStep;
	/** Step 4: type breakpoints, transition times, and interval bounds. */
	step4: ConvolutionItsTransitionStep;
	/** Step 5: type exact overlap limits for every interval. */
	step5: { parts: ConvolutionItsIntervalPart[] };
	/** Step 6: type each evaluated interval expression. */
	step6: { parts: ConvolutionItsIntervalPart[] };
	/** Step 7: assemble the complete piecewise response. */
	step7: ConvolutionItsChoiceStep & { resultLatex: string };
}

/** Exact problem metadata needed to build the tutoring scaffold. */
export interface ConvolutionItsBuildContext {
	/** Ordered analytical output intervals. */
	intervals: ConvolutionInterval[];
	/** Connected nonzero sections of x. */
	xSections: ConvolutionSignalSection[];
	/** Connected nonzero sections of h. */
	hSections: ConvolutionSignalSection[];
	/** Support edges and interior breakpoints of x. */
	xBreakpoints: number[];
	/** Support edges and interior breakpoints of h. */
	hBreakpoints: number[];
}

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
	return `y(t) = \\begin{cases} ${rows.join(" \\\\ ")} \\end{cases}`;
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

/** Formats a translated edge expression `t-value`. */
function formatTranslatedEdge(value: number): string {
	if (value === Number.POSITIVE_INFINITY) return "-\\infty";
	if (value === Number.NEGATIVE_INFINITY) return "\\infty";
	if (value === 0) return "t";
	return value > 0 ? `t-${value}` : `t+${Math.abs(value)}`;
}

/** Formats one original connected support section. */
function formatSection(section: ConvolutionSignalSection): string {
	const left = section.startIncluded ? "[" : "(";
	const right = section.endIncluded ? "]" : ")";
	return `${left}${formatConvolutionScalar(section.start)},${formatConvolutionScalar(section.end)}${right}`;
}

/** Returns the transformed endpoint inclusion after reflection. */
function transformedInclusion(
	section: ConvolutionSignalSection,
): ConvolutionTransformedSection["includedEndpoint"] {
	if (section.startIncluded && section.endIncluded) return "both";
	if (!section.startIncluded && !section.endIncluded) return "neither";
	return section.endIncluded ? "left" : "right";
}

/** Builds the Step 3 transformed sections for one moving signal. */
function buildTransformedSections(
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

/** Builds four path-sensitive integral choices. */
function buildFormulaStep(
	moving: ConvolutionMovingSignal,
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
	return {
		prompt: `Which integral keeps $${moving === "h" ? "x" : "h"}(\\tau)$ fixed and moves $${moving}(t)$?`,
		options: [
			{
				id: `formula-${moving}-correct`,
				latex: matching,
				isCorrect: true,
			},
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
					"That is a valid convolution identity, but it moves the other signal instead of the path you selected.",
			},
			{
				id: `formula-${moving}-other-no-flip`,
				latex: otherWithoutFlip,
				isCorrect: false,
				feedback:
					"This uses the unselected signal and shifts it without the required reflection.",
			},
		],
		hints: [
			"The fixed signal keeps the argument $\\tau$.",
			"The selected moving signal receives the argument $t-\\tau$.",
			`The matching path is $${matching}$.`,
		],
	};
}

/** Returns a representative interior time for active max/min bounds. */
function representativeTime(interval: ConvolutionInterval): number {
	if (Number.isFinite(interval.min) && Number.isFinite(interval.max))
		return (interval.min + interval.max) / 2;
	if (Number.isFinite(interval.min)) return interval.min + 1;
	if (Number.isFinite(interval.max)) return interval.max - 1;
	return 0;
}

/** Sorts and deduplicates symbolic split points. */
function uniqueSplitPoints(
	points: Array<{ latex: string; value: number }>,
): Array<{ latex: string; value: number }> {
	const seen = new Set<string>();
	return points
		.sort((left, right) => left.value - right.value)
		.filter(({ latex }) => {
			if (seen.has(latex)) return false;
			seen.add(latex);
			return true;
		});
}

/** Builds one exact path-specific overlap setup from connected sections. */
function buildPathSetup(
	interval: ConvolutionInterval,
	movingSignal: ConvolutionMovingSignal,
	fixedSections: ConvolutionSignalSection[],
	movingSections: ConvolutionSignalSection[],
	fixedBreakpoints: number[],
	movingBreakpoints: number[],
): ConvolutionIntegralPathSetup {
	if (interval.exprLatex === "0")
		return { hasOverlap: false, overlaps: [], integralLatex: "y(t)=0" };
	const time = representativeTime(interval);
	const fixedInterior = fixedBreakpoints.slice(1, -1);
	const movingInterior = movingBreakpoints.slice(1, -1);
	const overlaps: ConvolutionOverlapBounds[] = [];
	for (const fixed of fixedSections) {
		for (const moving of movingSections) {
			const movingLeftValue = time - moving.end;
			const movingRightValue = time - moving.start;
			const lowerValue = Math.max(fixed.start, movingLeftValue);
			const upperValue = Math.min(fixed.end, movingRightValue);
			if (!(lowerValue < upperValue)) continue;
			const fixedStart = formatConvolutionScalar(fixed.start);
			const fixedEnd = formatConvolutionScalar(fixed.end);
			const movingLeft = formatTranslatedEdge(moving.end);
			const movingRight = formatTranslatedEdge(moving.start);
			const splitPoints = uniqueSplitPoints([
				...fixedInterior
					.filter((point) => point > lowerValue && point < upperValue)
					.map((point) => ({
						latex: formatConvolutionScalar(point),
						value: point,
					})),
				...movingInterior
					.map((point) => ({
						latex: formatTranslatedEdge(point),
						value: time - point,
					}))
					.filter(
						({ value }) => value > lowerValue && value < upperValue,
					),
			]);
			overlaps.push({
				id: `overlap-${overlaps.length + 1}`,
				lowerCandidatesLatex: [fixedStart, movingLeft],
				upperCandidatesLatex: [fixedEnd, movingRight],
				lowerLatex:
					fixed.start >= movingLeftValue ? fixedStart : movingLeft,
				upperLatex:
					fixed.end <= movingRightValue ? fixedEnd : movingRight,
				splitPointsLatex: splitPoints.map(({ latex }) => latex),
			});
		}
	}
	const fixedName = movingSignal === "h" ? "x" : "h";
	const terms = overlaps.flatMap((overlap) => {
		const boundaries = [
			overlap.lowerLatex,
			...overlap.splitPointsLatex,
			overlap.upperLatex,
		];
		return boundaries
			.slice(0, -1)
			.map(
				(lower, index) =>
					`\\int_{${lower}}^{${boundaries[index + 1]}}${fixedName}(\\tau)${movingSignal}(t-\\tau)\\,d\\tau`,
			);
	});
	return {
		hasOverlap: overlaps.length > 0,
		overlaps,
		integralLatex:
			overlaps.length > 0 ? `y(t)=${terms.join("+")}` : "y(t)=0",
	};
}

/** Builds one typed Step 5 setup part. */
function buildSetupPart(
	interval: ConvolutionInterval,
	index: number,
	context: ConvolutionItsBuildContext,
): ConvolutionItsIntervalPart {
	return {
		id: `setup-${String(index + 1).padStart(2, "0")}`,
		title: `Determine Bounds for Region ${index + 1}`,
		intervalLatex: interval.labelLatex,
		resultLatex: interval.integralSetupLatex ?? "y(t)=0",
		options: [],
		setupBySignal: {
			h: buildPathSetup(
				interval,
				"h",
				context.xSections,
				context.hSections,
				context.xBreakpoints,
				context.hBreakpoints,
			),
			x: buildPathSetup(
				interval,
				"x",
				context.hSections,
				context.xSections,
				context.hBreakpoints,
				context.xBreakpoints,
			),
		},
		hints: [
			`Work only in the verified interval $${interval.labelLatex}$.`,
			"Choose the larger left edge for the lower limit and the smaller right edge for the upper limit.",
			"Split the integral anywhere an active signal changes slope or formula inside the overlap.",
		],
	};
}

/** Builds one typed Step 6 evaluation part. */
function buildEvaluationPart(
	interval: ConvolutionInterval,
	index: number,
): ConvolutionItsIntervalPart {
	return {
		id: `interval-${String(index + 1).padStart(2, "0")}`,
		title: `Evaluate Region ${index + 1}`,
		intervalLatex: interval.labelLatex,
		resultLatex: `y(t)=${interval.exprLatex},\\quad ${interval.labelLatex}`,
		options: [],
		hints: [
			`Evaluate only for $${interval.labelLatex}$.`,
			"Substitute every verified bound before simplifying.",
			`An equivalent simplified result is $y(t)=${interval.exprLatex}$.`,
		],
	};
}

/** Counts intersecting original signal sections. */
function countSectionOverlaps(sections: ConvolutionSignalSection[]): number {
	let count = 0;
	for (let left = 0; left < sections.length; left += 1) {
		for (let right = left + 1; right < sections.length; right += 1) {
			if (
				Math.max(sections[left].start, sections[right].start) <
				Math.min(sections[left].end, sections[right].end)
			)
				count += 1;
		}
	}
	return count;
}

/** Builds grouped transition contacts from original breakpoints. */
function buildTransitionGroups(
	context: ConvolutionItsBuildContext,
): ConvolutionTransitionGroup[] {
	return getFiniteConvolutionTransitionTimes(context.intervals).map(
		(time, index) => {
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
				return fixedBreakpoints.flatMap((fixed) =>
					movingBreakpoints
						.filter((point) => fixed + point === time)
						.map((point) => ({
							fixed,
							moving: point,
							equationLatex: `${formatConvolutionScalar(fixed)}=t-${formatConvolutionScalar(point)}`,
						})),
				);
			};
			return {
				id: `transition-${String(index + 1).padStart(2, "0")}`,
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
		({ exprLatex }) => exprLatex !== "0",
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
	return {
		step1: {
			intro: "A signal's support is the time range where it is nonzero. Its start, end, and width tell us when overlap can begin, when it must end, and how wide the convolution can be.",
			parts: [
				timingPart("x", xStart, xEnd),
				timingPart("h", hStart, hEnd),
				timingPart("y", yStart, yEnd),
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
			],
			hints: [
				"Convolution combines reflection, translation, multiplication, and integration.",
				"Use $\\tau$ as the integration variable while $t$ remains a parameter.",
				"One signal is fixed in $\\tau$ and the other uses $t-\\tau$.",
			],
		},
		step3: {
			prompt: "Choose one signal to reflect and slide now. Either path is valid; this choice controls the notation, bounds, and animator in the remaining work.",
			formulaBySignal: {
				x: buildFormulaStep("x"),
				h: buildFormulaStep("h"),
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
			sectionOverlapCounts: {
				x: countSectionOverlaps(context.xSections),
				h: countSectionOverlaps(context.hSections),
			},
			breakpointParts: [
				...context.xBreakpoints.slice(1, -1).map((value, index) => ({
					id: `x-breakpoint-${index + 1}`,
					signal: "x" as const,
					index: index + 1,
					value,
					title: `Find Interior Change ${index + 1} of x(t)`,
				})),
				...context.hBreakpoints.slice(1, -1).map((value, index) => ({
					id: `h-breakpoint-${index + 1}`,
					signal: "h" as const,
					index: index + 1,
					value,
					title: `Find Interior Change ${index + 1} of h(t)`,
				})),
			],
			transitionGroups,
			intervalBoundaries,
			intervalLabels: context.intervals.map(
				({ labelLatex }) => labelLatex,
			),
			hints: [
				"A breakpoint is a start edge, end edge, interior slope change, or formula change.",
				"For fixed breakpoint $a$ and moving breakpoint $b$, contact satisfies $a=t-b$.",
				"Solve each contact as $t=a+b$, group equal answers, and sort the results.",
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
