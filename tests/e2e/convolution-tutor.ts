/** Focus-aware interactions with the production convolution tutor. */
import { expect, type Page } from "@playwright/test";

/** Last rendered parent and substep observed in each independent page. */
const progressByPage = new WeakMap<Page, string>();

/**
 * Observes completion of the app's real delayed instructional focus transition.
 * @param page - Page to observe, including subsequent navigations and reloads.
 */
export async function observeConvolutionFocus(page: Page): Promise<void> {
	await page.addInitScript(
		/** Installs an observer without modifying application behavior. */ () => {
			document.addEventListener(
				"focusin",
				/** @param event - Actual browser focus event. */ (event) => {
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
						/** @param part - Rendered progress indicator. @returns Its text. */ (
							part,
						) => part.textContent ?? "",
					);
					document.documentElement.dataset.convolutionFocusKey = `${title}:${parts}`;
				},
			);
		},
	);
}

/**
 * Waits for focus to settle before typing into a newly rendered tutor part.
 * @param page - Page containing the active tutor.
 */
async function settleFocus(page: Page): Promise<void> {
	const active = page.locator(".step-card.active");
	const key = `${await active.locator(".step-header [data-progress-heading]").textContent()}:${await active.locator(".part-progress-pill").allTextContents()}`;
	const previous = progressByPage.get(page);
	if (previous !== undefined && previous !== key)
		await expect(page.locator("html")).toHaveAttribute(
			"data-convolution-focus-key",
			key,
		);
	progressByPage.set(page, key);
}

/**
 * Submits one visible form using the actual Enter keyboard interaction.
 * @param page - Production page whose tutor receives the answers.
 * @param values - Answers in visible field order.
 */
export async function submitConvolutionForm(
	page: Page,
	values: string[],
): Promise<void> {
	await settleFocus(page);
	const active = page.locator(".step-card.active");
	const form = active.locator("form");
	const fields = form.locator("input:not([readonly])");
	await expect(fields).toHaveCount(values.length);
	for (const [index, value] of values.entries()) {
		await fields.nth(index).fill(value);
		await fields.nth(index).blur();
		await expect(fields.nth(index)).toHaveValue(value);
	}
	const before = await active.textContent();
	await form.locator('button[type="submit"]').press("Enter");
	await expect
		.poll(
			/** Returns the newly rendered tutor stage or diagnostic. */ () =>
				active.textContent(),
		)
		.not.toBe(before);
	await settleFocus(page);
}
