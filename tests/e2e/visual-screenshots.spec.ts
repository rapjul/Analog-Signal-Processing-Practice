import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Visual Verification & Screenshot Capture Suite for SignalLab.
 *
 * Captures high-resolution visual screenshots across all 7 routes in both Dark and Light themes
 * for 4 distinct screen resolutions (Desktop, Laptop, Tablet, Mobile).
 * All generated images are stored in `tests/e2e/screenshots/` (git-ignored).
 */

const SCREENSHOT_DIR = path.resolve(process.cwd(), "tests/e2e/screenshots");

const VIEWPORT_CONFIGS = [
	{ name: "desktop-1920x1080", width: 1920, height: 1080 },
	{ name: "laptop-1280x800", width: 1280, height: 800 },
	{ name: "tablet-768x1024", width: 768, height: 1024 },
	{ name: "mobile-375x812", width: 375, height: 812 },
	{ name: "mobile-narrow-320x568", width: 320, height: 568 },
];

const TARGET_ROUTES = [
	{ path: "/", slug: "home-dashboard" },
	{ path: "/odes", slug: "odes-practice" },
	{ path: "/convolution", slug: "convolution-practice" },
	{ path: "/fourier-series", slug: "fourier-series-practice" },
	{ path: "/fourier-transform", slug: "ctft-practice" },
	{ path: "/laplace", slug: "laplace-practice" },
	{ path: "/circuits", slug: "circuits-practice" },
];

test.describe("Visual Screenshot Capture Across Display Sizes & Themes", () => {
	test.beforeAll(() => {
		if (!fs.existsSync(SCREENSHOT_DIR)) {
			fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
		}
	});

	for (const vp of VIEWPORT_CONFIGS) {
		for (const target of TARGET_ROUTES) {
			for (const theme of ["dark", "light"] as const) {
				/**
				 * Captures full-page screenshot for a specific viewport, route, and theme.
				 */
				test(`capture ${target.slug} on ${vp.name} (${theme} mode)`, async ({
					page,
				}) => {
					await page.setViewportSize({
						width: vp.width,
						height: vp.height,
					});
					await page.goto(target.path);
					await page.waitForLoadState("networkidle");

					// Set desired theme mode on the html element
					await page.evaluate((th) => {
						document.documentElement.setAttribute("data-theme", th);
						localStorage.setItem("theme", th);
					}, theme);

					// Small wait to allow canvas and Katex redraws to stabilize
					await page.waitForTimeout(350);

					const filename = `${target.slug}__${theme}__${vp.name}.png`;
					const screenshotPath = path.join(SCREENSHOT_DIR, filename);

					await page.screenshot({
						path: screenshotPath,
						fullPage: true,
					});
				});
			}
		}
	}
});
