/**
 * @file DOM tests for convolution animation controls, browser lifecycle, and drawing branches.
 */

import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConvolutionCanvas from "$lib/components/canvas/ConvolutionCanvas.svelte";

/** Builds the canvas context methods exercised by the modular plot renderer. */
function createMockContext() {
	return {
		arc: vi.fn(),
		beginPath: vi.fn(),
		closePath: vi.fn(),
		clip: vi.fn(),
		rect: vi.fn(),
		save: vi.fn(),
		restore: vi.fn(),
		fill: vi.fn(),
		fillRect: vi.fn(),
		fillText: vi.fn(),
		lineTo: vi.fn(),
		moveTo: vi.fn(),
		scale: vi.fn(),
		setLineDash: vi.fn(),
		stroke: vi.fn(),
		fillStyle: "",
		font: "",
		lineWidth: 1,
		strokeStyle: "",
		textAlign: "start",
	};
}

describe("ConvolutionCanvas", () => {
	const mockContext = createMockContext();
	let resizeCallback: (() => void) | undefined;
	let nextFrameId = 1;
	let animationCallbacks = new Map<number, FrameRequestCallback>();

	beforeEach(() => {
		resizeCallback = undefined;
		nextFrameId = 1;
		animationCallbacks = new Map();
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			mockContext as unknown as CanvasRenderingContext2D,
		);
		vi.spyOn(
			HTMLCanvasElement.prototype,
			"getBoundingClientRect",
		).mockReturnValue({
			width: 640,
			height: 360,
			top: 0,
			left: 0,
			bottom: 360,
			right: 640,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		});
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn((callback: FrameRequestCallback) => {
				const id = nextFrameId;
				nextFrameId += 1;
				animationCallbacks.set(id, callback);
				return id;
			}),
		);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
		vi.stubGlobal(
			"ResizeObserver",
			class {
				/** Stores the callback for deterministic resize simulation. */
				constructor(callback: () => void) {
					resizeCallback = callback;
				}

				/** Observes a target in production and is inert in this test double. */
				observe(): void {}

				/** Disconnects this test observer. */
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("renders the instructional plot and supports play, speed, scrub, pause, and restart", async () => {
		const view = render(ConvolutionCanvas, {
			title: "Verified overlap",
			timeRange: [-2, 6],
			transitionTimes: [0, 2, 4],
			movingBreakpoints: [0, 1, 2],
			movingSupportEdges: [0, 2, Number.POSITIVE_INFINITY],
			fixedBreakpoints: [0, 2],
			sampleCount: 12,
		});
		const slider = view.container.querySelector(
			"#shift-slider",
		) as HTMLInputElement;
		const speed = view.getByLabelText(
			"Animation speed",
		) as HTMLSelectElement;
		await waitFor(() => expect(slider.value).toBe("-2"));

		expect(view.getByText("Verified overlap")).toBeTruthy();
		expect(view.getByText("Slow")).toBeTruthy();
		expect(view.getByText("Standard")).toBeTruthy();
		expect(view.getByText("Fast")).toBeTruthy();
		expect(view.getByText("Moving edges")).toBeTruthy();
		expect(view.getByText("Current time")).toBeTruthy();
		expect(
			view.getByText(/Purple dashed guides on the output plot/),
		).toBeTruthy();
		expect(mockContext.fillRect).toHaveBeenCalled();
		expect(mockContext.scale).toHaveBeenCalled();
		expect(
			view.container
				.querySelector("canvas")
				?.getAttribute("data-visual-ready"),
		).toBe("true");

		await fireEvent.change(speed, { target: { value: "1.1" } });
		await fireEvent.click(view.getByText("Animate shift"));
		expect(view.getByText("Pause animation")).toBeTruthy();
		const firstFrame = animationCallbacks.get(1);
		expect(firstFrame).toBeDefined();
		await act(() => firstFrame?.(1000));
		const secondFrame = animationCallbacks.get(2);
		await act(() => secondFrame?.(1200));
		await waitFor(() => expect(Number(slider.value)).toBeGreaterThan(-2));

		await fireEvent.input(slider, { target: { value: "1" } });
		expect(view.getByText("Animate shift")).toBeTruthy();
		expect(cancelAnimationFrame).toHaveBeenCalled();

		await fireEvent.click(view.getByText("Animate shift"));
		await fireEvent.click(view.getByText("Pause animation"));
		expect(view.getByText("Animate shift")).toBeTruthy();
		await fireEvent.click(view.getByText("Restart"));
		await waitFor(() => expect(slider.value).toBe("-2"));
	});

	it("redraws for resize, theme, and prop changes and cleans up active playback", async () => {
		const view = render(ConvolutionCanvas, {
			evalX: (time) => time,
			evalH: (time) => time * 2,
			evalY: (time) => time * 3,
			timeRange: [3, -1],
			animationSpeed: 0.35,
		});
		await waitFor(() => expect(resizeCallback).toBeDefined());
		await act(() => resizeCallback?.());
		window.dispatchEvent(new CustomEvent("themechange"));
		window.dispatchEvent(new Event("resize"));
		await view.rerender({
			evalX: () => 1,
			evalH: () => 1,
			evalY: () => 2,
			timeRange: [-1, 3],
			transitionTimes: [0],
		});
		await fireEvent.click(view.getByText("Animate shift"));
		view.unmount();
		expect(cancelAnimationFrame).toHaveBeenCalled();
		expect(mockContext.fillText).toHaveBeenCalled();
	});

	for (const playing of [false, true]) {
		it.each([
			["smaller upper bound", 10, [-2, 3], 3],
			["smaller lower bound", -10, [-2, 3], -2],
			["disjoint later range", 10, [12, 15], 12],
			["disjoint earlier range", 10, [-12, -8], -8],
			["reversed range", 10, [3, -2], 3],
			["valid position", 1, [-2, 3], 1],
			["equivalent reversed range", 10, [20, -20], 10],
		] as const)(
			`preserves controls on replacement with %s while ${playing ? "playing" : "paused"}`,
			/**
			 * @param _label - Replacement scenario name.
			 * @param shift - Scrubbed position in the original range.
			 * @param timeRange - Replacement bounds, possibly reversed.
			 * @param expected - Nearest valid position after replacement.
			 */
			async (_label, shift, timeRange, expected) => {
				const view = render(ConvolutionCanvas, {
					timeRange: [-20, 20],
					/** @param time - Original output time. @returns A causal ramp. */
					evalY: (time) => Math.max(0, time),
				});
				const slider = view.container.querySelector(
					"#shift-slider",
				) as HTMLInputElement;
				const speed = view.getByLabelText(
					"Animation speed",
				) as HTMLSelectElement;
				await fireEvent.input(slider, {
					target: { value: String(shift) },
				});
				await fireEvent.change(speed, { target: { value: "1.1" } });
				if (playing)
					await fireEvent.click(view.getByText("Animate shift"));
				await view.rerender({
					timeRange: [...timeRange],
					/** @param time - Replacement output time. @returns A signed ramp. */
					evalY: (time) => -2 * Math.max(0, time),
					animationSpeed: 0.35,
				});
				await waitFor(() =>
					expect(Number(slider.value)).toBe(expected),
				);
				expect(speed.value).toBe("1.1");
				expect(
					view.getByText(
						playing ? "Pause animation" : "Animate shift",
					),
				).toBeTruthy();
				expect(view.container.textContent).toContain(
					(-2 * Math.max(0, expected)).toFixed(3),
				);
				if (playing) {
					await act(() => animationCallbacks.get(1)?.(1000));
					await act(() => animationCallbacks.get(2)?.(1200));
					expect(Number(slider.value)).not.toBe(expected);
					expect(Number(slider.value)).toBeGreaterThanOrEqual(
						Math.min(...timeRange),
					);
					expect(Number(slider.value)).toBeLessThanOrEqual(
						Math.max(...timeRange),
					);
				}
			},
		);
	}

	it("skips drawing when context or measurable bounds are unavailable", () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			null,
		);
		const first = render(ConvolutionCanvas);
		expect(first.container.querySelector("canvas")).toBeTruthy();
		first.unmount();

		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			mockContext as unknown as CanvasRenderingContext2D,
		);
		vi.spyOn(
			HTMLCanvasElement.prototype,
			"getBoundingClientRect",
		).mockReturnValue({
			width: 0,
			height: 0,
			top: 0,
			left: 0,
			bottom: 0,
			right: 0,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		});
		const second = render(ConvolutionCanvas);
		expect(second.container.querySelector("canvas")).toBeTruthy();
	});
});
