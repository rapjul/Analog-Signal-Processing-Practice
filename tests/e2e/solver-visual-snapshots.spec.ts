import fs from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";

/**
 * Automated Solved-Problem Visual Snapshot Suite for SignalLab.
 *
 * Programmatically navigates through all problem archetypes, captures high-DPI 2x Retina snapshots
 * of interactive inputs & hints, diagnostic misconception banners, and full end-to-end solved states
 * with waveform/spectrum canvas visualizers across multiple screen resolutions and themes.
 */

const SOLVERS_SCREENSHOT_DIR = path.resolve(
	process.cwd(),
	"tests/e2e/screenshots/solvers",
);

/** Viewport definitions with high-DPI 2x device scale factor */
const SNAPSHOT_VIEWPORTS = [
	{ name: "desktop-1280x800", width: 1280, height: 800 },
	{ name: "tablet-768x1024", width: 768, height: 1024 },
	{ name: "mobile-narrow-320x568", width: 320, height: 568 },
];

/** Problem archetypes to snapshot */
const PROBLEM_ARCHETYPES = [
	{
		module: "odes",
		slug: "odes-1st-order-exponential",
		title: "1st-Order Exponential ODE",
		path: "/odes?rootType=first_order&forcing=exponential",
		isItsStepper: true,
	},
	{
		module: "odes",
		slug: "odes-2nd-order-distinct-real",
		title: "2nd-Order Distinct Real ODE",
		path: "/odes?rootType=distinct_real&forcing=exponential",
		isItsStepper: true,
	},
	{
		module: "odes",
		slug: "odes-2nd-order-repeated-real",
		title: "2nd-Order Repeated Real ODE",
		path: "/odes?rootType=repeated_real&forcing=constant",
		isItsStepper: true,
	},
	{
		module: "odes",
		slug: "odes-2nd-order-complex-conjugate",
		title: "2nd-Order Complex Conjugate ODE",
		path: "/odes?rootType=complex_conjugate&forcing=sinusoid",
		isItsStepper: true,
	},
	{
		module: "fourier-series",
		slug: "fourier-series-square-wave",
		title: "Fourier Series Square Wave",
		path: "/fourier-series?waveform=square",
		isItsStepper: true,
	},
	{
		module: "fourier-series",
		slug: "fourier-series-triangle-wave",
		title: "Fourier Series Triangle Wave",
		path: "/fourier-series?waveform=triangle",
		isItsStepper: true,
	},
	{
		module: "fourier-series",
		slug: "fourier-series-sawtooth-wave",
		title: "Fourier Series Sawtooth Wave",
		path: "/fourier-series?waveform=sawtooth",
		isItsStepper: true,
	},
	{
		module: "convolution",
		slug: "convolution-continuous-time",
		title: "Continuous-Time Convolution",
		path: "/convolution",
		isItsStepper: false,
	},
	{
		module: "laplace",
		slug: "laplace-inverse-pfd",
		title: "Inverse Laplace & PFD",
		path: "/laplace",
		isItsStepper: false,
	},
	{
		module: "fourier-transform",
		slug: "ctft-transform-duality",
		title: "CTFT Transform & Duality",
		path: "/fourier-transform",
		isItsStepper: false,
	},
	{
		module: "circuits",
		slug: "circuits-frequency-response",
		title: "Circuits & Frequency Response",
		path: "/circuits",
		isItsStepper: false,
	},
];

test.describe("Automated Solved-Problem Visual Snapshots Suite", () => {
	test.beforeAll(() => {
		if (!fs.existsSync(SOLVERS_SCREENSHOT_DIR)) {
			fs.mkdirSync(SOLVERS_SCREENSHOT_DIR, { recursive: true });
		}
	});

	for (const archetype of PROBLEM_ARCHETYPES) {
		for (const vp of SNAPSHOT_VIEWPORTS) {
			for (const theme of ["dark", "light"] as const) {
				test(`capture ${archetype.slug} on ${vp.name} (${theme})`, async ({
					page,
				}) => {
					// Set viewport with 2x Retina scale factor
					await page.setViewportSize({
						width: vp.width,
						height: vp.height,
					});

					const archetypeDir = path.join(
						SOLVERS_SCREENSHOT_DIR,
						archetype.module,
						archetype.slug,
					);
					if (!fs.existsSync(archetypeDir)) {
						fs.mkdirSync(archetypeDir, { recursive: true });
					}

					await page.goto(archetype.path);
					await page.waitForLoadState("networkidle");

					// Apply theme
					await page.evaluate((th) => {
						document.documentElement.setAttribute("data-theme", th);
						localStorage.setItem("theme", th);
					}, theme);

					// Wait for fonts & layout stabilization
					await page.evaluate(() => document.fonts.ready);
					await page.waitForTimeout(200);

					if (archetype.isItsStepper) {
						// ── Shot 1: Interactive Setup with Tier 3 Hints Expanded ──
						await page.evaluate(() => {
							window.__signalLabDev?.revealAllHints();
						});
						await page.waitForTimeout(200);
						await page.screenshot({
							path: path.join(
								archetypeDir,
								`01_interactive_setup__${theme}__${vp.name}.png`,
							),
							fullPage: true,
						});

						// ── Shot 2: Diagnostic Misconception Feedback Banner ───────
						await page.evaluate(() => {
							window.__signalLabDev?.simulateMisconception(
								"Misconception Diagnostic: Initial conditions must be evaluated after particular component subtraction.",
							);
						});
						await page.waitForTimeout(200);
						await page.screenshot({
							path: path.join(
								archetypeDir,
								`02_misconception_feedback__${theme}__${vp.name}.png`,
							),
							fullPage: true,
						});

						// ── Shot 3: Full End-to-End Solved State & Canvas ───────────
						await page.evaluate(() => {
							window.__signalLabDev?.solveAll();
						});
						// Wait for canvas paths and completed solution views to render
						await page.waitForTimeout(350);
						await page.screenshot({
							path: path.join(
								archetypeDir,
								`03_full_solution__${theme}__${vp.name}.png`,
							),
							fullPage: true,
						});
					} else {
						// Non-ITS module (e.g. Convolution, Laplace, CTFT, Circuits)
						await page.screenshot({
							path: path.join(
								archetypeDir,
								`01_interactive_setup__${theme}__${vp.name}.png`,
							),
							fullPage: true,
						});
					}
				});
			}
		}
	}
});
