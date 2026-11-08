<script lang="ts">
	/**
	 * WaveformCanvas Svelte 5 Component.
	 *
	 * Renders high-DPI responsive time-domain signal plots for ODE responses, transients, and convolutions.
	 */

	/** One plotted response and its accessible display metadata. */
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

	/** Waveform plot and time-domain configuration. */
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
	const instanceId = $props.id();
	const descriptionId = `${instanceId}-description`;
	const valuesTitleId = `${instanceId}-values-title`;
	const inspectionId = `${instanceId}-inspection`;
	const plotPadding = 40;
	let selectedTime = $state<number | null>(null);
	const inspectedTime = $derived(
		Math.max(tRange[0], Math.min(tRange[1], selectedTime ?? tRange[0])),
	);
	const inspectedValues = $derived(
		curves.map((curve) => ({
			label: curve.label,
			value: sampleLabel(curve.eval(inspectedTime)),
		})),
	);
	const inspectionText = $derived(
		`Time ${sampleLabel(inspectedTime)} seconds. ${inspectedValues.map((curve) => `${curve.label}: ${curve.value}`).join(". ")}`,
	);
	/** Samples all curves at the pointer's position within the plotted time axis. @param event Mouse, pen, or touch pointer event. */
	function inspectPointer(event: PointerEvent): void {
		if (!canvasEl) return;
		const rect = canvasEl.getBoundingClientRect();
		const fraction = Math.max(
			0,
			Math.min(
				1,
				(event.clientX - rect.left - plotPadding) /
					Math.max(1, rect.width - 2 * plotPadding),
			),
		);
		selectedTime = tRange[0] + fraction * (tRange[1] - tRange[0]);
	}
	/** Keeps horizontal touch or pen inspection connected while dragging. @param event Initial pointer contact. */
	function startInspection(event: PointerEvent): void {
		canvasEl?.setPointerCapture(event.pointerId);
		inspectPointer(event);
	}
	const sampleTimes = $derived(
		Array.from(
			{ length: 11 },
			(_, index) => tRange[0] + (index * (tRange[1] - tRange[0])) / 10,
		),
	);
	/** Formats an approximate sampled amplitude. @param value Sampled amplitude. @returns Readable value or range explanation. */
	function sampleLabel(value: number): string {
		return Number.isFinite(value)
			? value.toPrecision(5)
			: "Outside finite plotting range";
	}

	import { onMount } from "svelte";
	import MathInline from "$lib/components/math/MathInline.svelte";
	import MathText from "$lib/components/math/MathText.svelte";

	let themeVersion = $state(0);
	let layoutVersion = $state(0);

	onMount(() => {
		/**
		 * Handles themechange custom events to update themeVersion and trigger canvas re-render.
		 */
		function handleThemeChange() {
			themeVersion++;
		}

		window.addEventListener("themechange", handleThemeChange);
		const resize =
			typeof ResizeObserver === "undefined"
				? undefined
				: new ResizeObserver(() => {
						layoutVersion++;
					});
		if (canvasEl) resize?.observe(canvasEl);
		return () => {
			window.removeEventListener("themechange", handleThemeChange);
			resize?.disconnect();
		};
	});

	$effect(() => {
		if (!canvasEl) return;
		canvasEl.dataset.visualReady = "false";

		// Track theme change dependency
		void themeVersion;
		void layoutVersion;

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

		const padding = plotPadding;
		const graphW = width - padding * 2;
		const graphH = height - padding * 2;

		const [tMin, tMax] = tRange;
		const cursorTime = inspectedTime;

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
		const tickIntervals = Math.max(1, Math.min(5, Math.floor(graphW / 60)));
		for (let i = 0; i <= tickIntervals; i++) {
			const tVal = tMin + (i / tickIntervals) * (tMax - tMin);
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

		// Mark the shared inspection time and each curve's sampled amplitude.
		ctx.strokeStyle = textSecondary;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(toX(cursorTime), padding);
		ctx.lineTo(toX(cursorTime), height - padding);
		ctx.stroke();
		ctx.setLineDash([]);
		for (const curve of curves) {
			const value = curve.eval(cursorTime);
			if (!Number.isFinite(value)) continue;
			ctx.fillStyle = curve.color;
			ctx.beginPath();
			ctx.arc(toX(cursorTime), toY(value), 3, 0, Math.PI * 2);
			ctx.fill();
		}
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
		aria-describedby={descriptionId}
		onpointermove={inspectPointer}
		onpointerdown={startInspection}
	></canvas>
	<div
		class="legend"
		role="group"
		aria-label="Plot legend"
	>
		{#each curves as c}
			<div class="legend-item">
				<span
					class="legend-dot"
					style:background-color={c.color}
					aria-hidden="true"
				></span>
				<span class="legend-label"
					>{#if c.math}{c.label}: <MathInline
							math={c.math}
						/>{:else}{c.label}{/if}</span
				>
			</div>
		{/each}
	</div>
	<div class="waveform-inspection">
		<label for={inspectionId}>Inspect waveform time</label>
		<input
			id={inspectionId}
			type="range"
			min={tRange[0]}
			max={tRange[1]}
			step={(tRange[1] - tRange[0]) / 500 || 1}
			value={inspectedTime}
			aria-valuetext={inspectionText}
			oninput={(event) => {
				selectedTime = Number(event.currentTarget.value);
			}}
		/>
		<div
			class="waveform-readout"
			aria-live="off"
		>
			<p>Time: <strong>{sampleLabel(inspectedTime)} s</strong></p>
			<dl>
				{#each inspectedValues as curve}<div>
						<dt>{curve.label}</dt>
						<dd>{curve.value}</dd>
					</div>{/each}
			</dl>
		</div>
	</div>
	<p
		id={descriptionId}
		class="sr-only"
	>
		Move across the plot or use the time slider to inspect every curve at
		the same time. Approximate samples are also available in the expandable
		table after the legend and live readout.
	</p>
	<details>
		<summary id={valuesTitleId}>View approximate waveform values</summary>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (The overflow region needs keyboard focus so arrow keys can scroll wide tables.) -->
		<div
			class="waveform-values-scroll"
			role="region"
			aria-labelledby={valuesTitleId}
			tabindex="0"
		>
			<table>
				<caption>
					Approximate samples across the displayed time range
				</caption>
				<thead>
					<tr>
						<th scope="col">Time</th>
						{#each curves as curve}
							<th scope="col">{curve.label}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each sampleTimes as time}
						<tr>
							<th scope="row">{sampleLabel(time)}</th>
							{#each curves as curve}
								<td>{sampleLabel(curve.eval(time))}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
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

	/* ── Numerical waveform alternative ────────────────────── */
	.waveform-values-scroll {
		overflow-x: auto;
		max-width: 100%;
	}
	.waveform-values-scroll:focus-visible {
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}
	.waveform-values-scroll table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		line-height: var(--leading-normal, 1.5);
		font-variant-numeric: tabular-nums;
	}
	.waveform-values-scroll caption {
		padding: 0.65rem 0;
		font-size: var(--text-xs);
		color: var(--text-secondary);
		text-wrap: balance;
	}
	.waveform-values-scroll th,
	.waveform-values-scroll td {
		padding: 0.45rem 0.65rem;
		text-align: right;
		border-bottom: 1px solid var(--border-color);
	}
	.waveform-values-scroll thead th {
		text-wrap: balance;
		font-weight: 600;
	}
	.waveform-values-scroll tbody th {
		font-weight: 400;
	}
	.waveform-values-scroll tbody th,
	.waveform-values-scroll td {
		white-space: nowrap;
	}
	details summary {
		font-size: var(--text-sm);
		cursor: pointer;
	}
	details summary:focus-visible {
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}

	/* ── Live pointer and keyboard inspection ───────────────── */
	.waveform-inspection {
		display: grid;
		gap: 0.5rem;
		font-size: var(--text-sm);
	}
	.waveform-inspection input {
		width: 100%;
		min-width: 0;
		accent-color: var(--accent-primary);
	}
	.waveform-inspection input:focus-visible {
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}
	.waveform-readout {
		padding: 0.65rem;
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
	}
	.waveform-readout p {
		margin: 0 0 0.4rem;
		font-variant-numeric: tabular-nums;
	}
	.waveform-readout dl {
		display: grid;
		gap: 0.25rem;
		margin: 0;
	}
	.waveform-readout dl > div {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.25rem 1rem;
	}
	.waveform-readout dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
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
		gap: 0.4rem 1.25rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.legend-dot {
		flex-shrink: 0;
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	/* ── HTML5 Canvas element ──────────────────────────────── */

	.response-canvas {
		touch-action: pan-y;
		width: 100%;
		height: 240px;
		border-radius: var(--radius-sm);
		background: var(--bg-primary);
	}
</style>
