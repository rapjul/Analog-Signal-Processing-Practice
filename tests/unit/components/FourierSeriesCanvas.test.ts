/**
 * FourierSeriesCanvas Svelte Component Unit Tests.
 *
 * Validates dual-panel Fourier Canvas visualization: time-domain waveform synthesis,
 * Gibbs phenomenon overshoot, frequency-domain magnitude line spectrum,
 * Parseval metric calculations, and responsive rendering across waveform types.
 */

import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FourierSeriesCanvas from "$lib/components/canvas/FourierSeriesCanvas.svelte";
import { computeFourierSeriesCoefficients } from "$lib/math-engine/fourier-series/index";

describe("FourierSeriesCanvas", () => {
	const mockCtx = {
		scale: vi.fn(),
		fillRect: vi.fn(),
		clearRect: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		fill: vi.fn(),
		arc: vi.fn(),
		fillText: vi.fn(),
		setLineDash: vi.fn(),
		fillStyle: "",
		strokeStyle: "",
		lineWidth: 1,
		font: "",
		textAlign: "",
	};

	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			mockCtx as unknown as CanvasRenderingContext2D,
		);
		vi.spyOn(
			HTMLCanvasElement.prototype,
			"getBoundingClientRect",
		).mockReturnValue({
			width: 600,
			height: 300,
			top: 0,
			left: 0,
			bottom: 300,
			right: 600,
			x: 0,
			y: 0,
			toJSON: () => {},
		});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	/** Keeps labels and descriptions attached to their own canvas when instances coexist. */
	it("scopes every accessibility target to its component instance", () => {
		const first = render(FourierSeriesCanvas, { waveformType: "square" });
		const second = render(FourierSeriesCanvas, {
			waveformType: "full_wave_sine",
		});
		const ids = [
			...first.container.querySelectorAll("[id]"),
			...second.container.querySelectorAll("[id]"),
		].map((element) => element.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const view of [first, second]) {
			const slider = view.container.querySelector<HTMLInputElement>(
				'input[type="range"]',
			)!;
			expect(view.container.querySelector("label")?.htmlFor).toBe(
				slider.id,
			);
			for (const element of view.container.querySelectorAll(
				"[aria-describedby], [aria-labelledby]",
			)) {
				const targets =
					element.getAttribute("aria-describedby") ??
					element.getAttribute("aria-labelledby")!;
				for (const id of targets.split(" ")) {
					expect(
						view.container.contains(document.getElementById(id)),
					).toBe(true);
				}
			}
		}
	});

	/** Keeps scientific power values mathematically meaningful inside rendered LaTeX. */
	it("formats extreme power scales as base-ten LaTeX", () => {
		const coefficients = computeFourierSeriesCoefficients("square", {
			A: 1e-150,
		});
		const view = render(FourierSeriesCanvas, { coefficients });
		const annotations = Array.from(
			view.container.querySelectorAll(".power-stat annotation"),
			(node) => node.textContent ?? "",
		);
		expect(
			annotations.some((latex) => latex.includes("\\times 10^{-300}")),
		).toBe(true);
		for (const latex of annotations) expect(latex).not.toMatch(/\de[+-]\d/);
	});

	/** Provides exact DC-through-N values and disables animation for reduced-motion users. */
	it("shows a complete accessible spectrum without reduced-motion animation", async () => {
		const addEventListener = vi.fn();
		const removeEventListener = vi.fn();
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: true,
				addEventListener,
				removeEventListener,
			})),
		);
		const frame = vi.spyOn(window, "requestAnimationFrame");
		const coefficients = computeFourierSeriesCoefficients(
			"full_wave_sine",
			{ A: 2, T0: 4 },
		);
		const view = render(FourierSeriesCanvas, {
			coefficients,
			harmonicCount: 50,
		});
		expect(view.container.querySelectorAll("tbody tr")).toHaveLength(51);
		expect(view.container.querySelector("tbody tr th")?.textContent).toBe(
			"0 (DC)",
		);
		expect(
			view.container.querySelector("tbody tr:last-child th")?.textContent,
		).toBe("50");
		expect(
			view.container.querySelector(".spectrum-description")?.textContent,
		).toContain("positive-index exponential magnitudes");
		expect(frame).not.toHaveBeenCalled();
		await view.rerender({
			coefficients: computeFourierSeriesCoefficients("square"),
			harmonicCount: 2,
		});
		expect(
			view.container.querySelector("tbody tr:last-child")?.textContent,
		).toContain("—");
		view.unmount();
		expect(removeEventListener).toHaveBeenCalledWith(
			"change",
			expect.any(Function),
		);
	});

	/**
	 * Tests Parseval power capture thresholds and metric updates on square waveform.
	 */
	it("uses threshold-safe Parseval labels and semantic metric layouts", async () => {
		const coefficients = computeFourierSeriesCoefficients("square", {
			A: 5,
			T0: 2,
		});
		const view = render(FourierSeriesCanvas, {
			coefficients,
			waveformType: "square",
			harmonicCount: 39,
		});

		expect(view.container.querySelectorAll(".power-stat")).toHaveLength(3);
		expect(view.container.querySelector(".power-value")).toBeNull();
		expect(
			view.container.querySelector(".capture-ratio")?.textContent,
		).toContain("98.99%");
		expect(
			view.container.querySelectorAll(".power-stat")[2]?.textContent,
		).toContain("98.99");
		const thresholdSummary = view.container.querySelector(
			".power-threshold-summary",
		);
		expect(thresholdSummary?.textContent).toContain("41");
		expect(thresholdSummary?.textContent).toContain(
			"highest included harmonic",
		);
		expect(
			thresholdSummary?.querySelector(":scope > .math-text"),
		).toBeTruthy();

		await fireEvent.input(view.getByLabelText("Harmonic Limit:"), {
			target: { value: "41" },
		});
		await waitFor(() =>
			expect(
				view.container.querySelector(".capture-ratio")?.textContent,
			).toContain("99.04%"),
		);
		expect(mockCtx.fillRect).toHaveBeenCalled();
		expect(mockCtx.stroke).toHaveBeenCalled();
	});

	/**
	 * Tests canvas rendering across various waveform types and harmonic display buckets.
	 */
	it("renders time-domain and frequency spectrum for sawtooth waveform with displayN <= 11", () => {
		const coefficients = computeFourierSeriesCoefficients("sawtooth", {
			A: 4,
			T0: 2,
		});
		const view = render(FourierSeriesCanvas, {
			coefficients,
			waveformType: "sawtooth",
			harmonicCount: 5,
		});

		expect(
			view.container.querySelector(".fourier-canvas-wrapper"),
		).toBeTruthy();
		expect(mockCtx.moveTo).toHaveBeenCalled();
		expect(mockCtx.lineTo).toHaveBeenCalled();
		expect(mockCtx.fillText).toHaveBeenCalled();
	});

	/**
	 * Tests triangle waveform with intermediate harmonic count (12 <= displayN <= 20).
	 */
	it("renders triangle waveform with intermediate displayN <= 20", () => {
		const coefficients = computeFourierSeriesCoefficients("triangle", {
			A: 3,
			T0: 4,
		});
		const view = render(FourierSeriesCanvas, {
			coefficients,
			waveformType: "triangle",
			harmonicCount: 15,
		});

		expect(view.container.querySelector(".capture-ratio")).toBeTruthy();
		expect(
			view.container.querySelector(".gibbs-hint")?.textContent,
		).toContain("Compare the partial sum");
		expect(mockCtx.fillRect).toHaveBeenCalled();
	});

	/**
	 * Tests half-wave rectified sine waveform with displayN between 21 and 25.
	 */
	it("renders half-wave rectified sine waveform with 21 <= displayN <= 25", () => {
		const coefficients = computeFourierSeriesCoefficients(
			"half_wave_sine",
			{
				A: 2,
				T0: 2,
			},
		);
		const view = render(FourierSeriesCanvas, {
			coefficients,
			waveformType: "half_wave_sine",
			harmonicCount: 23,
		});

		expect(view.container.querySelector(".capture-ratio")).toBeTruthy();
		expect(mockCtx.fillText).toHaveBeenCalled();
	});

	/**
	 * Tests full-wave rectified sine with high harmonic count (displayN > 25).
	 */
	it("renders full-wave rectified sine with displayN > 25", () => {
		const coefficients = computeFourierSeriesCoefficients(
			"full_wave_sine",
			{
				A: 2,
				T0: 2,
			},
		);
		const view = render(FourierSeriesCanvas, {
			coefficients,
			waveformType: "full_wave_sine",
			harmonicCount: 35,
		});

		expect(
			view.container.querySelector(".fourier-canvas-wrapper"),
		).toBeTruthy();
	});

	/**
	 * Tests square_even waveform on narrow viewport dimensions.
	 */
	it("renders square_even on narrow viewport with responsive padding", () => {
		vi.spyOn(
			HTMLCanvasElement.prototype,
			"getBoundingClientRect",
		).mockReturnValue({
			width: 350,
			height: 200,
			top: 0,
			left: 0,
			bottom: 200,
			right: 350,
			x: 0,
			y: 0,
			toJSON: () => {},
		});

		const coefficients = computeFourierSeriesCoefficients("square_even", {
			A: 5,
			T0: 2,
		});
		const view = render(FourierSeriesCanvas, {
			coefficients,
			waveformType: "square_even",
			harmonicCount: 10,
		});

		expect(view.container.querySelector(".capture-ratio")).toBeTruthy();
		expect(mockCtx.fillRect).toHaveBeenCalled();
	});

	/**
	 * Tests dynamic property changes, window theme/resize events, and ResizeObserver callbacks.
	 */
	it("responds to harmonicCount prop updates, theme changes, and resize events", async () => {
		let resizeCallback: (() => void) | undefined;
		globalThis.ResizeObserver = class {
			constructor(cb: () => void) {
				resizeCallback = cb;
			}
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;

		const coefficients = computeFourierSeriesCoefficients("square", {
			A: 5,
			T0: 2,
		});
		const view = render(FourierSeriesCanvas, {
			coefficients,
			waveformType: "square",
			harmonicCount: 10,
		});

		// Trigger prop change
		await view.rerender({ harmonicCount: 25 });

		// Trigger themechange and resize events
		window.dispatchEvent(new CustomEvent("themechange"));
		window.dispatchEvent(new Event("resize"));
		if (resizeCallback) resizeCallback();

		expect(mockCtx.fillRect).toHaveBeenCalled();
	});

	/**
	 * Tests high harmonic count rendering with large step count.
	 */
	it("renders spectrum for high harmonic limit display", () => {
		const coefficients = computeFourierSeriesCoefficients("sawtooth", {
			A: 3,
			T0: 2,
		});
		const view = render(FourierSeriesCanvas, {
			coefficients,
			waveformType: "sawtooth",
			harmonicCount: 45,
		});

		expect(
			view.container.querySelector(".fourier-canvas-wrapper"),
		).toBeTruthy();
		expect(mockCtx.fillRect).toHaveBeenCalled();
	});
});
