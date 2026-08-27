/**
 * @file Unit DOM tests for modular ODE Step 2 subcomponents (Strategy Gate, Factoring, Discriminant, Quadratic).
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
import OdeStep2Discriminant from "$lib/components/solvers/ode-steps/step2-substeps/OdeStep2Discriminant.svelte";
import OdeStep2Factoring from "$lib/components/solvers/ode-steps/step2-substeps/OdeStep2Factoring.svelte";
import OdeStep2Quadratic from "$lib/components/solvers/ode-steps/step2-substeps/OdeStep2Quadratic.svelte";
import OdeStep2StrategyGate from "$lib/components/solvers/ode-steps/step2-substeps/OdeStep2StrategyGate.svelte";
import { generateOdeProblem } from "$lib/math-engine/odes/index";

describe("ODE Step 2 Modular Subcomponents", () => {
	afterEach(() => {
		cleanup();
	});

	describe("OdeStep2StrategyGate", () => {
		it("renders strategy buttons for 2nd-order ODE and triggers solver selection", async () => {
			const problem = generateOdeProblem({
				order: 2,
				rootType: "distinct_real",
				forcingType: "constant",
			});
			const solver = new OdeStepSolverState(() => problem);

			const { getByText } = render(OdeStep2StrategyGate, {
				props: { problem, solver },
			});

			const factoringBtn = getByText("Factoring by inspection");
			const quadraticBtn = getByText("Quadratic formula / Square root");
			expect(factoringBtn).toBeTruthy();
			expect(quadraticBtn).toBeTruthy();

			await fireEvent.click(factoringBtn);
			expect(solver.step2.strategy).toBe("factoring");

			await fireEvent.click(quadraticBtn);
			expect(solver.step2.strategy).toBe("quadratic");
		});

		it("does not render strategy buttons for 1st-order ODE", () => {
			const problem = generateOdeProblem({
				order: 1,
				forcingType: "constant",
			});
			const solver = new OdeStepSolverState(() => problem);

			const { container } = render(OdeStep2StrategyGate, {
				props: { problem, solver },
			});

			expect(container.querySelector(".strategy-gate-box")).toBeNull();
		});
	});

	describe("OdeStep2Factoring", () => {
		it("renders root input fields and triggers checkStep2 on button click", async () => {
			const problem = generateOdeProblem({
				order: 2,
				rootType: "distinct_real",
				forcingType: "constant",
			});
			const solver = new OdeStepSolverState(() => problem);
			const checkSpy = vi.spyOn(solver, "checkStep2");

			const { container, getByText } = render(OdeStep2Factoring, {
				props: { problem, solver },
			});

			const r1Input = container.querySelector(
				"#ode-r1-input",
			) as HTMLInputElement;
			const r2Input = container.querySelector(
				"#ode-r2-input",
			) as HTMLInputElement;
			expect(r1Input).toBeTruthy();
			expect(r2Input).toBeTruthy();

			const checkBtn = getByText("Check Factored Roots →");
			await fireEvent.click(checkBtn);
			expect(checkSpy).toHaveBeenCalled();
		});
	});

	describe("OdeStep2Discriminant", () => {
		it("renders discriminant input, verify action, and verified badge", async () => {
			const problem = generateOdeProblem({
				order: 2,
				rootType: "distinct_real",
				forcingType: "constant",
			});
			const solver = new OdeStepSolverState(() => problem);
			const verifySpy = vi.spyOn(solver, "verifyDiscriminant");

			const { container, getByText } = render(OdeStep2Discriminant, {
				props: { problem, solver },
			});

			const discInput = container.querySelector(
				"#ode-disc-input",
			) as HTMLInputElement;
			expect(discInput).toBeTruthy();

			const verifyBtn = getByText("Verify Discriminant");
			await fireEvent.click(verifyBtn);
			expect(verifySpy).toHaveBeenCalled();
		});
	});

	describe("OdeStep2Quadratic", () => {
		it("renders root classification choices and allows selection", async () => {
			const problem = generateOdeProblem({
				order: 2,
				rootType: "distinct_real",
				forcingType: "constant",
			});
			const solver = new OdeStepSolverState(() => problem);

			const { container } = render(OdeStep2Quadratic, {
				props: { problem, solver },
			});

			const choiceCards = container.querySelectorAll(".quad-class-btn");
			expect(choiceCards.length).toBe(3);

			await fireEvent.click(choiceCards[0]!);
			expect(solver.step2.quadClassChoice).toBe("distinct_real");
		});
	});
});
