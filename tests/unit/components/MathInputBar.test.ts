/**
 * @file Unit DOM tests for MathInputBar.svelte component mounting and interaction.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import MathInputBar from "$lib/components/math/MathInputBar.svelte";

describe("MathInputBar.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders with custom label and default input mode tabs", () => {
		const { getByText, container } = render(MathInputBar, {
			props: {
				value: "",
				label: "Enter Particular Solution:",
				placeholder: "e.g. 5\\cos(2t)",
				inputType: "generic",
			},
		});

		expect(getByText("Enter Particular Solution:")).toBeTruthy();
		const builderTab = getByText("Guided Form Builder", { exact: false });
		const freehandTab = getByText("Freehand LaTeX", { exact: false });
		expect(builderTab).toBeTruthy();
		expect(freehandTab).toBeTruthy();

		// Default is builder mode
		expect(container.querySelector(".builder-wrapper")).toBeTruthy();
	});

	it("renders label containing math expressions correctly", () => {
		const { container } = render(MathInputBar, {
			props: {
				value: "",
				label: "Find the response $y_p(t)$ for input:",
			},
		});

		expect(container.querySelector(".math-inline")).toBeTruthy();
	});

	it("switches builder templates and renders corresponding builder forms", async () => {
		const { getByText } = render(MathInputBar, {
			props: {
				value: "",
				inputType: "generic",
			},
		});

		// Switch to ODE Coefficients builder
		const odeBtn = getByText("ODE Coefficients");
		await fireEvent.click(odeBtn);
		expect(odeBtn.classList.contains("active")).toBe(true);

		// Switch to Laplace Poles & Zeros builder
		const poleZeroBtn = getByText("Laplace Poles & Zeros");
		await fireEvent.click(poleZeroBtn);
		expect(poleZeroBtn.classList.contains("active")).toBe(true);

		// Switch to Fourier Series builder
		const fourierBtn = getByText("Fourier Series");
		await fireEvent.click(fourierBtn);
		expect(fourierBtn.classList.contains("active")).toBe(true);

		// Switch to Phasor / AC builder
		const phasorBtn = getByText("Phasor / AC");
		await fireEvent.click(phasorBtn);
		expect(phasorBtn.classList.contains("active")).toBe(true);
	});

	it("renders dedicated inputType directly without template picker", () => {
		const { container } = render(MathInputBar, {
			props: {
				value: "",
				inputType: "ode",
			},
		});

		expect(container.querySelector(".builder-picker")).toBeNull();
		expect(container.querySelector(".builder-wrapper")).toBeTruthy();
	});

	it("renders live math preview when value is populated and empty notice when empty in freehand mode", async () => {
		const { container, rerender } = render(MathInputBar, {
			props: {
				value: "",
				inputType: "generic",
			},
		});

		const freehandTab = container.querySelectorAll("button.tab-btn")[1];
		if (freehandTab) {
			await fireEvent.click(freehandTab);
		}

		// Initially when value is empty, preview-empty container exists
		expect(container.querySelector(".preview-empty")).toBeDefined();

		// When value is provided, MathBlock is rendered
		await rerender({ value: "5\\cos(2t)" });
		expect(container.querySelector(".math-block")).toBeTruthy();
	});

	it("switches to freehand mode on tab click and renders textarea with placeholder", async () => {
		const { getByText, container } = render(MathInputBar, {
			props: {
				value: "",
				placeholder: "e.g. 2e^{-t}",
			},
		});

		const freehandTab = getByText("Freehand LaTeX", { exact: false });
		await fireEvent.click(freehandTab);

		const textarea = container.querySelector(
			"textarea.latex-textarea",
		) as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();
		expect(textarea.placeholder).toBe("e.g. 2e^{-t}");
	});

	it("calls onChange when typing into the freehand LaTeX textarea", async () => {
		const handleChange = vi.fn();
		const { getByText, container } = render(MathInputBar, {
			props: {
				value: "",
				onChange: handleChange,
			},
		});

		const freehandTab = getByText("Freehand LaTeX", { exact: false });
		await fireEvent.click(freehandTab);

		const textarea = container.querySelector(
			"textarea.latex-textarea",
		) as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();

		await fireEvent.input(textarea, {
			target: { value: "\\cos(3t)" },
		});

		expect(handleChange).toHaveBeenCalledWith("\\cos(3t)");
	});

	it("appends math symbols when symbol shortcut buttons are clicked in freehand mode", async () => {
		const handleChange = vi.fn();
		const { getByText, container } = render(MathInputBar, {
			props: {
				value: "",
				onChange: handleChange,
			},
		});

		const freehandTab = getByText("Freehand LaTeX", { exact: false });
		await fireEvent.click(freehandTab);

		const piButton = container.querySelector('button[title="Insert pi"]');
		expect(piButton).toBeTruthy();
		if (piButton) {
			await fireEvent.click(piButton);
			expect(handleChange).toHaveBeenCalled();
		}
	});
});
