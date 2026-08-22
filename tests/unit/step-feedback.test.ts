import { describe, expect, it, vi } from "vitest";
import {
	BaseStepSolverState,
	type BaseStepState,
	createStepState,
	FEEDBACK_META,
} from "$lib/components/solvers/base-step-solver.svelte";

/**
 * Concrete test implementation of BaseStepSolverState for unit testing.
 */
class TestStepSolverState extends BaseStepSolverState {
	step1 = createStepState({ value: "" });
	readonly activeHints = ["Test hint"];
	step2 = createStepState({ selected: null as string | null });

	get currentStepState(): BaseStepState | undefined {
		switch (this.currentStep) {
			case 1:
				return this.step1;
			case 2:
				return this.step2;
			default:
				return undefined;
		}
	}

	constructor(onComplete?: () => void) {
		super(2, () => onComplete);
	}

	reset(): void {
		this.currentStep = 1;
		this.isCompleted = false;
		this.hintTier = 0;
		this.step1 = createStepState({ value: "" });
		this.step2 = createStepState({ selected: null as string | null });
	}
}

describe("BaseStepSolverState and Feedback Metadata", () => {
	it("exposes correct FEEDBACK_META definitions", () => {
		expect(FEEDBACK_META.validation).toEqual({
			title: "Input Required:",
			icon: "ℹ️",
			className: "feedback-validation",
		});
		expect(FEEDBACK_META.misconception).toEqual({
			title: "Misconception Detected:",
			icon: "⚠️",
			className: "feedback-misconception",
		});
		expect(FEEDBACK_META.incorrect).toEqual({
			title: "Incorrect:",
			icon: "❌",
			className: "feedback-incorrect",
		});
	});

	it("initializes with empty feedback and derives feedback properties from currentStepState", () => {
		const solver = new TestStepSolverState();
		expect(solver.currentStep).toBe(1);
		expect(solver.currentFeedback).toBe("");
		expect(solver.currentFeedbackType).toBeNull();
		expect(solver.currentFeedbackTitle).toBe("Feedback:");
		expect(solver.currentFeedbackIcon).toBe("ℹ️");
	});

	it("updates derived feedback properties when setValidation is called", () => {
		const solver = new TestStepSolverState();
		solver.setValidation(solver.step1, "Please provide an input.");

		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("validation");
		expect(solver.step1.feedback).toBe("Please provide an input.");

		expect(solver.currentFeedback).toBe("Please provide an input.");
		expect(solver.currentFeedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.currentFeedbackIcon).toBe("ℹ️");
	});

	it("updates derived feedback properties when setMisconception is called", () => {
		const solver = new TestStepSolverState();
		solver.setMisconception(solver.step1, "Common mistake in equation.");

		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("misconception");
		expect(solver.step1.feedback).toBe("Common mistake in equation.");

		expect(solver.currentFeedback).toBe("Common mistake in equation.");
		expect(solver.currentFeedbackType).toBe("misconception");
		expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
		expect(solver.currentFeedbackIcon).toBe("⚠️");
	});

	it("updates derived feedback properties when setIncorrect is called", () => {
		const solver = new TestStepSolverState();
		solver.setIncorrect(solver.step1, "Calculation is wrong.");

		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("incorrect");
		expect(solver.step1.feedback).toBe("Calculation is wrong.");

		expect(solver.currentFeedback).toBe("Calculation is wrong.");
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.currentFeedbackIcon).toBe("❌");
	});

	it("advances step and clears feedback when setPassed is called", () => {
		const solver = new TestStepSolverState();
		solver.setValidation(solver.step1, "Error message");
		expect(solver.currentFeedback).toBe("Error message");

		solver.setPassed(solver.step1, 2);
		expect(solver.step1.isValid).toBe(true);
		expect(solver.step1.feedback).toBeNull();
		expect(solver.step1.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(2);
		expect(solver.currentFeedback).toBe("");
	});

	it("handles checkChoiceStep correctly for empty, misconception, and correct choices", () => {
		const solver = new TestStepSolverState();
		solver.currentStep = 2;

		const misconceptions: Record<string, string> = {
			wrong_option: "Misconception explanation for wrong_option.",
		};

		// 1. Empty choice
		solver.checkChoiceStep(
			solver.step2,
			null,
			"correct_option",
			misconceptions,
			"Generic incorrect",
			"Please make a selection.",
			3,
		);
		expect(solver.step2.isValid).toBe(false);
		expect(solver.currentFeedbackType).toBe("validation");
		expect(solver.currentFeedback).toBe("Please make a selection.");

		// 2. Misconception choice
		solver.checkChoiceStep(
			solver.step2,
			"wrong_option",
			"correct_option",
			misconceptions,
			"Generic incorrect",
			"Please make a selection.",
			3,
		);
		expect(solver.step2.isValid).toBe(false);
		expect(solver.currentFeedbackType).toBe("misconception");
		expect(solver.currentFeedback).toBe(
			"Misconception explanation for wrong_option.",
		);

		// 3. Fallback incorrect choice
		solver.checkChoiceStep(
			solver.step2,
			"unlisted_wrong",
			"correct_option",
			misconceptions,
			"Generic incorrect fallback.",
			"Please make a selection.",
			3,
		);
		expect(solver.step2.isValid).toBe(false);
		expect(solver.currentFeedbackType).toBe("misconception");
		expect(solver.currentFeedback).toBe("Generic incorrect fallback.");

		// 4. Correct choice
		solver.checkChoiceStep(
			solver.step2,
			"correct_option",
			"correct_option",
			misconceptions,
			"Generic incorrect",
			"Please make a selection.",
			3,
		);
		expect(solver.step2.isValid).toBe(true);
		expect(solver.currentStep).toBe(3);
		expect(solver.step2.feedback).toBeNull();
	});

	it("handles checkOptionCardStep correctly for empty, misconception, and correct cards", () => {
		const solver = new TestStepSolverState();
		solver.currentStep = 2;

		// 1. Null option
		solver.checkOptionCardStep(
			solver.step2,
			null,
			"Fallback error",
			"Select a card.",
			3,
		);
		expect(solver.step2.isValid).toBe(false);
		expect(solver.currentFeedbackType).toBe("validation");
		expect(solver.currentFeedback).toBe("Select a card.");

		// 2. Incorrect option card with custom feedback
		solver.checkOptionCardStep(
			solver.step2,
			{ id: "opt_b", isCorrect: false, feedback: "Card B is wrong." },
			"Fallback error",
			"Select a card.",
			3,
		);
		expect(solver.step2.isValid).toBe(false);
		expect(solver.currentFeedbackType).toBe("misconception");
		expect(solver.currentFeedback).toBe("Card B is wrong.");

		// 3. Correct option card
		solver.checkOptionCardStep(
			solver.step2,
			{ id: "opt_a", isCorrect: true },
			"Fallback error",
			"Select a card.",
			3,
		);
		expect(solver.step2.isValid).toBe(true);
		expect(solver.currentStep).toBe(3);
		expect(solver.step2.feedback).toBeNull();
	});

	it("triggers completion callback when completing final step", () => {
		const onComplete = vi.fn();
		const solver = new TestStepSolverState(onComplete);

		solver.advanceToStep(3);
		expect(solver.isCompleted).toBe(true);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});
});
