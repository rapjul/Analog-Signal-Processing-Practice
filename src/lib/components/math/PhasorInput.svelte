<script lang="ts">
	/**
	 * PhasorInput Svelte 5 Component.
	 * Form builder for AC steady-state phasors and sinusoidal signals.
	 * Formatted with KaTeX for all mathematical symbols and expressions.
	 */
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import MathText from "./MathText.svelte";

	export type PhasorFormMode = "polar" | "time_domain" | "rectangular";

	interface Props {
		/** Initial or current LaTeX string */
		value?: string;
		/** Callback triggered when synthesized LaTeX string changes */
		onChange?: (latex: string) => void;
	}

	// biome-ignore lint/correctness/noUnusedVariables: Used in template.
	let { value = "", onChange }: Props = $props();

	/** Active mode tab */
	let mode = $state<PhasorFormMode>("polar");

	/** Polar inputs state */
	let mag = $state("10");
	let angleDeg = $state("45");
	let polarNotation = $state<"angle_symbol" | "exp_j">("angle_symbol");

	/** Time domain inputs state */
	let amp = $state("10");
	let omega = $state("100\\pi");
	let phaseStr = $state("45^\\circ");

	/** Rectangular inputs state */
	let realPart = $state("7.07");
	let imagPart = $state("7.07");

	// MathText formula constants for UI labels
	// biome-ignore lint/correctness/noUnusedVariables: Used in template.
	const polarMath = "|V| \\angle \\theta^\\circ";
	// biome-ignore lint/correctness/noUnusedVariables: Used in template.
	const timeDomainMath = "A \\cos(\\omega t + \\phi)";
	// biome-ignore lint/correctness/noUnusedVariables: Used in template.
	const rectangularMath = "X + jY";

	/**
	 * Computes polar notation string based on user inputs.
	 * @returns {string} Formatted LaTeX polar expression
	 */
	function getPolarLatex(): string {
		const m = mag || "1";
		const a = angleDeg || "0";
		if (polarNotation === "exp_j") {
			return `${m} e^{j ${a}^\\circ}`;
		}
		return `${m} \\angle ${a}^\\circ`;
	}

	/**
	 * Computes time domain cosine expression based on user inputs.
	 * @returns {string} Formatted LaTeX time-domain expression
	 */
	function getTimeDomainLatex(): string {
		const a = amp || "1";
		const w = omega || "\\omega";
		const p = phaseStr.trim();
		const pFormatted =
			p.startsWith("+") || p.startsWith("-") ? p : `+ ${p}`;
		return `${a} \\cos(${w} t ${p ? pFormatted : ""})`;
	}

	/**
	 * Computes rectangular complex form based on user inputs.
	 * @returns {string} Formatted LaTeX rectangular complex expression
	 */
	function getRectangularLatex(): string {
		const re = realPart || "0";
		const im = imagPart.trim();
		if (!im || im === "0") return re;
		const sign = im.startsWith("-") ? "- " : "+ ";
		const absIm = im.startsWith("-") ? im.slice(1).trim() : im;
		return `${re} ${sign} j${absIm}`;
	}

	// Derived current synthesized LaTeX expression
	let synthesizedLatex = $derived.by(() => {
		if (mode === "polar") return getPolarLatex();
		if (mode === "time_domain") return getTimeDomainLatex();
		return getRectangularLatex();
	});

	/**
	 * Notifies parent of updated LaTeX expression whenever inputs change.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function updateValue(): void {
		const res = synthesizedLatex;
		if (onChange) onChange(res);
	}
</script>

<div class="phasor-builder">
	<div class="builder-header">
		<span class="builder-title">Phasor & AC Steady-State Builder</span>
	</div>

	<!-- Mode Selector Tabs -->
	<div class="mode-selector">
		<button
			type="button"
			class="mode-btn"
			class:active={mode === "polar"}
			onclick={() => {
				mode = "polar";
				updateValue();
			}}
		>
			<MathText
				text={String.raw`Polar Form ($|V| \angle \theta^\circ$)`}
			/>
		</button>
		<button
			type="button"
			class="mode-btn"
			class:active={mode === "time_domain"}
			onclick={() => {
				mode = "time_domain";
				updateValue();
			}}
		>
			<MathText
				text={String.raw`Time Domain $A \cos(\omega t + \phi)$`}
			/>
		</button>
		<button
			type="button"
			class="mode-btn"
			class:active={mode === "rectangular"}
			onclick={() => {
				mode = "rectangular";
				updateValue();
			}}
		>
			<MathText text={"Rectangular Form ($X + jY$)"} />
		</button>
	</div>

	<!-- Dynamic Inputs Grid -->
	<div class="inputs-grid">
		{#if mode === "polar"}
			<div class="input-card">
				<span class="card-label">Polar Phasor Input</span>
				<div class="fields-grid">
					<div class="field">
						<label for="mag-input">
							<MathText text={"Magnitude $|V|$:"} />
						</label>
						<input
							id="mag-input"
							type="text"
							class="text-input sm"
							bind:value={mag}
							oninput={updateValue}
							placeholder="10"
						/>
					</div>

					<div class="field">
						<label for="angle-input">
							<MathText
								text={String.raw`Phase Angle $\theta^\circ$:`}
							/>
						</label>
						<input
							id="angle-input"
							type="text"
							class="text-input sm"
							bind:value={angleDeg}
							oninput={updateValue}
							placeholder="45"
						/>
					</div>

					<div class="field">
						<label for="notation-select">Format:</label>
						<select
							id="notation-select"
							class="select-input"
							bind:value={polarNotation}
							onchange={updateValue}
						>
							<option value="angle_symbol">
								Angle Symbol (|V| angle theta)
							</option>
							<option value="exp_j">
								Exponential (|V| e^(j theta))
							</option>
						</select>
					</div>
				</div>
			</div>
		{:else if mode === "time_domain"}
			<div class="input-card">
				<span class="card-label">Time-Domain Cosine Sinusoid</span>
				<div class="fields-grid">
					<div class="field">
						<label for="amp-input">
							<MathText text={"Amplitude $A$:"} />
						</label>
						<input
							id="amp-input"
							type="text"
							class="text-input sm"
							bind:value={amp}
							oninput={updateValue}
							placeholder="10"
						/>
					</div>

					<div class="field">
						<label for="omega-input">
							<MathText text={String.raw`Freq $\omega$:`} />
						</label>
						<input
							id="omega-input"
							type="text"
							class="text-input sm"
							bind:value={omega}
							oninput={updateValue}
							placeholder="100\pi"
						/>
					</div>

					<div class="field">
						<label for="phase-input">
							<MathText text={String.raw`Phase Shift $\phi$:`} />
						</label>
						<input
							id="phase-input"
							type="text"
							class="text-input sm"
							bind:value={phaseStr}
							oninput={updateValue}
							placeholder="45^\circ"
						/>
					</div>
				</div>
			</div>
		{:else if mode === "rectangular"}
			<div class="input-card">
				<span class="card-label">Rectangular Complex Phasor</span>
				<div class="fields-grid">
					<div class="field">
						<label for="re-input">
							<MathText text={"Real Part $X$:"} />
						</label>
						<input
							id="re-input"
							type="text"
							class="text-input sm"
							bind:value={realPart}
							oninput={updateValue}
							placeholder="7.07"
						/>
					</div>

					<div class="field">
						<label for="im-input">
							<MathText text={"Imag Part $Y$ ($j$):"} />
						</label>
						<input
							id="im-input"
							type="text"
							class="text-input sm"
							bind:value={imagPart}
							oninput={updateValue}
							placeholder="7.07"
						/>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.phasor-builder {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	.builder-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--border-color);
	}

	.builder-title {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--accent-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.mode-selector {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.mode-btn {
		background: var(--bg-card);
		color: var(--text-muted);
		border: 1px solid var(--border-color);
		padding: 0.35rem 0.65rem;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.mode-btn:hover,
	.mode-btn:focus-visible {
		color: var(--text-primary);
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.mode-btn.active {
		background: var(--accent-primary);
		color: #000;
		border-color: var(--accent-primary);
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.mode-btn.active:focus-visible {
		outline: 2px solid var(--text-primary);
		outline-offset: 2px;
		box-shadow: 0 0 14px var(--accent-glow);
	}

	.inputs-grid {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.input-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.card-label {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--accent-primary);
	}

	.fields-grid {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
	}

	label {
		color: var(--text-muted);
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.text-input,
	.select-input {
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.5rem;
		font-size: 0.85rem;
	}

	.text-input.sm {
		width: 80px;
		text-align: center;
	}

	.text-input:focus,
	.select-input:focus {
		border-color: var(--accent-primary);
	}

	.text-input:focus-visible,
	.select-input:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}
</style>
