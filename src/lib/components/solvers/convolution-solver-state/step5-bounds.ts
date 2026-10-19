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
	convolutionScalarMatches,
	verifyConvolutionExpression,
} from "$lib/components/solvers/convolution-solver-state/expression-validation";
import type { CanonicalInterval } from "$lib/math-engine/canonical-transform";
import type {
	ConvolutionIntegralPathSetup,
	ConvolutionOverlapBounds,
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

/** One connected overlap's learner-entered bounds and evaluations. */
type BoundInput = ConvolutionBoundsSubStepState["boundInputs"][number];

/**
 * Checks all numeric candidates before diagnosing a specific mismatch.
 * @param input - Learner candidate evaluations.
 * @param expected - Verified overlap metadata.
 * @returns Valid evaluations or a missing/incorrect input diagnostic.
 */
function validateCandidates(
	input: BoundInput,
	expected: ConvolutionOverlapBounds,
): BoundsValidationResult {
	const pairs = [
		{
			values: input.lowerValues,
			expressions: expected.lowerCandidatesLatex,
			targets: expected.lowerCandidateValues,
			label: "lower",
		},
		{
			values: input.upperValues,
			expressions: expected.upperCandidatesLatex,
			targets: expected.upperCandidateValues,
			label: "upper",
		},
	];
	for (const pair of pairs) {
		for (const [index, expression] of pair.expressions.entries()) {
			if ((index === 0 || expression) && !pair.values?.[index]?.trim())
				return {
					kind: "blank",
					message:
						"Evaluate all candidate boundary expressions at the test time.",
				};
		}
	}
	for (const pair of pairs) {
		for (const [index, expression] of pair.expressions.entries()) {
			if (
				(index === 0 || expression) &&
				!convolutionScalarMatches(
					pair.values?.[index] ?? "",
					pair.targets[index] ?? NaN,
				)
			)
				return {
					kind: "incorrect",
					message: `Recheck your evaluation of the ${pair.label} limit candidates at the test time.`,
				};
		}
	}
	return { kind: "valid" };
}

/**
 * Checks symbolic limits on their active interval.
 * @param input - Learner lower and upper bounds.
 * @param expected - Verified overlap metadata.
 * @param domain - Open output interval.
 * @returns Verified limits or actionable feedback.
 */
function validateSymbolicBounds(
	input: BoundInput,
	expected: ConvolutionOverlapBounds,
	domain?: CanonicalInterval,
): BoundsValidationResult {
	if (!input.lower.trim() || !input.upper.trim())
		return {
			kind: "blank",
			message:
				"Enter the symbolic lower and upper limits for this overlap.",
		};
	for (const [value, target, message] of [
		[
			input.lower,
			expected.lowerLatex,
			"The lower limit is the larger of the two active left edges.",
		],
		[
			input.upper,
			expected.upperLatex,
			"The upper limit is the smaller of the two active right edges.",
		],
	] as const) {
		const result = verifyConvolutionExpression(value, target, domain);
		if (result.status === "invalid" || result.status === "unsupported")
			return { kind: "blank", message: result.message };
		if (result.status !== "correct")
			return { kind: "misconception", message };
	}
	return { kind: "valid" };
}

/**
 * Checks every interior formula-change location.
 * @param input - Learner split expressions.
 * @param expected - Required split locations.
 * @param domain - Open output interval.
 * @returns Verified splits or actionable feedback.
 */
function validateSplits(
	input: BoundInput,
	expected: ConvolutionOverlapBounds,
	domain?: CanonicalInterval,
): BoundsValidationResult {
	if (
		input.splits.length !== expected.splitPointsLatex.length ||
		input.splits.some((split) => !split.trim())
	)
		return {
			kind: "blank",
			message:
				"Enter every interior split point where an active formula changes.",
		};
	for (const [index, split] of input.splits.entries()) {
		const result = verifyConvolutionExpression(
			split,
			expected.splitPointsLatex[index] ?? "",
			domain,
		);
		if (result.status === "invalid" || result.status === "unsupported")
			return { kind: "blank", message: result.message };
		if (result.status !== "correct")
			return {
				kind: "incorrect",
				message:
					"Split wherever an active triangle apex, slope change, or piecewise formula change lies inside the bounds.",
			};
	}
	return { kind: "valid" };
}

/**
 * Validates the active bounds or split points for an overlap interval.
 * @param state - Learner entries for this interval.
 * @param setup - Verified overlap geometry.
 * @param domain - Active open output interval; defaults to global equivalence.
 * @returns Next stage or a diagnostic without advancing.
 */
export function validateBoundsStage(
	state: ConvolutionBoundsSubStepState,
	setup: ConvolutionIntegralPathSetup,
	domain?: CanonicalInterval,
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
		const result =
			state.stage === "evaluate"
				? validateCandidates(input, expected)
				: state.stage === "bounds"
					? validateSymbolicBounds(input, expected, domain)
					: validateSplits(input, expected, domain);
		if (result.kind !== "valid") return result;
	}
	if (state.stage === "evaluate")
		return { kind: "valid", nextStage: "bounds" };
	if (
		state.stage === "bounds" &&
		setup.overlaps.some((overlap) => overlap.splitPointsLatex.length > 0)
	)
		return { kind: "valid", nextStage: "splits" };
	return { kind: "valid" };
}
