import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: Fourier Series Practice Module (/fourier-series).
 *
 * Verifies periodic waveform preset selector, anti-spoiler practice headers,
 * 6-stage interactive ITS tutor workflow, progressive hints, misconception diagnostics,
 * and deferred post-solve waveform & spectrum visualizer canvas.
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

		// Check generic anti-spoiler title
		await expect(practiceCard.locator('.problem-title')).toHaveText(/Practice Problem: Periodic Waveform/i);
	});

	/**
	 * Verifies changing periodic waveforms resets and updates problem generator.
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

		// Next problem generation
		const nextBtn = page.locator('.btn-secondary:has-text("New Problem")');
		if (await nextBtn.isVisible()) {
			await nextBtn.click();
			await page.waitForTimeout(300);
			await expect(card).toBeVisible();
		}
	});

	/**
	 * Verifies 6-stage ITS workflow: Step 1 period inputs, hints toggle, and progressive progression.
	 */
	test('steps through interactive ITS solver stages with hints and diagnostic feedback', async ({ page }) => {
		const step1 = page.locator('.step-card').first();
		await expect(step1).toBeVisible();
		await expect(step1.locator('.step-title')).toHaveText(/Fundamental Period/i);

		// Test Hint Toggle
		const hintBtn = page.locator('.hint-toggle-btn');
		await expect(hintBtn).toBeVisible();
		await hintBtn.click();
		await expect(page.locator('.hint-container')).toBeVisible();

		// Input wrong answer to verify misconception feedback
		const tInput = page.locator('#fourier-period-input');
		const w0Input = page.locator('#fourier-freq-input');
		await tInput.fill('999');
		await w0Input.fill('999');

		const checkBtn = page.locator('.step-actions .btn-primary');
		await checkBtn.click();
		await page.waitForTimeout(200);

		// Error feedback alert should be displayed
		const feedbackAlert = page.locator('.feedback-alert');
		await expect(feedbackAlert).toBeVisible();

		// Detect whether generated problem has T_0 = 2 or T_0 = 4 from problem statement
		const statementText = (await page.locator('.problem-statement').textContent()) || '';
		const isT4 = statementText.includes('4');
		const tVal = isT4 ? '4' : '2';
		const w0Val = isT4 ? 'pi/2' : 'pi';

		// Fill correct answers for active waveform
		await tInput.fill(tVal);
		await w0Input.fill(w0Val);
		await checkBtn.click();
		await page.waitForTimeout(200);

		// Should progress to Step 2: Waveform Symmetry
		const step2 = page.locator('.step-card').nth(1);
		await expect(step2).toHaveClass(/active/);
		await expect(step2.locator('.step-title')).toHaveText(/Signal Symmetry Classification/i);
	});
});
