/**
 * @file DOM tests for anti-spoiler completion, visualizer deferral, and problem replacement.
 */

import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConvolutionPracticeCard from "$lib/components/ui/ConvolutionPracticeCard.svelte";
import {
	generateConfiguredConvolutionProblem,
	TEXTBOOK_CONVOLUTION_SELECTION,
} from "$lib/math-engine/convolution/index";
import { convolutionProblem } from "$lib/testing/convolution";

describe("ConvolutionPracticeCard", () => {
	/** Each new problem must notify and lock the same verified moving choice. */
	it("synchronizes repeated moving choices across consecutive problems", async () => {
		const onNextProblem = vi.fn();
		const view = render(ConvolutionPracticeCard, {
			problem: generateConfiguredConvolutionProblem(
				TEXTBOOK_CONVOLUTION_SELECTION,
				{ seed: 1 },
			),
			onNextProblem,
		});
		for (const seed of [1, 2]) {
			if (seed === 2)
				await view.rerender({
					problem: generateConfiguredConvolutionProblem(
						TEXTBOOK_CONVOLUTION_SELECTION,
						{ seed },
					),
					onNextProblem,
				});
			await act(
				/** Advances to the real binary moving-signal choice. */ () => {
					window.__signalLabDev?.autoFillStep(1);
					window.__signalLabDev?.autoFillStep(2);
				},
			);
			const choice = view.container.querySelector<HTMLButtonElement>(
				".step-card.active .binary-grid button",
			);
			if (!choice) throw new Error("Expected moving-signal choice.");
			await fireEvent.click(choice);
			expect(view.getByText(/Step 3 is verified/)).toBeTruthy();
			for (const button of view.container.querySelectorAll<HTMLButtonElement>(
				".preview-path-controls button",
			))
				expect(button.disabled).toBe(true);
		}
	});
	/** A regenerated object with unchanged resolved parameters must restart practice. */
	it("resets completion when the replacement retains the same identifier", async () => {
		const first = generateConfiguredConvolutionProblem(
			TEXTBOOK_CONVOLUTION_SELECTION,
			{ seed: 1 },
		);
		const onNextProblem = vi.fn();
		const view = render(ConvolutionPracticeCard, {
			problem: first,
			onNextProblem,
		});
		await act(
			/** Completes the original tutor through its real validators. */ () =>
				window.__signalLabDev?.solveAll(),
		);
		expect(view.getByText("Problem Completed!")).toBeTruthy();
		const replacement = generateConfiguredConvolutionProblem(
			{
				...TEXTBOOK_CONVOLUTION_SELECTION,
				x: { ...TEXTBOOK_CONVOLUTION_SELECTION.x, amplitude: "1" },
			},
			{ seed: 1 },
		);
		expect(replacement.id).toBe(first.id);
		await view.rerender({ problem: replacement, onNextProblem });
		expect(view.queryByText("Problem Completed!")).toBeNull();
		expect(
			view.container.querySelectorAll(".step-card.locked"),
		).toHaveLength(6);
		expect(window.__signalLabDev?.activeSolver?.currentStep).toBe(1);
	});
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			null,
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("keeps the early animation disclosed by choice and defers completion artifacts", async () => {
		const problem = convolutionProblem();
		const onNextProblem = vi.fn();
		const view = render(ConvolutionPracticeCard, {
			problem,
			onNextProblem,
		});
		const earlyDisclosure =
			view.container.querySelector<HTMLDetailsElement>(
				"details.early-visual-disclosure",
			);
		expect(earlyDisclosure?.open).toBe(false);
		expect(earlyDisclosure?.querySelector("canvas")).toBeTruthy();
		expect(view.queryByText("Problem Completed!")).toBeNull();

		await act(() => window.__signalLabDev?.solveAll());
		await waitFor(() =>
			expect(view.getByText("Problem Completed!")).toBeTruthy(),
		);
		expect(view.container.querySelectorAll("canvas")).toHaveLength(2);
		expect(
			view.getByText("Verified Flip-and-Shift Overlap Visualizer"),
		).toBeTruthy();
		expect(view.getByText("Tutor Steps")).toBeTruthy();
		expect(view.getByText("Verified Regions")).toBeTruthy();
		const disclosure = Array.from(
			view.container.querySelectorAll("details"),
		).find((candidate) => candidate !== earlyDisclosure);
		expect(disclosure?.open).toBe(false);
		expect(disclosure?.querySelectorAll(".step-card")).toHaveLength(7);
		expect(disclosure?.textContent).toContain(
			"Choose every lower and upper limit",
		);
		expect(disclosure?.textContent).toContain(
			"Assemble the piecewise response",
		);

		await fireEvent.click(view.getByText(/Generate Next Problem/));
		expect(onNextProblem).toHaveBeenCalledOnce();
	});

	it("hides completion artifacts again when the problem changes", async () => {
		const firstProblem = convolutionProblem("rect", "exponential");
		const view = render(ConvolutionPracticeCard, {
			problem: firstProblem,
			onNextProblem: vi.fn(),
		});
		await act(() => window.__signalLabDev?.solveAll());
		await waitFor(() =>
			expect(view.container.querySelectorAll("canvas")).toHaveLength(2),
		);

		const replacement = {
			...convolutionProblem("exponential", "exponential"),
			id: `${firstProblem.id}-replacement`,
		};
		await view.rerender({ problem: replacement, onNextProblem: vi.fn() });
		await waitFor(() =>
			expect(view.container.querySelectorAll("canvas")).toHaveLength(1),
		);
		expect(view.queryByText("Problem Completed!")).toBeNull();
	});
});
