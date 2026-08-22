<script lang="ts">
	/**
	 * FourierCanvas Svelte 5 Component.
	 *
	 * Dual-panel visualizer displaying:
	 * 1. Time Domain: Ideal signal x(t) (dashed) vs. N-harmonic partial sum S_N(t) (cyan),
	 *    demonstrating Gibbs phenomenon overshoot at discontinuities.
	 * 2. Frequency Domain: Bar chart spectrum of harmonic magnitudes |F_n| for n = 1 ... N.
	 * 3. Parseval Analysis: Captured power and harmonic thresholds for the active N.
	 */
	import {
		computeFourierCoefficients,
		computeHarmonicPowerThresholds,
		computePartialSum,
		computeSignalPower,
		evaluateFourierWaveform,
		formatPowerCapturePercent,
		type FourierCoefficients,
		type FourierWaveformType,
	} from "$lib/math-engine/fourier-series";
	import MathInline from "../math/MathInline.svelte";
	import MathText from "../math/MathText.svelte";

	interface Props {
		/** Exact coefficients for the generated problem. */
		coefficients?: FourierCoefficients;
		/** Selected waveform type */
		waveformType?: FourierWaveformType;
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
	let coeffs = $derived<FourierCoefficients>(
		coefficients ?? computeFourierCoefficients(waveformType),
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

		// Target magnitudes for harmonics 1..50
		const targetMags = Array.from({ length: 51 }, () => 0);
		for (let n = 1; n <= 50; n++) {
			if (n <= targetDisplayN) {
				const { re, im } = currentCoeffs.Fn(n);
				targetMags[n] = Math.sqrt(re * re + im * im);
			} else {
				targetMags[n] = 0;
			}
		}

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
				const diff = targetMags[n] - animatedMags[n];
				if (Math.abs(diff) > maxMagDiff) maxMagDiff = Math.abs(diff);
				animatedMags[n] += diff * 0.18;
			}

			const style = getComputedStyle(document.documentElement);
			const bgCard =
				style.getPropertyValue("--bg-card").trim() || "#121214";
			const borderColor =
				style.getPropertyValue("--border-color").trim() || "#2d2d35";
			const textSecondary =
				style.getPropertyValue("--text-secondary").trim() || "#a1a1aa";
			const fontFamily =
				style.getPropertyValue("--font-sans").trim() ||
				style.fontFamily ||
				"Inter, system-ui, -apple-system, sans-serif";

			const ctxUpper = canvasUpperEl.getContext("2d");
			const ctxLower = canvasLowerEl.getContext("2d");
			if (!ctxUpper || !ctxLower) return;

			// Use native devicePixelRatio (high resolution automatically active on HiDPI / Retina displays)
			const dpr = window.devicePixelRatio || 1;

			// Upper Canvas setup
			const rectUpper = canvasUpperEl.getBoundingClientRect();
			canvasUpperEl.width = rectUpper.width * dpr;
			canvasUpperEl.height = rectUpper.height * dpr;
			ctxUpper.scale(dpr, dpr);
			const widthUpper = rectUpper.width;
			const heightUpper = rectUpper.height;

			// Lower Canvas setup
			const rectLower = canvasLowerEl.getBoundingClientRect();
			canvasLowerEl.width = rectLower.width * dpr;
			canvasLowerEl.height = rectLower.height * dpr;
			ctxLower.scale(dpr, dpr);
			const widthLower = rectLower.width;
			const heightLower = rectLower.height;

			// Clear both canvases
			ctxUpper.fillStyle = bgCard;
			ctxUpper.fillRect(0, 0, widthUpper, heightUpper);

			ctxLower.fillStyle = bgCard;
			ctxLower.fillRect(0, 0, widthLower, heightLower);

			const padding = 35;
			const tMin = -currentCoeffs.T0;
			const tMax = currentCoeffs.T0;
			const toX = (t: number) =>
				padding +
				((t - tMin) / (tMax - tMin)) * (widthUpper - padding * 2);

			// --- Panel 1: Upper Time-Domain S_N(t) ---
			const p1ZeroY = heightUpper / 2;
			const p1ScaleY = (heightUpper - 40) / (2.6 * currentCoeffs.A);

			ctxUpper.strokeStyle = borderColor;
			ctxUpper.lineWidth = 1;
			ctxUpper.beginPath();
			ctxUpper.moveTo(padding, p1ZeroY);
			ctxUpper.lineTo(widthUpper - padding, p1ZeroY);
			ctxUpper.stroke();

			// High-resolution sampling density for smooth waveform curves & sharp Gibbs overshoot
			const numSamples = 1000;
			const dt = (tMax - tMin) / numSamples;

			// Ideal waveform reference, segmented at jump discontinuities.
			ctxUpper.strokeStyle = textSecondary;
			ctxUpper.lineWidth = 1.5;
			ctxUpper.setLineDash([6, 5]);
			ctxUpper.beginPath();
			let previousIdeal: number | null = null;
			let previousIdealY: number | null = null;
			for (let i = 0; i <= numSamples; i++) {
				const t = tMin + i * dt;
				const ideal = evaluateFourierWaveform(currentCoeffs, t);
				const px = toX(t);
				const py = p1ZeroY - ideal * p1ScaleY;
				const crossesJump =
					previousIdeal !== null &&
					Math.abs(ideal - previousIdeal) > currentCoeffs.A;
				if (i === 0) {
					ctxUpper.moveTo(px, py);
				} else if (crossesJump && previousIdealY !== null) {
					ctxUpper.lineTo(px, previousIdealY);
					ctxUpper.lineTo(px, py);
				} else {
					ctxUpper.lineTo(px, py);
				}
				previousIdeal = ideal;
				previousIdealY = py;
			}
			ctxUpper.stroke();
			ctxUpper.setLineDash([]);

			ctxUpper.strokeStyle = "#06b6d4";
			ctxUpper.lineWidth = 2;
			ctxUpper.beginPath();

			for (let i = 0; i <= numSamples; i++) {
				const t = tMin + i * dt;
				const valSum = computePartialSum(currentCoeffs, currentN, t);
				const px = toX(t);
				const py = p1ZeroY - valSum * p1ScaleY;

				if (i === 0) ctxUpper.moveTo(px, py);
				else ctxUpper.lineTo(px, py);
			}
			ctxUpper.stroke();

			// --- Panel 2: Lower Frequency-Domain Spectrum |F_n| Bar Chart ---
			// Added 35px top padding so bars don't touch upper boundary
			const p2ZeroY = heightLower - 30;
			const availableHeight = heightLower - 65; // 35px top margin + 30px bottom label margin

			// Responsive horizontal padding (15px on small screens, 30px on larger screens)
			const padX = widthLower < 500 ? 15 : 30;

			// Cap max stepX spacing to 36px per harmonic on wide screens
			const rawStepX =
				(widthLower - padX * 2) / Math.max(1, currentDisplayN);
			const stepX = Math.min(36, rawStepX);
			const spectrumContentW = stepX * Math.max(1, currentDisplayN);
			// Center the spectrum plot horizontally if stepX was capped
			const startX =
				padX + (widthLower - padX * 2 - spectrumContentW) / 2;

			// Scale bar width generously (takes 70% of stepX on small screens, clamped between 3px and 22px)
			const barWidth = Math.min(22, Math.max(3, stepX * 0.7));

			const axisLeftX = startX;
			const axisRightX = startX + spectrumContentW;

			ctxLower.strokeStyle = borderColor;
			ctxLower.lineWidth = 1;
			ctxLower.beginPath();
			ctxLower.moveTo(axisLeftX, p2ZeroY);
			ctxLower.lineTo(axisRightX, p2ZeroY);
			ctxLower.stroke();

			const displayN = Math.max(1, Math.round(currentDisplayN));

			const harmonicsByMag: { n: number; mag: number }[] = [];
			let maxCnMag = 0;
			for (let n = 1; n <= Math.max(displayN, targetDisplayN); n++) {
				const mag = animatedMags[n] || 0;
				if (mag > maxCnMag) maxCnMag = mag;
				harmonicsByMag.push({ n, mag });
			}
			if (maxCnMag === 0) maxCnMag = 1;

			const p2ScaleY = availableHeight / maxCnMag;

			// Identify top 3 biggest non-zero harmonics by energy
			harmonicsByMag.sort((a, b) => b.mag - a.mag);
			const top3Harmonics = new Set<number>(
				harmonicsByMag
					.filter((h) => h.mag > 1e-4)
					.slice(0, 3)
					.map((h) => h.n),
			);

			// Calculate candidate labeled harmonic indices up to displayN (always include top 3 biggest energy harmonics)
			const candidates: number[] = Array.from(top3Harmonics);
			const activeHarmonics = harmonicsByMag
				.filter((h) => h.mag > 1e-4)
				.map((h) => h.n);

			if (displayN <= 11) {
				// For displayN <= 11, label ALL harmonics 1..displayN (including zero magnitude ones)
				for (let n = 1; n <= displayN; n++) {
					candidates.push(n);
				}
			} else if (displayN <= 20) {
				// For displayN 12..20, label all active (non-zero magnitude) harmonics
				for (let n = 1; n <= displayN; n++) {
					if (
						activeHarmonics.length === 0 ||
						activeHarmonics.includes(n)
					) {
						candidates.push(n);
					}
				}
			} else if (displayN <= 25) {
				// For displayN 21..25, label every 2nd active harmonic
				if (activeHarmonics.length > 0) {
					for (let i = 0; i < activeHarmonics.length; i += 2) {
						candidates.push(activeHarmonics[i]);
					}
				} else {
					for (let n = 1; n <= displayN; n += 2) {
						candidates.push(n);
					}
				}
			} else {
				// For displayN > 25, label every 4th active harmonic
				if (activeHarmonics.length > 0) {
					for (let i = 0; i < activeHarmonics.length; i += 4) {
						candidates.push(activeHarmonics[i]);
					}
				} else {
					for (let n = 1; n <= displayN; n += 4) {
						candidates.push(n);
					}
				}
			}

			// Sort candidate indices ascending
			const sortedCandidates = Array.from(new Set(candidates)).sort(
				(a, b) => a - b,
			);
			const xPos = (n: number) => startX + (n - 0.5) * stepX;
			const minPixelSpacing = 24;

			// Select labels guaranteeing minimum pixel spacing without collisions
			const selectedLabels: number[] = [];
			for (const n of sortedCandidates) {
				const px = xPos(n);
				const prevX =
					selectedLabels.length > 0
						? xPos(selectedLabels[selectedLabels.length - 1])
						: -1000;
				if (
					px - prevX >= minPixelSpacing ||
					selectedLabels.length === 0
				) {
					selectedLabels.push(n);
				}
			}
			const finalLabeledSet = new Set(selectedLabels);

			const renderMaxN = Math.max(displayN, Math.ceil(currentDisplayN));
			for (let n = 1; n <= renderMaxN; n++) {
				const mag = animatedMags[n] || 0;
				if (mag < 1e-5 && n > displayN) continue;

				const bx = xPos(n);
				const bHeight = Math.max(0, mag * p2ScaleY);
				const by = p2ZeroY - bHeight;

				ctxLower.fillStyle = mag > 1e-4 ? "#f59e0b" : "#475569";
				ctxLower.fillRect(bx - barWidth / 2, by, barWidth, bHeight);

				if (finalLabeledSet.has(n)) {
					ctxLower.fillStyle = textSecondary;
					ctxLower.font = `13px ${fontFamily}`;
					ctxLower.textAlign = "center";
					ctxLower.fillText(`${n}`, bx, p2ZeroY + 14);
				}
			}

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
