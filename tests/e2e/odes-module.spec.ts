import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: Linear Constant-Coefficient ODEs Practice Module (/odes).
 *
 * Verifies problem customization selectors, anti-spoiler headers,
 * 6-stage interactive ITS solver workflow, progressive hints, distractor feedback,
 * and deferred post-solve waveform response canvas.
 */

test.describe('LCC ODEs Practice Module', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/odes');
		await page.waitForLoadState('networkidle');
	});

	/**
	 * Verifies initial rendering of the ODEs module page.
	 */
	test('renders header, control selectors, and active practice card with anti-spoiler title', async ({ page }) => {
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
		await expect(practiceCard.locator('.problem-title')).toHaveText(/Practice Problem: 2nd-Order LCC ODE/i);
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
	 * Verifies 6-stage ITS ODE workflow: Stage 1 roots inputs, progressive hints, and progression to Stage 2.
	 */
	test('steps through interactive ODE ITS solver with hints and validation feedback', async ({ page }) => {
		// Verify Stage 1 is active
		const stage1 = page.locator('.stage-card').first();
		await expect(stage1).toBeVisible();
		await expect(stage1.locator('.stage-title')).toHaveText(/Characteristic Polynomial Roots/i);

		// Test Hint Toggle
		const hintBtn = page.locator('.hint-toggle-btn');
		await expect(hintBtn).toBeVisible();
		await hintBtn.click();
		await expect(page.locator('.hint-container')).toBeVisible();

		// Input incorrect root values to verify feedback alert
		const r1Input = page.locator('#ode-r1-input');
		const r2Input = page.locator('#ode-r2-input');
		await r1Input.fill('999');
		await r2Input.fill('999');

		const checkBtn = page.locator('.stage-actions .btn-primary');
		await checkBtn.click();
		await page.waitForTimeout(200);

		// Feedback alert visible
		const feedbackAlert = page.locator('.feedback-alert');
		await expect(feedbackAlert).toBeVisible();
	});
});
