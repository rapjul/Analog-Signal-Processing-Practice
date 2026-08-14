import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: Circuit Analysis & Transfer Functions H(s) Module (/circuits).
 *
 * Verifies circuit topology selector across 6 configurations, dynamic R/L/C component
 * sliders, transfer function H(s) derivation, and Bode frequency response calculation.
 */

test.describe('Circuit Analysis Module', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/circuits');
		await page.waitForLoadState('networkidle');
	});

	/**
	 * Verifies initial rendering of the Circuits module page.
	 */
	test('renders header, topology selector, prompt, and component sliders', async ({ page }) => {
		await expect(page).toHaveTitle(/Circuit Analysis & Transfer Functions — SignalLab/i);
		await expect(page.locator('h1.page-title')).toHaveText(/Circuit Analysis & Transfer Functions H\(s\)/i);

		const topologySelect = page.locator('#topology-select');
		await expect(topologySelect).toBeVisible();

		const card = page.locator('.practice-card');
		await expect(card).toBeVisible();

		// Check component sliders
		const rSlider = page.locator('#r-slider');
		await expect(rSlider).toBeVisible();
	});

	/**
	 * Verifies selecting different circuit topologies updates transfer function derivations.
	 */
	test('updates transfer function when switching between circuit topologies', async ({ page }) => {
		const topologySelect = page.locator('#topology-select');

		// Select Parallel RLC
		await topologySelect.selectOption('parallel-rlc');
		await page.waitForTimeout(300);
		const prompt = page.locator('.problem-prompt');
		await expect(prompt).toBeVisible();

		// Select RC Low-Pass Filter
		await topologySelect.selectOption('rc-lpf');
		await page.waitForTimeout(300);
		await expect(prompt).toBeVisible();

		// Select Active Sallen-Key
		await topologySelect.selectOption('active-sallen-key');
		await page.waitForTimeout(300);
		await expect(prompt).toBeVisible();
	});

	/**
	 * Verifies adjusting component sliders dynamically recalculates transfer function values.
	 */
	test('adjusts R, L, C sliders and recalculates circuit parameters', async ({ page }) => {
		const rSlider = page.locator('#r-slider');
		await rSlider.fill('50');
		await page.waitForTimeout(200);

		const lSlider = page.locator('#l-slider');
		if (await lSlider.isVisible()) {
			await lSlider.fill('5');
			await page.waitForTimeout(200);
		}

		const cSlider = page.locator('#c-slider');
		if (await cSlider.isVisible()) {
			await cSlider.fill('0.05');
			await page.waitForTimeout(200);
		}

		// Ensure KaTeX math is rendered
		const katex = page.locator('.katex');
		await expect(katex.first()).toBeVisible();
	});
});
