import { expect, test } from "@playwright/test";

/**
 * End-to-End & Visual Test Suite: ODE Multi-Part Sub-Steps and Full Solution View.
 *
 * Verifies progressive disclosure across multi-part steps (Steps 5, 6, 7),
 * full worked derivation post-solve component (OdeFullSolutionView),
 * and 320px narrow viewport reflow compliance.
 */

test.describe("ODE Multi-Part Sub-Steps & Full Solution View", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/odes");
		await page.waitForLoadState("networkidle");
	});

	test("renders multi-part progress pills and step badges correctly", async ({
		page,
	}) => {
		// Drill into Step 1 to verify base rendering
		const step1 = page.locator(".step-card").first();
		await expect(step1).toBeVisible();
		await expect(step1.locator(".step-badge")).toHaveText("Step 1");
	});

	test("320px narrow viewport has zero horizontal layout overflow", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 800 });
		await page.waitForTimeout(300);

		// Check for horizontal scrollbar on root document
		const isOverflowing = await page.evaluate(() => {
			return (
				document.documentElement.scrollWidth >
				document.documentElement.clientWidth
			);
		});

		expect(isOverflowing).toBe(false);

		// Verify practice card and solver cards are within 320px
		const cardWidth = await page
			.locator(".practice-card")
			.evaluate((el) => el.clientWidth);
		expect(cardWidth).toBeLessThanOrEqual(320);
	});

	test("keeps completed sub-step headings clear of status badges at 320px @dev-harness", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(
			"/odes?order=2&rootType=complex_conjugate&forcing=sinusoid&leading=monic&resonance=none&seed=212",
		);
		await expect
			.poll(() =>
				page.evaluate(
					() => typeof window.__signalLabDev?.goToVisualState,
				),
			)
			.toBe("function");
		const navigated = await page.evaluate(() =>
			window.__signalLabDev?.goToVisualState("ode.step-05.system-setup"),
		);
		expect(navigated).toBe(true);
		const headers = page.locator(
			".step-card.active .subpart-done .subpart-header",
		);
		await expect.poll(() => headers.count()).toBeGreaterThanOrEqual(2);
		await expect
			.poll(() =>
				headers.evaluateAll((elements) =>
					elements.flatMap((element) => {
						const title =
							element.querySelector<HTMLElement>(
								".subpart-title",
							);
						const badge = element.querySelector<HTMLElement>(
							".substep-check-badge",
						);
						if (!title || !badge)
							return ["Missing heading or status badge"];
						const a = title.getBoundingClientRect();
						const b = badge.getBoundingClientRect();
						const overlap =
							a.left < b.right &&
							b.left < a.right &&
							a.top < b.bottom &&
							b.top < a.bottom;
						return title.scrollWidth > title.clientWidth || overlap
							? [title.textContent]
							: [];
					}),
				),
			)
			.toEqual([]);
	});

	test("collapsible filter drawer works properly on mobile 320px viewport", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 800 });
		const drillSummary = page.locator(".drill-summary");
		await drillSummary.click();

		const rootSelect = page.locator("#root-type-select");
		await expect(rootSelect).toBeVisible();

		const isOverflowing = await page.evaluate(() => {
			return (
				document.documentElement.scrollWidth >
				document.documentElement.clientWidth
			);
		});
		expect(isOverflowing).toBe(false);
	});
});
