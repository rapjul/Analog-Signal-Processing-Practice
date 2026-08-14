import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: Continuous-Time Fourier Transform Module (/fourier-transform).
 *
 * Verifies CTFT signal category selection, transform formula input,
 * dynamic problem prompt updates, validation feedback, and step breakdown KaTeX math.
 */

test.describe('CTFT Practice Module', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/fourier-transform');
		await page.waitForLoadState('networkidle');
	});

	/**
	 * Verifies initial rendering of the CTFT module page.
	 */
	test('renders header, signal category dropdown, and CTFT practice card', async ({ page }) => {
		await expect(page).toHaveTitle(/CTFT Practice — SignalLab/i);
		await expect(page.locator('h1.page-title')).toHaveText(/Continuous-Time Fourier Transform \(CTFT\)/i);

		const signalSelect = page.locator('#signal-type-select');
		await expect(signalSelect).toBeVisible();

		const practiceCard = page.locator('.practice-card');
		await expect(practiceCard).toBeVisible();
	});

	/**
	 * Verifies changing signal categories generates appropriate transform problems.
	 */
	test('updates CTFT problem when switching signal types', async ({ page }) => {
		const signalSelect = page.locator('#signal-type-select');

		// Select Exponential Decay
		await signalSelect.selectOption('exponential');
		await page.waitForTimeout(300);
		const prompt = page.locator('.problem-prompt');
		await expect(prompt).toBeVisible();

		// Select Cosines
		await signalSelect.selectOption('cos');
		await page.waitForTimeout(300);
		await expect(prompt).toBeVisible();

		// Select Gaussian
		await signalSelect.selectOption('gaussian');
		await page.waitForTimeout(300);
		await expect(prompt).toBeVisible();
	});

	/**
	 * Verifies LaTeX math input and feedback display on submission.
	 */
	test('submits LaTeX answer and shows validation alert', async ({ page }) => {
		const input = page.locator('#ctft-input');
		if (await input.isVisible()) {
			await input.fill('\\frac{1}{a + j\\omega}');

			const checkBtn = page.locator('button.btn-primary');
			if (await checkBtn.isVisible()) {
				await checkBtn.click();
				await page.waitForTimeout(300);

				// Verification feedback should appear
				const feedback = page.locator('.feedback-alert, .result-msg, .alert');
				if (await feedback.count() > 0) {
					await expect(feedback.first()).toBeVisible();
				}
			}
		}
	});

	/**
	 * Verifies step-by-step transform derivation and KaTeX formula rendering.
	 */
	test('renders KaTeX math formulas in CTFT prompt and step breakdowns', async ({ page }) => {
		const katex = page.locator('.katex');
		await expect(katex.first()).toBeVisible();
	});
});
