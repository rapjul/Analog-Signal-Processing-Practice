/** Component regressions for the course-aligned ODE workflow. */
import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import OdeFullSolutionView from "$lib/components/solvers/OdeFullSolutionView.svelte";
import OdeStepSolver from "$lib/components/solvers/OdeStepSolver.svelte";
import { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
import OdeStep5Coefficients from "$lib/components/solvers/ode-steps/OdeStep5Coefficients.svelte";
import OdeStep7PartBTrSs from "$lib/components/solvers/ode-steps/OdeStep7PartBTrSs.svelte";
import { generateOdeProblem } from "$lib/math-engine/odes/generator";

afterEach(cleanup);

describe("ODE course-aligned explanations", () => {
	/** Checks uniform rendered systems and grading through actual selection controls. */
	it("renders all sinusoidal coefficient choices alike and grades their selections", async () => {
		const problem = generateOdeProblem({
			order: 2,
			forcingType: "sinusoid",
			seed: 4,
		});
		const solver = new OdeStepSolverState(
			/** Supplies the harmonic fixture. */ () => problem,
		);
		solver.currentStep = 5;
		solver.step5.subSteps.first_deriv.isValid = true;
		solver.step5.subSteps.second_deriv.isValid = true;
		solver.step5.activeSubStepId = "system_setup";
		const view = render(OdeStep5Coefficients, { problem, solver });
		const buttons = view.container.querySelectorAll<HTMLButtonElement>(
			'[data-option-id^="sys_"]',
		);
		expect(buttons).toHaveLength(5);
		for (const button of buttons) {
			const source = button.querySelector(
				'annotation[encoding="application/x-tex"]',
			)?.textContent;
			expect(source).toMatch(/^\\begin\{cases\}/);
			expect(source).not.toMatch(/\\(?:cos|sin)/);
		}
		for (const option of problem.itsData.step5.systemOptions ?? []) {
			if (option.isCorrect) continue;
			const button = view.container.querySelector<HTMLButtonElement>(
				`[data-option-id="${option.id}"]`,
			);
			expect(button).not.toBeNull();
			await fireEvent.click(button as HTMLButtonElement);
			expect(solver.step5.subSteps.system_setup.isValid).toBe(false);
		}
		await fireEvent.click(
			view.container.querySelector(
				'[data-option-id="sys_correct"]',
			) as HTMLButtonElement,
		);
		expect(solver.step5.subSteps.system_setup.isValid).toBe(true);
		expect(solver.step5.activeSubStepId).toBe("solve");
		expect(view.container.querySelector(".katex-error")).toBeNull();
	});

	/** Verifies exponential questions use the algebraic split and real answer selection. */
	it("grades homogeneous and particular choices through the rendered form", async () => {
		const problem = generateOdeProblem({
			order: 2,
			resonance: "repeated",
			seed: 42,
		});
		const solver = new OdeStepSolverState(
			/** Supplies the current fixture. */ () => problem,
		);
		solver.currentStep = 7;
		solver.step7.ziZsPassed = true;
		const view = render(OdeStep7PartBTrSs, { problem, solver });
		expect(view.container.textContent).toContain("Homogeneous");
		expect(view.container.textContent).toContain(
			"entire response is transient",
		);
		await fireEvent.click(
			view.container.querySelector('[data-option-id="tr_correct"]')!,
		);
		await fireEvent.click(
			view.container.querySelector('[data-option-id="ss_correct"]')!,
		);
		const verify =
			view.container.querySelector<HTMLButtonElement>(".btn-primary")!;
		expect(verify.textContent).toContain("Verify Homogeneous & Particular");
		await fireEvent.click(verify);
		expect(solver.step7.trSsPassed).toBe(true);
		expect(solver.step7.activeSubStepId).toBe("concept");
	});

	/** Verifies every forcing type exposes derivative, substitution, and coefficient equations. */
	it("includes the coefficient derivation and initial-condition system in worked solutions", () => {
		for (const forcingType of [
			"constant",
			"exponential",
			"sinusoid",
		] as const) {
			const problem = generateOdeProblem({
				order: 2,
				forcingType,
				resonance: "none",
				seed: 42,
			});
			const view = render(OdeFullSolutionView, { problem });
			const steps = view.container.querySelectorAll(
				".solution-step-card",
			);
			expect(steps[4]!.textContent).toContain("Match coefficients");
			const annotations = [
				...steps[4]!.querySelectorAll(
					'annotation[encoding="application/x-tex"]',
				),
			].map(
				/** Reads rendered source mathematics. @param annotation - KaTeX source. */ (
					annotation,
				) => annotation.textContent,
			);
			expect(annotations).toContain(
				problem.itsData.step5.substitutionLatex,
			);
			expect(annotations).toContain(problem.itsData.step5.systemLatex);
			const initialSystems = [
				...steps[5]!.querySelectorAll(
					'annotation[encoding="application/x-tex"]',
				),
			].map(
				/** Reads initial-condition mathematics. @param annotation - KaTeX source. */ (
					annotation,
				) => annotation.textContent,
			);
			expect(initialSystems).toContain(
				problem.itsData.step6.icSystemLatex,
			);
			expect(view.container.querySelector(".katex-error")).toBeNull();
			if (forcingType === "exponential")
				expect(steps[6]!.textContent).toContain(
					"entire response is transient",
				);
			view.unmount();
		}
	});

	/** Verifies an active scalar coefficient step supplies the equation without a hint. */
	it("shows the scalar coefficient equation and avoids a duplicated ansatz prefix", () => {
		const problem = generateOdeProblem({
			order: 1,
			resonance: "simple",
			seed: 42,
		});
		const solver = new OdeStepSolverState(
			/** Supplies the scalar fixture. */ () => problem,
		);
		solver.currentStep = 5;
		solver.step5.subSteps.first_deriv.isValid = true;
		solver.step5.activeSubStepId = "solve";
		const view = render(OdeStep5Coefficients, { problem, solver });
		const math = [
			...view.container.querySelectorAll(
				'annotation[encoding="application/x-tex"]',
			),
		].map(
			/** Reads displayed equation sources. @param annotation - KaTeX source. */ (
				annotation,
			) => annotation.textContent,
		);
		expect(math).toContain(problem.itsData.step5.systemLatex);
		expect(math).toContain(problem.itsData.step5.substitutionLatex);
		expect(view.container.textContent).not.toContain("y_p(t) = y_p(t)");
	});

	/** Verifies replacement problem objects reset progress even when their seeded IDs match. */
	it("resets a same-seed replacement problem", async () => {
		const problem = generateOdeProblem({
			order: 1,
			forcingType: "constant",
			seed: 42,
		});
		const view = render(OdeStepSolver, { problem });
		await fireEvent.input(view.container.querySelector("#ode-a1-input")!, {
			target: { value: String(problem.params.a1) },
		});
		await fireEvent.input(view.container.querySelector("#ode-a0-input")!, {
			target: { value: String(problem.params.a0) },
		});
		await fireEvent.click(
			view.getByRole("button", { name: /Check Characteristic Equation/ }),
		);
		await waitFor(
			/** Waits for root entry. */ () =>
				expect(
					view.container.querySelector("#ode-r1-input"),
				).not.toBeNull(),
		);
		const replacement = generateOdeProblem({
			order: 2,
			forcingType: "sinusoid",
			seed: 42,
		});
		await view.rerender({ problem: replacement });
		await waitFor(
			/** Waits for the reset state. */ () =>
				expect(
					view.container.querySelector(
						".step-card.active .step-badge",
					)?.textContent,
				).toBe("Step 1"),
		);
		expect(
			(view.container.querySelector("#ode-a1-input") as HTMLInputElement)
				.value,
		).toBe("");
	});
});
