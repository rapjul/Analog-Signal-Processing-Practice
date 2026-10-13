<script lang="ts">
	/**
	 * FourierCoefficientCard Svelte 5 Component.
	 *
	 * Reusable builder card for individual Fourier Series coefficients (a_n, b_n, F_n).
	 * Supports zero, fraction builder, and freehand direct LaTeX modes.
	 */

	import MathInline from "./MathInline.svelte";
	import MathText from "./MathText.svelte";

	export type CoeffInputMode = "zero" | "fraction" | "direct";
	export type HarmonicOption = "none" | "odd" | "even" | "alt" | "custom";

	interface Props {
		/** Display title (can include math) */
		title: string;
		/** Variable symbol (e.g. "a_n", "b_n", "F_n") */
		symbol: string;
		/** Element ID prefix (e.g. "an", "bn", "Fn") */
		idPrefix?: string;
		/** Active input mode */
		mode?: CoeffInputMode;
		/** Numerator string */
		num?: string;
		/** Denominator string */
		den?: string;
		/** Selected harmonic option */
		harmonic?: HarmonicOption;
		/** Custom harmonic string */
		customHarmonic?: string;
		/** Direct LaTeX expression */
		direct?: string;
		/** Computed coefficient LaTeX */
		coeffLatex: string;
		/** Numerator placeholder */
		numPlaceholder?: string;
		/** Denominator placeholder */
		denPlaceholder?: string;
		/** Direct input placeholder */
		directPlaceholder?: string;
		/** Callback triggered when any field changes */
		onUpdate: () => void;
	}

	let {
		title,
		symbol,
		idPrefix = symbol.replace(/[^a-zA-Z0-9]/g, ""),
		mode = $bindable("fraction"),
		num = $bindable("2"),
		den = $bindable("n pi"),
		harmonic = $bindable("odd"),
		customHarmonic = $bindable(""),
		direct = $bindable(""),
		coeffLatex,
		numPlaceholder = "e.g. 4 or 2",
		denPlaceholder = "e.g. n \\pi or n^2 \\pi^2",
		directPlaceholder = "e.g. 2 / (n \\pi)",
		onUpdate,
	}: Props = $props();
</script>

<div class="coeff-card">
	<div class="coeff-header">
		<span class="coeff-label">
			<MathText text={title} />
		</span>
		<div class="input-mode-toggle">
			<button
				type="button"
				class="toggle-btn"
				class:active={mode === "zero"}
				onclick={() => {
					mode = "zero";
					onUpdate();
				}}
			>
				Zero (0)
			</button>
			<button
				type="button"
				class="toggle-btn"
				class:active={mode === "fraction"}
				onclick={() => {
					mode = "fraction";
					onUpdate();
				}}
			>
				🧱 Fraction Builder
			</button>
			<button
				type="button"
				class="toggle-btn"
				class:active={mode === "direct"}
				onclick={() => {
					mode = "direct";
					onUpdate();
				}}
			>
				✍️ Freehand
			</button>
		</div>
	</div>

	{#if mode === "fraction"}
		<div class="fraction-builder-grid">
			<div class="fraction-column">
				<div class="fraction-field">
					<span class="field-tag">Numerator</span>
					<input
						type="text"
						class="text-input fraction-input"
						bind:value={num}
						oninput={onUpdate}
						placeholder={numPlaceholder}
					/>
				</div>
				<div class="fraction-line"></div>
				<div class="fraction-field">
					<span class="field-tag">Denominator</span>
					<input
						type="text"
						class="text-input fraction-input"
						bind:value={den}
						oninput={onUpdate}
						placeholder={denPlaceholder}
					/>
				</div>
			</div>

			<div class="multiplier-column">
				<span class="field-tag"> Harmonics / Parity Factor </span>
				<select
					class="select-input"
					bind:value={harmonic}
					onchange={onUpdate}
				>
					<option value="none">None (1)</option>
					<option value="odd"> Odd Harmonics: (1 - (-1)^n) </option>
					<option value="even"> Even Harmonics: (1 + (-1)^n) </option>
					<option value="alt"> Alternating Signs: (-1)^n </option>
					<option value="custom"> Custom Multiplier... </option>
				</select>

				{#if harmonic === "custom"}
					<input
						type="text"
						class="text-input custom-mult-input"
						bind:value={customHarmonic}
						oninput={onUpdate}
						placeholder="e.g. \sin(n \pi / 2)"
					/>
				{/if}
			</div>
		</div>
	{:else if mode === "direct"}
		<div class="direct-input-row">
			<label for={`${idPrefix}-direct-input`}>LaTeX / Expression:</label>
			<input
				id={`${idPrefix}-direct-input`}
				type="text"
				class="text-input mono flex-grow"
				bind:value={direct}
				oninput={onUpdate}
				placeholder={directPlaceholder}
			/>
		</div>
	{/if}

	<!-- Live Rendered Coefficient Card -->
	<div class="coeff-preview">
		<span class="preview-title">Built Expression:</span>
		<MathInline
			math={`${symbol} = ${coeffLatex}`}
			displayStyle
		/>
	</div>
</div>

<style>
	/* ── Box-drawing section dividers ────────────────────────────────────────── */
	.coeff-card {
		background: var(--bg-card, #121214);
		border: 1px solid var(--border-color, #27272a);
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.coeff-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-subtle, #1e1e24);
	}

	.coeff-label {
		font-weight: 600;
		color: var(--text-primary, #f4f4f5);
		font-size: 0.95rem;
	}

	.input-mode-toggle {
		display: inline-flex;
		background: var(--bg-elevated, #18181b);
		border-radius: 6px;
		padding: 2px;
		gap: 2px;
	}

	.toggle-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary, #a1a1aa);
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toggle-btn:hover {
		color: var(--text-primary, #f4f4f5);
	}

	.toggle-btn.active {
		background: var(--primary, #06b6d4);
		color: #000;
		font-weight: 600;
	}

	.toggle-btn:focus-visible {
		outline: 2px solid var(--primary, #06b6d4);
		outline-offset: 1px;
	}

	.fraction-builder-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		align-items: center;
	}

	.fraction-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		background: var(--bg-elevated, #18181b);
		border-radius: 6px;
		padding: 0.5rem;
		border: 1px dashed var(--border-subtle, #27272a);
	}

	.fraction-field {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.field-tag {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary, #71717a);
	}

	.fraction-line {
		width: 80%;
		height: 2px;
		background: var(--text-secondary, #a1a1aa);
		border-radius: 1px;
	}

	.multiplier-column {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.direct-input-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
		color: var(--text-secondary, #a1a1aa);
	}

	.coeff-preview {
		background: var(--bg-surface, #09090b);
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border-subtle, #1e1e24);
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.85rem;
	}

	.preview-title {
		color: var(--text-tertiary, #71717a);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.text-input {
		background: var(--bg-surface, #09090b);
		border: 1px solid var(--border-color, #27272a);
		color: var(--text-primary, #f4f4f5);
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
		width: 100%;
		box-sizing: border-box;
	}

	.text-input:focus {
		border-color: var(--primary, #06b6d4);
		outline: none;
	}

	.text-input.fraction-input {
		text-align: center;
		font-family: monospace;
	}

	.text-input.mono {
		font-family: monospace;
	}

	.select-input {
		background: var(--bg-surface, #09090b);
		border: 1px solid var(--border-color, #27272a);
		color: var(--text-primary, #f4f4f5);
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
		width: 100%;
		cursor: pointer;
	}

	.select-input:focus {
		border-color: var(--primary, #06b6d4);
		outline: none;
	}

	.custom-mult-input {
		font-family: monospace;
	}

	.flex-grow {
		flex-grow: 1;
	}

	/* ── Mobile media query (≤480px) ─────────────────────────────────────────── */
	@media (max-width: 480px) {
		.fraction-builder-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
