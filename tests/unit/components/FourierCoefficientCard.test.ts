/**
 * @file Unit DOM tests for FourierCoefficientCard.svelte component modes, harmonic multipliers, and bindings.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FourierCoefficientCard from "$lib/components/math/FourierCoefficientCard.svelte";

describe("FourierCoefficientCard.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders title, mode buttons, and live preview", () => {
		const onUpdate = vi.fn();
		const { getByText, container } = render(FourierCoefficientCard, {
			props: {
				title: "Cosine Coefficient $a_n$",
				symbol: "a_n",
				idPrefix: "an",
				mode: "fraction",
				num: "2",
				den: "n pi",
				harmonic: "odd",
				coeffLatex: "\\frac{2}{n \\pi} (1 - (-1)^n)",
				onUpdate,
			},
		});

		expect(getByText("Zero (0)")).toBeTruthy();
		expect(getByText("🧱 Fraction Builder")).toBeTruthy();
		expect(getByText("✍️ Freehand")).toBeTruthy();
		expect(container.querySelectorAll(".fraction-input").length).toBe(2);
		expect(container.querySelector("select")).toBeTruthy();
	});

	it("switches to direct mode and triggers onUpdate on input", async () => {
		const onUpdate = vi.fn();
		let mode = "fraction";
		let direct = "0";

		const { container, getByText } = render(FourierCoefficientCard, {
			props: {
				title: "Cosine Coefficient $a_n$",
				symbol: "a_n",
				idPrefix: "an",
				mode: "fraction",
				direct,
				coeffLatex: "0",
				onUpdate,
			},
		});

		const freehandBtn = getByText("✍️ Freehand");
		await fireEvent.click(freehandBtn);
		expect(onUpdate).toHaveBeenCalled();

		const directInput = container.querySelector(
			"#an-direct-input",
		) as HTMLInputElement;
		expect(directInput).toBeTruthy();

		await fireEvent.input(directInput, {
			target: { value: "\\frac{4}{n}" },
		});
		expect(onUpdate).toHaveBeenCalled();
	});

	it("displays custom harmonic multiplier input when custom is selected", async () => {
		const onUpdate = vi.fn();
		const { container } = render(FourierCoefficientCard, {
			props: {
				title: "Sine Coefficient $b_n$",
				symbol: "b_n",
				idPrefix: "bn",
				mode: "fraction",
				harmonic: "custom",
				customHarmonic: "\\sin(n \\pi / 2)",
				coeffLatex: "\\sin(n \\pi / 2)",
				onUpdate,
			},
		});

		const customInput = container.querySelector(
			".custom-mult-input",
		) as HTMLInputElement;
		expect(customInput).toBeTruthy();
		expect(customInput.value).toBe("\\sin(n \\pi / 2)");

		await fireEvent.input(customInput, {
			target: { value: "\\cos(n \\pi / 2)" },
		});
		expect(onUpdate).toHaveBeenCalled();
	});

	it("hides inputs in zero mode", async () => {
		const onUpdate = vi.fn();
		const { container, getByText } = render(FourierCoefficientCard, {
			props: {
				title: "Exponential Coefficient $F_n$",
				symbol: "F_n",
				idPrefix: "Fn",
				mode: "zero",
				coeffLatex: "0",
				onUpdate,
			},
		});

		expect(container.querySelector(".fraction-builder-grid")).toBeNull();
		expect(container.querySelector("#Fn-direct-input")).toBeNull();
	});
});
