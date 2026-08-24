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

	test("renders a seven-step tutor with an anti-spoiler problem statement", async ({
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
			page.getByText("Find Signal Start Times, End Times, and Widths"),
		).toBeVisible();
		await expect(page.locator(".progress-pill")).toHaveCount(7);
		const earlyPreview = page.locator("details.early-visual-disclosure");
		await expect(earlyPreview).not.toHaveAttribute("open");
		await expect(
			earlyPreview.getByLabel("Optional Convolution Geometry Preview"),
		).toHaveCount(1);
		await expect(page.getByText("Problem Completed!")).toHaveCount(0);
	});

	test("defaults a bare route to the ECE 210 textbook rectangle problem", async ({
		page,
	}) => {
		await page.goto("/convolution");
		await expect(page.locator("#x-type")).toHaveValue("rect");
		await expect(page.locator("#h-type")).toHaveValue("rect");
		await expect(page.locator("#x-shift-state")).toHaveValue("unshifted");
		await expect(page.locator("#h-shift-state")).toHaveValue("unshifted");
		await expect(page.locator('input[name="seed"]')).not.toHaveValue("");
		await expect(page).toHaveURL(/\/convolution$/);
	});

	test("shows progressive hints and targeted misconception feedback", async ({
		page,
	}) => {
		await page.locator("#hint-toggle-btn").click();
		await expect(page.locator(".hint-line")).toHaveCount(1);

		await page.evaluate(() => window.__signalLabDev?.autoFillStep(1));
		const definitionOptions = page.getByTestId("convolution-step2-options");
		await definitionOptions
			.locator('[data-option-id="pointwise-product"]')
			.click();
		await expect(page.locator(".feedback-misconception")).toBeVisible();
		await expect(page.locator(".feedback-misconception")).toContainText(
			/pointwise product/i,
		);
	});

	test("submits typed timing with Enter and checks choices immediately", async ({
		page,
	}) => {
		const timingInputs = page.locator(".timing-grid input");
		await timingInputs.nth(0).fill("-0.5");
		await timingInputs.nth(1).fill("0.5");
		await timingInputs.nth(2).fill("1");
		await timingInputs.nth(2).press("Enter");
		await expect(page.getByText("Read the Timing of h(t)")).toBeVisible();

		await page.evaluate(() => window.__signalLabDev?.autoFillStep(1));
		const definitionOptions = page.getByTestId("convolution-step2-options");
		await definitionOptions
			.locator('[data-option-id="pointwise-product"]')
			.click();
		await expect(page.locator(".feedback-misconception")).toBeVisible();
	});

	test("shows unclipped keyboard focus on changed controls", async ({
		page,
	}) => {
		const input = page.locator(".timing-grid input").first();
		const button = page.getByRole("button", {
			name: "Check timing and width",
		});
		for (const control of [input, button]) {
			await control.focus();
			const outline = await control.evaluate((element) => {
				const style = getComputedStyle(element);
				return {
					style: style.outlineStyle,
					width: Number.parseFloat(style.outlineWidth),
					offset: Number.parseFloat(style.outlineOffset),
				};
			});
			expect(outline.style).toBe("solid");
			expect(outline.width).toBeGreaterThanOrEqual(2);
			expect(outline.offset).toBeGreaterThanOrEqual(2);
		}
	});

	test("configures each signal independently and resets tutor progression", async ({
		page,
	}) => {
		await page.locator(".drill-summary").click();
		await page.locator("#h-type").selectOption("exponential");
		await expect(
			page.getByText(
				"Rectangular Pulse and Causal Exponential Convolution",
			),
		).toBeVisible();

		await page.evaluate(() => window.__signalLabDev?.autoFillStep(1));
		await expect(
			page.getByText("Define the Convolution Integral"),
		).toBeVisible();

		await page.locator("#x-type").selectOption("exponential");
		await expect(
			page.getByText(
				"Causal Exponential and Causal Exponential Convolution",
			),
		).toBeVisible();
		await expect(
			page.getByText("Find Signal Start Times, End Times, and Widths"),
		).toBeVisible();
		await expect(page.locator(".progress-pill.active")).toHaveText("1");
	});

	test("freezes the current independent configuration only when sharing", async ({
		page,
	}) => {
		await page.locator(".drill-summary").click();
		await page.locator("#x-type").selectOption("triangle");
		await page.locator("#x-amplitude").selectOption("-2");
		await page.locator("#h-shift-state").selectOption("shifted");
		await page.locator("#h-shift-value").selectOption("3");
		await expect(page).toHaveURL(/\/convolution$/);

		await page.getByRole("button", { name: "Share This Problem" }).click();
		const frozenUrl = await page
			.locator("#convolution-share-url")
			.inputValue();
		expect(frozenUrl).toContain("share=1&v=2");
		expect(frozenUrl).toContain("xType=triangle");
		expect(frozenUrl).toContain("xAmplitude=-2");
		expect(frozenUrl).toContain("hShift=shifted");
		expect(frozenUrl).toContain("hShiftValue=3");
		await expect(page).toHaveURL(/\/convolution$/);

		await page.goto(frozenUrl);
		await expect(page.locator("#x-type")).toHaveValue("triangle");
		await expect(page.locator("#x-amplitude")).toHaveValue("-2");
		await expect(page.locator("#h-shift-state")).toHaveValue("shifted");
		await expect(page.locator("#h-shift-value")).toHaveValue("3");
	});

	test("reveals worked derivation and animator only after solver completion", async ({
		page,
	}) => {
		await page.evaluate(() => window.__signalLabDev?.solveAll());

		await expect(page.getByText("Problem Completed!")).toBeVisible();
		await expect(page.locator(".step-reveal-container")).toBeVisible();
		const canvas = page.getByLabel(
			"Verified Flip-and-Shift Overlap Visualizer",
		);
		await expect(canvas).toBeVisible();

		const timeSlider = page
			.locator(".visualizer-wrapper")
			.locator('input[type="range"]');
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
				state.step === 6 &&
				state.kind === "interactive" &&
				Boolean(state.subStep),
		);
		expect(intervalStates.length).toBeGreaterThanOrEqual(2);

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

	test("uses responsive summary grids and one interval per Step 5 row", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		for (const step of [1, 2, 3, 4, 5])
			await page.evaluate(
				(activeStep) => window.__signalLabDev?.autoFillStep(activeStep),
				step,
			);
		const completedCards = page.locator(".step-card.completed");
		const step3Grid = completedCards.nth(2).locator(".summary-grid");
		const step4Grid = completedCards.nth(3).locator(".summary-grid");
		for (const grid of [step3Grid, step4Grid]) {
			const columns = await grid.evaluate(
				(element) => getComputedStyle(element).gridTemplateColumns,
			);
			expect(columns.trim().split(/\s+/)).toHaveLength(2);
		}
		const step5Rows = completedCards.nth(4).locator(".summary-row");
		expect(await step5Rows.count()).toBeGreaterThanOrEqual(3);
		for (const row of await step5Rows.all())
			expect(
				await row.evaluate(
					(element) => getComputedStyle(element).display,
				),
			).toBe("grid");

		await page.setViewportSize({ width: 320, height: 900 });
		for (const grid of [step3Grid, step4Grid]) {
			const columns = await grid.evaluate(
				(element) => getComputedStyle(element).gridTemplateColumns,
			);
			expect(columns.trim().split(/\s+/)).toHaveLength(1);
		}
	});

	test("renders normalized convolution math without leaked macro text", async ({
		page,
	}) => {
		await page.evaluate(() => window.__signalLabDev?.solveAll());
		const text = await page.locator("body").innerText();
		expect(text).not.toMatch(/auin|mathcal|maxleft|minleft/);
		expect(text).not.toMatch(/--|\+-/);
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
