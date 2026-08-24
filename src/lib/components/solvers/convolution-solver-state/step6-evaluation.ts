/** State creation and strict term-by-term validation for convolution Step 6. */

import {
	createMultiPartStepState,
	createSubStepState,
} from "$lib/components/solvers/base-step-solver.svelte";
import type {
	ConvolutionEvaluationStepState,
	ConvolutionEvaluationSubStepState,
} from "$lib/components/solvers/convolution-solver-state/convolution-step-types";
import { convolutionExpressionsMatch } from "$lib/components/solvers/convolution-solver-state/expression-validation";
import type {
	ConvolutionItsIntervalPart,
	ConvolutionMovingSignal,
	ConvolutionProblem,
} from "$lib/math-engine/convolution/index";
import { tryEvaluateLatexAt } from "$lib/math-engine/evaluator";

/** Pure validation result for one visible evaluation field. */
export type EvaluationValidationResult =
	| {
			kind: "valid";
			nextStage?: ConvolutionEvaluationSubStepState["stage"];
			nextTermIndex?: number;
	  }
	| { kind: "blank" | "malformed" | "incorrect"; message: string };

/** Returns deterministic sample times strictly inside one interval. */
export function intervalSampleTimes(
	minimum: number,
	maximum: number,
): number[] {
	if (Number.isFinite(minimum) && Number.isFinite(maximum)) {
		const span = maximum - minimum;
		return [0.17, 0.33, 0.5, 0.67, 0.83].map(
			(ratio) => minimum + span * ratio,
		);
	}
	if (Number.isFinite(minimum))
		return [0.5, 1, 2, 3, 5].map((offset) => minimum + offset);
	if (Number.isFinite(maximum))
		return [0.5, 1, 2, 3, 5].map((offset) => maximum - offset);
	return [-3, -1, 0, 2, 5];
}

/** Selects the first required stage for one concrete term. */
function firstTermStage(
	part: ConvolutionItsIntervalPart,
	movingSignal: ConvolutionMovingSignal,
): ConvolutionEvaluationSubStepState["stage"] {
	const first = part.evaluationBySignal?.[movingSignal][0];
	if (!first) return "combined";
	return first.geometry ? "geometry-amplitude" : "upper";
}

/** Creates Step 6 state, excluding carried zero intervals from active work. */
export function createEvaluationState(
	problem: ConvolutionProblem,
	movingSignal: ConvolutionMovingSignal = "h",
): ConvolutionEvaluationStepState {
	const order = problem.itsData.step6.parts
		.filter(({ carriedZero }) => !carriedZero)
		.map(({ id }) => id);
	const subSteps = Object.fromEntries(
		problem.itsData.step6.parts.map((part) => {
			const terms = part.evaluationBySignal?.[movingSignal] ?? [];
			return [
				part.id,
				{
					...createSubStepState(
						part.id,
						part.title,
						{
							activeTermIndex: 0,
							stage: firstTermStage(part, movingSignal),
							termInputs: terms.map(() => ({
								amplitudeProduct: "",
								overlapWidth: "",
								upper: "",
								lower: "",
								difference: "",
							})),
							input: "",
						},
						part.hints,
					),
					isValid: Boolean(part.carriedZero),
				},
			];
		}),
	);
	return createMultiPartStepState(
		{},
		order,
		subSteps,
		order[0] ??
			problem.itsData.step6.parts[0]?.id ??
			"interval-placeholder",
	) as ConvolutionEvaluationStepState;
}

/** Validates one active term field or the final combined interval result. */
export function validateEvaluationStage(
	state: ConvolutionEvaluationSubStepState,
	part: ConvolutionItsIntervalPart,
	movingSignal: ConvolutionMovingSignal,
	expectedFinal: string,
	minimum: number,
	maximum: number,
): EvaluationValidationResult {
	const samples = intervalSampleTimes(minimum, maximum);
	if (state.stage === "combined") {
		if (!state.input.trim())
			return {
				kind: "blank",
				message: "Enter the combined expression for this interval.",
			};
		if (tryEvaluateLatexAt(state.input, samples[0] ?? 0) === null)
			return {
				kind: "malformed",
				message:
					"The expression could not be parsed. Enter valid math in t.",
			};
		if (!convolutionExpressionsMatch(state.input, expectedFinal, samples))
			return {
				kind: "incorrect",
				message:
					"The combined expression does not match the verified term contributions on this interval.",
			};
		return { kind: "valid" };
	}

	const terms = part.evaluationBySignal?.[movingSignal] ?? [];
	const term = terms[state.activeTermIndex];
	const input = state.termInputs[state.activeTermIndex];
	if (!term || !input) return { kind: "valid", nextStage: "combined" };
	const checks = {
		"geometry-amplitude": {
			value: input.amplitudeProduct,
			expected: term.geometry?.amplitudeProductLatex ?? "",
			blank: "Enter the product of the two active rectangular amplitudes.",
			wrong: "Multiply the signed amplitudes of the two active pieces.",
		},
		"geometry-width": {
			value: input.overlapWidth,
			expected: term.geometry?.overlapWidthLatex ?? "",
			blank: "Enter upper limit minus lower limit for the overlap width.",
			wrong: "The overlap width is the verified upper limit minus the lower limit.",
		},
		upper: {
			value: input.upper,
			expected: term.upperSubstitutionLatex,
			blank: "Evaluate the displayed primitive at the verified upper limit.",
			wrong: "The upper substitution uses the wrong limit or expression.",
		},
		lower: {
			value: input.lower,
			expected: term.lowerSubstitutionLatex,
			blank: "Evaluate the displayed primitive at the verified lower limit.",
			wrong: "The lower substitution uses the wrong limit or expression.",
		},
		difference: {
			value: input.difference,
			expected: term.differenceLatex,
			blank: "Enter the upper substitution minus the lower substitution.",
			wrong: "Keep the order F(upper) minus F(lower), including all signs.",
		},
	} as const;
	const check = checks[state.stage];
	if (!check.value.trim()) return { kind: "blank", message: check.blank };
	if (tryEvaluateLatexAt(check.value, samples[0] ?? 0) === null)
		return {
			kind: "malformed",
			message:
				"This field could not be parsed as a mathematical expression.",
		};
	if (!convolutionExpressionsMatch(check.value, check.expected, samples))
		return { kind: "incorrect", message: check.wrong };

	if (state.stage === "geometry-amplitude")
		return { kind: "valid", nextStage: "geometry-width" };
	if (state.stage === "geometry-width")
		return { kind: "valid", nextStage: "upper" };
	if (state.stage === "upper") return { kind: "valid", nextStage: "lower" };
	if (state.stage === "lower")
		return { kind: "valid", nextStage: "difference" };
	const nextTermIndex = state.activeTermIndex + 1;
	if (nextTermIndex < terms.length)
		return {
			kind: "valid",
			nextTermIndex,
			nextStage: terms[nextTermIndex]?.geometry
				? "geometry-amplitude"
				: "upper",
		};
	return { kind: "valid", nextStage: "combined" };
}
