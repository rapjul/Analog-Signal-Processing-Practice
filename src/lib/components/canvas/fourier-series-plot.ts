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

/**
 * Extracts the current theme colors and typography from computed CSS styles.
 *
 * @param {CSSStyleDeclaration} style - Computed document style declaration.
 * @returns {FourierPlotTheme} Theme descriptor with fallback values.
 */
export function getFourierPlotTheme(style: CSSStyleDeclaration): FourierPlotTheme {
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
 * Computes target magnitudes |F_n| for harmonics 1 through 50.
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
	for (let n = 1; n <= 50; n++) {
		if (n <= targetDisplayN) {
			const { re, im } = coeffs.Fn(n);
			targetMags[n] = Math.sqrt(re * re + im * im);
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
	const tMin = -coeffs.T0;
	const tMax = coeffs.T0;
	const toX = (t: number) =>
		padding + ((t - tMin) / (tMax - tMin)) * (width - padding * 2);

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
	const dt = (tMax - tMin) / numSamples;

	// Ideal waveform reference, segmented at jump discontinuities
	ctx.strokeStyle = theme.waveformColor ?? theme.textSecondary;
	ctx.lineWidth = 1.5;
	ctx.setLineDash([6, 5]);
	ctx.beginPath();
	let previousIdeal: number | null = null;
	let previousIdealY: number | null = null;
	for (let i = 0; i <= numSamples; i++) {
		const t = tMin + i * dt;
		const ideal = evaluateFourierSeriesWaveform(coeffs, t);
		const px = toX(t);
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
		const t = tMin + i * dt;
		const valSum = computePartialSum(coeffs, currentN, t);
		const px = toX(t);
		const py = p1ZeroY - valSum * p1ScaleY;

		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	ctx.stroke();
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
	const rawStepX =
		(width - padX * 2) / Math.max(1, currentDisplayN);
	const stepX = Math.min(36, rawStepX);
	const spectrumContentW = stepX * Math.max(1, currentDisplayN);
	// Center the spectrum plot horizontally if stepX was capped
	const startX =
		padX + (width - padX * 2 - spectrumContentW) / 2;

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

	// Calculate candidate labeled harmonic indices up to displayN
	const candidates: number[] = Array.from(top3Harmonics);
	const activeHarmonics = harmonicsByMag
		.filter((h) => h.mag > 1e-4)
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
				candidates.push(activeHarmonics[i]);
			}
		} else {
			for (let n = 1; n <= displayN; n += 2) {
				candidates.push(n);
			}
		}
	} else {
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
		if (px - prevX >= minPixelSpacing || selectedLabels.length === 0) {
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

		ctx.fillStyle =
			mag > 1e-4
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
}
