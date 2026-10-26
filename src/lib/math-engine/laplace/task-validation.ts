import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { emptyConstruction, validateConstruction } from "./construction";
import {
	type ConstructionFeedback,
	constructionFeedback,
} from "./construction-feedback";
import { validateLaplaceFields } from "./field-validation";
import type {
	LaplaceConstruction,
	LaplaceResponseTerm,
	LaplaceTask,
} from "./types";
import { verifyLaplaceS, verifyLaplaceTime } from "./verification";

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
	if (
		task.kind === "factors" ||
		task.kind === "roots" ||
		task.kind === "template"
	) {
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
			result = {
				status: !input.trim()
					? "invalid"
					: (task.accepted ?? [task.answer]).includes(input)
						? "correct"
						: "incorrect",
				message: !input.trim()
					? "Select an answer before checking."
					: task.accepted && !task.accepted.includes(input)
						? input === "Direct Transform Pairs"
							? "This expression has multiple distinct denominator factors, so it is not a single supported pair. First rewrite it as a sum using partial fractions."
							: "Simple-pole cover-up requires distinct real linear factors. Repeated or quadratic factors need coefficient matching, or a direct-pair rewrite when one denominator family remains."
						: (task.hints[1] ??
							"Review the definition in this question before trying again."),
			};
			break;
		case "scalar":
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
