import { expect, it } from "vitest";
import type { SolverVisualStateDescriptor } from "$lib/components/solvers/base-step-solver.svelte";
import {
	getAutomatedHintSourceIds,
	isFinalHintState,
} from "$lib/testing/solver-visual-states";

/** Legacy final hints and explicit third tiers must share one quick-profile selection rule. */
it("selects final guidance without selecting partial hints or feedback", () => {
	const base: SolverVisualStateDescriptor = {
		id: "legacy-all",
		label: "Hints",
		step: 1,
		kind: "hint",
	};
	const states = [
		base,
		{ ...base, id: "tier-1", hintTier: 1 },
		{ ...base, id: "tier-2", hintTier: 2 },
		{ ...base, id: "tier-3", hintTier: 3 },
		{ ...base, id: "feedback", kind: "diagnostic" as const },
	];
	expect(states.filter(isFinalHintState).map((state) => state.id)).toEqual([
		"legacy-all",
		"tier-3",
	]);
});

/** Named final guidance covers its task even when it does not use the automatic filename suffix. */
it("does not duplicate untiered named final hints", () => {
	const input: SolverVisualStateDescriptor = {
		id: "input",
		label: "Input",
		step: 2,
		subStep: "a",
		kind: "interactive",
	};
	expect(
		getAutomatedHintSourceIds([
			input,
			{ ...input, id: "custom-guidance", kind: "hint" },
		]),
	).toEqual(new Set());
	expect(
		getAutomatedHintSourceIds([
			input,
			{ ...input, id: "partial", kind: "hint", hintTier: 1 },
		]),
	).toEqual(new Set(["input"]));
});

/** Coverage in one branch or subpart cannot suppress guidance for another. */
it("keeps dynamic branches and legacy parts independent", () => {
	const a: SolverVisualStateDescriptor = {
		id: "a",
		label: "A",
		step: 2,
		kind: "interactive",
		taskId: "coefficient",
		branchId: "cover-up",
		phase: "initial",
	};
	const b = { ...a, id: "b", branchId: "matching" };
	const hint = { ...a, id: "named-hint", kind: "hint" as const, hintTier: 3 };
	expect(getAutomatedHintSourceIds([a, b, hint])).toEqual(new Set(["b"]));
	const first: SolverVisualStateDescriptor = {
		id: "part-a",
		label: "A",
		step: 2,
		subStep: "a",
		kind: "interactive",
	};
	const second = { ...first, id: "part-b", subStep: "b" };
	expect(
		getAutomatedHintSourceIds([
			first,
			second,
			{ ...first, id: "different-name", kind: "hint" },
		]),
	).toEqual(new Set(["part-b"]));
});
