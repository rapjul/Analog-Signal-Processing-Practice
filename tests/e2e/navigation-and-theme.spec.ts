import { expect, test } from "@playwright/test";

/**
 * End-to-End Test Suite: Navigation, Theme Switching, and Layout Responsiveness.
 *
 * Verifies core layout components including the header navigation bar,
 * slide-over formula reference drawer, module landing cards, mobile hamburger drawer, and theme toggling persistence.
 */

test.describe("Navigation and Layout Shell", () => {
	/**
	 * Verifies the dashboard homepage renders the hero section and all module launcher cards.
	 */
	test("renders homepage hero section and 6 module launcher cards", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		// Check page title
		await expect(page).toHaveTitle(/SignalLab/i);

		// Check hero section elements
		const heroHeading = page.locator("h1.hero-title");
		await expect(heroHeading).toBeVisible();
		await expect(heroHeading).toHaveText(
			/Master Analog Signal Processing Math/i,
		);

		// Check 6 module practice cards exist
		const moduleCards = page.locator(".module-card");
		await expect(moduleCards).toHaveCount(6);

		// Verify key module titles
		await expect(
			page.locator("text=LCC Ordinary Differential Equations"),
		).toBeVisible();
		await expect(
			page.locator("text=Continuous-Time Convolution"),
		).toBeVisible();
		await expect(
			page.locator("text=Fourier Series Analysis"),
		).toBeVisible();
		await expect(
			page.locator("text=Continuous-Time Fourier Transform (CTFT)"),
		).toBeVisible();
		await expect(
			page.locator("text=Laplace Transform & S-Domain Analysis"),
		).toBeVisible();
		await expect(
			page.locator("text=Circuit Analysis & Transfer Functions H(s)"),
		).toBeVisible();
	});

	/**
	 * Verifies navbar route navigation across all 6 practice modules and highlights active link.
	 */
	test("navigates seamlessly across all module routes via navbar links", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const routes = [
			{ path: "/odes", label: "LCC ODEs", expectedTitle: /ODE/i },
			{
				path: "/fourier-series",
				label: "Fourier Series",
				expectedTitle: /Fourier Series/i,
			},
			{
				path: "/fourier-transform",
				label: "CTFT",
				expectedTitle: /CTFT|Fourier/i,
			},
			{
				path: "/convolution",
				label: "Convolution",
				expectedTitle: /Convolution/i,
			},
			{ path: "/laplace", label: "Laplace", expectedTitle: /Laplace/i },
			{ path: "/circuits", label: "Circuits", expectedTitle: /Circuit/i },
		];

		for (const route of routes) {
			const navLink = page.locator(`.nav-links a[href="${route.path}"]`);
			if (await navLink.isVisible()) {
				await navLink.click();
				await page.waitForLoadState("networkidle");
				await expect(page).toHaveURL(new RegExp(route.path));
				await expect(page).toHaveTitle(route.expectedTitle);

				// Verify active class is applied
				await expect(navLink).toHaveClass(/active/);
			}
		}

		// Navigate back home by clicking brand icon
		const brandLink = page.locator(".brand-link");
		await brandLink.click();
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveURL(/\/$/);
	});

	/**
	 * Verifies global slide-over formula reference drawer opening, tab switching, and closing.
	 */
	test("opens global formula drawer, switches formula tabs, and closes via backdrop or Esc key", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const formulaBtn = page.locator(".formula-drawer-btn");
		await expect(formulaBtn).toBeVisible();

		// Open drawer
		await formulaBtn.click();
		const drawer = page.locator(".formula-drawer");
		await expect(drawer).toBeVisible();
		await expect(drawer.locator("h2")).toHaveText(
			/Formula Reference Sheet/i,
		);

		// Switch tabs
		const fourierTab = page.locator(
			'.drawer-tabs button:has-text("Fourier Series")',
		);
		await fourierTab.click();
		await expect(
			drawer.locator("text=Fourier Series Representations"),
		).toBeVisible();

		const transformTab = page.locator(
			'.drawer-tabs button:has-text("Transforms & Circuits")',
		);
		await transformTab.click();
		await expect(
			drawer.locator("text=Common Laplace Transform Pairs"),
		).toBeVisible();

		// Close via close button
		const closeBtn = page.locator(".close-btn");
		await closeBtn.click();
		await expect(drawer).not.toBeVisible();

		// Reopen and close via Esc key
		await formulaBtn.click();
		await expect(drawer).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(drawer).not.toBeVisible();
	});

	/**
	 * Verifies theme toggle functionality switching between dark and light modes.
	 */
	test("toggles dark and light themes and persists selection in localStorage", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const themeButton = page.locator(".theme-toggle");
		await expect(themeButton).toBeVisible();

		// Initial theme is dark
		const rootHtml = page.locator("html");
		await expect(rootHtml).toHaveAttribute("data-theme", "dark");

		// Click to toggle to light mode
		await themeButton.click();
		await expect(rootHtml).toHaveAttribute("data-theme", "light");

		// Verify localStorage saved 'light'
		const savedThemeLight = await page.evaluate(() =>
			localStorage.getItem("theme"),
		);
		expect(savedThemeLight).toBe("light");

		// Reload and verify persistence
		await page.reload();
		await page.waitForLoadState("networkidle");
		await expect(rootHtml).toHaveAttribute("data-theme", "light");

		// Toggle back to dark mode
		await themeButton.click();
		await expect(rootHtml).toHaveAttribute("data-theme", "dark");
		const savedThemeDark = await page.evaluate(() =>
			localStorage.getItem("theme"),
		);
		expect(savedThemeDark).toBe("dark");
	});

	/**
	 * Verifies mobile navigation drawer functionality on narrow screens.
	 */
	test("toggles mobile navigation drawer on mobile viewports", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const menuToggle = page.locator(".menu-toggle");
		await expect(menuToggle).toBeVisible();

		const navLinks = page.locator(".nav-links");
		await expect(navLinks).not.toHaveClass(/open/);

		// Click to open menu
		await menuToggle.click();
		await expect(navLinks).toHaveClass(/open/);

		// Click a link inside drawer
		const odeLink = page.locator('.nav-links a[href="/odes"]');
		await odeLink.click();
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveURL(/\/odes$/);
	});

	/**
	 * Verifies mutual exclusivity and coordinated Escape key dismissal between mobile menu and formula drawer.
	 */
	test("coordinates mutual exclusivity and LIFO Escape key dismissal on mobile viewports", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const menuToggle = page.locator(".menu-toggle");
		const formulaBtn = page.locator(".formula-drawer-btn");
		const navLinks = page.locator(".nav-links");
		const drawer = page.locator(".formula-drawer");

		// 1. Open mobile menu
		await menuToggle.click();
		await expect(navLinks).toHaveClass(/open/);

		// 2. Open formula drawer -> should close mobile menu (mutual exclusivity)
		await formulaBtn.click();
		await expect(drawer).toBeVisible();
		await expect(navLinks).not.toHaveClass(/open/);

		// 3. Press Escape -> should dismiss formula drawer
		await page.keyboard.press("Escape");
		await expect(drawer).not.toBeVisible();

		// 4. Open mobile menu -> press Escape -> should dismiss mobile menu
		await menuToggle.click();
		await expect(navLinks).toHaveClass(/open/);
		await page.keyboard.press("Escape");
		await expect(navLinks).not.toHaveClass(/open/);

		// 5. Open formula drawer -> click close button -> should close formula drawer
		await formulaBtn.click();
		await expect(drawer).toBeVisible();
		const closeBtn = page.locator(".formula-drawer .close-btn");
		await closeBtn.click();
		await expect(drawer).not.toBeVisible();
	});
});
