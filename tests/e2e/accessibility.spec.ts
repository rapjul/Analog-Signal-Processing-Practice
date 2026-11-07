import AxeBuilder from "@axe-core/playwright";
import { generateOdeProblem } from "$lib/math-engine/odes/generator";
import { parseOdeFilters } from "$lib/problems/ode-filters";

/** Reduced motion must not prevent copy feedback from resetting and announcing again. */
test("copy feedback resets without CSS transition events", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				/** Resolves a test copy without accessing the system clipboard. */ writeText:
					async (): Promise<void> => {},
			},
		});
	});
	await page.goto("/fourier-transform");
	await page.waitForLoadState("networkidle");
	const copy = page.getByRole("button", {
		name: "Copy input notation: pi",
		exact: true,
	});
	const status = copy.locator(
		"xpath=following-sibling::span[@role='status'][1]",
	);
	await copy.click();
	await expect(status).toHaveText("Copied input notation");
	await expect(status).toBeEmpty();
	await copy.click();
	await expect(status).toHaveText("Copied input notation");
});

/** A keyboard submission advances focus only after a verified answer. */
test("ODE keyboard progression and invalid-answer semantics", async ({
	page,
}) => {
	const query = new URLSearchParams({
		order: "2",
		forcing: "constant",
		rootType: "distinct_real",
		seed: "73",
	});
	const problem = generateOdeProblem(parseOdeFilters(query));
	await page.goto(`/odes?${query}`);
	await page.waitForLoadState("networkidle");
	const check = page.getByRole("button", {
		name: /Check Characteristic Equation/,
	});
	await check.focus();
	await page.keyboard.press("Enter");
	await expect(check).toBeFocused();
	for (const field of ["a2", "a1", "a0"]) {
		const input = page.locator(`#ode-${field}-input`);
		await expect(input).toHaveAttribute("aria-invalid", "true");
		const description = await input.getAttribute("aria-describedby");
		expect(description).toBeTruthy();
		await expect(page.locator(`[id="${description}"]`)).toHaveAttribute(
			"role",
			"alert",
		);
	}
	expect(
		(
			await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
				.analyze()
		).violations,
	).toEqual([]);
	await page.locator("#ode-a2-input").fill(String(problem.params.a2));
	await check.focus();
	await page.keyboard.press("Enter");
	await expect(page.locator("#ode-a2-input")).not.toHaveAttribute(
		"aria-invalid",
		"true",
	);
	await expect(page.locator("#ode-a1-input")).toHaveAttribute(
		"aria-invalid",
		"true",
	);
	await page.locator("#ode-a1-input").fill(String(problem.params.a1));
	await page.locator("#ode-a0-input").fill(String(problem.params.a0));
	await check.focus();
	await page.keyboard.press("Enter");
	await expect(
		page.locator(".step-card.active [data-progress-heading]").first(),
	).toBeFocused();
	expect(
		(
			await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
				.analyze()
		).violations,
	).toEqual([]);
});

/** Narrow layouts and reduced motion remain usable on every module. */
test("320px reflow and mobile navigation", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 720 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	for (const route of [
		"/",
		"/odes",
		"/convolution",
		"/fourier-series",
		"/fourier-transform",
		"/laplace",
		"/circuits",
	]) {
		await page.goto(route);
		await page.waitForLoadState("networkidle");
		await expect
			.poll(() =>
				page.locator(".katex-display").evaluateAll(
					(elements) =>
						elements.filter((element) => {
							const shouldFocus =
								element.clientWidth > 0 &&
								element.scrollWidth > element.clientWidth + 1;
							return (
								(element.getAttribute("tabindex") === "0") !==
								shouldFocus
							);
						}).length,
				),
			)
			.toBe(0);
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);
	}
	const toggle = page.locator(".menu-toggle");
	await toggle.focus();
	await page.keyboard.press("Enter");
	await expect(page.locator("#module-navigation a").first()).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(toggle).toBeFocused();
});

import { expect, test } from "@playwright/test";

/** Dialog keyboard navigation stays inside the modal and returns to its opener. */
test("reference drawer keyboard cycle and restoration", async ({ page }) => {
	await page.goto("/odes");
	await page.waitForLoadState("networkidle");
	const opener = page.getByRole("button", {
		name: "Open Formulas Reference Sheet",
	});
	await opener.focus();
	await page.keyboard.press("Enter");
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole("tab", { selected: true })).toBeFocused();
	const scan = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
		.analyze();
	expect(scan.violations).toEqual([]);
	await dialog
		.getByRole("button", { name: "Close formula reference drawer" })
		.focus();
	await page.keyboard.press("Shift+Tab");
	await expect(
		dialog.getByRole("button", { name: "Copy LaTeX string to clipboard" }),
	).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(
		dialog.getByRole("button", { name: "Close formula reference drawer" }),
	).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(opener).toBeFocused();
});

for (const theme of ["dark", "light"]) {
	/** Scan rendered pages and the reference dialog in each supported theme. */
	test(`rendered accessibility in ${theme} theme`, async ({ page }) => {
		// Seven full-page scans need a larger budget on mobile WebKit and CI.
		test.setTimeout(90_000);
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.addInitScript(
			(value) => localStorage.setItem("theme", value),
			theme,
		);
		for (const route of [
			"/",
			"/odes",
			"/convolution",
			"/fourier-series",
			"/fourier-transform",
			"/laplace",
			"/circuits",
		]) {
			await page.goto(route);
			await page.evaluate(
				(value) => (document.documentElement.dataset.theme = value),
				theme,
			);
			await expect(page.locator("h1")).toBeVisible({ timeout: 20000 });
			const results = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
				.analyze();
			expect(results.violations, `${theme} ${route}`).toEqual([]);
		}
	});
}

/** Keyboard bypass must move real focus past the repeated navigation. */
test("skip link transfers keyboard focus to main content", async ({
	page,
	browserName,
}) => {
	await page.goto("/");
	await page.waitForLoadState("networkidle");
	// Safari uses Option+Tab to include links in sequential keyboard navigation.
	await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
	await expect(
		page.getByRole("link", { name: "Skip to main content" }),
	).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(page.locator("#main-content")).toBeFocused();
});

/**
 * End-to-End Test Suite: Accessibility (a11y), Keyboard Navigation, Focus Styling, and Error Handling.
 *
 * Verifies semantic HTML landmarks, keyboard Tab sequences, visible :focus-visible outlines,
 * ARIA roles and labels, and 404 error page accessibility.
 */

test.describe("Accessibility, Focus Styling & Error Handling", () => {
	/**
	 * Verifies document structure adheres to semantic HTML hierarchy.
	 */
	test("maintains proper semantic structure with single h1 per page and landmarks", async ({
		page,
	}) => {
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

			// Semantic header and main landmarks
			await expect(page.locator("header.navbar")).toBeVisible();
			await expect(page.locator("main")).toBeVisible();

			// Exactly one h1 per page
			const h1Elements = page.locator("h1");
			await expect(h1Elements).toHaveCount(1);
		}
	});

	/**
	 * Verifies keyboard Tab navigation sequence and focus indicators.
	 */
	test("supports keyboard Tab navigation through navbar links with focus indicators", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		// Press Tab multiple times to navigate through header
		await page.keyboard.press("Tab");
		const activeElementTag = await page.evaluate(
			() => document.activeElement?.tagName,
		);
		expect(["A", "BUTTON", "INPUT"]).toContain(activeElementTag);

		// Verify focused element has an outline or border style
		const hasFocusRing = await page.evaluate(() => {
			const el = document.activeElement;
			if (!el) return false;
			const style = window.getComputedStyle(el);
			return style.outlineStyle !== "none" || style.boxShadow !== "none";
		});
		expect(hasFocusRing).toBe(true);
	});

	/**
	 * Verifies custom 404 error page renders with accessible explanation and return link.
	 */
	test("renders custom 404 error page for non-existent routes with return navigation", async ({
		page,
	}) => {
		await page.goto("/non-existent-route-path");
		await page.waitForLoadState("networkidle");

		// Check custom error page title or content
		const errorHeading = page.locator("h1, h2, .error-title, .status-code");
		await expect(errorHeading.first()).toBeVisible();

		// Check navigation back home is available
		const homeLink = page.locator('a[href="/"]');
		await expect(homeLink.first()).toBeVisible();
	});
});
