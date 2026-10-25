<script lang="ts">
	import { laplaceFactor } from "$lib/math-engine/laplace/generator";
	import type { LaplaceFactor } from "$lib/math-engine/laplace/types";
	/** Structured factor list inputs. */
	interface Props {
		/** Fieldset label. */ label: string;
		/** Editable factors. */ factors: LaplaceFactor[];
	}
	let { label, factors = $bindable() }: Props = $props();
</script>

<fieldset>
	<legend>{label}</legend>
	<p>
		A real factor is (s − a). A conjugate factor is (s − a)² + ω². Set ω to
		zero for a real factor.
	</p>
	{#each factors as factor, index}
		<div class="factor-row">
			<label
				>Real part a<input
					aria-label={`${label} ${index + 1} real part`}
					bind:value={factor.real}
				/></label
			>
			<label
				>Frequency ω<input
					aria-label={`${label} ${index + 1} frequency`}
					bind:value={factor.frequency}
				/></label
			>
			<label
				>Multiplicity<input
					aria-label={`${label} ${index + 1} multiplicity`}
					type="number"
					min="1"
					max="4"
					bind:value={factor.multiplicity}
				/></label
			>
			<button
				type="button"
				onclick={() =>
					(factors = factors.filter(
						(_, position) => position !== index,
					))}>Remove factor {index + 1}</button
			>
		</div>
	{/each}
	<button
		type="button"
		disabled={factors.length >= 4}
		onclick={() => (factors = [...factors, laplaceFactor()])}
		>Add {label.toLowerCase()} factor</button
	>
</fieldset>

<style>
	fieldset {
		min-width: 0;
		border: 1px solid var(--border-color);
		margin: 1rem 0;
		border-radius: var(--radius-sm);
	}
	.factor-row {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		margin-bottom: 0.75rem;
	}
	label {
		display: flex;
		flex: 1 1 7rem;
		min-width: 0;
		flex-direction: column;
		gap: 0.3rem;
	}
	input {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		padding: 0.5rem;
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}
	button {
		padding: 0.5rem;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		cursor: pointer;
	}
	:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}
</style>
