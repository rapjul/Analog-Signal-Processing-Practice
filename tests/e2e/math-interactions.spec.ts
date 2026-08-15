import { expect, test } from '@playwright/test';

/**
 * End-to-End Test Suite: Mathematical Interactions, LaTeX Copy Badges, and Zero-Unicode Audit.
 *
 * Verifies click-to-copy tooltip badge visibility on hover/click, clipboard interaction lifecycle,
 * and performs an automated DOM crawl across all 7 routes to enforce Universal Rule 1 (Zero Unicode Math).
 */

test.describe('Math Interactions & Zero-Unicode Audit', () => {
	/**
	 * Verifies hover and click-to-copy pop-up badge lifecycle on MathInline and MathBlock components.
	 */
	test('displays copy badge on hover and confirms copy state on click', async ({ page, context }) => {
		// Grant clipboard permissions for Chromium-based engines
		await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

		await page.goto('/odes');
		await page.waitForLoadState('networkidle');

		// Locate the first MathInline button
		const mathInlineBtn = page.locator('button.math-inline').first();
		await expect(mathInlineBtn).toBeVisible();

		// Hover over math element to trigger copy badge
		await mathInlineBtn.hover();
		await page.waitForTimeout(250);

		const copyBadge = mathInlineBtn.locator('.copy-badge');
		await expect(copyBadge).toBeVisible();
		await expect(copyBadge).toHaveText(/Copy LaTeX/i);

		// Click the math component to copy
		await mathInlineBtn.click();
		await page.waitForTimeout(250);

		// Badge should switch to "Copied!" state
		await expect(copyBadge).toHaveClass(/copied-state/);
		await expect(copyBadge).toHaveText(/Copied!/i);
	});

	/**
	 * Automated DOM TreeWalker Crawler across all 7 routes to enforce Universal Rule 1.
	 * Scans visible text nodes outside KaTeX containers for unescaped unicode math symbols.
	 */
	test('audits rendered DOM across all routes for zero raw unicode math characters', async ({ page }) => {
		const routes = [
			'/',
			'/odes',
			'/convolution',
			'/fourier-series',
			'/fourier-transform',
			'/laplace',
			'/circuits'
		];

		for (const route of routes) {
			await page.goto(route);
			await page.waitForLoadState('networkidle');

			const violations = await page.evaluate(() => {
				const forbiddenRegex = /[∑∫∬∭∮∂∇√∛∜≈≠≤≥∓±∞∝∠∡∢⌢πσωσΩΔθλμ]/;
				const foundViolations: Array<{ char: string; text: string; tag: string; outerHtml: string }> = [];

				const walker = document.createTreeWalker(
					document.body,
					NodeFilter.SHOW_TEXT,
					{
						acceptNode: (node: Node) => {
							const parent = node.parentElement;
							if (!parent) return NodeFilter.FILTER_REJECT;

							// Ignore KaTeX rendering containers, math tags, svgs, canvases, script/style tags, and native option elements
							if (parent.closest('.katex, .katex-html, math, annotation, svg, canvas, script, style, option')) {
								return NodeFilter.FILTER_REJECT;
							}
							return NodeFilter.FILTER_ACCEPT;
						}
					}
				);

				let currentNode = walker.nextNode();
				while (currentNode) {
					const text = currentNode.textContent || '';
					const match = text.match(forbiddenRegex);
					if (match) {
						foundViolations.push({
							char: match[0],
							text: text.trim().slice(0, 80),
							tag: currentNode.parentElement?.tagName || 'UNKNOWN',
							outerHtml: currentNode.parentElement?.outerHTML.slice(0, 150) || ''
						});
					}
					currentNode = walker.nextNode();
				}

				return foundViolations;
			});

			expect(
				violations,
				`Route ${route} contains forbidden raw Unicode math characters in UI text outside KaTeX:\n${JSON.stringify(violations, null, 2)}`
			).toEqual([]);
		}
	});
});
