import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FourierSeriesConversionChallenge from "$lib/components/solvers/FourierSeriesConversionChallenge.svelte";
import { FourierSeriesStepSolverState } from "$lib/components/solvers/fourier-series-step-solver.svelte";
import FourierSeriesStep1PeriodFreq from "$lib/components/solvers/fourier-series-steps/FourierSeriesStep1PeriodFreq.svelte";
import FourierSeriesStep6Evaluation from "$lib/components/solvers/fourier-series-steps/FourierSeriesStep6Evaluation.svelte";
import FourierSeriesStep7Series from "$lib/components/solvers/fourier-series-steps/FourierSeriesStep7Series.svelte";
import { generateFourierSeriesProblem } from "$lib/math-engine/fourier-series/index";

describe("Fourier Series review UI regressions", () => {
	/** Removes component instances after each interaction test. */
	afterEach(() => cleanup());

	/** Verifies that correcting a period with the displayed scientific expression clears feedback. */
	it("accepts the displayed scientific period after incorrect feedback", async () => {
		const problem = generateFourierSeriesProblem("square", {
			seed: 1,
			T0: 1e-7,
		});
		const solver = new FourierSeriesStepSolverState(() => problem);
		const view = render(FourierSeriesStep1PeriodFreq, { problem, solver });
		const period = view.container.querySelector<HTMLInputElement>(
			"#fourier-period-input",
		)!;
		const frequency = view.container.querySelector<HTMLInputElement>(
			"#fourier-freq-input",
		)!;
		await fireEvent.input(frequency, {
			target: { value: problem.itsData.step1.w0Aliases[0] },
		});
		await fireEvent.input(period, { target: { value: "0.01" } });
		await fireEvent.click(
			view.getByRole("button", { name: /Check Period/ }),
		);
		expect(
			view.container.querySelector(".feedback-alert")?.textContent,
		).toContain("Incorrect Period value");
		expect(solver.currentStep).toBe(1);
		const displayed = problem.periodLatex
			.split(" = ")[1]!
			.split("\\text")[0]!;
		await fireEvent.input(period, { target: { value: displayed } });
		await fireEvent.keyDown(period, { key: "Enter" });
		expect(solver.currentStep).toBe(2);
		expect(solver.step1.feedback).toBeNull();
		expect(view.container.querySelector(".feedback-alert")).toBeNull();
		expect(
			view.container
				.querySelector(".step-card")
				?.classList.contains("completed"),
		).toBe(true);
	});

	/** Confirms corrected zero-DC choices reject nonzero answers and permit completion. */
	it("grades zero DC through the UI, completes once, and resets", async () => {
		const problem = generateFourierSeriesProblem("triangle", {
			seed: 1,
			A: 3,
			T0: 4,
		});
		const onComplete = vi.fn();
		const solver = new FourierSeriesStepSolverState(
			() => problem,
			() => onComplete,
		);
		solver.advanceToStep(6);
		const evaluation = render(FourierSeriesStep6Evaluation, {
			problem,
			solver,
		});
		const synthesis = render(FourierSeriesStep7Series, { problem, solver });
		for (const part of problem.itsData.step6.parts) {
			for (const [index, option] of part.options.entries()) {
				if (option.isCorrect) continue;
				const buttons = evaluation
					.getByTestId("fourier-step6-options")
					.querySelectorAll("button");
				await fireEvent.click(buttons[index]!);
				expect(solver.currentStep).toBe(6);
				expect(solver.step6.feedbackType).toBe("misconception");
			}
			const index = part.options.findIndex((option) => option.isCorrect);
			await fireEvent.click(
				evaluation
					.getByTestId("fourier-step6-options")
					.querySelectorAll("button")[index]!,
			);
		}
		expect(solver.currentStep).toBe(7);
		const correctIndex = problem.itsData.step7.options.findIndex(
			(option) => option.isCorrect,
		);
		await fireEvent.click(
			synthesis.container.querySelectorAll(".mcq-card")[correctIndex]!,
		);
		expect(solver.isCompleted).toBe(true);
		expect(onComplete).toHaveBeenCalledTimes(1);
		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.step6.subSteps["evaluate-a0"]?.selected).toBeNull();
		expect(solver.isCompleted).toBe(false);
	});

	/** Exercises the formerly ambiguous even-kernel and zero-DC compact conversions. */
	it("grades corrected conversions and resets when a new challenge loads", async () => {
		const problem = generateFourierSeriesProblem("triangle", {
			seed: 1,
			A: 3,
		});
		const onComplete = vi.fn();
		const view = render(FourierSeriesConversionChallenge, {
			challenge: problem.conversionChallenge,
			onComplete,
		});
		for (const part of problem.conversionChallenge.parts) {
			const wrongId =
				part.id === "alternate" ? "series-kernel" : "series-scale";
			const wrongIndex = part.options.findIndex(
				(option) => option.id === wrongId,
			);
			await fireEvent.click(
				view
					.getByTestId("fourier-conversion-options")
					.querySelectorAll("button")[wrongIndex]!,
			);
			expect(
				view.container.querySelector(".conversion-feedback")
					?.textContent,
			).toMatch(/Error/);
			const correctIndex = part.options.findIndex(
				(option) => option.isCorrect,
			);
			await fireEvent.click(
				view
					.getByTestId("fourier-conversion-options")
					.querySelectorAll("button")[correctIndex]!,
			);
		}
		expect(onComplete).toHaveBeenCalledTimes(1);
		const next = generateFourierSeriesProblem("triangle", {
			seed: 2,
			A: 5,
		});
		await view.rerender({
			challenge: next.conversionChallenge,
			onComplete,
		});
		expect(view.getByText("Part 1 of 2")).toBeTruthy();
		expect(
			view
				.getByTestId("fourier-conversion-options")
				.querySelectorAll("button"),
		).toHaveLength(4);
		expect(view.container.querySelector(".conversion-feedback")).toBeNull();
	});
});
