import { expect, type Locator, type Page } from "@playwright/test";
import type {
	LaplaceConstructionTask,
	LaplaceEntryRow,
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
		await fillConstruction(active, task);
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

/** @param active - Active production step. @param task - Exact construction fixture. Fills ordinary visible controls without state shortcuts. */
async function fillConstruction(
	active: Locator,
	task: LaplaceConstructionTask,
): Promise<void> {
	const target = task.construction;
	if (task.kind !== "template")
		await active
			.getByLabel("Expression type", { exact: true })
			.selectOption(target.mode);
	if (target.mode !== "finite") return;
	if (task.kind !== "roots")
		await active
			.getByLabel(
				task.kind === "template" ? "Constant quotient" : "Outside gain",
				{ exact: true },
			)
			.fill(target.gain);
	const addLabels = {
		roots: "Add Root",
		factors: "Add Factor",
		template: "Add Term",
	};
	for (const [index, row] of target.rows.entries()) {
		await active
			.getByRole("button", { name: addLabels[task.kind], exact: true })
			.click();
		await fillConstructionRow(active, task.kind, row, index + 1);
	}
}

/** @param active - Active production step. @param kind - Construction domain. @param row - Independently generated values. @param number - Accessible one-based row number. Fills one factor, root, or template row. */
async function fillConstructionRow(
	active: Locator,
	kind: LaplaceConstructionTask["kind"],
	row: LaplaceEntryRow,
	number: number,
): Promise<void> {
	const root = kind === "roots";
	await active
		.getByLabel(`Row ${number} type`, { exact: true })
		.selectOption(row.kind);
	await active
		.getByLabel(`Row ${number} ${root ? "real part" : "coefficient b"}`, {
			exact: true,
		})
		.fill(row.first);
	if (row.kind === "quadratic")
		await active
			.getByLabel(
				`Row ${number} ${root ? "frequency" : "coefficient c"}`,
				{ exact: true },
			)
			.fill(row.second);
	await active
		.getByLabel(`Row ${number} ${root ? "multiplicity" : "power"}`, {
			exact: true,
		})
		.fill(row.power);
	if (kind === "template")
		await active
			.getByLabel(`Row ${number} numerator`, { exact: true })
			.selectOption(row.numerator);
}

/** @param page - Browser. @param problem - UI fixture. @param stopAt - Optional task boundary. @param selections - Accepted alternative strategy choices. Completes tasks through real validation. */
export async function completeLaplaceTasks(
	page: Page,
	problem: LaplaceExercise,
	stopAt?: string,
	selections: Record<string, string> = {},
): Promise<void> {
	const decisions: Record<string, string> = {};
	for (const task of problem.stages.flatMap((stage) => stage.tasks)) {
		if (
			task.when &&
			!task.when.values.includes(decisions[task.when.id] ?? "")
		)
			continue;
		if (task.id === stopAt) return;
		const answer = selections[task.id] ?? task.answer;
		await answerLaplaceTask(page, task, answer);
		if (task.kind === "choice") decisions[task.id] = answer;
	}
	await expect(page.locator(".completion-banner")).toBeVisible();
}
