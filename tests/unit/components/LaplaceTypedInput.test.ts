import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import LaplaceTypedInput from "$lib/components/solvers/laplace-steps/LaplaceTypedInput.svelte";

describe("Laplace domain-aware controls", () => {
	afterEach(cleanup);
	/** Typing and paste both submit complete insertion candidates through the same input event. */
	it("rejects whole invalid integer insertions and announces the domain", async () => {
		const view = render(LaplaceTypedInput, {
			value: "2",
			entry: { kind: "integer", min: 0 },
			"aria-label": "Degree",
		});
		const input = view.getByRole("textbox", {
			name: "Degree",
		}) as HTMLInputElement;
		for (const text of ["(", "1.5", "1e2", "1/2", "-1"]) {
			await fireEvent.input(input, { target: { value: text } });
			expect(input.value).toBe("2");
			expect(view.getByRole("status").textContent).toContain(
				"whole number",
			);
			expect(input.getAttribute("aria-describedby")).toBe(
				view.getByRole("status").id,
			);
		}
		await fireEvent.input(input, { target: { value: "3" } });
		expect(input.value).toBe("3");
		expect(view.queryByRole("status")).toBeNull();
		await fireEvent.input(input, { target: { value: "1.5" } });
		expect(view.getByRole("status")).not.toBeNull();
		await view.rerender({
			value: "",
			entry: { kind: "integer", min: 0 },
			"aria-label": "Degree",
		});
		expect(input.value).toBe("");
		expect(view.queryByRole("status")).toBeNull();
	});
	/** Exact literal entry supports fractional locations and partial negative signs. */
	it("retains fractions and clears an incomplete sign only through editing", async () => {
		const view = render(LaplaceTypedInput, {
			entry: { kind: "literal" },
			"aria-label": "Root",
		});
		const input = view.getByRole("textbox") as HTMLInputElement;
		await fireEvent.input(input, { target: { value: "-" } });
		expect(input.value).toBe("-");
		await fireEvent.input(input, { target: { value: "-3/2" } });
		expect(input.value).toBe("-3/2");
		await fireEvent.input(input, { target: { value: "(-3/2)" } });
		expect(input.value).toBe("-3/2");
	});
});
