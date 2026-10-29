import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import LaplaceTypedInput from "$lib/components/solvers/laplace-steps/LaplaceTypedInput.svelte";

describe("Laplace domain-aware controls", () => {
	afterEach(cleanup);
	/** Generated identities remain stable across resets and honor explicit label associations. */
	it("provides stable unique IDs and preserves caller IDs", async () => {
		const first = render(LaplaceTypedInput, { "aria-label": "First" });
		const second = render(LaplaceTypedInput, {
			id: "external-field",
			"aria-label": "Second",
		});
		const a = first.getByRole("textbox", { name: "First" });
		const b = second.getByRole("textbox", { name: "Second" });
		expect(a.id).not.toBe("");
		expect(b.id).toBe("external-field");
		expect(a.id).not.toBe(b.id);
		const original = a.id;
		await fireEvent.input(a, { target: { value: "(" } });
		await first.rerender({ value: "1", "aria-label": "First" });
		expect(a.id).toBe(original);
		expect(first.queryByRole("status")).toBeNull();
	});
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
		const continuation = new KeyboardEvent("keydown", {
			key: "5",
			bubbles: true,
			cancelable: true,
		});
		await fireEvent(input, continuation);
		expect(continuation.defaultPrevented).toBe(true);
		await fireEvent.keyDown(input, { key: "Backspace" });
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
