<script lang="ts">
	/**
	 * TransformsFormulaReference Svelte 5 Component.
	 *
	 * Reference table and formulas for unilateral Laplace transform pairs,
	 * Continuous-Time Fourier Transform (CTFT) analysis/synthesis, and CTFT properties.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
</script>

<div class="ref-section">
	<h3 class="section-heading">Common Laplace Transform Pairs</h3>
	<table class="ref-table">
		<thead>
			<tr>
				<th>
					<MathText text={"Time Domain $x(t) u(t)$"} />
				</th>
				<th>
					<MathText text={"Laplace Domain $X(s)$"} />
				</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>
					<MathText text={String.raw`$\delta(t)$`} />
				</td>
				<td><MathText text={"$1$"} /></td>
			</tr>
			<tr>
				<td><MathText text={"$u(t)$"} /></td>
				<td>
					<MathText text={String.raw`$\frac{1}{s}$`} />
				</td>
			</tr>
			<tr>
				<td>
					<MathText text={String.raw`$e^{-a t} u(t)$`} />
				</td>
				<td>
					<MathText text={String.raw`$\frac{1}{s + a}$`} />
				</td>
			</tr>
			<tr>
				<td>
					<MathText text={String.raw`$\cos(\omega t) u(t)$`} />
				</td>
				<td>
					<MathText text={String.raw`$\frac{s}{s^2 + \omega^2}$`} />
				</td>
			</tr>
			<tr>
				<td>
					<MathText text={String.raw`$\sin(\omega t) u(t)$`} />
				</td>
				<td>
					<MathText
						text={String.raw`$\frac{\omega}{s^2 + \omega^2}$`}
					/>
				</td>
			</tr>
		</tbody>
	</table>
</div>

<div class="ref-section">
	<h3 class="section-heading">Continuous-Time Fourier Transform (CTFT)</h3>
	<MathBlock
		math={"X(\\omega) = \\int_{-\\infty}^{\\infty} x(t) e^{-j \\omega t} dt, \\quad x(t) = \\frac{1}{2\\pi} \\int_{-\\infty}^{\\infty} X(\\omega) e^{j \\omega t} d\\omega"}
		compact={true}
	/>
	<ul class="ref-list">
		<li>
			<strong>Duality:</strong>
			<MathText
				text={String.raw`$X(t) \leftrightarrow 2\pi x(-\omega)$`}
			/>
		</li>
		<li>
			<strong>Time Shifting:</strong>
			<MathText
				text={String.raw`$x(t - t_0) \leftrightarrow e^{-j \omega t_0} X(\omega)$`}
			/>
		</li>
		<li>
			<strong>Modulation:</strong>
			<MathText
				text={String.raw`$x(t) e^{j \omega_0 t} \leftrightarrow X(\omega - \omega_0)$`}
			/>
		</li>
		<li>
			<strong>Differentiation:</strong>
			<MathText
				text={String.raw`$\frac{d x}{dt} \leftrightarrow j \omega X(\omega)$`}
			/>
		</li>
	</ul>
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

	.ref-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
		margin-top: 0.25rem;
	}

	.ref-table th,
	.ref-table td {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border-color, #27272a);
		text-align: left;
	}

	.ref-table th {
		background: var(--bg-secondary, #18181b);
		color: var(--text-primary, #f4f4f5);
		font-weight: 600;
	}
</style>
