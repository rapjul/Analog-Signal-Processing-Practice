<script lang="ts">
	/**
	 * FourierSeriesInput Svelte 5 Component.
	 *
	 * Structured Form Builder for Fourier Series representations.
	 * Allows students and users to build Fourier coefficients (a0, an, bn, cn)
	 * using intuitive Numerator/Denominator fraction inputs and Harmonics selectors
	 * without requiring manual LaTeX coding. Includes live LaTeX preview cards.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import MathInline from "./MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import MathText from "./MathText.svelte";

	export type FourierFormMode = "trigonometric" | "exponential";
	export type CoeffInputMode = "zero" | "fraction" | "direct";
	export type HarmonicOption = "none" | "odd" | "even" | "alt" | "custom";

	interface Props {
		/** Initial or current LaTeX string */
		value?: string;
		/** Callback triggered when synthesized LaTeX string changes */
		onChange?: (latex: string) => void;
	}

	// biome-ignore lint/correctness/noUnusedVariables: Used in template.
	let { value = "", onChange }: Props = $props();

	/** Active Fourier representation mode tab */
	let mode = $state<FourierFormMode>("trigonometric");

	/** Global Fundamental Frequency omega0 */
	let omega0 = $state("1");

	/** DC Offset inputs */
	let a0 = $state("0");
	let c0 = $state("0");

	// --- Structured Coefficients State ---

	// Cosine coefficient a_n
	let anMode = $state<CoeffInputMode>("zero");
	let anNum = $state("2");
	let anDen = $state("n pi");
	let anHarmonic = $state<HarmonicOption>("odd");
	let anCustomHarmonic = $state("");
	let anDirect = $state("0");

	// Sine coefficient b_n
	let bnMode = $state<CoeffInputMode>("fraction");
	let bnNum = $state("2");
	let bnDen = $state("n pi");
	let bnHarmonic = $state<HarmonicOption>("odd");
	let bnCustomHarmonic = $state("");
	let bnDirect = $state("\\frac{2}{n \\pi} (1 - (-1)^n)");

	// Complex exponential coefficient c_n
	let cnMode = $state<CoeffInputMode>("fraction");
	let cnNum = $state("1");
	let cnDen = $state("j n pi");
	let cnHarmonic = $state<HarmonicOption>("none");
	let cnCustomHarmonic = $state("");
	let cnDirect = $state("\\frac{1}{j n \\pi}");

	/**
	 * Converts simple math symbols and normalizes backslashes in user input into valid LaTeX syntax.
	 * Handles pi, \pi, \\pi, w0, omega, \omega, etc. seamlessly.
	 * @param {string} raw Raw user input string
	 * @returns {string} Sanitized LaTeX string
	 */
	function formatMathLatex(raw: string): string {
		if (!raw) return "";
		return raw
			.trim()
			.replace(/\*/g, " ")
			.replace(/\\{2,}/g, "\\")
			.replace(/\\?\bpi\b/g, "\\pi")
			.replace(/\\?\bomega_0\b/g, "\\omega_0")
			.replace(/\\?\bomega\b/g, "\\omega")
			.replace(/\bw0\b/g, "\\omega_0");
	}

	/**
	 * Computes synthesized LaTeX for an individual coefficient.
	 * @param {CoeffInputMode} inputMode Selected input mode
	 * @param {string} num Numerator string
	 * @param {string} den Denominator string
	 * @param {HarmonicOption} harmonic Selected harmonic multiplier
	 * @param {string} customHarmonic Custom harmonic multiplier
	 * @param {string} directVal Direct freehand LaTeX value
	 * @returns {string} Coefficient LaTeX string
	 */
	function buildCoeffLatex(
		inputMode: CoeffInputMode,
		num: string,
		den: string,
		harmonic: HarmonicOption,
		customHarmonic: string,
		directVal: string,
	): string {
		if (inputMode === "zero") return "0";
		if (inputMode === "direct") return directVal.trim() || "0";

		// Structured Fraction mode
		const cleanNum = formatMathLatex(num) || "1";
		const cleanDen = formatMathLatex(den) || "1";

		const frac =
			cleanDen === "1" ? cleanNum : `\\frac{${cleanNum}}{${cleanDen}}`;

		let multiplier = "";
		if (harmonic === "odd") {
			multiplier = "(1 - (-1)^n)";
		} else if (harmonic === "even") {
			multiplier = "(1 + (-1)^n)";
		} else if (harmonic === "alt") {
			multiplier = "(-1)^n";
		} else if (harmonic === "custom" && customHarmonic.trim()) {
			multiplier = formatMathLatex(customHarmonic);
		}

		if (multiplier) {
			return `${frac} ${multiplier}`;
		}
		return frac;
	}

	/** Derived reactive LaTeX strings for coefficients */
	let anLatex = $derived(
		buildCoeffLatex(
			anMode,
			anNum,
			anDen,
			anHarmonic,
			anCustomHarmonic,
			anDirect,
		),
	);

	let bnLatex = $derived(
		buildCoeffLatex(
			bnMode,
			bnNum,
			bnDen,
			bnHarmonic,
			bnCustomHarmonic,
			bnDirect,
		),
	);

	let cnLatex = $derived(
		buildCoeffLatex(
			cnMode,
			cnNum,
			cnDen,
			cnHarmonic,
			cnCustomHarmonic,
			cnDirect,
		),
	);

	/**
	 * Synthesizes LaTeX for Trigonometric Fourier Series.
	 * @returns {string} Trigonometric Fourier series LaTeX
	 */
	function synthesizeTrig(): string {
		const cleanA0 = a0.trim();
		const cleanAn = anLatex.trim();
		const cleanBn = bnLatex.trim();
		const w0 = formatMathLatex(omega0) || "\\omega_0";

		let cosTerm = "";
		if (cleanAn && cleanAn !== "0") {
			cosTerm = `${cleanAn} \\cos(${w0} n t)`;
		}

		let sinTerm = "";
		if (cleanBn && cleanBn !== "0") {
			sinTerm = `${cleanBn} \\sin(${w0} n t)`;
		}

		let sumContent = "";
		if (cosTerm && sinTerm) {
			sumContent = `${cosTerm} + ${sinTerm}`;
		} else if (cosTerm) {
			sumContent = cosTerm;
		} else if (sinTerm) {
			sumContent = sinTerm;
		}

		const sumPart = sumContent
			? `\\sum_{n=1}^{\\infty} \\left[ ${sumContent} \\right]`
			: "";

		if (cleanA0 && cleanA0 !== "0") {
			return sumPart ? `${cleanA0} + ${sumPart}` : cleanA0;
		}

		return sumPart || "0";
	}

	/**
	 * Synthesizes LaTeX for Exponential Fourier Series.
	 * @returns {string} Exponential Fourier series LaTeX
	 */
	function synthesizeExp(): string {
		const cleanC0 = c0.trim();
		const cleanCn = cnLatex.trim();
		const w0 = formatMathLatex(omega0) || "\\omega_0";

		const sumPart =
			cleanCn && cleanCn !== "0"
				? `\\sum_{n=-\\infty, n \\neq 0}^{\\infty} \\left( ${cleanCn} \\right) e^{j n ${w0} t}`
				: "";

		if (cleanC0 && cleanC0 !== "0") {
			return sumPart ? `${cleanC0} + ${sumPart}` : cleanC0;
		}

		return sumPart || "0";
	}

	/**
	 * Synthesizes full LaTeX based on active mode tab.
	 * @returns {string} Synthesized LaTeX
	 */
	function synthesizeLatex(): string {
		if (mode === "trigonometric") {
			return synthesizeTrig();
		}
		return synthesizeExp();
	}

	/**
	 * Triggers parent update callback.
	 */
	function updateValue() {
		const latex = synthesizeLatex();
		if (onChange) {
			onChange(latex);
		}
	}

	$effect(() => {
		updateValue();
	});
</script>

<div class="fourier-builder">
	<!-- Mode Switcher Tabs -->
	<div class="mode-tabs">
		<button
			type="button"
			class="mode-btn"
			class:active={mode === "trigonometric"}
			onclick={() => {
				mode = "trigonometric";
				updateValue();
			}}
		>
			<MathText text={"Trigonometric Series ($a_0, a_n, b_n$)"} />
		</button>
		<button
			type="button"
			class="mode-btn"
			class:active={mode === "exponential"}
			onclick={() => {
				mode = "exponential";
				updateValue();
			}}
		>
			<MathText text={"Complex Exponential Series ($c_n$)"} />
		</button>
	</div>

	<!-- General Parameters: Fundamental Frequency & DC Offset -->
	<div class="global-params-card">
		<div class="param-item">
			<label for="w0-input">
				<MathText
					text={String.raw`Fundamental Frequency $\omega_0$:`}
				/>
			</label>
			<input
				id="w0-input"
				type="text"
				class="text-input sm"
				bind:value={omega0}
				oninput={updateValue}
				placeholder="1"
			/>
		</div>

		{#if mode === "trigonometric"}
			<div class="param-item">
				<label for="a0-input">
					<MathText text={"DC Offset $a_0$:"} />
				</label>
				<input
					id="a0-input"
					type="text"
					class="text-input sm"
					bind:value={a0}
					oninput={updateValue}
					placeholder="0"
				/>
			</div>
		{:else}
			<div class="param-item">
				<label for="c0-input">
					<MathText text={"DC Offset $c_0$:"} />
				</label>
				<input
					id="c0-input"
					type="text"
					class="text-input sm"
					bind:value={c0}
					oninput={updateValue}
					placeholder="0"
				/>
			</div>
		{/if}
	</div>

	<!-- Form Inputs Grid -->
	<div class="inputs-grid">
		{#if mode === "trigonometric"}
			<!-- Cosine Coefficient an Builder -->
			<div class="coeff-card">
				<div class="coeff-header">
					<span class="coeff-label">
						<MathText text={"Cosine Coefficient $a_n$"} />
					</span>
					<div class="input-mode-toggle">
						<button
							type="button"
							class="toggle-btn"
							class:active={anMode === "zero"}
							onclick={() => {
								anMode = "zero";
								updateValue();
							}}
						>
							Zero (0)
						</button>
						<button
							type="button"
							class="toggle-btn"
							class:active={anMode === "fraction"}
							onclick={() => {
								anMode = "fraction";
								updateValue();
							}}
						>
							🧱 Fraction Builder
						</button>
						<button
							type="button"
							class="toggle-btn"
							class:active={anMode === "direct"}
							onclick={() => {
								anMode = "direct";
								updateValue();
							}}
						>
							✍️ Freehand
						</button>
					</div>
				</div>

				{#if anMode === "fraction"}
					<div class="fraction-builder-grid">
						<div class="fraction-column">
							<div class="fraction-field">
								<span class="field-tag">Numerator</span>
								<input
									type="text"
									class="text-input fraction-input"
									bind:value={anNum}
									oninput={updateValue}
									placeholder="e.g. 4 or 2"
								/>
							</div>
							<div class="fraction-line"></div>
							<div class="fraction-field">
								<span class="field-tag">Denominator</span>
								<input
									type="text"
									class="text-input fraction-input"
									bind:value={anDen}
									oninput={updateValue}
									placeholder="e.g. n \pi or n^2 \pi^2"
								/>
							</div>
						</div>

						<div class="multiplier-column">
							<span class="field-tag">
								Harmonics / Parity Factor
							</span>
							<select
								class="select-input"
								bind:value={anHarmonic}
								onchange={updateValue}
							>
								<option value="none">None (1)</option>
								<option value="odd">
									Odd Harmonics: (1 - (-1)^n)
								</option>
								<option value="even">
									Even Harmonics: (1 + (-1)^n)
								</option>
								<option value="alt">
									Alternating Signs: (-1)^n
								</option>
								<option value="custom">
									Custom Multiplier...
								</option>
							</select>

							{#if anHarmonic === "custom"}
								<input
									type="text"
									class="text-input custom-mult-input"
									bind:value={anCustomHarmonic}
									oninput={updateValue}
									placeholder="e.g. \sin(n \pi / 2)"
								/>
							{/if}
						</div>
					</div>
				{:else if anMode === "direct"}
					<div class="direct-input-row">
						<label for="an-direct-input">LaTeX / Expression:</label>
						<input
							id="an-direct-input"
							type="text"
							class="text-input mono flex-grow"
							bind:value={anDirect}
							oninput={updateValue}
							placeholder="e.g. 2 / (n \pi)"
						/>
					</div>
				{/if}

				<!-- Live Rendered Coefficient Card -->
				<div class="coeff-preview">
					<span class="preview-title">Built Expression:</span>
					<MathInline
						math={`a_n = ${anLatex}`}
						displayStyle
					/>
				</div>
			</div>

			<!-- Sine Coefficient bn Builder -->
			<div class="coeff-card">
				<div class="coeff-header">
					<span class="coeff-label">
						<MathText text={"Sine Coefficient $b_n$"} />
					</span>
					<div class="input-mode-toggle">
						<button
							type="button"
							class="toggle-btn"
							class:active={bnMode === "zero"}
							onclick={() => {
								bnMode = "zero";
								updateValue();
							}}
						>
							Zero (0)
						</button>
						<button
							type="button"
							class="toggle-btn"
							class:active={bnMode === "fraction"}
							onclick={() => {
								bnMode = "fraction";
								updateValue();
							}}
						>
							🧱 Fraction Builder
						</button>
						<button
							type="button"
							class="toggle-btn"
							class:active={bnMode === "direct"}
							onclick={() => {
								bnMode = "direct";
								updateValue();
							}}
						>
							✍️ Freehand
						</button>
					</div>
				</div>

				{#if bnMode === "fraction"}
					<div class="fraction-builder-grid">
						<div class="fraction-column">
							<div class="fraction-field">
								<span class="field-tag">Numerator</span>
								<input
									type="text"
									class="text-input fraction-input"
									bind:value={bnNum}
									oninput={updateValue}
									placeholder="e.g. 2 or 4"
								/>
							</div>
							<div class="fraction-line"></div>
							<div class="fraction-field">
								<span class="field-tag">Denominator</span>
								<input
									type="text"
									class="text-input fraction-input"
									bind:value={bnDen}
									oninput={updateValue}
									placeholder="e.g. n \pi"
								/>
							</div>
						</div>

						<div class="multiplier-column">
							<span class="field-tag">
								Harmonics / Parity Factor
							</span>
							<select
								class="select-input"
								bind:value={bnHarmonic}
								onchange={updateValue}
							>
								<option value="none">None (1)</option>
								<option value="odd">
									Odd Harmonics: (1 - (-1)^n)
								</option>
								<option value="even">
									Even Harmonics: (1 + (-1)^n)
								</option>
								<option value="alt">
									Alternating Signs: (-1)^n
								</option>
								<option value="custom">
									Custom Multiplier...
								</option>
							</select>

							{#if bnHarmonic === "custom"}
								<input
									type="text"
									class="text-input custom-mult-input"
									bind:value={bnCustomHarmonic}
									oninput={updateValue}
									placeholder="e.g. \sin(n \pi / 2)"
								/>
							{/if}
						</div>
					</div>
				{:else if bnMode === "direct"}
					<div class="direct-input-row">
						<label for="bn-direct-input">LaTeX / Expression:</label>
						<input
							id="bn-direct-input"
							type="text"
							class="text-input mono flex-grow"
							bind:value={bnDirect}
							oninput={updateValue}
							placeholder="e.g. 2 / (n \pi)"
						/>
					</div>
				{/if}

				<!-- Live Rendered Coefficient Card -->
				<div class="coeff-preview">
					<span class="preview-title">Built Expression:</span>
					<MathInline
						math={`b_n = ${bnLatex}`}
						displayStyle
					/>
				</div>
			</div>
		{:else}
			<!-- Exponential Coefficient cn Builder -->
			<div class="coeff-card">
				<div class="coeff-header">
					<span class="coeff-label">
						<MathText
							text={"Complex Exponential Coefficient $c_n$"}
						/>
					</span>
					<div class="input-mode-toggle">
						<button
							type="button"
							class="toggle-btn"
							class:active={cnMode === "zero"}
							onclick={() => {
								cnMode = "zero";
								updateValue();
							}}
						>
							Zero (0)
						</button>
						<button
							type="button"
							class="toggle-btn"
							class:active={cnMode === "fraction"}
							onclick={() => {
								cnMode = "fraction";
								updateValue();
							}}
						>
							🧱 Fraction Builder
						</button>
						<button
							type="button"
							class="toggle-btn"
							class:active={cnMode === "direct"}
							onclick={() => {
								cnMode = "direct";
								updateValue();
							}}
						>
							✍️ Freehand
						</button>
					</div>
				</div>

				{#if cnMode === "fraction"}
					<div class="fraction-builder-grid">
						<div class="fraction-column">
							<div class="fraction-field">
								<span class="field-tag">Numerator</span>
								<input
									type="text"
									class="text-input fraction-input"
									bind:value={cnNum}
									oninput={updateValue}
									placeholder="e.g. 1 or A"
								/>
							</div>
							<div class="fraction-line"></div>
							<div class="fraction-field">
								<span class="field-tag">Denominator</span>
								<input
									type="text"
									class="text-input fraction-input"
									bind:value={cnDen}
									oninput={updateValue}
									placeholder="e.g. j n \pi"
								/>
							</div>
						</div>

						<div class="multiplier-column">
							<span class="field-tag">
								Harmonics / Parity Factor
							</span>
							<select
								class="select-input"
								bind:value={cnHarmonic}
								onchange={updateValue}
							>
								<option value="none">None (1)</option>
								<option value="odd">
									Odd Harmonics: (1 - (-1)^n)
								</option>
								<option value="even">
									Even Harmonics: (1 + (-1)^n)
								</option>
								<option value="alt">
									Alternating Signs: (-1)^n
								</option>
								<option value="custom">
									Custom Multiplier...
								</option>
							</select>

							{#if cnHarmonic === "custom"}
								<input
									type="text"
									class="text-input custom-mult-input"
									bind:value={cnCustomHarmonic}
									oninput={updateValue}
									placeholder="e.g. \sin(n \pi / 2)"
								/>
							{/if}
						</div>
					</div>
				{:else if cnMode === "direct"}
					<div class="direct-input-row">
						<label for="cn-direct-input">LaTeX / Expression:</label>
						<input
							id="cn-direct-input"
							type="text"
							class="text-input mono flex-grow"
							bind:value={cnDirect}
							oninput={updateValue}
							placeholder="e.g. 1 / (j n \pi)"
						/>
					</div>
				{/if}

				<!-- Live Rendered Coefficient Card -->
				<div class="coeff-preview">
					<span class="preview-title">Built Expression:</span>
					<MathInline
						math={`c_n = ${cnLatex}`}
						displayStyle
					/>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.fourier-builder {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	.mode-tabs {
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

	.global-params-card {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.6rem 0.75rem;
		align-items: center;
	}

	.param-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
	}

	label {
		color: var(--text-muted);
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.inputs-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.coeff-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.coeff-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-bottom: 0.35rem;
		border-bottom: 1px dashed var(--border-color);
	}

	.coeff-label {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--accent-primary);
	}

	.input-mode-toggle {
		display: flex;
		gap: 0.25rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.15rem;
	}

	.toggle-btn {
		background: transparent;
		color: var(--text-muted);
		border: none;
		padding: 0.2rem 0.45rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.toggle-btn:hover,
	.toggle-btn:focus-visible {
		color: var(--text-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 1px;
	}

	.toggle-btn.active {
		background: var(--accent-primary);
		color: #000;
	}

	.fraction-builder-grid {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) minmax(200px, 1fr);
		gap: 1rem;
		align-items: center;
	}

	@media (max-width: 600px) {
		.fraction-builder-grid {
			grid-template-columns: 1fr;
		}
	}

	.fraction-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.5rem;
	}

	.fraction-field {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
	}

	.field-tag {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		min-width: 75px;
	}

	.fraction-line {
		width: 100%;
		height: 2px;
		background: var(--border-color);
		margin: 0.15rem 0;
	}

	.multiplier-column {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.select-input {
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.35rem 0.5rem;
		font-size: 0.82rem;
		cursor: pointer;
	}

	.select-input:focus {
		border-color: var(--accent-primary);
	}

	.select-input:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.text-input {
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.3rem 0.5rem;
		font-size: 0.85rem;
		min-width: 0;
	}

	.text-input.mono {
		font-family: var(--font-mono);
	}

	.text-input.sm {
		width: 75px;
		text-align: center;
	}

	.text-input.fraction-input {
		flex: 1;
		width: 100%;
		font-family: var(--font-mono);
	}

	.text-input.custom-mult-input {
		width: 100%;
		font-family: var(--font-mono);
	}

	.text-input:focus {
		border-color: var(--accent-primary);
	}

	.text-input:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.direct-input-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.flex-grow {
		flex: 1;
	}

	.coeff-preview {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: var(--bg-secondary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.6rem 0.85rem;
		overflow-x: auto;
	}

	.preview-title {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}
</style>
