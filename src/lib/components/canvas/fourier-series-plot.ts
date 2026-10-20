/**
 * Fourier Series Canvas Plotting and Geometry Primitives.
 *
 * Implements sampling, coordinate scaling, waveform geometry, and Canvas 2D
 * rendering routines for time-domain partial sums and frequency-domain harmonic spectra.
 */

import {
	computePartialSum,
	evaluateFourierSeriesWaveform,
	type FourierSeriesCoefficients,
} from "$lib/math-engine/fourier-series/index";

/** Theme colors consumed by the Fourier Series canvas renderers. */
export interface FourierPlotTheme {
	/** Plot background color */
	background: string;
	/** Primary axis and border color */
	borderColor: string;
	/** Secondary label and reference text color */
	textSecondary: string;
	/** Ideal waveform curve color */
	waveformColor?: string;
	/** Synthesized partial sum curve color */
	partialSumColor?: string;
	/** Active harmonic bar fill color */
	activeBarColor?: string;
	/** Inactive or zero-magnitude harmonic bar fill color */
	inactiveBarColor?: string;
	/** Font family for axis labels */
	fontFamily?: string;
}

/** Cached time-domain ordinates, indexed uniformly from minus to plus one period. */
interface FourierTimeSamples {
	/** Ideal waveform amplitudes. */
	ideal: number[];
	/** Finite Fourier reconstruction amplitudes. */
	partial: number[];
}

/** Sampling cache released when its coefficient model is no longer referenced. */
const timeSamples = new WeakMap<
	FourierSeriesCoefficients,
	Map<number, FourierTimeSamples>
>();

/**
 * Samples each coefficient model and harmonic limit once, independently of pixel geometry.
 * @param coeffs - Active coefficient model.
 * @param N - Highest included harmonic.
 * @returns Cached ideal and reconstructed ordinates.
 */
function sampleTimeDomain(
	coeffs: FourierSeriesCoefficients,
	N: number,
): FourierTimeSamples {
	let cache = timeSamples.get(coeffs);
	if (!cache) {
		cache = new Map();
		timeSamples.set(coeffs, cache);
	}
	const existing = cache.get(N);
	if (existing) return existing;
	const samples: FourierTimeSamples = { ideal: [], partial: [] };
	for (let i = 0; i <= 1000; i++) {
		const t = (i / 500 - 1) * coeffs.T0;
		samples.ideal.push(evaluateFourierSeriesWaveform(coeffs, t));
		samples.partial.push(computePartialSum(coeffs, N, t));
	}
	cache.set(N, samples);
	return samples;
}

/**
 * Extracts the current theme colors and typography from computed CSS styles.
 *
 * @param {CSSStyleDeclaration} style - Computed document style declaration.
 * @returns {FourierPlotTheme} Theme descriptor with fallback values.
 */
export function getFourierPlotTheme(
	style: CSSStyleDeclaration,
): FourierPlotTheme {
	const bgCard = style.getPropertyValue("--bg-card").trim() || "#121214";
	const borderColor =
		style.getPropertyValue("--border-color").trim() || "#2d2d35";
	const textSecondary =
		style.getPropertyValue("--text-secondary").trim() || "#a1a1aa";
	const fontFamily =
		style.getPropertyValue("--font-sans").trim() ||
		style.fontFamily ||
		"Inter, system-ui, -apple-system, sans-serif";

	return {
		background: bgCard,
		borderColor,
		textSecondary,
		waveformColor: textSecondary,
		partialSumColor: "#06b6d4",
		activeBarColor: "#f59e0b",
		inactiveBarColor: "#475569",
		fontFamily,
	};
}

/**
 * Computes target magnitudes |F_n| for DC and harmonics through 50.
 *
 * @param {FourierSeriesCoefficients} coeffs - Active Fourier series coefficient evaluators.
 * @param {number} targetDisplayN - Maximum active harmonic index to sample.
 * @returns {number[]} Array of harmonic magnitudes indexed 0 to 50.
 */
export function computeTargetMagnitudes(
	coeffs: FourierSeriesCoefficients,
	targetDisplayN: number,
): number[] {
	const targetMags = Array.from({ length: 51 }, () => 0);
	for (let n = 0; n <= 50; n++) {
		if (n <= targetDisplayN) {
			const { re, im } = coeffs.Fn(n);
			targetMags[n] = Math.hypot(re, im);
		} else {
			targetMags[n] = 0;
		}
	}
	return targetMags;
}

/**
 * Draws the time-domain comparison panel: Ideal x(t) (dashed) vs. Partial Sum S_N(t) (cyan).
 *
 * @param {CanvasRenderingContext2D} ctx - Target 2D canvas rendering context.
 * @param {number} width - Canvas physical display width in pixels.
 * @param {number} height - Canvas physical display height in pixels.
 * @param {FourierSeriesCoefficients} coeffs - Waveform coefficients and period parameters.
 * @param {number} currentN - Active number of partial sum harmonics N.
 * @param {FourierPlotTheme} theme - Active visual theme colors.
 */
export function drawFourierTimeDomain(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	coeffs: FourierSeriesCoefficients,
	currentN: number,
	theme: FourierPlotTheme,
): void {
	// Clear background
	ctx.fillStyle = theme.background;
	ctx.fillRect(0, 0, width, height);

	const padding = 35;
	/** @param i - Uniform sample index. @returns Horizontal pixel coordinate. */
	const toX = (i: number): number =>
		padding + (i / 1000) * (width - padding * 2);

	const p1ZeroY = height / 2;
	const p1ScaleY = (height - 40) / (2.6 * coeffs.A);

	// Zero axis line
	ctx.strokeStyle = theme.borderColor;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(padding, p1ZeroY);
	ctx.lineTo(width - padding, p1ZeroY);
	ctx.stroke();

	// High-resolution sampling density for smooth waveform curves & sharp Gibbs overshoot
	const numSamples = 1000;
	const samples = sampleTimeDomain(coeffs, currentN);

	// Ideal waveform reference, segmented at jump discontinuities
	ctx.strokeStyle = theme.waveformColor ?? theme.textSecondary;
	ctx.lineWidth = 1.5;
	ctx.setLineDash([6, 5]);
	ctx.beginPath();
	let previousIdeal: number | null = null;
	let previousIdealY: number | null = null;
	for (let i = 0; i <= numSamples; i++) {
		const ideal = samples.ideal[i]!;
		const px = toX(i);
		const py = p1ZeroY - ideal * p1ScaleY;
		const crossesJump =
			previousIdeal !== null &&
			Math.abs(ideal - previousIdeal) > coeffs.A;
		if (i === 0) {
			ctx.moveTo(px, py);
		} else if (crossesJump && previousIdealY !== null) {
			ctx.lineTo(px, previousIdealY);
			ctx.lineTo(px, py);
		} else {
			ctx.lineTo(px, py);
		}
		previousIdeal = ideal;
		previousIdealY = py;
	}
	ctx.stroke();
	ctx.setLineDash([]);

	// Partial sum approximation curve S_N(t)
	ctx.strokeStyle = theme.partialSumColor ?? "#06b6d4";
	ctx.lineWidth = 2;
	ctx.beginPath();
	for (let i = 0; i <= numSamples; i++) {
		const valSum = samples.partial[i]!;
		const px = toX(i);
		const py = p1ZeroY - valSum * p1ScaleY;

		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	ctx.stroke();
	ctx.fillStyle = theme.textSecondary;
	ctx.font = `12px ${theme.fontFamily ?? "sans-serif"}`;
	ctx.textAlign = "center";
	for (const [index, label] of [
		[0, "−T₀"],
		[500, "0"],
		[1000, "T₀"],
	] as const)
		ctx.fillText(label, toX(index), height - 5);
	ctx.fillText("Time t (s)", width / 2, height - 20);
	ctx.textAlign = "left";
	ctx.fillText("x(t), Sₙ(t)", 3, 14);
	ctx.fillText(`A=${coeffs.A}`, 3, 28);
	ctx.fillText("+A", 3, p1ZeroY - coeffs.A * p1ScaleY + 4);
	ctx.fillText("0", 3, p1ZeroY + 4);
	ctx.fillText("−A", 3, p1ZeroY + coeffs.A * p1ScaleY + 4);
}

/**
 * Draws the frequency-domain harmonic magnitude spectrum |F_n| bar chart with responsive labels.
 *
 * @param {CanvasRenderingContext2D} ctx - Target 2D canvas rendering context.
 * @param {number} width - Canvas physical display width in pixels.
 * @param {number} height - Canvas physical display height in pixels.
 * @param {number} currentDisplayN - Current harmonic limit (interpolated for animation).
 * @param {number[]} animatedMags - Animated harmonic magnitude values.
 * @param {number} targetDisplayN - Final target harmonic limit.
 * @param {FourierPlotTheme} theme - Active visual theme colors.
 */
export function drawFourierHarmonicSpectrum(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	currentDisplayN: number,
	animatedMags: number[],
	targetDisplayN: number,
	theme: FourierPlotTheme,
): void {
	// Clear background
	ctx.fillStyle = theme.background;
	ctx.fillRect(0, 0, width, height);

	const p2ZeroY = height - 30;
	const availableHeight = height - 65; // 35px top margin + 30px bottom label margin

	// Responsive horizontal padding (15px on small screens, 30px on larger screens)
	const padX = width < 500 ? 15 : 30;

	// Cap max stepX spacing to 36px per harmonic on wide screens
	const rawStepX = (width - padX * 2) / (Math.max(1, currentDisplayN) + 1);
	const stepX = Math.min(36, rawStepX);
	const spectrumContentW = stepX * (Math.max(1, currentDisplayN) + 1);
	// Center the spectrum plot horizontally if stepX was capped
	const startX = padX + (width - padX * 2 - spectrumContentW) / 2;

	// Scale bar width generously (takes 70% of stepX on small screens, clamped between 3px and 22px)
	const barWidth = Math.min(22, Math.max(3, stepX * 0.7));

	const axisLeftX = startX;
	const axisRightX = startX + spectrumContentW;

	ctx.strokeStyle = theme.borderColor;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(axisLeftX, p2ZeroY);
	ctx.lineTo(axisRightX, p2ZeroY);
	ctx.stroke();

	const displayN = Math.max(1, Math.round(currentDisplayN));

	const harmonicsByMag: { n: number; mag: number }[] = [];
	let maxCnMag = 0;
	for (let n = 0; n <= Math.max(displayN, targetDisplayN); n++) {
		const mag = animatedMags[n] || 0;
		if (mag > maxCnMag) maxCnMag = mag;
		harmonicsByMag.push({ n, mag });
	}
	if (maxCnMag === 0) maxCnMag = 1;
	const activeThreshold = maxCnMag * 1e-8;

	const p2ScaleY = availableHeight / maxCnMag;

	// Identify top 3 biggest non-zero harmonics by energy
	harmonicsByMag.sort((a, b) => b.mag - a.mag);
	const top3Harmonics = new Set<number>(
		harmonicsByMag
			.filter((h) => h.mag > activeThreshold)
			.slice(0, 3)
			.map((h) => h.n),
	);

	// Calculate candidate labeled harmonic indices up to displayN
	const candidates: number[] = [0, ...top3Harmonics];
	const activeHarmonics = harmonicsByMag
		.filter((h) => h.mag > activeThreshold)
		.map((h) => h.n);

	if (displayN <= 11) {
		for (let n = 1; n <= displayN; n++) {
			candidates.push(n);
		}
	} else if (displayN <= 20) {
		for (let n = 1; n <= displayN; n++) {
			if (activeHarmonics.length === 0 || activeHarmonics.includes(n)) {
				candidates.push(n);
			}
		}
	} else if (displayN <= 25) {
		if (activeHarmonics.length > 0) {
			for (let i = 0; i < activeHarmonics.length; i += 2) {
				const harm = activeHarmonics[i];
				if (harm !== undefined) {
					candidates.push(harm);
				}
			}
		} else {
			for (let n = 1; n <= displayN; n += 2) {
				candidates.push(n);
			}
		}
	} else {
		if (activeHarmonics.length > 0) {
			for (let i = 0; i < activeHarmonics.length; i += 4) {
				const harm = activeHarmonics[i];
				if (harm !== undefined) {
					candidates.push(harm);
				}
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
	/** @param n - DC or positive harmonic index. @returns Bar center in pixels. */
	const xPos = (n: number): number => startX + (n + 0.5) * stepX;
	const minPixelSpacing = 24;

	// Select labels guaranteeing minimum pixel spacing without collisions
	const selectedLabels: number[] = [];
	for (const n of sortedCandidates) {
		const px = xPos(n);
		const last = selectedLabels[selectedLabels.length - 1];
		const prevX = last !== undefined ? xPos(last) : -1000;
		if (px - prevX >= minPixelSpacing || selectedLabels.length === 0) {
			selectedLabels.push(n);
		}
	}
	const finalLabeledSet = new Set(selectedLabels);

	const renderMaxN = Math.max(displayN, Math.ceil(currentDisplayN));
	for (let n = 0; n <= renderMaxN; n++) {
		const mag = animatedMags[n] || 0;
		if (mag < activeThreshold && n > displayN) continue;

		const bx = xPos(n);
		const bHeight = Math.max(0, mag * p2ScaleY);
		const by = p2ZeroY - bHeight;

		ctx.fillStyle =
			mag > activeThreshold
				? (theme.activeBarColor ?? "#f59e0b")
				: (theme.inactiveBarColor ?? "#475569");
		ctx.fillRect(bx - barWidth / 2, by, barWidth, bHeight);

		if (finalLabeledSet.has(n)) {
			ctx.fillStyle = theme.textSecondary;
			ctx.font = `13px ${theme.fontFamily ?? "sans-serif"}`;
			ctx.textAlign = "center";
			ctx.fillText(`${n}`, bx, p2ZeroY + 14);
		}
	}
	ctx.fillStyle = theme.textSecondary;
	ctx.font = `12px ${theme.fontFamily ?? "sans-serif"}`;
	ctx.textAlign = "left";
	ctx.fillText("|Fₙ|", padX, 14);
	ctx.textAlign = "right";
	ctx.fillText("Index n (0 = DC)", width - padX, height - 2);
}
