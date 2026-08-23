import { describe, expect, it, vi } from "vitest";
import {
	advanceConvolutionShift,
	CONVOLUTION_SPEED_PRESETS,
	createConvolutionPlotGeometry,
	DEFAULT_CONVOLUTION_SPEED,
	drawConvolutionPlot,
	getMovingConvolutionBoundaries,
	getVisibleConvolutionTransitions,
	normalizeConvolutionTimeRange,
	sampleConvolutionPlot,
} from "$lib/components/canvas/convolution-plot";

/** Creates a complete spy-based 2D context for renderer assertions. */
function createMockContext(): CanvasRenderingContext2D {
	return {
		arc: vi.fn(),
		beginPath: vi.fn(),
		closePath: vi.fn(),
		fill: vi.fn(),
		fillRect: vi.fn(),
		fillText: vi.fn(),
		lineTo: vi.fn(),
		moveTo: vi.fn(),
		setLineDash: vi.fn(),
		stroke: vi.fn(),
		fillStyle: "",
		font: "",
		lineWidth: 1,
		strokeStyle: "",
		textAlign: "start",
	} as unknown as CanvasRenderingContext2D;
}

describe("convolution plot model", () => {
	it("defines a slower instructional default with ordered speed presets", () => {
		expect(CONVOLUTION_SPEED_PRESETS.map(({ id }) => id)).toEqual([
			"slow",
			"standard",
			"fast",
		]);
		expect(DEFAULT_CONVOLUTION_SPEED).toBe(0.65);
		expect(CONVOLUTION_SPEED_PRESETS[0].unitsPerSecond).toBeLessThan(
			DEFAULT_CONVOLUTION_SPEED,
		);
		expect(CONVOLUTION_SPEED_PRESETS[2].unitsPerSecond).toBeGreaterThan(
			DEFAULT_CONVOLUTION_SPEED,
		);
	});

	it("normalizes reversed, degenerate, and non-finite ranges", () => {
		expect(normalizeConvolutionTimeRange([5, -1])).toEqual([-1, 5]);
		expect(normalizeConvolutionTimeRange([2, 2])).toEqual([1, 3]);
		expect(
			normalizeConvolutionTimeRange([
				Number.POSITIVE_INFINITY,
				Number.NaN,
			]),
		).toEqual([-1, 1]);
	});

	it("filters, deduplicates, and sorts visible transition markers", () => {
		expect(
			getVisibleConvolutionTransitions(
				[3, -5, 1, 3, Number.NaN, Number.POSITIVE_INFINITY, 0],
				[4, 0],
			),
		).toEqual([0, 1, 3]);
	});

	it("transforms, clips, sorts, and deduplicates moving boundaries", () => {
		expect(
			getMovingConvolutionBoundaries(
				[-2, 0, 2, 2, Number.NaN],
				3,
				[0, 6],
			),
		).toEqual([1, 3, 5]);
		expect(getMovingConvolutionBoundaries([10], 0, [-1, 1])).toEqual([]);
	});

	it("advances independently of refresh rate and handles clamping and wrapping", () => {
		expect(advanceConvolutionShift(0, 0.1, 2, [0, 4])).toBeCloseTo(0.2);
		expect(advanceConvolutionShift(0, 5, 2, [0, 4])).toBeCloseTo(0.5);
		expect(advanceConvolutionShift(3.9, 0.2, 1, [0, 4])).toBeCloseTo(0.1);
		expect(advanceConvolutionShift(-8, -1, -2, [0, 4])).toBe(0);
		expect(
			advanceConvolutionShift(Number.NaN, Number.NaN, Number.NaN, [4, 0]),
		).toBe(0);
	});

	it("samples transformed signals, output, and adaptive amplitude extents", () => {
		const frame = sampleConvolutionPlot(
			(time) => (time >= 0 ? 2 : 0),
			(time) => (time >= 0 ? -3 : 0),
			(time) => time * 4,
			1,
			[-1, 1],
			4,
		);
		expect(frame.samples).toHaveLength(5);
		expect(frame.samples[2]).toMatchObject({
			time: 0,
			x: 2,
			hShifted: -3,
			product: -6,
			y: 0,
		});
		expect(frame.upperAmplitude).toBeCloseTo(6.72);
		expect(frame.lowerAmplitude).toBeCloseTo(4.48);
		expect(frame.currentOutput).toBe(4);
	});

	it("sanitizes invalid evaluator values and undersized sample counts", () => {
		const frame = sampleConvolutionPlot(
			() => Number.NaN,
			() => Number.POSITIVE_INFINITY,
			() => Number.NEGATIVE_INFINITY,
			0,
			[0, 0],
			Number.NaN,
		);
		expect(frame.samples).toHaveLength(3);
		expect(
			frame.samples.every(({ x, hShifted, product, y }) =>
				[x, hShifted, product, y].every((value) => value === 0),
			),
		).toBe(true);
		expect(frame.upperAmplitude).toBe(1.12);
		expect(frame.lowerAmplitude).toBe(1.12);
	});

	it("uses fluid geometry for narrow and wide canvases", () => {
		const narrow = createConvolutionPlotGeometry(320, 360);
		const wide = createConvolutionPlotGeometry(900, 360);
		const short = createConvolutionPlotGeometry(320, 100);
		expect(narrow.paddingX).toBe(28);
		expect(wide.paddingX).toBe(40);
		expect(narrow.lower.top).toBeGreaterThan(narrow.upper.bottom);
		expect(short.upper.bottom - short.upper.top).toBe(64);
	});

	it("draws axes, overlap, full response, reveal, markers, and current point", () => {
		const context = createMockContext();
		const frame = sampleConvolutionPlot(
			(time) => (time >= 0 && time <= 1 ? 1 : 0),
			(time) => (time >= 0 && time <= 1 ? 1 : 0),
			(time) => Math.max(0, 1 - Math.abs(time - 1)),
			0.75,
			[-1, 3],
			8,
		);
		drawConvolutionPlot(context, {
			width: 640,
			height: 360,
			timeRange: [-1, 3],
			shift: 0.75,
			transitionTimes: [0, 1, 2, 9],
			movingBoundaries: [-0.25, 0.75, 1.75],
			frame,
			theme: {
				background: "black",
				axis: "gray",
				muted: "darkgray",
				text: "white",
			},
		});

		expect(context.fillRect).toHaveBeenCalledWith(0, 0, 640, 360);
		expect(context.fillText).toHaveBeenCalledTimes(5);
		expect(context.closePath).toHaveBeenCalled();
		expect(context.fill).toHaveBeenCalledTimes(2);
		expect(context.arc).toHaveBeenCalledTimes(1);
		expect(context.stroke).toHaveBeenCalled();
		expect(context.setLineDash).toHaveBeenCalledWith([5, 5]);
		expect(context.setLineDash).toHaveBeenCalledWith([4, 4]);
	});

	it("renders safely when the reveal boundary precedes every output sample", () => {
		const context = createMockContext();
		const frame = sampleConvolutionPlot(
			() => 0,
			() => 0,
			() => 0,
			-2,
			[0, 2],
			2,
		);
		drawConvolutionPlot(context, {
			width: 320,
			height: 120,
			timeRange: [0, 2],
			shift: -2,
			transitionTimes: [],
			frame,
			theme: {
				background: "black",
				axis: "gray",
				muted: "darkgray",
				text: "white",
			},
		});
		expect(context.arc).toHaveBeenCalled();
		expect(context.fillRect).toHaveBeenCalled();
	});

	it("keeps the renderer defensive when supplied an empty sampled frame", () => {
		const context = createMockContext();
		drawConvolutionPlot(context, {
			width: 320,
			height: 160,
			timeRange: [-1, 1],
			shift: 0,
			transitionTimes: [],
			frame: {
				samples: [],
				upperAmplitude: 1,
				lowerAmplitude: 1,
				currentOutput: 0,
			},
			theme: {
				background: "black",
				axis: "gray",
				muted: "darkgray",
				text: "white",
			},
		});
		expect(context.moveTo).toHaveBeenCalled();
		expect(context.arc).toHaveBeenCalled();
	});
});
