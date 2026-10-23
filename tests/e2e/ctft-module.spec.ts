/** Both CTFT teaching paths, exercised without development-only shortcuts. */
import { expect, test } from "@playwright/test";
import type { CtftSignalType } from "$lib/math-engine/fourier-transform";
import { enterCtftAnswer, finishCtft, prepareCtftFinal } from "./ctft-browser";

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		Math.random = () => 0.2;
	});
	await page.goto("/fourier-transform");
});

/** Production registers no state-selection or answer-autofill interface. */
test("CTFT production omits the developer harness", async ({ page }, info) => {
	test.skip(
		!info.config.configFile?.endsWith("playwright.production.config.ts"),
		"Production-only interface contract.",
	);
	expect(await page.evaluate(() => window.__signalLabDev)).toBeUndefined();
});

for (const mode of ["derivation", "pairs-properties"] as const)
	for (const notation of [
		"padded",
		"internal-whitespace",
		"equation-prefix",
	] as const) {
		/** Previously accepted fields remain valid when assembling the final distribution through normal controls. */
		test(`cosine completes with ${notation} fields in ${mode}`, async ({
			page,
		}) => {
			await page.locator(".drill-summary").click();
			await page.getByLabel("Teaching Mode:").selectOption(mode);
			await page.getByLabel("Signal Category:").selectOption("cos");
			await prepareCtftFinal(
				page,
				"cos",
				{ a: 2, T: 1, w0: 3, t0: 1 },
				mode,
			);
			for (const [row, location] of [3, -3].entries()) {
				const coordinate =
					notation === "padded"
						? String(location).padEnd(8200)
						: notation === "internal-whitespace"
							? `(${" ".repeat(8200)}${location})`
							: String(location);
				await enterCtftAnswer(
					page,
					`Impulse ${row + 1} location`,
					coordinate,
				);
				await enterCtftAnswer(
					page,
					`Impulse ${row + 1} complex weight`,
					`${notation === "equation-prefix" ? "X(omega)=" : ""}pi e^{-j(${location})}`,
				);
			}
			await expect(
				page.getByRole("heading", { name: "CTFT solution verified" }),
			).toBeVisible();
			await expect(page.locator(".ctft-spectrum")).toBeVisible();
			await expect(page.getByRole("textbox")).toHaveCount(0);
		});
	}

for (const mode of ["derivation", "pairs-properties"] as const)
	for (const family of [
		"rect",
		"exponential",
		"gaussian",
		"delta",
		"cos",
	] as CtftSignalType[]) {
		/** Completes every family and mode through independently answered, keyboard-submitted forms. */
		test(`CTFT ${family} completes in ${mode}`, async ({ page }) => {
			await page.locator(".drill-summary").click();
			await page.getByLabel("Teaching Mode:").selectOption(mode);
			await page.getByLabel("Signal Category:").selectOption(family);
			const params = {
				a: 2,
				T: 1,
				w0: 3,
				t0: family === "delta" ? 0 : 1,
			};
			await expect(page.locator(".step-card")).toHaveCount(
				mode === "derivation" ? 6 : 5,
			);
			await expect(
				page.locator(".solution-breakdown, .ctft-spectrum"),
			).toHaveCount(0);
			await prepareCtftFinal(page, family, params, mode);
			await expect(
				page.locator(".solution-breakdown, .ctft-spectrum"),
			).toHaveCount(0);
			await finishCtft(page, family, params);
			await page
				.getByText("View Complete Worked Solution", { exact: true })
				.click();
			await expect(page.locator(".solution-breakdown")).toBeVisible();
			await expect(page.locator(".solution-breakdown h4")).toHaveCount(
				mode === "derivation" ? 6 : 5,
			);
			await expect(page.locator(".katex-error")).toHaveCount(0);
			await page.getByRole("button", { name: "Next Problem" }).click();
			await expect(page.getByLabel("Teaching Mode:")).toHaveValue(mode);
			await expect(
				page.locator(".solution-breakdown, .ctft-spectrum"),
			).toHaveCount(0);
		});
	}

/** Mode switches retain the visible signal but clear progress, hints, and gated content. */
test("mode changes and restarts isolate attempts", async ({ page }) => {
	const prompt = await page
		.locator(".problem-prompt annotation")
		.first()
		.textContent();
	await page
		.getByRole("radio", { name: "Rectangular pulse", exact: true })
		.check();
	await page.getByRole("button", { name: "Check Answer" }).click();
	await expect(page.getByLabel("Pulse width T")).toBeVisible();
	await page.locator(".drill-summary").click();
	await page.getByLabel("Teaching Mode:").selectOption("pairs-properties");
	await expect(page.locator(".problem-prompt annotation").first()).toHaveText(
		prompt!,
	);
	await expect(page.locator(".step-card.completed")).toHaveCount(0);
	await expect(
		page.getByRole("radio", { name: "Rectangular pulse", exact: true }),
	).not.toBeChecked();
	await prepareCtftFinal(
		page,
		"rect",
		{ a: 1, T: 2, w0: 2, t0: 0 },
		"pairs-properties",
	);
	await finishCtft(page, "rect", { a: 1, T: 2, w0: 2, t0: 0 });
	await page.getByRole("button", { name: "Restart Problem" }).click();
	await expect(
		page.locator(".solution-breakdown, .ctft-spectrum"),
	).toHaveCount(0);
	await expect(page.locator(".step-card.completed")).toHaveCount(0);
});

/** A completed ordinary spectrum and worked derivation reflow on the smallest supported viewport. */
test("CTFT completion reflows at 320px with reduced motion", async ({
	page,
}) => {
	await page.setViewportSize({ width: 320, height: 568 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await prepareCtftFinal(page, "rect", { a: 1, T: 2, w0: 2, t0: 0 });
	await finishCtft(page, "rect", { a: 1, T: 2, w0: 2, t0: 0 });
	const summary = page.getByText("View Complete Worked Solution", {
		exact: true,
	});
	await summary.focus();
	await summary.press("Enter");
	await expect(page.locator(".solution-breakdown")).toHaveAttribute(
		"open",
		"",
	);
	expect(
		await page.evaluate(
			() =>
				document.documentElement.scrollWidth <=
				document.documentElement.clientWidth,
		),
	).toBe(true);
});
