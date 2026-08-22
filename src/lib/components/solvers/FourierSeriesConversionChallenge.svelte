<script lang="ts">
	import type {
		FourierSeriesConversionChallenge,
		FourierSeriesItsOption,
	} from "$lib/math-engine/fourier-series/index";
	import MathBlock from "../math/MathBlock.svelte";
	import MathText from "../math/MathText.svelte";
	import {
		type BaseSubStepState,
		createMultiPartStepState,
		createSubStepState,
		type MultiPartStepState,
	} from "./base-step-solver.svelte";

	interface Props {
		challenge: FourierSeriesConversionChallenge;
		onComplete?: () => void;
	}

	let { challenge, onComplete }: Props = $props();

	type ConversionId = "alternate" | "compact";
	type ConversionState = MultiPartStepState<ConversionId> & {
		completed: boolean;
		subSteps: Record<
			ConversionId,
			BaseSubStepState & { selected: string | null }
		>;
	};

	function createChallengeState(): ConversionState {
		const order: ConversionId[] = challenge.parts.map(({ id }) => id);
		const subSteps = Object.fromEntries(
			challenge.parts.map((part) => [
				part.id,
				createSubStepState(
					part.id,
					part.title,
					{ selected: null as string | null },
					part.hints,
				),
			]),
		) as ConversionState["subSteps"];
		return createMultiPartStepState(
			{ completed: false },
			order,
			subSteps,
			order[0],
		) as ConversionState;
	}

	let challengeState: ConversionState = $state(createChallengeState());
	let problemKey = $state("");
	$effect(() => {
		const nextKey = challenge.parts
			.map(({ resultLatex }) => resultLatex)
			.join("|");
		if (nextKey !== problemKey) {
			problemKey = nextKey;
			challengeState = createChallengeState();
		}
	});

	let activePart = $derived(
		challenge.parts.find(({ id }) => id === challengeState.activeSubStepId),
	);
	let activeState = $derived(
		challengeState.subSteps[challengeState.activeSubStepId],
	);
	let progress = $derived(
		`Part ${challengeState.subStepOrder.indexOf(challengeState.activeSubStepId) + 1} of ${challengeState.subStepOrder.length}`,
	);

	function checkOption(option: FourierSeriesItsOption) {
		activeState.selected = option.id;
		if (!option.isCorrect) {
			activeState.feedbackType = "misconception";
			activeState.feedback =
				option.feedback ??
				"Recheck the coefficient conversion identities.";
			return;
		}

		activeState.isValid = true;
		activeState.feedback = null;
		activeState.feedbackType = null;
		const index = challengeState.subStepOrder.indexOf(
			challengeState.activeSubStepId,
		);
		const nextId = challengeState.subStepOrder[index + 1];
		if (nextId) {
			challengeState.activeSubStepId = nextId;
			return;
		}
		challengeState.completed = true;
		challengeState.isValid = true;
		onComplete?.();
	}

	function revealHint() {
		const hintCount = activeState.hints?.length ?? 0;
		if (activeState.hintTier < hintCount) activeState.hintTier += 1;
	}
</script>

<details class="conversion-challenge">
	<summary>
		<span>Optional Step 8: Convert to the Other Fourier Forms</span>
		<span class="optional-badge">Optional</span>
	</summary>
	<div class="challenge-body">
		{#if challengeState.completed}
			<div
				class="challenge-complete"
				role="status"
			>
				✓ Optional conversions completed. Both worked conversions are
				now available in the solution breakdown.
			</div>
		{:else if activePart}
			<div class="part-heading">
				<strong>{activePart.title}</strong>
				<span>{progress}</span>
			</div>
			<p><MathText text={activePart.prompt} /></p>
			<div
				class="conversion-options"
				data-testid="fourier-conversion-options"
			>
				{#each activePart.options as option}
					<button
						type="button"
						onclick={() => checkOption(option)}
					>
						<MathBlock
							math={option.latex}
							compact={true}
							hideHeader={true}
						/>
					</button>
				{/each}
			</div>
			{#if activeState.feedback}
				<div
					class="conversion-feedback"
					role="alert"
				>
					<MathText text={activeState.feedback} />
				</div>
			{/if}
			<button
				type="button"
				class="hint-button"
				onclick={revealHint}
				disabled={activeState.hintTier >=
					(activeState.hints?.length ?? 0)}
			>
				Get Hint
			</button>
			{#if activeState.hintTier > 0}
				<div class="conversion-hints">
					{#each (activeState.hints ?? []).slice(0, activeState.hintTier) as hint}
						<p><MathText text={hint} /></p>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</details>

<style>
	.conversion-challenge {
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: var(--bg-secondary);
		overflow: hidden;
	}

	summary,
	.part-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	summary {
		padding: 1rem 1.25rem;
		cursor: pointer;
		font-weight: 700;
		color: var(--text-primary);
	}

	.optional-badge {
		font-size: var(--text-xs);
		color: var(--accent-primary);
	}

	.challenge-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border-top: 1px solid var(--border-color);
	}

	.challenge-body p {
		margin: 0;
		color: var(--text-secondary);
	}

	.part-heading span {
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}

	.conversion-options {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.conversion-options button {
		min-width: 0;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-card);
		color: var(--text-primary);
		cursor: pointer;
	}

	.conversion-options button:hover,
	.conversion-options button:focus-visible {
		border-color: var(--accent-primary);
	}

	.conversion-feedback,
	.challenge-complete,
	.conversion-hints {
		padding: 0.75rem;
		border-radius: var(--radius-sm);
		background: var(--accent-bg-subtle);
		color: var(--text-secondary);
	}

	.hint-button {
		align-self: flex-start;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.45rem 0.75rem;
		background: var(--bg-card);
		color: var(--text-primary);
		cursor: pointer;
	}

	@container (max-width: 700px) {
		.conversion-options {
			grid-template-columns: 1fr;
		}
	}
</style>
