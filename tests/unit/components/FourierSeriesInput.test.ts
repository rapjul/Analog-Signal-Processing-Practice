/**
 * FourierSeriesInput Svelte Component Unit Tests.
 *
 * Validates LaTeX synthesis, trigonometric vs exponential modes,
 * coefficient input modes (zero, fraction, direct), and harmonic multipliers.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FourierSeriesInput from "$lib/components/math/FourierSeriesInput.svelte";

describe("FourierSeriesInput", () => {
	afterEach(() => cleanup());

	/**
	 * Verifies default rendering in trigonometric mode and basic onChange callback.
	 */
	it("renders default trigonometric builder and fires onChange", async () => {
		const onChange = vi.fn();
		const view = render(FourierSeriesInput, { onChange });

		const modeButtons = view.container.querySelectorAll(".mode-btn");
		expect(modeButtons).toHaveLength(2);
		expect(modeButtons[0].textContent).toContain("Trigonometric Series");
		expect(modeButtons[1].textContent).toContain(
			"Complex Exponential Series",
		);
		expect(onChange).toHaveBeenCalled();
		const initialLatex = onChange.mock.calls[0][0];
		expect(initialLatex).toContain("\\sin(");
	});

	/**
	 * Tests switching between trigonometric and exponential representation modes.
	 */
	it("switches between trigonometric and exponential mode tabs", async () => {
		const onChange = vi.fn();
		const view = render(FourierSeriesInput, { onChange });

		const modeButtons = view.container.querySelectorAll(".mode-btn");
		await fireEvent.click(modeButtons[1]); // Exponential mode

		const f0Input = view.container.querySelector("#F0-input");
		expect(f0Input).toBeTruthy();
		expect(
			view.container.querySelector(".coeff-label")?.textContent,
		).toContain("Complex Exponential Coefficient");
		expect(onChange).toHaveBeenLastCalledWith(
			expect.stringContaining("e^{j n"),
		);

		await fireEvent.click(modeButtons[0]); // Trigonometric mode
		const a0Input = view.container.querySelector("#a0-input");
		expect(a0Input).toBeTruthy();
	});

	/**
	 * Tests omega0 normalization and DC offset contributions in trig mode.
	 */
	it("normalizes omega0 symbols and synthesizes DC offset a0", async () => {
		const onChange = vi.fn();
		const view = render(FourierSeriesInput, { onChange });

		const w0Input = view.container.querySelector("#w0-input");
		const a0Input = view.container.querySelector("#a0-input");
		expect(w0Input).toBeTruthy();
		expect(a0Input).toBeTruthy();

		if (w0Input && a0Input) {
			// Change omega0 with special characters (pi, w0, asterisks)
			await fireEvent.input(w0Input, {
				target: { value: "2 * pi / T0" },
			});
			await fireEvent.input(a0Input, { target: { value: "5/2" } });

			const lastCall = onChange.mock.calls.at(-1)?.[0];
			expect(lastCall).toContain("5/2 + \\sum_{n=1}^{\\infty}");
			expect(lastCall).toContain("\\pi");
		}
	});

	/**
	 * Tests all modes and harmonic options for cosine coefficient a_n.
	 */
	it("configures cosine coefficient a_n with fraction, custom multiplier, direct mode, and zero", async () => {
		const onChange = vi.fn();
		const view = render(FourierSeriesInput, { onChange });

		// Click Fraction Builder for an
		const anCard = view.container.querySelectorAll(".coeff-card")[0];
		const fractionBtn = anCard.querySelectorAll(".toggle-btn")[1];
		await fireEvent.click(fractionBtn);

		const anNum = anCard.querySelectorAll(".fraction-input")[0];
		const anDen = anCard.querySelectorAll(".fraction-input")[1];
		const anSelect = anCard.querySelector("select");

		expect(anNum).toBeTruthy();
		expect(anDen).toBeTruthy();
		expect(anSelect).toBeTruthy();

		if (anNum && anDen && anSelect) {
			await fireEvent.input(anNum, { target: { value: "4" } });
			await fireEvent.input(anDen, { target: { value: "n^2 pi^2" } });

			// Select even harmonics
			await fireEvent.change(anSelect, { target: { value: "even" } });
			let latex = onChange.mock.calls.at(-1)?.[0];
			expect(latex).toContain("(1 + (-1)^n)");

			// Select alternating harmonic
			await fireEvent.change(anSelect, { target: { value: "alt" } });
			latex = onChange.mock.calls.at(-1)?.[0];
			expect(latex).toContain("(-1)^n");

			// Select none
			await fireEvent.change(anSelect, { target: { value: "none" } });
			latex = onChange.mock.calls.at(-1)?.[0];
			expect(latex).toContain("\\frac{4}{n^2 \\pi^2}");

			// Select custom harmonic
			await fireEvent.change(anSelect, { target: { value: "custom" } });
			const customInput = anCard.querySelector(".custom-mult-input");
			expect(customInput).toBeTruthy();
			if (customInput) {
				await fireEvent.input(customInput, {
					target: { value: "\\sin(n \\pi / 2)" },
				});
				latex = onChange.mock.calls.at(-1)?.[0];
				expect(latex).toContain("\\sin(n \\pi / 2)");
			}
		}

		// Direct / freehand mode for an
		const freehandBtn = anCard.querySelectorAll(".toggle-btn")[2];
		await fireEvent.click(freehandBtn);
		const directInput = view.container.querySelector("#an-direct-input");
		expect(directInput).toBeTruthy();
		if (directInput) {
			await fireEvent.input(directInput, { target: { value: "3/n" } });
			expect(onChange.mock.calls.at(-1)?.[0]).toContain("3/n \\cos(");
		}

		// Zero mode for an
		const zeroBtn = anCard.querySelectorAll(".toggle-btn")[0];
		await fireEvent.click(zeroBtn);
		expect(onChange.mock.calls.at(-1)?.[0]).not.toContain("\\cos(");
	});

	/**
	 * Tests cosine-only series (an active, bn zero) and sine-only series.
	 */
	it("synthesizes cosine-only series when bn is zero and an is active", async () => {
		const onChange = vi.fn();
		const view = render(FourierSeriesInput, { onChange });

		const anCard = view.container.querySelectorAll(".coeff-card")[0];
		const bnCard = view.container.querySelectorAll(".coeff-card")[1];

		// Enable an
		const anFractionBtn = anCard.querySelectorAll(".toggle-btn")[1];
		await fireEvent.click(anFractionBtn);

		// Disable bn
		const bnZeroBtn = bnCard.querySelectorAll(".toggle-btn")[0];
		await fireEvent.click(bnZeroBtn);

		const latex = onChange.mock.calls.at(-1)?.[0];
		expect(latex).toContain("\\cos(");
		expect(latex).not.toContain("\\sin(");
	});

	/**
	 * Tests sine coefficient b_n modes and harmonic selectors.
	 */
	it("configures sine coefficient b_n with various modes and harmonics", async () => {
		const onChange = vi.fn();
		const view = render(FourierSeriesInput, { onChange });

		const bnCard = view.container.querySelectorAll(".coeff-card")[1];
		const bnSelect = bnCard.querySelector("select");
		expect(bnSelect).toBeTruthy();

		if (bnSelect) {
			await fireEvent.change(bnSelect, { target: { value: "even" } });
			expect(onChange.mock.calls.at(-1)?.[0]).toContain("(1 + (-1)^n)");

			await fireEvent.change(bnSelect, { target: { value: "alt" } });
			expect(onChange.mock.calls.at(-1)?.[0]).toContain("(-1)^n");

			await fireEvent.change(bnSelect, { target: { value: "none" } });
			expect(onChange.mock.calls.at(-1)?.[0]).toContain(
				"\\frac{2}{n \\pi}",
			);

			await fireEvent.change(bnSelect, { target: { value: "custom" } });
			const customInput = bnCard.querySelector(".custom-mult-input");
			if (customInput) {
				await fireEvent.input(customInput, {
					target: { value: "\\cos(n pi)" },
				});
				expect(onChange.mock.calls.at(-1)?.[0]).toContain(
					"\\cos(n \\pi)",
				);
			}
		}

		// Direct mode for bn
		const directBtn = bnCard.querySelectorAll(".toggle-btn")[2];
		await fireEvent.click(directBtn);
		const bnDirectInput = view.container.querySelector("#bn-direct-input");
		if (bnDirectInput) {
			await fireEvent.input(bnDirectInput, {
				target: { value: "\\frac{8}{n^3 \\pi^3}" },
			});
			expect(onChange.mock.calls.at(-1)?.[0]).toContain(
				"\\frac{8}{n^3 \\pi^3}",
			);
		}

		// Zero mode for bn
		const zeroBtn = bnCard.querySelectorAll(".toggle-btn")[0];
		await fireEvent.click(zeroBtn);
		// With both an and bn zero, it should synthesize DC or 0
		expect(onChange.mock.calls.at(-1)?.[0]).toBe("0");

		// Fraction mode for bn (switch back from zero)
		const fractionBtn = bnCard.querySelectorAll(".toggle-btn")[1];
		await fireEvent.click(fractionBtn);
		expect(onChange.mock.calls.at(-1)?.[0]).toContain("\\sin(");
	});

	/**
	 * Tests exponential mode with F_n fraction, direct, zero, harmonics, and F0.
	 */
	it("configures exponential series mode with F0 and Fn variations", async () => {
		const onChange = vi.fn();
		const view = render(FourierSeriesInput, { onChange });

		// Switch to exponential mode
		const modeButtons = view.container.querySelectorAll(".mode-btn");
		await fireEvent.click(modeButtons[1]);

		const F0Input = view.container.querySelector("#F0-input");
		if (F0Input) {
			await fireEvent.input(F0Input, { target: { value: "2" } });
		}

		const fnCard = view.container.querySelector(".coeff-card");
		expect(fnCard).toBeTruthy();
		if (!fnCard) return;

		const fnNum = fnCard.querySelectorAll(".fraction-input")[0];
		const fnDen = fnCard.querySelectorAll(".fraction-input")[1];
		if (fnNum && fnDen) {
			await fireEvent.input(fnNum, { target: { value: "2" } });
			await fireEvent.input(fnDen, { target: { value: "j n pi" } });
		}

		const fnSelect = fnCard.querySelector("select");
		if (fnSelect) {
			await fireEvent.change(fnSelect, { target: { value: "odd" } });
			expect(onChange.mock.calls.at(-1)?.[0]).toContain("(1 - (-1)^n)");

			await fireEvent.change(fnSelect, { target: { value: "even" } });
			expect(onChange.mock.calls.at(-1)?.[0]).toContain("(1 + (-1)^n)");

			await fireEvent.change(fnSelect, { target: { value: "alt" } });
			expect(onChange.mock.calls.at(-1)?.[0]).toContain("(-1)^n");

			await fireEvent.change(fnSelect, { target: { value: "custom" } });
			const customInput = fnCard.querySelector(".custom-mult-input");
			if (customInput) {
				await fireEvent.input(customInput, {
					target: { value: "(-1)^{n+1}" },
				});
				expect(onChange.mock.calls.at(-1)?.[0]).toContain("(-1)^{n+1}");
			}
		}

		// Direct mode for Fn
		const directBtn = fnCard.querySelectorAll(".toggle-btn")[2];
		await fireEvent.click(directBtn);
		const fnDirect = view.container.querySelector("#Fn-direct-input");
		if (fnDirect) {
			await fireEvent.input(fnDirect, {
				target: { value: "\\frac{2}{j n \\pi}" },
			});
			expect(onChange.mock.calls.at(-1)?.[0]).toContain(
				"\\frac{2}{j n \\pi}",
			);
		}

		// Zero mode for Fn
		const zeroBtn = fnCard.querySelectorAll(".toggle-btn")[0];
		await fireEvent.click(zeroBtn);
		expect(onChange.mock.calls.at(-1)?.[0]).toBe("2");

		// Fraction mode switch back
		const fractionBtn = fnCard.querySelectorAll(".toggle-btn")[1];
		await fireEvent.click(fractionBtn);
		expect(onChange.mock.calls.at(-1)?.[0]).toContain("e^{j n");

		// When F0 is also 0 and Fn is zero
		await fireEvent.click(zeroBtn);
		if (F0Input) {
			await fireEvent.input(F0Input, { target: { value: "0" } });
			expect(onChange.mock.calls.at(-1)?.[0]).toBe("0");
		}
	});

	/**
	 * Tests denominator normalization when cleanDen === "1".
	 */
	it("omits fraction wrapper when denominator is 1", async () => {
		const onChange = vi.fn();
		const view = render(FourierSeriesInput, { onChange });

		const bnCard = view.container.querySelectorAll(".coeff-card")[1];
		const bnNum = bnCard.querySelectorAll(".fraction-input")[0];
		const bnDen = bnCard.querySelectorAll(".fraction-input")[1];
		const bnSelect = bnCard.querySelector("select");

		if (bnNum && bnDen && bnSelect) {
			await fireEvent.input(bnNum, { target: { value: "3" } });
			await fireEvent.input(bnDen, { target: { value: "1" } });
			await fireEvent.change(bnSelect, { target: { value: "none" } });

			const latex = onChange.mock.calls.at(-1)?.[0];
			expect(latex).toContain("3 \\sin(");
			expect(latex).not.toContain("\\frac{3}{1}");
		}
	});
});
