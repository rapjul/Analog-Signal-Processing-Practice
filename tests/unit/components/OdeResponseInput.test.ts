/**
 * @file Unit DOM tests for OdeResponseInput.svelte component mounting, template switching, and interactive synthesis.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import OdeResponseInput from "$lib/components/math/OdeResponseInput.svelte";

describe("OdeResponseInput.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders with title and default overdamped mode buttons", () => {
		const { getByText, container } = render(OdeResponseInput, {
			props: {
				r1: "-2",
				r2: "-3",
			},
		});

		expect(getByText("ODE Solution Template Builder")).toBeTruthy();
		expect(getByText("Overdamped (Distinct Real)")).toBeTruthy();
		expect(getByText("Critically Damped (Repeated)")).toBeTruthy();
		expect(getByText("Underdamped (Complex)")).toBeTruthy();

		// Default mode is overdamped
		const overdampedBtn = getByText("Overdamped (Distinct Real)");
		expect(overdampedBtn.classList.contains("active")).toBe(true);

		// Inputs for c1, r1, c2, r2 exist
		expect(container.querySelector("#c1-input")).toBeTruthy();
		expect(container.querySelector("#builder-r1-input")).toBeTruthy();
		expect(container.querySelector("#c2-input")).toBeTruthy();
		expect(container.querySelector("#builder-r2-input")).toBeTruthy();
	});

	it("calls onChange with synthesized overdamped LaTeX on mount and input change", async () => {
		const handleChange = vi.fn();
		const { container } = render(OdeResponseInput, {
			props: {
				r1: "-2",
				r2: "-3",
				onChange: handleChange,
			},
		});

		const c1Input = container.querySelector(
			"#c1-input",
		) as HTMLInputElement;
		const c2Input = container.querySelector(
			"#c2-input",
		) as HTMLInputElement;

		await fireEvent.input(c1Input, { target: { value: "3" } });
		await fireEvent.input(c2Input, { target: { value: "4" } });

		expect(handleChange).toHaveBeenCalled();
		const lastCall = handleChange.mock.calls.at(-1)?.[0];
		expect(lastCall).toContain("3e^{-2t}");
		expect(lastCall).toContain("4e^{-3t}");
		expect(lastCall).toContain("u(t)");
	});

	it("switches to critically damped mode and synthesizes repeated root expression", async () => {
		const handleChange = vi.fn();
		const { getByText, container } = render(OdeResponseInput, {
			props: {
				onChange: handleChange,
			},
		});

		const criticallyDampedBtn = getByText("Critically Damped (Repeated)");
		await fireEvent.click(criticallyDampedBtn);
		expect(criticallyDampedBtn.classList.contains("active")).toBe(true);

		const c1Input = container.querySelector(
			"#c1-cd-input",
		) as HTMLInputElement;
		const c2Input = container.querySelector(
			"#c2-cd-input",
		) as HTMLInputElement;
		const rInput = container.querySelector(
			"#r-root-input",
		) as HTMLInputElement;

		await fireEvent.input(c1Input, { target: { value: "2" } });
		await fireEvent.input(c2Input, { target: { value: "5" } });
		await fireEvent.input(rInput, { target: { value: "-4" } });

		expect(handleChange).toHaveBeenCalled();
		const lastCall = handleChange.mock.calls.at(-1)?.[0];
		expect(lastCall).toContain("2e^{-4t}");
		expect(lastCall).toContain("5t e^{-4t}");
	});

	it("switches to underdamped mode and synthesizes complex conjugate trig expression", async () => {
		const handleChange = vi.fn();
		const { getByText, container } = render(OdeResponseInput, {
			props: {
				onChange: handleChange,
			},
		});

		const underdampedBtn = getByText("Underdamped (Complex)");
		await fireEvent.click(underdampedBtn);
		expect(underdampedBtn.classList.contains("active")).toBe(true);

		const sigmaInput = container.querySelector(
			"#sigma-input",
		) as HTMLInputElement;
		const omegadInput = container.querySelector(
			"#omegad-input",
		) as HTMLInputElement;
		const c1Input = container.querySelector(
			"#c1-ud-input",
		) as HTMLInputElement;
		const c2Input = container.querySelector(
			"#c2-ud-input",
		) as HTMLInputElement;

		await fireEvent.input(sigmaInput, { target: { value: "-2" } });
		await fireEvent.input(omegadInput, { target: { value: "5" } });
		await fireEvent.input(c1Input, { target: { value: "3" } });
		await fireEvent.input(c2Input, { target: { value: "4" } });

		expect(handleChange).toHaveBeenCalled();
		const lastCall = handleChange.mock.calls.at(-1)?.[0];
		expect(lastCall).toContain("e^{-2t}");
		expect(lastCall).toContain("\\cos(5t)");
		expect(lastCall).toContain("\\sin(5t)");
	});

	it("switches to first order mode and synthesizes single exponential response", async () => {
		const handleChange = vi.fn();
		const { container } = render(OdeResponseInput, {
			props: {
				r1: "-5",
				onChange: handleChange,
			},
		});

		const modeButtons = container.querySelectorAll("button.mode-btn");
		const firstOrderBtn = modeButtons[3];
		if (firstOrderBtn) {
			await fireEvent.click(firstOrderBtn);
		}

		const c1Input = container.querySelector(
			"#c1-fo-input",
		) as HTMLInputElement;
		const r1Input = container.querySelector(
			"#r1-fo-input",
		) as HTMLInputElement;

		await fireEvent.input(c1Input, { target: { value: "7" } });
		await fireEvent.input(r1Input, { target: { value: "-3" } });

		expect(handleChange).toHaveBeenCalled();
		const lastCall = handleChange.mock.calls.at(-1)?.[0];
		expect(lastCall).toContain("7e^{-3t}");
	});

	it("formats particular solution offset and step multiplier toggle correctly", async () => {
		const handleChange = vi.fn();
		const { container } = render(OdeResponseInput, {
			props: {
				r1: "-1",
				r2: "-2",
				onChange: handleChange,
			},
		});

		const ypInput = container.querySelector(
			"#yp-input",
		) as HTMLInputElement;
		await fireEvent.input(ypInput, { target: { value: "10" } });

		let lastCall = handleChange.mock.calls.at(-1)?.[0];
		expect(lastCall).toContain("+ 10");
		expect(lastCall).toContain("u(t)");

		// Uncheck step function multiplier
		const stepCheckbox = container.querySelector(
			"#step-chk",
		) as HTMLInputElement;
		await fireEvent.click(stepCheckbox);

		lastCall = handleChange.mock.calls.at(-1)?.[0];
		expect(lastCall).not.toContain("u(t)");
	});

	it("handles negative coefficients and zero coefficients cleanly in synthesis", async () => {
		const handleChange = vi.fn();
		const { container } = render(OdeResponseInput, {
			props: {
				r1: "-1",
				r2: "-2",
				onChange: handleChange,
			},
		});

		const c1Input = container.querySelector(
			"#c1-input",
		) as HTMLInputElement;
		const c2Input = container.querySelector(
			"#c2-input",
		) as HTMLInputElement;

		// Negative coefficients
		await fireEvent.input(c1Input, { target: { value: "-1" } });
		await fireEvent.input(c2Input, { target: { value: "-5" } });

		let lastCall = handleChange.mock.calls.at(-1)?.[0];
		expect(lastCall).toContain("- e^{-1t}");
		expect(lastCall).toContain("- 5e^{-2t}");

		// Zero coefficients (empty terms fallback to 0)
		await fireEvent.input(c1Input, { target: { value: "0" } });
		await fireEvent.input(c2Input, { target: { value: "0" } });

		lastCall = handleChange.mock.calls.at(-1)?.[0];
		expect(lastCall).toContain("0 u(t)");
	});
});
