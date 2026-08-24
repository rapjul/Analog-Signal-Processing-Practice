<script lang="ts">
	/**
	 * WaveformCanvas Svelte 5 Component.
	 *
	 * Renders high-DPI responsive time-domain signal plots for ODE responses, transients, and convolutions.
	 */

	interface CurveSpec {
		/** Display label for the signal curve in the legend */
		label: string;
		/** Optional LaTeX math expression for the signal label */
		math?: string;
		/** CSS color value used to draw the curve stroke */
		color: string;
		/** Evaluation function taking time parameter `t` and returning scalar signal amplitude */
		eval: (t: number) => number;
	}

	interface Props {
		/** List of functions to plot on canvas */
		curves?: CurveSpec[];
		/** Title for graph (plain text fallback if mathTitle not provided) */
		title?: string;
		/** Optional LaTeX math expression for graph title */
		mathTitle?: string;
		/** Time range [tMin, tMax] */
		tRange?: [number, number];
	}

	let {
		curves = [],
		title = "Time-Domain Signal Response y(t)",
		mathTitle,
		tRange = [0, 5],
	}: Props = $props();

	let canvasEl = $state<HTMLCanvasElement | null>(null);

	import { onMount } from "svelte";
	import MathInline from "../math/MathInline.svelte";
	import MathText from "../math/MathText.svelte";

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
		canvasEl.dataset.visualReady = "false";

		// Track theme change dependency
		void themeVersion;

		const style = getComputedStyle(document.documentElement);
		const bgCard = style.getPropertyValue("--bg-card").trim() || "#121214";
		const borderColor =
			style.getPropertyValue("--border-color").trim() || "#2d2d35";
		const textSecondary =
			style.getPropertyValue("--text-secondary").trim() || "#a1a1aa";
		const fontFamily =
			style.getPropertyValue("--font-sans").trim() ||
			style.fontFamily ||
			"Inter, system-ui, -apple-system, sans-serif";

		// Set accessible label for screen readers
		canvasEl.setAttribute("aria-label", title);

		const ctx = canvasEl.getContext("2d");
		if (!ctx) return;

		// High DPI Scaling
		const dpr = window.devicePixelRatio || 1;
		const rect = canvasEl.getBoundingClientRect();

		canvasEl.width = rect.width * dpr;
		canvasEl.height = rect.height * dpr;
		ctx.scale(dpr, dpr);

		const width = rect.width;
		const height = rect.height;

		// Clear canvas
		ctx.fillStyle = bgCard;
		ctx.fillRect(0, 0, width, height);

		const padding = 40;
		const graphW = width - padding * 2;
		const graphH = height - padding * 2;

		const [tMin, tMax] = tRange;

		// Find yMin and yMax across all curves
		let yMin = -1;
		let yMax = 1;
		const numSamples = 200;

		curves.forEach((c) => {
			for (let i = 0; i <= numSamples; i++) {
				const t = tMin + (i / numSamples) * (tMax - tMin);
				const val = c.eval(t);
				if (!Number.isNaN(val) && Number.isFinite(val)) {
					if (val < yMin) yMin = val;
					if (val > yMax) yMax = val;
				}
			}
		});

		// Pad y-range
		yMin = yMin < 0 ? yMin * 1.2 : yMin * 0.8;
		yMax = yMax > 0 ? yMax * 1.2 : yMax * 0.8;
		if (Math.abs(yMax - yMin) < 1e-3) {
			yMin -= 1;
			yMax += 1;
		}

		// Coordinate transformation helpers
		const toX = (t: number) =>
			padding + ((t - tMin) / (tMax - tMin)) * graphW;
		const toY = (v: number) =>
			padding + graphH - ((v - yMin) / (yMax - yMin)) * graphH;

		// Draw Grid & Axes
		ctx.strokeStyle = borderColor;
		ctx.lineWidth = 1;

		// Horizontal axis (v = 0)
		const zeroY = toY(0);
		ctx.beginPath();
		ctx.moveTo(padding, zeroY);
		ctx.lineTo(width - padding, zeroY);
		ctx.stroke();

		// Vertical axis (t = 0)
		const zeroX = toX(0);
		ctx.beginPath();
		ctx.moveTo(zeroX, padding);
		ctx.lineTo(zeroX, height - padding);
		ctx.stroke();

		// Axis Ticks & Labels
		ctx.fillStyle = textSecondary;
		ctx.font = `13px ${fontFamily}`;
		ctx.textAlign = "center";

		// Time ticks
		for (let i = 0; i <= 5; i++) {
			const tVal = tMin + (i / 5) * (tMax - tMin);
			const xPos = toX(tVal);
			ctx.fillText(`${tVal.toFixed(1)}s`, xPos, height - padding + 16);
		}

		// Draw Curves
		curves.forEach((c) => {
			ctx.strokeStyle = c.color;
			ctx.lineWidth = 2;
			ctx.beginPath();

			for (let i = 0; i <= numSamples; i++) {
				const t = tMin + (i / numSamples) * (tMax - tMin);
				const val = c.eval(t);
				const x = toX(t);
				const y = toY(val);

				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		});

		canvasEl.dataset.visualReady = "true";
	});
</script>

<div class="canvas-wrapper">
	<div class="canvas-title">
		{#if mathTitle}
			<MathInline math={mathTitle} />
		{:else}
			<MathText text={title} />
		{/if}
	</div>
	<canvas
		bind:this={canvasEl}
		class="response-canvas"
		aria-label={title}
	></canvas>
	<div class="legend">
		{#each curves as c}
			<div class="legend-item">
				<span
					class="legend-dot"
					style="background-color: {c.color}"
				>
				</span>
				<span class="legend-label">
					{#if c.math}
						{c.label}: <MathInline math={c.math} />
					{:else}
						{c.label}
					{/if}
				</span>
			</div>
		{/each}
	</div>
</div>

<style>
	/* ── Canvas wrapper container ──────────────────────────── */

	.canvas-wrapper {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* ── Title heading ─────────────────────────────────────── */

	.canvas-title {
		display: flex;
		justify-content: center;
		align-items: center;
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--text-primary);
	}

	/* ── Legend display ────────────────────────────────────── */

	.legend {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 2rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	/* ── HTML5 Canvas element ──────────────────────────────── */

	.response-canvas {
		width: 100%;
		height: 240px;
		border-radius: var(--radius-sm);
		background: var(--bg-primary);
	}
</style>
