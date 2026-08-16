<script lang="ts">
	/**
	 * ConvolutionCanvas Svelte 5 Component.
	 *
	 * Interactive dual-plot graphical convolution animator displaying:
	 * 1. Upper Plot: Fixed signal x(tau) (blue) and flipped & shifted signal h(t - tau) (orange)
	 *    with shaded green product region x(tau)*h(t - tau).
	 * 2. Lower Plot: Synchronized output response curve y(t) = (x * h)(t) (cyan).
	 */
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import MathInline from "../math/MathInline.svelte";

	interface Props {
		/** Signal x(tau) evaluator */
		evalX?: (tau: number) => number;
		/** Signal h(tau) evaluator */
		evalH?: (tau: number) => number;
		/** Convolution output y(t) evaluator */
		evalY?: (t: number) => number;
		/** Title for graph */
		title?: string;
		/** Tau / Time display bounds [min, max] */
		timeRange?: [number, number];
	}

	let {
		evalX = (tau: number) => (tau >= 0 && tau < 2 ? 1 : 0),
		evalH = (tau: number) => (tau >= 0 && tau < 2 ? 1 : 0),
		evalY = (t: number) => {
			if (t < 0 || t >= 4) return 0;
			if (t < 2) return t;
			return 4 - t;
		},
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		title = "Graphical Flip-and-Shift Convolution Animator",
		timeRange = [-2, 6],
	}: Props = $props();

	// Interactive shift parameter t state
	let shiftT = $state(1.5);
	let isPlaying = $state(false);
	let animId: number | null = null;

	let canvasEl = $state<HTMLCanvasElement | null>(null);

	/**
	 * Animates shift parameter t smoothly across timeRange.
	 */
	function animate() {
		if (!isPlaying) return;

		shiftT += 0.03;
		if (shiftT > timeRange[1]) {
			shiftT = timeRange[0];
		}

		animId = requestAnimationFrame(animate);
	}

	/**
	 * Toggles play/pause state for convolution animation.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function togglePlay() {
		isPlaying = !isPlaying;
		if (isPlaying) {
			animId = requestAnimationFrame(animate);
		} else if (animId !== null) {
			cancelAnimationFrame(animId);
			animId = null;
		}
	}

	// Re-render canvas when shiftT or props change
	import { onMount } from "svelte";

	let themeVersion = $state(0);

	onMount(() => {
		/**
		 * Handles themechange custom events to update themeVersion and trigger canvas re-render.
		 */
		function handleThemeChange() {
			themeVersion++;
		}

		window.addEventListener("themechange", handleThemeChange);
		return () => {
			window.removeEventListener("themechange", handleThemeChange);
		};
	});

	$effect(() => {
		if (!canvasEl) return;

		// Track theme change dependency
		void themeVersion;

		const style = getComputedStyle(document.documentElement);
		const bgCard = style.getPropertyValue("--bg-card").trim() || "#121214";
		const borderColor =
			style.getPropertyValue("--border-color").trim() || "#2d2d35";

		const ctx = canvasEl.getContext("2d");
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const rect = canvasEl.getBoundingClientRect();

		canvasEl.width = rect.width * dpr;
		canvasEl.height = rect.height * dpr;
		ctx.scale(dpr, dpr);

		const width = rect.width;
		const height = rect.height;

		// Clear canvas background
		ctx.fillStyle = bgCard;
		ctx.fillRect(0, 0, width, height);

		const padding = 35;
		const panelH = (height - padding * 3) / 2;
		const [minT, maxT] = timeRange;

		const toX = (tau: number) =>
			padding + ((tau - minT) / (maxT - minT)) * (width - padding * 2);

		// Panel 1: Upper Plot (Overlap & Flip-Shift on tau axis)
		const p1Top = padding;
		const p1Bottom = padding + panelH;
		const p1ZeroY = p1Bottom - 20;
		const p1ScaleY = (panelH - 40) / 2.5;

		// Panel 2: Lower Plot (Output Curve y(t))
		const p2Top = p1Bottom + padding;
		const p2Bottom = p2Top + panelH;
		const p2ZeroY = p2Bottom - 20;
		const p2ScaleY = (panelH - 40) / 2.5;

		// Draw Panel Backgrounds & Dividing Axes
		ctx.strokeStyle = borderColor;
		ctx.lineWidth = 1;

		// Upper axis
		ctx.beginPath();
		ctx.moveTo(padding, p1ZeroY);
		ctx.lineTo(width - padding, p1ZeroY);
		ctx.stroke();

		// Lower axis
		ctx.beginPath();
		ctx.moveTo(padding, p2ZeroY);
		ctx.lineTo(width - padding, p2ZeroY);
		ctx.stroke();

		// Vertical zero lines
		const zeroX = toX(0);
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(zeroX, p1Top);
		ctx.lineTo(zeroX, p1Bottom);
		ctx.moveTo(zeroX, p2Top);
		ctx.lineTo(zeroX, p2Bottom);
		ctx.stroke();
		ctx.setLineDash([]);

		// Sample points for high resolution
		const numSamples = 300;
		const dTau = (maxT - minT) / numSamples;

		// Draw Shaded Overlap Product Area in Upper Panel
		ctx.fillStyle = "rgba(16, 185, 129, 0.35)"; // green tint
		ctx.beginPath();
		let inOverlap = false;

		for (let i = 0; i <= numSamples; i++) {
			const tau = minT + i * dTau;
			const valX = evalX(tau);
			const valHShift = evalH(shiftT - tau);
			const product = valX * valHShift;
			const px = toX(tau);
			const py = p1ZeroY - product * p1ScaleY;

			if (product > 1e-4) {
				if (!inOverlap) {
					ctx.moveTo(px, p1ZeroY);
					inOverlap = true;
				}
				ctx.lineTo(px, py);
			} else if (inOverlap) {
				ctx.lineTo(px, p1ZeroY);
				inOverlap = false;
			}
		}
		if (inOverlap) {
			ctx.lineTo(toX(maxT), p1ZeroY);
		}
		ctx.closePath();
		ctx.fill();

		// Draw x(tau) in Upper Panel (Blue)
		ctx.strokeStyle = "#3b82f6";
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let i = 0; i <= numSamples; i++) {
			const tau = minT + i * dTau;
			const valX = evalX(tau);
			const px = toX(tau);
			const py = p1ZeroY - valX * p1ScaleY;
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.stroke();

		// Draw h(t - tau) in Upper Panel (Orange)
		ctx.strokeStyle = "#f97316";
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let i = 0; i <= numSamples; i++) {
			const tau = minT + i * dTau;
			const valHShift = evalH(shiftT - tau);
			const px = toX(tau);
			const py = p1ZeroY - valHShift * p1ScaleY;
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.stroke();

		// Draw Output y(t) Curve in Lower Panel (Cyan) up to current shiftT
		ctx.strokeStyle = "#06b6d4";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		for (let i = 0; i <= numSamples; i++) {
			const tVal = minT + i * dTau;
			if (tVal > shiftT) break;
			const valY = evalY(tVal);
			const px = toX(tVal);
			const py = p2ZeroY - valY * p2ScaleY;
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.stroke();

		// Current shift position indicator point on y(t)
		const curYVal = evalY(shiftT);
		const curX = toX(shiftT);
		const curY = p2ZeroY - curYVal * p2ScaleY;

		ctx.fillStyle = "#06b6d4";
		ctx.beginPath();
		ctx.arc(curX, curY, 5, 0, Math.PI * 2);
		ctx.fill();
	});
</script>

<div class="convolution-wrapper">
	<div class="header-bar">
		<span class="title">{title}</span>
		<div class="legend">
			<div class="legend-item">
				<span class="dot blue"></span>
				<span class="label"><MathInline math={"x(\\tau)"} /></span>
			</div>
			<div class="legend-item">
				<span class="dot orange"></span>
				<span class="label"><MathInline math={"h(t - \\tau)"} /></span>
			</div>
			<div class="legend-item">
				<span class="dot green"></span>
				<span class="label">Overlap Area</span>
			</div>
			<div class="legend-item">
				<span class="dot cyan"></span>
				<span class="label"><MathInline math={"y(t)"} /></span>
			</div>
		</div>
	</div>

	<div class="canvas-container">
		<div class="panel-header panel-upper">
			Upper: Signals <MathInline math={"x(\\tau)"} /> and <MathInline
				math={"h(t - \\tau)"}
			/> Product
		</div>
		<div class="panel-header panel-lower">
			Lower: Convolved Output <MathInline math={"y(t) = (x * h)(t)"} />
		</div>
		<canvas
			bind:this={canvasEl}
			class="anim-canvas"
			aria-label={title}
		></canvas>
	</div>

	<!-- Interactive Shift Controls -->
	<div class="controls-bar">
		<button
			type="button"
			class="btn-play"
			onclick={togglePlay}
		>
			{isPlaying ? "⏸ Pause Shift" : "▶ Animate Shift"}
		</button>
		<div class="slider-group">
			<label for="shift-slider">
				Shift Parameter <MathInline math={"t ="} />
				{shiftT.toFixed(2)}s:
			</label>
			<input
				id="shift-slider"
				type="range"
				min={timeRange[0]}
				max={timeRange[1]}
				step="0.05"
				bind:value={shiftT}
				class="range-input"
			/>
		</div>
	</div>
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
		gap: 1rem;
	}

	/* ── Header bar & title ────────────────────────────────── */

	.header-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.title {
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--text-primary);
	}

	/* ── Legend & color dots ───────────────────────────────── */

	.legend {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	/* Dot color variants */
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

	/* ── Dual-plot canvas container ────────────────────────── */

	.canvas-container {
		position: relative;
		width: 100%;
	}

	.panel-header {
		position: absolute;
		left: 40px;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-secondary);
		pointer-events: none;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.panel-upper {
		top: 10px;
	}

	.panel-lower {
		top: 165px;
	}

	.anim-canvas {
		width: 100%;
		height: 320px;
		border-radius: var(--radius-sm);
		background: var(--bg-primary);
	}

	/* ── Interactive animation controls bar ────────────────── */

	.controls-bar {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		flex-wrap: wrap;
	}

	.btn-play {
		background: var(--accent-primary);
		color: #000;
		font-weight: 700;
		border: none;
		padding: 0.4rem 1rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s ease;
	}

	.btn-play:hover,
	.btn-play:focus-visible {
		box-shadow: 0 0 12px var(--accent-glow);
		outline: 2px solid var(--text-primary);
		outline-offset: 2px;
	}

	.slider-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.range-input {
		flex: 1;
		accent-color: var(--accent-primary);
		cursor: pointer;
	}
</style>
