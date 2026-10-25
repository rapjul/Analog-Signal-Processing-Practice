import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import type { LaplaceResponseTerm, LaplaceTask } from "./types";
import { verifyLaplaceS, verifyLaplaceTime } from "./verification";

/** Task feedback and independently graded coefficient results. */
export interface LaplaceTaskValidation {
	/** Overall task outcome. */ result: TransformValidationResult;
	/** Per-field outcomes, without advancing the task. */ fields: Record<
		string,
		TransformValidationResult
	>;
}

/** @param task - Structured task. @param input - Single submitted answer. @param values - Coefficient drafts. @param terms - Independent time-response parameters. @returns Strict validation without changing progress. */
export function validateLaplaceTask(
	task: LaplaceTask,
	input: string,
	values: Record<string, string>,
	terms: LaplaceResponseTerm[],
): LaplaceTaskValidation {
	if (task.kind === "fields") {
		const fields = Object.fromEntries(
			task.fields.map((field) => [
				field.id,
				verifyLaplaceS(values[field.id] ?? "", field.target),
			]),
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
					: input === task.answer
						? "correct"
						: "incorrect",
				message: !input.trim()
					? "Select an answer before checking."
					: "Recheck the mathematical distinction in this question.",
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
