/**
 * @file Unit DOM tests for Navigation.svelte component mounting and interaction.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Navigation from "$lib/components/ui/Navigation.svelte";

describe("Navigation.svelte Component", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		document.documentElement.removeAttribute("data-theme");
	});

	/** Storage privacy restrictions must not prevent navigation from mounting. */
	it("mounts and switches themes when local storage cannot be read", async () => {
		document.documentElement.removeAttribute("data-theme");
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(
			/** Reject reads as a browser with blocked storage would. */
			() => {
				throw new DOMException("Storage blocked", "SecurityError");
			},
		);
		const view = render(Navigation);
		expect(document.documentElement.getAttribute("data-theme")).toBe(
			"dark",
		);
		await fireEvent.click(
			view.getByRole("button", { name: /toggle theme/i }),
		);
		expect(document.documentElement.getAttribute("data-theme")).toBe(
			"light",
		);
	});

	/** A failed persistence write must not interrupt theme-color or canvas updates. */
	it("finishes theme updates when local storage cannot be written", async () => {
		document.documentElement.setAttribute("data-theme", "dark");
		const meta = document.createElement("meta");
		meta.name = "theme-color";
		meta.content = "#0f172a";
		document.head.append(meta);
		const changed = vi.fn();
		window.addEventListener("themechange", changed);
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(
			/** Reject persistence without preventing in-memory theme changes. */
			() => {
				throw new DOMException("Storage full", "QuotaExceededError");
			},
		);
		try {
			const view = render(Navigation);
			await fireEvent.click(
				view.getByRole("button", { name: /toggle theme/i }),
			);
			expect(document.documentElement.getAttribute("data-theme")).toBe(
				"light",
			);
			expect(meta.content).toBe("#f8fafc");
			expect(changed).toHaveBeenCalledOnce();
		} finally {
			window.removeEventListener("themechange", changed);
			meta.remove();
		}
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
