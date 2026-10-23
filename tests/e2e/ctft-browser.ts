/** Browser exercises using independent formulas and ordinary UI controls. */
import { expect, type Page } from "@playwright/test";
import type { CtftPracticeMode } from "$lib/math-engine/ctft-lesson";
import type {
	CtftParameters,
	CtftSignalType,
} from "$lib/math-engine/fourier-transform";

/** Accessible family labels, independent of the lesson metadata. */
const names: Record<CtftSignalType, string> = {
	rect: "Rectangular pulse",
	exponential: "Causal exponential",
	gaussian: "Gaussian",
	delta: "Dirac delta",
	cos: "Cosine",
};

/**
 * Enters and submits an ordinary active answer through the keyboard.
 * @param page - Browser under test.
 * @param label - Field's accessible name.
 * @param answer - Independently computed expression.
 */
export async function enterCtftAnswer(
	page: Page,
	label: string,
	answer: string,
): Promise<void> {
	const input = page.getByRole("textbox", { name: label, exact: true });
	await input.fill(answer);
	await input.press("Enter");
	await expect(page.locator('[role="alert"]')).toHaveCount(0);
}

/**
 * Evaluates the standard pairs independently of the engine's display strings.
 * @param family - Base family.
 * @param params - Visible problem parameters.
 * @returns An ordinary unshifted spectrum.
 */
export function ctftBaseAnswer(
	family: CtftSignalType,
	params: CtftParameters,
): string {
	if (family === "rect") return `${params.T} sinc(${params.T} omega/(2 pi))`;
	if (family === "exponential") return `1/(${params.a}+j omega)`;
	if (family === "gaussian")
		return `\\sqrt{\\pi/${params.a}} e^{-\\omega^2/${4 * params.a}}`;
	return "1";
}

/**
 * Completes both impulse rows in reversed carrier order through ordinary forms.
 * @param page - Browser under test.
 * @param params - Independent problem parameters.
 * @param shift - Base zero or final time translation.
 */
async function enterImpulses(
	page: Page,
	params: CtftParameters,
	shift: number,
): Promise<void> {
	for (const [row, location] of [params.w0, -params.w0].entries()) {
		await enterCtftAnswer(
			page,
			`Impulse ${row + 1} location`,
			String(location),
		);
		await enterCtftAnswer(
			page,
			`Impulse ${row + 1} complex weight`,
			`\\pi e^{-j(${location})(${shift})}`,
		);
	}
}

/**
 * Reaches final assembly through all actual prerequisite forms.
 * @param page - Browser under test, already on the intended problem.
 * @param family - Visible family.
 * @param params - Independently known fixture parameters.
 * @param mode - Selected path.
 */
export async function prepareCtftFinal(
	page: Page,
	family: CtftSignalType,
	params: CtftParameters,
	mode: CtftPracticeMode = "derivation",
): Promise<void> {
	await page.getByRole("radio", { name: names[family], exact: true }).check();
	await page
		.getByRole("button", { name: "Check Answer", exact: true })
		.click();
	if (family === "rect")
		await enterCtftAnswer(page, "Pulse width T", String(params.T));
	if (family === "exponential" || family === "gaussian")
		await enterCtftAnswer(page, "Decay parameter a", String(params.a));
	if (family === "cos")
		await enterCtftAnswer(
			page,
			"Carrier angular frequency",
			String(params.w0),
		);
	await enterCtftAnswer(page, "Signed time translation", String(params.t0));
	if (mode === "derivation") {
		await page
			.locator('.step-card.active input[type="radio"][value="correct"]')
			.check();
		await page
			.getByRole("button", { name: "Check Answer", exact: true })
			.click();
	}
	if (family === "cos") await enterImpulses(page, params, 0);
	else
		await enterCtftAnswer(
			page,
			"Base spectrum",
			ctftBaseAnswer(family, params),
		);
	await page
		.getByRole("radio", {
			name:
				params.t0 === 0
					? "Identity (no translation)"
					: "Time translation",
			exact: true,
		})
		.check();
	await page
		.getByRole("button", { name: "Check Answer", exact: true })
		.click();
	await enterCtftAnswer(
		page,
		"Phase multiplier",
		params.t0 === 0 ? "1" : `e^{-j(${params.t0})\\omega}`,
	);
}

/**
 * Completes final assembly and asserts the gated content is now mounted.
 * @param page - Browser on final assembly.
 * @param family - Signal family.
 * @param params - Independent fixture parameters.
 */
export async function finishCtft(
	page: Page,
	family: CtftSignalType,
	params: CtftParameters,
): Promise<void> {
	if (family === "cos") await enterImpulses(page, params, params.t0);
	else
		await enterCtftAnswer(
			page,
			"Final spectrum",
			`(${ctftBaseAnswer(family, params)})e^{-j(${params.t0})\\omega}`,
		);
	await expect(
		page.getByRole("heading", { name: "CTFT solution verified" }),
	).toBeVisible();
	await expect(page.locator(".ctft-spectrum")).toBeVisible();
}
