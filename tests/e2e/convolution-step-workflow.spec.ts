/** Production step workflows exercised entirely through learner controls. */
import { expect, type Page, test } from "@playwright/test";
import {
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION as base,
	generateConfiguredConvolutionProblem,
} from "$lib/math-engine/convolution/index";
import { serializeConvolutionFilters } from "$lib/problems/convolution-filters";

/**
 * Submits the visible form and waits for its next stage or feedback.
 * @param page - Production browser page.
 * @param values - Visible field values in order.
 */
async function submit(page: Page, values: string[]): Promise<void> {
	const active = page.locator(".step-card.active");
	const form = active.locator("form");
	const fields = form.locator("input:not([readonly])");
	await expect(fields).toHaveCount(values.length);
	for (const [index, value] of values.entries())
		await fields.nth(index).fill(value);
	const before = await active.textContent();
	await form.locator('button[type="submit"]').click();
	await expect
		.poll(
			/** Returns the updated visible tutor. */ () =>
				active.textContent(),
		)
		.not.toBe(before);
}

for (const moving of ["x", "h"] as const) {
	/** Sharing, signed steps, all seven stages, and replacement work without a dev harness. */
	test(`convolution completes signed shifted steps with ${moving} moving`, async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const selection = {
			x: {
				...base,
				type: "step" as const,
				amplitude: "-2" as const,
				shiftState: "shifted" as const,
				shiftValue: "2" as const,
			},
			h: {
				...base,
				type: "step" as const,
				amplitude: "3" as const,
				shiftState: "shifted" as const,
				shiftValue: "-1" as const,
			},
		};
		const problem = generateConfiguredConvolutionProblem(selection, {
			seed: 41,
		});
		await page.goto(
			`/convolution?${serializeConvolutionFilters({ selection, seed: 41 })}`,
		);
		await page.locator(".drill-summary").click();
		await page.locator("details.customize-disclosure summary").click();
		for (const signal of ["x", "h"]) {
			await expect(page.locator(`#${signal}-type`)).toHaveValue("step");
			await expect(page.locator(`#${signal}-parameter`)).toHaveCount(0);
		}
		await page.getByRole("button", { name: "Share This Problem" }).click();
		const shared = new URL(
			await page.locator("#convolution-share-url").inputValue(),
		);
		expect(shared.searchParams.get("v")).toBe("2");
		expect(shared.searchParams.get("xType")).toBe("step");
		await page.reload();
		for (const part of problem.itsData.step1.parts)
			await submit(page, [
				String(part.start),
				String(part.end),
				String(part.width),
			]);
		await page.locator('[data-option-id="convolution-integral"]').click();
		await page
			.locator(".step-card.active .binary-grid button")
			.nth(moving === "x" ? 0 : 1)
			.click();
		const formulaIndex = problem.itsData.step3.formulaBySignal[
			moving
		].options.findIndex(
			/** @param option - Path choice. @returns Whether it matches. */ (
				option,
			) => option.isCorrect,
		);
		await page
			.locator(".step-card.active .option-grid button")
			.nth(formulaIndex)
			.click();
		const section = problem.itsData.step3.sectionsBySignal[moving][0]!;
		await submit(page, [section.leftLatex, section.rightLatex]);
		await submit(page, ["1"]);
		await submit(page, ["1"]);
		await submit(page, ["sqrt(t)"]);
		await expect(page.locator(".feedback-validation")).toContainText(
			"cannot be verified",
		);
		const contact =
			problem.itsData.step4.transitionGroups[0]!.contactsBySignal[
				moving
			][0]!;
		await submit(page, [contact.transformedLatex]);
		await submit(page, [String(contact.transitionTime)]);
		await submit(page, ["1"]);
		await submit(page, ["2"]);
		await submit(page, ["1", "1"]);
		await page
			.getByRole("button", { name: "No overlap", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Yes, there is overlap", exact: true })
			.click();
		const overlap =
			problem.itsData.step5.parts[1]!.setupBySignal![moving].overlaps[0]!;
		await submit(
			page,
			[
				...overlap.lowerCandidateValues,
				...overlap.upperCandidateValues,
			].map(String),
		);
		await submit(page, [overlap.lowerLatex, overlap.upperLatex]);
		for (const term of problem.itsData.step6.parts[1]!.evaluationBySignal![
			moving
		]) {
			if (term.geometry) {
				await submit(page, [term.geometry.amplitudeProductLatex]);
				await submit(page, [term.geometry.overlapWidthLatex]);
			}
			for (const value of [
				term.upperSubstitutionLatex,
				term.lowerSubstitutionLatex,
				term.differenceLatex,
			])
				await submit(page, [value]);
		}
		await submit(page, [problem.intervals[1]!.exprLatex]);
		const row = page
			.locator(".piecewise-builder form")
			.filter({ has: page.locator("input:not([readonly])") });
		await row.locator("input").fill("-6(t-1)");
		await row.locator("button").click();
		await expect(
			page.getByText("Problem Completed!", { exact: true }),
		).toBeVisible();
		await page
			.getByRole("button", { name: /Generate Next Problem/ })
			.click();
		await expect(
			page.getByText("Problem Completed!", { exact: true }),
		).toHaveCount(0);
		await expect(page.locator(".progress-pill.active")).toHaveText("1");
	});
}
