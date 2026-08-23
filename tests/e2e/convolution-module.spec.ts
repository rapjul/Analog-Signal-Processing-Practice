import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage for the guided Continuous-Time Convolution module.
 *
 * Verifies the ODE/Fourier-style stepped tutor, progressive remediation,
 * problem resets, and deferred post-completion graphical verifier.
 */
test.describe("Continuous-Time Convolution Module", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/convolution");
		await page.waitForLoadState("networkidle");
	});

	test("renders a five-step tutor with an anti-spoiler problem statement", async ({
		page,
	}) => {
		await expect(page).toHaveTitle(
			/Continuous-Time Convolution — SignalLab/i,
		);
		await expect(page.locator("h1.page-title")).toHaveText(
			/Continuous-Time Convolution/i,
		);
		await expect(page.locator(".drill-summary")).toBeVisible();
		await expect(page.locator(".convolution-practice-card")).toBeVisible();
		await expect(
			page.getByText("Define the Convolution Integral"),
		).toBeVisible();
		await expect(page.locator(".progress-pill")).toHaveCount(5);
		await expect(page.locator("canvas")).toHaveCount(0);
		await expect(page.getByText("Problem Completed!")).toHaveCount(0);
	});

	test("shows progressive hints and targeted misconception feedback", async ({
		page,
	}) => {
		await page.locator("#hint-toggle-btn").click();
		await expect(page.locator(".hint-line")).toHaveCount(1);

		const definitionOptions = page.getByTestId("convolution-step1-options");
		await definitionOptions.locator("button").nth(1).click();
		await expect(page.locator(".feedback-misconception")).toBeVisible();
		await expect(page.locator(".feedback-misconception")).toContainText(
			/pointwise product/i,
		);
	});

	test("switches signal categories and resets tutor progression", async ({
		page,
	}) => {
		await page.locator(".drill-summary").click();
		const pairSelect = page.locator("#pair-type-select");
		await pairSelect.selectOption("rect_exp");
		await expect(
			page.getByText("Pulse-Exponential Convolution"),
		).toBeVisible();

		await page.evaluate(() => window.__signalLabDev?.autoFillStep(1));
		await expect(
			page.getByText("Flip and Shift the Impulse Response"),
		).toBeVisible();

		await pairSelect.selectOption("exp_exp");
		await expect(
			page.getByText("Exponential-Exponential Convolution"),
		).toBeVisible();
		await expect(
			page.getByText("Define the Convolution Integral"),
		).toBeVisible();
		await expect(page.locator(".progress-pill.active")).toHaveText("1");
	});

	test("reveals worked derivation and animator only after solver completion", async ({
		page,
	}) => {
		await page.evaluate(() => window.__signalLabDev?.solveAll());

		await expect(page.getByText("Problem Completed!")).toBeVisible();
		await expect(page.locator(".step-reveal-container")).toBeVisible();
		const canvas = page.locator("canvas");
		await expect(canvas).toBeVisible();

		const timeSlider = page.locator('input[type="range"]');
		await expect(timeSlider).toBeVisible();
		await timeSlider.fill("2.5");
		await expect(canvas).toBeVisible();
	});

	test("exposes every dynamic interval through the visual-state harness", async ({
		page,
	}) => {
		const states = await page.evaluate(
			() => window.__signalLabDev?.getVisualStates() ?? [],
		);
		const intervalStates = states.filter(
			(state) =>
				state.step === 4 &&
				state.kind === "interactive" &&
				Boolean(state.subStep),
		);
		expect(intervalStates.length).toBeGreaterThanOrEqual(4);

		const finalState = intervalStates.at(-1);
		if (!finalState)
			throw new Error("Expected a convolution interval state.");
		const navigated = await page.evaluate(
			(id) => window.__signalLabDev?.goToVisualState(id) ?? false,
			finalState.id,
		);
		expect(navigated).toBe(true);
		await expect(page.locator(".part-progress-pill")).toContainText(
			`Part ${intervalStates.length} of ${intervalStates.length}`,
		);
	});

	test("remains horizontally fluid through completion at 320 pixels", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 900 });
		await page.evaluate(() => window.__signalLabDev?.solveAll());
		await expect(page.getByText("Problem Completed!")).toBeVisible();

		const dimensions = await page.evaluate(() => ({
			clientWidth: document.documentElement.clientWidth,
			scrollWidth: document.documentElement.scrollWidth,
		}));
		expect(dimensions.scrollWidth).toBeLessThanOrEqual(
			dimensions.clientWidth,
		);
	});
});
