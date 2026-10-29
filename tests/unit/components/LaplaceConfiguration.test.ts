import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import LaplaceConfiguration from "$lib/components/solvers/laplace-steps/LaplaceConfiguration.svelte";
import {
	generateLaplaceExercise,
	laplaceSignal,
} from "$lib/math-engine/laplace/generator";
import type { OdeExercise } from "$lib/math-engine/laplace/types";

describe("typed custom Laplace controls", () => {
	afterEach(cleanup);
	/** Rejected drafts remain descriptions rather than contaminating externally associated names. */
	it("retains exact configuration names through rejection and correction", async () => {
		const spec = generateLaplaceExercise("inverse", 73, "distinct").spec;
		const view = render(LaplaceConfiguration, { spec, onApply: () => {} });
		for (const name of ["Numerator gain", "Delay"]) {
			const input = view.getByLabelText(name, {
				exact: true,
			}) as HTMLInputElement;
			const original = input.value;
			await fireEvent.input(input, { target: { value: "(" } });
			expect(view.getByRole("textbox", { name })).toBe(input);
			const issue = view.getByRole("status");
			expect(input.getAttribute("aria-describedby")).toBe(issue.id);
			expect(input.labels?.[0]?.textContent).toBe(name);
			expect(issue.closest("label")).toBeNull();
			expect(input.value).toBe(original);
			await fireEvent.input(input, { target: { value: "1/2" } });
			expect(view.queryByRole("status")).toBeNull();
		}
	});
	/** Both initial conditions and repeated signal controls have distinct external label targets. */
	it("associates ODE and repeated power labels with unique inputs", async () => {
		const spec = generateLaplaceExercise("ode", 73, "repeated").spec;
		if (spec.workflow !== "ode") throw new Error("Expected ODE fixture.");
		spec.terms = [laplaceSignal(), laplaceSignal()];
		const view = render(LaplaceConfiguration, { spec, onApply: () => {} });
		for (const name of [
			"Leading ODE coefficient",
			"Initial output at zero minus",
			"Initial derivative at zero minus (second order)",
		]) {
			const input = view.getByLabelText(name, { exact: true });
			await fireEvent.input(input, { target: { value: "(" } });
			expect(view.getByRole("textbox", { name })).toBe(input);
			await fireEvent.input(input, { target: { value: "0" } });
		}
		const powers = view.getAllByRole("textbox", {
			name: "Polynomial power",
		}) as HTMLInputElement[];
		expect(new Set(powers.map((input) => input.id)).size).toBe(2);
		for (const input of powers) {
			await fireEvent.input(input, { target: { value: "1.5" } });
			expect(input.labels?.[0]?.htmlFor).toBe(input.id);
			expect(input.labels?.[0]?.textContent).toBe("Polynomial power");
			await fireEvent.input(input, { target: { value: "2" } });
		}
		expect(view.queryByRole("status")).toBeNull();
	});
	/** Fractional locations remain editable while irrelevant impulse and first-order parameters disappear. */
	it("hides unused fields and retains exact fractional roots", async () => {
		const spec: OdeExercise = {
			workflow: "ode",
			seed: 1,
			leading: "1",
			roots: [{ real: "-1", frequency: "0/1", multiplicity: 1 }],
			initial: ["0", "99"],
			terms: [
				{
					kind: "impulse",
					amplitude: "1",
					rate: "99",
					frequency: "99",
					power: 2,
					delay: "0",
					side: "right",
				},
			],
		};
		const view = render(LaplaceConfiguration, { spec, onApply: () => {} });
		view.container.querySelector("details")!.open = true;
		expect(view.queryByText(/Initial derivative at zero minus/)).toBeNull();
		expect(view.queryByLabelText("Term 1 rate")).toBeNull();
		expect(view.queryByLabelText("Term 1 frequency")).toBeNull();
		expect(view.queryByText("Polynomial power")).toBeNull();
		const root = view.getByLabelText(
			"Operator 1 real part",
		) as HTMLInputElement;
		await fireEvent.input(root, { target: { value: "-3/2" } });
		expect(root.value).toBe("-3/2");
		const count = view.getByLabelText(
			"Operator 1 multiplicity",
		) as HTMLInputElement;
		await fireEvent.input(count, { target: { value: "1.5" } });
		expect(count.value).toBe("1");
	});
});
