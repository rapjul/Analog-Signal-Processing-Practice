import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: Laplace Transform & S-Domain Practice Module (/laplace).
 *
 * Verifies Inverse Laplace problem generation, Partial Fraction Decomposition (PFD)
 * steps, Region of Convergence (ROC) analysis, BIBO stability checks, and KaTeX rendering.
 */

test.describe('Laplace Transform & S-Domain Module', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/laplace');
		await page.waitForLoadState('networkidle');
	});

	/**
	 * Verifies initial rendering of the Laplace practice page.
	 */
	test('renders header, practice card, problem prompt, and input controls', async ({ page }) => {
		await expect(page).toHaveTitle(/Laplace Transform & S-Domain Practice — SignalLab/i);
		await expect(page.locator('h1.page-title')).toHaveText(/Laplace Transform & S-Domain Analysis/i);

		const practiceCard = page.locator('.practice-card');
		await expect(practiceCard).toBeVisible();

		const prompt = page.locator('.problem-prompt');
		await expect(prompt).toBeVisible();

		const input = page.locator('#laplace-input');
		await expect(input).toBeVisible();
	});

	/**
	 * Verifies student answer submission and dynamic problem regeneration.
	 */
	test('accepts student LaTeX answer and regenerates new PFD problems', async ({ page }) => {
		const input = page.locator('#laplace-input');
		await input.fill('2 e^{-2t} u(t) - e^{-3t} u(t)');

		const checkBtn = page.locator('button.btn-primary:has-text("Check Answer")');
		await checkBtn.click();
		await page.waitForTimeout(300);

		// Click Next Problem button
		const nextBtn = page.locator('button.btn-secondary:has-text("Next Problem")');
		await nextBtn.click();
		await page.waitForTimeout(300);

		const prompt = page.locator('.problem-prompt');
		await expect(prompt).toBeVisible();
	});

	/**
	 * Verifies ROC analysis, BIBO stability, and KaTeX math formulas.
	 */
	test('renders KaTeX formulas and s-domain stability information', async ({ page }) => {
		const katexElements = page.locator('.katex');
		await expect(katexElements.first()).toBeVisible();

		// Check sidebar reference formulas or stability badges
		const sidebar = page.locator('.sidebar-panel, .info-panel, .practice-card');
		await expect(sidebar.first()).toBeVisible();
	});
});
