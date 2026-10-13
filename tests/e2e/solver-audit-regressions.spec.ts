/** Browser regressions shared by the three implemented stepped solvers. */
import { expect, test } from "@playwright/test";
import type { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";

/** Typed Step 6 answers must reject lists and accept equivalent arithmetic. */
test("convolution grades constant expressions through the visible form @dev-harness", async ({
	page,
}) => {
	await page.goto("/convolution?seed=10");
	await page.locator(".drill-summary").click();
	await page.getByRole("button", { name: "Textbook Example" }).click();
	await expect
		.poll(
			/** Waits for the mounted tutor's development harness. */
			() =>
				page.evaluate(() =>
					Boolean(window.__signalLabDev?.activeSolver),
				),
		)
		.toBe(true);
	const expected = await page.evaluate(
		/** Prepares the first integral field through the tutor's existing harness. */
		() => {
			const solver = window.__signalLabDev?.activeSolver as
				ConvolutionStepSolverState | undefined;
			if (!solver) throw new Error("Convolution solver is not mounted.");
			for (let step = 1; step < 6; step++) solver.devAutoFillStep(step);
			const part = solver.problem.itsData.step6.parts.find(
				({ id }) => id === solver.step6.activeSubStepId,
			);
			return part?.evaluationBySignal?.[solver.flippedSignal][0]?.geometry
				?.amplitudeProductLatex;
		},
	);
	expect(expected).toBeDefined();
	const field = page.locator(".step-card.active .expression-entry input");
	await field.fill(`(${expected},99)`);
	await page
		.getByRole("button", { name: "Check this evaluation step" })
		.click();
	await expect(page.locator(".feedback-validation")).toBeVisible();
	await field.fill(`(${expected})+0`);
	await page
		.getByRole("button", { name: "Check this evaluation step" })
		.click();
	await expect(page.locator(".step-card.active")).toContainText(
		"Enter the overlap width",
	);
	await expect(page.locator(".feedback-alert")).toHaveCount(0);
});

for (const route of ["/odes", "/fourier-series", "/convolution"]) {
	/** Storage restrictions must preserve keyboard theme switching at 320 pixels. */
	test(`${route} remains usable with blocked storage`, async ({ page }) => {
		const errors: string[] = [];
		page.on(
			"pageerror",
			/** @param error - Unhandled browser exception. */ (error) =>
				errors.push(error.message),
		);
		await page.setViewportSize({ width: 320, height: 568 });
		await page.addInitScript(
			/** Simulates a browser privacy policy that denies the storage getter. */
			() => {
				Object.defineProperty(window, "localStorage", {
					/** Throws before any storage method can be called. */
					get() {
						throw new DOMException(
							"Storage blocked",
							"SecurityError",
						);
					},
				});
			},
		);
		await page.goto(`${route}?seed=10`);
		const themeButton = page.getByRole("button", { name: /toggle theme/i });
		await expect(themeButton).toBeVisible();
		await themeButton.focus();
		await themeButton.press("Enter");
		await expect(page.locator("html")).toHaveAttribute(
			"data-theme",
			"light",
		);
		await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
			"content",
			"#f8fafc",
		);
		await expect(page.locator(".step-card.active")).toBeVisible();
		expect(
			await page.evaluate(
				/** Returns document-level overflow at the narrowest supported viewport. */
				() =>
					document.documentElement.scrollWidth >
					document.documentElement.clientWidth,
			),
		).toBe(false);
		await page.reload();
		await expect(page.locator("html")).toHaveAttribute(
			"data-theme",
			"dark",
		);
		await expect(page.locator(".step-card.active")).toBeVisible();
		expect(errors).toEqual([]);
	});
}
