/** Detect stale worktree app shells without relaxing Vite filesystem restrictions. */
import { expect, test } from "@playwright/test";
import { loadEnv } from "vite";

/** A clean development browser loads and reloads this worktree without a worker. */
test("development loads current generated modules without service workers", async ({
	page,
}, info) => {
	test.skip(
		info.config.configFile?.endsWith("playwright.production.config.ts") ??
			false,
		"Development-only loading contract.",
	);
	test.skip(
		loadEnv("development", process.cwd(), "VITE_")
			.VITE_SIGNALLAB_DEV_PWA === "1",
		"Explicit PWA-development mode intentionally registers a worker.",
	);
	const errors: string[] = [];
	const generated: string[] = [];
	page.on(
		"pageerror",
		/** @param error - Browser runtime failure. Records failures across reload. */ (
			error,
		) => errors.push(error.message),
	);
	page.on(
		"response",
		/** @param response - Requested resource. Records successful current-worktree entries. */ (
			response,
		) => {
			if (
				response.url().includes("/.svelte-kit/generated/client/app.js")
			) {
				expect([200, 304]).toContain(response.status());
				generated.push(decodeURIComponent(response.url()));
			}
		},
	);
	await page.goto("/fourier-transform");
	await expect(
		page.getByRole("button", { name: "Rectangular pulse", exact: true }),
	).toBeVisible();
	await page.reload();
	await page
		.getByRole("button", { name: "Rectangular pulse", exact: true })
		.click();
	await expect(page.getByLabel("Pulse width T")).toBeVisible();
	expect(errors).toEqual([]);
	expect(generated.length).toBeGreaterThan(0);
	for (const entry of generated)
		expect(entry).toContain(process.cwd().replaceAll("\\", "/"));
	expect(
		await page.evaluate(
			/** Reads only this test origin's service-worker registrations. */ async () =>
				(await navigator.serviceWorker.getRegistrations()).length,
		),
	).toBe(0);
});
