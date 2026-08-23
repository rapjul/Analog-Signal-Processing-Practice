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
import { generateConvolutionProblem } from "$lib/math-engine/convolution";

describe("ConvolutionPracticeCard", () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			null,
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("defers exact answers and animation until the five-step tutor completes", async () => {
		const problem = generateConvolutionProblem("rect_shifted_rect");
		const onNextProblem = vi.fn();
		const view = render(ConvolutionPracticeCard, {
			problem,
			onNextProblem,
		});
		expect(view.container.querySelector("canvas")).toBeNull();
		expect(view.queryByText("Problem Completed!")).toBeNull();

		await act(() => window.__signalLabDev?.solveAll());
		await waitFor(() =>
			expect(view.getByText("Problem Completed!")).toBeTruthy(),
		);
		expect(view.container.querySelector("canvas")).toBeTruthy();
		expect(
			view.getByText("Verified Flip-and-Shift Overlap Visualizer"),
		).toBeTruthy();
		expect(view.getByText("Tutor Steps")).toBeTruthy();
		expect(view.getByText("Verified Regions")).toBeTruthy();

		await fireEvent.click(view.getByText(/Generate Next Problem/));
		expect(onNextProblem).toHaveBeenCalledOnce();
	});

	it("hides completion artifacts again when the problem changes", async () => {
		const firstProblem = generateConvolutionProblem("rect_exp");
		const view = render(ConvolutionPracticeCard, {
			problem: firstProblem,
			onNextProblem: vi.fn(),
		});
		await act(() => window.__signalLabDev?.solveAll());
		await waitFor(() =>
			expect(view.container.querySelector("canvas")).toBeTruthy(),
		);

		const replacement = {
			...generateConvolutionProblem("exp_exp"),
			id: `${firstProblem.id}-replacement`,
		};
		await view.rerender({ problem: replacement, onNextProblem: vi.fn() });
		await waitFor(() =>
			expect(view.container.querySelector("canvas")).toBeNull(),
		);
		expect(view.queryByText("Problem Completed!")).toBeNull();
	});
});
