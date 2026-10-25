<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import LaplaceConfiguration from "$lib/components/solvers/laplace-steps/LaplaceConfiguration.svelte";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import LaplacePracticeCard from "$lib/components/ui/LaplacePracticeCard.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import {
		createLaplaceExercise,
		generateLaplaceExercise,
		LAPLACE_PRESETS,
		type LaplaceExercise,
		type LaplaceExerciseSpec,
		type LaplacePreset,
		parseLaplaceConfiguration,
		serializeLaplaceConfiguration,
	} from "$lib/math-engine/laplace/index";
	import { createRandomSeed } from "$lib/math-engine/random";
	let error = $state("");
	/** @returns Valid shared exercise, or a clearly diagnosed ordinary default. */
	function initialProblem(): LaplaceExercise {
		try {
			const shared = parseLaplaceConfiguration(page.url.searchParams);
			return shared
				? createLaplaceExercise(shared)
				: generateLaplaceExercise("inverse", 73);
		} catch (failure) {
			error =
				failure instanceof Error
					? failure.message
					: "Invalid shared configuration.";
			return generateLaplaceExercise("inverse", 73);
		}
	}
	let current = $state(untrack(initialProblem));
	let workflow = $state<LaplaceExerciseSpec["workflow"]>(
		untrack(() => current.spec.workflow),
	);
	let preset = $state<LaplacePreset>("distinct");
	let draft = $state<LaplaceExerciseSpec>(
		untrack(() => structuredClone(current.spec)),
	);
	let shareUrl = $state("");
	/** Synchronizes the active validated problem with a reproducible URL. */
	function syncUrl(): void {
		if (typeof window !== "undefined")
			replaceState(
				`${page.url.pathname}?${serializeLaplaceConfiguration($state.snapshot(current.spec))}`,
				page.state,
			);
		shareUrl = "";
	}
	/** Creates a fresh generated exercise in the selected curriculum. */
	function nextProblem(): void {
		try {
			current = generateLaplaceExercise(
				workflow,
				createRandomSeed(),
				preset,
			);
			draft = structuredClone($state.snapshot(current.spec));
			error = "";
			syncUrl();
		} catch (failure) {
			error =
				failure instanceof Error
					? failure.message
					: "Unsupported configuration.";
		}
	}
	/** Applies structured custom input only after complete mathematical validation. */
	function applyCustom(): void {
		try {
			const checked = createLaplaceExercise($state.snapshot(draft));
			current = checked;
			error = "";
			syncUrl();
		} catch (failure) {
			error =
				failure instanceof Error
					? failure.message
					: "Unsupported custom problem.";
		}
	}
	/** Exposes an ordinary text link without requiring clipboard permission. */
	function share(): void {
		shareUrl = `${window.location.origin}${page.url.pathname}?${serializeLaplaceConfiguration($state.snapshot(current.spec))}`;
	}
	onMount(() => {
		if (!error) syncUrl();
	});
</script>

<PageLayout
	title="Laplace Transform & s-Domain Analysis"
	subtitleText="Derive transforms, zeros, poles, convergence regions, and initial-value responses through checked mathematical steps."
	metaDescription="Guided Laplace transforms, exact partial fractions, zeros and poles, ROC analysis, and unilateral initial-value problems."
	activeRoute="/laplace"
>
	{#snippet controls()}
		<DrillPanel
			title="Laplace Practice Configuration"
			badge="Guided practice"
		>
			<label
				>Workflow<select
					bind:value={workflow}
					onchange={nextProblem}
					><option value="inverse">Inverse Transform</option><option
						value="forward">Forward Transform</option
					><option value="roc">ROC & System Analysis</option><option
						value="ode">Solve an ODE</option
					></select
				></label
			>
			<label
				>Example family<select
					bind:value={preset}
					onchange={nextProblem}
					>{#each LAPLACE_PRESETS as family}<option value={family}
							>{family}</option
						>{/each}</select
				></label
			>
			<LaplaceConfiguration
				bind:spec={draft}
				onApply={applyCustom}
			/>
			<button
				type="button"
				onclick={share}>Show shareable problem link</button
			>
			{#if shareUrl}<label
					>Problem link<input
						readonly
						value={shareUrl}
						onclick={(event) => event.currentTarget.select()}
					/></label
				>{/if}
		</DrillPanel>
	{/snippet}
	{#if error}<div
			role="alert"
			class="configuration-error"
		>
			{error} The previous valid exercise remains below. Change the configuration
			and apply it again.
		</div>{/if}
	<LaplacePracticeCard
		problem={current}
		onNextProblem={nextProblem}
	/>
</PageLayout>

<style>
	label {
		display: block;
		margin-bottom: 0.8rem;
	}
	input,
	select {
		display: block;
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		padding: 0.65rem;
		color: var(--text-primary);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
	}
	button {
		padding: 0.6rem;
		margin-top: 0.75rem;
		cursor: pointer;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
	}
	.configuration-error {
		padding: 1rem;
		color: var(--text-primary);
		border: 1px solid var(--color-error, #ef4444);
		border-radius: var(--radius-sm);
		margin-bottom: 1rem;
		overflow-wrap: anywhere;
	}
	:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 3px;
	}
</style>
