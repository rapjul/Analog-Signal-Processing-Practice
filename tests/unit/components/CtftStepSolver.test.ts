/** Component contracts for isolated attempts and completion-gated CTFT content. */
import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import CtftStepSolver from "$lib/components/solvers/CtftStepSolver.svelte";
import {
	type CtftSignalType,
	createCtftProblem,
	type GeneratedCtftProblem,
} from "$lib/math-engine/fourier-transform/index";
import {
	buildCtftLesson,
	type CtftPracticeMode,
	type CtftStageId,
} from "$lib/math-engine/fourier-transform/its-scaffolding/lesson";

afterEach(cleanup);

/**
 * Completes real rendered forms; no controller or developer harness is accessed.
 * @param container - Rendered solver.
 * @param problem - Fixture providing deterministic mathematical expectations.
 * @param mode - Selected path.
 * @param stopBefore - Optional stage to leave active for targeted accessibility assertions.
 * @param approximateReversedRows - Exercises accepted decimal weights and reversed impulse order.
 */
async function complete(
	container: HTMLElement,
	problem: GeneratedCtftProblem,
	mode: CtftPracticeMode,
	stopBefore?: CtftStageId,
	approximateReversedRows = false,
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
					(task.id === "weight-0") !== approximateReversedRows
						? -problem.params.w0
						: problem.params.w0;
				expected = `${approximateReversedRows ? "3.14159265" : "\\pi"} e^{-j(${location})(${stage.id === "base" ? 0 : problem.params.t0})}`;
			}
			if (approximateReversedRows && task.kind === "location")
				expected = `X(omega)=${String(
					task.id === "location-0"
						? problem.params.w0
						: -problem.params.w0,
				)}`;
			if (task.kind === "choice")
				await fireEvent.click(
					form.querySelector(`button[value="${expected}"]`)!,
				);
			else
				await fireEvent.input(
					form.querySelector('input[type="text"]')!,
					{ target: { value: expected } },
				);
			if (task.kind !== "choice") await fireEvent.submit(form);
			await tick();
			expect(
				container.querySelector('[role="alert"]')?.textContent ?? "",
			).toBe("");
		}
	}
}

describe("CTFT guided component", () => {
	/** Typed instructions and odd-width endpoint bounds use the shared mathematical renderer. */
	it("renders mathematical answer forms and fractional endpoint bounds", async () => {
		const problem = createCtftProblem("rect", { a: 2, T: 1, w0: 3, t0: 0 });
		const view = render(CtftStepSolver, { problem });
		await complete(view.container, problem, "derivation", "base");
		expect(
			view.container.querySelectorAll(".answer-form .katex").length,
		).toBeGreaterThan(0);
		await fireEvent.input(view.getByRole("textbox"), {
			target: { value: "j/omega" },
		});
		await fireEvent.submit(view.container.querySelector("form")!);
		expect(
			view.container.querySelector(".step-card.active")?.textContent,
		).toContain("\\frac{1}{2}");
		expect(
			view.container.querySelector(".step-card.active")?.textContent,
		).not.toContain("0.5");
		expect(view.container.querySelector(".katex-error")).toBeNull();
	});
	for (const mode of ["derivation", "pairs-properties"] as const)
		for (const t0 of [0, 1, -1]) {
			/** Real validators accept approximations while completed solutions remain exact. */
			it(`separates exact solutions from accepted rows in ${mode} at ${t0}`, async () => {
				const problem = createCtftProblem("cos", {
					a: 2,
					T: 4,
					w0: 3,
					t0,
				});
				const view = render(CtftStepSolver, { problem, mode });
				await complete(view.container, problem, mode, undefined, true);
				expect(
					view.container.querySelector(".solution-breakdown")
						?.textContent,
				).not.toContain("3.14159265");
				expect(
					view.container.querySelector(".solution-breakdown")
						?.textContent,
				).toContain("\\pi");
				expect(
					[
						...view.container.querySelectorAll(".verified-fields"),
					].some(
						/** @param field - Accepted attempt disclosure. @returns Whether the entered approximation survives. */
						(field) => field.textContent?.includes("3.14159265"),
					),
				).toBe(true);
			});
		}
	/** Context is earned through real validators, never populated from future targets or edited drafts. */
	it("shows only accepted work in context and simplifies exact scalar arithmetic", async () => {
		const problem = createCtftProblem("rect", { a: 2, T: 6, w0: 3, t0: 1 });
		const view = render(CtftStepSolver, { problem });
		expect(
			view.queryByRole("region", { name: "Results so far" }),
		).toBeNull();
		expect(view.container.querySelector(".subpart-badge")).toBeNull();
		await fireEvent.click(
			view.getByRole("button", { name: "Rectangular pulse" }),
		);
		const width = view.getByLabelText("Pulse width T");
		await fireEvent.input(width, { target: { value: "999" } });
		await fireEvent.submit(view.container.querySelector("form")!);
		expect(
			view.queryByRole("region", { name: "Results so far" }),
		).toBeNull();
		await fireEvent.input(width, { target: { value: "12/2" } });
		await fireEvent.submit(view.container.querySelector("form")!);
		const context = view.getByRole("region", { name: "Results so far" });
		expect(context.querySelector("dd annotation")?.textContent).toBe("6");
		expect(context.textContent).not.toContain("999");
		expect(context.textContent).not.toContain("Signed time translation");
		expect(context.textContent).not.toContain("sinc");
		expect(
			view.container.querySelector(".subpart-badge")?.textContent,
		).toBe("Part 2B");
		expect(view.container.querySelector(".answer-preview")).toBeNull();
	});
	/** Malformed algebra reports independent original ranges and keeps all future content locked. */
	it("selects original syntax errors and diagnoses residual time after substitution", async () => {
		const problem = createCtftProblem("rect", { a: 2, T: 4, w0: 3, t0: 0 });
		const view = render(CtftStepSolver, { problem });
		await complete(view.container, problem, "derivation", "base");
		let input = view.getByRole("textbox") as HTMLInputElement;
		await fireEvent.input(input, { target: { value: "j/omega" } });
		await fireEvent.submit(view.container.querySelector("form")!);
		input = view.getByRole("textbox") as HTMLInputElement;
		await fireEvent.input(input, {
			target: { value: "e^{-j 2t} - e^{j {2t}" },
		});
		await fireEvent.submit(view.container.querySelector("form")!);
		await waitFor(() =>
			expect(input.selectionEnd! - input.selectionStart!).toBe(1),
		);
		expect(
			view
				.getByRole("region", { name: "Issues in your expression" })
				.querySelectorAll("li").length,
		).toBeGreaterThan(1);
		expect(
			view.container.querySelector(".feedback-box .katex-html")
				?.textContent,
		).toBe("t");
		expect(
			view.container.querySelector(".input-errors button annotation")
				?.textContent,
		).toBe("t");
		expect(
			view.container.querySelector(".input-errors")?.textContent,
		).toContain("Complete the requested calculation without leaving");
		expect(view.container.querySelector(".solution-breakdown")).toBeNull();
		await fireEvent.input(input, {
			target: { value: "(e^(-2j omega)-e^(2j omega))/(-j omega)" },
		});
		await fireEvent.submit(view.container.querySelector("form")!);
		expect(
			view.queryByRole("region", { name: "Issues in your expression" }),
		).toBeNull();
		expect(view.getByLabelText("Equivalent sine expression")).toBeTruthy();
	});
	for (const family of ["cos", "gaussian"] as const) {
		/** Coefficient extraction errors render neutral math-aware guidance and select the original time token. */
		it(`guides a ${family} coefficient retry without endpoint instructions`, async () => {
			const problem = createCtftProblem(family, {
				a: 2,
				T: 4,
				w0: 3,
				t0: 0,
			});
			const view = render(CtftStepSolver, { problem });
			await complete(view.container, problem, "derivation", "base");
			const input = view.getByRole("textbox") as HTMLInputElement;
			const answer = family === "cos" ? "t/2" : "-j omega t";
			await fireEvent.input(input, { target: { value: answer } });
			await fireEvent.submit(view.container.querySelector("form")!);
			await waitFor(() =>
				expect(
					input.value.slice(
						input.selectionStart!,
						input.selectionEnd!,
					),
				).toBe("t"),
			);
			expect(
				view.container
					.querySelector(".feedback-box")
					?.getAttribute("data-validation"),
			).toBe("unsupported");
			expect(
				view.container.querySelector(".feedback-box")?.textContent,
			).not.toContain("endpoint");
			expect(
				view.container.querySelector(".input-errors button annotation")
					?.textContent,
			).toBe("t");
			expect(
				view.container.querySelector(
					".solution-breakdown, .ctft-spectrum",
				),
			).toBeNull();
			await fireEvent.click(
				view.container.querySelector(".input-errors button")!,
			);
			expect(input.selectionStart).toBe(answer.indexOf("t"));
			await fireEvent.input(input, {
				target: { value: family === "cos" ? "1/2" : "-j omega" },
			});
			await fireEvent.submit(view.container.querySelector("form")!);
			expect(
				view.queryByRole("region", {
					name: "Issues in your expression",
				}),
			).toBeNull();
			expect(
				view.getByLabelText(
					family === "cos"
						? "Complex exponential impulse weight"
						: "Squared linear coefficient",
				),
			).toBeTruthy();
		});
	}
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
					".step-card.active button.choice",
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
					...view.container.querySelectorAll(".verified-fields dt"),
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
	it("keeps scalar inputs compact without a duplicate live preview", async () => {
		const view = render(CtftStepSolver, {
			problem: createCtftProblem("delta", { a: 1, T: 2, w0: 3, t0: 0 }),
		});
		await fireEvent.click(
			view.container.querySelector('button[value="delta"]')!,
		);
		const input = view.getByLabelText(
			"Signed time translation",
		) as HTMLInputElement;
		await fireEvent.input(input, { target: { value: "pi" } });
		expect(
			view.container.querySelector(".answer-preview annotation")
				?.textContent,
		).toBeUndefined();
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
				const names = [
					...view.container.querySelectorAll(".verified-fields"),
				].map(
					/** @param disclosure - Completed stage results. @returns Its accessible name. */
					(disclosure) => disclosure.getAttribute("aria-label"),
				);
				expect(new Set(names).size).toBe(mode === "derivation" ? 6 : 5);
				expect(names[0]).toBe(
					"Step 1 verified results: Identify the Base Transform Pair",
				);
				expect(names[1]).toContain(
					"Step 2 verified results: Extract Signal Parameters",
				);
				expect(
					view.container.querySelector(
						".step-card.completed details",
					),
				).toBeNull();
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
				expect(
					view.queryByRole("button", { name: "Restart Problem" }),
				).toBeNull();
				await view.rerender({ problem: { ...problem }, mode });
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
			view.container.querySelector('button[value="rect"]')!,
		);
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
			view.container.querySelector('button[aria-pressed="true"]'),
		).toBeNull();
		await view.rerender({ problem, mode: "pairs-properties" });
		expect(view.container.querySelectorAll(".step-card")).toHaveLength(5);
		expect(view.container.querySelector(".standard-pair")).toBeNull();
		await fireEvent.click(
			view.container.querySelector('button[value="rect"]')!,
		);
		expect(view.container.querySelector(".standard-pair")).not.toBeNull();
		selector.remove();
	});
	/** Feedback clears with edits and malformed input never mounts solution content. */
	it("keeps unsupported answers unverified and clears stale feedback", async () => {
		const view = render(CtftStepSolver, {
			problem: createCtftProblem("delta", { a: 1, T: 2, w0: 3, t0: 0 }),
		});
		await fireEvent.click(
			view.container.querySelector('button[value="delta"]')!,
		);
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
