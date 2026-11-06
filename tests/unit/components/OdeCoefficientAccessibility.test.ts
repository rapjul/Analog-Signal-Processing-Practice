/** Coefficient diagnostics identify only the failed submitted fields. */
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, expect, it } from "vitest";
import { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
import OdeStep1CharEq from "$lib/components/solvers/ode-steps/OdeStep1CharEq.svelte";
import { generateOdeProblem } from "$lib/math-engine/odes/index";

afterEach(cleanup);

/** Incorrect coefficients expose the diagnostic, while correct and edited values remain unmarked. */
it("links the incorrect coefficient to feedback without marking correct siblings", async () => {
	const problem = generateOdeProblem({
		order: 2,
		rootType: "distinct_real",
		forcingType: "constant",
		seed: 73,
	});
	const solver = new OdeStepSolverState(() => problem);
	const view = render(OdeStep1CharEq, { problem, solver });
	const a2 = view.container.querySelector<HTMLInputElement>("#ode-a2-input")!;
	const a1 = view.container.querySelector<HTMLInputElement>("#ode-a1-input")!;
	const a0 = view.container.querySelector<HTMLInputElement>("#ode-a0-input")!;
	await fireEvent.input(a2, { target: { value: String(problem.params.a2) } });
	await fireEvent.input(a1, {
		target: { value: String(problem.params.a1 + 1) },
	});
	await fireEvent.input(a0, { target: { value: String(problem.params.a0) } });
	expect(a1.hasAttribute("aria-invalid")).toBe(false);
	await fireEvent.click(
		view.getByRole("button", { name: /Check Characteristic Equation/ }),
	);
	expect(a1.getAttribute("aria-invalid")).toBe("true");
	expect(a2.hasAttribute("aria-invalid")).toBe(false);
	expect(a0.hasAttribute("aria-invalid")).toBe(false);
	expect(a1.getAttribute("aria-describedby")).toBe(
		view.getByRole("alert").id,
	);
	await fireEvent.input(a1, { target: { value: String(problem.params.a1) } });
	expect(a1.hasAttribute("aria-invalid")).toBe(false);
	expect(a1.hasAttribute("aria-describedby")).toBe(false);
});
