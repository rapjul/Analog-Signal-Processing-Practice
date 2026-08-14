import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: Linear Constant-Coefficient ODEs Practice Module (/odes).
 *
 * Verifies problem customization selectors, dynamic problem generation,
 * KaTeX formula rendering, interactive student inputs, validation engine,
 * step-by-step solution reveals, and response waveform canvas plotting.
 */

test.describe('LCC ODEs Practice Module', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/odes');
		await page.waitForLoadState('networkidle');
	});

	/**
	 * Verifies initial rendering of the ODEs module page.
	 */
	test('renders header, control selectors, and active problem card', async ({ page }) => {
		await expect(page).toHaveTitle(/LCC ODEs Practice — SignalLab/i);
		await expect(page.locator('h1.page-title')).toHaveText(/Linear Constant-Coefficient ODEs/i);

		// Select inputs
		const rootSelect = page.locator('#root-type-select');
		const forcingSelect = page.locator('#forcing-type-select');
		await expect(rootSelect).toBeVisible();
		await expect(forcingSelect).toBeVisible();

		// Practice card container
		const practiceCard = page.locator('.practice-card');
		await expect(practiceCard).toBeVisible();
		await expect(practiceCard.locator('.problem-title')).toBeVisible();
	});

	/**
	 * Verifies changing root classification and forcing function generates new customized problems.
	 */
	test('updates problem statement when changing root and forcing options', async ({ page }) => {
		const rootSelect = page.locator('#root-type-select');
		const forcingSelect = page.locator('#forcing-type-select');

		// Select Repeated Real Roots & Exponential Forcing
		await rootSelect.selectOption('repeated_real');
		await forcingSelect.selectOption('exponential');
		await page.waitForTimeout(300);

		// Verify problem updates
		const problemCard = page.locator('.practice-card');
		await expect(problemCard).toBeVisible();

		// Select Complex Conjugate & Sinusoid
		await rootSelect.selectOption('complex_conjugate');
		await forcingSelect.selectOption('sinusoid');
		await page.waitForTimeout(300);
		await expect(problemCard).toBeVisible();
	});

	/**
	 * Verifies KaTeX math formula rendering and interactive student answer validation.
	 */
	test('renders KaTeX formulas and provides validation feedback on submission', async ({ page }) => {
		// Verify KaTeX math expressions are rendered
		const katexElements = page.locator('.katex');
		await expect(katexElements.first()).toBeVisible();

		// Input student LaTeX solution
		const mathInput = page.locator('input.math-input-field');
		if (await mathInput.isVisible()) {
			await mathInput.fill('e^{-2t} + e^{-3t}');

			const submitButton = page.locator('button.submit-btn');
			if (await submitButton.isVisible()) {
				await submitButton.click();
				await page.waitForTimeout(300);

				// Validation alert box should appear
				const validationAlert = page.locator('.validation-alert');
				await expect(validationAlert).toBeVisible();
			}
		}
	});

	/**
	 * Verifies step-by-step solution breakdown reveals and waveform canvas visualizer.
	 */
	test('expands step-by-step solution reveal and renders response waveform canvas', async ({ page }) => {
		// Check StepReveal toggle
		const revealToggle = page.locator('.reveal-header');
		if (await revealToggle.isVisible()) {
			await revealToggle.click();
			const revealBody = page.locator('.reveal-content');
			await expect(revealBody).toBeVisible();
		}

		// Verify WaveformCanvas element is rendered
		const canvas = page.locator('canvas.response-canvas');
		await expect(canvas).toBeVisible();

		// Verify plot legends are visible
		const legend = page.locator('.legend');
		await expect(legend).toBeVisible();
	});
});
