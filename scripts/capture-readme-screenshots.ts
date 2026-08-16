import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

/**
 * Configuration options for capturing a viewport screenshot.
 */
export interface ScreenshotTarget {
	/** URL path relative to the base server (e.g. `/fourier-series`) */
	route: string;
	/** Output filename inside the screenshots directory */
	filename: string;
	/** Color theme mode to apply before capturing ('dark' | 'light') */
	theme: "dark" | "light";
	/** Optional wait time in milliseconds for animations/canvas to settle */
	delayMs?: number;
}

/**
 * Target configurations for README showcase assets.
 */
const SCREENSHOT_TARGETS: ScreenshotTarget[] = [
	{
		route: "/",
		filename: "dashboard-dark.png",
		theme: "dark",
		delayMs: 600,
	},
	{
		route: "/fourier-series",
		filename: "fourier-series-practice.png",
		theme: "dark",
		delayMs: 700,
	},
	{
		route: "/odes",
		filename: "odes-practice.png",
		theme: "light",
		delayMs: 600,
	},
];

/** Viewport width in pixels (16:10 standard desktop ratio). */
const VIEWPORT_WIDTH = 1280;

/** Viewport height in pixels. */
const VIEWPORT_HEIGHT = 800;

/** Output directory for README assets. */
const OUTPUT_DIRECTORY = path.resolve(process.cwd(), "docs/assets/screenshots");

/**
 * Probes candidate URLs to find an active SignalLab development server.
 *
 * @param candidateUrls - List of candidate base URLs to probe.
 * @returns Active base URL or null if no server is running.
 */
async function findActiveBaseUrl(
	candidateUrls: string[],
): Promise<string | null> {
	for (const url of candidateUrls) {
		try {
			const res = await fetch(url, { method: "HEAD" });
			if (res.ok || res.status === 200 || res.status === 304) {
				return url;
			}
		} catch {
			// Ignore connection failures while probing
		}
	}
	return null;
}

/**
 * Main execution function to capture viewport-framed screenshots.
 */
async function captureReadmeScreenshots(): Promise<void> {
	console.log("🔍 Probing for active SignalLab server...");

	const candidateUrls = [
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"http://localhost:33210",
		"http://127.0.0.1:33210",
	];

	const baseUrl = await findActiveBaseUrl(candidateUrls);

	if (!baseUrl) {
		console.error(
			"\x1b[31mError:\x1b[0m No active SignalLab server found.\n" +
				"Please start the development server first with: npm run dev",
		);
		process.exit(1);
	}

	console.log(`🌐 Connected to server at ${baseUrl}`);

	if (!fs.existsSync(OUTPUT_DIRECTORY)) {
		fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
	}

	const browser = await chromium.launch();
	const page = await browser.newPage({
		viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
	});

	try {
		for (const target of SCREENSHOT_TARGETS) {
			const targetUrl = new URL(target.route, baseUrl).toString();
			console.log(
				`📸 Capturing ${target.filename} (${target.theme} mode) from ${target.route}...`,
			);

			await page.goto(targetUrl);
			await page.waitForLoadState("networkidle");

			// Set the theme via DOM attribute and local storage
			await page.evaluate((themeMode: string) => {
				document.documentElement.setAttribute("data-theme", themeMode);
				localStorage.setItem("theme", themeMode);
			}, target.theme);

			// Allow KaTeX fonts, canvas plots, and CSS transitions to settle
			await page.waitForTimeout(target.delayMs ?? 500);

			const outputPath = path.join(OUTPUT_DIRECTORY, target.filename);
			await page.screenshot({
				path: outputPath,
				fullPage: false, // Viewport-framed capture only
			});

			console.log(`   ✅ Saved: ${outputPath}`);
		}

		console.log(
			"\n🎉 All README viewport screenshots successfully generated!",
		);
	} catch (error) {
		console.error("\x1b[31mError capturing screenshots:\x1b[0m", error);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

// Execute script
captureReadmeScreenshots();
