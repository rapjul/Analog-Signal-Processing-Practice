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

	import { formatFourierNumber } from "$lib/math-engine/fourier-series/frequency";
	import {
		computeFourierSeriesCoefficients,
		computeHarmonicPowerContribution,
		computeHarmonicPowerThresholds,
		computeSignalPower,
		FOURIER_POWER_TARGETS,
		type FourierSeriesCoefficients,
		type FourierSeriesWaveformType,
		formatPowerCapturePercent,
	} from "$lib/math-engine/fourier-series/index";
	import MathInline from "../math/MathInline.svelte";
	import MathText from "../math/MathText.svelte";
	import {
		FOURIER_DISPLAY_DEFAULT_HARMONIC,
		FOURIER_DISPLAY_MAX_HARMONIC,
		FOURIER_DISPLAY_MIN_HARMONIC,
	} from "./fourier-series-display";
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
		harmonicCount = FOURIER_DISPLAY_DEFAULT_HARMONIC,
		title = "Fourier Series Partial Sum & Harmonic Spectrum",
	}: Props = $props();
	const instanceId = $props.id();
	const harmonicSliderId = `${instanceId}-harmonic-slider`;
	const convergenceId = `${instanceId}-convergence-description`;
	const spectrumId = `${instanceId}-spectrum-description`;
	const powerTitleId = `${instanceId}-power-title`;

	// Interactive local harmonic count N state
	let N = $state(untrack(() => harmonicCount));
	let prevHarmonicCount = untrack(() => harmonicCount);

	$effect(() => {
		if (harmonicCount !== prevHarmonicCount) {
			prevHarmonicCount = harmonicCount;
			N = harmonicCount;
		}
	});

	let currentN = $derived(
		Math.max(
			FOURIER_DISPLAY_MIN_HARMONIC,
			Math.min(
				FOURIER_DISPLAY_MAX_HARMONIC,
				Math.round(Number(N) || FOURIER_DISPLAY_DEFAULT_HARMONIC),
			),
		),
	);

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
	const coefficientRows = $derived.by(() =>
		Array.from(
			{ length: currentN + 1 },
			/** @param _ - Unused array element. @param n - Harmonic index. @returns Exact coefficient row. */
			(_, n) => {
				const { re, im } = coeffs.Fn(n);
				const magnitude = Math.hypot(re, im);
				return {
					n,
					re,
					im,
					magnitude,
					phase: magnitude === 0 ? null : Math.atan2(im, re),
					power: computeHarmonicPowerContribution(coeffs, n),
				};
			},
		),
	);

	/** Formats power values without hiding small non-zero results. */
	function formatPower(value: number): string {
		const formatted =
			value >= 0.001 ? value.toFixed(3) : value.toExponential(2);
		return /e/i.test(formatted)
			? formatFourierNumber(Number(formatted))
			: formatted;
	}

	/** @param value - Signed coefficient or power. @returns A readable value preserving small nonzero quantities. */
	function formatCoefficient(value: number): string {
		if (value === 0) return "0";
		return Math.abs(value) < 0.001 || Math.abs(value) >= 100_000
			? value.toExponential(4)
			: value.toPrecision(5);
	}

	let themeVersion = $state(0);
	let resizeVersion = $state(0);
	let reducedMotion = $state(false);

	// Smooth animation state for frequency-domain harmonic spectrum bars
	let animFrameId: number | null = null;

	onMount(() => {
		const motionPreference = window.matchMedia?.(
			"(prefers-reduced-motion: reduce)",
		);
		/** Synchronizes the operating system's motion preference. */
		function handleMotionChange(): void {
			reducedMotion = motionPreference?.matches ?? false;
		}
		handleMotionChange();
		motionPreference?.addEventListener("change", handleMotionChange);
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
			motionPreference?.removeEventListener("change", handleMotionChange);
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
	let currentDisplayN = FOURIER_DISPLAY_DEFAULT_HARMONIC;
	let animatedMags = Array.from(
		{ length: FOURIER_DISPLAY_MAX_HARMONIC + 1 },
		() => 0,
	);
	/** Tracks backing-store scale even when CSS size and pixel ratio change together. */
	const canvasPixelRatios = new WeakMap<HTMLCanvasElement, number>();

	/**
	 * Resizes a canvas only when its backing dimensions change.
	 * @param canvas - Canvas receiving the current display size.
	 * @param ctx - Its rendering context.
	 * @returns CSS-pixel dimensions used for drawing.
	 */
	function prepareCanvas(
		canvas: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
	): DOMRect {
		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const width = Math.round(rect.width * dpr);
		const height = Math.round(rect.height * dpr);
		if (
			canvas.width !== width ||
			canvas.height !== height ||
			canvasPixelRatios.get(canvas) !== dpr
		) {
			canvas.width = width;
			canvas.height = height;
			ctx.scale(dpr, dpr);
			canvasPixelRatios.set(canvas, dpr);
		}
		return rect;
	}

	$effect(() => {
		void themeVersion;
		void resizeVersion;
		if (!canvasUpperEl) return;
		const ctx = canvasUpperEl.getContext("2d");
		if (!ctx) return;
		const rect = prepareCanvas(canvasUpperEl, ctx);
		drawFourierTimeDomain(
			ctx,
			rect.width,
			rect.height,
			coeffs,
			currentN,
			getFourierPlotTheme(getComputedStyle(document.documentElement)),
		);
		canvasUpperEl.dataset.visualReady = "true";
	});

	$effect(() => {
		if (!canvasLowerEl) return;
		canvasLowerEl.dataset.visualReady = "false";

		// Track reactive dependencies
		void themeVersion;
		void resizeVersion;
		const targetN = currentN;
		const currentCoeffs = coeffs;

		const targetDisplayN = targetN;
		const targetMags = computeTargetMagnitudes(
			currentCoeffs,
			targetDisplayN,
		);
		const motionDisabled = reducedMotion;
		if (motionDisabled) {
			currentDisplayN = targetDisplayN;
			animatedMags = [...targetMags];
		}
		const theme = getFourierPlotTheme(
			getComputedStyle(document.documentElement),
		);
		const ctxLower = canvasLowerEl.getContext("2d");
		if (!ctxLower) return;
		const rectLower = prepareCanvas(canvasLowerEl, ctxLower);

		let isAnimating = true;

		/** Draws one spectrum animation frame without resampling the time-domain plot. */
		function renderFrame(): void {
			if (!canvasLowerEl || !isAnimating || !ctxLower) return;

			// Smoothly lerp currentDisplayN toward targetDisplayN
			const diffN = targetDisplayN - currentDisplayN;
			if (Math.abs(diffN) < 0.01) {
				currentDisplayN = targetDisplayN;
			} else {
				currentDisplayN += diffN * 0.15;
			}

			// Smoothly lerp animatedMags toward targetMags
			let maxMagDiff = 0;
			for (let n = 0; n <= FOURIER_DISPLAY_MAX_HARMONIC; n++) {
				const target = targetMags[n] ?? 0;
				const current = animatedMags[n] ?? 0;
				const diff = target - current;
				if (Math.abs(diff) / currentCoeffs.A > maxMagDiff)
					maxMagDiff = Math.abs(diff) / currentCoeffs.A;
				animatedMags[n] = current + diff * 0.18;
			}

			const settled =
				motionDisabled ||
				(Math.abs(diffN) < 0.01 && maxMagDiff < 0.001);
			if (settled) {
				currentDisplayN = targetDisplayN;
				animatedMags = [...targetMags];
			}

			drawFourierHarmonicSpectrum(
				ctxLower,
				rectLower.width,
				rectLower.height,
				currentDisplayN,
				animatedMags,
				targetDisplayN,
				theme,
			);

			if (!settled) {
				animFrameId = requestAnimationFrame(renderFrame);
			} else {
				animFrameId = null;
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
				for={harmonicSliderId}
				class="slider-label"
			>
				Harmonic Limit:
			</label>
			<input
				id={harmonicSliderId}
				type="range"
				min={FOURIER_DISPLAY_MIN_HARMONIC}
				max={FOURIER_DISPLAY_MAX_HARMONIC}
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
				aria-describedby={convergenceId}
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
					<MathInline math={`(n = 0 \\dots ${currentN})`} />
				</span>
			</div>
			<canvas
				bind:this={canvasLowerEl}
				class="fourier-canvas"
				aria-label="Harmonic Spectrum Magnitude Canvas"
				aria-describedby={spectrumId}
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
		<div
			class="gibbs-hint"
			id={convergenceId}
		>
			💡 Notice the Gibbs phenomenon overshoot near jump discontinuities
			as
			<MathInline math={"N \\to \\infty"} />. At a jump, the series
			converges to the midpoint of the left and right limits. Overshoot
			persists near the jump while its width shrinks.
		</div>
	{:else}
		<div
			class="gibbs-hint"
			id={convergenceId}
		>
			Compare the partial sum with the dashed ideal waveform as
			<MathInline math={"N"} /> increases.
		</div>
	{/if}
	<p
		id={spectrumId}
		class="spectrum-description"
	>
		The spectrum shows DC and positive-index exponential magnitudes. For a
		real signal,
		<MathInline math={"F_{-n}=F_n^*"} />; each nonzero-frequency pair has
		harmonic amplitude
		<MathInline math={"c_n=2|F_n|"} /> and power <MathInline
			math={"2|F_n|^2"}
		/>. DC contributes <MathInline math={"|F_0|^2"} />.
	</p>
	<details class="coefficient-disclosure">
		<summary>View coefficient values and power contributions</summary>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need focus to scroll the coefficient table.) -->
		<div
			class="coefficient-table-scroll"
			role="region"
			aria-label="Fourier coefficient values"
			tabindex="0"
		>
			<table>
				<caption
					>Exponential coefficients through N={currentN};
					positive-frequency power includes the conjugate pair.</caption
				>
				<thead
					><tr
						><th scope="col">n</th><th scope="col">Real</th><th
							scope="col">Imaginary</th
						><th scope="col">Magnitude</th><th scope="col"
							>Phase (rad)</th
						><th scope="col">Power</th></tr
					></thead
				>
				<tbody>
					{#each coefficientRows as row (row.n)}
						<tr
							><th scope="row"
								>{row.n === 0 ? "0 (DC)" : row.n}</th
							><td>{formatCoefficient(row.re)}</td><td
								>{formatCoefficient(row.im)}</td
							><td>{formatCoefficient(row.magnitude)}</td><td
								>{row.phase === null
									? "—"
									: formatCoefficient(row.phase)}</td
							><td>{formatCoefficient(row.power)}</td></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
	</details>

	<section
		class="power-card"
		aria-labelledby={powerTitleId}
	>
		<div class="power-heading-row">
			<div>
				<h3 id={powerTitleId}>Parseval Power Distribution</h3>
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
				text={`Minimum highest-harmonic limits: ${FOURIER_POWER_TARGETS.map(({ key, percent }) => `$N_{${percent}\\%}=${powerThresholds[key]}$`).join("; ")}. Here $N$ is the highest included harmonic; zero-valued harmonics add no power.`}
			/>
		</div>
	</section>
</div>

<style>
	.spectrum-description {
		color: var(--text-secondary);
		margin: 0;
	}
	.coefficient-disclosure summary {
		cursor: pointer;
		font-weight: 600;
	}
	.coefficient-table-scroll {
		overflow-x: auto;
		max-width: 100%;
		margin-top: 0.75rem;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-variant-numeric: tabular-nums;
	}
	caption {
		text-align: left;
		color: var(--text-secondary);
		padding-bottom: 0.5rem;
	}
	th,
	td {
		text-align: right;
		padding: 0.5rem;
		border-bottom: 1px solid var(--border-color);
		white-space: nowrap;
	}
	@media (prefers-reduced-motion: reduce) {
		.fourier-canvas-wrapper :global(*) {
			animation: none !important;
			transition: none !important;
		}
	}
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
