/** Real-form regressions for scalar, harmonic, and resonant ODE practice. */

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { generateOdeProblem } from "$lib/math-engine/odes/generator";
import type {
	OdeGenerationOptions,
	OdeProblem,
} from "$lib/math-engine/odes/types";
import { parseOdeFilters } from "$lib/problems/ode-filters";

/**
 * Solves all seven checkpoints through visible controls, without developer shortcuts.
 * @param page - Browser page under test.
 * @param options - Deterministic problem configuration shared with the page URL.
 */
async function completeOde(
	page: Page,
	options: OdeGenerationOptions,
): Promise<void> {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.addLocatorHandler(
		page.getByRole("button", { name: "Dismiss notification" }),
		/** Dismisses the offline-ready toast when it overlaps practice controls. */
		async function dismissOfflineNotification(): Promise<void> {
			await page
				.getByRole("button", { name: "Dismiss notification" })
				.click();
		},
	);
	const query = new URLSearchParams({
		order: String(options.order),
		forcing: String(options.forcingType),
		resonance: String(options.resonance),
		leading: "non_monic",
		seed: String(options.seed),
	});
	if (options.rootType !== undefined) query.set("rootType", options.rootType);
	// The route resolves URL constraints before generation; use that same public contract.
	const problem = generateOdeProblem(parseOdeFilters(query));
	await page.goto(`/odes?${query}`);
	await completeNaturalModes(page, problem);
	await completeParticularSolution(page, problem);
	await completeInitialConditions(page, problem);
	await completeDecompositions(page, problem);
	await verifyWorkedSolutionAndReset(
		page,
		problem.forcing.type === "exponential",
	);
}

/**
 * Completes characteristic coefficients, root selection, and the trial ansatz.
 * @param page - Browser page under test.
 * @param problem - Expected deterministic problem.
 */
async function completeNaturalModes(
	page: Page,
	problem: OdeProblem,
): Promise<void> {
	if (problem.params.order === 2)
		await page.locator("#ode-a2-input").fill(String(problem.params.a2));
	await page.locator("#ode-a1-input").fill(String(problem.params.a1));
	await page.locator("#ode-a0-input").fill(String(problem.params.a0));
	await page
		.getByRole("button", { name: /Check Characteristic Equation/ })
		.click();
	if (problem.params.order === 2)
		await page
			.getByRole("button", { name: "Factoring by inspection" })
			.click();
	const rootAccessibility = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
		.analyze();
	expect(rootAccessibility.violations).toEqual([]);
	await page
		.locator(
			problem.params.rootType === "repeated_real"
				? "#ode-r-rep-input"
				: "#ode-r1-input",
		)
		.fill(String(problem.params.roots.r1));
	if (
		problem.params.order === 2 &&
		problem.params.rootType === "distinct_real"
	)
		await page
			.locator("#ode-r2-input")
			.fill(String(problem.params.roots.r2));
	await page.getByRole("button", { name: /Check Factored Roots/ }).click();
	await page
		.getByRole("button", {
			name:
				problem.params.order === 1
					? /Single Real Root/
					: problem.params.rootType === "repeated_real"
						? /Repeated Real Roots/
						: /Distinct Real Roots/,
		})
		.click();
	await page.locator('.step-card.active [data-option-id="c1"]').click();
}

/**
 * Selects derivatives and solves the undetermined coefficients through the UI.
 * @param page - Browser page under test.
 * @param problem - Expected deterministic problem.
 */
async function completeParticularSolution(
	page: Page,
	problem: OdeProblem,
): Promise<void> {
	await page
		.locator('.step-card.active [data-option-id="d1_correct"]')
		.click();
	if (problem.params.order === 2)
		await page
			.locator('.step-card.active [data-option-id="d2_correct"]')
			.click();
	if (problem.forcing.type === "sinusoid") {
		await page
			.locator('.step-card.active [data-option-id="sys_correct"]')
			.click();
		await page
			.locator("#ode-a-input")
			.fill(String(problem.itsData.step5.expectedA));
		await page
			.locator("#ode-b-input")
			.fill(String(problem.itsData.step5.expectedB));
	} else {
		await expect(page.locator(".step-card.active")).toContainText(
			"match coefficients",
		);
		await page
			.locator("#ode-kp-input")
			.fill(String(problem.itsData.step5.expectedKp));
	}
	await page.getByRole("button", { name: /Verify Coefficients/ }).click();
}

/**
 * Applies the total initial state to the homogeneous constants.
 * @param page - Browser page under test.
 * @param problem - Expected deterministic problem.
 */
async function completeInitialConditions(
	page: Page,
	problem: OdeProblem,
): Promise<void> {
	if (problem.params.order === 1) {
		await page
			.locator("#ode-c1-single-input")
			.fill(String(problem.itsData.step6.targetYh0));
		await page.getByRole("button", { name: /Check Constant/ }).click();
	} else {
		await page
			.locator("#ode-yh0-input")
			.fill(String(problem.itsData.step6.targetYh0));
		await page
			.locator("#ode-dyh0-input")
			.fill(String(problem.itsData.step6.targetDYh0));
		await page
			.getByRole("button", { name: /Verify Target Values/ })
			.click();
		await page
			.locator("#ode-c1-input")
			.fill(String(problem.itsData.step6.expectedC1));
		await page
			.locator("#ode-c2-input")
			.fill(String(problem.itsData.step6.expectedC2));
		await page.getByRole("button", { name: /Check Constants/ }).click();
	}
}

/**
 * Submits zero-input/zero-state and the mode-specific response split.
 * @param page - Browser page under test.
 * @param problem - Expected deterministic problem.
 */
async function completeDecompositions(
	page: Page,
	problem: OdeProblem,
): Promise<void> {
	await page
		.locator("#ode-zic1-input")
		.fill(String(problem.itsData.step7.ziConstants.C1));
	if (problem.params.order === 2)
		await page
			.locator("#ode-zic2-input")
			.fill(String(problem.itsData.step7.ziConstants.C2));
	await page
		.getByRole("button", { name: /Verify ZI\/ZS Decomposition/ })
		.click();
	const algebraic = problem.forcing.type === "exponential";
	if (algebraic)
		await expect(page.locator(".step-card.active")).toContainText(
			"entire response is transient",
		);
	await page.locator('[data-option-id="tr_correct"]').click();
	await page.locator('[data-option-id="ss_correct"]').click();
	await page
		.getByRole("button", {
			name: algebraic
				? /Verify Homogeneous & Particular/
				: /Verify Transient & Steady-State/,
		})
		.click();
	await page
		.locator('.concept-options-list [data-option-id$="_opt1"]')
		.click();
	await expect(
		page.getByText("Problem Completed!", { exact: true }),
	).toBeVisible();
}

/**
 * Checks the complete derivation and verifies that a new problem clears state.
 * @param page - Browser page under test.
 * @param algebraic - Whether the response split is homogeneous/particular.
 */
async function verifyWorkedSolutionAndReset(
	page: Page,
	algebraic: boolean,
): Promise<void> {
	await expect(page.locator(".completion-heading")).toBeFocused();
	const plot = page.locator("canvas.response-canvas");
	const bounds = await plot.boundingBox();
	expect(bounds).not.toBeNull();
	await plot.scrollIntoViewIfNeeded();
	const visibleBounds = (await plot.boundingBox())!;
	const x = visibleBounds.x + 40 + (visibleBounds.width - 80) / 4;
	const y = visibleBounds.y + visibleBounds.height / 2;
	if (test.info().project.use.hasTouch) await page.touchscreen.tap(x, y);
	else await page.mouse.move(x, y);
	const slider = page.getByRole("slider", { name: "Inspect waveform time" });
	await expect
		.poll(async () => Number(await slider.inputValue()))
		.toBeCloseTo(1.25, 1);
	await expect(page.locator(".waveform-readout dd")).toHaveCount(3);
	await slider.press("Home");
	await expect(slider).toHaveValue("0");
	await slider.press("ArrowRight");
	expect(Number(await slider.inputValue())).toBeGreaterThan(0);
	await expect(page.locator("canvas.response-canvas + .legend")).toHaveCount(
		1,
	);
	await page
		.getByText("View approximate waveform values", { exact: true })
		.first()
		.click();
	const values = page
		.getByRole("region", { name: "View approximate waveform values" })
		.first();
	await values.focus();
	await expect(values).toBeFocused();
	await expect(values.locator("tbody th").first()).toHaveCSS(
		"text-align",
		"right",
	);
	await expect(values.locator("tbody th").first()).toHaveCSS(
		"font-weight",
		"400",
	);
	await expect(values.locator("caption")).toHaveCSS(
		"text-wrap-style",
		"balance",
	);
	await page.keyboard.press("ArrowRight");
	const accessibility = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
		.analyze();
	expect(accessibility.violations).toEqual([]);
	await page.locator(".full-solution-summary").click();
	await expect(page.locator(".full-solution-container")).toHaveAttribute(
		"open",
		"",
	);
	const expandedAccessibility = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
		.analyze();
	expect(expandedAccessibility.violations).toEqual([]);
	await expect(page.locator(".full-solution-container")).toContainText(
		"Match coefficients",
	);
	await expect(page.locator(".full-solution-container")).toContainText(
		"Match the homogeneous initial values",
	);
	if (algebraic)
		await expect(page.locator(".full-solution-container")).toContainText(
			"entire response is transient",
		);
	await expect(page.locator(".katex-error")).toHaveCount(0);
	await page.getByRole("button", { name: /Generate Next Problem/ }).click();
	await expect(page.locator(".step-card.active .step-badge")).toHaveText(
		"Step 1",
	);
	await expect(page.locator(".completion-section")).toHaveCount(0);
	await expect(page.locator("#ode-a1-input")).toHaveValue("");
}

for (const fixture of [
	{
		title: "constant first-order input",
		order: 1,
		forcingType: "constant",
		resonance: "none",
		seed: 42,
	},
	{
		title: "unit-frequency sinusoid",
		order: 2,
		rootType: "distinct_real",
		forcingType: "sinusoid",
		resonance: "none",
		seed: 4,
	},
	{
		title: "simple first-order resonance",
		order: 1,
		forcingType: "exponential",
		resonance: "simple",
		seed: 42,
	},
	{
		title: "repeated second-order resonance",
		order: 2,
		forcingType: "exponential",
		resonance: "repeated",
		seed: 42,
	},
] as const) {
	for (const theme of ["dark", "light"]) {
		/** Exercises all checkpoints and the next-problem reset using actual controls. */
		test(`completes ${fixture.title} through visible controls in ${theme} theme`, async ({
			page,
		}) => {
			await page.addInitScript(
				(value) => localStorage.setItem("theme", value),
				theme,
			);
			await completeOde(page, {
				...fixture,
				leadingCoefficient: "non_monic",
			});
		});
	}
}
