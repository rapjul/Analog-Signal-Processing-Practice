import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import LaplaceConfiguration from "$lib/components/solvers/laplace-steps/LaplaceConfiguration.svelte";
import type { OdeExercise } from "$lib/math-engine/laplace/types";

describe("typed custom Laplace controls", () => {
	afterEach(cleanup);
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
