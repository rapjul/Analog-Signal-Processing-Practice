import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import LaplacePracticeCard from "$lib/components/ui/LaplacePracticeCard.svelte";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";

describe("Laplace practice assistance and completion", () => {
	afterEach(() => cleanup());
	it("records hints as assistance while leaving every task unverified", async () => {
		const view = render(LaplacePracticeCard, {
			problem: generateLaplaceExercise("inverse", 73),
			onNextProblem: () => {},
		});
		await fireEvent.click(view.getByRole("button", { name: "Show Hint" }));
		expect(view.container.querySelector(".step-card.completed")).toBeNull();
		expect(view.container.querySelector(".completion-banner")).toBeNull();
		await act(() => window.__signalLabDev!.solveAll());
		expect(
			view.container.querySelector(".completion-banner")?.textContent,
		).toContain("Assistance");
		await fireEvent.click(
			view.getByRole("button", { name: "Restart this problem" }),
		);
		expect(view.container.querySelector(".completion-banner")).toBeNull();
		expect(view.container.querySelector(".step-card.completed")).toBeNull();
		await act(() => window.__signalLabDev!.solveAll());
		expect(
			view.container.querySelector(".completion-banner")?.textContent,
		).not.toContain("Assistance");
	});
	it("reveals assistance without completing and keeps diagrams gated", async () => {
		const view = render(LaplacePracticeCard, {
			problem: generateLaplaceExercise("inverse", 73),
			onNextProblem: () => {},
		});
		expect(view.container.querySelector(".solution-breakdown")).toBeNull();
		expect(
			view.container.querySelector(".laplace-visualizations"),
		).toBeNull();
		const details = view.container.querySelector("details")!;
		details.open = true;
		await fireEvent(details, new Event("toggle"));
		await waitFor(() =>
			expect(
				view.container.querySelector(".assistance-status"),
			).not.toBeNull(),
		);
		expect(view.container.querySelector(".completion-banner")).toBeNull();
		await act(() => window.__signalLabDev!.solveAll());
		expect(
			view.container.querySelector(".completion-banner")?.textContent,
		).toContain("Assistance");
		expect(
			view.container.querySelectorAll(".laplace-visualizations svg"),
		).toHaveLength(2);
	});
});
