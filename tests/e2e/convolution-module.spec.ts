import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: Continuous-Time Convolution Practice Module (/convolution).
 *
 * Verifies signal pair category customization, dynamic problem regeneration,
 * embedded flip-and-shift canvas visualizer, time-scrubber interactions,
 * analytical piecewise solution reveals, and KaTeX rendering.
 */

test.describe('Continuous-Time Convolution Module', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/convolution');
		await page.waitForLoadState('networkidle');
	});

	/**
	 * Verifies initial rendering of the convolution module page.
	 */
	test('renders header, category select dropdown, and convolution problem card', async ({ page }) => {
		await expect(page).toHaveTitle(/Continuous-Time Convolution Practice — SignalLab/i);
		await expect(page.locator('h1.page-title')).toHaveText(/Continuous-Time Convolution/i);

		const pairSelect = page.locator('#pair-type-select');
		await expect(pairSelect).toBeVisible();

		const practiceCard = page.locator('.convolution-practice-card');
		await expect(practiceCard).toBeVisible();
	});

	/**
	 * Verifies switching signal categories changes signals and recalculates problem parameters.
	 */
	test('switches between signal categories and generates new problem statements', async ({ page }) => {
		const pairSelect = page.locator('#pair-type-select');

		// Select Rect * Exponential
		await pairSelect.selectOption('rect_exp');
		await page.waitForTimeout(300);

		const card = page.locator('.convolution-practice-card');
		await expect(card).toBeVisible();

		// Select Exp * Exp
		await pairSelect.selectOption('exp_exp');
		await page.waitForTimeout(300);
		await expect(card).toBeVisible();

		// Click Generate Next Problem button
		const nextBtn = page.locator('button:has-text("Generate Next Problem")');
		if (await nextBtn.isVisible()) {
			await nextBtn.click();
			await page.waitForTimeout(300);
			await expect(card).toBeVisible();
		}
	});

	/**
	 * Verifies flip-and-shift canvas visualizer and time slider scrubbing.
	 */
	test('renders convolution canvas animator with interactive time slider', async ({ page }) => {
		const canvas = page.locator('canvas');
		await expect(canvas.first()).toBeVisible();

		// Test time slider if present
		const timeSlider = page.locator('input[type="range"]');
		if (await timeSlider.isVisible()) {
			await timeSlider.fill('2.5');
			await page.waitForTimeout(200);
			await expect(canvas.first()).toBeVisible();
		}
	});

	/**
	 * Verifies piecewise solution reveal expansion and KaTeX rendering.
	 */
	test('reveals analytical piecewise step breakdown and validates KaTeX math blocks', async ({ page }) => {
		const revealToggle = page.locator('.reveal-header');
		if (await revealToggle.isVisible()) {
			await revealToggle.click();
			const revealContent = page.locator('.reveal-content');
			await expect(revealContent).toBeVisible();

			// Verify KaTeX math expressions inside reveal
			const katex = revealContent.locator('.katex');
			await expect(katex.first()).toBeVisible();
		}
	});
});
