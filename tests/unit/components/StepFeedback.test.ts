/**
 * @file Unit DOM tests for StepFeedback.svelte component mounting and interaction.
 */

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
import { generateOdeProblem } from "$lib/math-engine/odes/generator";

describe("StepFeedback.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	const mockProblem = generateOdeProblem({ order: 2, seed: 42 });

	it("does not render alert when solver has no feedback", () => {
		const solver = new OdeStepSolverState(() => mockProblem);
		const { container, queryByRole } = render(StepFeedback, {
			props: { solver },
		});

		expect(queryByRole("alert")).toBeNull();
		expect(container.querySelector(".feedback-alert")).toBeNull();
	});

	it("renders validation feedback alert with amber styling and icon", () => {
		const solver = new OdeStepSolverState(() => mockProblem);
		solver.setValidation(solver.step1, "Please enter a valid coefficient.");

		const { getByRole, getByText } = render(StepFeedback, {
			props: { solver },
		});

		const alert = getByRole("alert");
		expect(alert).toBeTruthy();
		expect(alert.classList.contains("feedback-validation")).toBe(true);
		expect(getByText("Input Required:")).toBeTruthy();
		expect(getByText("ℹ️")).toBeTruthy();
		expect(getByText("Please enter a valid coefficient.")).toBeTruthy();
	});

	it("renders misconception feedback alert with specialized modifier", () => {
		const solver = new OdeStepSolverState(() => mockProblem);
		solver.setMisconception(
			solver.step1,
			"Remember the negative sign in the exponent.",
		);

		const { getByRole, getByText } = render(StepFeedback, {
			props: { solver },
		});

		const alert = getByRole("alert");
		expect(alert).toBeTruthy();
		expect(alert.classList.contains("feedback-misconception")).toBe(true);
		expect(getByText("Misconception Detected:")).toBeTruthy();
		expect(getByText("⚠️")).toBeTruthy();
		expect(
			getByText("Remember the negative sign in the exponent."),
		).toBeTruthy();
	});

	it("renders incorrect attempt feedback alert", () => {
		const solver = new OdeStepSolverState(() => mockProblem);
		solver.setIncorrect(
			solver.step1,
			"The root does not satisfy the characteristic equation.",
		);

		const { getByRole, getByText } = render(StepFeedback, {
			props: { solver },
		});

		const alert = getByRole("alert");
		expect(alert).toBeTruthy();
		expect(alert.classList.contains("feedback-incorrect")).toBe(true);
		expect(getByText("Incorrect:")).toBeTruthy();
		expect(getByText("❌")).toBeTruthy();
	});
});
