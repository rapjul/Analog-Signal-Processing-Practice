<script lang="ts">
	/**
	 * FourierFormulaReference Svelte 5 Component.
	 *
	 * Reference table and formulas for Trigonometric and Exponential Fourier series,
	 * symmetry shortcuts, Parseval's power identity, and Dirichlet convergence rules.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
</script>

<div class="ref-section">
	<h3 class="section-heading">Fourier Series Representations</h3>
	<p class="ref-label">Trigonometric Form:</p>
	<MathBlock
		math={"x(t) = \\frac{a_0}{2} + \\sum_{n=1}^{\\infty} [a_n \\cos(n \\omega_0 t) + b_n \\sin(n \\omega_0 t)]"}
		compact={true}
	/>
	<p class="ref-label">Exponential Form:</p>
	<MathBlock
		math={"x(t) = \\sum_{n=-\\infty}^{\\infty} F_n e^{j n \\omega_0 t}"}
		compact={true}
	/>
	<p class="ref-label">Coefficient Relations:</p>
	<MathBlock
		math={"F_n = \\frac{a_n - j b_n}{2}, \\quad F_{-n} = F_n^*, \\quad F_0 = \\frac{a_0}{2}"}
		compact={true}
	/>
</div>

<div class="ref-section">
	<h3 class="section-heading">Integration Scaling Factors</h3>
	<ul class="ref-list">
		<li>
			<MathText
				text={String.raw`<strong>Trigonometric Coefficients:</strong> Requires factor of $\frac{2}{T_0}$:`}
			/>
			<MathBlock
				math={"a_n = \\frac{2}{T_0} \\int_{T_0} x(t) \\cos(n \\omega_0 t) dt, \\quad b_n = \\frac{2}{T_0} \\int_{T_0} x(t) \\sin(n \\omega_0 t) dt"}
				compact={true}
			/>
		</li>
		<li>
			<MathText
				text={String.raw`<strong>Exponential Coefficients:</strong> Requires factor of $\frac{1}{T_0}$:`}
			/>
			<MathBlock
				math={"F_n = \\frac{1}{T_0} \\int_{T_0} x(t) e^{-j n \\omega_0 t} dt"}
				compact={true}
			/>
		</li>
	</ul>
</div>

<div class="ref-section">
	<h3 class="section-heading">Symmetry Shortcuts</h3>
	<ul class="ref-list">
		<li>
			<MathText
				text={String.raw`<strong>Even Symmetry ($x(-t) = x(t)$):</strong> $b_n = 0, \; F_n \in \mathbb{R}$`}
			/>
		</li>
		<li>
			<MathText
				text={String.raw`<strong>Odd Symmetry ($x(-t) = -x(t)$):</strong> $a_0 = 0, \; a_n = 0, \; F_n \in j\mathbb{R}$`}
			/>
		</li>
		<li>
			<MathText
				text={String.raw`<strong>Half-Wave Odd ($x(t - T_0/2) = -x(t)$):</strong> $a_n = b_n = F_n = 0$ for even $n$.`}
			/>
		</li>
	</ul>
</div>

<div class="ref-section">
	<h3 class="section-heading">Parseval's Power & Gibbs Phenomenon</h3>
	<MathBlock
		math={"P_x = \\frac{1}{T_0} \\int_{T_0} |x(t)|^2 dt = \\frac{a_0^2}{4} + \\frac{1}{2} \\sum_{n=1}^{\\infty} (a_n^2 + b_n^2) = \\sum_{n=-\\infty}^{\\infty} |F_n|^2"}
		compact={true}
	/>
	<p class="ref-text">
		<MathText
			text={String.raw`<strong>Gibbs Phenomenon:</strong> Truncated Fourier sums at jump discontinuities exhibit a persistent overshoot of $\approx 8.95\%$ of the total jump height as $N \to \infty$.`}
		/>
	</p>
</div>

<div class="ref-section">
	<h3 class="section-heading">Dirichlet Conditions & Convergence</h3>
	<p class="ref-label">Weak Dirichlet Condition:</p>
	<MathBlock
		math={"\\int_{t_0}^{t_0+T_0}|x(t)|\\,dt < \\infty"}
		compact={true}
	/>
	<p class="ref-text">
		The signal must be absolutely integrable over one finite period.
	</p>
	<p class="ref-label">Strong Dirichlet Conditions:</p>
	<ul class="ref-list">
		<li>Only finitely many extrema occur in each period.</li>
		<li>Only finitely many discontinuities occur in each period.</li>
	</ul>
	<div class="callout callout-warning">
		<p class="ref-label">Discontinuity Midpoint Convergence:</p>
		<MathBlock
			math={"\\lim_{N\\to\\infty}S_N(t_0)=\\frac{x(t_0^+)+x(t_0^-)}{2}"}
			compact={true}
		/>
		<p class="ref-text">
			At a jump, the Fourier series converges to the midpoint of the left-
			and right-hand limits.
		</p>
	</div>
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

	.ref-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary, #a1a1aa);
		margin: 0.25rem 0 0 0;
	}

	.ref-text {
		font-size: 0.85rem;
		color: var(--text-secondary, #a1a1aa);
		line-height: 1.5;
		margin: 0;
	}

	.ref-list {
		margin: 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-secondary, #a1a1aa);
		line-height: 1.5;
	}

	.ref-list li {
		margin: 0;
	}

	.callout {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		line-height: 1.5;
	}

	.callout-warning {
		background: rgba(245, 158, 11, 0.12);
		border: 1px solid rgba(245, 158, 11, 0.35);
		color: var(--text-primary, #f4f4f5);
	}
</style>
