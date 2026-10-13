import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

/** Run the existing browser tests against a completed production build. */
export default defineConfig({
	...baseConfig,
	// State-selection shortcuts are deliberately absent from production builds.
	grepInvert: /@dev-harness/,
	webServer: {
		command:
			"npm run preview -- --host 127.0.0.1 --port 33210 --strictPort",
		url: "http://127.0.0.1:33210",
		reuseExistingServer: false,
		timeout: 120 * 1000,
	},
});
