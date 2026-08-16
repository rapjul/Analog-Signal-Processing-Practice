<script lang="ts">
	/**
	 * PoleZeroInput Svelte 5 Component.
	 *
	 * Form builder for Laplace transform transfer functions H(s), s-plane poles/zeros,
	 * and partial fraction decomposition expressions.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte template
	import MathInline from "./MathInline.svelte";

	export type BuilderSubMode = "rational" | "partial_fractions";

	export interface PfdTerm {
		/** Unique identifier for row rendering */
		id: string;
		/** Term type */
		type: "simple" | "repeated" | "quadratic";
		/** Residue / Numerator coefficient A or B */
		numA: string;
		/** Numerator offset coefficient C for quadratic terms */
		numC: string;
		/** Pole value or denominator polynomial (e.g. "-2", "s^2+4s+13") */
		poleOrDenom: string;
		/** Power order for repeated poles (e.g. "2") */
		power: string;
	}

	interface Props {
		/** Initial or current LaTeX string */
		value?: string;
		/** Callback triggered when synthesized LaTeX string changes */
		onChange?: (latex: string) => void;
	}

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let { value = "", onChange }: Props = $props();

	/** Sub-mode selector */
	let subMode = $state<BuilderSubMode>("rational");

	/** Rational form state */
	let gain = $state("1");
	let zerosStr = $state("0");
	let polesStr = $state("-1, -2");

	/** Partial fractions terms state */
	let pfdTerms = $state<PfdTerm[]>([
		{
			id: "1",
			type: "simple",
			numA: "5",
			numC: "0",
			poleOrDenom: "-2",
			power: "1",
		},
		{
			id: "2",
			type: "simple",
			numA: "-4",
			numC: "0",
			poleOrDenom: "-3",
			power: "1",
		},
	]);

	/**
	 * Generates a unique ID string.
	 * @returns {string} Unique ID
	 */
	function generateId(): string {
		return Math.random().toString(36).substring(2, 9);
	}

	/**
	 * Formats a pole factor term into LaTeX (e.g. -2 -> (s + 2), 2 -> (s - 2), 0 -> s).
	 * @param {string} pStr Raw pole/zero string
	 * @returns {string} LaTeX factor
	 */
	function formatFactor(pStr: string): string {
		const val = pStr.trim();
		if (!val || val === "0") return "s";

		if (val.startsWith("-")) {
			const positive = val.substring(1).trim();
			return `(s + ${positive})`;
		}
		return `(s - ${val})`;
	}

	/**
	 * Synthesizes LaTeX for rational pole-zero transfer function H(s).
	 * @returns {string} Rational H(s) LaTeX
	 */
	function synthesizeRational(): string {
		const cleanGain = gain.trim();
		const rawZeros = zerosStr
			.split(",")
			.map((z) => z.trim())
			.filter(Boolean);
		const rawPoles = polesStr
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean);

		const numeratorFactors = rawZeros.map(formatFactor).join("");
		const denominatorFactors = rawPoles.map(formatFactor).join("");

		let numPart = numeratorFactors || "1";
		if (cleanGain && cleanGain !== "1") {
			if (cleanGain === "-1") {
				numPart = numeratorFactors ? `-${numeratorFactors}` : "-1";
			} else {
				numPart = numeratorFactors
					? `${cleanGain} ${numeratorFactors}`
					: cleanGain;
			}
		}

		const denPart = denominatorFactors || "1";

		if (denPart === "1") {
			return numPart;
		}

		return `\\frac{${numPart}}{${denPart}}`;
	}

	/**
	 * Synthesizes LaTeX for partial fraction decomposition terms.
	 * @returns {string} PFD sum LaTeX
	 */
	function synthesizePfd(): string {
		if (pfdTerms.length === 0) return "0";

		return pfdTerms
			.map((term, index) => {
				let termLatex = "";

				if (term.type === "simple") {
					const den = formatFactor(term.poleOrDenom);
					termLatex = `\\frac{${term.numA || "1"}}{${den}}`;
				} else if (term.type === "repeated") {
					const baseDen = formatFactor(term.poleOrDenom);
					const pow = term.power.trim() || "2";
					termLatex = `\\frac{${term.numA || "1"}}{${baseDen}^{${pow}}}`;
				} else if (term.type === "quadratic") {
					const num =
						term.numC && term.numC !== "0"
							? `${term.numA || "1"}s + ${term.numC}`
							: `${term.numA || "1"}s`;
					const den = term.poleOrDenom || "s^2 + 2s + 5";
					termLatex = `\\frac{${num}}{${den}}`;
				}

				if (index === 0) {
					return termLatex;
				}

				if (termLatex.startsWith("-")) {
					return termLatex;
				}
				return `+ ${termLatex}`;
			})
			.join(" ");
	}

	/**
	 * Synthesizes full LaTeX output string based on active sub-mode.
	 * @returns {string} Output LaTeX
	 */
	function synthesizeLatex(): string {
		if (subMode === "rational") {
			return synthesizeRational();
		}
		return synthesizePfd();
	}

	/**
	 * Adds a new PFD row to state.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function addPfdTerm() {
		pfdTerms.push({
			id: generateId(),
			type: "simple",
			numA: "1",
			numC: "0",
			poleOrDenom: "-1",
			power: "1",
		});
		updateValue();
	}

	/**
	 * Removes a PFD row by ID.
	 * @param {string} id Row ID
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function removePfdTerm(id: string) {
		if (pfdTerms.length <= 1) return;
		pfdTerms = pfdTerms.filter((t) => t.id !== id);
		updateValue();
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

<div class="pole-zero-builder">
	<div class="builder-header">
		<span class="builder-title">Laplace / Transfer Function Builder</span>
	</div>

	<!-- Submode Selector -->
	<div class="submode-selector">
		<button
			type="button"
			class="submode-btn"
			class:active={subMode === "rational"}
			onclick={() => {
				subMode = "rational";
				updateValue();
			}}
		>
			Poles & Zeros Form <MathInline math={"H(s)"} />
		</button>
		<button
			type="button"
			class="submode-btn"
			class:active={subMode === "partial_fractions"}
			onclick={() => {
				subMode = "partial_fractions";
				updateValue();
			}}
		>
			Partial Fractions Form <MathInline
				math={"\\sum \\frac{A_i}{s - p_i}"}
			/>
		</button>
	</div>

	{#if subMode === "rational"}
		<!-- Rational Form Inputs -->
		<div class="form-section">
			<div class="field-row">
				<label for="gain-input">Gain <MathInline math={"K"} />:</label>
				<input
					id="gain-input"
					type="text"
					class="text-input sm"
					bind:value={gain}
					oninput={updateValue}
					placeholder="1"
				/>
			</div>

			<div class="field-row flex-grow">
				<label for="zeros-input">Zeros (comma separated):</label>
				<input
					id="zeros-input"
					type="text"
					class="text-input mono"
					bind:value={zerosStr}
					oninput={updateValue}
					placeholder="e.g. 0, -2 (or leave empty for none)"
				/>
			</div>

			<div class="field-row flex-grow">
				<label for="poles-input">Poles (comma separated):</label>
				<input
					id="poles-input"
					type="text"
					class="text-input mono"
					bind:value={polesStr}
					oninput={updateValue}
					placeholder="e.g. -1, -3"
				/>
			</div>
		</div>
	{:else}
		<!-- Partial Fraction Decomposition Terms -->
		<div class="pfd-section">
			<div class="section-top">
				<span class="section-title">Partial Fraction Terms</span>
				<button
					type="button"
					class="add-term-btn"
					onclick={addPfdTerm}
				>
					+ Add Term
				</button>
			</div>

			<div class="terms-list">
				{#each pfdTerms as term, index (term.id)}
					<div class="pfd-term-row">
						<span class="term-num">#{index + 1}</span>

						<!-- Term Type Selector -->
						<div class="field">
							<label for="term-type-{term.id}"> Type:</label>
							<select
								id="term-type-{term.id}"
								class="select-input"
								bind:value={term.type}
								onchange={updateValue}
							>
								<option value="simple"> A / (s - p) </option>
								<option value="repeated">
									A / (s - p)^k
								</option>
								<option value="quadratic">
									(B s + C) / (s^2 + b s + c)
								</option>
							</select>
						</div>

						<!-- Numerator Input -->
						<div class="field">
							<label for="num-a-{term.id}">
								Residue (Scaling Factor) <MathInline
									math={"A"}
								/>:
							</label>
							<input
								id="num-a-{term.id}"
								type="text"
								class="text-input sm"
								bind:value={term.numA}
								oninput={updateValue}
								placeholder="1"
							/>
						</div>

						{#if term.type === "quadratic"}
							<div class="field">
								<label for="num-c-{term.id}">
									Constant <MathInline math={"C"} />:
								</label>
								<input
									id="num-c-{term.id}"
									type="text"
									class="text-input sm"
									bind:value={term.numC}
									oninput={updateValue}
									placeholder="0"
								/>
							</div>
						{/if}

						<!-- Pole / Denominator Input -->
						<div class="field flex-grow">
							<label for="pole-den-{term.id}">
								{#if term.type === "quadratic"}
									Denominator <MathInline
										math={"s^2 + bs + c"}
									/>:
								{:else}
									Pole <MathInline math={"p"} />:
								{/if}
							</label>
							<input
								id="pole-den-{term.id}"
								type="text"
								class="text-input sm"
								bind:value={term.poleOrDenom}
								oninput={updateValue}
								placeholder={term.type === "quadratic"
									? "s^2 + 4s + 13"
									: "-2"}
							/>
						</div>

						{#if term.type === "repeated"}
							<div class="field">
								<label for="power-{term.id}">
									Power <MathInline math={"k"} />:
								</label>
								<input
									id="power-{term.id}"
									type="text"
									class="text-input sm"
									bind:value={term.power}
									oninput={updateValue}
									placeholder="2"
								/>
							</div>
						{/if}

						<!-- Delete Button -->
						{#if pfdTerms.length > 1}
							<button
								type="button"
								class="remove-term-btn"
								onclick={() => removePfdTerm(term.id)}
								title="Remove term"
							>
								✕
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Pole-Zero builder container ───────────────────────── */

	.pole-zero-builder {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	/* ── Header & title ────────────────────────────────────── */

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

	/* ── Submode selector buttons ──────────────────────────── */

	.submode-selector {
		display: flex;
		gap: 0.4rem;
	}

	.submode-btn {
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

	.submode-btn:hover,
	.submode-btn:focus-visible {
		color: var(--text-primary);
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* Active submode button — cyan glow */
	.submode-btn.active {
		background: var(--accent-primary);
		color: #000;
		border-color: var(--accent-primary);
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.submode-btn.active:focus-visible {
		outline: 2px solid var(--text-primary);
		outline-offset: 2px;
		box-shadow: 0 0 14px var(--accent-glow);
	}

	/* ── Rational form section ─────────────────────────────── */

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 0.75rem;
		border-radius: var(--radius-sm);
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	.field-row.flex-grow {
		flex: 1;
	}

	label {
		color: var(--text-muted);
		font-size: 0.8rem;
		white-space: nowrap;
	}

	/* ── Form inputs & controls ────────────────────────────── */

	.text-input,
	.select-input {
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.5rem;
		font-size: 0.85rem;
	}

	.text-input.mono {
		font-family: var(--font-mono);
		flex: 1;
	}

	.text-input.sm {
		width: 70px;
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

	/* ── Partial fractions decomposition section ───────────── */

	.pfd-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.section-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-title {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.add-term-btn {
		background: rgba(6, 182, 212, 0.15);
		color: var(--accent-primary);
		border: 1px solid var(--accent-primary);
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-term-btn:hover,
	.add-term-btn:focus-visible {
		background: var(--accent-primary);
		color: #000;
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.terms-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.pfd-term-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		flex-wrap: wrap;
	}

	.term-num {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.field {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
	}

	.field.flex-grow {
		flex: 1;
	}

	.remove-term-btn {
		background: transparent;
		color: var(--text-muted);
		border: none;
		font-size: 0.9rem;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		transition: color 0.2s ease;
	}

	.remove-term-btn:hover,
	.remove-term-btn:focus-visible {
		color: #f43f5e;
		outline: 2px solid #f43f5e;
		outline-offset: 2px;
	}
</style>
