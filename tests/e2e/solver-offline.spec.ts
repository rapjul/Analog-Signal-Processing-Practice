/** Production-only regression for offline navigation through stepped solvers. */
import { expect, test } from "@playwright/test";

/** A production service worker must serve unvisited solver routes offline. */
test("reloads all implemented solvers offline after caching", async ({
	page,
	context,
	browserName,
}) => {
	test.skip(
		process.env.SIGNALLAB_TEST_OFFLINE !== "1",
		"Requires the production preview and its precache.",
	);
	test.skip(
		browserName === "webkit",
		"WebKit offline emulation rejects worker-served navigation: https://github.com/microsoft/playwright/issues/42775",
	);
	await page.goto("/odes?seed=10");
	await page.evaluate(
		/** Waits for the installed service worker to complete its initial precache. */
		async () => {
			await navigator.serviceWorker.ready;
		},
	);
	// A newly installed worker controls subsequent navigations, not the initial visit.
	await page.reload();
	await expect
		.poll(
			/** Waits for page control before disconnecting the browser. */
			() =>
				page.evaluate(
					/** Reports whether the activated worker controls this document. */
					() => navigator.serviceWorker.controller !== null,
				),
		)
		.toBe(true);
	await context.setOffline(true);
	for (const { route, heading } of [
		{ route: "/odes", heading: "Linear Constant-Coefficient ODEs" },
		{ route: "/fourier-series", heading: "Fourier Series Analysis" },
		{ route: "/convolution", heading: "Continuous-Time Convolution" },
		{ route: "/laplace", heading: "Laplace Transform & s-Domain Analysis" },
		{
			route: "/fourier-transform",
			heading: "Continuous-Time Fourier Transform (CTFT)",
		},
	]) {
		await page.goto(`${route}?seed=10`);
		await expect(
			page.getByRole("heading", { name: heading, exact: true }),
		).toBeVisible();
		await expect(page.locator(".step-card.active")).toBeVisible();
		await expect(page.locator(".katex-error")).toHaveCount(0);
	}
});
