<script lang="ts">
	/** Accessible interval comparison used by the guided Step 5 workflow. */

	import MathText from "$lib/components/math/MathText.svelte";
	import type { ConvolutionIntervalComparison } from "$lib/math-engine/convolution/index";

	interface Props {
		/** Fixed/transformed section pairs at the representative output time. */
		comparisons: ConvolutionIntervalComparison[];
		/** Representative output time used for the comparison. */
		time: number;
		/** Whether verified overlap ranges may be revealed. */
		revealOverlap?: boolean;
	}

	let { comparisons, time, revealOverlap = false }: Props = $props();

	/** Maps finite and infinite endpoints into the shared visible axis. */
	function positions(comparison: ConvolutionIntervalComparison): {
		fixed: [number, number];
		moving: [number, number];
		overlap: [number, number];
	} {
		const all = [
			...comparison.fixedValues,
			...comparison.transformedValues,
		];
		const finite = all.filter(Number.isFinite);
		const minimum = Math.min(...finite, -1);
		const maximum = Math.max(...finite, 1);
		const padding = Math.max((maximum - minimum) * 0.18, 1);
		const low = minimum - padding;
		const high = maximum + padding;
		const map = (value: number): number => {
			if (value === Number.NEGATIVE_INFINITY) return 0;
			if (value === Number.POSITIVE_INFINITY) return 100;
			return ((value - low) / (high - low)) * 100;
		};
		const fixed: [number, number] = comparison.fixedValues.map(map) as [
			number,
			number,
		];
		const moving: [number, number] = comparison.transformedValues.map(
			map,
		) as [number, number];
		return {
			fixed,
			moving,
			overlap: [
				Math.max(fixed[0], moving[0]),
				Math.min(fixed[1], moving[1]),
			],
		};
	}

	/** Builds a screen-reader description without relying on plot colors. */
	function description(comparison: ConvolutionIntervalComparison): string {
		return `At output time ${time}, compare the fixed interval from ${comparison.fixedValues[0]} to ${comparison.fixedValues[1]} with the transformed interval from ${comparison.transformedValues[0]} to ${comparison.transformedValues[1]}. ${revealOverlap ? (comparison.hasOverlap ? "Their shared range is highlighted." : "They have no shared range.") : "Decide whether they share any values."}`;
	}
</script>

<div class="comparison-list">
	{#each comparisons as comparison, index}
		{@const range = positions(comparison)}
		<figure aria-label={description(comparison)}>
			<figcaption>
				<MathText
					text={`Section pair ${index + 1} at $t=${time}$: fixed $${comparison.fixedIntervalLatex}$; transformed $${comparison.transformedIntervalLatex}$.`}
				/>
			</figcaption>
			<div class="axis-row fixed-row">
				<span class="row-label">Fixed</span>
				<span
					class="axis"
					aria-hidden="true"
				>
					<span
						class="range"
						style={`left:${range.fixed[0]}%;right:${100 - range.fixed[1]}%`}
					></span>
				</span>
			</div>
			<div class="axis-row moving-row">
				<span class="row-label">Transformed</span>
				<span
					class="axis"
					aria-hidden="true"
				>
					<span
						class="range"
						style={`left:${range.moving[0]}%;right:${100 - range.moving[1]}%`}
					></span>
				</span>
			</div>
			{#if revealOverlap}
				<div class="axis-row overlap-row">
					<span class="row-label">Overlap</span>
					<span
						class="axis"
						aria-hidden="true"
					>
						{#if comparison.hasOverlap}
							<span
								class="range"
								style={`left:${range.overlap[0]}%;right:${100 - range.overlap[1]}%`}
							></span>
						{/if}
					</span>
				</div>
			{/if}
		</figure>
	{/each}
</div>

<style>
	.comparison-list {
		display: grid;
		gap: 0.75rem;
	}
	figure {
		display: grid;
		gap: 0.55rem;
		margin: 0;
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
	}
	figcaption {
		color: var(--text-secondary);
		font-size: var(--text-sm);
	}
	.axis-row {
		display: grid;
		grid-template-columns: minmax(5.5rem, auto) minmax(5rem, 1fr);
		gap: 0.65rem;
		align-items: center;
	}
	.row-label {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--text-secondary);
	}
	.axis {
		position: relative;
		height: 1.1rem;
		border-bottom: 1px solid var(--border-color);
	}
	.range {
		position: absolute;
		bottom: -0.15rem;
		height: 0.35rem;
		border-radius: var(--radius-pill);
		background: var(--color-warning);
	}
	.moving-row .range {
		background: var(--color-info);
	}
	.overlap-row .range {
		background: var(--color-success);
	}
	@media (max-width: 420px) {
		.axis-row {
			grid-template-columns: 1fr;
		}
	}
</style>
