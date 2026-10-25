import { expect, test } from "@playwright/test";
import {
	createLaplaceExercise,
	serializeLaplaceConfiguration,
} from "$lib/math-engine/laplace/configuration";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import { answerLaplaceTask, completeLaplaceTasks } from "./laplace-tutor";

test.describe("guided Laplace practice", () => {
	test("fills reactive construction targets through the development harness @dev-harness", async ({
		page,
	}) => {
		await page.goto("/laplace");
		await page.waitForFunction(() => Boolean(window.__signalLabDev));
		await page.evaluate(() => window.__signalLabDev!.solveAll());
		await expect(page.locator(".completion-banner")).toBeVisible();
	});
	test("teaches the annotated example with shared hints and constructive PFD at 320px", async ({
		page,
	}) => {
		const problem = createLaplaceExercise({
			workflow: "inverse",
			seed: 73,
			system: false,
			rational: {
				gain: "2",
				zeros: [{ real: "-6", frequency: "0", multiplicity: 1 }],
				poles: [
					{ real: "-3", frequency: "0", multiplicity: 1 },
					{ real: "-5", frequency: "0", multiplicity: 1 },
				],
				delay: "0",
				region: -1,
			},
		});
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		await expect(page.locator('input[type="radio"]')).toHaveCount(0);
		await expect(
			page.locator(".step-card.active .subpart-block"),
		).toHaveCount(0);
		await completeLaplaceTasks(page, problem, "template");
		const active = page.locator(".step-card.active");
		await expect(active.locator("[data-construction-row]")).toHaveCount(0);
		for (let tier = 0; tier < 3; tier++)
			await active
				.getByRole("button", { name: /Get (Next )?Hint/ })
				.click();
		await expect(
			active.getByRole("region", { name: "Hints", exact: true }),
		).toBeVisible();
		await expect(
			active.getByRole("region", { name: "Hints", exact: true }),
		).not.toContainText("Identify the applicable rule");
		await expect(
			active.getByRole("button", { name: "Continue", exact: true }),
		).toHaveCount(0);
		await answerLaplaceTask(
			page,
			problem.stages
				.flatMap((stage) => stage.tasks)
				.find((task) => task.id === "template")!,
		);
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);
		await expect(page.locator(".katex-error")).toHaveCount(0);
	});
	for (const scenario of [
		"zero",
		"coincident impulses",
		"second-order fields",
		"cross-delay ROC",
	] as const) {
		test(`completes custom ${scenario} with checked response tasks`, async ({
			page,
		}) => {
			test.setTimeout(90000);
			const spec = generateLaplaceExercise(
				scenario === "zero"
					? "inverse"
					: scenario === "cross-delay ROC"
						? "forward"
						: "ode",
				73,
				scenario === "second-order fields" ? "repeated" : "impulse",
			).spec;
			if (spec.workflow === "forward") {
				const step = {
					kind: "exponential",
					amplitude: "1",
					rate: "0",
					frequency: "0",
					power: 0,
					delay: "0",
					side: "right",
				} as const;
				spec.terms = [
					step,
					{ ...step, side: "left" },
					{ ...step, amplitude: "-1", delay: "1" },
				];
				await page.setViewportSize({ width: 320, height: 900 });
			}
			if (spec.workflow === "inverse") spec.rational.gain = "0";
			else if (
				spec.workflow === "ode" &&
				scenario === "coincident impulses"
			) {
				spec.initial = ["0", "0"];
				spec.terms = [
					{ ...spec.terms[0]!, amplitude: "2", delay: "1/2" },
					{ ...spec.terms[0]!, amplitude: "3", delay: "0.5" },
				];
			}
			if (spec.workflow === "ode" && scenario === "second-order fields") {
				spec.initial = ["-1/2", "0"];
				await page.setViewportSize({ width: 320, height: 900 });
			}
			const problem = createLaplaceExercise(spec);
			await page.goto(`/laplace?${serializeLaplaceConfiguration(spec)}`);
			await expect(page.locator(".configuration-error")).toHaveCount(0);
			if (spec.workflow === "ode") {
				await completeLaplaceTasks(page, problem, "ode-response");
				const tasks = problem.stages.flatMap((stage) => stage.tasks);
				for (const task of tasks.slice(
					tasks.findIndex((task) => task.id === "ode-response"),
				)) {
					await answerLaplaceTask(
						page,
						task,
						task.kind === "t"
							? `${task.lhs} = ${task.answer}`
							: task.answer,
					);
				}
				await expect(page.locator(".completion-banner")).toBeVisible();
			} else await completeLaplaceTasks(page, problem);
			await expect(page.locator(".laplace-visualizations")).toBeVisible();
			expect(
				await page.evaluate(
					() =>
						document.documentElement.scrollWidth <=
						document.documentElement.clientWidth,
				),
			).toBe(true);
		});
	}
	test("supports keyboard checking, progress focus, and restart", async ({
		page,
	}, info) => {
		const problem = generateLaplaceExercise("inverse", 73);
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		const tasks = problem.stages.flatMap((stage) => stage.tasks);
		const first = tasks[0]!;
		const choice = page
			.locator(".step-card.active [data-choice]")
			.nth(first.choices!.indexOf(first.answer));
		await choice.focus();
		await choice.press("Space");
		await expect(page.locator("[data-success-heading]")).toBeFocused();
		await expect(
			page.locator(".step-card.active [data-task-id]"),
		).toHaveAttribute("data-task-id", first.id);
		await page
			.getByRole("button", { name: "Continue", exact: true })
			.press("Enter");
		await expect(
			page.locator(".step-card.active [data-task-id]"),
		).toHaveAttribute("data-task-id", tasks[1]!.id);
		await expect(
			page.locator(".step-card.active [data-progress-heading]").last(),
		).toBeFocused();
		await expect(page.locator("[data-construction-row]")).toHaveCount(0);
		await answerLaplaceTask(page, tasks[1]!);
		await expect(
			page.locator(".step-card.active [data-task-id]"),
		).toHaveAttribute("data-task-id", tasks[2]!.id);
		// The development server intentionally registers the harness; production must exclude it.
		if (
			info.config.configFile?.endsWith("playwright.production.config.ts")
		) {
			expect(
				await page.evaluate(() => window.__signalLabDev),
			).toBeUndefined();
		}
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
		await expect(
			page.locator('[data-validation="incorrect"]').first(),
		).toHaveAttribute("data-validation", "incorrect");
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
