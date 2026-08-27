/**
 * FourierSeriesConversionChallenge Svelte Component Unit Tests.
 *
 * Validates step 8 optional conversion challenge interactions,
 * misconception feedback, multi-part progression, hints, and completions.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FourierSeriesConversionChallenge from "$lib/components/solvers/FourierSeriesConversionChallenge.svelte";
import type { FourierSeriesConversionChallenge as ChallengeType } from "$lib/math-engine/fourier-series/index";
import { generateFourierSeriesProblem } from "$lib/math-engine/fourier-series/index";

describe("FourierSeriesConversionChallenge", () => {
	afterEach(() => cleanup());

	/**
	 * Tests full multi-part conversion flow, wrong option misconceptions, hints, and onComplete callback.
	 */
	it("handles incorrect feedback, hint reveals, and multi-part completion", async () => {
		const problem = generateFourierSeriesProblem("square_even", {
			seed: 10,
			A: 5,
			T0: 2,
		});
		const onComplete = vi.fn();
		const challenge = problem.conversionChallenge;

		const view = render(FourierSeriesConversionChallenge, {
			challenge,
			onComplete,
		});

		expect(
			view.getByText(
				"Optional Step 8: Convert to the Other Fourier Forms",
			),
		).toBeTruthy();
		expect(view.getByText("Optional")).toBeTruthy();

		// Part 1
		expect(view.getByText("Part 1 of 2")).toBeTruthy();
		const firstPart = challenge.parts[0];
		expect(firstPart).toBeTruthy();

		const wrongOptionIndex = firstPart.options.findIndex(
			(opt) => !opt.isCorrect,
		);
		const correctOptionIndex = firstPart.options.findIndex(
			(opt) => opt.isCorrect,
		);

		const optionsContainer = view.getByTestId("fourier-conversion-options");
		const optionButtons = optionsContainer.querySelectorAll("button");

		// Test hint button
		const hintButton = view.getByText("Get Hint");
		await fireEvent.click(hintButton);
		expect(
			view.container.querySelectorAll(".conversion-hints p").length,
		).toBeGreaterThan(0);

		// Click more hints until max
		for (let i = 0; i < (firstPart.hints?.length ?? 0); i++) {
			await fireEvent.click(hintButton);
		}
		expect(hintButton.hasAttribute("disabled")).toBe(true);

		// Click wrong option
		await fireEvent.click(optionButtons[wrongOptionIndex]!);
		const feedback = view.container.querySelector(".conversion-feedback");
		expect(feedback).toBeTruthy();

		// Click correct option to advance to Part 2
		await fireEvent.click(optionButtons[correctOptionIndex]!);

		// Part 2
		expect(view.getByText("Part 2 of 2")).toBeTruthy();
		const secondPart = challenge.parts[1]!;
		const secondOptionsContainer = view.getByTestId(
			"fourier-conversion-options",
		);
		const secondOptionButtons =
			secondOptionsContainer.querySelectorAll("button");
		const secondCorrectIndex = secondPart.options.findIndex(
			(opt) => opt.isCorrect,
		);

		await fireEvent.click(secondOptionButtons[secondCorrectIndex]!);

		// Completion state
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(
			view.getByText(
				"✓ Optional conversions completed. Both worked conversions are now available in the solution breakdown.",
			),
		).toBeTruthy();
	});

	/**
	 * Tests fallback feedback and empty hints handling.
	 */
	it("handles fallback feedback message when option feedback is omitted", async () => {
		const customChallenge: ChallengeType = {
			parts: [
				{
					id: "alternate",
					title: "Custom Form",
					prompt: "Choose the conversion:",
					resultLatex: "x(t)",
					hints: [],
					options: [
						{
							id: "opt_wrong",
							latex: "0",
							isCorrect: false,
							feedback: undefined,
						},
						{
							id: "opt_correct",
							latex: "1",
							isCorrect: true,
						},
					],
				},
				{
					id: "compact",
					title: "Compact Harmonic Form",
					prompt: "Choose the compact harmonic form:",
					resultLatex: "x_c(t)",
					hints: [],
					options: [
						{
							id: "opt2_correct",
							latex: "c_n",
							isCorrect: true,
						},
					],
				},
			],
		};

		const view = render(FourierSeriesConversionChallenge, {
			challenge: customChallenge,
		});

		const optionButtons = view
			.getByTestId("fourier-conversion-options")
			.querySelectorAll("button");

		// Click hint button when hints are empty
		const hintButton = view.getByText("Get Hint");
		expect(hintButton.hasAttribute("disabled")).toBe(true);
		await fireEvent.click(hintButton);

		// Click wrong option with undefined feedback
		await fireEvent.click(optionButtons[0]!);
		expect(
			view.container.querySelector(".conversion-feedback")?.textContent,
		).toContain("Recheck the coefficient conversion identities");
	});

	/**
	 * Tests resetting state when challenge prop changes.
	 */
	it("resets challenge state when challenge property updates", async () => {
		const problem1 = generateFourierSeriesProblem("square_even", {
			seed: 10,
			A: 5,
			T0: 2,
		});
		const problem2 = generateFourierSeriesProblem("sawtooth", {
			seed: 12,
			A: 4,
			T0: 1,
		});

		const view = render(FourierSeriesConversionChallenge, {
			challenge: problem1.conversionChallenge,
		});

		expect(view.getByText("Part 1 of 2")).toBeTruthy();

		// Advance part 1
		const firstPart = problem1.conversionChallenge.parts[0]!;
		const correctIndex = firstPart.options.findIndex(
			(opt) => opt.isCorrect,
		);
		const optionButtons = view
			.getByTestId("fourier-conversion-options")
			.querySelectorAll("button");
		await fireEvent.click(optionButtons[correctIndex]!);
		expect(view.getByText("Part 2 of 2")).toBeTruthy();

		// Update props with a new challenge
		await view.rerender({
			challenge: problem2.conversionChallenge,
		});

		// Should reset to Part 1 of the new challenge
		expect(view.getByText("Part 1 of 2")).toBeTruthy();
	});
});
