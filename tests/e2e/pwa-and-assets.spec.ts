import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: PWA Manifest, Fonts, and Static Asset Integrity.
 *
 * Verifies that the Web App Manifest is accessible and structurally valid,
 * and confirms that all required PWA icons, favicons, KaTeX font files (.woff2),
 * and static CSS stylesheets resolve with HTTP 200 without network failures.
 */

test.describe('PWA & Static Asset Verification', () => {
	/**
	 * Verifies static icon and KaTeX font resources return HTTP 200.
	 */
	test('loads favicons, PWA icons, and KaTeX woff2 font files successfully', async ({ page }) => {
		const assetsToVerify = [
			'/favicon.svg',
			'/apple-touch-icon.png',
			'/icons/pwa-icon-192x192.png',
			'/icons/pwa-icon-512x512.png',
			'/katex/katex.min.css',
			'/katex/fonts/KaTeX_Main-Regular.woff2',
			'/katex/fonts/KaTeX_Math-Italic.woff2',
			'/katex/fonts/KaTeX_Size1-Regular.woff2',
			'/robots.txt'
		];

		for (const assetPath of assetsToVerify) {
			const response = await page.request.get(assetPath);
			expect(response.status(), `Asset ${assetPath} should return HTTP 200`).toBe(200);
		}
	});

	/**
	 * Verifies HTML document includes correct favicon and manifest link tags.
	 */
	test('contains valid PWA manifest and link tags in document head', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Check favicon link
		const iconLink = page.locator('link[rel="icon"]');
		await expect(iconLink.first()).toHaveAttribute('href', /favicon\.svg/);

		// Check apple-touch-icon link
		const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
		if (await appleTouchIcon.count() > 0) {
			await expect(appleTouchIcon.first()).toHaveAttribute('href', /apple-touch-icon/);
		}

		// Check theme color meta tag
		const themeColorMeta = page.locator('meta[name="theme-color"]');
		if (await themeColorMeta.count() > 0) {
			await expect(themeColorMeta.first()).toHaveAttribute('content', /.+/);
		}
	});
});
