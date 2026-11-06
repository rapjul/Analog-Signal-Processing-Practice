/** Accessible numerical alternatives to waveform plots. */
import { cleanup, fireEvent, render, within } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import WaveformCanvas from "$lib/components/canvas/WaveformCanvas.svelte";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

/** All curves use the same sampled time for mouse, touch, and keyboard inspection. */
it("samples every curve through pointer and keyboard input and clamps plot edges", async () => {
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
	const view = render(WaveformCanvas, {
		tRange: [0, 10],
		curves: [
			{
				label: "Total",
				color: "red",
				/** @param time Sample time. @returns Total response. */ eval: (
					time: number,
				): number => time * 2,
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
	await fireEvent.pointerMove(canvas, {
		clientX: 150,
		pointerId: 1,
		pointerType: "mouse",
	});
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
	expect(canvas.nextElementSibling?.classList.contains("legend")).toBe(true);
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
