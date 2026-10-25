<script lang="ts">
	import MathText from "$lib/components/math/MathText.svelte";
	import { laplaceSignal } from "$lib/math-engine/laplace/generator";
	import type { LaplaceSignalTerm } from "$lib/math-engine/laplace/types";

	/** Bounded structured standard-pair input. */
	interface Props {
		/** Signal list. */ terms: LaplaceSignalTerm[];
		/** Whether support is restricted to the unilateral domain. */ unilateral?: boolean;
	}
	let { terms = $bindable(), unilateral = false }: Props = $props();
</script>

<p>
	<MathText
		text={String.raw`Ordinary terms use $A(t-d)^n e^{a(t-d)}$ with the selected support. Sine and cosine use $n=0$ and angular frequency $\omega$.`}
	/>
</p>
{#each terms as term, index}
	<fieldset>
		<legend>Signal term {index + 1}</legend>
		<label
			>Pair<select bind:value={term.kind}
				><option value="exponential"
					>Polynomial exponential / step</option
				><option value="cosine">Damped cosine</option><option
					value="sine">Damped sine</option
				><option value="impulse">Dirac impulse</option></select
			></label
		>
		{#each ["amplitude", "rate", "frequency", "delay"] as field}
			<label
				>{field}<input
					aria-label={`Term ${index + 1} ${field}`}
					bind:value={
						term[
							field as
								"amplitude" | "rate" | "frequency" | "delay"
						]
					}
				/></label
			>
		{/each}
		<label
			>Polynomial power<input
				type="number"
				min="0"
				max="3"
				bind:value={term.power}
			/></label
		>
		<label
			>Support<select
				bind:value={term.side}
				disabled={unilateral}
				><option value="right">Right-sided</option><option value="left"
					>Left-sided</option
				></select
			></label
		>
		<button
			type="button"
			disabled={terms.length === 1}
			onclick={() =>
				(terms = terms.filter((_, position) => position !== index))}
			>Remove term {index + 1}</button
		>
	</fieldset>
{/each}
<button
	type="button"
	disabled={terms.length >= 3}
	onclick={() => (terms = [...terms, laplaceSignal()])}
	>Add signal term</button
>

<style>
	fieldset {
		min-width: 0;
		display: flex;
		gap: 0.7rem;
		flex-wrap: wrap;
		border: 1px solid var(--border-color);
		margin: 1rem 0;
	}
	label {
		display: flex;
		flex: 1 1 8rem;
		min-width: 0;
		flex-direction: column;
		gap: 0.3rem;
	}
	input,
	select {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		background: var(--bg-input);
		color: var(--text-primary);
		padding: 0.5rem;
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
