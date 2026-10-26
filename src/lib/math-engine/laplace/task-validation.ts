import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { emptyConstruction, validateConstruction } from "./construction";
import {
	type ConstructionFeedback,
	constructionFeedback,
} from "./construction-feedback";
import type {
	LaplaceConstruction,
	LaplaceResponseTerm,
	LaplaceTask,
} from "./types";
import {
	verifyLaplaceInterval,
	verifyLaplaceS,
	verifyLaplaceTime,
} from "./verification";

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
	)
		return {
			result: validateConstruction(task, construction),
			fields: {},
			construction: constructionFeedback(task, construction),
		};
	if (task.kind === "fields") {
		const fields = Object.fromEntries(
			task.fields.map((field) => {
				const checked = field.interval
					? verifyLaplaceInterval(
							values[field.id] ?? "",
							field.target,
							field.interval,
						)
					: verifyLaplaceS(values[field.id] ?? "", field.target);
				return [
					field.id,
					{
						...checked,
						message: `${field.label}: ${checked.status === "correct" ? "verified exactly." : field.interval || checked.status === "unsupported" ? checked.message : checked.status === "invalid" ? "enter a complete exact value, including zero." : "check this value's sign and the operation in the displayed formula."}`,
					},
				];
			}),
		);
		const failed = Object.values(fields).find(
			(result) => result.status !== "correct",
		);
		return {
			fields,
			result: failed ?? {
				status: "correct",
				message: "Every coefficient is verified exactly.",
			},
		};
	}
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
