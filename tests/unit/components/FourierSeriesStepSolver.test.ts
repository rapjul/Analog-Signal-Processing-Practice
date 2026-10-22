/**
 * FourierSeriesStepSolver Svelte Component Unit Tests.
 *
 * Validates step orchestrator lifecycle, multi-part step progression across
 * all 7 ITS steps, hint reveals, keyboard interactions, symmetry variations,
 * and dynamic problem resetting.
 */

import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FourierSeriesStepSolver from "$lib/components/solvers/FourierSeriesStepSolver.svelte";
import { generateFourierSeriesProblem } from "$lib/math-engine/fourier-series/index";

describe("FourierSeriesStepSolver", () => {
	afterEach(() => cleanup());

	/** Leaves the waveform control focused when replacing either an initial or progressed problem. */
	it("preserves external focus on replacement problems, including repeated IDs", async () => {
		const original = generateFourierSeriesProblem("square", {
			seed: 1,
			T0: 2,
		});
		const view = render(FourierSeriesStepSolver, { problem: original });
		const selector = document.createElement("select");
		document.body.append(selector);
		selector.focus();
		await view.rerender({
			problem: generateFourierSeriesProblem("triangle", {
				seed: 1,
				T0: 2,
			}),
		});
		await tick();
		expect(document.activeElement).toBe(selector);
		await fireEvent.input(
			view.container.querySelector("#fourier-period-input")!,
			{ target: { value: "2" } },
		);
		await fireEvent.input(
			view.container.querySelector("#fourier-freq-input")!,
			{ target: { value: "pi" } },
		);
		await fireEvent.keyDown(
			view.container.querySelector("#fourier-freq-input")!,
			{ key: "Enter" },
		);
		await tick();
		expect(document.activeElement).not.toBe(selector);
		selector.focus();
		await view.rerender({
			problem: generateFourierSeriesProblem("triangle", {
				seed: 1,
				T0: 2,
			}),
		});
		await tick();
		expect(document.activeElement).toBe(selector);
		expect(
			view.container.querySelector('[role="status"]')?.textContent,
		).toContain("Step 1 of 7");
		selector.remove();
	});

	/** Moves keyboard focus after passing a question and resets for a fresh instance with the same ID. */
	it("announces progress, focuses the active question, and resets identical IDs", async () => {
		const problem = generateFourierSeriesProblem("square", {
			seed: 1,
			T0: 2,
		});
		const view = render(FourierSeriesStepSolver, { problem });
		await fireEvent.input(
			view.container.querySelector("#fourier-period-input")!,
			{ target: { value: "2" } },
		);
		await fireEvent.input(
			view.container.querySelector("#fourier-freq-input")!,
			{ target: { value: "pi" } },
		);
		await fireEvent.keyDown(
			view.container.querySelector("#fourier-freq-input")!,
			{ key: "Enter" },
		);
		await waitFor(() =>
			expect(document.activeElement).toBe(
				view.container.querySelector(
					".step-card.active .subpart-block:not(.subpart-done) [data-progress-heading]",
				),
			),
		);
		expect(
			view.container.querySelector('[role="status"]')?.textContent,
		).toContain("Step 2 of 7");
		const replacement = generateFourierSeriesProblem("square", {
			seed: 1,
			T0: 2,
		});
		expect(replacement.id).toBe(problem.id);
		await view.rerender({ problem: replacement });
		expect(
			(
				view.container.querySelector(
					"#fourier-period-input",
				) as HTMLInputElement
			).value,
		).toBe("");
		expect(
			view.container.querySelector('[role="status"]')?.textContent,
		).toContain("Step 1 of 7");
	});

	/**
	 * Tests complete end-to-end traversal from Step 1 through Step 7 to trigger onComplete.
	 */
	it("renders and completes all 7 steps from period extraction to final series synthesis", async () => {
		const problem = generateFourierSeriesProblem("full_wave_sine", {
			seed: 10,
			A: 5,
			T0: 2,
		});
		const onComplete = vi.fn();
		const view = render(FourierSeriesStepSolver, { problem, onComplete });

		// Step 1: Period & Frequency (Testing Enter and non-Enter keydown and unit selects)
		const periodInput = view.container.querySelector(
			"#fourier-period-input",
		);
		const freqInput = view.container.querySelector("#fourier-freq-input");
		expect(periodInput).toBeTruthy();
		expect(freqInput).toBeTruthy();

		const periodSelect = view.getByLabelText("Period time unit");
		const freqSelect = view.getByLabelText("Frequency unit");
		await fireEvent.change(periodSelect, { target: { value: "s" } });
		await fireEvent.change(freqSelect, { target: { value: "rad/s" } });

		if (periodInput && freqInput) {
			// Non-Enter keys
			await fireEvent.keyDown(periodInput, { key: "Tab" });
			await fireEvent.keyDown(freqInput, { key: "Shift" });

			// Reveal hint on Step 1
			const step1Hints = view.container
				.querySelectorAll(".step-card")[0]
				?.querySelector(".hint-trigger");
			if (step1Hints) await fireEvent.click(step1Hints);

			await fireEvent.input(periodInput, { target: { value: "2" } });
			await fireEvent.input(freqInput, { target: { value: "pi" } });
			await fireEvent.keyDown(freqInput, { key: "Enter" });
		}

		// Step 2 Part 2A: Origin Parity
		expect(view.getByText("Part 1 of 2")).toBeTruthy();
		expect(view.getByText("Part 2A")).toBeTruthy();

		// Reveal hint on Step 2
		const step2Hints = view.container
			.querySelectorAll(".step-card")[1]
			?.querySelector(".hint-trigger");
		if (step2Hints) await fireEvent.click(step2Hints);

		const originOptions = view.getByTestId("fourier-step2-origin-options");
		const evenButton = originOptions.querySelectorAll("button")[0];
		expect(evenButton).toBeTruthy();
		if (evenButton) {
			await fireEvent.click(evenButton);
		}
		await fireEvent.click(view.getByText("Check Origin Parity →"));

		// Step 2 Part 2B: Half-Wave Symmetry
		expect(view.getByText("Part 2 of 2")).toBeTruthy();
		expect(view.getByText("Part 2B")).toBeTruthy();

		const halfWaveOptions = view.getByTestId(
			"fourier-step2-half-wave-options",
		);
		const halfWaveButton = halfWaveOptions.querySelectorAll("button")[1];
		expect(halfWaveButton).toBeTruthy();
		if (halfWaveButton) {
			await fireEvent.click(halfWaveButton);
		}
		await fireEvent.click(view.getByText("Check Half-Wave Symmetry →"));

		// Step 3: Vanishing Coefficients Shortcuts
		const step3Card = view.container.querySelectorAll(".step-card")[2];
		if (step3Card) {
			const step3Hints = step3Card.querySelector(".hint-trigger");
			if (step3Hints) await fireEvent.click(step3Hints);

			const step3Choice = step3Card.querySelectorAll("button")[0];
			expect(step3Choice).toBeTruthy();
			if (step3Choice) {
				await fireEvent.click(step3Choice);
			}
		}

		// Step 4: Representation Form
		const step4Card = view.container.querySelectorAll(".step-card")[3];
		if (step4Card) {
			const step4Hints = step4Card.querySelector(".hint-trigger");
			if (step4Hints) await fireEvent.click(step4Hints);

			const trigButton = step4Card.querySelectorAll("button")[0];
			expect(trigButton).toBeTruthy();
			if (trigButton) {
				await fireEvent.click(trigButton);
			}
		}

		// Step 5: Integrals Setup
		const step5Card = view.container.querySelectorAll(".step-card")[4];
		if (step5Card) {
			const step5Hints = step5Card.querySelector(".hint-trigger");
			if (step5Hints) await fireEvent.click(step5Hints);
		}

		// Part 5A
		const step5Options = view.getByTestId("fourier-step5-options");
		const part5A = problem.itsData.step5.parts[0];
		if (part5A) {
			const part5AIdx = part5A.options.findIndex((opt) => opt.isCorrect);
			const optBtns5A = step5Options.querySelectorAll("button");
			const btn5A = optBtns5A[part5AIdx];
			if (btn5A) await fireEvent.click(btn5A);
		}

		// Part 5B
		expect(view.getByText("Part 5B")).toBeTruthy();
		const step5BOptions = view.getByTestId("fourier-step5-options");
		const part5B = problem.itsData.step5.parts[1];
		if (part5B) {
			const part5BIdx = part5B.options.findIndex((opt) => opt.isCorrect);
			const optBtns5B = step5BOptions.querySelectorAll("button");
			const btn5B = optBtns5B[part5BIdx];
			if (btn5B) await fireEvent.click(btn5B);
		}

		// Step 6: Coefficient Evaluation
		const step6Card = view.container.querySelectorAll(".step-card")[5];
		if (step6Card) {
			const step6Hints = step6Card.querySelector(".hint-trigger");
			if (step6Hints) await fireEvent.click(step6Hints);
		}

		// Part 6A
		expect(view.getByText("Harmonic Coefficient Evaluation")).toBeTruthy();
		expect(view.getByText("Part 6A")).toBeTruthy();
		const step6AOptions = view.getByTestId("fourier-step6-options");
		const part6A = problem.itsData.step6.parts[0];
		if (part6A) {
			const part6AIdx = part6A.options.findIndex((opt) => opt.isCorrect);
			const optBtns6A = step6AOptions.querySelectorAll("button");
			const btn6A = optBtns6A[part6AIdx];
			if (btn6A) await fireEvent.click(btn6A);
		}

		// Part 6B
		expect(view.getByText("Part 6B")).toBeTruthy();
		const step6BOptions = view.getByTestId("fourier-step6-options");
		const part6B = problem.itsData.step6.parts[1];
		if (part6B) {
			const part6BIdx = part6B.options.findIndex((opt) => opt.isCorrect);
			const optBtns6B = step6BOptions.querySelectorAll("button");
			const btn6B = optBtns6B[part6BIdx];
			if (btn6B) await fireEvent.click(btn6B);
		}

		// Step 7: Final Fourier Series Expression
		const step7Card = view.container.querySelectorAll(".step-card")[6];
		if (step7Card) {
			const step7Hints = step7Card.querySelector(".hint-trigger");
			if (step7Hints) await fireEvent.click(step7Hints);
		}

		expect(view.getByText("Final Fourier Series Expression")).toBeTruthy();
		const step7Cards = view.container.querySelectorAll(".mcq-cards-grid");
		const lastGrid = step7Cards[step7Cards.length - 1];
		if (lastGrid) {
			const step7Btns = lastGrid.querySelectorAll("button");
			const step7Idx = problem.itsData.step7.options.findIndex(
				(opt) => opt.isCorrect,
			);
			const btn7 = step7Btns[step7Idx];
			if (btn7) await fireEvent.click(btn7);
		}

		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	/**
	 * Tests odd and neither parity choices, non-half-wave paths, exp/compact forms, and hint triggers across steps.
	 */
	it("exercises alternate symmetry, form branches, and hint disclosures across steps", async () => {
		const problem = generateFourierSeriesProblem("sawtooth", {
			seed: 20,
			A: 4,
			T0: 2,
		});
		const view = render(FourierSeriesStepSolver, { problem });

		// Step 1: Period Enter
		const periodInput = view.container.querySelector(
			"#fourier-period-input",
		);
		const freqInput = view.container.querySelector("#fourier-freq-input");
		if (periodInput && freqInput) {
			await fireEvent.input(periodInput, { target: { value: "2" } });
			await fireEvent.input(freqInput, { target: { value: "pi" } });
			await fireEvent.click(view.getByText("Check Period & Frequency →"));
		}

		// Step 2: Odd symmetry and Neither symmetry buttons
		const originOptions = view.getByTestId("fourier-step2-origin-options");
		const symmetryButtons = originOptions.querySelectorAll("button");
		expect(symmetryButtons.length).toBe(3);

		// Click neither
		await fireEvent.click(symmetryButtons[2]!);
		// Click odd
		await fireEvent.click(symmetryButtons[1]!);
		await fireEvent.click(view.getByText("Check Origin Parity →"));

		// Step 2 Part 2B: No half-wave symmetry
		const halfWaveOptions = view.getByTestId(
			"fourier-step2-half-wave-options",
		);
		const halfWaveButtons = halfWaveOptions.querySelectorAll("button");
		if (halfWaveButtons?.[1]) {
			await fireEvent.click(halfWaveButtons[1]);
		}
		await fireEvent.click(view.getByText("Check Half-Wave Symmetry →"));

		// Step 3: Test clicking choices
		const step3Card = view.container.querySelectorAll(".step-card")[2];
		if (step3Card) {
			const step3Buttons = step3Card.querySelectorAll("button");
			if (step3Buttons.length >= 3) {
				await fireEvent.click(step3Buttons[2]!); // none
				await fireEvent.click(step3Buttons[1]!); // an_zero
			}
		}

		// Step 4: Test clicking Exponential and Compact Harmonic buttons
		const step4Card = view.container.querySelectorAll(".step-card")[3];
		if (step4Card) {
			const repButtons = step4Card.querySelectorAll("button");
			if (repButtons.length >= 3) {
				await fireEvent.click(repButtons[2]!); // compact
				await fireEvent.click(repButtons[1]!); // exp
				await fireEvent.click(repButtons[0]!); // trig
			}
		}
	});

	/**
	 * Tests solving an exponential/asymmetric waveform (half_wave_sine) end-to-end.
	 */
	it("solves neither-symmetry waveform in exponential form through step 7", async () => {
		const problem = generateFourierSeriesProblem("half_wave_sine", {
			seed: 5,
			A: 2,
			T0: 2,
		});
		const onComplete = vi.fn();
		const view = render(FourierSeriesStepSolver, { problem, onComplete });

		// Step 1
		const periodInput = view.container.querySelector(
			"#fourier-period-input",
		);
		const freqInput = view.container.querySelector("#fourier-freq-input");
		if (periodInput && freqInput) {
			await fireEvent.input(periodInput, { target: { value: "2" } });
			await fireEvent.input(freqInput, { target: { value: "pi" } });
			await fireEvent.click(view.getByText("Check Period & Frequency →"));
		}

		// Step 2 Part 2A: Neither symmetry
		const originOptions = view.getByTestId("fourier-step2-origin-options");
		const originBtn = originOptions.querySelectorAll("button")[2];
		if (originBtn) await fireEvent.click(originBtn);
		await fireEvent.click(view.getByText("Check Origin Parity →"));

		// Step 2 Part 2B: No half-wave symmetry
		const halfWaveOptions = view.getByTestId(
			"fourier-step2-half-wave-options",
		);
		const halfWaveBtn = halfWaveOptions.querySelectorAll("button")[1];
		if (halfWaveBtn) await fireEvent.click(halfWaveBtn);
		await fireEvent.click(view.getByText("Check Half-Wave Symmetry →"));

		// Step 3: None vanish
		const step3Card = view.container.querySelectorAll(".step-card")[2];
		if (step3Card) {
			const btn = step3Card.querySelectorAll("button")[2];
			if (btn) await fireEvent.click(btn);
		}

		// Step 4: Exponential Form
		const step4Card = view.container.querySelectorAll(".step-card")[3];
		if (step4Card) {
			const btn = step4Card.querySelectorAll("button")[1];
			if (btn) await fireEvent.click(btn);
		}

		// Step 5: Integral Setup
		for (let i = 0; i < problem.itsData.step5.parts.length; i++) {
			const step5Options = view.getByTestId("fourier-step5-options");
			const part = problem.itsData.step5.parts[i];
			if (!part) continue;
			const partIdx = part.options.findIndex((opt) => opt.isCorrect);
			const btn = step5Options.querySelectorAll("button")[partIdx];
			if (btn) await fireEvent.click(btn);
		}

		// Step 6: Coefficient Evaluation
		for (let i = 0; i < problem.itsData.step6.parts.length; i++) {
			const step6Options = view.getByTestId("fourier-step6-options");
			const part = problem.itsData.step6.parts[i];
			if (!part) continue;
			const partIdx = part.options.findIndex((opt) => opt.isCorrect);
			const btn = step6Options.querySelectorAll("button")[partIdx];
			if (btn) await fireEvent.click(btn);
		}

		// Step 7: Final Exponential Series Synthesis
		const step7Cards = view.container.querySelectorAll(".mcq-cards-grid");
		const lastGrid = step7Cards[step7Cards.length - 1];
		if (lastGrid) {
			const step7Btns = lastGrid.querySelectorAll("button");
			const step7Idx = problem.itsData.step7.options.findIndex(
				(opt) => opt.isCorrect,
			);
			const btn = step7Btns[step7Idx];
			if (btn) await fireEvent.click(btn);
		}

		expect(onComplete).toHaveBeenCalled();
	});

	/**
	 * Tests resetting step solver state when problem property changes.
	 */
	it("resets solver when problem property ID changes", async () => {
		const problem1 = generateFourierSeriesProblem("square_even", {
			seed: 10,
			A: 5,
			T0: 2,
		});
		const problem2 = generateFourierSeriesProblem("triangle", {
			seed: 30,
			A: 3,
			T0: 4,
		});

		const view = render(FourierSeriesStepSolver, { problem: problem1 });

		// Advance Step 1
		const periodInput = view.container.querySelector(
			"#fourier-period-input",
		);
		const freqInput = view.container.querySelector("#fourier-freq-input");
		if (periodInput && freqInput) {
			await fireEvent.input(periodInput, { target: { value: "2" } });
			await fireEvent.input(freqInput, { target: { value: "pi" } });
			await fireEvent.click(view.getByText("Check Period & Frequency →"));
		}

		expect(view.getByText("Part 2A")).toBeTruthy();

		// Rerender with problem2
		await view.rerender({ problem: problem2 });

		// Should reset back to Step 1
		expect(
			view.container.querySelector("#fourier-period-input"),
		).toBeTruthy();

		// Rerender with the same problem instance (same ID) but updated onComplete
		const newOnComplete = vi.fn();
		await view.rerender({ problem: problem2, onComplete: newOnComplete });
		expect(
			view.container.querySelector("#fourier-period-input"),
		).toBeTruthy();
	});
});
