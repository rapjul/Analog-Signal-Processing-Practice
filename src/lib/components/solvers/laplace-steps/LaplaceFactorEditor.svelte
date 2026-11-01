<script lang="ts">
	import MathText from "$lib/components/math/MathText.svelte";
	import { laplaceFactor } from "$lib/math-engine/laplace/generator";
	import type { LaplaceFactor } from "$lib/math-engine/laplace/types";
	import LaplaceTypedInput from "./LaplaceTypedInput.svelte";

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
		<MathText
			text={String.raw`A real factor is $(s-a)$. A conjugate factor is $(s-a)^2+\omega^2$. Set the frequency to zero for a real factor.`}
		/>
	</p>
	{#each factors as factor, index}
		<div class="factor-row">
			<label
				>Real part a<LaplaceTypedInput
					aria-label={`${label} ${index + 1} real part`}
					bind:value={factor.real}
				/></label
			>
			<label
				>Angular frequency<LaplaceTypedInput
					aria-label={`${label} ${index + 1} frequency`}
					bind:value={factor.frequency}
				/></label
			>
			<label
				>Multiplicity<LaplaceTypedInput
					aria-label={`${label} ${index + 1} multiplicity`}
					entry={{ kind: "integer", min: 1, max: 4 }}
					numericValue={factor.multiplicity}
					onnumericedit={(value) => (factor.multiplicity = value)}
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
