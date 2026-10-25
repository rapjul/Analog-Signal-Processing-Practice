<script lang="ts">
	import type { LaplaceExerciseSpec } from "$lib/math-engine/laplace/types";
	import LaplaceFactorEditor from "./LaplaceFactorEditor.svelte";
	import LaplaceSignalEditor from "./LaplaceSignalEditor.svelte";

	/** Editable custom exercise, applied only through explicit validation. */
	interface Props {
		/** Draft independent of the active problem. */ spec: LaplaceExerciseSpec;
		/** Explicit apply action. */ onApply: () => void;
	}
	let { spec = $bindable(), onApply }: Props = $props();
</script>

<details>
	<summary>Structured custom problem</summary>
	<p>
		Use exact integers, decimals, or fractions. Denominator degree is
		limited to four; impulse derivatives are deferred.
	</p>
	{#if spec.workflow === "inverse" || spec.workflow === "roc"}
		<label>Numerator gain<input bind:value={spec.rational.gain} /></label>
		<LaplaceFactorEditor
			label="Numerator"
			bind:factors={spec.rational.zeros}
		/>
		<LaplaceFactorEditor
			label="Denominator"
			bind:factors={spec.rational.poles}
		/>
		<label>Delay<input bind:value={spec.rational.delay} /></label>
		<label
			>ROC region<select bind:value={spec.rational.region}
				><option value={-1}>Right of all surviving poles</option><option
					value={0}>Left of all surviving poles</option
				><option value={1}
					>Between first and second real-part boundaries</option
				><option value={2}
					>Between second and third real-part boundaries</option
				><option value={3}
					>Between third and fourth real-part boundaries</option
				></select
			></label
		>
		{#if spec.workflow === "inverse"}<label
				><input
					type="checkbox"
					bind:checked={spec.system}
				/> Treat this transform as a system transfer function</label
			>{/if}
	{:else if spec.workflow === "forward"}
		<LaplaceSignalEditor bind:terms={spec.terms} />
	{:else if spec.workflow === "ode"}
		<label>Leading ODE coefficient<input bind:value={spec.leading} /></label
		>
		<LaplaceFactorEditor
			label="Operator"
			bind:factors={spec.roots}
		/>
		<label
			>Initial output at zero minus<input
				bind:value={spec.initial[0]}
			/></label
		>
		<label
			>Initial derivative at zero minus (second order)<input
				bind:value={spec.initial[1]}
			/></label
		>
		<LaplaceSignalEditor
			bind:terms={spec.terms}
			unilateral
		/>
	{/if}
	<button
		type="button"
		onclick={onApply}>Apply custom problem</button
	>
</details>

<style>
	details {
		min-width: 0;
		margin-top: 1rem;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	label {
		display: block;
		margin: 0.7rem 0;
	}
	input:not([type="checkbox"]),
	select {
		display: block;
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		background: var(--bg-input);
		color: var(--text-primary);
		padding: 0.5rem;
		border: 1px solid var(--border-color);
	}
	button {
		padding: 0.6rem;
		background: var(--accent-primary);
		color: var(--accent-contrast, #042f2e);
		border: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}
	:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 3px;
	}
</style>
