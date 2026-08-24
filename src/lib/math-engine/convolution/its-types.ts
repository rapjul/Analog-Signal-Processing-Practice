/** Shared structured tutoring metadata for continuous-time convolution. */

import type { ConvolutionInterval, ConvolutionSignalSection } from "./types";

/** Signal selected as the reflected and translated convolution operand. */
export type ConvolutionMovingSignal = "x" | "h";

/** One selectable mathematical response. */
export interface ConvolutionItsOption {
	/** Stable answer identifier. */
	id: string;
	/** Mathematical response rendered as LaTeX. */
	latex: string;
	/** Whether the response is correct. */
	isCorrect: boolean;
	/** Targeted diagnostic feedback. */
	feedback?: string;
}

/** Data for one single-choice tutor step. */
export interface ConvolutionItsChoiceStep {
	/** Student-facing prompt. */
	prompt: string;
	/** Selectable answer choices. */
	options: ConvolutionItsOption[];
	/** Progressive hints. */
	hints: string[];
}

/** Exact timing expected in one Step 1 part. */
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
	/** Expected start-to-end span. */
	width: number;
	/** Completed exact summary. */
	resultLatex: string;
	/** Progressive hints. */
	hints: string[];
}

/** Multipart Step 1 timing data. */
export interface ConvolutionItsTimingStep {
	/** Plain-language introduction. */
	intro: string;
	/** Ordered timing challenges. */
	parts: ConvolutionTimingPart[];
}

/** One transformed connected section. */
export interface ConvolutionTransformedSection {
	/** Stable section identifier. */
	id: string;
	/** One-based section number. */
	index: number;
	/** Expected transformed left edge. */
	leftLatex: string;
	/** Expected transformed right edge. */
	rightLatex: string;
	/** Expected endpoint inclusion after reflection. */
	includedEndpoint: "left" | "right" | "both" | "neither";
	/** Original section rendered for context. */
	originalLatex: string;
}

/** Multipart Step 3 data. */
export interface ConvolutionItsFlipStep {
	/** Explanation shown before the path choice. */
	prompt: string;
	/** Formula challenge for each path. */
	formulaBySignal: Record<ConvolutionMovingSignal, ConvolutionItsChoiceStep>;
	/** Expected transformed sections for each path. */
	sectionsBySignal: Record<
		ConvolutionMovingSignal,
		ConvolutionTransformedSection[]
	>;
	/** Path-selection hints. */
	choiceHints: string[];
	/** Transformed-edge hints. */
	edgeHints: string[];
}

/** One original breakpoint challenge. */
export interface ConvolutionBreakpointPart {
	/** Stable part identifier. */
	id: string;
	/** Owning signal. */
	signal: "x" | "h";
	/** One-based breakpoint number. */
	index: number;
	/** Expected breakpoint value. */
	value: number;
	/** Student-facing title. */
	title: string;
	/** Tailored hints. */
	hints: string[];
}

/** One breakpoint contact. */
export interface ConvolutionBreakpointContact {
	/** Stable path-specific identifier. */
	id: string;
	/** Fixed original breakpoint. */
	fixed: number;
	/** Original moving breakpoint. */
	moving: number;
	/** Expected transformed moving breakpoint. */
	transformedLatex: string;
	/** Normalized contact equation. */
	equationLatex: string;
	/** Exact transition time. */
	transitionTime: number;
	/** Shared equal-time group identifier. */
	transitionGroupId: string;
	/** Earlier equal-time contact identifier. */
	duplicateOf?: string;
	/** Contact-formation hints. */
	formulationHints: string[];
	/** Contact-solving hints. */
	solutionHints: string[];
}

/** Contacts grouped by transition time. */
export interface ConvolutionTransitionGroup {
	/** Stable group identifier. */
	id: string;
	/** Exact transition time. */
	time: number;
	/** Contacts for each moving path. */
	contactsBySignal: Record<
		ConvolutionMovingSignal,
		ConvolutionBreakpointContact[]
	>;
}

/** Structured Step 4 data. */
export interface ConvolutionItsTransitionStep {
	/** Connected-section counts. */
	sectionCounts: Record<"x" | "h", number>;
	/** Signal-specific counting hints. */
	sectionHints: Record<"x" | "h", string[]>;
	/** Interior breakpoint challenges. */
	breakpointParts: ConvolutionBreakpointPart[];
	/** Ordered transition groups. */
	transitionGroups: ConvolutionTransitionGroup[];
	/** Expected sorted boundaries. */
	intervalBoundaries: number[];
	/** Exact interval labels. */
	intervalLabels: string[];
	/** Transition-count hints. */
	transitionCountHints: string[];
	/** Interval-count hints. */
	intervalCountHints: string[];
	/** Interval-construction hints. */
	intervalBuilderHints: string[];
}

/** One connected overlap bound pair. */
export interface ConvolutionOverlapBounds {
	/** Stable overlap identifier. */
	id: string;
	/** Candidates compared by max. */
	lowerCandidatesLatex: [string, string];
	/** Candidates compared by min. */
	upperCandidatesLatex: [string, string];
	/** Simplified active lower limit. */
	lowerLatex: string;
	/** Simplified active upper limit. */
	upperLatex: string;
	/** Required interior split points. */
	splitPointsLatex: string[];
}

/** Path-specific integration setup. */
export interface ConvolutionIntegralPathSetup {
	/** Whether an overlap exists. */
	hasOverlap: boolean;
	/** Connected overlap components. */
	overlaps: ConvolutionOverlapBounds[];
	/** Complete verified integral. */
	integralLatex: string;
}

/** One interval challenge. */
export interface ConvolutionItsIntervalPart {
	/** Stable part identifier. */
	id: string;
	/** Short title. */
	title: string;
	/** Interval condition. */
	intervalLatex: string;
	/** Correct interval result. */
	resultLatex: string;
	/** Legacy selectable responses. */
	options: ConvolutionItsOption[];
	/** Exact setup for both moving paths. */
	setupBySignal?: Record<
		ConvolutionMovingSignal,
		ConvolutionIntegralPathSetup
	>;
	/** Interval-specific hints. */
	hints: string[];
	/** Moving-path-specific hints. */
	hintsBySignal?: Record<ConvolutionMovingSignal, string[]>;
}

/** Complete seven-step tutoring scaffold. */
export interface ConvolutionItsData {
	/** Step 1 timing data. */
	step1: ConvolutionItsTimingStep;
	/** Step 2 definition data. */
	step2: ConvolutionItsChoiceStep;
	/** Step 3 flip-path data. */
	step3: ConvolutionItsFlipStep;
	/** Step 4 transition data. */
	step4: ConvolutionItsTransitionStep;
	/** Step 5 bound data. */
	step5: { parts: ConvolutionItsIntervalPart[] };
	/** Step 6 evaluation data. */
	step6: { parts: ConvolutionItsIntervalPart[] };
	/** Step 7 piecewise data. */
	step7: ConvolutionItsChoiceStep & { resultLatex: string };
}

/** Exact metadata needed to build tutoring data. */
export interface ConvolutionItsBuildContext {
	/** Reproducible option-ordering seed. */
	seed?: number;
	/** Ordered analytical output intervals. */
	intervals: ConvolutionInterval[];
	/** Connected sections of x. */
	xSections: ConvolutionSignalSection[];
	/** Connected sections of h. */
	hSections: ConvolutionSignalSection[];
	/** Support edges and interior breakpoints of x. */
	xBreakpoints: number[];
	/** Support edges and interior breakpoints of h. */
	hBreakpoints: number[];
}
