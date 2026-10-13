import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

/**
 * Standard security response headers for local Vite development and preview servers.
 *
 * Matches production headers defined in `static/_headers` and `src/app.html`.
 */
const securityHeaders: Record<string, string> = {
	"Content-Security-Policy":
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self';",
	"Permissions-Policy":
		"accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(self), screen-wake-lock=(), usb=(), bluetooth=(), serial=()",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "SAMEORIGIN",
	"Referrer-Policy": "strict-origin-when-cross-origin",
};

/**
 * Lightweight Vite development middleware plugin to gracefully handle Playwright's
 * default webServer health-check probe (`GET /index.html`).
 *
 * SvelteKit routes dynamically from `/`. When Playwright tests launch against the dev server,
 * Playwright issues a readiness probe for `/index.html`. This middleware intercepts that specific
 * dev-time probe and redirects it to `/` with a 302 status, avoiding spurious 404 logs while
 * keeping all genuine server errors, uncaught exceptions, and warnings intact.
 *
 * @returns {Plugin} Vite plugin configuration.
 */
function playwrightProbePlugin(): Plugin {
	return {
		name: "signallab:playwright-probe-handler",
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url === "/index.html") {
					res.statusCode = 302;
					res.setHeader("Location", "/");
					res.end();
					return;
				}
				next();
			});
		},
	};
}

/**
 * Configures development servers, production asset caching, and test runtimes.
 * @param context - Vite configuration context.
 * @param context.command - Whether Vite is serving or building the application.
 */
export default defineConfig(({ command }) => {
	const isBuild = command === "build";

	return {
		server: {
			headers: securityHeaders,
			// Visual state captures must not reset when generated files change.
			hmr: process.env.SIGNALLAB_VISUAL_REGRESSION !== "1",
		},
		preview: {
			headers: securityHeaders,
		},
		plugins: [
			playwrightProbePlugin(),
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in Svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes("node_modules")
							? undefined
							: true,
				},
				adapter: adapter({
					fallback: "404.html",
				}),
			}),
			VitePWA({
				strategies: "generateSW",
				registerType: "prompt",
				devOptions: {
					enabled: true,
					type: "module",
					navigateFallback: "/",
				},
				manifest: {
					name: "SignalLab — UIUC ECE 210 Practice",
					short_name: "SignalLab",
					id: "Analog-Signal-Processing-Practice/v1",
					start_url: "/",
					scope: "/",
					description:
						"Practice tool for the mathematics of Analog Signal Processing",
					lang: "en",
					categories: ["education", "productivity"],
					theme_color: "#06b6d4",
					background_color: "#0f172a",
					display: "standalone",
					display_override: ["standalone", "minimal-ui"], // Clean fallback without WCO requirement
					shortcuts: [
						{
							name: "Differential Equations",
							short_name: "ODEs",
							description: "Practice 1st and 2nd Order ODEs",
							url: "/odes",
							icons: [
								{
									src: "/icons/pwa-icon-192x192.png",
									sizes: "192x192",
								},
							],
						},
						{
							name: "Fourier Series",
							short_name: "Fourier",
							description: "Practice Fourier Series Analysis",
							url: "/fourier-series",
							icons: [
								{
									src: "/icons/pwa-icon-192x192.png",
									sizes: "192x192",
								},
							],
						},
						{
							name: "Convolution",
							short_name: "Convolution",
							description: "Practice Continuous-Time Convolution",
							url: "/convolution",
							icons: [
								{
									src: "/icons/pwa-icon-192x192.png",
									sizes: "192x192",
								},
							],
						},
						{
							name: "Laplace Transforms",
							short_name: "Laplace",
							description: "Practice Laplace Transforms and PFD",
							url: "/laplace",
							icons: [
								{
									src: "/icons/pwa-icon-192x192.png",
									sizes: "192x192",
								},
							],
						},
						{
							name: "Circuits & RLC",
							short_name: "Circuits",
							description: "Practice RLC Circuit Analysis",
							url: "/circuits",
							icons: [
								{
									src: "/icons/pwa-icon-192x192.png",
									sizes: "192x192",
								},
							],
						},
					],
					icons: [
						{
							src: "/icons/pwa-icon-192x192.png",
							sizes: "192x192",
							type: "image/png",
							purpose: "any",
						},
						{
							src: "/icons/pwa-icon-512x512.png",
							sizes: "512x512",
							type: "image/png",
							purpose: "any",
						},
						{
							src: "/icons/pwa-icon-maskable-192x192.png",
							sizes: "192x192",
							type: "image/png",
							purpose: "maskable",
						},
						{
							src: "/icons/pwa-icon-maskable-512x512.png",
							sizes: "512x512",
							type: "image/png",
							purpose: "maskable",
						},
						{
							src: "/apple-touch-icon.png",
							sizes: "180x180",
							type: "image/png",
							purpose: "any",
						},
					],
				},
				workbox: {
					// Static HTML is emitted after the worker is generated. Cache the
					// served SPA shell explicitly and refresh it with every new build.
					additionalManifestEntries: isBuild
						? [{ url: "/", revision: String(Date.now()) }]
						: [],
					navigateFallback: "/",
					// Only pre-cache static assets during production build; in dev mode, Vite serves on-demand from memory.
					globPatterns: isBuild
						? ["**/*.{js,css,html,svg,woff2,png}"]
						: [],
					maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
				},
			}),
		],
		test: {
			expect: { requireAssertions: true },
			coverage: {
				provider: "v8",
				reporter: ["text", "json", "html"],
				exclude: [
					"**/*.d.ts",
					"**/*.config.*",
					".svelte-kit/**",
					"tests/**",
					"build/**",
					"static/**",
				],
			},
			projects: [
				{
					extends: "./vite.config.ts",
					test: {
						name: "unit/node",
						environment: "node",
						include: [
							"src/**/*.{test,spec}.{js,ts}",
							"tests/unit/*.{test,spec}.{js,ts}",
						],
						exclude: [
							"src/**/*.svelte.{test,spec}.{js,ts}",
							"tests/unit/components/**",
							"tests/e2e/**",
						],
					},
				},
				{
					extends: "./vite.config.ts",
					test: {
						name: "unit/dom",
						environment: "jsdom",
						include: [
							"tests/unit/components/**/*.{test,spec}.{js,ts}",
							"src/**/*.svelte.{test,spec}.{js,ts}",
						],
						exclude: ["tests/e2e/**"],
					},
					resolve: {
						conditions: ["browser"],
					},
				},
			],
		},
	};
});
