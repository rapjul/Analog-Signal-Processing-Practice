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
		await active
			.locator("[data-choice]")
			.nth(task.choices!.indexOf(answer))
			.click();
	} else if ("construction" in task) {
		const target = task.construction;
		if (task.kind !== "template")
			await active
				.getByLabel("Expression type", { exact: true })
				.selectOption(target.mode);
		if (target.mode === "finite") {
			if (task.kind !== "roots")
				await active
					.getByLabel(
						task.kind === "template"
							? "Constant quotient"
							: "Outside gain",
						{ exact: true },
					)
					.fill(target.gain);
			for (const [index, row] of target.rows.entries()) {
				await active
					.getByRole("button", {
						name:
							task.kind === "roots"
								? "Add Root"
								: task.kind === "template"
									? "Add Term"
									: "Add Factor",
						exact: true,
					})
					.click();
				await active
					.getByLabel(`Row ${index + 1} type`, { exact: true })
					.selectOption(row.kind);
				await active
					.getByLabel(
						`Row ${index + 1} ${task.kind === "roots" ? "real part" : "coefficient b"}`,
						{ exact: true },
					)
					.fill(row.first);
				if (row.kind === "quadratic")
					await active
						.getByLabel(
							`Row ${index + 1} ${task.kind === "roots" ? "frequency" : "coefficient c"}`,
							{ exact: true },
						)
						.fill(row.second);
				await active
					.getByLabel(
						`Row ${index + 1} ${task.kind === "roots" ? "multiplicity" : "power"}`,
						{ exact: true },
					)
					.fill(row.power);
				if (task.kind === "template")
					await active
						.getByLabel(`Row ${index + 1} numerator`, {
							exact: true,
						})
						.selectOption(row.numerator);
			}
		}
	} else if (task.kind === "fields") {
		for (const field of task.fields)
			await active
				.locator(`[data-field-id="${field.id}"]`)
				.fill(field.target);
	} else await active.locator("#laplace-input").fill(answer);
	if (task.kind !== "choice")
		await active
			.getByRole("button", {
				name: task.action ?? `Check ${task.title}`,
				exact: true,
			})
			.click();
	if (
		await active
			.getByRole("button", { name: "Continue", exact: true })
			.isVisible()
	)
		await active
			.getByRole("button", { name: "Continue", exact: true })
			.click();
}

/** @param page - Browser. @param problem - UI fixture. @param stopAt - Optional task boundary. Completes tasks through real validation. */
export async function completeLaplaceTasks(
	page: Page,
	problem: LaplaceExercise,
	stopAt?: string,
): Promise<void> {
	const decisions: Record<string, string> = {};
	for (const task of problem.stages.flatMap((stage) => stage.tasks)) {
		if (
			task.when &&
			!task.when.values.includes(decisions[task.when.id] ?? "")
		)
			continue;
		if (task.id === stopAt) return;
		await answerLaplaceTask(page, task);
		if (task.kind === "choice") decisions[task.id] = task.answer;
	}
	await expect(page.locator(".completion-banner")).toBeVisible();
}
