import { expect, test } from "@playwright/test";

/**
 * End-to-End Test Suite: Fourier Series Practice Module (/fourier-series).
 *
 * Verifies periodic waveform preset selector, anti-spoiler practice headers,
 * 7-step interactive ITS tutor workflow, progressive hints, misconception diagnostics,
 * and deferred post-solve waveform & spectrum visualizer canvas.
 */

test.describe("Fourier Series Module", () => {
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

	test("left-aligns an example formula in every representation choice", async ({
		page,
	}) => {
		const prepared = await page.evaluate(
			() =>
				window.__signalLabDev?.goToVisualState(
					"fourier.step-04.representation-form",
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

	test("shows the complete solved derivation in one native disclosure", async ({
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

	test("keeps plots and harmonic controls usable across responsive widths", async ({
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
			const metric = element.querySelector<HTMLElement>(".power-metric");
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
			visualizer.locator(".power-thresholds > .math-text"),
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
});
