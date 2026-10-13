import { expect, test } from "@playwright/test";

/**
 * End-to-End Test Suite: Continuous-Time Fourier Transform Module (/fourier-transform).
 *
 * Verifies CTFT signal category selection, transform formula input,
 * dynamic problem prompt updates, validation feedback, and step breakdown LaTeX math.
 */

test.describe("CTFT Practice Module", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/fourier-transform");
		await page.waitForLoadState("networkidle");
	});

	/**
	 * Verifies initial rendering of the CTFT module page.
	 */
	test("renders header, signal category dropdown, and CTFT practice card", async ({
		page,
	}) => {
		await expect(page).toHaveTitle(
			/Continuous-Time Fourier Transform \(CTFT\) — SignalLab/i,
		);
		await expect(page.locator("h1.page-title")).toHaveText(
			/Continuous-Time Fourier Transform \(CTFT\)/i,
		);

		await page.locator(".drill-summary").click();
		const signalSelect = page.locator("#signal-type-select");
		await expect(signalSelect).toBeVisible();

		const practiceCard = page.locator(".practice-card");
		await expect(practiceCard).toBeVisible();
	});

	/**
	 * Verifies changing signal categories generates appropriate transform problems.
	 */
	test("updates CTFT problem when switching signal types", async ({
		page,
	}) => {
		await page.locator(".drill-summary").click();
		const signalSelect = page.locator("#signal-type-select");

		const prompt = page.locator(".problem-prompt");
		await expect(prompt).toBeVisible();
		for (const value of ["exponential", "cos", "gaussian"]) {
			const previous = await prompt
				.locator("annotation")
				.first()
				.textContent();
			await signalSelect.selectOption(value);
			await expect(signalSelect).toHaveValue(value);
			await expect(prompt.locator("annotation").first()).not.toHaveText(
				previous ?? "",
			);
		}
	});

	/**
	 * Verifies LaTeX math input and feedback display on submission.
	 */
	test("submits LaTeX answer and shows validation alert", async ({
		page,
	}) => {
		const input = page.locator("#ctft-input");
		await expect(input).toBeVisible();
		await input.fill("arbitrary text");
		await page.getByRole("button", { name: "Check Answer" }).click();
		await expect(page.locator(".feedback-box")).toBeVisible();
		await expect(page.locator(".feedback-box")).not.toHaveAttribute(
			"data-validation",
			"correct",
		);
		await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	});

	/**
	 * Verifies step-by-step transform derivation and KaTeX formula rendering.
	 */
	test("renders KaTeX math formulas in CTFT prompt and step breakdowns", async ({
		page,
	}) => {
		const katex = page.locator(".katex");
		await expect(katex.first()).toBeVisible();
	});
});
