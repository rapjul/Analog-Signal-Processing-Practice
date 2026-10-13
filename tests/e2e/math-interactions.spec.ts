import { expect, test } from "@playwright/test";

/**
 * End-to-End Test Suite: Mathematical Interactions, LaTeX Copy Feedback, and Zero-Unicode Audit.
 *
 * Verifies formula copy-button visibility, clipboard interaction lifecycle,
 * and performs an automated DOM crawl across all 7 routes to enforce Universal Rule 1 (Zero Unicode Math).
 */

test.describe("Math Interactions & Zero-Unicode Audit", () => {
	/**
	 * Verifies the rendered MathBlock copy control and its success feedback.
	 */
	test("copies the displayed formula and confirms copy state on click", async ({
		page,
		context,
		browserName,
	}) => {
		// Grant clipboard permissions for Chromium-based engines
		if (browserName === "chromium") {
			await context.grantPermissions([
				"clipboard-read",
				"clipboard-write",
			]);
		}

		await page.goto("/odes");
		await page.waitForLoadState("networkidle");

		const formula = page
			.getByRole("region", { name: "Mathematical formula block" })
			.first();
		const copyButton = formula.getByRole("button", {
			name: "Copy LaTeX string to clipboard",
		});
		const latex = await formula.locator("annotation").first().textContent();
		await formula.hover();
		await expect(copyButton).toBeVisible();
		await copyButton.click();
		await expect(copyButton).toHaveText("Copied!");
		if (browserName === "chromium") {
			await expect
				.poll(() => page.evaluate(() => navigator.clipboard.readText()))
				.toBe(latex);
		}
	});

	/**
	 * Automated DOM TreeWalker Crawler across all 7 routes to enforce Universal Rule 1.
	 * Scans visible text nodes outside KaTeX containers for unescaped unicode math symbols.
	 */
	test("audits rendered DOM across all routes for zero raw unicode math characters", async ({
		page,
	}) => {
		// This check visits seven pages, unlike the single-page interaction tests.
		test.setTimeout(60_000);
		const routes = [
			"/",
			"/odes",
			"/convolution",
			"/fourier-series",
			"/fourier-transform",
			"/laplace",
			"/circuits",
		];

		for (const route of routes) {
			await page.goto(route);
			await page.waitForLoadState("networkidle");

			const violations = await page.evaluate(() => {
				const forbiddenRegex = /[∑∫∬∭∮∂∇√∛∜≈≠≤≥∓±∞∝∠∡∢⌢πσωσΩΔθλμ]/;
				const foundViolations: Array<{
					char: string;
					text: string;
					tag: string;
					outerHtml: string;
				}> = [];

				const walker = document.createTreeWalker(
					document.body,
					NodeFilter.SHOW_TEXT,
					{
						acceptNode: (node: Node) => {
							const parent = node.parentElement;
							if (!parent) return NodeFilter.FILTER_REJECT;

							// Ignore KaTeX rendering containers, math tags, svgs, canvases, script/style tags, and native option elements
							if (
								parent.closest(
									".katex, .katex-html, math, annotation, svg, canvas, script, style, option",
								)
							) {
								return NodeFilter.FILTER_REJECT;
							}
							return NodeFilter.FILTER_ACCEPT;
						},
					},
				);

				let currentNode = walker.nextNode();
				while (currentNode) {
					const text = currentNode.textContent || "";
					const match = text.match(forbiddenRegex);
					if (match) {
						foundViolations.push({
							char: match[0],
							text: text.trim().slice(0, 80),
							tag:
								currentNode.parentElement?.tagName || "UNKNOWN",
							outerHtml:
								currentNode.parentElement?.outerHTML.slice(
									0,
									150,
								) || "",
						});
					}
					currentNode = walker.nextNode();
				}

				return foundViolations;
			});

			expect(
				violations,
				`Route ${route} contains forbidden raw Unicode math characters in UI text outside KaTeX:\n${JSON.stringify(violations, null, 2)}`,
			).toEqual([]);
		}
	});
});
