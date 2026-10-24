/**
 * @file Unit DOM tests for modular FormulaDrawer domain reference components.
 */

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import ConvolutionFormulaReference from "$lib/components/ui/formula-drawer/ConvolutionFormulaReference.svelte";
import FourierFormulaReference from "$lib/components/ui/formula-drawer/FourierFormulaReference.svelte";
import OdeFormulaReference from "$lib/components/ui/formula-drawer/OdeFormulaReference.svelte";
import TransformsFormulaReference from "$lib/components/ui/formula-drawer/TransformsFormulaReference.svelte";

describe("FormulaDrawer Modular Reference Panels", () => {
	afterEach(() => {
		cleanup();
	});

	describe("OdeFormulaReference", () => {
		it("renders characteristic roots, particular solution table, and response decomposition", () => {
			const { container } = render(OdeFormulaReference);
			expect(container.querySelectorAll(".ref-section").length).toBe(3);
			expect(container.querySelectorAll(".ref-table").length).toBe(1);
			expect(container.querySelector(".callout-warning")).toBeTruthy();
		});
	});

	describe("FourierFormulaReference", () => {
		it("renders representations, symmetry shortcuts, and Dirichlet conditions", () => {
			const { container } = render(FourierFormulaReference);
			expect(container.querySelectorAll(".ref-section").length).toBe(5);
			expect(
				container.querySelectorAll(".ref-list").length,
			).toBeGreaterThan(0);
		});
	});

	describe("ConvolutionFormulaReference", () => {
		it("renders definition, timing equations, and pulse definitions", () => {
			const { container } = render(ConvolutionFormulaReference);
			expect(container.querySelectorAll(".ref-section").length).toBe(4);
			expect(
				container.querySelectorAll(".ref-text").length,
			).toBeGreaterThan(0);
		});
	});

	describe("TransformsFormulaReference", () => {
		/** Course route ordering keeps definitions discoverable and equations separately labeled. */
		it("puts CTFT first on its route and supplies normalized sinc", () => {
			const view = render(TransformsFormulaReference, {
				activeRoute: "/fourier-transform",
			});
			expect(view.container.querySelector("h3")?.textContent).toContain(
				"Continuous-Time Fourier Transform",
			);
			expect(
				view.getByRole("heading", { name: "Forward transformation" }),
			).toBeTruthy();
			expect(
				view.getByRole("heading", { name: "Inverse transformation" }),
			).toBeTruthy();
			expect(
				view.getByRole("heading", { name: "Normalized sinc" }),
			).toBeTruthy();
			expect(
				view.container.querySelectorAll(
					".ref-section:first-child .math-block",
				),
			).toHaveLength(3);
			expect(view.container.querySelector(".katex-error")).toBeNull();
		});
		it("renders Laplace transform pairs and CTFT properties tables", () => {
			const { container } = render(TransformsFormulaReference);
			expect(container.querySelector("h3")?.textContent).toBe(
				"Common Laplace Transform Pairs",
			);
			expect(container.querySelectorAll(".ref-section").length).toBe(2);
			expect(container.querySelectorAll(".ref-table").length).toBe(1);
		});
	});
});
