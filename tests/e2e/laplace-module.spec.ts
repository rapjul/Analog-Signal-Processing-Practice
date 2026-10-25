import { expect, test } from "@playwright/test";
import {
	createLaplaceExercise,
	serializeLaplaceConfiguration,
} from "$lib/math-engine/laplace/configuration";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import { answerLaplaceTask, completeLaplaceTasks } from "./laplace-tutor";

test.describe("guided Laplace practice", () => {
	for (const scenario of ["zero", "coincident impulses"] as const) {
		test(`completes custom ${scenario} with checked response tasks`, async ({
			page,
		}) => {
			test.setTimeout(90000);
			const spec = generateLaplaceExercise(
				scenario === "zero" ? "inverse" : "ode",
				73,
				"impulse",
			).spec;
			if (spec.workflow === "inverse") spec.rational.gain = "0";
			else if (spec.workflow === "ode") {
				spec.initial = ["0", "0"];
				spec.terms = [
					{ ...spec.terms[0]!, amplitude: "2", delay: "1/2" },
					{ ...spec.terms[0]!, amplitude: "3", delay: "0.5" },
				];
			}
			const problem = createLaplaceExercise(spec);
			await page.goto(`/laplace?${serializeLaplaceConfiguration(spec)}`);
			await expect(page.locator(".configuration-error")).toHaveCount(0);
			await completeLaplaceTasks(page, problem);
			await expect(page.locator(".laplace-visualizations")).toBeVisible();
		});
	}
	test("supports keyboard checking and announces the next task without a production harness", async ({
		page,
	}) => {
		const problem = generateLaplaceExercise("inverse", 73);
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		const tasks = problem.stages.flatMap((stage) => stage.tasks);
		const first = tasks[0]!;
		const radio = page
			.locator('.step-card.active input[type="radio"]')
			.nth(first.choices!.indexOf(first.answer));
		await radio.focus();
		await radio.press("Space");
		await page
			.getByRole("button", { name: "Check Answer", exact: true })
			.press("Enter");
		await expect(
			page.locator(".step-card.active [data-task-id]"),
		).toHaveAttribute("data-task-id", tasks[1]!.id);
		await expect(
			page.locator(".step-card.active [data-progress-heading]").last(),
		).toBeFocused();
		await page.locator("#laplace-input").fill(tasks[1]!.answer);
		await page.locator("#laplace-input").press("Enter");
		await expect(
			page.locator(".step-card.active [data-task-id]"),
		).toHaveAttribute("data-task-id", tasks[2]!.id);
		expect(
			await page.evaluate(() => window.__signalLabDev),
		).toBeUndefined();
		await page
			.getByRole("button", { name: "Restart this problem" })
			.press("Enter");
		await expect(page.locator(".step-card.completed")).toHaveCount(0);
		await expect(
			page.locator(".step-card.active [data-task-id]"),
		).toHaveAttribute("data-task-id", first.id);
	});
	for (const workflow of ["inverse", "forward", "roc", "ode"] as const) {
		test(`completes ${workflow} through production controls`, async ({
			page,
		}) => {
			test.setTimeout(90000);
			const problem = generateLaplaceExercise(
				workflow,
				73,
				workflow === "ode" ? "impulse" : "cancellation",
			);
			await page.goto(
				`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
			);
			await expect(page.locator(".step-card.active")).toBeVisible();
			await expect(page.locator(".solution-breakdown")).toHaveCount(0);
			await expect(page.locator(".laplace-visualizations")).toHaveCount(
				0,
			);
			await completeLaplaceTasks(page, problem);
			await expect(
				page.locator(".laplace-visualizations svg"),
			).toHaveCount(2);
			await expect(page.locator(".katex-error")).toHaveCount(0);
			await expect(page.locator(".configuration-error")).toHaveCount(0);
			await page.reload();
			await expect(page.locator(".step-card.completed")).toHaveCount(0);
		});
	}
	test("checks no-cancellation and keeps assistance separate", async ({
		page,
	}) => {
		const problem = generateLaplaceExercise("inverse", 73, "distinct");
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		await completeLaplaceTasks(page, problem, "cancellation");
		const task = problem.stages
			.flatMap((stage) => stage.tasks)
			.find((part) => part.id === "cancellation")!;
		await answerLaplaceTask(page, task, "Common factors exist");
		await expect(page.locator(".feedback-box")).toHaveAttribute(
			"data-validation",
			"incorrect",
		);
		await page.locator(".worked-solution summary").focus();
		await page.locator(".worked-solution summary").press("Enter");
		await expect(page.locator(".assistance-status")).toBeVisible();
		await expect(page.locator(".completion-banner")).toHaveCount(0);
		await page
			.getByRole("button", { name: /Generate Next Problem/ })
			.click();
		await expect(page.locator(".solution-breakdown")).toHaveCount(0);
		await expect(page.locator(".step-card.completed")).toHaveCount(0);
	});
	test("reports unsupported custom input and retains the last valid exercise", async ({
		page,
	}) => {
		await page.goto("/laplace");
		const prompt = await page
			.locator(".problem-prompt annotation")
			.first()
			.textContent();
		await page
			.getByText("Laplace Practice Configuration", { exact: true })
			.click();
		await page
			.getByText("Structured custom problem", { exact: true })
			.click();
		await page.getByLabel("Numerator gain", { exact: true }).fill("1/0");
		await page
			.getByRole("button", { name: "Apply custom problem" })
			.click();
		await expect(page.getByRole("alert")).toBeVisible();
		await expect(
			page.locator(".problem-prompt annotation").first(),
		).toHaveText(prompt!);
	});
});
