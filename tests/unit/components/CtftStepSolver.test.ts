/** Component contracts for isolated attempts and completion-gated CTFT content. */
import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import CtftStepSolver from "$lib/components/solvers/CtftStepSolver.svelte";
import {
	buildCtftLesson,
	type CtftPracticeMode,
	type CtftStageId,
} from "$lib/math-engine/ctft-lesson";
import {
	type CtftSignalType,
	createCtftProblem,
	type GeneratedCtftProblem,
} from "$lib/math-engine/fourier-transform";

afterEach(cleanup);

/**
 * Completes real rendered forms; no controller or developer harness is accessed.
 * @param container - Rendered solver.
 * @param problem - Fixture providing deterministic mathematical expectations.
 * @param mode - Selected path.
 * @param stopBefore - Optional stage to leave active for targeted accessibility assertions.
 */
async function complete(
	container: HTMLElement,
	problem: GeneratedCtftProblem,
	mode: CtftPracticeMode,
	stopBefore?: CtftStageId,
): Promise<void> {
	const lesson = buildCtftLesson(problem, mode);
	for (const stage of lesson.stages) {
		if (stage.id === stopBefore) return;
		for (const task of stage.parts) {
			const form = container.querySelector<HTMLFormElement>(
				".step-card.active form",
			)!;
			let expected = task.expected;
			if (task.kind === "weight") {
				const location =
					task.id === "weight-0"
						? -problem.params.w0
						: problem.params.w0;
				expected = `\\pi e^{-j(${location})(${stage.id === "base" ? 0 : problem.params.t0})}`;
			}
			if (task.kind === "choice")
				await fireEvent.click(
					form.querySelector(`input[value="${expected}"]`)!,
				);
			else
				await fireEvent.input(
					form.querySelector('input[type="text"]')!,
					{ target: { value: expected } },
				);
			await fireEvent.submit(form);
			await tick();
			expect(
				container.querySelector('[role="alert"]')?.textContent ?? "",
			).toBe("");
		}
	}
}

describe("CTFT guided component", () => {
	for (const family of [
		"rect",
		"exponential",
		"gaussian",
		"delta",
		"cos",
	] as const) {
		/** Setup options expose distinct spoken mathematical descriptions without nested formula controls. */
		it(`provides accessible setup options and mathematical parameter labels for ${family}`, async () => {
			const problem = createCtftProblem(family, {
				a: 2,
				T: 4,
				w0: 3,
				t0: 0,
			});
			const view = render(CtftStepSolver, { problem });
			await complete(view.container, problem, "derivation", "setup");
			const radios = [
				...view.container.querySelectorAll<HTMLInputElement>(
					'.step-card.active input[type="radio"]',
				),
			];
			const names = radios.map(
				/** @param radio - Setup option. @returns Its explicit spoken label. */ (
					radio,
				) => radio.getAttribute("aria-label"),
			);
			expect(new Set(names).size).toBe(2);
			for (const name of names)
				expect(name).not.toMatch(/Mathematical formula block|\\/);
			expect(
				view.container.querySelector(
					'.choice [role="button"], .choice button',
				),
			).toBeNull();
			expect(
				view.container.querySelectorAll(
					".step-card.active .choice .katex",
				),
			).toHaveLength(2);
			if (
				family === "rect" ||
				family === "exponential" ||
				family === "gaussian"
			) {
				const parameterLabels = [
					...view.container.querySelectorAll(".verified-fields p"),
				].filter(
					/** @param label - Verified field label. @returns Whether it names a mathematical parameter. */ (
						label,
					) =>
						/Pulse width|Decay parameter/.test(
							label.textContent ?? "",
						),
				);
				expect(parameterLabels).toHaveLength(1);
				expect(
					parameterLabels[0]!.querySelector(".katex"),
				).not.toBeNull();
			}
		});
	}
	/** Plain supported notation previews as mathematical symbols without modifying the input. */
	it("renders shorthand constants in the live preview", async () => {
		const view = render(CtftStepSolver, {
			problem: createCtftProblem("delta", { a: 1, T: 2, w0: 3, t0: 0 }),
		});
		await fireEvent.click(
			view.container.querySelector('input[value="delta"]')!,
		);
		await fireEvent.submit(view.container.querySelector("form")!);
		const input = view.getByLabelText(
			"Signed time translation",
		) as HTMLInputElement;
		await fireEvent.input(input, { target: { value: "pi" } });
		expect(
			view.container.querySelector(".answer-preview annotation")
				?.textContent,
		).toBe("\\pi");
		expect(input.value).toBe("pi");
	});
	/** Parent callback updates do not reset progress or notify a stale callback. */
	it("notifies the latest completion callback exactly once", async () => {
		const problem = createCtftProblem("delta", {
			a: 1,
			T: 2,
			w0: 3,
			t0: 0,
		});
		const original = vi.fn();
		const latest = vi.fn();
		const view = render(CtftStepSolver, { problem, onComplete: original });
		await view.rerender({ problem, onComplete: latest });
		await complete(view.container, problem, "derivation");
		expect(original).not.toHaveBeenCalled();
		expect(latest).toHaveBeenCalledTimes(1);
	});
	for (const mode of ["derivation", "pairs-properties"] as const)
		for (const family of [
			"rect",
			"exponential",
			"gaussian",
			"delta",
			"cos",
		] as CtftSignalType[]) {
			/** Every visible path must finish through forms and reveal only its own worked stages. */
			it(`completes ${family} in ${mode}`, async () => {
				const problem = createCtftProblem(family, {
					a: 2,
					T: 4,
					w0: 3,
					t0: -1,
				});
				const callback = vi.fn();
				const view = render(CtftStepSolver, {
					problem,
					mode,
					onComplete: callback,
				});
				expect(
					view.container.querySelector(".solution-breakdown"),
				).toBeNull();
				expect(
					view.container.querySelector(".ctft-spectrum"),
				).toBeNull();
				await complete(view.container, problem, mode);
				expect(
					view.container.querySelector('[role="status"]')
						?.textContent,
				).toContain(
					mode === "derivation"
						? "CTFT derivation completed."
						: "CTFT pairs and properties practice completed.",
				);
				expect(callback).toHaveBeenCalledTimes(1);
				expect(
					view.container.querySelectorAll(".step-card.completed"),
				).toHaveLength(mode === "derivation" ? 6 : 5);
				expect(
					view.container
						.querySelector(".solution-breakdown")
						?.textContent?.includes("Set Up the Derivation"),
				).toBe(mode === "derivation");
				expect(
					view.container.querySelector(".ctft-spectrum"),
				).not.toBeNull();
				expect(
					view.container.querySelectorAll(".katex-error"),
				).toHaveLength(0);
				// SVG keeps numerical ticks only; mathematical captions use shared renderers.
				for (const label of view.container.querySelectorAll(
					".ctft-spectrum svg text",
				))
					expect(label.textContent).not.toMatch(/[ωπ]|arg|X\(/);
				expect(
					view.container.querySelector(".ctft-spectrum .katex"),
				).not.toBeNull();
				const chains = [
					...view.container.querySelectorAll(
						".solution-breakdown annotation",
					),
				].filter(
					/** @param annotation - Rendered formula source. @returns A completed equation chain. */ (
						annotation,
					) => annotation.textContent?.includes("X_0"),
				);
				expect(chains.length > 0).toBe(mode === "derivation");
				await fireEvent.click(
					view.getByRole("button", { name: "Restart Problem" }),
				);
				expect(
					view.container.querySelector(".solution-breakdown"),
				).toBeNull();
				expect(
					view.container.querySelector(".ctft-spectrum"),
				).toBeNull();
			});
		}
	/** Focus advances within the attempt but stays on external selectors during replacements. */
	it("resets identical IDs and mode changes without stealing selector focus", async () => {
		const problem = createCtftProblem("rect", { a: 2, T: 4, w0: 3, t0: 1 });
		const view = render(CtftStepSolver, { problem });
		await fireEvent.click(
			view.container.querySelector('input[value="rect"]')!,
		);
		await fireEvent.submit(view.container.querySelector("form")!);
		await waitFor(() =>
			expect(document.activeElement).toBe(
				view.container.querySelector(
					".step-card.active .subpart-title",
				),
			),
		);
		const selector = document.createElement("select");
		document.body.append(selector);
		selector.focus();
		await view.rerender({ problem: { ...problem }, mode: "derivation" });
		expect(document.activeElement).toBe(selector);
		expect(
			view.container.querySelector('input[type="radio"]:checked'),
		).toBeNull();
		await view.rerender({ problem, mode: "pairs-properties" });
		expect(view.container.querySelectorAll(".step-card")).toHaveLength(5);
		expect(view.container.querySelector(".standard-pair")).toBeNull();
		await fireEvent.click(
			view.container.querySelector('input[value="rect"]')!,
		);
		await fireEvent.submit(view.container.querySelector("form")!);
		expect(view.container.querySelector(".standard-pair")).not.toBeNull();
		selector.remove();
	});
	/** Feedback clears with edits and malformed input never mounts solution content. */
	it("keeps unsupported answers unverified and clears stale feedback", async () => {
		const view = render(CtftStepSolver, {
			problem: createCtftProblem("delta", { a: 1, T: 2, w0: 3, t0: 0 }),
		});
		await fireEvent.click(
			view.container.querySelector('input[value="delta"]')!,
		);
		await fireEvent.submit(view.container.querySelector("form")!);
		const input = view.getByLabelText("Signed time translation");
		await fireEvent.input(input, { target: { value: "1/0" } });
		await fireEvent.submit(
			view.container.querySelector(".step-card.active form")!,
		);
		expect(
			view.container.querySelector('[data-validation="invalid"]'),
		).not.toBeNull();
		await fireEvent.input(input, { target: { value: "0" } });
		expect(view.container.querySelector('[role="alert"]')).toBeNull();
		expect(view.container.querySelector(".solution-breakdown")).toBeNull();
	});
});
