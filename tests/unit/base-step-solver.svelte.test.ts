// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BaseStepSolverState,
	createMultiPartStepState,
	createStepState,
	createSubStepState,
	type MultiPartStepState,
	type SolverVisualStateDescriptor,
} from "../../src/lib/components/solvers/base-step-solver.svelte";

/**
 * Concrete test implementation of BaseStepSolverState for unit testing.
 */
class TestSolverState extends BaseStepSolverState {
	step1 = $state(
		createStepState({ value: "", selected: null as string | null }),
	);
	step2: MultiPartStepState<"partA" | "partB"> = $state(
		createMultiPartStepState<Record<string, unknown>, "partA" | "partB">(
			{},
			["partA", "partB"],
			{
				partA: createSubStepState("partA", "Part A", {}, [
					"Hint A1",
					"Hint A2",
				]),
				partB: createSubStepState("partB", "Part B", {}, [
					"Hint B1",
					"Hint B2",
				]),
			},
			"partA",
		),
	);

	constructor(getOnComplete?: () => (() => void) | undefined) {
		super(2, getOnComplete);
	}

	override get currentStepState() {
		if (this.currentStep === 1) return this.step1;
		if (this.currentStep === 2) return this.step2;
		return undefined;
	}

	override get activeHints(): string[] {
		if (this.currentStep === 1) return ["Step 1 hint 1", "Step 1 hint 2"];
		if (this.currentStep === 2) {
			const sub = this.step2.subSteps[this.step2.activeSubStepId];
			return sub?.hints ?? [];
		}
		return [];
	}

	override devAutoFillStep(stepIndex?: number): void {
		const target = stepIndex ?? this.currentStep;
		if (target === 1) {
			this.step1.value = "valid";
			this.setPassed(this.step1, 2);
		} else if (target === 2) {
			if (this.step2.activeSubStepId === "partA") {
				this.setSubStepPassed(this.step2, "partA", "partB");
			}
			this.setSubStepPassed(this.step2, "partB", undefined, 3);
		}
	}

	override devGetVisualStates(): SolverVisualStateDescriptor[] {
		return [
			{
				id: "test.step-01",
				label: "Step 1",
				step: 1,
				kind: "interactive",
			},
			{
				id: "test.step-02.partA",
				label: "Step 2 Part A",
				step: 2,
				subStep: "partA",
				kind: "interactive",
			},
		];
	}

	override devGoToVisualState(stateId: string): boolean {
		if (stateId === "test.step-01") {
			this.advanceToStep(1);
			return true;
		}
		if (stateId === "test.step-02.partA") {
			this.advanceToStep(2);
			this.step2.activeSubStepId = "partA";
			return true;
		}
		return false;
	}

	override reset(): void {
		this.step1 = createStepState({ value: "", selected: null });
		this.step2 = createMultiPartStepState<
			Record<string, unknown>,
			"partA" | "partB"
		>(
			{},
			["partA", "partB"],
			{
				partA: createSubStepState("partA", "Part A", {}, [
					"Hint A1",
					"Hint A2",
				]),
				partB: createSubStepState("partB", "Part B", {}, [
					"Hint B1",
					"Hint B2",
				]),
			},
			"partA",
		);
		this.advanceToStep(1);
		this.isCompleted = false;
	}
}

describe("BaseStepSolverState Harness & State Management", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		delete (window as unknown as { __signalLabDev?: unknown })
			.__signalLabDev;
	});

	/**
	 * Verifies initialization and basic step progression.
	 */
	it("initializes properly and tracks active step state", () => {
		const solver = new TestSolverState();
		expect(solver.currentStep).toBe(1);
		expect(solver.totalSteps).toBe(2);
		expect(solver.isCompleted).toBe(false);
		expect(solver.currentStepState).toBe(solver.step1);
		expect(solver.activeHints.length).toBe(2);
	});

	/**
	 * Verifies hint progression and sub-step hint tier clamping.
	 */
	it("advances and clamps hint tiers for steps and sub-steps", () => {
		const solver = new TestSolverState();
		expect(solver.hintTier).toBe(0);
		solver.revealNextHint();
		expect(solver.hintTier).toBe(1);
		solver.revealNextHint();
		expect(solver.hintTier).toBe(2);
		solver.revealNextHint();
		expect(solver.hintTier).toBe(2);

		solver.advanceToStep(2);
		expect(solver.hintTier).toBe(0);
		solver.revealSubStepHint(solver.step2, "partA", 2);
		expect(solver.step2.subSteps.partA.hintTier).toBe(1);
		solver.revealSubStepHint(solver.step2, "partA", 2);
		expect(solver.step2.subSteps.partA.hintTier).toBe(2);
		solver.revealSubStepHint(solver.step2, "partA", 2);
		expect(solver.step2.subSteps.partA.hintTier).toBe(2);
	});

	/**
	 * Verifies diagnostic feedback and misconception setters on steps and sub-steps.
	 */
	it("sets, overrides, and clears diagnostic feedback on steps and sub-steps", () => {
		const solver = new TestSolverState();
		solver.setValidation(solver.step1, "Enter a valid value.");
		expect(solver.currentFeedback).toBe("Enter a valid value.");
		expect(solver.currentFeedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.currentFeedbackIcon).toBe("ℹ️");

		solver.setIncorrect(solver.step1, "Value is incorrect.");
		expect(solver.currentFeedback).toBe("Value is incorrect.");
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.currentFeedbackIcon).toBe("❌");

		solver.setMisconception(solver.step1, "Common mistake diagnosed.");
		expect(solver.currentFeedback).toBe("Common mistake diagnosed.");
		expect(solver.currentFeedbackType).toBe("misconception");
		expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
		expect(solver.currentFeedbackIcon).toBe("⚠️");

		solver.clearFeedback();
		expect(solver.currentFeedback).toBe("");
		expect(solver.currentFeedbackType).toBeNull();
		expect(solver.currentFeedbackTitle).toBe("Feedback:");
		expect(solver.currentFeedbackIcon).toBe("ℹ️");

		solver.advanceToStep(2);
		solver.setSubStepValidation(solver.step2, "partA", "Part A required.");
		expect(solver.step2.subSteps.partA.feedback).toBe("Part A required.");
		expect(solver.step2.subSteps.partA.feedbackType).toBe("validation");

		solver.setSubStepIncorrect(solver.step2, "partA", "Part A wrong.");
		expect(solver.step2.subSteps.partA.feedback).toBe("Part A wrong.");
		expect(solver.step2.subSteps.partA.feedbackType).toBe("incorrect");

		solver.setSubStepMisconception(
			solver.step2,
			"partA",
			"Part A misconception.",
		);
		expect(solver.step2.subSteps.partA.feedback).toBe(
			"Part A misconception.",
		);
		expect(solver.step2.subSteps.partA.feedbackType).toBe("misconception");

		solver.clearSubStepFeedback(solver.step2, "partA");
		expect(solver.step2.subSteps.partA.feedback).toBeNull();
		expect(solver.step2.subSteps.partA.feedbackType).toBeNull();
	});

	/**
	 * Verifies multi-part sub-step progression through setSubStepPassed and getSubStepProgress.
	 */
	it("handles multi-part sub-step completion and parent step transitions", () => {
		const solver = new TestSolverState();
		solver.advanceToStep(2);
		expect(solver.step2.activeSubStepId).toBe("partA");

		const progA = solver.getSubStepProgress(solver.step2);
		expect(progA.current).toBe(1);
		expect(progA.total).toBe(2);
		expect(progA.label).toBe("Part 1 of 2");

		solver.setSubStepPassed(solver.step2, "partA", "partB");
		expect(solver.step2.subSteps.partA.isValid).toBe(true);
		expect(solver.step2.activeSubStepId).toBe("partB");

		const progB = solver.getSubStepProgress(solver.step2);
		expect(progB.current).toBe(2);

		solver.setSubStepPassed(solver.step2, "partB", undefined, 3);
		expect(solver.step2.subSteps.partB.isValid).toBe(true);
		expect(solver.isCompleted).toBe(true);
	});

	/**
	 * Verifies checkChoiceStep and checkOptionCardStep helper methods.
	 */
	it("validates choice step and option card step workflows", () => {
		const solver = new TestSolverState();

		// checkChoiceStep with empty selection
		solver.checkChoiceStep(
			solver.step1,
			null,
			"opt1",
			{},
			"Fallback error",
		);
		expect(solver.currentFeedbackType).toBe("validation");

		// checkChoiceStep with misconception selection
		solver.checkChoiceStep(
			solver.step1,
			"opt2",
			"opt1",
			{ opt2: "Specific misconception explanation" },
			"Fallback error",
		);
		expect(solver.currentFeedbackType).toBe("misconception");
		expect(solver.currentFeedback).toBe(
			"Specific misconception explanation",
		);

		// checkChoiceStep with correct selection
		solver.checkChoiceStep(
			solver.step1,
			"opt1",
			"opt1",
			{},
			"Fallback error",
			undefined,
			2,
		);
		expect(solver.step1.isValid).toBe(true);
		expect(solver.currentStep).toBe(2);

		// checkOptionCardStep
		solver.advanceToStep(1);
		solver.step1.isValid = false;
		solver.checkOptionCardStep(solver.step1, null, "Select an option.");
		expect(solver.currentFeedbackType).toBe("validation");

		solver.checkOptionCardStep(
			solver.step1,
			{ id: "wrong", isCorrect: false, feedback: "Card error" },
			"Fallback card error",
		);
		expect(solver.currentFeedbackType).toBe("misconception");
		expect(solver.currentFeedback).toBe("Card error");

		solver.checkOptionCardStep(
			solver.step1,
			{ id: "correct", isCorrect: true },
			"Fallback card error",
			undefined,
			2,
		);
		expect(solver.step1.isValid).toBe(true);
		expect(solver.currentStep).toBe(2);
	});

	/**
	 * Verifies developer test harness registration and helper functions.
	 */
	it("registers window developer harness and runs automated solve and hints", () => {
		const onCompleteMock = vi.fn();
		const solver = new TestSolverState(() => onCompleteMock);
		solver.registerDevHarness();

		expect(window.__signalLabDev).toBeDefined();
		expect(window.__signalLabDev?.activeSolver).toBe(solver);

		solver.devRevealAllHints();
		expect(solver.hintTier).toBe(2);

		solver.devSimulateMisconception("Custom misconception");
		expect(solver.currentFeedback).toBe("Custom misconception");
		expect(solver.currentFeedbackType).toBe("misconception");

		const visualStates = solver.devGetVisualStates();
		expect(visualStates.length).toBe(2);
		expect(solver.devGoToVisualState("test.step-02.partA")).toBe(true);
		expect(solver.currentStep).toBe(2);
		expect(solver.devGoToVisualState("invalid.state")).toBe(false);

		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.isCompleted).toBe(false);

		solver.devSolveAll();
		expect(solver.isCompleted).toBe(true);
		expect(onCompleteMock).toHaveBeenCalled();
	});

	/**
	 * Verifies feedback title, icon, and hints fallbacks.
	 */
	it("handles fallback feedback properties and empty hint arrays safely", () => {
		const solver = new TestSolverState();
		solver.step1.feedbackType = "unknown" as unknown as "validation";
		expect(solver.currentFeedbackTitle).toBe("Feedback:");
		expect(solver.currentFeedbackIcon).toBe("ℹ️");

		solver.advanceToStep(99);
		expect(solver.currentStepState).toBeUndefined();
		expect(solver.activeHints).toEqual([]);
		solver.devRevealAllHints();
		expect(solver.hintTier).toBe(0);

		solver.devSimulateMisconception();
		expect(solver.currentFeedback).toBe("");
	});
});
