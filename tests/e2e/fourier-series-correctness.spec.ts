/** Production-compatible workflows covering every Fourier waveform and spectrum row. */
import { expect, test } from "@playwright/test";
import {
	FOURIER_SERIES_WAVEFORM_TYPES,
	generateFourierSeriesProblem,
} from "$lib/math-engine/fourier-series/index";

/** Verifies that regenerating a problem leaves the waveform selector usable from the keyboard. */
test("retains waveform-selector focus across problem resets", async ({
	page,
}) => {
	await page.goto("/fourier-series?waveform=square&seed=42");
	await page.waitForLoadState("networkidle");
	await page.locator(".drill-summary").click();
	const selector = page.getByLabel("Periodic Waveform Category:");
	await selector.focus();
	await selector.selectOption("triangle");
	await expect(page).toHaveURL(/waveform=triangle/);
	await expect(selector).toBeFocused();
	await expect(page.locator(".step-card.active")).toContainText(
		"Fundamental Period",
	);
	const seed = Number(new URL(page.url()).searchParams.get("seed"));
	const problem = generateFourierSeriesProblem("triangle", { seed });
	await page.locator("#fourier-period-input").fill(String(problem.coeffs.T0));
	await page
		.locator("#fourier-freq-input")
		.fill(problem.itsData.step1.w0Aliases[0]!);
	await page.locator("#fourier-freq-input").press("Enter");
	await expect(
		page.locator(
			".step-card.active .subpart-block:not(.subpart-done) [data-progress-heading]",
		),
	).toBeFocused();
	await selector.focus();
	await selector.selectOption("square_even");
	await expect(selector).toBeFocused();
	await expect(page.locator("#fourier-period-input")).toHaveValue("");
});

for (const waveform of FOURIER_SERIES_WAVEFORM_TYPES) {
	/** Completes ordinary controls, optional conversions, and accessible spectrum inspection. */
	test(`solves ${waveform} and exposes the complete accessible spectrum`, async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		const problem = generateFourierSeriesProblem(waveform, { seed: 42 });
		await page.goto(`/fourier-series?waveform=${waveform}&seed=42`);
		await page.waitForLoadState("networkidle");
		await page
			.locator("#fourier-period-input")
			.fill(String(problem.coeffs.T0));
		await page
			.locator("#fourier-freq-input")
			.fill(problem.itsData.step1.w0Aliases[0]!);
		await page.locator("#fourier-freq-input").press("Enter");
		const parityIndex = { even: 0, odd: 1, none: 2 }[
			problem.coeffs.originParity
		];
		await page
			.getByTestId("fourier-step2-origin-options")
			.getByRole("button")
			.nth(parityIndex)
			.click();
		await page
			.getByRole("button", { name: "Check Origin Parity →" })
			.click();
		await page
			.getByTestId("fourier-step2-half-wave-options")
			.getByRole("button")
			.nth(problem.coeffs.hasHalfWaveSymmetry ? 0 : 1)
			.click();
		await page
			.getByRole("button", { name: "Check Half-Wave Symmetry →" })
			.click();
		const vanishingIndex = {
			bn_zero: 0,
			an_zero: 1,
			none: 2,
			both_even: 2,
		}[problem.itsData.step3.correctVanishing];
		await page
			.locator(".step-card.active .choice-btn")
			.nth(vanishingIndex)
			.click();
		await page
			.locator(".step-card.active .representation-choice")
			.nth(problem.itsData.step4.correctForm === "trig" ? 0 : 1)
			.click();
		for (const step of [5, 6] as const) {
			for (const [index, part] of problem.itsData[
				`step${step}`
			].parts.entries()) {
				const options = page.getByTestId(`fourier-step${step}-options`);
				await expect(options).toHaveAttribute(
					"data-part-index",
					String(index),
				);
				await options
					.getByRole("button")
					.nth(part.options.findIndex(({ isCorrect }) => isCorrect))
					.click();
			}
		}
		await page
			.locator(".step-card.active .mcq-card")
			.nth(
				problem.itsData.step7.options.findIndex(
					({ isCorrect }) => isCorrect,
				),
			)
			.click();
		await expect(
			page.getByText("Problem Completed!", { exact: true }),
		).toBeVisible();
		await page.locator("details.conversion-challenge > summary").click();
		for (const [
			index,
			part,
		] of problem.conversionChallenge.parts.entries()) {
			const options = page.getByTestId("fourier-conversion-options");
			await expect(options).toHaveAttribute(
				"data-part-index",
				String(index),
			);
			await options
				.getByRole("button")
				.nth(part.options.findIndex(({ isCorrect }) => isCorrect))
				.click();
		}
		await expect(
			page.getByText(/Optional conversions completed/),
		).toBeVisible();
		await page.getByLabel("Harmonic Limit:").focus();
		await page.getByLabel("Harmonic Limit:").press("End");
		await expect(page.getByLabel("Harmonic Limit:")).toHaveValue("50");
		await page.locator("details.coefficient-disclosure > summary").click();
		await expect(
			page.locator(".coefficient-disclosure tbody tr"),
		).toHaveCount(51);
		await expect(
			page.locator(".coefficient-disclosure tbody tr").first(),
		).toContainText("0 (DC)");
		await expect(
			page
				.locator(".coefficient-disclosure tbody tr")
				.last()
				.getByRole("rowheader"),
		).toHaveText("50");
		await expect(page.locator("canvas").last()).toHaveAttribute(
			"data-visual-ready",
			"true",
		);
		await page.locator("details.solution-breakdown > summary").click();
		await expect(page.locator(".katex-error")).toHaveCount(0);
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					window.innerWidth + 1,
			),
		).toBe(true);
	});
}
