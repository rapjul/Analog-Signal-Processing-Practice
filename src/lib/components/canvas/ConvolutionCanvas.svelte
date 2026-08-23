<script lang="ts">
	/**
	 * Interactive convolution animator with synchronized overlap and output plots.
	 *
	 * Rendering math lives in convolution-plot.ts so controls and drawing evolve independently.
	 */

	import { onMount } from "svelte";
	import {
		advanceConvolutionShift,
		CONVOLUTION_SPEED_PRESETS,
		DEFAULT_CONVOLUTION_SPEED,
		drawConvolutionPlot,
		getMovingConvolutionBoundaries,
		normalizeConvolutionTimeRange,
		sampleConvolutionPlot,
	} from "$lib/components/canvas/convolution-plot";
	import MathInline from "$lib/components/math/MathInline.svelte";
	import MathText from "$lib/components/math/MathText.svelte";

	/** Public properties for the convolution animator. */
	interface Props {
		/** Signal x(tau) evaluator. */
		evalX?: (tau: number) => number;
		/** Signal h(tau) evaluator. */
		evalH?: (tau: number) => number;
		/** Exact convolution output evaluator. */
		evalY?: (time: number) => number;
		/** Graph heading. */
		title?: string;
		/** Visible tau and output-time bounds. */
		timeRange?: [number, number];
		/** Finite analytical boundaries where overlap geometry changes. */
		transitionTimes?: number[];
		/** Initial animation rate in time-axis units per second. */
		animationSpeed?: number;
		/** Uniform sample count for both plot panels. */
		sampleCount?: number;
		/** Signal selected as the moving flip-and-shift signal. */
		flippedSignal?: "x" | "h";
		/** Support edges and interior breakpoints of the moving signal. */
		movingBreakpoints?: number[];
	}

	let {
		evalX = (tau: number) => (tau >= 0 && tau < 2 ? 1 : 0),
		evalH = (tau: number) => (tau >= 0 && tau < 2 ? 1 : 0),
		evalY = (time: number) => {
			if (time < 0 || time >= 4) return 0;
			if (time < 2) return time;
			return 4 - time;
		},
		title = "Graphical Flip-and-Shift Convolution Animator",
		timeRange = [-2, 6],
		transitionTimes = [0, 2, 4],
		animationSpeed = DEFAULT_CONVOLUTION_SPEED,
		sampleCount = 420,
		flippedSignal = "h",
		movingBreakpoints = [],
	}: Props = $props();
	const fixedEvaluator = $derived(flippedSignal === "x" ? evalH : evalX);
	const movingEvaluator = $derived(flippedSignal === "x" ? evalX : evalH);
	const fixedLabel = $derived(flippedSignal === "x" ? "h" : "x");
	const movingLabel = $derived(flippedSignal);

	/** Normalized bounds used by drawing and controls. */
	const normalizedTimeRange = $derived(
		normalizeConvolutionTimeRange(timeRange),
	);
	/** Active output time and signal shift. */
	let shiftT = $state(0);
	/** Whether requestAnimationFrame playback is active. */
	let isPlaying = $state(false);
	/** User-selected animation rate. */
	let playbackSpeed = $state(DEFAULT_CONVOLUTION_SPEED);
	/** Whether reactive props have initialized local interactive state. */
	let hasInitializedControls = false;
	/** Active animation-frame request identifier. */
	let animationFrameId: number | null = null;
	/** Timestamp of the previous animation frame. */
	let previousTimestamp: number | null = null;
	/** Bound canvas element. */
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	/** Reactive invalidation counter for container resizes. */
	let resizeVersion = $state(0);
	/** Reactive invalidation counter for theme changes. */
	let themeVersion = $state(0);
	/** Exact current output displayed beside the controls. */
	const currentOutput = $derived(evalY(shiftT));

	$effect(() => {
		if (hasInitializedControls) return;
		shiftT = normalizedTimeRange[0];
		playbackSpeed = animationSpeed;
		hasInitializedControls = true;
	});

	/** Stops playback and clears its pending browser frame. */
	function stopAnimation(): void {
		isPlaying = false;
		previousTimestamp = null;
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	/**
	 * Advances time using real elapsed duration and queues the next frame.
	 * @param timestamp - Browser animation timestamp in milliseconds.
	 */
	function animate(timestamp: number): void {
		if (!isPlaying) return;
		const elapsedSeconds =
			previousTimestamp === null
				? 0
				: (timestamp - previousTimestamp) / 1000;
		previousTimestamp = timestamp;
		shiftT = advanceConvolutionShift(
			shiftT,
			elapsedSeconds,
			playbackSpeed,
			normalizedTimeRange,
		);
		animationFrameId = requestAnimationFrame(animate);
	}

	/** Toggles time-based convolution playback. */
	function togglePlay(): void {
		if (isPlaying) {
			stopAnimation();
			return;
		}
		isPlaying = true;
		previousTimestamp = null;
		animationFrameId = requestAnimationFrame(animate);
	}

	/** Returns the plot to the beginning of its visible time range. */
	function restartAnimation(): void {
		stopAnimation();
		shiftT = normalizedTimeRange[0];
	}

	/** Pauses playback when the student manually scrubs the timeline. */
	function handleManualScrub(): void {
		if (isPlaying) stopAnimation();
	}

	/** Invalidates canvas drawing after the containing layout changes. */
	function handleResize(): void {
		resizeVersion += 1;
	}

	/** Invalidates canvas drawing after the application theme changes. */
	function handleThemeChange(): void {
		themeVersion += 1;
	}

	onMount(() => {
		const resizeObserver =
			typeof ResizeObserver === "undefined"
				? null
				: new ResizeObserver(handleResize);
		if (canvasEl) resizeObserver?.observe(canvasEl);
		window.addEventListener("resize", handleResize);
		window.addEventListener("themechange", handleThemeChange);
		return () => {
			stopAnimation();
			resizeObserver?.disconnect();
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("themechange", handleThemeChange);
		};
	});

	$effect(() => {
		if (!canvasEl) return;
		void resizeVersion;
		void themeVersion;
		const context = canvasEl.getContext("2d");
		if (!context) return;
		const bounds = canvasEl.getBoundingClientRect();
		if (bounds.width <= 0 || bounds.height <= 0) return;
		const pixelRatio = window.devicePixelRatio || 1;
		canvasEl.width = Math.round(bounds.width * pixelRatio);
		canvasEl.height = Math.round(bounds.height * pixelRatio);
		context.scale(pixelRatio, pixelRatio);

		const style = getComputedStyle(document.documentElement);
		const frame = sampleConvolutionPlot(
			fixedEvaluator,
			movingEvaluator,
			evalY,
			shiftT,
			normalizedTimeRange,
			sampleCount,
		);
		drawConvolutionPlot(context, {
			width: bounds.width,
			height: bounds.height,
			timeRange: normalizedTimeRange,
			shift: shiftT,
			transitionTimes,
			movingBoundaries: getMovingConvolutionBoundaries(
				movingBreakpoints,
				shiftT,
				normalizedTimeRange,
			),
			frame,
			theme: {
				background:
					style.getPropertyValue("--bg-card").trim() || "#121214",
				axis:
					style.getPropertyValue("--border-color").trim() ||
					"#2d2d35",
				muted:
					style.getPropertyValue("--border-subtle").trim() ||
					"rgba(148, 163, 184, 0.22)",
				text:
					style.getPropertyValue("--text-muted").trim() || "#94a3b8",
			},
		});
	});
</script>

<div class="convolution-wrapper">
	<div class="header-bar">
		<span class="title">{title}</span>
		<div
			class="legend"
			aria-label="Plot legend"
		>
			<div class="legend-item">
				<span class="dot blue"></span>
				<span class="label">
					<MathText text={String.raw`$${fixedLabel}(\tau)$`} />
				</span>
			</div>
			<div class="legend-item">
				<span class="dot orange"></span>
				<span class="label">
					<MathText text={String.raw`$${movingLabel}(t-\tau)$`} />
				</span>
			</div>
			<div class="legend-item">
				<span class="dot green"></span><span class="label">
					Overlap product
				</span>
			</div>
			<div class="legend-item">
				<span class="dot cyan"></span>
				<span class="label">
					<MathText text={String.raw`$y(t)$`} />
				</span>
			</div>
		</div>
	</div>

	<div class="canvas-container">
		<div class="panel-header panel-upper">
			<MathText
				text={String.raw`Signals $${fixedLabel}(\tau)$ and $${movingLabel}(t-\tau)$, with shaded product`}
			/>
		</div>
		<div class="panel-header panel-lower">
			<MathText
				text={String.raw`Output $y(t)=(x*h)(t)$ revealed to the
			current shift`}
			/>
		</div>
		<canvas
			bind:this={canvasEl}
			class="anim-canvas"
			aria-label={title}
			aria-describedby="convolution-plot-note"
		></canvas>
	</div>

	<div class="plot-readout">
		<MathText
			text={`Current position: $t=${shiftT.toFixed(2)}$, $y(t)=${currentOutput.toFixed(3)}$.`}
		/>
	</div>

	<div class="controls-bar">
		<div class="button-group">
			<button
				type="button"
				class="btn-play"
				onclick={togglePlay}
			>
				{isPlaying ? "Pause animation" : "Animate shift"}
			</button>
			<button
				type="button"
				class="btn-secondary"
				onclick={restartAnimation}>Restart</button
			>
		</div>
		<div class="speed-group">
			<label for="convolution-speed">Animation speed</label>
			<select
				id="convolution-speed"
				bind:value={playbackSpeed}
			>
				{#each CONVOLUTION_SPEED_PRESETS as preset}
					<option value={preset.unitsPerSecond}>
						{preset.label}
					</option>
				{/each}
			</select>
		</div>
		<div class="slider-group">
			<label for="shift-slider">
				Shift <MathInline math={String.raw`t`} />
			</label>
			<input
				id="shift-slider"
				type="range"
				min={normalizedTimeRange[0]}
				max={normalizedTimeRange[1]}
				step="0.02"
				bind:value={shiftT}
				oninput={handleManualScrub}
				class="range-input"
			/>
		</div>
	</div>

	<p
		id="convolution-plot-note"
		class="plot-note"
	>
		Orange dashed guides in the overlap panel mark finite moving-signal
		edges and interior breakpoints, including the moving left edge. Dashed
		guides in the output panel mark the transition times verified in the
		solver. The faint curve previews the complete response; the bright curve
		shows the portion reached by the moving overlap.
	</p>
</div>

<style>
	/* ── Convolution wrapper container ─────────────────────── */
	.convolution-wrapper {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		box-sizing: border-box;
		container-type: inline-size;
	}

	/* ── Header bar, title & legend ────────────────────────── */
	.header-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.65rem;
	}

	.title {
		font-weight: 700;
		font-size: var(--text-sm);
		color: var(--text-primary);
	}

	.legend {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex: 0 0 auto;
	}

	/* Dot color variants. */
	.dot.blue {
		background: #3b82f6;
	}
	.dot.orange {
		background: #f97316;
	}
	.dot.green {
		background: #10b981;
	}
	.dot.cyan {
		background: #06b6d4;
	}

	/* ── Dual-plot canvas container ───────────────────────── */
	.canvas-container {
		position: relative;
		width: 100%;
		min-width: 0;
	}

	.panel-header {
		position: absolute;
		left: 40px;
		right: 24px;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-secondary);
		pointer-events: none;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.panel-upper {
		top: 8px;
	}
	.panel-lower {
		top: 181px;
	}

	.anim-canvas {
		display: block;
		width: 100%;
		height: 360px;
		border-radius: var(--radius-sm);
		background: var(--bg-primary);
	}

	.plot-readout {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-primary);
	}

	/* ── Interactive animation controls ───────────────────── */
	.controls-bar {
		display: grid;
		grid-template-columns: auto auto minmax(180px, 1fr);
		align-items: end;
		gap: 1rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 0.8rem 1rem;
		min-width: 0;
	}

	.button-group {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-play,
	.btn-secondary {
		font: inherit;
		font-size: var(--text-xs);
		font-weight: 700;
		border-radius: var(--radius-sm);
		padding: 0.5rem 0.85rem;
		cursor: pointer;
		transition:
			box-shadow 0.15s ease,
			border-color 0.15s ease;
	}

	.btn-play {
		background: var(--accent-primary);
		color: #000;
		border: 1px solid var(--accent-primary);
	}

	.btn-secondary {
		background: var(--bg-card);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.btn-play:hover,
	.btn-secondary:hover {
		border-color: var(--accent-primary);
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.btn-play:focus-visible,
	.btn-secondary:focus-visible,
	select:focus-visible,
	.range-input:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.speed-group,
	.slider-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-secondary);
		min-width: 0;
	}

	.speed-group select {
		min-height: 2rem;
		background: var(--bg-card);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding-inline: 0.5rem;
		font: inherit;
	}

	.range-input {
		width: 100%;
		min-width: 0;
		max-width: 400px;
		accent-color: var(--accent-primary);
		cursor: pointer;
	}

	.plot-note {
		margin: 0;
		font-size: var(--text-xs);
		line-height: 1.5;
		color: var(--text-muted);
	}

	/* ── Compact controls container query (≤720px) ───────── */
	@container (max-width: 720px) {
		.controls-bar {
			grid-template-columns: 1fr 1fr;
		}
		.slider-group {
			grid-column: 1 / -1;
		}
	}

	/* ── Narrow viewport (≤420px) container query ────────── */
	@container (max-width: 420px) {
		.convolution-wrapper {
			padding: 0.75rem 0.5rem;
		}
		.controls-bar {
			grid-template-columns: 1fr;
			padding: 0.7rem 0.6rem;
		}
		.button-group,
		.btn-play,
		.btn-secondary,
		.speed-group,
		.slider-group {
			width: 100%;
		}
		.slider-group {
			grid-column: auto;
		}
		.panel-header {
			left: 28px;
			right: 12px;
			font-size: 0.68rem;
		}
		.legend {
			gap: 0.45rem 0.65rem;
		}
		.range-input {
			max-width: 300px;
		}
	}
</style>
