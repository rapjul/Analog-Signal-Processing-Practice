import { expect, type Page, test } from "@playwright/test";

/** Reproduces generated page parameters without exposing grading shortcuts. */
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		let seed = 173;
		/** Produces a deterministic pseudorandom value for ordinary generation. */
		Math.random = () => {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			return seed / 4294967296;
		};
	});
});

/** Opens the explicit worked solution using only normal keyboard interaction.
 * @param page - Browser page under test.
 */
async function reveal(page: Page) {
	const summary = page.locator(".worked-solution summary");
	await summary.focus();
	await summary.press("Enter");
	await expect(page.locator(".worked-solution")).toHaveAttribute("open", "");
}

/** A known delta input has a scalar spectrum, with no fixture-only production interface. */
test("CTFT rejects arbitrary answers and accepts equivalent delta spectra", async ({
	page,
}) => {
	await page.goto("/fourier-transform");
	await page.locator(".drill-summary").click();
	await page.locator("#signal-type-select").selectOption("delta");
	await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	const input = page.locator("#ctft-input");
	for (const answer of ["garbage", "0", "(1,99)", String.raw`\frac{1}{`]) {
		await input.fill(answer);
		await page.getByRole("button", { name: "Check Answer" }).click();
		await expect(page.locator(".feedback-box")).not.toHaveAttribute(
			"data-validation",
			"correct",
		);
		await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	}
	await input.fill("X(omega)=2/2");
	await page.getByRole("button", { name: "Check Answer" }).click();
	await expect(page.locator(".feedback-box")).toHaveAttribute(
		"data-validation",
		"correct",
	);
	await reveal(page);
	await expect(page.locator(".assistance-status")).toHaveCount(0);
	await input.fill("0");
	await expect(page.locator(".feedback-box")).toHaveCount(0);
	await page.getByRole("button", { name: "Next Problem" }).click();
	await expect(page.locator(".worked-solution")).not.toHaveAttribute(
		"open",
		"",
	);
	await expect(page.locator(".solution-breakdown")).toHaveCount(0);
});

/** Laplace answers are independently reconstructed from the visible rational prompt. */
test("Laplace poles, causal grading, and explicit assistance follow the active problem", async ({
	page,
}) => {
	await page.goto("/laplace");
	const prompt = await page
		.locator(".problem-prompt annotation")
		.textContent();
	const coefficients = prompt?.match(
		/\\frac\{(\d+)s \+ (\d+)\}\{\(s \+ (\d+)\)\(s \+ (\d+)\)\}/,
	);
	expect(coefficients).not.toBeNull();
	if (!coefficients) throw new Error("Missing visible PFD parameters");
	const [, b1Text, b0Text, a1Text, a2Text] = coefficients;
	const b1 = Number(b1Text),
		b0 = Number(b0Text),
		p1 = -Number(a1Text),
		p2 = -Number(a2Text);
	const poles = await page
		.locator(".stability-pill annotation")
		.first()
		.textContent();
	const genuinePoles = [p1, p2].filter((pole) => b1 * pole + b0 !== 0);
	expect(poles).toContain(genuinePoles.join(", "));
	await expect(page.locator(".stability-pill annotation").last()).toHaveText(
		String.raw`\operatorname{Re}(s) > ${Math.max(...genuinePoles)}`,
	);
	await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	await page.locator("#laplace-input").fill("123");
	await page.getByRole("button", { name: "Check Answer" }).click();
	await expect(page.locator(".feedback-box")).toHaveAttribute(
		"data-validation",
		"incorrect",
	);
	await expect(page.locator(".solution-breakdown")).toHaveCount(0);
	const a = (b1 * p1 + b0) / (p1 - p2),
		b = (b1 * p2 + b0) / (p2 - p1);
	await page
		.locator("#laplace-input")
		.fill(`(${a}e^{${p1}t}+${b}e^{${p2}t})u(t)`);
	await page.getByRole("button", { name: "Check Answer" }).click();
	await expect(page.locator(".feedback-box")).toHaveAttribute(
		"data-validation",
		"correct",
	);
	await page.getByRole("button", { name: "Next Problem" }).click();
	await reveal(page);
	await expect(page.locator(".assistance-status")).toContainText(
		"Assisted practice",
	);
	await expect(page.locator(".feedback-box.correct")).toHaveCount(0);
	await expect(page.locator(".solution-breakdown")).toBeVisible();
});

/** Sliders and prompt form a deterministic fixture through ordinary user controls. */
test("Circuits rebuilds one component model and resets revealed answers", async ({
	page,
}) => {
	await page.goto("/circuits");
	await page.locator("#r-slider").fill("50");
	await page.locator("#l-slider").fill("5");
	await page.locator("#c-slider").fill("0.05");
	const prompt = page.locator(".problem-prompt annotation");
	await expect(prompt).toContainText("R = 50");
	await expect(prompt).toContainText("L = 5");
	await expect(prompt).toContainText("C = 0.05");
	await expect(page.locator(".tf-output")).toHaveCount(0);
	await reveal(page);
	await expect(page.locator(".tf-output annotation")).toContainText(
		String.raw`\frac{10 s}{s^2 + 10 s + 4}`,
	);
	await expect(page.locator(".assistance-status")).toBeVisible();
	await page.locator("#r-slider").fill("200");
	await expect(page.locator(".tf-output")).toHaveCount(0);
	await expect(page.locator(".worked-solution")).not.toHaveAttribute(
		"open",
		"",
	);
	await page.locator(".drill-summary").click();
	await page.locator("#topology-select").selectOption("rc-lpf");
	await expect(page.locator("#l-slider")).toHaveCount(0);
	await expect(prompt).not.toContainText("L =");
	await page.locator("#r-slider").fill("1");
	await page.locator("#c-slider").fill("0.003");
	await reveal(page);
	await expect(page.locator(".tf-output annotation")).toContainText(
		String.raw`\frac{1000}{3}`,
	);
	await expect(page.locator(".solution-breakdown")).not.toContainText("Z_L");
	await expect(page.locator(".katex-error")).toHaveCount(0);
});

for (const route of ["laplace", "fourier-transform", "circuits"]) {
	/** Explicit reveal remains keyboard accessible without narrow-screen document overflow. */
	test(`${route} solution reflows at 320px`, async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto(`/${route}`);
		await reveal(page);
		await expect(page.locator(".assistance-status")).toBeVisible();
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);
		await expect(page.locator(".katex-error")).toHaveCount(0);
	});
}

/** Initial ODE metadata must not reveal the root classification. */
test("ODE header keeps root classification hidden", async ({ page }) => {
	await page.goto("/odes?seed=10&order=2&rootType=distinct_real");
	await expect(page.locator(".problem-header")).not.toContainText(
		/distinct real|repeated real|complex conjugate|single real/,
	);
});

/** The existing development harness prepares the verified Step 2 summary only. */
test("ODE classification appears in its verified summary @dev-harness", async ({
	page,
}) => {
	await page.goto("/odes?seed=10&order=2&rootType=distinct_real");
	await expect
		.poll(() =>
			page.evaluate(() => Boolean(window.__signalLabDev?.activeSolver)),
		)
		.toBe(true);
	await page.evaluate(() => {
		window.__signalLabDev?.autoFillStep(1);
		window.__signalLabDev?.autoFillStep(2);
	});
	await expect(
		page.locator(".step-summary").filter({ hasText: "Classification:" }),
	).toContainText("distinct real");
});
