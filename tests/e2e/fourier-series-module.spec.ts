import { expect, test } from "@playwright/test";
import { generateFourierSeriesProblem } from "$lib/math-engine/fourier-series/index";

/**
 * End-to-End Test Suite: Fourier Series Practice Module (/fourier-series).
 *
 * Verifies periodic waveform preset selector, anti-spoiler practice headers,
 * 7-step interactive ITS tutor workflow, progressive hints, misconception diagnostics,
 * and deferred post-solve waveform & spectrum visualizer canvas.
 */

test.describe("Fourier Series Module", () => {
	/** Confirms zero DC is carried by symmetry before the remaining evaluation. */
	test("carries zero DC and finishes corrected synthesis @dev-harness", async ({
		page,
	}) => {
		const problem = generateFourierSeriesProblem("triangle", { seed: 1 });
		await page.goto("/fourier-series?waveform=triangle&seed=1");
		await page.waitForLoadState("networkidle");
		const prepared = await page.evaluate(() =>
			window.__signalLabDev?.goToVisualState(
				"fourier-series.step-06.coefficient-evaluation",
			),
		);
		expect(prepared).toBe(true);
		const options = page
			.getByTestId("fourier-step6-options")
			.getByRole("button");
		const dc = problem.itsData.step6.parts[0]!;
		const wrongIndex = dc.options.findIndex((option) => !option.isCorrect);
		await options.nth(wrongIndex).click();
		await expect(page.locator(".feedback-alert")).toContainText("Error");
		for (const part of problem.itsData.step6.parts) {
			await options
				.nth(part.options.findIndex((option) => option.isCorrect))
				.click();
		}
		const step7 = page.locator(".step-card").nth(6);
		await expect(step7).toHaveClass(/active/);
		await step7
			.locator(".mcq-card")
			.nth(
				problem.itsData.step7.options.findIndex(
					(option) => option.isCorrect,
				),
			)
			.click();
		await expect(
			page.getByText("Problem Completed!", { exact: true }),
		).toBeVisible();
		await expect(page.locator(".katex-error")).toHaveCount(0);
	});
	test.beforeEach(async ({ page }) => {
		await page.goto("/fourier-series");
		await page.waitForLoadState("networkidle");
	});

	/**
	 * Verifies initial rendering of the Fourier Series module page.
	 */
	test("renders header, waveform selector, and Fourier practice card", async ({
		page,
	}) => {
		await expect(page).toHaveTitle(/Fourier Series Analysis — SignalLab/i);
		await expect(page.locator("h1.page-title")).toHaveText(
			/Fourier Series Analysis/i,
		);

		const drillSummary = page.locator(".drill-summary");
		await drillSummary.click();

		const waveformSelect = page.locator("#waveform-select");
		await expect(waveformSelect).toBeVisible();

		const practiceCard = page.locator(".fourier-practice-card");
		await expect(practiceCard).toBeVisible();

		// Check generic anti-spoiler title
		await expect(practiceCard.locator(".problem-title")).toHaveText(
			/Practice Problem: Periodic Waveform/i,
		);
		await expect(practiceCard.locator(".problem-header")).not.toContainText(
			/Symmetry/i,
		);
	});

	/**
	 * Verifies all waveform variants and deterministic random mode.
	 */
	test("exposes every waveform and preserves seeded random drills", async ({
		page,
	}) => {
		const drillSummary = page.locator(".drill-summary");
		await drillSummary.click();

		const waveformSelect = page.locator("#waveform-select");
		const optionValues = await waveformSelect
			.locator("option")
			.evaluateAll((options) =>
				options.map((option) => (option as HTMLOptionElement).value),
			);
		expect(optionValues).toEqual([
			"random",
			"square",
			"square_odd",
			"square_even",
			"triangle",
			"triangle_odd",
			"triangle_even",
			"sawtooth",
			"half_wave_sine",
			"full_wave_sine",
		]);

		await waveformSelect.selectOption("full_wave_sine");
		await page.waitForTimeout(300);
		const card = page.locator(".fourier-practice-card");
		await expect(card).toBeVisible();

		await waveformSelect.selectOption("random");
		await page.waitForTimeout(300);
		expect(page.url()).toContain("waveform=random");
		const realizedBadge = await card
			.locator(".badges-row .badge.secondary")
			.textContent();
		const sharedUrl = page.url();

		await page.goto(sharedUrl);
		await page.waitForLoadState("networkidle");
		await expect(page.locator(".badges-row .badge.secondary")).toHaveText(
			realizedBadge ?? "",
		);
	});

	/**
	 * Verifies 7-step ITS workflow: Step 1 period inputs, hints toggle, and progressive progression.
	 */
	test("steps through interactive ITS solver steps with hints and diagnostic feedback", async ({
		page,
	}) => {
		const step1 = page.locator(".step-card").first();
		await expect(step1).toBeVisible();
		await expect(step1.locator(".step-title")).toHaveText(
			/Fundamental Period & Frequency/i,
		);

		// Test Hint Toggle
		const hintBtn = step1.locator(".btn-hint");
		await expect(hintBtn).toBeVisible();
		await hintBtn.click();
		await expect(step1.locator(".hints-content")).toBeVisible();

		// Input wrong answer to verify misconception feedback
		const tInput = page.locator("#fourier-period-input");
		const w0Input = page.locator("#fourier-freq-input");
		await tInput.fill("999");
		await w0Input.fill("999");

		const checkBtn = step1.locator(".step-actions .btn-primary");
		await checkBtn.click();
		await page.waitForTimeout(200);

		// Error feedback alert should be displayed
		const feedbackAlert = page.locator(".feedback-alert");
		await expect(feedbackAlert).toBeVisible();

		// The anti-spoiler statement intentionally hides T0, so try both
		// generator-supported period/frequency pairs.
		await tInput.fill("2");
		await w0Input.fill("pi");
		await checkBtn.click();
		await page.waitForTimeout(200);

		const step2 = page.locator(".step-card").nth(1);
		if (
			!(await step2.evaluate((element) =>
				element.classList.contains("active"),
			))
		) {
			await tInput.fill("4");
			await w0Input.fill("pi/2");
			await checkBtn.click();
		}

		// Should progress to Step 2: Waveform Symmetry
		await expect(step2).toHaveClass(/active/);
		await expect(step2.locator(".step-title")).toHaveText(
			/Waveform Symmetry Analysis/i,
		);
		await expect(step2).toContainText("Part 1 of 2");
		await expect(step2).toContainText("Classify Origin Parity");
		await expect(
			step2.getByTestId("fourier-step2-half-wave-options"),
		).toHaveCount(0);
	});

	test("presents symmetry as two sequential parts with separate hints @dev-harness", async ({
		page,
	}) => {
		await page.goto("/fourier-series?waveform=square_even&seed=10");
		await page.waitForLoadState("networkidle");
		const prepared = await page.evaluate(
			() =>
				window.__signalLabDev?.goToVisualState(
					"fourier-series.step-02.symmetry",
				) ?? false,
		);
		expect(prepared).toBe(true);

		const step2 = page.locator(".step-card").nth(1);
		await expect(step2).toContainText("Part 1 of 2");
		await step2.getByRole("button", { name: /Even Symmetry/i }).click();
		await step2
			.getByRole("button", { name: /Check Origin Parity/i })
			.click();

		await expect(step2).toContainText("Part 2 of 2");
		await expect(step2).toContainText("Test Half-Wave Symmetry");
		await expect(step2).toContainText(
			"the second half of each period is an upside-down copy of the first half",
		);
		await expect(
			step2.getByTestId("fourier-step2-origin-options"),
		).toHaveCount(0);

		await step2.getByRole("button", { name: /Get Hint/i }).click();
		await expect(step2.locator(".hints-content")).toContainText(
			"Compare the second half of one period",
		);

		await step2
			.getByRole("button", { name: /Has Half-Wave Symmetry/i })
			.click();
		await step2
			.getByRole("button", { name: /Check Half-Wave Symmetry/i })
			.click();
		await expect(page.locator(".step-card").nth(2)).toHaveClass(/active/);
	});

	/**
	 * Verifies layout reflow and zero horizontal overflow on 320px narrow mobile viewports.
	 */
	test("renders cleanly without horizontal layout overflow on 320px narrow mobile viewport", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.waitForTimeout(300);

		// Assert no horizontal scrollbar on the page
		const isOverflowing = await page.evaluate(() => {
			return (
				document.documentElement.scrollWidth >
				document.documentElement.clientWidth
			);
		});
		expect(isOverflowing).toBe(false);

		// Open drill disclosure to assert control bar dropdown is visible and bounded
		const drillSummary = page.locator(".drill-summary");
		await drillSummary.click();
		const controlGroup = page.locator(".control-group");
		await expect(controlGroup).toBeVisible();

		// Assert all progress pills are bounded within the progress bar container
		const progressBar = page.locator(".steps-progress-bar");
		await expect(progressBar).toBeVisible();
		const progressBarBox = await progressBar.boundingBox();
		expect(progressBarBox).not.toBeNull();

		const pills = page.locator(".progress-pill");
		const pillCount = await pills.count();
		for (let i = 0; i < pillCount; i++) {
			const pillBox = await pills.nth(i).boundingBox();
			expect(pillBox).not.toBeNull();
			if (pillBox && progressBarBox) {
				expect(pillBox.x + pillBox.width).toBeLessThanOrEqual(
					progressBarBox.x + progressBarBox.width + 1,
				);
			}
		}

		// Assert primary action button is bounded within the step card
		const step1Card = page.locator(".step-card").first();
		const cardBox = await step1Card.boundingBox();
		const checkBtn = step1Card.locator(".btn-primary");
		const btnBox = await checkBtn.boundingBox();
		expect(cardBox).not.toBeNull();
		expect(btnBox).not.toBeNull();
		if (cardBox && btnBox) {
			expect(btnBox.x).toBeGreaterThanOrEqual(cardBox.x - 1);
			expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(
				cardBox.x + cardBox.width + 1,
			);
		}
	});

	test("left-aligns an example formula in every representation choice @dev-harness", async ({
		page,
	}) => {
		const prepared = await page.evaluate(
			() =>
				window.__signalLabDev?.goToVisualState(
					"fourier-series.step-04.representation-form",
				) ?? false,
		);
		expect(prepared).toBe(true);

		const choices = page.locator(".representation-choice");
		await expect(choices).toHaveCount(3);
		await expect(choices.locator(".math-block")).toHaveCount(3);
		await expect(choices.locator("button")).toHaveCount(0);
		await expect(choices.locator(".katex-error")).toHaveCount(0);

		for (let index = 0; index < 3; index++) {
			const choice = choices.nth(index);
			await expect(choice.locator(".math-block")).toBeVisible();
			const alignment = await choice
				.locator(".math-block .katex-display > .katex")
				.evaluate((element) => getComputedStyle(element).textAlign);
			expect(alignment).toBe("left");
		}
	});

	test("carries half-wave DC and advances remaining coefficient work @dev-harness", async ({
		page,
	}) => {
		await page.goto("/fourier-series?waveform=square_even&seed=10");
		await page.waitForLoadState("networkidle");
		const prepared = await page.evaluate(
			() =>
				window.__signalLabDev?.goToVisualState(
					"fourier-series.step-05.integral-setup",
				) ?? false,
		);
		expect(prepared).toBe(true);

		const step5 = page.locator(".step-card").nth(4);
		await expect(step5).toContainText("Part 1 of 1");
		await expect(step5).toContainText("Set Up Cosine Coefficients");
		await expect(step5.locator(".carried-coefficients")).toContainText(
			"Half-wave symmetry makes the signal average zero",
		);
		await expect(step5.locator(".carried-coefficients")).toContainText(
			"Even symmetry eliminates every sine coefficient",
		);

		const options = step5.locator(
			'[data-testid="fourier-step5-options"] button',
		);
		await expect(options).toHaveCount(4);
		await page.evaluate(() => window.__signalLabDev?.autoFillStep(5));
		await expect(page.locator(".step-card").nth(5)).toHaveClass(/active/);
	});

	test("shows the complete solved derivation in one native disclosure @dev-harness", async ({
		page,
	}) => {
		await page.evaluate(() => window.__signalLabDev?.solveAll());

		const breakdown = page.locator("details.solution-breakdown");
		await expect(breakdown).toBeVisible();
		await expect(breakdown).not.toHaveAttribute("open", "");
		await expect(
			breakdown.locator("summary.solution-summary"),
		).toContainText("All 7 Steps");
		await expect(breakdown.locator(".solution-step")).toHaveCount(7);
		await expect(breakdown.getByText(/Reveal Step|Reveal All/)).toHaveCount(
			0,
		);

		await breakdown.locator("summary").click();
		await expect(breakdown).toHaveAttribute("open", "");
		await expect(breakdown.locator(".solution-step").first()).toBeVisible();
		await expect(breakdown.locator(".solution-step").last()).toBeVisible();
		await expect(breakdown.locator(".katex-error")).toHaveCount(0);
	});

	test("offers conversion as an optional post-completion challenge @dev-harness", async ({
		page,
	}) => {
		await page.evaluate(() => window.__signalLabDev?.solveAll());
		const challenge = page.locator("details.conversion-challenge");
		await expect(challenge).toBeVisible();
		await expect(challenge).not.toHaveAttribute("open", "");
		await expect(page.locator(".solution-summary-badge")).toHaveText(
			"All 7 Steps",
		);
		await challenge.locator("summary").click();

		for (const expectedProgress of [
			"Part 2 of 2",
			"Optional conversions completed",
		]) {
			const options = challenge.locator(
				'[data-testid="fourier-conversion-options"] button',
			);
			for (let index = 0; index < 4; index += 1) {
				await options.nth(index).click();
				if (
					await challenge
						.getByText(new RegExp(expectedProgress))
						.count()
				)
					break;
			}
			await expect(
				challenge.getByText(new RegExp(expectedProgress)),
			).toBeVisible();
		}

		await expect(page.locator(".solution-summary-badge")).toHaveText(
			"All 9 Steps",
		);
	});

	test("keeps plots and harmonic controls usable across responsive widths @dev-harness", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.evaluate(() => window.__signalLabDev?.solveAll());

		const visualizer = page.locator(".fourier-canvas-wrapper");
		await expect(visualizer).toBeVisible();
		const desktopStyles = await visualizer.evaluate((element) => {
			const plots = element.querySelector<HTMLElement>(".plots-grid");
			const controls =
				element.querySelector<HTMLElement>(".controls-bar");
			return {
				columns: plots
					? getComputedStyle(plots).gridTemplateColumns.split(" ")
							.length
					: 0,
				controlPosition: controls
					? getComputedStyle(controls).position
					: "",
			};
		});
		expect(desktopStyles.columns).toBe(2);
		expect(desktopStyles.controlPosition).toBe("sticky");

		await page.setViewportSize({ width: 480, height: 800 });
		await page.waitForTimeout(100);
		const narrowStyles = await visualizer.evaluate((element) => {
			const plots = element.querySelector<HTMLElement>(".plots-grid");
			const metric = element.querySelector<HTMLElement>(".power-stat");
			const metricStyle = metric ? getComputedStyle(metric) : null;
			return {
				columns: plots
					? getComputedStyle(plots).gridTemplateColumns.split(" ")
							.length
					: 0,
				flexDirection: metricStyle?.flexDirection,
				flexWrap: metricStyle?.flexWrap,
				alignContent: metricStyle?.alignContent,
				justifyContent: metricStyle?.justifyContent,
				alignItems: metricStyle?.alignItems,
			};
		});
		expect(narrowStyles).toMatchObject({
			columns: 1,
			flexDirection: "row",
			flexWrap: "wrap",
			alignContent: "center",
			justifyContent: "space-evenly",
			alignItems: "center",
		});
		await expect(
			visualizer.locator(".power-threshold-summary > .math-text"),
		).toHaveCount(1);

		await page.setViewportSize({ width: 320, height: 568 });
		await page.waitForTimeout(100);
		const isOverflowing = await page.evaluate(
			() =>
				document.documentElement.scrollWidth >
				document.documentElement.clientWidth,
		);
		expect(isOverflowing).toBe(false);
	});

	test("does not round a sub-threshold square-wave ratio up to 99 percent @dev-harness", async ({
		page,
	}) => {
		await page.goto("/fourier-series?waveform=square&seed=39");
		await page.waitForLoadState("networkidle");
		await page.evaluate(() => window.__signalLabDev?.solveAll());
		const visualizer = page.locator(".fourier-canvas-wrapper");
		const slider = visualizer.getByLabel("Harmonic Limit:");
		await slider.evaluate((element) => {
			const input = element as HTMLInputElement;
			input.value = "39";
			input.dispatchEvent(new Event("input", { bubbles: true }));
		});
		await expect(visualizer.locator(".capture-ratio")).toHaveText("98.99%");
		await expect(visualizer.locator(".power-stat").nth(2)).toContainText(
			"98.99",
		);
		await expect(
			visualizer.locator(".power-threshold-summary"),
		).toContainText("highest included harmonic");
		await expect(
			visualizer.locator(".power-threshold-summary"),
		).toContainText("41");

		await slider.evaluate((element) => {
			const input = element as HTMLInputElement;
			input.value = "41";
			input.dispatchEvent(new Event("input", { bubbles: true }));
		});
		await expect(visualizer.locator(".capture-ratio")).toHaveText("99.04%");
	});
});
