import { defineConfig, devices } from "@playwright/test";

/** Build and smoke jobs supply the same BASE_PATH to the static host. */
const basePath = (process.env.BASE_PATH ?? "").replace(/\/$/, "");

/** Isolated Chromium checks exercise the artifact without Vite routing. */
export default defineConfig({
	testDir: "./tests/pages",
	timeout: 60_000,
	expect: { timeout: 10_000 },
	forbidOnly: !!process.env.CI,
	workers: 1,
	retries: 0,
	reporter: "line",
	use: {
		...devices["Desktop Chrome"],
		baseURL: "http://127.0.0.1:33211",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	webServer: {
		command: "node src/lib/testing/pages-static-server.ts",
		url: `http://127.0.0.1:33211${basePath}/`,
		reuseExistingServer: false,
		timeout: 30_000,
	},
});
