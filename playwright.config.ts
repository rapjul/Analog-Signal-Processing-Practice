import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Testing Configuration for SignalLab.
 *
 * Configures test discovery, local web server initialization on dedicated port 33210 (EE210),
 * viewport profiles for Desktop, Laptop, Tablet, and Mobile, and trace/screenshot artifacts.
 */
export default defineConfig({
	testDir: "./tests/e2e",
	/* Maximum time one test can run for */
	timeout: 30 * 1000,
	expect: {
		/**
		 * Maximum time expect() should wait for the condition to be met.
		 */
		timeout: 5000,
	},
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI if needed */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: [
		["./tests/e2e/clean-snapshot-reporter.ts"],
		["html", { open: "never", outputFolder: "playwright-report" }],
	],
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: "http://127.0.0.1:33210",

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},

	/* Configure projects for major browsers and viewport sizes */
	projects: [
		{
			name: "Desktop-Chrome",
			testIgnore: [
				"**/visual-screenshots.spec.ts",
				"**/solver-visual-snapshots.spec.ts",
			],
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1920, height: 1080 },
			},
		},
		{
			name: "Laptop-Standard",
			testIgnore: [
				"**/visual-screenshots.spec.ts",
				"**/solver-visual-snapshots.spec.ts",
			],
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 800 },
			},
		},
		{
			name: "Tablet-iPad",
			testIgnore: [
				"**/visual-screenshots.spec.ts",
				"**/solver-visual-snapshots.spec.ts",
			],
			use: {
				...devices["iPad Pro 11"],
			},
		},
		{
			name: "Mobile-iPhone",
			testIgnore: [
				"**/visual-screenshots.spec.ts",
				"**/solver-visual-snapshots.spec.ts",
			],
			use: {
				...devices["iPhone 13"],
			},
		},
		{
			name: "Visual-Screenshots",
			testMatch: "**/visual-screenshots.spec.ts",
			use: {
				...devices["Desktop Chrome"],
			},
		},
		{
			name: "Solver-Visual-Snapshots",
			testMatch: "**/solver-visual-snapshots.spec.ts",
			snapshotPathTemplate:
				"{testDir}/solver-visual-baselines/{arg}{ext}",
			use: {
				...devices["Desktop Chrome"],
				// Keep regression images in CSS-pixel space. The application canvases
				// still honor devicePixelRatio in dedicated device tests.
				deviceScaleFactor: 1,
			},
		},
	],

	/* Run your local dev server before starting the tests */
	webServer: {
		command: "npm run dev -- --host 127.0.0.1 --port 33210",
		url: "http://127.0.0.1:33210",
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
});
