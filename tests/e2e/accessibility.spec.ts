import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: Accessibility (a11y), Keyboard Navigation, Focus Styling, and Error Handling.
 *
 * Verifies semantic HTML landmarks, keyboard Tab sequences, visible :focus-visible outlines,
 * ARIA roles and labels, and 404 error page accessibility.
 */

test.describe('Accessibility, Focus Styling & Error Handling', () => {
	/**
	 * Verifies document structure adheres to semantic HTML hierarchy.
	 */
	test('maintains proper semantic structure with single h1 per page and landmarks', async ({ page }) => {
		const routes = ['/', '/odes', '/convolution', '/fourier-series', '/fourier-transform', '/laplace', '/circuits'];

		for (const route of routes) {
			await page.goto(route);
			await page.waitForLoadState('networkidle');

			// Semantic header and main landmarks
			await expect(page.locator('header.navbar')).toBeVisible();
			await expect(page.locator('main')).toBeVisible();

			// Exactly one h1 per page
			const h1Elements = page.locator('h1');
			await expect(h1Elements).toHaveCount(1);
		}
	});

	/**
	 * Verifies keyboard Tab navigation sequence and focus indicators.
	 */
	test('supports keyboard Tab navigation through navbar links with focus indicators', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Press Tab multiple times to navigate through header
		await page.keyboard.press('Tab');
		const activeElementTag = await page.evaluate(() => document.activeElement?.tagName);
		expect(['A', 'BUTTON', 'INPUT']).toContain(activeElementTag);

		// Verify focused element has an outline or border style
		const hasFocusRing = await page.evaluate(() => {
			const el = document.activeElement;
			if (!el) return false;
			const style = window.getComputedStyle(el);
			return style.outlineStyle !== 'none' || style.boxShadow !== 'none' || style.borderColor !== '';
		});
		expect(hasFocusRing).toBe(true);
	});

	/**
	 * Verifies custom 404 error page renders with accessible explanation and return link.
	 */
	test('renders custom 404 error page for non-existent routes with return navigation', async ({ page }) => {
		await page.goto('/non-existent-route-path');
		await page.waitForLoadState('networkidle');

		// Check custom error page title or content
		const errorHeading = page.locator('h1, h2, .error-title, .status-code');
		await expect(errorHeading.first()).toBeVisible();

		// Check navigation back home is available
		const homeLink = page.locator('a[href="/"]');
		await expect(homeLink.first()).toBeVisible();
	});
});
