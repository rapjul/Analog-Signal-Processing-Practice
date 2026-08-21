/**
 * @file Unit DOM tests for FormulaDrawer.svelte component mounting and interaction.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FormulaDrawer from "$lib/components/ui/FormulaDrawer.svelte";

describe("FormulaDrawer.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("does not render backdrop or dialog when isOpen is false", () => {
		const { container } = render(FormulaDrawer, {
			props: {
				isOpen: false,
				onClose: vi.fn(),
			},
		});

		expect(container.querySelector(".drawer-backdrop")).toBeNull();
		expect(container.querySelector(".formula-drawer")).toBeNull();
	});

	it("renders dialog with tab buttons and close button when isOpen is true", () => {
		const { container, getByText, getByRole } = render(FormulaDrawer, {
			props: {
				isOpen: true,
				onClose: vi.fn(),
			},
		});

		const dialog = getByRole("dialog");
		expect(dialog).toBeTruthy();
		expect(dialog.getAttribute("aria-modal")).toBe("true");

		expect(getByText("LCC ODEs")).toBeTruthy();
		expect(getByText("Fourier Series")).toBeTruthy();
		expect(getByText("Transforms & Circuits")).toBeTruthy();
		expect(container.querySelector("button.close-btn")).toBeTruthy();
	});

	it("calls onClose when close button is clicked", async () => {
		const handleClose = vi.fn();
		const { container } = render(FormulaDrawer, {
			props: {
				isOpen: true,
				onClose: handleClose,
			},
		});

		const closeBtn = container.querySelector(
			"button.close-btn",
		) as HTMLButtonElement;
		expect(closeBtn).toBeTruthy();

		await fireEvent.click(closeBtn);
		expect(handleClose).toHaveBeenCalledOnce();
	});

	it("calls onClose when backdrop is clicked", async () => {
		const handleClose = vi.fn();
		const { container } = render(FormulaDrawer, {
			props: {
				isOpen: true,
				onClose: handleClose,
			},
		});

		const backdrop = container.querySelector(
			".drawer-backdrop",
		) as HTMLDivElement;
		expect(backdrop).toBeTruthy();

		await fireEvent.click(backdrop);
		expect(handleClose).toHaveBeenCalledOnce();
	});

	it("switches active tab when tab buttons are clicked", async () => {
		const { getByText, container } = render(FormulaDrawer, {
			props: {
				isOpen: true,
				onClose: vi.fn(),
			},
		});

		const fourierTab = getByText("Fourier Series");
		await fireEvent.click(fourierTab);
		expect(fourierTab.classList.contains("active")).toBe(true);

		const transformsTab = getByText("Transforms & Circuits");
		await fireEvent.click(transformsTab);
		expect(transformsTab.classList.contains("active")).toBe(true);
		expect(container.querySelector(".drawer-content")).toBeTruthy();
	});

	it("shows canonical Fourier notation and convergence guidance", async () => {
		const { getByText, container } = render(FormulaDrawer, {
			props: {
				isOpen: true,
				onClose: vi.fn(),
			},
		});

		await fireEvent.click(getByText("Fourier Series"));

		expect(getByText("Dirichlet Conditions & Convergence")).toBeTruthy();
		expect(getByText("Weak Dirichlet Condition:")).toBeTruthy();
		expect(getByText("Strong Dirichlet Conditions:")).toBeTruthy();
		expect(getByText("Discontinuity Midpoint Convergence:")).toBeTruthy();
		expect(
			container.querySelector(".drawer-content")?.textContent,
		).toContain("finitely many discontinuities");

		const fourierContent =
			container.querySelector(".drawer-content")?.innerHTML;
		expect(fourierContent).toContain("F_n");
		expect(fourierContent).not.toContain("c_n");
	});

	it("triggers onClose when Escape key is pressed on window", async () => {
		const handleClose = vi.fn();
		render(FormulaDrawer, {
			props: {
				isOpen: true,
				onClose: handleClose,
			},
		});

		await fireEvent.keyDown(window, { key: "Escape" });
		expect(handleClose).toHaveBeenCalledOnce();
	});
});
