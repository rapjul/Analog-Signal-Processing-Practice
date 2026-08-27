/**
 * Testable plotting and playback primitives for the convolution animator.
 *
 * The Svelte component owns controls and browser lifecycle while this module
 * owns deterministic sampling, scaling, geometry, and canvas drawing.
 */

/** Numerical signal evaluator used by the convolution plot. */
export type ConvolutionEvaluator = (time: number) => number;

/** One sampled position shared by the overlap and output panels. */
export interface ConvolutionPlotSample {
	/** Sampled integration or output time. */
	time: number;
	/** Fixed input value. */
	x: number;
	/** Flipped-and-shifted impulse-response value. */
	hShifted: number;
	/** Pointwise overlap product. */
	product: number;
	/** Exact convolution output value. */
	y: number;
}

/** Deterministic data needed to render one animation frame. */
export interface ConvolutionPlotFrame {
	/** Uniform samples over the visible time range. */
	samples: ConvolutionPlotSample[];
	/** Positive amplitude extent for the upper panel. */
	upperAmplitude: number;
	/** Positive amplitude extent for the lower panel. */
	lowerAmplitude: number;
	/** Exact output at the active shift. */
	currentOutput: number;
}

/** Theme colors consumed by the canvas renderer. */
export interface ConvolutionPlotTheme {
	/** Plot background color. */
	background: string;
	/** Primary axis and border color. */
	axis: string;
	/** Secondary grid and full-output color. */
	muted: string;
	/** Canvas annotation color. */
	text: string;
	/** Fixed-signal curve color. */
	fixedSignal?: string;
	/** Moving-signal curve color. */
	movingSignal?: string;
	/** Overlap-product fill color. */
	overlapFill?: string;
	/** Negative overlap-product fill color. */
	overlapNegativeFill?: string;
	/** Convolution-output curve color. */
	output?: string;
	/** Faint complete-output preview color. */
	outputPreview?: string;
	/** Transformed moving-edge guide color. */
	movingEdge?: string;
	/** Current-time guide and point color. */
	currentTime?: string;
}

/** Rectangular geometry for one plot panel. */
export interface ConvolutionPanelGeometry {
	/** Top pixel coordinate. */
	top: number;
	/** Bottom pixel coordinate. */
	bottom: number;
	/** Pixel coordinate of the zero-amplitude axis. */
	zeroY: number;
}

/** Shared responsive geometry for the dual-panel plot. */
export interface ConvolutionPlotGeometry {
	/** Horizontal plot padding. */
	paddingX: number;
	/** Upper overlap panel. */
	upper: ConvolutionPanelGeometry;
	/** Lower output panel. */
	lower: ConvolutionPanelGeometry;
}

/** Configurable renderer inputs for one convolution frame. */
export interface ConvolutionPlotDrawOptions {
	/** CSS-pixel canvas width. */
	width: number;
	/** CSS-pixel canvas height. */
	height: number;
	/** Visible time range. */
	timeRange: [number, number];
	/** Active output time and shift. */
	shift: number;
	/** Finite times at which overlap geometry changes. */
	transitionTimes: number[];
	/** Moving support edges and interior breakpoints in plot coordinates. */
	movingBoundaries?: number[];
	/** Exact fixed-signal discontinuities in upper-panel coordinates. */
	fixedDiscontinuities?: number[];
	/** Exact transformed moving-signal discontinuities in upper-panel coordinates. */
	movingDiscontinuities?: number[];
	/** Sampled signal data. */
	frame: ConvolutionPlotFrame;
	/** Theme colors. */
	theme: ConvolutionPlotTheme;
}

/** Named speed option for the animation control. */
export interface ConvolutionSpeedPreset {
	/** Stable option identifier. */
	id: "slow" | "standard" | "fast";
	/** User-facing option label. */
	label: string;
	/** Shift distance advanced per second. */
	unitsPerSecond: number;
}

/** Slower, instruction-friendly playback presets. */
export const CONVOLUTION_SPEED_PRESETS: ConvolutionSpeedPreset[] = [
	{ id: "slow", label: "Slow", unitsPerSecond: 0.35 },
	{ id: "standard", label: "Standard", unitsPerSecond: 0.65 },
	{ id: "fast", label: "Fast", unitsPerSecond: 1.1 },
];

/** Default animation rate in time-axis units per second. */
export const DEFAULT_CONVOLUTION_SPEED =
	CONVOLUTION_SPEED_PRESETS[1]?.unitsPerSecond ?? 0.65;

/** Returns a finite plotting value, replacing invalid evaluator output with zero. */
function finiteValue(value: number): number {
	return Number.isFinite(value) ? value : 0;
}

/**
 * Normalizes a possibly reversed or degenerate time range.
 *
 * @param timeRange - Candidate visible range.
 * @returns Ascending, nonzero range.
 */
export function normalizeConvolutionTimeRange(
	timeRange: [number, number],
): [number, number] {
	const first = finiteValue(timeRange[0]);
	const second = finiteValue(timeRange[1]);
	if (first === second) return [first - 1, first + 1];
	return first < second ? [first, second] : [second, first];
}

/**
 * Restricts transition markers to distinct finite values in the visible range.
 *
 * @param transitionTimes - Candidate analytical boundaries.
 * @param timeRange - Visible plot range.
 * @returns Sorted visible transition times.
 */
export function getVisibleConvolutionTransitions(
	transitionTimes: number[],
	timeRange: [number, number],
): number[] {
	const [minimum, maximum] = normalizeConvolutionTimeRange(timeRange);
	return [...new Set(transitionTimes)]
		.filter(
			(time) =>
				Number.isFinite(time) && time >= minimum && time <= maximum,
		)
		.sort((left, right) => left - right);
}

/** Transforms original moving-signal breakpoints under the argument `t-tau`. */
export function getMovingConvolutionBoundaries(
	breakpoints: number[],
	shift: number,
	timeRange: [number, number],
): number[] {
	return getVisibleConvolutionTransitions(
		breakpoints.map((breakpoint) => shift - breakpoint),
		timeRange,
	);
}

/**
 * Advances the shift using elapsed time so playback is refresh-rate independent.
 *
 * @param currentShift - Current horizontal shift.
 * @param elapsedSeconds - Time since the previous animation frame.
 * @param unitsPerSecond - Playback rate in time-axis units per second.
 * @param timeRange - Animation loop bounds.
 * @returns Next shift, wrapped to the beginning after the final bound.
 */
export function advanceConvolutionShift(
	currentShift: number,
	elapsedSeconds: number,
	unitsPerSecond: number,
	timeRange: [number, number],
): number {
	const [minimum, maximum] = normalizeConvolutionTimeRange(timeRange);
	const span = maximum - minimum;
	const clampedCurrent = Math.min(
		maximum,
		Math.max(minimum, finiteValue(currentShift)),
	);
	const elapsed = Math.min(0.25, Math.max(0, finiteValue(elapsedSeconds)));
	const speed = Math.max(0, finiteValue(unitsPerSecond));
	const next = clampedCurrent + elapsed * speed;
	if (next <= maximum) return next;
	return minimum + ((next - minimum) % span);
}

/**
 * Samples all signal curves and derives dynamic amplitude scaling.
 *
 * @param evalX - Fixed input evaluator.
 * @param evalH - Impulse-response evaluator before transformation.
 * @param evalY - Exact convolution-output evaluator.
 * @param shift - Active flip-and-shift position.
 * @param timeRange - Visible sample range.
 * @param sampleCount - Number of uniform sample intervals.
 * @returns Complete deterministic plot frame.
 */
export function sampleConvolutionPlot(
	evalX: ConvolutionEvaluator,
	evalH: ConvolutionEvaluator,
	evalY: ConvolutionEvaluator,
	shift: number,
	timeRange: [number, number],
	sampleCount = 420,
): ConvolutionPlotFrame {
	const [minimum, maximum] = normalizeConvolutionTimeRange(timeRange);
	const count = Math.max(2, Math.floor(finiteValue(sampleCount)));
	const step = (maximum - minimum) / count;
	const samples = Array.from({ length: count + 1 }, (_, index) => {
		const time = minimum + index * step;
		const x = finiteValue(evalX(time));
		const hShifted = finiteValue(evalH(shift - time));
		const product = finiteValue(x * hShifted);
		return {
			time,
			x,
			hShifted,
			product,
			y: finiteValue(evalY(time)),
		};
	});
	const upperMaximum = Math.max(
		1,
		...samples.flatMap(({ x, hShifted, product }) => [
			Math.abs(x),
			Math.abs(hShifted),
			Math.abs(product),
		]),
	);
	const lowerMaximum = Math.max(1, ...samples.map(({ y }) => Math.abs(y)));
	return {
		samples,
		upperAmplitude: upperMaximum * 1.12,
		lowerAmplitude: lowerMaximum * 1.12,
		currentOutput: finiteValue(evalY(shift)),
	};
}

/**
 * Computes responsive dual-panel geometry.
 *
 * @param width - CSS-pixel canvas width.
 * @param height - CSS-pixel canvas height.
 * @returns Panel and axis coordinates.
 */
export function createConvolutionPlotGeometry(
	width: number,
	height: number,
): ConvolutionPlotGeometry {
	const paddingX = width < 420 ? 28 : 40;
	const paddingY = 34;
	const gap = 42;
	const panelHeight = Math.max(64, (height - paddingY * 2 - gap) / 2);
	const upperTop = paddingY;
	const upperBottom = upperTop + panelHeight;
	const lowerTop = upperBottom + gap;
	const lowerBottom = lowerTop + panelHeight;
	return {
		paddingX,
		upper: {
			top: upperTop,
			bottom: upperBottom,
			zeroY: upperBottom - 16,
		},
		lower: {
			top: lowerTop,
			bottom: lowerBottom,
			zeroY: lowerBottom - 16,
		},
	};
}

/**
 * Builds a coordinate converter from plot time to horizontal pixels.
 *
 * @param timeRange - Visible time range.
 * @param width - CSS-pixel canvas width.
 * @param paddingX - Horizontal plot padding.
 * @returns Time-to-pixel converter.
 */
function createTimeToX(
	timeRange: [number, number],
	width: number,
	paddingX: number,
): (time: number) => number {
	const [minimum, maximum] = normalizeConvolutionTimeRange(timeRange);
	return (time: number): number =>
		paddingX +
		((time - minimum) / (maximum - minimum)) * (width - paddingX * 2);
}

/**
 * Draws one polyline from sampled values.
 *
 * @param context - Canvas drawing context.
 * @param samples - Uniform plot samples.
 * @param valueForSample - Vertical value selector.
 * @param toX - Horizontal coordinate converter.
 * @param zeroY - Zero-amplitude pixel coordinate.
 * @param scaleY - Pixels per amplitude unit.
 * @param color - Stroke color.
 * @param lineWidth - Stroke width.
 * @param maximumTime - Optional inclusive reveal boundary.
 */
function drawSampleCurve(
	context: CanvasRenderingContext2D,
	samples: ConvolutionPlotSample[],
	valueForSample: (sample: ConvolutionPlotSample) => number,
	toX: (time: number) => number,
	zeroY: number,
	scaleY: number,
	color: string,
	lineWidth: number,
	maximumTime = Number.POSITIVE_INFINITY,
	discontinuities: number[] = [],
): void {
	context.strokeStyle = color;
	context.lineWidth = lineWidth;
	context.beginPath();
	let started = false;
	let previous: ConvolutionPlotSample | undefined;
	const boundaries = [...new Set(discontinuities)]
		.filter((time) => Number.isFinite(time) && time <= maximumTime)
		.sort((left, right) => left - right);
	for (const sample of samples) {
		if (sample.time > maximumTime) break;
		const x = toX(sample.time);
		const y = zeroY - valueForSample(sample) * scaleY;
		if (!started) {
			context.moveTo(x, y);
			started = true;
		} else {
			for (const boundary of boundaries) {
				if (
					!previous ||
					boundary <= previous.time ||
					boundary > sample.time
				)
					continue;
				context.lineTo(
					toX(boundary),
					zeroY - valueForSample(previous) * scaleY,
				);
				context.lineTo(
					toX(boundary),
					zeroY - valueForSample(sample) * scaleY,
				);
			}
			context.lineTo(x, y);
		}
		previous = sample;
	}
	if (started) context.stroke();
}

/**
 * Draws shared axes, guide ticks, and zero-time markers.
 *
 * @param context - Canvas drawing context.
 * @param options - Plot frame and geometry inputs.
 * @param geometry - Computed dual-panel geometry.
 * @param toX - Horizontal coordinate converter.
 */
function drawAxes(
	context: CanvasRenderingContext2D,
	options: ConvolutionPlotDrawOptions,
	geometry: ConvolutionPlotGeometry,
	toX: (time: number) => number,
): void {
	const { width, timeRange, theme } = options;
	context.strokeStyle = theme.axis;
	context.lineWidth = 1;
	for (const panel of [geometry.upper, geometry.lower]) {
		context.beginPath();
		context.moveTo(geometry.paddingX, panel.zeroY);
		context.lineTo(width - geometry.paddingX, panel.zeroY);
		context.stroke();
	}
	const [minimum, maximum] = normalizeConvolutionTimeRange(timeRange);
	context.fillStyle = theme.text;
	context.font = "11px system-ui, sans-serif";
	context.textAlign = "center";
	for (let index = 0; index <= 4; index += 1) {
		const time = minimum + ((maximum - minimum) * index) / 4;
		const x = toX(time);
		context.strokeStyle = theme.muted;
		context.setLineDash([2, 5]);
		context.beginPath();
		context.moveTo(x, geometry.upper.top);
		context.lineTo(x, geometry.upper.bottom);
		context.moveTo(x, geometry.lower.top);
		context.lineTo(x, geometry.lower.bottom);
		context.stroke();
		context.fillText(
			Number.isInteger(time) ? String(time) : time.toFixed(1),
			x,
			geometry.lower.bottom + 13,
		);
	}
	context.setLineDash([]);
}

/**
 * Draws shaded overlap product and the two upper-panel signals.
 *
 * @param context - Canvas drawing context.
 * @param options - Plot frame and renderer inputs.
 * @param geometry - Computed dual-panel geometry.
 * @param toX - Horizontal coordinate converter.
 */
function drawOverlapPanel(
	context: CanvasRenderingContext2D,
	options: ConvolutionPlotDrawOptions,
	geometry: ConvolutionPlotGeometry,
	toX: (time: number) => number,
): void {
	const { frame } = options;
	const scaleY =
		(geometry.upper.zeroY - geometry.upper.top - 8) / frame.upperAmplitude;
	for (let index = 1; index < frame.samples.length; index += 1) {
		const previous = frame.samples[index - 1];
		const sample = frame.samples[index];
		if (!previous || !sample) continue;
		const averageProduct = (previous.product + sample.product) / 2;
		context.fillStyle =
			averageProduct < 0
				? (options.theme.overlapNegativeFill ??
					"rgba(244, 63, 94, 0.3)")
				: (options.theme.overlapFill ?? "rgba(16, 185, 129, 0.3)");
		context.beginPath();
		context.moveTo(toX(previous.time), geometry.upper.zeroY);
		context.lineTo(
			toX(previous.time),
			geometry.upper.zeroY - previous.product * scaleY,
		);
		context.lineTo(
			toX(sample.time),
			geometry.upper.zeroY - sample.product * scaleY,
		);
		context.lineTo(toX(sample.time), geometry.upper.zeroY);
		context.closePath();
		context.fill();
	}
	drawSampleCurve(
		context,
		frame.samples,
		({ x }) => x,
		toX,
		geometry.upper.zeroY,
		scaleY,
		options.theme.fixedSignal ?? "#3b82f6",
		2.2,
		Number.POSITIVE_INFINITY,
		options.fixedDiscontinuities,
	);
	drawSampleCurve(
		context,
		frame.samples,
		({ hShifted }) => hShifted,
		toX,
		geometry.upper.zeroY,
		scaleY,
		options.theme.movingSignal ?? "#f97316",
		2.2,
		Number.POSITIVE_INFINITY,
		options.movingDiscontinuities,
	);
}

/**
 * Draws analytical transition markers and the revealed output curve.
 *
 * @param context - Canvas drawing context.
 * @param options - Plot frame and renderer inputs.
 * @param geometry - Computed dual-panel geometry.
 * @param toX - Horizontal coordinate converter.
 */
function drawOutputPanel(
	context: CanvasRenderingContext2D,
	options: ConvolutionPlotDrawOptions,
	geometry: ConvolutionPlotGeometry,
	toX: (time: number) => number,
): void {
	const { frame, shift, transitionTimes, timeRange } = options;
	const scaleY =
		(geometry.lower.zeroY - geometry.lower.top - 8) / frame.lowerAmplitude;
	context.strokeStyle = "rgba(6, 182, 212, 0.3)";
	context.setLineDash([5, 5]);
	for (const transition of getVisibleConvolutionTransitions(
		transitionTimes,
		timeRange,
	)) {
		const x = toX(transition);
		context.beginPath();
		context.moveTo(x, geometry.lower.top);
		context.lineTo(x, geometry.lower.bottom);
		context.stroke();
	}
	context.setLineDash([]);
	context.strokeStyle = options.theme.movingEdge ?? "#a855f7";
	context.setLineDash([4, 4]);
	for (const boundary of options.movingBoundaries ?? []) {
		const x = toX(boundary);
		context.beginPath();
		context.moveTo(x, geometry.lower.top);
		context.lineTo(x, geometry.lower.bottom);
		context.stroke();
	}
	context.setLineDash([]);
	drawSampleCurve(
		context,
		frame.samples,
		({ y }) => y,
		toX,
		geometry.lower.zeroY,
		scaleY,
		options.theme.outputPreview ?? "rgba(6, 182, 212, 0.28)",
		1.5,
	);
	drawSampleCurve(
		context,
		frame.samples,
		({ y }) => y,
		toX,
		geometry.lower.zeroY,
		scaleY,
		options.theme.output ?? "#06b6d4",
		2.8,
		shift,
	);
	const currentX = toX(shift);
	const currentY = geometry.lower.zeroY - frame.currentOutput * scaleY;
	context.strokeStyle = options.theme.currentTime ?? "#f59e0b";
	context.setLineDash([4, 4]);
	context.beginPath();
	context.moveTo(currentX, geometry.lower.top);
	context.lineTo(currentX, geometry.lower.bottom);
	context.stroke();
	context.setLineDash([]);
	context.fillStyle = options.theme.currentTime ?? "#f59e0b";
	context.beginPath();
	context.arc(currentX, currentY, 5, 0, Math.PI * 2);
	context.fill();
}

/**
 * Renders one complete convolution animation frame.
 *
 * @param context - Canvas drawing context scaled to CSS pixels.
 * @param options - Plot data, theme, and dimensions.
 */
export function drawConvolutionPlot(
	context: CanvasRenderingContext2D,
	options: ConvolutionPlotDrawOptions,
): void {
	const geometry = createConvolutionPlotGeometry(
		options.width,
		options.height,
	);
	const toX = createTimeToX(
		options.timeRange,
		options.width,
		geometry.paddingX,
	);
	context.fillStyle = options.theme.background;
	context.fillRect(0, 0, options.width, options.height);
	drawAxes(context, options, geometry, toX);
	drawOverlapPanel(context, options, geometry, toX);
	drawOutputPanel(context, options, geometry, toX);
}
