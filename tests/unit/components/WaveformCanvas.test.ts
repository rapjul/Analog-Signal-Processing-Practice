/** Accessible numerical alternatives to waveform plots. */
import { cleanup, fireEvent, render, within } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import WaveformCanvas from "$lib/components/canvas/WaveformCanvas.svelte";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

/** @returns A canvas context spy for inspecting drawn coordinates. */
function mockCanvas() {
	const context = {
		scale: vi.fn(),
		fillRect: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		fillText: vi.fn(),
		setLineDash: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn(),
	};
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
		context as unknown as CanvasRenderingContext2D,
	);
	return context;
}

/** All curves use the same sampled time for mouse, touch, and keyboard inspection. */
it("samples every curve and clamps pointer input with reversed endpoints", async () => {
	mockCanvas();
	/** @param time Sample time. @returns Total response. */
	const total = vi.fn((time: number): number => time * 2);
	const view = render(WaveformCanvas, {
		tRange: [10, 0],
		curves: [
			{
				label: "Total",
				color: "red",
				eval: total,
			},
			{
				label: "Zero-Input",
				color: "green",
				/** @param time Sample time. @returns Natural response. */ eval: (
					time: number,
				): number => -time,
			},
			{
				label: "Zero-State",
				color: "blue",
				/** @param time Sample time. @returns Forced response. */ eval: (
					time: number,
				): number => time * 3,
			},
		],
	});
	const canvas = view.container.querySelector("canvas")!;
	vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
		left: 10,
		width: 280,
	} as DOMRect);
	const capture = vi.fn();
	Object.defineProperty(canvas, "setPointerCapture", { value: capture });
	expect(canvas.dataset.visualReady).toBe("true");
	total.mockClear();
	await fireEvent.pointerMove(canvas, {
		clientX: 150,
		pointerId: 1,
		pointerType: "mouse",
	});
	// Pointer movement must only evaluate the selected time, regardless of reuse.
	expect(new Set(total.mock.calls.flat())).toEqual(new Set([5]));
	const readout = view.container.querySelector(".waveform-readout")!;
	expect(readout.textContent).toContain("5.0000 s");
	expect(
		[...readout.querySelectorAll("dd")].map((cell) => cell.textContent),
	).toEqual(["10.000", "-5.0000", "15.000"]);
	await fireEvent.pointerDown(canvas, {
		clientX: 1000,
		pointerId: 2,
		pointerType: "touch",
	});
	expect(capture).toHaveBeenCalledWith(2);
	expect(readout.textContent).toContain("10.000 s");
	await fireEvent.pointerMove(canvas, {
		clientX: -20,
		pointerId: 2,
		pointerType: "touch",
	});
	expect(readout.textContent).toContain("0.0000 s");
	const slider = view.getByRole("slider", { name: "Inspect waveform time" });
	await fireEvent.input(slider, { target: { value: "2.5" } });
	expect(slider.getAttribute("aria-valuetext")).toContain("Total: 5.0000");
	expect(readout.textContent).toContain("2.5000 s");
	expect(canvas.nextElementSibling).toBe(
		view.getByRole("group", { name: "Plot legend" }),
	);
});

/** A single instant stays readable and draws a marker at a finite coordinate. */
it("plots one centered sample and disables the slider for equal endpoints", () => {
	const context = mockCanvas();
	vi.spyOn(
		HTMLCanvasElement.prototype,
		"getBoundingClientRect",
	).mockReturnValue({
		width: 280,
		height: 200,
	} as DOMRect);
	const view = render(WaveformCanvas, {
		tRange: [2, 2],
		curves: [{ label: "Response", color: "red", eval: Math.abs }],
	});
	const slider = view.getByRole("slider");
	expect(slider).toHaveProperty("disabled", true);
	expect(slider).toHaveProperty("value", "2");
	expect(view.container.querySelectorAll("tbody tr")).toHaveLength(1);
	expect(context.fillText.mock.calls).toEqual([["2.0s", 140, 176]]);
	const [x, y] = context.arc.mock.calls[0] ?? [];
	expect(x).toBe(140);
	expect(Number.isFinite(y)).toBe(true);
});

/** Numerical samples share plot parameters and IDs remain unique across instances. */
it("provides eleven samples and a unique canvas description", () => {
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
	const props = {
		tRange: [0, 10] as [number, number],
		curves: [
			{
				label: "Response",
				color: "red",
				/** @param time Time coordinate. @returns Sample amplitude. */ eval: (
					time: number,
				): number => (time === 10 ? Infinity : time * 2),
			},
		],
	};
	const first = render(WaveformCanvas, props);
	const second = render(WaveformCanvas, props);
	expect(first.container.querySelectorAll("tbody tr")).toHaveLength(11);
	expect(first.container.querySelector("tbody")?.textContent).toContain(
		"Outside finite plotting range",
	);
	const id = first.container
		.querySelector("canvas")
		?.getAttribute("aria-describedby");
	const description = first.container.querySelector("p.sr-only");
	expect(description?.id).toBe(id);
	expect(description?.textContent).not.toContain(
		"Outside finite plotting range",
	);
	expect(
		second.container
			.querySelector("canvas")
			?.getAttribute("aria-describedby"),
	).not.toBe(id);
	const region = within(first.container).getByRole("region", {
		name: "View approximate waveform values",
		hidden: true,
	});
	expect(region.tabIndex).toBe(0);
	expect(region.getAttribute("style")).toBeNull();
});
