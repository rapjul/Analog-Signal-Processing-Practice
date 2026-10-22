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
		clip: vi.fn(),
		rect: vi.fn(),
		save: vi.fn(),
		restore: vi.fn(),
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
	/** Every signed curve is contained by the panel being rendered, even on short canvases. */
	it.each([100, 160, 360])(
		"keeps signed curves and the current output inside panels at height %s",
		/** @param height - Canvas height in CSS pixels. */ (height) => {
			const context = createMockContext();
			let bounds: [number, number] | undefined;
			vi.mocked(context.rect).mockImplementation(
				/** @param x - Clip origin. @param y - Clip top. @param width - Clip width. @param size - Clip height. */ (
					x,
					y,
					width,
					size,
				) => {
					bounds = [y, y + size];
				},
			);
			vi.mocked(context.restore).mockImplementation(
				/** Clears the active panel clip. */ () => {
					bounds = undefined;
				},
			);
			for (const method of [context.moveTo, context.lineTo, context.arc])
				vi.mocked(method).mockImplementation(
					/** @param x - Drawing coordinate. @param y - Drawing height. */ (
						x,
						y,
					) => {
						if (!bounds) return;
						expect(y).toBeGreaterThanOrEqual(bounds[0]);
						expect(y).toBeLessThanOrEqual(bounds[1]);
					},
				);
			const frame = sampleConvolutionPlot(
				/** @param t - Time. @returns Signed input. */ (t) => t * 3,
				/** @param t - Time. @returns Opposite-signed input. */ (t) =>
					-t * 2,
				/** @param t - Time. @returns Output with a narrow peak. */ (
					t,
				) => (t === 0.13 ? -100 : t),
				0.13,
				[-1, 1],
				8,
			);
			expect(frame.lowerAmplitude).toBeCloseTo(112);
			drawConvolutionPlot(context, {
				width: 320,
				height,
				timeRange: [-1, 1],
				shift: 0.13,
				transitionTimes: [-0.5, 0.5],
				frame,
				theme: {
					background: "black",
					axis: "gray",
					muted: "gray",
					text: "white",
				},
			});
			expect(context.clip).toHaveBeenCalledTimes(2);
			expect(context.save).toHaveBeenCalledTimes(2);
			expect(context.restore).toHaveBeenCalledTimes(2);
		},
	);
	it("defines a slower instructional default with ordered speed presets", () => {
		expect(CONVOLUTION_SPEED_PRESETS.map(({ id }) => id)).toEqual([
			"slow",
			"standard",
			"fast",
		]);
		expect(DEFAULT_CONVOLUTION_SPEED).toBe(0.65);
		expect(CONVOLUTION_SPEED_PRESETS[0]!.unitsPerSecond).toBeLessThan(
			DEFAULT_CONVOLUTION_SPEED,
		);
		expect(CONVOLUTION_SPEED_PRESETS[2]!.unitsPerSecond).toBeGreaterThan(
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
		expect(short.upper.top).toBeGreaterThanOrEqual(0);
		expect(short.lower.bottom).toBeLessThan(100);
		expect(short.upper.zeroY).toBe(
			(short.upper.top + short.upper.bottom) / 2,
		);
	});

	it("draws axes, overlap, full response, reveal, markers, and current point", () => {
		const context = createMockContext();
		const strokeStyles: string[] = [];
		const fillStyles: string[] = [];
		Object.defineProperty(context, "strokeStyle", {
			get: () => strokeStyles.at(-1) ?? "",
			set: (value: string) => strokeStyles.push(value),
		});
		Object.defineProperty(context, "fillStyle", {
			get: () => fillStyles.at(-1) ?? "",
			set: (value: string) => fillStyles.push(value),
		});
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
			fixedDiscontinuities: [0, 1],
			movingDiscontinuities: [-0.25, 0.75],
			frame,
			theme: {
				background: "black",
				axis: "gray",
				muted: "darkgray",
				text: "white",
				fixedSignal: "fixed-blue",
				movingSignal: "moving-orange",
				overlapFill: "overlap-green",
				overlapNegativeFill: "overlap-rose",
				output: "output-cyan",
				outputPreview: "output-preview-cyan",
				movingEdge: "edge-purple",
				currentTime: "time-amber",
			},
		});

		expect(context.fillRect).toHaveBeenCalledWith(0, 0, 640, 360);
		expect(context.fillText).toHaveBeenCalledTimes(5);
		expect(context.closePath).toHaveBeenCalled();
		expect(context.fill).toHaveBeenCalledTimes(9);
		expect(context.arc).toHaveBeenCalledTimes(1);
		expect(context.stroke).toHaveBeenCalled();
		expect(context.setLineDash).toHaveBeenCalledWith([5, 5]);
		expect(context.setLineDash).toHaveBeenCalledWith([4, 4]);
		expect(strokeStyles).toEqual(
			expect.arrayContaining([
				"fixed-blue",
				"moving-orange",
				"output-cyan",
				"output-preview-cyan",
				"edge-purple",
				"time-amber",
			]),
		);
		expect(fillStyles).toContain("overlap-green");
		expect(fillStyles).not.toContain("overlap-rose");
		const geometry = createConvolutionPlotGeometry(640, 360);
		const movingEdgeX = 40 + ((1.75 - -1) / 4) * 560;
		expect(context.moveTo).toHaveBeenCalledWith(
			movingEdgeX,
			geometry.lower.top,
		);
		expect(context.moveTo).not.toHaveBeenCalledWith(
			movingEdgeX,
			geometry.upper.top,
		);
		const fixedEdgeX = 40 + ((0 - -1) / 4) * 560;
		expect(
			vi
				.mocked(context.lineTo)
				.mock.calls.filter(([x]) => x === fixedEdgeX).length,
		).toBeGreaterThanOrEqual(2);
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

	it("uses a distinct configurable fill for negative overlap products", () => {
		const context = createMockContext();
		const fillStyles: string[] = [];
		Object.defineProperty(context, "fillStyle", {
			get: () => fillStyles.at(-1) ?? "",
			set: (value: string) => fillStyles.push(value),
		});
		const frame = sampleConvolutionPlot(
			() => 2,
			() => -3,
			() => -1,
			0,
			[-1, 1],
			4,
		);
		drawConvolutionPlot(context, {
			width: 320,
			height: 160,
			timeRange: [-1, 1],
			shift: 0,
			transitionTimes: [],
			frame,
			theme: {
				background: "black",
				axis: "gray",
				muted: "darkgray",
				text: "white",
				overlapNegativeFill: "negative-rose",
			},
		});
		expect(fillStyles).toContain("negative-rose");
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
