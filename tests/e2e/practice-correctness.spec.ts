import { expect, type Page, test } from "@playwright/test";
import { serializeLaplaceConfiguration } from "$lib/math-engine/laplace/configuration";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import { transformAdversaries } from "$lib/testing/transform-adversaries";
import { prepareCtftFinal } from "./ctft-browser";
import { answerLaplaceTask, completeLaplaceTasks } from "./laplace-tutor";

/** Reproduces generated page parameters without exposing grading shortcuts. */
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		let seed = 173;
		/** Produces a deterministic pseudorandom value for ordinary generation. */
		Math.random = () => {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			return seed / 4294967296;
		};
	});
});

/** Opens the explicit worked solution using only normal keyboard interaction.
 * @param page - Browser page under test.
 */
async function reveal(page: Page) {
	const summary = page.locator(".worked-solution summary");
	await summary.focus();
	await summary.press("Enter");
	await expect(page.locator(".worked-solution")).toHaveAttribute("open", "");
}

/** A known delta input has a scalar spectrum, with no fixture-only production interface. */
test("CTFT rejects arbitrary answers and accepts equivalent delta spectra", async ({
	page,
}, info) => {
	const invalidSpectra = [
		"garbage",
		"0",
		"(1,99)",
		String.raw`\frac{1}{`,
		String.raw`1+|\omega-100|+\omega-100`,
		String.raw`1+\sqrt{(\omega-100)^2}+\omega-100`,
		String.raw`1+\sqrt[4]{(\omega-100)^4}+\omega-100`,
		String.raw`1+((\omega-100)^2)^{1/2}+\omega-100`,
		...transformAdversaries("omega").map(
			/** @param attack - Shared adversarial spelling. @returns Submitted delta-spectrum candidate. */
			(attack) => `1+(${attack.expression})`,
		),
	];
	// Budget the full parsing/grading/rendering batch without extending individual checks.
	test.setTimeout(30_000 + invalidSpectra.length * 1_000);
	await page.goto("/fourier-transform");
	await page.locator(".drill-summary").click();
	await page.locator("#signal-type-select").selectOption("delta");
	await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	await prepareCtftFinal(page, "delta", { a: 1, T: 2, w0: 3, t0: 0 });
	if (info.config.configFile?.endsWith("playwright.production.config.ts")) {
		await page.evaluate(
			/** Waits for this fresh production context to finish installing its offline worker. */ async () => {
				await navigator.serviceWorker.ready;
			},
		);
		await page
			.getByRole("button", { name: "Dismiss notification" })
			.click();
	}
	const input = page.locator("#ctft-input");
	for (const answer of invalidSpectra) {
		await input.fill(answer, { timeout: 5000 });
		await page
			.getByRole("button", { name: "Check final spectrum →" })
			.click({ timeout: 5000 });
		await expect(page.locator(".feedback-box")).not.toHaveAttribute(
			"data-validation",
			"correct",
		);
		await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	}
	await input.fill("3.14", { timeout: 5000 });
	await page
		.getByRole("button", { name: "Check final spectrum →" })
		.click({ timeout: 5000 });
	await expect(page.locator(".feedback-box")).toContainText(
		"If you intended the constant pi, type 'pi' (lowercase)",
	);
	await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	await input.fill(String.raw`X\,\left[jw\right]=2/2`, { timeout: 5000 });
	await input.press("Enter", { timeout: 5000 });
	await expect(
		page.getByRole("heading", { name: "CTFT solution verified" }),
	).toBeVisible();
	await page
		.getByText("View Complete Worked Solution", { exact: true })
		.click();
	await expect(page.locator(".assistance-status")).toHaveCount(0);
	await page.getByRole("button", { name: /Generate Next Problem/ }).click();
	await expect(page.locator(".solution-breakdown")).toHaveCount(0);
});

/** Final-response grading runs through the guided production workflow. */
test("Laplace poles, causal grading, and explicit assistance follow the active problem", async ({
	page,
}) => {
	test.setTimeout(90000);
	const problem = generateLaplaceExercise("inverse", 73, "distinct");
	await page.goto(`/laplace?${serializeLaplaceConfiguration(problem.spec)}`);
	await expect(page.locator(".stability-pill")).toHaveCount(0);
	await completeLaplaceTasks(page, problem, "response");
	const responseTask = problem.stages
		.flatMap((stage) => stage.tasks)
		.find((task) => task.id === "response")!;
	const checkResponse = page.getByRole("button", {
		name: responseTask.action!,
		exact: true,
	});
	const responseFeedback = page
		.locator(".step-card.active [data-validation]")
		.first();
	await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	await page.locator("#laplace-input").fill("123");
	await checkResponse.click();
	await expect(responseFeedback).toHaveAttribute(
		"data-validation",
		"incorrect",
	);
	await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	for (const attack of transformAdversaries("t")) {
		await page
			.locator("#laplace-input")
			.fill(`(${problem.response})+(${attack.expression})`);
		await checkResponse.click();
		await expect(responseFeedback).not.toHaveAttribute(
			"data-validation",
			"correct",
		);
		await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	}
	await page
		.locator("#laplace-input")
		.fill(`(${problem.response})u((3.14159265358979323843-\\pi)t)`);
	await checkResponse.click();
	await expect(responseFeedback).toHaveAttribute(
		"data-validation",
		"unsupported",
	);
	await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	await answerLaplaceTask(
		page,
		responseTask,
		`x\\left(t\\right)=${problem.response}`,
	);
	await expect(page.locator('[data-task-id="roc"]')).toBeVisible();
	await page.getByRole("button", { name: "Next Problem" }).click();
	await reveal(page);
	await expect(page.locator(".assistance-status")).toContainText(
		"Assisted practice",
	);
	await expect(page.locator(".feedback-box.correct")).toHaveCount(0);
	await expect(page.locator(".solution-breakdown")).toBeVisible();
});

/** Sliders and prompt form a deterministic fixture through ordinary user controls. */
test("Circuits rebuilds one component model and resets revealed answers", async ({
	page,
}) => {
	await page.goto("/circuits");
	await page.locator("#r-slider").fill("50");
	await page.locator("#l-slider").fill("5");
	await page.locator("#c-slider").fill("0.05");
	const prompt = page.locator(".problem-prompt annotation");
	await expect(prompt).toContainText("R = 50");
	await expect(prompt).toContainText("L = 5");
	await expect(prompt).toContainText("C = 0.05");
	await expect(page.locator(".tf-output")).toHaveCount(0);
	await reveal(page);
	await expect(page.locator(".tf-output annotation")).toContainText(
		String.raw`\frac{10 s}{s^2 + 10 s + 4}`,
	);
	await expect(page.locator(".assistance-status")).toBeVisible();
	await page.locator("#r-slider").fill("200");
	await expect(page.locator(".tf-output")).toHaveCount(0);
	await expect(page.locator(".worked-solution")).not.toHaveAttribute(
		"open",
		"",
	);
	await page.locator(".drill-summary").click();
	await page.locator("#topology-select").selectOption("rc-lpf");
	await expect(page.locator("#l-slider")).toHaveCount(0);
	await expect(prompt).not.toContainText("L =");
	await page.locator("#r-slider").fill("1");
	await page.locator("#c-slider").fill("0.003");
	await reveal(page);
	await expect(page.locator(".tf-output annotation")).toContainText(
		String.raw`\frac{1000}{3}`,
	);
	await expect(page.locator(".solution-breakdown")).not.toContainText("Z_L");
	await expect(page.locator(".katex-error")).toHaveCount(0);
});

for (const route of ["laplace", "circuits"]) {
	/** Explicit reveal remains keyboard accessible without narrow-screen document overflow. */
	test(`${route} solution reflows at 320px`, async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto(`/${route}`);
		await reveal(page);
		await expect(page.locator(".assistance-status")).toBeVisible();
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);
		await expect(page.locator(".katex-error")).toHaveCount(0);
	});
}

/** Initial ODE metadata must not reveal the root classification. */
test("ODE header keeps root classification hidden", async ({ page }) => {
	await page.goto("/odes?seed=10&order=2&rootType=distinct_real");
	await expect(page.locator(".problem-header")).not.toContainText(
		/distinct real|repeated real|complex conjugate|single real/,
	);
});

/** The existing development harness prepares the verified Step 2 summary only. */
test("ODE classification appears in its verified summary @dev-harness", async ({
	page,
}) => {
	await page.goto("/odes?seed=10&order=2&rootType=distinct_real");
	await expect
		.poll(() =>
			page.evaluate(() => Boolean(window.__signalLabDev?.activeSolver)),
		)
		.toBe(true);
	await page.evaluate(() => {
		window.__signalLabDev?.autoFillStep(1);
		window.__signalLabDev?.autoFillStep(2);
	});
	await expect(
		page.locator(".step-summary").filter({ hasText: "Classification:" }),
	).toContainText("distinct real");
});
