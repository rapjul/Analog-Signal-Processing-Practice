<script lang="ts">
	/**
	 * ConvolutionFormulaReference Svelte 5 Component.
	 *
	 * Reference table and formulas for continuous-time convolution,
	 * timing equations, overlap bounds, and standard pulse definitions.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
</script>

<div class="ref-section">
	<h3 class="section-heading">Definition and Commutativity</h3>
	<MathBlock
		math={String.raw`y(t)=\int_{-\infty}^{\infty}x(\tau)h(t-\tau)\,d\tau=\int_{-\infty}^{\infty}h(\tau)x(t-\tau)\,d\tau`}
		compact={true}
	/>
	<p class="ref-text">
		<MathText
			text={String.raw`The variable $\tau$ is a dummy integration variable. Either signal may be reflected and shifted.`}
		/>
	</p>
</div>

<div class="ref-section">
	<h3 class="section-heading">Timing and Contact Equations</h3>
	<MathBlock
		math={String.raw`t_{\mathrm{overlap,start}}=t_{x,\mathrm{start}}+t_{h,\mathrm{start}},\quad t_{\mathrm{overlap,end}}=t_{x,\mathrm{end}}+t_{h,\mathrm{end}}`}
		compact={true}
	/>
	<p class="ref-text">
		These bounds describe the possible overlap span. Signed contributions
		may cancel inside it; a right-unbounded input does not guarantee a
		nonzero output tail.
	</p>
	<MathBlock
		math={String.raw`a=t-b\quad\Longrightarrow\quad t=a+b`}
		compact={true}
	/>
</div>

<div class="ref-section">
	<h3 class="section-heading">Overlap Bounds</h3>
	<p class="ref-text">
		<MathText
			text={String.raw`If the fixed interval is $[a,b]$ and the original moving interval is $[c,d]$, its transformed interval is $[t-d,t-c]$.`}
		/>
	</p>
	<MathBlock
		math={String.raw`\tau_{\min}=\max(a,t-d),\quad \tau_{\max}=\min(b,t-c)`}
		compact={true}
	/>
</div>

<div class="ref-section">
	<h3 class="section-heading">Pulse Definitions and Assembly</h3>
	<MathBlock
		math={String.raw`\operatorname{rect}(t)=1\text{ for }-\tfrac12\le t<\tfrac12,\quad \operatorname{tri}(t)=\max(1-|t|,0)`}
		compact={true}
	/>
	<MathBlock
		math={String.raw`u(t)=\begin{cases}0&t<0\\1&t\ge0\end{cases},\qquad A u(t-s)=A\text{ for }t\ge s`}
		compact={true}
	/>
	<p class="ref-text">
		Evaluate each verified interval, then place its expression beside the
		same interval condition in a cases expression.
	</p>
</div>

<style>
	/* ── Box-drawing section dividers ────────────────────────────────────────── */
	.ref-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid var(--border-color, #27272a);
	}

	.ref-section:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.section-heading {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary, #f4f4f5);
		margin: 0;
	}

	.ref-text {
		font-size: 0.85rem;
		color: var(--text-secondary, #a1a1aa);
		line-height: 1.5;
		margin: 0;
	}
</style>
