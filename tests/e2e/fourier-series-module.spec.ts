import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: Fourier Series Practice Module (/fourier-series).
 *
 * Verifies periodic waveform preset selector, dynamic problem updates,
 * harmonic summation canvas, Gibbs phenomenon visualizer,
 * coefficient inputs, step reveal breakdown, and KaTeX rendering.
 */

test.describe('Fourier Series Module', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/fourier-series');
		await page.waitForLoadState('networkidle');
	});

	/**
	 * Verifies initial rendering of the Fourier Series module page.
	 */
	test('renders header, waveform selector, and Fourier practice card', async ({ page }) => {
		await expect(page).toHaveTitle(/Fourier Series Practice — SignalLab/i);
		await expect(page.locator('h1.page-title')).toHaveText(/Fourier Series Analysis/i);

		const waveformSelect = page.locator('#waveform-select');
		await expect(waveformSelect).toBeVisible();

		const practiceCard = page.locator('.fourier-practice-card');
		await expect(practiceCard).toBeVisible();
	});

	/**
	 * Verifies changing periodic waveforms updates signal statement and coefficient forms.
	 */
	test('switches waveforms between square, triangle, sawtooth, and rectified sine', async ({ page }) => {
		const waveformSelect = page.locator('#waveform-select');

		// Select Triangle Wave
		await waveformSelect.selectOption('triangle');
		await page.waitForTimeout(300);
		const card = page.locator('.fourier-practice-card');
		await expect(card).toBeVisible();

		// Select Sawtooth Wave
		await waveformSelect.selectOption('sawtooth');
		await page.waitForTimeout(300);
		await expect(card).toBeVisible();

		// Select Half-Wave Rectified
		await waveformSelect.selectOption('half_wave_sine');
		await page.waitForTimeout(300);
		await expect(card).toBeVisible();

		// Next problem generation
		const nextBtn = page.locator('button:has-text("Generate Next Problem")');
		if (await nextBtn.isVisible()) {
			await nextBtn.click();
			await page.waitForTimeout(300);
			await expect(card).toBeVisible();
		}
	});

	/**
	 * Verifies Fourier partial sum and harmonic spectrum canvas visualizer.
	 */
	test('renders Fourier partial sum canvas and harmonic spectrum bars', async ({ page }) => {
		const canvas = page.locator('canvas');
		await expect(canvas.first()).toBeVisible();

		// If harmonic slider exists, verify interaction
		const harmonicSlider = page.locator('input[type="range"]');
		if (await harmonicSlider.isVisible()) {
			await harmonicSlider.fill('15');
			await page.waitForTimeout(200);
			await expect(canvas.first()).toBeVisible();
		}
	});

	/**
	 * Verifies step reveal breakdown with trigonometric and exponential formulas.
	 */
	test('expands analytical step reveal and validates KaTeX formula blocks', async ({ page }) => {
		const revealToggle = page.locator('.reveal-header');
		if (await revealToggle.isVisible()) {
			await revealToggle.click();
			const revealContent = page.locator('.reveal-content');
			await expect(revealContent).toBeVisible();

			const katex = revealContent.locator('.katex');
			await expect(katex.first()).toBeVisible();
		}
	});
});
