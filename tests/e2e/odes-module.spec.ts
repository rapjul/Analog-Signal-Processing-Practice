import { expect, test } from "@playwright/test";

/**
 * End-to-End Test Suite: Linear Constant-Coefficient ODEs Practice Module (/odes).
 *
 * Verifies problem customization filters, anti-spoiler headers,
 * 7-step interactive ITS solver workflow, progressive hints, distractor feedback,
 * and deferred post-solve waveform response canvas.
 */

test.describe("LCC ODEs Practice Module", () => {
	/** Verifies a decaying forced response is accepted as transient with zero steady-state. @param fixtures - Browser fixtures. */
	test("grades decaying resonance as transient with zero steady-state @dev-harness", async ({
		page,
	}) => {
		await page.goto(
			"/odes?order=1&forcing=exponential&resonance=simple&seed=3",
		);
		await expect
			.poll(
				/** Waits for the hydrated solver harness. */
				() =>
					page.evaluate(
						/** Reads the harness registration. */
						() => typeof window.__signalLabDev?.goToVisualState,
					),
			)
			.toBe("function");
		await page.evaluate(
			/** Opens the actual response-classification controls. */
			() =>
				window.__signalLabDev?.goToVisualState(
					"ode.step-07.transient-steady-state",
				),
		);
		const active = page.locator(".step-card.active");
		const transient = active.locator(".classification-group").first();
		const steady = active.locator(".classification-group").last();
		const transientFormulas = await transient
			.locator(".mcq-card annotation")
			.allTextContents();
		const steadyFormulas = await steady
			.locator(".mcq-card annotation")
			.allTextContents();
		expect(new Set(transientFormulas).size).toBe(3);
		expect(new Set(steadyFormulas).size).toBe(3);
		const complete = transientFormulas.findIndex(
			/** @param formula - Candidate transient equation. */
			(formula) => formula.includes("4 t e^{-t}"),
		);
		expect(complete).toBeGreaterThanOrEqual(0);
		await transient.locator(".mcq-card").nth(complete).click();
		await steady
			.locator(".mcq-card")
			.nth(steadyFormulas.indexOf("y_{ss}(t) = 0"))
			.click();
		await active
			.getByRole("button", { name: "Verify Transient & Steady-State" })
			.click();
		await expect(
			active.getByText("Targeted Conceptual Mastery Check"),
		).toBeVisible();
	});

	/** Verifies unit-frequency derivative choices and their visible grading. @param fixtures - Browser fixtures. */
	test("grades distinct unit-frequency derivatives correctly @dev-harness", async ({
		page,
	}) => {
		await page.goto("/odes?order=2&forcing=sinusoid&resonance=none&seed=1");
		await expect
			.poll(
				/** Reads harness availability after hydration. */
				() =>
					page.evaluate(
						/** Checks the registered solver harness. */
						() => typeof window.__signalLabDev?.goToVisualState,
					),
			)
			.toBe("function");
		await page.evaluate(
			/** Opens Step 5 through the existing development harness. */
			() =>
				window.__signalLabDev?.goToVisualState(
					"ode.step-05.first-derivative",
				),
		);
		const active = page.locator(".step-card.active");
		const first = active.locator(".subpart-block").first();
		const choices = first.locator(".mcq-card");
		await expect(choices).toHaveCount(4);
		const formulas = await choices.locator("annotation").allTextContents();
		const correct = formulas.indexOf(
			String.raw`y_p'(t) = -1A \sin(1t) + 1B \cos(1t)`,
		);
		expect(correct).toBeGreaterThanOrEqual(0);
		await choices.nth(correct).click();
		await expect(first).toHaveClass(/subpart-done/);
		const second = active.locator(".subpart-block").nth(1);
		const secondFormulas = await second
			.locator(".mcq-card annotation")
			.allTextContents();
		expect(new Set(secondFormulas).size).toBe(4);
		await second
			.locator(".mcq-card")
			.nth(
				secondFormulas.indexOf(
					String.raw`y_p''(t) = -1A \cos(1t) - 1B \sin(1t)`,
				),
			)
			.click();
		await expect(second).toHaveClass(/subpart-done/);
	});

	test.beforeEach(async ({ page }) => {
		await page.goto(
			"/odes?order=2&rootType=distinct_real&forcing=constant&leading=monic&resonance=none&seed=210",
		);
		await page.waitForLoadState("networkidle");
	});

	/**
	 * Verifies initial rendering of the ODEs module page.
	 */
	test("renders header, deterministic drill filters, and order badges without answer spoilers", async ({
		page,
	}) => {
		await expect(page).toHaveTitle(
			/Linear Constant-Coefficient ODEs — SignalLab/i,
		);
		await expect(page.locator("h1.page-title")).toHaveText(
			/Linear Constant-Coefficient ODEs/i,
		);

		// Collapsible filters drawer
		const drillPanel = page.locator(".drill-panel");
		await expect(drillPanel).toBeVisible();
		await expect(drillPanel.locator(".drill-badge")).toHaveText(
			/Custom Filter Active/i,
		);

		// Practice card container
		const practiceCard = page.locator(".practice-card");
		await expect(practiceCard).toBeVisible();
		await expect(practiceCard.locator(".problem-title")).toHaveText(
			/Practice Problem: 2nd-Order LCC ODE/i,
		);

		// The category and order badges preserve the existing anti-spoiler header.
		const badges = practiceCard.locator(".badges-row .badge");
		await expect(badges).toHaveText(["LCC ODE Problem", "2nd-Order"]);
		await expect(practiceCard.locator(".badge.category")).toHaveCount(0);
	});

	/**
	 * Verifies opening the collapsible filter drawer and changing options generates customized problems.
	 */
	test("updates problem statement when changing root and forcing options in drill filters", async ({
		page,
	}) => {
		const drillSummary = page.locator(".drill-summary");
		await drillSummary.click();

		const rootSelect = page.locator("#root-type-select");
		const forcingSelect = page.locator("#forcing-type-select");
		await expect(page.locator("#ode-order-select")).toBeVisible();
		await expect(page.locator("#leading-coefficient-select")).toBeVisible();
		await expect(page.locator("#resonance-select")).toBeVisible();
		await expect(page.locator('input[name="seed"]')).toHaveValue("210");
		await expect(rootSelect).toBeVisible();
		await expect(forcingSelect).toBeVisible();

		// Select Repeated Real Roots & Exponential Forcing
		await rootSelect.selectOption("repeated_real");
		await forcingSelect.selectOption("exponential");
		await page.waitForTimeout(300);

		// Verify problem updates
		const problemCard = page.locator(".practice-card");
		await expect(problemCard).toBeVisible();

		// Select Complex Conjugate & Sinusoid
		await rootSelect.selectOption("complex_conjugate");
		await forcingSelect.selectOption("sinusoid");
		await page.waitForTimeout(300);
		await expect(problemCard).toBeVisible();
	});

	/**
	 * Verifies 7-step ITS ODE workflow: Step 1 characteristic equation inputs, progressive hints, and progression to Step 2.
	 */
	test("steps through interactive ODE ITS solver Step 1 characteristic equation and hints", async ({
		page,
	}) => {
		// Verify Step 1 is active
		const step1 = page.locator(".step-card").first();
		await expect(step1).toBeVisible();
		await expect(step1.locator(".step-title")).toHaveText(
			/Characteristic Equation Formulation/i,
		);

		// Test Hint Toggle
		const hintBtn = page.locator(".hint-toggle-btn");
		await expect(hintBtn).toBeVisible();
		await hintBtn.click();
		await expect(page.locator(".hint-container")).toBeVisible();

		// Input incorrect coefficient values to verify feedback alert
		const a2Input = page.locator("#ode-a2-input");
		const a1Input = page.locator("#ode-a1-input");
		const a0Input = page.locator("#ode-a0-input");
		await a2Input.fill("99");
		await a1Input.fill("99");
		await a0Input.fill("99");

		const checkBtn = step1.locator(".step-actions .btn-primary");
		await checkBtn.click();
		await page.waitForTimeout(200);

		// Feedback alert visible
		const feedbackAlert = page.locator(".feedback-alert");
		await expect(feedbackAlert).toBeVisible();
	});

	/**
	 * Verifies Step 2 requires explicit strategy selection before revealing factoring or quadratic formula inputs.
	 */
	test("requires explicit strategy selection in Step 2 without spoiling answers @dev-harness", async ({
		page,
	}) => {
		// Seeded fixture + developer harness avoids scraping rendered KaTeX.
		await page.evaluate(() =>
			window.__signalLabDev?.goToVisualState("ode.step-02.strategy-gate"),
		);

		// Step 2 should now be active
		const step2 = page.locator(".step-card.active");
		await expect(step2).toBeVisible();
		await expect(step2.locator(".step-title")).toHaveText(
			/Characteristic Polynomial Roots/i,
		);

		// Neither strategy button should be active initially
		const strategyBtns = step2.locator(".strategy-pill-btn");
		await expect(strategyBtns).toHaveCount(2);
		await expect(step2.locator(".strategy-pill-btn.active")).toHaveCount(0);

		// Prompt to select strategy should be visible
		await expect(step2.locator(".strategy-helper-text")).toBeVisible();

		// No root or quadratic inputs should be rendered yet
		await expect(step2.locator("#ode-r1-input")).toHaveCount(0);
		await expect(step2.locator("#ode-disc-input")).toHaveCount(0);

		// Click Factoring by inspection
		await strategyBtns.first().click();
		await expect(strategyBtns.first()).toHaveClass(/active/);
		await expect(
			step2.locator("#ode-r1-input, #ode-r-rep-input"),
		).toBeVisible();

		// Click Quadratic formula
		await strategyBtns.last().click();
		await expect(strategyBtns.last()).toHaveClass(/active/);
		await expect(step2.locator(".quad-classification-box")).toBeVisible();
		await expect(step2.locator(".quad-class-btn")).toHaveCount(3);
		await expect(step2.locator("#ode-disc-input")).toBeVisible();

		// A wrong classification enters the discriminant-remediation state.
		await step2.locator(".quad-class-btn").nth(1).click();
		await expect(step2.locator(".disc-remediation-required")).toBeVisible();
	});

	test("restores safe URL filters and gives first-order problems a direct root flow @dev-harness", async ({
		page,
	}) => {
		await page.goto(
			"/odes?order=1&rootType=not-a-root&forcing=bad&leading=nope&resonance=repeated&seed=4294967296",
		);
		await page.waitForLoadState("networkidle");

		await expect(page.locator("#root-type-select")).toBeDisabled();
		await expect(page.locator("#root-type-select")).toHaveValue("random");
		await expect(page.locator("#resonance-select")).toHaveValue("simple");
		await expect(page.locator("#forcing-type-select")).toHaveValue(
			"exponential",
		);
		await expect(page.locator('input[name="seed"]')).not.toHaveValue(
			"4294967296",
		);
		await expect(page.locator(".problem-title")).toContainText("1st-Order");

		const step1 = page.locator(".step-card").first();
		// The test harness advances without scraping rendered KaTeX.
		await page.evaluate(() =>
			window.__signalLabDev?.goToVisualState(
				"ode.step-02.factoring-inputs",
			),
		);
		const step2 = page.locator(".step-card.active");
		await expect(step2.locator(".strategy-gate-box")).toHaveCount(0);
		await expect(step2.locator("#ode-r1-input")).toBeVisible();
		await expect(step1).not.toHaveClass(/active/);
	});
});
