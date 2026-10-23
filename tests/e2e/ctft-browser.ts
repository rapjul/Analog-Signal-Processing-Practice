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
	await page
		.getByRole("button", { name: names[family], exact: true })
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
			.getByRole("button", {
				name:
					family === "cos"
						? /Cosine equals half the sum/
						: family === "delta"
							? /Evaluate the exponential factor at time zero/
							: /forward transformation with the negative imaginary exponent/,
			})
			.click();
	}
	if (mode === "derivation") {
		await enterDerivation(page, family, params);
	}
	if (family === "cos") await enterImpulses(page, params, 0);
	else if (!(mode === "derivation" && family === "delta"))
		await enterCtftAnswer(
			page,
			"Base spectrum",
			ctftBaseAnswer(family, params),
		);
	await page
		.getByRole("button", {
			name:
				params.t0 === 0
					? "Identity (no translation)"
					: "Time translation",
			exact: true,
		})
		.click();
	await enterCtftAnswer(
		page,
		"Phase multiplier",
		params.t0 === 0 ? "1" : `e^{-j(${params.t0})\\omega}`,
	);
}

/**
 * Answers intermediate work with independent family formulas and ordinary forms.
 * @param page - Browser at the base derivation stage.
 * @param family - Visible signal family.
 * @param params - Independently known fixture parameters.
 */
async function enterDerivation(
	page: Page,
	family: CtftSignalType,
	params: CtftParameters,
): Promise<void> {
	const answers: Record<CtftSignalType, [string, string][]> = {
		rect: [
			["Exponential antiderivative coefficient", "j/omega"],
			[
				"Upper minus lower endpoint expression",
				`2 sin(${params.T} omega/2)/omega`,
			],
			["Equivalent sine expression", `2 sin(${params.T} omega/2)/omega`],
			["Zero-frequency limit", String(params.T)],
		],
		exponential: [
			[
				"Exponential antiderivative coefficient",
				`-1/(${params.a}+j omega)`,
			],
			["Infinite-endpoint contribution", "0"],
			[
				"Lower-endpoint contribution before subtraction",
				`-1/(${params.a}+j omega)`,
			],
		],
		gaussian: [
			["Gaussian identity linear coefficient", "-j omega"],
			["Squared linear coefficient", "-omega^2"],
			["Gaussian identity exponent", `-omega^2/${4 * params.a}`],
		],
		delta: [
			["Sifting evaluation point", "0"],
			["Sampled exponential factor", "1"],
		],
		cos: [
			["Euler decomposition coefficient", "1/2"],
			["Complex exponential impulse weight", "2 pi"],
			["Cosine impulse weight after Euler scaling", "pi"],
		],
	};
	for (const [label, answer] of answers[family])
		await enterCtftAnswer(page, label, answer);
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
