import { expect, test } from "@playwright/test";
import {
	createLaplaceExercise,
	serializeLaplaceConfiguration,
} from "$lib/math-engine/laplace/configuration";
import {
	generateLaplaceExercise,
	laplaceSignal,
} from "$lib/math-engine/laplace/generator";
import type { LaplaceExerciseSpec } from "$lib/math-engine/laplace/types";
import { laplaceVisualFixtures } from "$lib/testing/laplace-visual-fixtures";
import { answerLaplaceTask, completeLaplaceTasks } from "./laplace-tutor";

test.describe("guided Laplace practice", () => {
	/** Rejected custom drafts retain stable accessible names at narrow widths without developer shortcuts. */
	test("keeps custom field names stable while format feedback is visible", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 900 });
		for (const workflow of ["inverse", "forward", "ode"] as const) {
			const spec = generateLaplaceExercise(workflow, 73, "repeated").spec;
			if (spec.workflow === "forward")
				spec.terms = [laplaceSignal(), laplaceSignal()];
			await page.goto(`/laplace?${serializeLaplaceConfiguration(spec)}`);
			await page
				.getByText("Laplace Practice Configuration", { exact: true })
				.click();
			await page
				.getByText("Structured custom problem", { exact: true })
				.click();
			const names =
				workflow === "inverse"
					? ["Numerator gain", "Delay"]
					: workflow === "ode"
						? [
								"Leading ODE coefficient",
								"Initial output at zero minus",
								"Initial derivative at zero minus (second order)",
							]
						: ["Polynomial power"];
			for (const name of names) {
				const inputs = page.getByRole("textbox", { name, exact: true });
				for (const input of await inputs.all()) {
					const value = await input.inputValue();
					await input.fill("(");
					await expect(input).toHaveValue(value);
					await expect(input).toHaveAccessibleName(name);
					const describedBy =
						await input.getAttribute("aria-describedby");
					expect(describedBy).toBeTruthy();
					await expect(
						page.locator(`[id="${describedBy}"]`),
					).toBeVisible();
					await input.fill("1");
					await expect(input).not.toHaveAttribute(
						"aria-describedby",
						/.+/,
					);
				}
			}
			const identities = await page
				.locator("input[id]")
				.evaluateAll((inputs) => inputs.map((input) => input.id));
			expect(new Set(identities).size).toBe(identities.length);
			expect(
				await page.evaluate(
					() =>
						document.documentElement.scrollWidth <=
						window.innerWidth,
				),
			).toBe(true);
		}
	});
	/** Integer insertions are rejected intact, and zero degree is an explicit checked alternative. */
	test("restricts degree notation through ordinary keyboard and paste-like insertion", async ({
		page,
	}) => {
		const problem = createLaplaceExercise(laplaceVisualFixtures()[0]!.spec);
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		await completeLaplaceTasks(page, problem, "degrees-values");
		const numerator = page.locator('[data-field-id="numerator"]');
		await numerator.fill("");
		await numerator.pressSequentially("1.5");
		await expect(numerator).toHaveValue("1");
		await numerator.press("ControlOrMeta+A");
		await numerator.pressSequentially("2");
		await expect(numerator).toHaveValue("2");
		await numerator.fill("2");
		for (const text of ["(", "1.5", "1/2", "1e2", "-1"]) {
			await numerator.selectText();
			await page.keyboard.insertText(text);
			await expect(numerator).toHaveValue("2");
			await expect(
				page
					.getByRole("status")
					.filter({ hasText: "Enter a nonnegative whole number" }),
			).toBeVisible();
		}
		const choice = page.locator('[data-degree-id="numerator"]');
		await choice.selectOption("zero");
		await expect(numerator).toHaveCount(0);
		await expect(page.locator(".step-card.active")).toContainText(
			"undefined",
		);
		await page.locator('[data-field-id="denominator"]').fill("2");
		await page
			.getByRole("button", {
				name: "Check Polynomial Degrees",
				exact: true,
			})
			.click();
		await expect(
			page.locator('[data-field-feedback="numerator"]'),
		).toHaveAttribute("data-validation", "incorrect");
		await choice.selectOption("nonzero");
		await numerator.fill("1");
		await numerator.press("Enter");
		await expect(
			page.getByRole("button", { name: "Continue", exact: true }),
		).toBeVisible();
		await expect(page.locator(".step-card.active")).toHaveJSProperty(
			"scrollWidth",
			await page
				.locator(".step-card.active")
				.evaluate((node) => node.clientWidth),
		);
	});
	/** Boolean activity is checked together with a nonblank ordinary sum, including a zero-active interval. */
	test("checks term activity selections and the interval expression together", async ({
		page,
	}) => {
		const fixture = laplaceVisualFixtures().find(
			(item) => item.spec.workflow === "forward",
		)!;
		const problem = createLaplaceExercise(fixture.spec);
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		await completeLaplaceTasks(
			page,
			problem,
			"forward-support-interval-0-values",
		);
		const active = page.locator(".step-card.active");
		await expect(active.getByRole("checkbox")).toHaveCount(3);
		await expect(active.getByRole("checkbox").first()).toHaveAccessibleName(
			/Term 1/,
		);
		await active
			.getByRole("button", {
				name: "Check Support Interval",
				exact: true,
			})
			.click();
		await expect(
			active.getByRole("button", { name: "Continue", exact: true }),
		).toHaveCount(0);
		await active.locator('[data-field-id="combined"]').fill("1");
		await active.getByRole("checkbox").first().check();
		await active
			.getByRole("button", {
				name: "Check Support Interval",
				exact: true,
			})
			.click();
		await expect(active.getByRole("checkbox").first()).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		await active.getByRole("checkbox").first().uncheck();
		await active.getByRole("checkbox").nth(1).check();
		await active.locator(".hint-toggle-btn").click();
		await expect(active.getByRole("checkbox").nth(1)).toBeChecked();
		await active.locator('[data-field-id="combined"]').press("Enter");
		await expect(
			active.getByRole("button", { name: "Continue", exact: true }),
		).toBeVisible();
		await expect(
			active.locator('[data-field-feedback="active-0"]'),
		).toContainText("Inactive");
	});
	/** Keyboard submissions must preserve diagnostics and assistance until checked work is explicitly continued. */
	test("checks every supplied-problem task with Enter and progressive hints", async ({
		page,
	}) => {
		test.setTimeout(120000);
		const problem = createLaplaceExercise(laplaceVisualFixtures()[0]!.spec);
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		const decisions: Record<string, string> = {};
		let first = true;
		for (const task of problem.stages.flatMap((stage) => stage.tasks)) {
			if (
				task.when &&
				!task.when.values.includes(decisions[task.when.id] ?? "")
			)
				continue;
			const active = page.locator(".step-card.active");
			await expect(active.locator("[data-task-id]")).toHaveAttribute(
				"data-task-id",
				task.id,
			);
			if (!first) {
				const heading = active
					.locator(
						"[data-single-heading], .subpart-block:not(.subpart-done) [data-progress-heading]",
					)
					.first();
				await expect(heading).toBeFocused();
				await heading.press("Enter");
				await expect(
					active.locator("#laplace-feedback"),
				).not.toHaveAttribute("data-validation", /.+/);
			}
			first = false;
			if (task.kind === "choice") {
				const wrong = task.choices!.findIndex(
					(choice) =>
						!(task.accepted ?? [task.answer]).includes(choice),
				);
				if (wrong >= 0) {
					const option = active.locator("[data-choice]").nth(wrong);
					await option.focus();
					await option.press("Enter");
					await expect(
						active.locator("#laplace-feedback"),
					).toHaveAttribute("data-validation", "incorrect");
					const gap = await active.evaluate((node) => {
						const choices = node
							.querySelector("fieldset")!
							.getBoundingClientRect();
						const feedback = node
							.querySelector(".feedback-alert")!
							.getBoundingClientRect();
						return feedback.top - choices.bottom;
					});
					expect(gap).toBeGreaterThanOrEqual(15);
				}
			} else {
				const check = active.getByRole("button", {
					name: task.action ?? `Check ${task.title}`,
					exact: true,
				});
				await check.focus();
				await check.press("Enter");
				await expect(
					active.locator("#laplace-feedback"),
				).toHaveAttribute("data-validation", /invalid|incorrect/);
			}
			for (let tier = 1; tier <= 3; tier++) {
				await active.locator(".hint-toggle-btn").click();
				await expect(active.locator(".hint-line")).toHaveCount(tier);
				await expect(
					active.getByRole("button", {
						name: "Continue",
						exact: true,
					}),
				).toHaveCount(0);
			}
			await answerLaplaceTask(page, task, task.answer, "enter");
			if (task.kind === "choice") decisions[task.id] = task.answer;
		}
		await expect(page.locator(".completion-banner")).toContainText(
			"Assistance",
		);
		await page
			.getByRole("button", { name: "Restart this problem", exact: true })
			.click();
		await expect(page.locator(".step-card.completed")).toHaveCount(0);
		await expect(page.locator(".hint-line")).toHaveCount(0);
	});
	/** Same-route links and history must replace the exercise rather than restore stale URL state. */
	test("loads shared destinations through client navigation and history", async ({
		page,
	}) => {
		const inverse = generateLaplaceExercise("inverse", 73);
		const forward = generateLaplaceExercise("forward", 74);
		const first = `/laplace?${serializeLaplaceConfiguration(inverse.spec)}`;
		const second = `/laplace?${serializeLaplaceConfiguration(forward.spec)}`;
		await page.goto(first);
		await answerLaplaceTask(page, inverse.stages[0]!.tasks[0]!);
		await expect(page.locator(".step-card.completed")).toHaveCount(1);
		await page.evaluate((href) => {
			const link = document.createElement("a");
			link.id = "shared-destination";
			link.href = href;
			link.textContent = "Open shared exercise";
			document.body.append(link);
		}, second);
		await page.locator("#shared-destination").click();
		await expect(page).toHaveURL(new RegExp("seed=74"));
		await expect(page.locator(".problem-goal")).toContainText("X");
		await expect(page.locator(".step-card.completed")).toHaveCount(0);
		await page.locator(".drill-summary").click();
		await expect(page.getByLabel("Workflow")).toHaveValue("forward");
		await page.locator(".drill-summary").click();
		await page.goBack();
		await expect(page).toHaveURL(new RegExp("seed=73"));
		await expect(page.locator("[data-task-id]")).toHaveAttribute(
			"data-task-id",
			"convention",
		);
		await page.goForward();
		await expect(page).toHaveURL(new RegExp("seed=74"));
		await page.reload();
		await expect(page.locator(".configuration-error")).toHaveCount(0);
		const before = await page.locator(".problem-prompt").innerText();
		await page.evaluate(() => {
			const link = document.createElement("a");
			link.id = "invalid-destination";
			link.href = "/laplace?v=2&config={}";
			link.textContent = "Open invalid exercise";
			document.body.append(link);
		});
		await page.locator("#invalid-destination").click();
		await expect(page.locator(".configuration-error")).toContainText(
			"unsupported version",
		);
		await expect
			.poll(() => page.locator(".problem-prompt").innerText())
			.toBe(before);
		await expect(page).toHaveURL(/v=2/);
		await page.goBack();
		await expect(page.locator(".configuration-error")).toHaveCount(0);
	});
	/** Coincident impulses depend on their exact location and weight, never unused signal-shape fields. */
	test("collects coincident impulses with different unused metadata", async ({
		page,
	}) => {
		const impulse = {
			kind: "impulse" as const,
			amplitude: "1",
			rate: "0",
			frequency: "0",
			power: 0,
			delay: "1",
			side: "right" as const,
		};
		const problem = createLaplaceExercise({
			workflow: "forward",
			seed: 73,
			terms: [
				impulse,
				{
					...impulse,
					amplitude: "-1",
					rate: "-2",
					frequency: "3",
					power: 2,
					side: "left",
				},
			],
		});
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		await completeLaplaceTasks(page, problem, undefined, {
			"forward-final": "0",
		});
		await expect(
			page.locator(
				'.laplace-visualizations svg[aria-label^="Verified time response"] path title',
			),
		).toHaveCount(0);
	});
	/** A finite pulse shorter than a uniform sample step must remain visible after completion. */
	test("renders an independently solved short pulse on its support interval", async ({
		page,
	}) => {
		test.setTimeout(90000);
		const term = {
			kind: "exponential" as const,
			amplitude: "1",
			rate: "0",
			frequency: "0",
			power: 0,
			delay: "1",
			side: "right" as const,
		};
		const problem = createLaplaceExercise({
			workflow: "forward",
			seed: 73,
			terms: [term, { ...term, amplitude: "-1", delay: "1.001" }],
		});
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		await completeLaplaceTasks(page, problem, undefined, {
			"forward-final": "X(s)=(e^{-s}-e^{-1.001s})/s",
		});
		const curve = page.locator(
			'.laplace-visualizations path[stroke-width="2"]',
		);
		await expect(curve).toHaveAttribute("d", /,25\.00/);
		await expect(curve).toHaveAttribute("stroke-linecap", "round");
		await expect(page.locator(".katex-error")).toHaveCount(0);
	});
	/** Invalid fixture selections must fail instead of clicking the last option. */
	test("rejects an absent helper choice without submitting another option", async ({
		page,
	}) => {
		const problem = generateLaplaceExercise("inverse", 73);
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		await expect(
			answerLaplaceTask(
				page,
				problem.stages[0]!.tasks[0]!,
				"Missing choice",
			),
		).rejects.toThrow("Missing option");
		await expect(
			page.getByRole("button", { name: "Continue", exact: true }),
		).toHaveCount(0);
	});
	for (const scenario of [
		"negative impulse",
		"combined forward zeros",
		"initial-value response",
	] as const) {
		/** Supplies final answers independently of the generated teaching targets. */
		test(`accepts an independently solved ${scenario}`, async ({
			page,
		}) => {
			test.setTimeout(120000);
			const term = {
				kind: "exponential" as const,
				amplitude: "1",
				rate: "-1",
				frequency: "0",
				power: 0,
				delay: "0",
				side: "right" as const,
			};
			const spec: LaplaceExerciseSpec =
				scenario === "negative impulse"
					? {
							workflow: "inverse",
							seed: 73,
							system: true,
							rational: {
								gain: "-1",
								zeros: [
									{
										real: "0",
										frequency: "0",
										multiplicity: 1,
									},
								],
								poles: [
									{
										real: "-1",
										frequency: "0",
										multiplicity: 1,
									},
								],
								delay: "0",
								region: -1,
							},
						}
					: scenario === "combined forward zeros"
						? {
								workflow: "forward",
								seed: 73,
								terms: [term, { ...term, rate: "-2" }],
							}
						: {
								workflow: "ode",
								seed: 73,
								leading: "1",
								roots: [
									{
										real: "-2",
										frequency: "0",
										multiplicity: 1,
									},
								],
								initial: ["0", "0"],
								terms: [{ ...term, kind: "impulse" }],
							};
			const problem = createLaplaceExercise(spec);
			const answers: Record<string, string> =
				scenario === "negative impulse"
					? { response: String.raw`h(t)=-\delta(t)+e^{-t}u(t)` }
					: scenario === "combined forward zeros"
						? { "forward-final": "X(s)=(2s+3)/((s+1)(s+2))" }
						: { "ode-response": String.raw`y(t)=e^{-2t}u(t)` };
			await page.setViewportSize({ width: 320, height: 900 });
			await page.goto(`/laplace?${serializeLaplaceConfiguration(spec)}`);
			await expect(page.locator(".problem-goal")).toContainText(
				scenario === "negative impulse"
					? "h(t)"
					: scenario === "combined forward zeros"
						? "X(s)"
						: "y(t)",
			);
			await completeLaplaceTasks(page, problem, undefined, answers);
			if (scenario === "combined forward zeros")
				await expect(
					page.locator(".laplace-visualizations"),
				).toContainText("-3/2");
			await expect(page.locator(".katex-error")).toHaveCount(0);
			expect(
				await page.evaluate(
					() =>
						document.documentElement.scrollWidth <=
						document.documentElement.clientWidth,
				),
			).toBe(true);
		});
	}
	/** Exercises the alternative coefficient-matching path through production controls. */
	test("checks every elimination row on the matching path at 320px", async ({
		page,
	}) => {
		test.setTimeout(90000);
		const problem = generateLaplaceExercise("inverse", 73, "repeated");
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(
			`/laplace?${serializeLaplaceConfiguration(problem.spec)}`,
		);
		await completeLaplaceTasks(page, problem, undefined, {
			method: "Partial Fractions: Coefficient Matching",
		});
		await expect(page.locator(".completion-banner")).toBeVisible();
		await expect(page.locator(".katex-error")).toHaveCount(0);
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);
	});
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
		// This traverses rational analysis, strategy, three hints, and template construction through ordinary controls.
		test.setTimeout(90000);
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
		const timeoutMs = scenario === "second-order fields" ? 180000 : 90000;
		test(`completes custom ${scenario} with checked response tasks`, async ({
			page,
		}) => {
			// The second-order case traverses both response blocks and every checked elimination row.
			test.setTimeout(timeoutMs);
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
			if (spec.workflow === "forward") {
				await completeLaplaceTasks(
					page,
					problem,
					"forward-support-interval-0-values",
				);
				await page
					.locator('[data-field-id="combined"]')
					.fill("u(t)+u(-t)-u(t-1)");
				await page
					.getByRole("button", {
						name: "Check Support Interval",
						exact: true,
					})
					.click();
				await expect(
					page.getByRole("button", { name: "Continue", exact: true }),
				).toHaveCount(0);
				await expect(
					page.locator('[data-field-id="combined"]'),
				).toHaveAttribute("aria-invalid", "true");
				const tasks = problem.stages.flatMap((stage) => stage.tasks);
				for (const task of tasks.slice(
					tasks.findIndex(
						(task) =>
							task.id === "forward-support-interval-0-values",
					),
				))
					await answerLaplaceTask(page, task);
				await expect(page.locator(".completion-banner")).toBeVisible();
			}
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
			} else if (spec.workflow !== "forward")
				await completeLaplaceTasks(page, problem);
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
		await expect(
			answerLaplaceTask(page, task, "Common factors exist"),
		).rejects.toThrow("Rejected answer for cancellation");
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
		await page.goto("/laplace?v=2&config=%7B%7D");
		await expect(page.getByRole("alert")).toContainText(
			"last valid or default problem",
		);
		await expect(page.locator(".step-card.active")).toBeVisible();
	});
});
