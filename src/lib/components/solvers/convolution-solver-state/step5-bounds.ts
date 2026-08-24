/** State creation and pure staged validation for convolution Step 5. */

import {
	createMultiPartStepState,
	createSubStepState,
} from "$lib/components/solvers/base-step-solver.svelte";
import type {
	ConvolutionBoundsStepState,
	ConvolutionBoundsSubStepState,
} from "$lib/components/solvers/convolution-solver-state/convolution-step-types";
import {
	convolutionExpressionsMatch,
	convolutionScalarMatches,
} from "$lib/components/solvers/convolution-solver-state/expression-validation";
import type {
	ConvolutionIntegralPathSetup,
	ConvolutionProblem,
} from "$lib/math-engine/convolution/index";

/** Result from checking the currently visible bound task. */
export type BoundsValidationResult =
	| { kind: "valid"; nextStage?: ConvolutionBoundsSubStepState["stage"] }
	| { kind: "blank" | "incorrect" | "misconception"; message: string };

/** Creates ordered staged bound state for every Step 5 interval. */
export function createBoundsState(
	problem: ConvolutionProblem,
): ConvolutionBoundsStepState {
	const order = problem.itsData.step5.parts.map(({ id }) => id);
	const subSteps = Object.fromEntries(
		problem.itsData.step5.parts.map((part) => {
			const xOverlaps = part.setupBySignal?.x.overlaps ?? [];
			const hOverlaps = part.setupBySignal?.h.overlaps ?? [];
			const template =
				xOverlaps.length >= hOverlaps.length ? xOverlaps : hOverlaps;
			return [
				part.id,
				createSubStepState(
					part.id,
					part.title,
					{
						stage: "overlap" as const,
						hasOverlap: null as boolean | null,
						boundInputs: template.map((overlap) => ({
							lowerValues: ["", ""] as [string, string],
							upperValues: ["", ""] as [string, string],
							lower: "",
							upper: "",
							splits: overlap.splitPointsLatex.map(() => ""),
						})),
					},
					part.hints,
				),
			];
		}),
	);
	return createMultiPartStepState(
		{},
		order,
		subSteps,
		order[0] ?? "setup-placeholder",
	) as ConvolutionBoundsStepState;
}

/** Validates only the currently visible candidate, bound, or split task. */
export function validateBoundsStage(
	state: ConvolutionBoundsSubStepState,
	setup: ConvolutionIntegralPathSetup,
): BoundsValidationResult {
	if (state.hasOverlap === null)
		return {
			kind: "blank",
			message:
				"First decide whether the signals overlap in this interval.",
		};
	if (state.hasOverlap !== setup.hasOverlap)
		return {
			kind: "misconception",
			message:
				"Compare the fixed and transformed left and right edges before deciding whether overlap exists.",
		};
	if (!setup.hasOverlap) return { kind: "valid" };
	if (state.stage === "overlap")
		return {
			kind: "blank",
			message:
				"Confirm the overlap choice before comparing its active bounds.",
		};

	for (const [index, expected] of setup.overlaps.entries()) {
		const input = state.boundInputs[index];
		if (!input)
			return { kind: "blank", message: "Complete this overlap first." };
		if (state.stage === "lower") {
			if (input.lowerValues.some((value) => !value.trim()))
				return {
					kind: "blank",
					message:
						"Evaluate both lower candidates at the displayed representative time.",
				};
			if (
				!input.lowerValues.every((value, candidateIndex) =>
					convolutionScalarMatches(
						value,
						expected.lowerCandidateValues[candidateIndex] ??
							Number.NaN,
					),
				)
			)
				return {
					kind: "incorrect",
					message:
						"Substitute the displayed representative time into each lower candidate, then compare the two values.",
				};
		}
		if (state.stage === "upper") {
			if (input.upperValues.some((value) => !value.trim()))
				return {
					kind: "blank",
					message:
						"Evaluate both upper candidates at the displayed representative time.",
				};
			if (
				!input.upperValues.every((value, candidateIndex) =>
					convolutionScalarMatches(
						value,
						expected.upperCandidateValues[candidateIndex] ??
							Number.NaN,
					),
				)
			)
				return {
					kind: "incorrect",
					message:
						"Substitute the displayed representative time into each upper candidate, then compare the two values.",
				};
		}
		if (state.stage === "bounds") {
			if (!input.lower.trim() || !input.upper.trim())
				return {
					kind: "blank",
					message:
						"Enter the symbolic lower and upper limits selected by those comparisons.",
				};
			if (!convolutionExpressionsMatch(input.lower, expected.lowerLatex))
				return {
					kind: "misconception",
					message:
						"The lower limit is the larger of the two active left edges.",
				};
			if (!convolutionExpressionsMatch(input.upper, expected.upperLatex))
				return {
					kind: "misconception",
					message:
						"The upper limit is the smaller of the two active right edges.",
				};
		}
		if (state.stage === "splits") {
			if (input.splits.some((split) => !split.trim()))
				return {
					kind: "blank",
					message:
						"Enter every interior split point where an active formula changes.",
				};
			if (
				!input.splits.every((split, splitIndex) =>
					convolutionExpressionsMatch(
						split,
						expected.splitPointsLatex[splitIndex] ?? "",
					),
				)
			)
				return {
					kind: "incorrect",
					message:
						"Split wherever an active triangle apex, slope change, or piecewise formula change lies inside the bounds.",
				};
		}
	}

	if (state.stage === "lower") return { kind: "valid", nextStage: "upper" };
	if (state.stage === "upper") return { kind: "valid", nextStage: "bounds" };
	if (
		state.stage === "bounds" &&
		setup.overlaps.some((overlap) => overlap.splitPointsLatex.length > 0)
	)
		return { kind: "valid", nextStage: "splits" };
	return { kind: "valid" };
}
