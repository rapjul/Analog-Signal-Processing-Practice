<script lang="ts">
	/**
	 * OdeFormulaReference Svelte 5 Component.
	 *
	 * Reference table and formulas for Linear Constant-Coefficient Differential Equations,
	 * damping categories, particular solution ansatzes, and response decomposition.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
</script>

<div class="ref-section">
	<h3 class="section-heading">Characteristic Roots & Damping</h3>
	<MathBlock
		math={"s^2 + a_1 s + a_0 = 0"}
		compact={true}
	/>
	<ul class="ref-list">
		<li>
			<strong>Distinct Real Roots:</strong>
			<MathText
				text={String.raw`$y_h(t) = C_1 e^{r_1 t} + C_2 e^{r_2 t}$`}
			/>
		</li>
		<li>
			<strong>Repeated Real Roots:</strong>
			<MathText text={String.raw`$y_h(t) = (C_1 + C_2 t) e^{r t}$`} />
		</li>
		<li>
			<strong>Complex Conjugate Roots:</strong>
			<MathText
				text={String.raw`$y_h(t) = e^{\sigma t} [C_1 \cos(\omega_d t) + C_2 \sin(\omega_d t)]$`}
			/>
		</li>
	</ul>
</div>

<div class="ref-section">
	<h3 class="section-heading">Particular Solution Ansatz Table</h3>
	<table class="ref-table">
		<thead>
			<tr>
				<th>
					<MathText text={"Input $x(t)$"} />
				</th>
				<th>
					<MathText text={"Ansatz $y_p(t)$"} />
				</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><MathText text={"Constant $K$"} /></td>
				<td><MathText text={"$K_p$"} /></td>
			</tr>
			<tr>
				<td>
					<MathText text={String.raw`Exponential $K e^{p t}$`} />
				</td>
				<td>
					<MathText text={String.raw`$K_p e^{p t}$`} />
				</td>
			</tr>
			<tr>
				<td>
					<MathText text={String.raw`Sinusoid $K \cos(\omega t)$`} />
				</td>
				<td>
					<MathText
						text={String.raw`$A \cos(\omega t) + B \sin(\omega t)$`}
					/>
				</td>
			</tr>
		</tbody>
	</table>
	<div class="callout callout-warning">
		<MathText
			text={String.raw`<strong>Resonance Rule:</strong> If the trial guess $y_p(t)$ contains terms present in $y_h(t)$, multiply by $t$ (or $t^2$ for repeated roots).`}
		/>
	</div>
</div>

<div class="ref-section">
	<h3 class="section-heading">Response Decomposition</h3>
	<p class="ref-text">
		<strong>Total Solution:</strong>
		<MathText
			text={String.raw`$y(t) = y_{ZI}(t) + y_{ZS}(t) = y_h(t) + y_p(t)$`}
		/>
	</p>
	<ul class="ref-list">
		<li>
			<MathText
				text={String.raw`<strong>Zero-Input Response ($y_{ZI}$):</strong> Driven purely by initial conditions ($x(t) = 0$).`}
			/>
		</li>
		<li>
			<MathText
				text={String.raw`<strong>Zero-State Response ($y_{ZS}$):</strong> Driven purely by forcing input ($y(0^-) = y'(0^-) = 0$).`}
			/>
		</li>
		<li>
			<MathText
				text={String.raw`<strong>Initial Conditions:</strong> Always match $y(0^+) = y_h(0^+) + y_p(0^+)$ and $y'(0^+) = y_h'(0^+) + y_p'(0^+)$.`}
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
