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

/** Definitions live in the route-selected drawer while signal math and input aliases remain readable. */
test("formulas and notation have accessible keyboard controls", async ({
	page,
}) => {
	await expect(page.locator(".problem-prompt p")).toContainText(
		"Find the Fourier transform",
	);
	await expect(page.locator(".problem-prompt .math-block")).not.toContainText(
		"Find",
	);
	const formulas = page.getByRole("button", {
		name: "Open Formulas Reference Sheet",
	});
	await formulas.focus();
	await formulas.press("Enter");
	await expect(page.locator(".drawer-content h3").first()).toHaveText(
		"Continuous-Time Fourier Transform (CTFT)",
	);
	await expect(
		page.getByRole("heading", {
			name: "Forward transformation",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("heading", {
			name: "Inverse transformation",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Normalized sinc", exact: true }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(formulas).toBeFocused();
	for (const literal of ["omega", "w", "e^(-j*omega)", "e^{-j*omega}"]) {
		const example = page.getByRole("button", {
			name: `Copy input notation: ${literal}`,
			exact: true,
		});
		await expect(example.locator(".katex-html")).toHaveText(literal);
		await example.focus();
		await expect(example).toBeFocused();
	}
	await page.setViewportSize({ width: 320, height: 740 });
	expect(
		await page.evaluate(
			/** @returns Whether the notation fits the narrow page. */
			() =>
				document.documentElement.scrollWidth <=
				document.documentElement.clientWidth,
		),
	).toBe(true);
});

/** Ordinary keyboard controls expose relevant context, original error ranges, and responsive columns. */
test("workspace guides endpoint algebra and reflows its verified context", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	const family = page.getByRole("button", {
		name: "Rectangular pulse",
		exact: true,
	});
	await family.focus();
	await family.press("Enter");
	await expect(
		page.locator(".step-card.active .subpart-title"),
	).toBeFocused();
	await enterCtftAnswer(page, "Pulse width T", "4/2");
	const context = page.getByRole("region", { name: "Results so far" });
	await expect(context).toContainText("Pulse width");
	await expect(context).not.toContainText("Phase multiplier");
	const input = page.getByLabel("Signed time translation");
	const inputBox = await input.boundingBox();
	expect(inputBox!.width).toBeLessThanOrEqual(220);
	const side = await page
		.locator(".step-card.active .workspace-context")
		.boundingBox();
	const work = await page
		.locator(".step-card.active .workspace-exercise")
		.boundingBox();
	expect(side!.x).toBeGreaterThan(work!.x);
	await page.setViewportSize({ width: 320, height: 740 });
	const mobileSide = await page
		.locator(".step-card.active .workspace-context")
		.boundingBox();
	const mobileWork = await page
		.locator(".step-card.active .workspace-exercise")
		.boundingBox();
	expect(mobileSide!.y + mobileSide!.height).toBeLessThanOrEqual(
		mobileWork!.y + 1,
	);
	await enterCtftAnswer(page, "Signed time translation", "0");
	await page
		.getByRole("button", {
			name: /forward transformation with the negative imaginary exponent/,
		})
		.click();
	await enterCtftAnswer(
		page,
		"Exponential antiderivative coefficient",
		"j/omega",
	);
	const endpoint = page.getByLabel("Upper minus lower endpoint expression");
	await endpoint.fill("e^{-j t} - e^{j {t}");
	await endpoint.press("Enter");
	const issues = page.getByRole("region", {
		name: "Issues in your expression",
	});
	await expect(issues.locator("li")).toHaveCount(3);
	await expect(endpoint).toBeFocused();
	expect(
		await endpoint.evaluate(
			/** @param element - Active text field. @returns Its selected source token. */ (
				element,
			) => {
				const field = element as HTMLInputElement;
				return field.value.slice(
					field.selectionStart!,
					field.selectionEnd!,
				);
			},
		),
	).toBe("{");
	await enterCtftAnswer(
		page,
		"Upper minus lower endpoint expression",
		"(e^(-j omega)-e^(j omega))/(-j omega)",
	);
	await expect(page.getByLabel("Equivalent sine expression")).toBeVisible();
	await expect(
		page.locator(".solution-breakdown, .ctft-spectrum"),
	).toHaveCount(0);
	expect(
		await page.evaluate(
			/** Reports horizontal page overflow. */ () =>
				document.documentElement.scrollWidth <=
				document.documentElement.clientWidth,
		),
	).toBe(true);
});

/** Production registers no state-selection or answer-autofill interface. */
test("CTFT production omits the developer harness", async ({ page }, info) => {
	test.skip(
		!info.config.configFile?.endsWith("playwright.production.config.ts"),
		"Production-only interface contract.",
	);
	expect(await page.evaluate(() => window.__signalLabDev)).toBeUndefined();
});

for (const mode of ["derivation", "pairs-properties"] as const) {
	/** Tolerance-accepted final rows remain learner work while the solution uses exact symbolic weights. */
	test(`exact cosine solution after approximate reversed rows in ${mode}`, async ({
		page,
	}) => {
		await page.locator(".drill-summary").click();
		await page.getByLabel("Teaching Mode:").selectOption(mode);
		await page.getByLabel("Signal Category:").selectOption("cos");
		await prepareCtftFinal(page, "cos", { a: 2, T: 1, w0: 3, t0: 1 }, mode);
		for (const [row, location] of [3, -3].entries()) {
			await enterCtftAnswer(
				page,
				`Impulse ${row + 1} location`,
				String(location),
			);
			await enterCtftAnswer(
				page,
				`Impulse ${row + 1} complex weight`,
				`3.14159265 e^{-j(${location})}`,
			);
		}
		await page
			.getByText("View Complete Worked Solution", { exact: true })
			.click();
		await expect(page.locator(".solution-breakdown")).not.toContainText(
			"3.14159265",
		);
		await expect(page.locator(".solution-breakdown")).toContainText("\\pi");
		const review = page.locator(".verified-fields").last();
		await review.locator("summary").press("Enter");
		await expect(review).toContainText("3.14159265");
	});
}

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
							: `X(omega)=${location}`;
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
			await page
				.getByRole("button", { name: /Generate Next Problem/ })
				.click();
			await expect(page.getByLabel("Teaching Mode:")).toHaveValue(mode);
			await expect(
				page.locator(".solution-breakdown, .ctft-spectrum"),
			).toHaveCount(0);
		});
	}

/** Mode switches retain the visible signal but clear progress, hints, and gated content. */
test("mode changes and new problems isolate attempts", async ({ page }) => {
	const prompt = await page
		.locator(".problem-prompt annotation")
		.first()
		.textContent();
	await page
		.getByRole("button", { name: "Rectangular pulse", exact: true })
		.click();
	await expect(page.getByLabel("Pulse width T")).toBeVisible();
	await page.locator(".drill-summary").click();
	await page.getByLabel("Teaching Mode:").selectOption("pairs-properties");
	await expect(page.locator(".problem-prompt annotation").first()).toHaveText(
		prompt!,
	);
	await expect(page.locator(".step-card.completed")).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Rectangular pulse", exact: true }),
	).toHaveAttribute("aria-pressed", "false");
	await prepareCtftFinal(
		page,
		"rect",
		{ a: 1, T: 2, w0: 2, t0: 0 },
		"pairs-properties",
	);
	await finishCtft(page, "rect", { a: 1, T: 2, w0: 2, t0: 0 });
	await expect(
		page.getByRole("button", { name: "Restart Problem" }),
	).toHaveCount(0);
	await page.getByRole("button", { name: /Generate Next Problem/ }).click();
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
