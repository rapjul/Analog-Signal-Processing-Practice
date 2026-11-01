import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { entryIssue, ZERO_POLYNOMIAL } from "./input-entry";
import type { LaplaceTaskValidation } from "./task-validation";
import type { LaplaceAnswerField, LaplaceFieldTask } from "./types";
import { verifyLaplaceInterval, verifyLaplaceScalar } from "./verification";

/** @param field - Current coefficient or interval field. @param result - Exact outcome. @returns Contextual explanation without replacing the grading status. */
function fieldMessage(
	field: LaplaceAnswerField,
	result: TransformValidationResult,
): string {
	if (result.status === "correct")
		return field.entry?.kind === "boolean"
			? `${field.target === "1" ? "Active" : "Inactive"}—verified.`
			: "verified exactly.";
	if (
		field.entry &&
		!["exact", "expression"].includes(field.entry.kind) &&
		result.status === "invalid"
	)
		return result.message;
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
			const entry = field.entry ?? {
				kind: field.interval ? "expression" : "exact",
			};
			const raw =
				values[field.id] ?? (entry.kind === "boolean" ? "0" : "");
			const checked =
				entryIssue(raw, entry) ??
				(field.interval
					? verifyLaplaceInterval(raw, field.target, field.interval)
					: verifyLaplaceScalar(
							raw === ZERO_POLYNOMIAL ? "-1" : raw,
							field.target,
						));
			return [
				field.id,
				{
					...checked,
					message: `${field.label}: ${fieldMessage(field, checked)}`,
				},
			];
		}),
	);
	const failed =
		Object.values(fields).find(
			(result) =>
				result.status === "invalid" || result.status === "unsupported",
		) ??
		Object.values(fields).find((result) => result.status !== "correct");
	return {
		fields,
		result: failed ?? {
			status: "correct",
			message: "Every field is verified exactly.",
		},
	};
}
