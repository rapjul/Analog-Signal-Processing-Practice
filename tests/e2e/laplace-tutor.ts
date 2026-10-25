import { expect, type Page } from "@playwright/test";
import type {
	LaplaceExercise,
	LaplaceTask,
} from "$lib/math-engine/laplace/types";

/** @param page - Browser. @param task - Active task. @param answer - Submission. Checks ordinary production controls. */
export async function answerLaplaceTask(
	page: Page,
	task: LaplaceTask,
	answer = task.answer,
): Promise<void> {
	const active = page.locator(".step-card.active");
	await expect(active.locator("[data-task-id]")).toHaveAttribute(
		"data-task-id",
		task.id,
	);
	if (task.kind === "choice") {
		const radios = active.locator('input[type="radio"]');
		const index = await radios.evaluateAll(
			/** @param inputs - Radio inputs. @param expected - Exact option. @returns Matching index. */
			(inputs, expected) =>
				inputs.findIndex(
					(input) => (input as HTMLInputElement).value === expected,
				),
			answer,
		);
		if (index < 0) throw new Error(`Missing option for ${task.id}`);
		await radios.nth(index).check();
	} else if (task.kind === "fields") {
		for (const field of task.fields)
			await active
				.locator(`[data-field-id="${field.id}"]`)
				.fill(field.target);
	} else await active.locator("#laplace-input").fill(answer);
	await active
		.getByRole("button", { name: "Check Answer", exact: true })
		.click();
}

/** @param page - Browser. @param problem - UI fixture. @param stopAt - Optional task boundary. Completes tasks through real validation. */
export async function completeLaplaceTasks(
	page: Page,
	problem: LaplaceExercise,
	stopAt?: string,
): Promise<void> {
	for (const task of problem.stages.flatMap((stage) => stage.tasks)) {
		if (task.id === stopAt) return;
		await answerLaplaceTask(page, task);
	}
	await expect(page.locator(".completion-banner")).toBeVisible();
}
