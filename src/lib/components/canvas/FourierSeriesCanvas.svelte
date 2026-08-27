<script lang="ts">
	/**
	 * FourierSeriesCanvas Svelte 5 Component.
	 *
	 * Dual-panel visualizer displaying:
	 * 1. Time Domain: Ideal signal x(t) (dashed) vs. N-harmonic partial sum S_N(t) (cyan),
	 *    demonstrating Gibbs phenomenon overshoot at discontinuities.
	 * 2. Frequency Domain: Bar chart spectrum of harmonic magnitudes |F_n| for n = 1 ... N.
	 * 3. Parseval Analysis: Captured power and harmonic thresholds for the active N.
	 */
	import {
		computeFourierSeriesCoefficients,
		computeHarmonicPowerThresholds,
		computeSignalPower,
		type FourierSeriesCoefficients,
		type FourierSeriesWaveformType,
		formatPowerCapturePercent,
	} from "$lib/math-engine/fourier-series/index";
	import MathInline from "../math/MathInline.svelte";
	import MathText from "../math/MathText.svelte";
	import {
		computeTargetMagnitudes,
		drawFourierHarmonicSpectrum,
		drawFourierTimeDomain,
		getFourierPlotTheme,
	} from "./fourier-series-plot";

	interface Props {
		/** Exact coefficients for the generated problem. */
		coefficients?: FourierSeriesCoefficients;
		/** Selected waveform type */
		waveformType?: FourierSeriesWaveformType;
		/** Number of partial sum harmonics N (1 to 50) */
		harmonicCount?: number;
		/** Title for visualizer */
		title?: string;
	}

	import { onMount, untrack } from "svelte";

	let {
		coefficients,
		waveformType = "square",
		harmonicCount = 5,
		title = "Fourier Series Partial Sum & Harmonic Spectrum",
	}: Props = $props();

	// Interactive local harmonic count N state
	let N = $state(untrack(() => harmonicCount));
	let prevHarmonicCount = untrack(() => harmonicCount);

	$effect(() => {
		if (harmonicCount !== prevHarmonicCount) {
			prevHarmonicCount = harmonicCount;
			N = harmonicCount;
		}
	});

	let currentN = $derived(Math.max(1, Math.min(50, Number(N) || 5)));

	let canvasUpperEl = $state<HTMLCanvasElement | null>(null);
	let canvasLowerEl = $state<HTMLCanvasElement | null>(null);

	// Derived Fourier coefficients
	let coeffs = $derived<FourierSeriesCoefficients>(
		coefficients ?? computeFourierSeriesCoefficients(waveformType),
	);
	let signalPower = $derived(computeSignalPower(coeffs, currentN));
	let powerThresholds = $derived(computeHarmonicPowerThresholds(coeffs));
	let capturedPowerPercent = $derived(signalPower.powerRatio * 100);
	let capturedPowerLabel = $derived(
		formatPowerCapturePercent(signalPower.powerRatio),
	);

	/** Formats power values without hiding small non-zero results. */
	function formatPower(value: number): string {
		return value >= 0.001 ? value.toFixed(3) : value.toExponential(2);
	}

	let themeVersion = $state(0);
	let resizeVersion = $state(0);

	// Smooth animation state for frequency-domain harmonic spectrum bars
	let animFrameId: number | null = null;

	onMount(() => {
		/**
		 * Handles themechange custom events to update themeVersion and trigger canvas re-render.
		 */
		function handleThemeChange() {
			themeVersion++;
		}

		/**
		 * Handles window resize events to trigger canvas re-render.
		 */
		function handleResize() {
			resizeVersion++;
		}

		window.addEventListener("themechange", handleThemeChange);
		window.addEventListener("resize", handleResize);

		// ResizeObserver to detect canvas container dimensions changing
		let resizeObserver: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			resizeObserver = new ResizeObserver(() => {
				resizeVersion++;
			});
			if (canvasUpperEl) resizeObserver.observe(canvasUpperEl);
			if (canvasLowerEl) resizeObserver.observe(canvasLowerEl);
		}

		return () => {
			window.removeEventListener("themechange", handleThemeChange);
			window.removeEventListener("resize", handleResize);
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
			if (animFrameId !== null) {
				cancelAnimationFrame(animFrameId);
			}
		};
	});

	// Keep animation positions persistent across renders
	let currentDisplayN = 5;
	let animatedMags = Array.from({ length: 51 }, () => 0);

	$effect(() => {
		if (!canvasUpperEl || !canvasLowerEl) return;
		canvasUpperEl.dataset.visualReady = "false";
		canvasLowerEl.dataset.visualReady = "false";

		// Track reactive dependencies
		void themeVersion;
		void resizeVersion;
		const targetN = currentN;
		const currentCoeffs = coeffs;

		const targetDisplayN = Math.min(targetN, 30);
		const targetMags = computeTargetMagnitudes(
			currentCoeffs,
			targetDisplayN,
		);

		let isAnimating = true;

		function renderFrame() {
			if (!canvasUpperEl || !canvasLowerEl || !isAnimating) return;

			// Smoothly lerp currentDisplayN toward targetDisplayN
			const diffN = targetDisplayN - currentDisplayN;
			if (Math.abs(diffN) < 0.01) {
				currentDisplayN = targetDisplayN;
			} else {
				currentDisplayN += diffN * 0.15;
			}

			// Smoothly lerp animatedMags toward targetMags
			let maxMagDiff = 0;
			for (let n = 1; n <= 50; n++) {
				const target = targetMags[n] ?? 0;
				const current = animatedMags[n] ?? 0;
				const diff = target - current;
				if (Math.abs(diff) > maxMagDiff) maxMagDiff = Math.abs(diff);
				animatedMags[n] = current + diff * 0.18;
			}

			const theme = getFourierPlotTheme(
				getComputedStyle(document.documentElement),
			);

			const ctxUpper = canvasUpperEl.getContext("2d");
			const ctxLower = canvasLowerEl.getContext("2d");
			if (!ctxUpper || !ctxLower) return;

			// Use native devicePixelRatio for crisp rendering on HiDPI displays
			const dpr = window.devicePixelRatio || 1;

			// Upper Canvas setup
			const rectUpper = canvasUpperEl.getBoundingClientRect();
			canvasUpperEl.width = rectUpper.width * dpr;
			canvasUpperEl.height = rectUpper.height * dpr;
			ctxUpper.scale(dpr, dpr);

			// Lower Canvas setup
			const rectLower = canvasLowerEl.getBoundingClientRect();
			canvasLowerEl.width = rectLower.width * dpr;
			canvasLowerEl.height = rectLower.height * dpr;
			ctxLower.scale(dpr, dpr);

			// Draw time domain and spectrum panels
			drawFourierTimeDomain(
				ctxUpper,
				rectUpper.width,
				rectUpper.height,
				currentCoeffs,
				targetN,
				theme,
			);

			drawFourierHarmonicSpectrum(
				ctxLower,
				rectLower.width,
				rectLower.height,
				currentDisplayN,
				animatedMags,
				targetDisplayN,
				theme,
			);

			if (Math.abs(diffN) >= 0.01 || maxMagDiff >= 0.001) {
				animFrameId = requestAnimationFrame(renderFrame);
			} else {
				animFrameId = null;
				canvasUpperEl.dataset.visualReady = "true";
				canvasLowerEl.dataset.visualReady = "true";
			}
		}

		if (animFrameId !== null) {
			cancelAnimationFrame(animFrameId);
		}
		renderFrame();

		return () => {
			isAnimating = false;
			if (animFrameId !== null) {
				cancelAnimationFrame(animFrameId);
				animFrameId = null;
			}
		};
	});
</script>

<div class="fourier-canvas-wrapper">
	<div class="header-bar">
		<span class="title">{title}</span>
	</div>

	<!-- Interactive Slider for Harmonic Count N -->
	<div class="controls-bar">
		<div class="slider-group">
			<label
				for="harmonic-slider"
				class="slider-label"
			>
				Harmonic Limit:
			</label>
			<input
				id="harmonic-slider"
				type="range"
				min="1"
				max="50"
				step="1"
				bind:value={N}
				class="range-input"
			/>
			<span class="value-badge">
				<MathInline math={`N = ${currentN}`} />
			</span>
		</div>
	</div>

	<div class="plots-grid">
		<div class="plot-card upper-card">
			<div class="panel-header">
				<span class="panel-title">
					Time-Domain Partial Sum <MathInline
						math={`S_{${currentN}}(t)`}
					/>
					{#if coeffs.hasJumpDiscontinuities}
						(Gibbs overshoot at jumps)
					{:else}
						(Ideal waveform comparison)
					{/if}
				</span>
			</div>
			<canvas
				bind:this={canvasUpperEl}
				class="fourier-canvas"
				aria-label="Time-Domain Partial Sum Canvas"
			></canvas>
			<div class="plot-legend">
				<div class="legend-item">
					<span class="dot ideal"></span>
					<span class="label">Ideal waveform</span>
				</div>
				<div class="legend-item">
					<span class="dot cyan"></span>
					<span class="label">
						Partial Sum <MathInline math={`S_{${currentN}}(t)`} />
					</span>
				</div>
			</div>
		</div>

		<div class="plot-card lower-card">
			<div class="panel-header">
				<span class="panel-title">
					Harmonic Spectrum Magnitude <MathInline math={"|F_n|"} />
					<MathInline
						math={`(n = 1 \\dots ${Math.min(currentN, 30)})`}
					/>
				</span>
			</div>
			<canvas
				bind:this={canvasLowerEl}
				class="fourier-canvas"
				aria-label="Harmonic Spectrum Magnitude Canvas"
			></canvas>
			<div class="plot-legend">
				<div class="legend-item">
					<span class="dot amber"></span>
					<span class="label">
						Harmonic Spectrum <MathInline math={"|F_n|"} />
					</span>
				</div>
			</div>
		</div>
	</div>

	{#if coeffs.hasJumpDiscontinuities}
		<div class="gibbs-hint">
			💡 Notice the Gibbs phenomenon overshoot near jump discontinuities
			as
			<MathInline math={"N \\to \\infty"} />.
		</div>
	{:else}
		<div class="gibbs-hint">
			Compare the partial sum with the dashed ideal waveform as
			<MathInline math={"N"} /> increases.
		</div>
	{/if}

	<section
		class="power-card"
		aria-labelledby="parseval-power-title"
	>
		<div class="power-heading-row">
			<div>
				<h3 id="parseval-power-title">Parseval Power Distribution</h3>
				<p>
					Power captured by the DC term and harmonics through
					<MathInline math={`N=${currentN}`} />.
				</p>
			</div>
			<strong class="capture-ratio">
				{capturedPowerLabel}%
			</strong>
		</div>

		<progress
			class="power-meter"
			max="100"
			value={capturedPowerPercent}
			aria-label="Captured signal power percentage"
		></progress>

		<div class="power-metrics">
			<div class="power-stat">
				<MathText
					text={`Total power: $P_x=${formatPower(signalPower.totalPower)}$`}
				/>
			</div>
			<div class="power-stat">
				<MathText
					text={`Captured power: $P_{${currentN}}=${formatPower(signalPower.harmonicPower)}$`}
				/>
			</div>
			<div class="power-stat">
				<MathText
					text={String.raw`Capture ratio: $\eta(${currentN})=${capturedPowerLabel}\%$`}
				/>
			</div>
		</div>

		<div class="power-threshold-summary">
			<MathText
				text={String.raw`Minimum highest-harmonic limits: $N_{90\%}=${powerThresholds.n90}$; $N_{95\%}=${powerThresholds.n95}$; $N_{99\%}=${powerThresholds.n99}$. Here $N$ is the highest included harmonic; zero-valued harmonics add no power.`}
			/>
		</div>
	</section>
</div>

<style>
	/* ── Fourier canvas wrapper ────────────────────────────── */

	.fourier-canvas-wrapper {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		container-type: inline-size;
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

	/* ── Plot legends & color dots ─────────────────────────── */

	.plot-legend {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 1rem;
		padding-left: 0.25rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	/* Dot color variants */
	.dot.cyan {
		background: #06b6d4;
	}
	.dot.amber {
		background: #f59e0b;
	}

	.dot.ideal {
		background: var(--text-secondary);
	}

	/* ── Plot card & canvas frames ─────────────────────────── */

	.plots-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.25rem;
		min-width: 0;
	}

	.plot-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.panel-header {
		display: flex;
		align-items: center;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-secondary);
		user-select: text;
	}

	.panel-title {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.fourier-canvas {
		width: 100%;
		height: clamp(170px, 22vw, 200px);
		border-radius: var(--radius-sm);
		background: var(--bg-primary);
		display: block;
	}

	/* ── Interactive harmonic count slider bar ─────────────── */

	.controls-bar {
		display: flex;
		align-items: center;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		position: sticky;
		top: 4.25rem;
		z-index: 10;
		box-shadow: var(--shadow-sm);
	}

	.slider-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
		min-width: 0;
	}

	.slider-label {
		white-space: nowrap;
	}

	.value-badge {
		min-width: 65px;
		display: inline-flex;
		align-items: center;
		justify-content: flex-start;
		white-space: nowrap;
	}

	.range-input {
		flex: 1;
		min-width: 0;
		accent-color: var(--accent-primary);
		cursor: pointer;
	}

	.gibbs-hint {
		align-self: flex-start;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-primary);
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.4);
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-sm);
	}

	/* ── Parseval power distribution ───────────────────────── */

	.power-card {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	.power-heading-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.power-heading-row h3,
	.power-heading-row p {
		margin: 0;
	}

	.power-heading-row h3 {
		font-size: 0.95rem;
		color: var(--text-primary);
	}

	.power-heading-row p {
		margin-top: 0.25rem;
		font-size: 0.82rem;
		color: var(--text-secondary);
	}

	.capture-ratio {
		font-size: 1.2rem;
		color: var(--accent-primary);
		white-space: nowrap;
	}

	.power-meter {
		width: 100%;
		height: 0.75rem;
		accent-color: var(--accent-primary);
	}

	.power-metrics {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.power-threshold-summary {
		font-size: 0.82rem;
		color: var(--text-secondary);
		line-height: var(--leading-relaxed);
		padding: 0.65rem;
	}

	.power-stat {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-content: center;
		justify-content: space-evenly;
		align-items: center;
		gap: 0.4rem 0.75rem;
		min-width: 0;
		padding: 0.65rem;
		background: var(--bg-primary);
		border-radius: var(--radius-sm);
		font-size: 0.82rem;
		color: var(--text-secondary);
	}

	@container (min-width: 800px) {
		.plots-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@container (max-width: 520px) {
		.power-metrics {
			grid-template-columns: 1fr;
		}

		.power-heading-row {
			align-items: center;
		}

		.power-stat {
			flex-direction: row;
			flex-wrap: wrap;
			align-content: center;
			justify-content: space-evenly;
			align-items: center;
			gap: 0.4rem 0.75rem;
		}

		.controls-bar {
			padding: 0.65rem 0.75rem;
		}

		.slider-group {
			gap: 0.45rem;
		}

		.value-badge {
			min-width: auto;
		}
	}

	@media (max-width: 950px) {
		.controls-bar {
			top: 0.5rem;
		}
	}
</style>
