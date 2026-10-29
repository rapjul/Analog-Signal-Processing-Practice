<script lang="ts">
	import { laplaceDraftOrder } from "$lib/math-engine/laplace/configuration";
	import type { LaplaceExerciseSpec } from "$lib/math-engine/laplace/types";
	import LaplaceFactorEditor from "./LaplaceFactorEditor.svelte";
	import LaplaceSignalEditor from "./LaplaceSignalEditor.svelte";
	import LaplaceTypedInput from "./LaplaceTypedInput.svelte";

	/** Editable custom exercise, applied only through explicit validation. */
	interface Props {
		/** Draft independent of the active problem. */ spec: LaplaceExerciseSpec;
		/** Explicit apply action. */ onApply: () => void;
	}
	let { spec = $bindable(), onApply }: Props = $props();
	const uid = $props.id();
</script>

<details>
	<summary>Structured custom problem</summary>
	<p>
		Use exact integers, decimals, or fractions. Denominator degree is
		limited to four; impulse derivatives are deferred.
	</p>
	{#if spec.workflow === "inverse" || spec.workflow === "roc"}
		<div class="numeric-field">
			<label for={`${uid}-gain`}>Numerator gain</label><LaplaceTypedInput
				id={`${uid}-gain`}
				bind:value={spec.rational.gain}
			/>
		</div>
		<LaplaceFactorEditor
			label="Numerator"
			bind:factors={spec.rational.zeros}
		/>
		<LaplaceFactorEditor
			label="Denominator"
			bind:factors={spec.rational.poles}
		/>
		<div class="numeric-field">
			<label for={`${uid}-delay`}>Delay</label><LaplaceTypedInput
				id={`${uid}-delay`}
				bind:value={spec.rational.delay}
			/>
		</div>
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
		<div class="numeric-field">
			<label for={`${uid}-leading`}>Leading ODE coefficient</label
			><LaplaceTypedInput
				id={`${uid}-leading`}
				bind:value={spec.leading}
			/>
		</div>
		<LaplaceFactorEditor
			label="Operator"
			bind:factors={spec.roots}
		/>
		<div class="numeric-field">
			<label for={`${uid}-initial-output`}
				>Initial output at zero minus</label
			><LaplaceTypedInput
				id={`${uid}-initial-output`}
				bind:value={spec.initial[0]}
			/>
		</div>
		{#if laplaceDraftOrder(spec.roots) !== 1}<div class="numeric-field">
				<label for={`${uid}-initial-derivative`}
					>Initial derivative at zero minus (second order)</label
				><LaplaceTypedInput
					id={`${uid}-initial-derivative`}
					bind:value={spec.initial[1]}
				/>
			</div>{/if}
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
	.numeric-field {
		margin: 0.7rem 0;
	}
	.numeric-field label {
		margin: 0;
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
