import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { emptyConstruction, validateConstruction } from "./construction";
import {
	type ConstructionFeedback,
	constructionFeedback,
} from "./construction-feedback";
import { validateLaplaceFields } from "./field-validation";
import { entryIssue } from "./input-entry";
import type {
	LaplaceConstruction,
	LaplaceResponseTerm,
	LaplaceSingleTask,
	LaplaceTask,
} from "./types";
import {
	verifyLaplaceS,
	verifyLaplaceScalar,
	verifyLaplaceTime,
} from "./verification";

/** @param task - Stable conceptual choices and accepted alternatives. @param input - Submitted choice value. @returns Contextual feedback independent of display metadata. */
function validateChoice(
	task: LaplaceSingleTask,
	input: string,
): TransformValidationResult {
	if (!input.trim())
		return {
			status: "invalid",
			message: "Select an answer before checking.",
		};
	const correct = (task.accepted ?? [task.answer]).includes(input);
	let message =
		task.hints[1] ??
		"Review the definition in this question before trying again.";
	if (task.accepted && !task.accepted.includes(input))
		message =
			input === "Direct Transform Pairs"
				? "This expression has multiple distinct denominator factors, so it is not a single supported pair. First rewrite it as a sum using partial fractions."
				: "Simple-pole cover-up requires distinct real linear factors. Repeated or quadratic factors need coefficient matching, or a direct-pair rewrite when one denominator family remains.";
	return { status: correct ? "correct" : "incorrect", message };
}

/** Task feedback and independently graded coefficient results. */
export interface LaplaceTaskValidation {
	/** Field-specific construction diagnostics. */ construction?: ConstructionFeedback;
	/** Overall task outcome. */ result: TransformValidationResult;
	/** Per-field outcomes, without advancing the task. */ fields: Record<
		string,
		TransformValidationResult
	>;
}

/** @param task - Structured task. @param input - Single submitted answer. @param values - Coefficient drafts. @param terms - Independent time-response parameters. @param construction - Learner-created mathematical rows. @returns Strict validation without changing progress. */
export function validateLaplaceTask(
	task: LaplaceTask,
	input: string,
	values: Record<string, string>,
	terms: LaplaceResponseTerm[],
	construction: LaplaceConstruction = emptyConstruction(),
): LaplaceTaskValidation {
	if ("construction" in task) {
		const result = validateConstruction(task, construction);
		return {
			result,
			fields: {},
			construction:
				result.status === "correct"
					? {}
					: constructionFeedback(task, construction),
		};
	}
	if (task.kind === "fields") return validateLaplaceFields(task, values);
	let result: TransformValidationResult;
	switch (task.kind) {
		case "choice":
			result = validateChoice(task, input);
			break;
		case "scalar":
			result =
				entryIssue(input, task.entry ?? { kind: "exact" }) ??
				verifyLaplaceScalar(input, task.answer);
			break;
		case "s":
			result = verifyLaplaceS(input, task.answer, task.lhs);
			break;
		case "t":
			result = verifyLaplaceTime(input, task.terms ?? terms, task.lhs);
			break;
		default:
			throw new Error("Unsupported Laplace task control.");
	}
	return { result, fields: {} };
}
