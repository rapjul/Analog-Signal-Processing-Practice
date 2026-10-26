import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import type { LaplaceTaskValidation } from "./task-validation";
import type { LaplaceAnswerField, LaplaceFieldTask } from "./types";
import { verifyLaplaceInterval, verifyLaplaceS } from "./verification";

/** @param field - Current coefficient or interval field. @param result - Exact outcome. @returns Contextual explanation without replacing the grading status. */
function fieldMessage(
	field: LaplaceAnswerField,
	result: TransformValidationResult,
): string {
	if (result.status === "correct") return "verified exactly.";
	if (field.interval || result.status === "unsupported")
		return result.message;
	if (result.status === "invalid")
		return "enter a complete exact value, including zero.";
	return (
		field.incorrectMessage ??
		"check this value's sign and the operation in the displayed formula."
	);
}

/** @param task - Independently derived field targets. @param values - Preserved learner drafts. @returns Per-field checks and the first failing status, without advancing. */
export function validateLaplaceFields(
	task: LaplaceFieldTask,
	values: Record<string, string>,
): LaplaceTaskValidation {
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
					message: `${field.label}: ${fieldMessage(field, checked)}`,
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
