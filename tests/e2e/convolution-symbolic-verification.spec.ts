/** Production regressions using only the learner-visible convolution controls. */
import { expect, type Page, test } from "@playwright/test";
import {
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION as base,
	generateConfiguredConvolutionProblem,
} from "$lib/math-engine/convolution/index";
import { serializeConvolutionFilters } from "$lib/problems/convolution-filters";

/** Last rendered parent/substep observed in each independent browser page. */
const progressByPage = new WeakMap<Page, string>();

/**
 * Waits for the tutor's announced focus transition before typing into a new part.
 * @param page - Browser page whose delayed instructional focus is settling.
 */
async function settleTutorFocus(page: Page): Promise<void> {
	const active = page.locator(".step-card.active");
	const key = `${await active.locator(".step-header [data-progress-heading]").textContent()}:${await active.locator(".part-progress-pill").allTextContents()}`;
	const previous = progressByPage.get(page);
	if (previous !== undefined && previous !== key) {
		await expect(page.locator("html")).toHaveAttribute(
			"data-convolution-focus-key",
			key,
		);
	}
	progressByPage.set(page, key);
}

/**
 * Submits all editable fields in the active tutor form.
 * @param page - Production browser page.
 * @param values - Answers in visible field order.
 */
async function submitActiveForm(page: Page, values: string[]): Promise<void> {
	await settleTutorFocus(page);
	const active = page.locator(".step-card.active");
	const form = page.locator(".step-card.active form");
	const inputs = form.locator("input:not([readonly])");
	await expect(inputs).toHaveCount(values.length);
	for (const [index, value] of values.entries()) {
		await inputs.nth(index).fill(value);
		await inputs.nth(index).blur();
		await expect(inputs.nth(index)).toHaveValue(value);
	}
	const before = await active.textContent();
	await form.locator('button[type="submit"]').press("Enter");
	await expect
		.poll(
			/** Waits for the tutor to render the next stage or diagnostic. */ () =>
				active.textContent(),
		)
		.not.toBe(before);
	await settleTutorFocus(page);
}

/** Hidden support changes must remain unverified until a supported answer is entered. */
test("convolution rejects truncated tails and completes after correction", async ({
	page,
}) => {
	test.setTimeout(60_000);
	const selection = {
		x: { ...base, type: "exponential" as const },
		h: { ...base, type: "exponential" as const },
	};
	const problem = generateConfiguredConvolutionProblem(selection, {
		seed: 13,
	});
	await page.addInitScript(
		/** Observes completed instructional focus without changing its behavior. */ () => {
			document.addEventListener(
				"focusin",
				/** @param event - Actual browser focus transition. */ (
					event,
				) => {
					const target = event.target;
					if (
						!(target instanceof HTMLElement) ||
						!target.matches("[data-progress-heading]")
					)
						return;
					const active = target.closest(".step-card.active");
					if (!active) return;
					const title = active.querySelector(
						".step-header [data-progress-heading]",
					)?.textContent;
					const parts = Array.from(
						active.querySelectorAll(".part-progress-pill"),
						/** @param element - Rendered multipart progress indicator. */ (
							element,
						) => element.textContent ?? "",
					);
					document.documentElement.dataset.convolutionFocusKey = `${title}:${parts}`;
				},
			);
		},
	);
	await page.goto(
		`/convolution?${serializeConvolutionFilters({ selection, seed: 13 })}`,
	);
	for (const part of problem.itsData.step1.parts)
		await submitActiveForm(page, [
			String(part.start),
			String(part.end),
			String(part.width),
		]);
	await page.locator('[data-option-id="convolution-integral"]').click();
	await page.locator(".step-card.active .binary-grid button").nth(1).click();
	const correct = problem.itsData.step3.formulaBySignal.h.options.findIndex(
		/** @param option - Formula choice. */ (option) => option.isCorrect,
	);
	await page
		.locator(".step-card.active .option-grid button")
		.nth(correct)
		.click();
	const section = problem.itsData.step3.sectionsBySignal.h[0];
	if (!section) throw new Error("Expected transformed exponential section.");
	await submitActiveForm(page, [section.leftLatex, section.rightLatex]);
	const transitions = problem.itsData.step4;
	const answers = [
		String(transitions.sectionCounts.x),
		String(transitions.sectionCounts.h),
		...transitions.breakpointParts.map(
			/** @param part - Signal breakpoint. */ (part) =>
				String(part.value),
		),
		...transitions.transitionGroups.flatMap(
			/** @param group - Distinct transition time. */ (group) =>
				group.contactsBySignal.h.flatMap(
					/** @param contact - Guided contact equation. */ (
						contact,
					) => [
						contact.transformedLatex,
						String(contact.transitionTime),
					],
				),
		),
		String(transitions.transitionGroups.length),
		String(transitions.intervalLabels.length),
	];
	for (const answer of answers) await submitActiveForm(page, [answer]);
	await page.getByLabel("First interval upper boundary").fill("0");
	await page.getByLabel("Final interval lower boundary").fill("0");
	await page
		.getByRole("button", { name: "Check interval partition" })
		.click();
	await page.getByRole("button", { name: "No overlap", exact: true }).click();
	await page
		.getByRole("button", { name: "Yes, there is overlap", exact: true })
		.click();
	const overlap =
		problem.itsData.step5.parts[1]?.setupBySignal?.h.overlaps[0];
	if (!overlap) throw new Error("Expected exponential overlap.");
	await submitActiveForm(
		page,
		[...overlap.lowerCandidateValues, ...overlap.upperCandidateValues].map(
			String,
		),
	);
	await submitActiveForm(page, [overlap.lowerLatex, overlap.upperLatex]);
	const terms = problem.itsData.step6.parts[1]?.evaluationBySignal?.h;
	if (!terms) throw new Error("Expected exponential evaluation terms.");
	for (const term of terms) {
		for (const answer of [
			term.upperSubstitutionLatex,
			term.lowerSubstitutionLatex,
			term.differenceLatex,
		])
			await submitActiveForm(page, [answer]);
	}
	await submitActiveForm(page, ["t*e^{-t}u(6-t)"]);
	await expect(page.locator(".feedback-validation")).toContainText(
		"cannot be verified",
	);
	await expect(
		page.getByText("Problem Completed!", { exact: true }),
	).toHaveCount(0);
	await submitActiveForm(page, ["t*e^{-t}"]);
	await expect(page.locator(".step-card.active")).toContainText(
		"Assemble the Piecewise Response",
	);
	const finalRow = page
		.locator(".piecewise-builder form")
		.filter({ has: page.locator("input:not([readonly])") });
	await finalRow.locator("input").fill("t*e^{-t}u(6-t)");
	await finalRow.locator("button").press("Enter");
	await expect(
		page.getByText("Problem Completed!", { exact: true }),
	).toHaveCount(0);
	await expect(finalRow).toContainText("cannot be verified");
	await finalRow.locator("input").fill("t*e^{-t}u(t)");
	await finalRow.locator("button").press("Enter");
	await expect(
		page.getByText("Problem Completed!", { exact: true }),
	).toBeVisible();
});
