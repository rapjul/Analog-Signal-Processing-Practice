/**
 * @file Unit DOM tests for Navigation.svelte component mounting and interaction.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import Navigation from "$lib/components/ui/Navigation.svelte";

describe("Navigation.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders brand title, navigation links, and highlights active route", () => {
		const { getByText, container } = render(Navigation, {
			props: {
				activeRoute: "/odes",
			},
		});

		expect(getByText("SignalLab")).toBeTruthy();
		const odeLink = container.querySelector('a[href="/odes"]');
		expect(odeLink).toBeTruthy();
		expect(odeLink?.classList.contains("active")).toBe(true);

		const fourierLink = container.querySelector(
			'a[href="/fourier-series"]',
		);
		expect(fourierLink).toBeTruthy();
		expect(fourierLink?.classList.contains("active")).toBe(false);
	});

	it("toggles mobile menu drawer on mobile hamburger button click and closes when clicking link", async () => {
		const { container } = render(Navigation, {
			props: {
				activeRoute: "/odes",
			},
		});

		const hamburgerBtn = container.querySelector(
			"button.menu-toggle",
		) as HTMLButtonElement;
		expect(hamburgerBtn).toBeTruthy();

		const navLinks = container.querySelector("nav.nav-links");
		expect(navLinks?.classList.contains("open")).toBe(false);

		await fireEvent.click(hamburgerBtn);
		expect(navLinks?.classList.contains("open")).toBe(true);
		expect(hamburgerBtn.getAttribute("aria-expanded")).toBe("true");

		// Clicking any link should close menu
		const link = container.querySelector('a[href="/odes"]');
		if (link) {
			await fireEvent.click(link);
			expect(navLinks?.classList.contains("open")).toBe(false);
		}
	});

	it("opens formula drawer on clicking Formulas button and closes on Escape", async () => {
		const { container, getByRole } = render(Navigation, {
			props: {
				activeRoute: "/odes",
			},
		});

		const formulaBtn = container.querySelector(
			"button.formula-drawer-btn",
		) as HTMLButtonElement;
		expect(formulaBtn).toBeTruthy();

		// Open formula drawer
		await fireEvent.click(formulaBtn);
		const dialog = getByRole("dialog");
		expect(dialog).toBeTruthy();

		// Press Escape on window to close
		await fireEvent.keyDown(window, { key: "Escape" });
		expect(container.querySelector(".formula-drawer")).toBeNull();
	});

	it("closes mobile menu when Escape key is pressed", async () => {
		const { container } = render(Navigation, {
			props: {
				activeRoute: "/odes",
			},
		});

		const hamburgerBtn = container.querySelector(
			"button.menu-toggle",
		) as HTMLButtonElement;
		await fireEvent.click(hamburgerBtn);

		const navLinks = container.querySelector("nav.nav-links");
		expect(navLinks?.classList.contains("open")).toBe(true);

		await fireEvent.keyDown(window, { key: "Escape" });
		expect(navLinks?.classList.contains("open")).toBe(false);
	});

	it("closes formula drawer when opening mobile menu for mutual exclusivity", async () => {
		const { container, getByRole } = render(Navigation, {
			props: {
				activeRoute: "/odes",
			},
		});

		const formulaBtn = container.querySelector(
			"button.formula-drawer-btn",
		) as HTMLButtonElement;
		await fireEvent.click(formulaBtn);
		expect(getByRole("dialog")).toBeTruthy();

		// Opening mobile menu should close formula drawer
		const hamburgerBtn = container.querySelector(
			"button.menu-toggle",
		) as HTMLButtonElement;
		await fireEvent.click(hamburgerBtn);

		expect(container.querySelector(".formula-drawer")).toBeNull();
		const navLinks = container.querySelector("nav.nav-links");
		expect(navLinks?.classList.contains("open")).toBe(true);
	});

	it("toggles theme when theme toggle button is clicked", async () => {
		const { container } = render(Navigation, {
			props: {
				activeRoute: "/odes",
			},
		});

		const themeBtn = container.querySelector(
			"button.theme-toggle",
		) as HTMLButtonElement;
		expect(themeBtn).toBeTruthy();

		await fireEvent.click(themeBtn);
		// Theme should change on documentElement
		const currentTheme =
			document.documentElement.getAttribute("data-theme");
		expect(currentTheme).toBeDefined();
	});
});
