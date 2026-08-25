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
							lowerValues: ["", ""],
							upperValues: ["", ""],
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

/** Validates the active bounds or split points for an overlap interval. */
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
				"Confirm the overlap choice before entering its integration bounds.",
		};

	for (const [index, expected] of setup.overlaps.entries()) {
		const input = state.boundInputs[index];
		if (!input)
			return { kind: "blank", message: "Complete this overlap first." };

		if (state.stage === "evaluate") {
			const lower0 = input.lowerValues?.[0] ?? "";
			const lower1 = input.lowerValues?.[1] ?? "";
			const upper0 = input.upperValues?.[0] ?? "";
			const upper1 = input.upperValues?.[1] ?? "";

			if (
				!lower0.trim() ||
				!upper0.trim() ||
				(expected.lowerCandidatesLatex[1] && !lower1.trim()) ||
				(expected.upperCandidatesLatex[1] && !upper1.trim())
			) {
				return {
					kind: "blank",
					message:
						"Evaluate all candidate boundary expressions at the test time.",
				};
			}

			if (
				!convolutionScalarMatches(
					lower0,
					expected.lowerCandidateValues[0],
				) ||
				(expected.lowerCandidatesLatex[1] &&
					!convolutionScalarMatches(
						lower1,
						expected.lowerCandidateValues[1],
					))
			) {
				return {
					kind: "incorrect",
					message:
						"Recheck your evaluation of the lower limit candidates at the test time.",
				};
			}

			if (
				!convolutionScalarMatches(
					upper0,
					expected.upperCandidateValues[0],
				) ||
				(expected.upperCandidatesLatex[1] &&
					!convolutionScalarMatches(
						upper1,
						expected.upperCandidateValues[1],
					))
			) {
				return {
					kind: "incorrect",
					message:
						"Recheck your evaluation of the upper limit candidates at the test time.",
				};
			}
		}

		if (state.stage === "bounds") {
			if (!input.lower.trim() || !input.upper.trim())
				return {
					kind: "blank",
					message:
						"Enter the symbolic lower and upper limits for this overlap.",
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

	if (state.stage === "evaluate") {
		return { kind: "valid", nextStage: "bounds" };
	}

	if (
		state.stage === "bounds" &&
		setup.overlaps.some((overlap) => overlap.splitPointsLatex.length > 0)
	)
		return { kind: "valid", nextStage: "splits" };
	return { kind: "valid" };
}
