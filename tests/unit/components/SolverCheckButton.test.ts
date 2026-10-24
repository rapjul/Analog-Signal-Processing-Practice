/** Native submission and activation contracts for the shared solver action. */
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import SolverCheckButton from "$lib/components/ui/SolverCheckButton.svelte";

afterEach(cleanup);

describe("SolverCheckButton", () => {
	/** Solver forms receive an accurately named native submit button. */
	it("defaults to submitting and reflects disabled state", async () => {
		const view = render(SolverCheckButton, {
			label: "Check width →",
			disabled: true,
		});
		const button = view.getByRole("button", {
			name: "Check width →",
		}) as HTMLButtonElement;
		expect(button.type).toBe("submit");
		expect(button.disabled).toBe(true);
		await view.rerender({ label: "Check translation →", disabled: false });
		expect(view.getByRole("button", { name: "Check translation →" })).toBe(
			button,
		);
		expect(button.disabled).toBe(false);
	});
	/** Non-form consumers can opt into button behavior and ordinary click handling. */
	it("supports native button activation", async () => {
		const onclick = vi.fn();
		const view = render(SolverCheckButton, {
			label: "Check calculation →",
			type: "button",
			onclick,
		});
		const button = view.getByRole("button") as HTMLButtonElement;
		expect(button.type).toBe("button");
		await fireEvent.click(button);
		expect(onclick).toHaveBeenCalledTimes(1);
	});
});
