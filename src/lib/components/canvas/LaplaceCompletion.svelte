<script lang="ts">
	import MathText from "$lib/components/math/MathText.svelte";
	import type { LaplaceExercise } from "$lib/math-engine/laplace/types";
	import { laplacePlot } from "./laplace-plot";

	/** Completion-only mathematical diagrams. */
	interface Props {
		/** Verified exercise. */ problem: LaplaceExercise;
	}
	let { problem }: Props = $props();
	const plot = $derived(laplacePlot(problem));
</script>

<div class="laplace-visualizations">
	<figure>
		<figcaption>Verified regular response</figcaption>
		<svg
			viewBox="0 0 320 160"
			role="img"
			aria-label="Verified time response; impulse arrows indicate distributions, not finite peaks"
		>
			<line
				x1="20"
				y1="80"
				x2="300"
				y2="80"
				stroke="currentColor"
			/>
			<path
				d={plot.path}
				fill="none"
				stroke="var(--accent-primary)"
				stroke-width="2"
				stroke-linecap="round"
			/>
			{#each plot.impulses as impulse}<path
					d={`M${impulse.x},80 L${impulse.x},${80 - 58 * impulse.direction} l-4,${8 * impulse.direction} m4,${-8 * impulse.direction} l4,${8 * impulse.direction}`}
					fill="none"
					stroke="currentColor"><title>{impulse.label}</title></path
				>{/each}
			<text
				x="20"
				y="151">{plot.min}</text
			><text
				x="280"
				y="151">{plot.max}</text
			><text
				x="155"
				y="151">t</text
			>
		</svg>
		<p>
			Vertical scale: ±{plot.peak.toPrecision(3)}. Discontinuities are not
			joined.
		</p>
		{#if plot.omitted}<p>
				Some samples exceeded the finite plotting range and were
				omitted.
			</p>{/if}
		{#each plot.impulses as impulse}<p>{impulse.label}</p>{/each}
	</figure>
	<figure>
		<figcaption>Verified poles, zeros, and ROC</figcaption>
		<svg
			viewBox="0 0 320 160"
			role="img"
			aria-label="Solved s-plane; crosses are surviving poles, circles are zeros, dashed squares are removed factor copies"
		>
			<rect
				x={plot.rocLeft}
				y="15"
				width={Math.max(0, plot.rocRight - plot.rocLeft)}
				height="125"
				fill="var(--accent-primary)"
				opacity=".12"
			/>
			<line
				x1="20"
				y1="80"
				x2="300"
				y2="80"
				stroke="currentColor"
			/><line
				x1="160"
				y1="15"
				x2="160"
				y2="140"
				stroke="currentColor"
			/>
			{#each plot.roots as marker}
				{#if marker.kind === "zero"}<circle
						cx={marker.x}
						cy={marker.y}
						r="5"
						fill="none"
						stroke="var(--accent-primary)"
						><title>{marker.label}</title></circle
					>
				{:else if marker.kind === "canceled"}<rect
						x={marker.x - 7}
						y={marker.y - 7}
						width="14"
						height="14"
						fill="none"
						stroke="currentColor"
						stroke-dasharray="2"><title>{marker.label}</title></rect
					>
				{:else}<path
						d={`M${marker.x - 4},${marker.y - 4}l8,8m-8,0l8,-8`}
						stroke="var(--color-error, #ef4444)"
						><title>{marker.label}</title></path
					>{/if}
			{/each}
			<text
				x="266"
				y="100">Re(s)</text
			><text
				x="170"
				y="20">Im(s)</text
			>
		</svg>
		<p><MathText text={`ROC: $${problem.rocLatex}$`} /></p>
		<p>
			Markers describe the complete response. A dashed square counts
			removed copies; a cross at the same location still denotes a genuine
			pole.
		</p>
		<ul>
			{#each plot.roots as marker}<li>{marker.label}.</li>{/each}
		</ul>
		<p><MathText text={plot.zeroInfo.description} /></p>
	</figure>
</div>

<style>
	.laplace-visualizations {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
		gap: 1rem;
		min-width: 0;
	}
	figure {
		margin: 0;
		min-width: 0;
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		overflow-wrap: anywhere;
	}
	figcaption {
		font-weight: 700;
	}
	svg {
		width: 100%;
		height: auto;
		color: var(--text-secondary);
	}
	text {
		fill: currentColor;
		font-size: 10px;
	}
	ul {
		padding-left: 1rem;
	}
</style>
