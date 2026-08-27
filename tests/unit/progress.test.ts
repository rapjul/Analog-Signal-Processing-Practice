import { describe, expect, it } from "vitest";

/**
 * Helper to compute step indices and statuses mirroring Progress.svelte logic.
 *
 * @param {number} currentStep Active 1-based step index
 * @param {number} totalSteps Total number of steps
 * @returns Array of step info objects
 */
function computeStepProgression(currentStep: number, totalSteps: number) {
	const count = Math.max(1, totalSteps);
	return Array.from({ length: count }, (_, i) => {
		const stepNum = i + 1;
		const isCompleted = stepNum < currentStep;
		const isActive = stepNum === currentStep;
		const isUpcoming = stepNum > currentStep;
		const symbol = isCompleted ? "✓" : String(stepNum);
		const ariaLabel = `Step ${stepNum}${isActive ? " (Active)" : isCompleted ? " (Completed)" : " (Upcoming)"}`;
		return {
			stepNum,
			isCompleted,
			isActive,
			isUpcoming,
			symbol,
			ariaLabel,
		};
	});
}

describe("Shared Progress Component Logic", () => {
	it("generates correct initial step states at Step 1", () => {
		const steps = computeStepProgression(1, 6);
		expect(steps.length).toBe(6);

		// Step 1: Active
		expect(steps[0]!.isActive).toBe(true);
		expect(steps[0]!.isCompleted).toBe(false);
		expect(steps[0]!.symbol).toBe("1");
		expect(steps[0]!.ariaLabel).toBe("Step 1 (Active)");

		// Steps 2-6: Upcoming
		for (let i = 1; i < 6; i++) {
			expect(steps[i]!.isActive).toBe(false);
			expect(steps[i]!.isCompleted).toBe(false);
			expect(steps[i]!.isUpcoming).toBe(true);
			expect(steps[i]!.symbol).toBe(String(i + 1));
			expect(steps[i]!.ariaLabel).toBe(`Step ${i + 1} (Upcoming)`);
		}
	});

	it("marks completed steps with checkmark and active step correctly", () => {
		const steps = computeStepProgression(4, 7);
		expect(steps.length).toBe(7);

		// Steps 1-3: Completed with checkmarks
		for (let i = 0; i < 3; i++) {
			expect(steps[i]!.isCompleted).toBe(true);
			expect(steps[i]!.isActive).toBe(false);
			expect(steps[i]!.symbol).toBe("✓");
			expect(steps[i]!.ariaLabel).toBe(`Step ${i + 1} (Completed)`);
		}

		// Step 4: Active
		expect(steps[3]!.isActive).toBe(true);
		expect(steps[3]!.isCompleted).toBe(false);
		expect(steps[3]!.symbol).toBe("4");
		expect(steps[3]!.ariaLabel).toBe("Step 4 (Active)");

		// Steps 5-7: Upcoming
		for (let i = 4; i < 7; i++) {
			expect(steps[i]!.isUpcoming).toBe(true);
			expect(steps[i]!.symbol).toBe(String(i + 1));
			expect(steps[i]!.ariaLabel).toBe(`Step ${i + 1} (Upcoming)`);
		}
	});

	it("marks all steps as completed when currentStep exceeds totalSteps", () => {
		const steps = computeStepProgression(8, 7);
		expect(steps.length).toBe(7);
		for (let i = 0; i < 7; i++) {
			expect(steps[i]!.isCompleted).toBe(true);
			expect(steps[i]!.isActive).toBe(false);
			expect(steps[i]!.symbol).toBe("✓");
			expect(steps[i]!.ariaLabel).toBe(`Step ${i + 1} (Completed)`);
		}
	});

	it("gracefully handles boundary totalSteps = 0 or negative", () => {
		const steps = computeStepProgression(1, 0);
		expect(steps.length).toBe(1);
		expect(steps[0]!.isActive).toBe(true);
	});
});
