import type { SolverVisualStateDescriptor } from "$lib/components/solvers/base-step-solver.svelte";

/** @param state - Catalog entry. @returns Whether hint-only profiles include this explicit final tier or legacy all-hints state. */
export function isFinalHintState(state: SolverVisualStateDescriptor): boolean {
	return (
		state.kind === "hint" &&
		(state.hintTier === undefined || state.hintTier === 3)
	);
}

/** @param state - Catalog entry. @returns One identity per dynamic task or legacy parent/substep, scoped to its accepted branch. */
function taskKey(state: SolverVisualStateDescriptor): string {
	return `${state.branchId ?? ""}:${state.taskId ?? `${state.step}:${state.subStep ?? "parent"}`}`;
}

/** @param states - Advertised catalog. @returns One all-hints expansion per otherwise uncovered task, regardless of explicit hint naming. */
export function getAutomatedHintSourceIds(
	states: SolverVisualStateDescriptor[],
): Set<string> {
	const representatives = new Map<string, SolverVisualStateDescriptor>();
	for (const state of states) {
		if (state.kind === "hint" || (state.phase && state.phase !== "initial"))
			continue;
		const key = taskKey(state),
			current = representatives.get(key);
		if (
			!current ||
			(current.kind !== "interactive" && state.kind === "interactive")
		)
			representatives.set(key, state);
	}
	const catalogIds = new Set(states.map((state) => state.id));
	return new Set(
		[...representatives.values()]
			.filter(
				(state) =>
					!catalogIds.has(`${state.id}.hints`) &&
					!states.some(
						(candidate) =>
							taskKey(candidate) === taskKey(state) &&
							isFinalHintState(candidate),
					),
			)
			.map((state) => state.id),
	);
}
