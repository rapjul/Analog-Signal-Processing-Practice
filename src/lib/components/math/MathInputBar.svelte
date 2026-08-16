<script lang="ts">
	/**
	 * MathInputBar Svelte 5 Component.
	 *
	 * Advanced math answer entry component with dual-mode support:
	 * 1. Guided Form Builder (Piecewise, ODEs, Pole-Zero, Fourier Series, Phasors)
	 * 2. Freehand LaTeX input with symbol shortcuts and live KaTeX preview
	 */
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte template
	import FourierSeriesInput from "./FourierSeriesInput.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte template
	import MathBlock from "./MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte template
	import MathInline from "./MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte template
	import OdeResponseInput from "./OdeResponseInput.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte template
	import PhasorInput from "./PhasorInput.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte template
	import PiecewiseIntervalInput from "./PiecewiseIntervalInput.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte template
	import PoleZeroInput from "./PoleZeroInput.svelte";

	export type InputTypeOption =
		| "auto"
		| "piecewise"
		| "ode"
		| "polezero"
		| "fourier"
		| "phasor"
		| "generic";

	interface Props {
		/** Bound LaTeX value string */
		value: string;
		/** Root r1 coefficient for ODE builder */
		r1?: string;
		/** Root r2 coefficient for ODE builder */
		r2?: string;
		/** Input label / prompt */
		label?: string;
		/** Placeholder text for freehand LaTeX mode */
		placeholder?: string;
		/** Specific domain input builder type */
		inputType?: InputTypeOption;
		/** Input change handler callback */
		onChange?: (val: string) => void;
	}

	let {
		value = $bindable(""),
		r1 = $bindable(""),
		r2 = $bindable(""),
		// biome-ignore lint/correctness/noUnusedVariables: Used in template
		label = "Enter Math Solution:",
		// biome-ignore lint/correctness/noUnusedVariables: Used in template
		placeholder = "e.g. 2 e^{-2t} \\cos(3t) u(t)",
		// biome-ignore lint/correctness/noUnusedVariables: Used in template
		inputType = "generic",
		onChange,
	}: Props = $props();

	/** Active mode tab ('builder' or 'freehand'), defaults to 'builder' */
	let inputMode = $state<"builder" | "freehand">("builder");

	/** Active builder selector when inputType is 'generic' or 'auto' */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let selectedBuilder = $state<
		"piecewise" | "ode" | "polezero" | "fourier" | "phasor"
	>("piecewise");

	/** Common Symbol Shortcuts for freehand mode */
	// biome-ignore lint/correctness/noUnusedVariables: Used in template
	const symbols = [
		{ label: "Fraction", math: "\\frac{a}{b}", latex: "\\frac{a}{b}" },
		{ label: "e^x", math: "e^{-t}", latex: "e^{-t}" },
		{ label: "cos", math: "\\cos(\\omega t)", latex: "\\cos(\\omega t)" },
		{ label: "sin", math: "\\sin(\\omega t)", latex: "\\sin(\\omega t)" },
		{ label: "u(t)", math: "u(t)", latex: "u(t)" },
		{ label: "delta(t)", math: "\\delta(t)", latex: "\\delta(t)" },
		{ label: "pi", math: "\\pi", latex: "\\pi" },
		{ label: "omega", math: "\\omega", latex: "\\omega" },
		{
			label: "angle theta",
			math: "\\angle \\theta^\\circ",
			latex: "\\angle \\theta^\\circ",
		},
		{ label: "sqrt(x)", math: "\\sqrt{x}", latex: "\\sqrt{x}" },
	];

	/**
	 * Appends chosen symbol snippet to current input value.
	 * @param {string} snippet LaTeX snippet
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in template
	function insertSymbol(snippet: string) {
		value = value ? `${value} ${snippet}` : snippet;
		if (onChange) onChange(value);
	}

	/**
	 * Handles direct textarea input change.
	 * @param {Event} e Input event
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in template
	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		value = target.value;
		if (onChange) onChange(value);
	}

	/**
	 * Handles builder synthesized LaTeX update.
	 * @param {string} newLatex Synthesized LaTeX
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleBuilderChange(newLatex: string) {
		if (inputMode === "builder") {
			value = newLatex;
			if (onChange) onChange(value);
		}
	}
</script>

<div class="math-input-container">
	{#if label}
		<div class="input-header">
			<label
				class="input-label"
				for="latex-input"
			>
				{#each label.split(/(\$[^$]+\$)/g) as part}
					{#if part.startsWith("$") && part.endsWith("$") && part.length > 2}
						<MathInline math={part.slice(1, -1)} />
					{:else}
						{part}
					{/if}
				{/each}
			</label>

			<!-- Input Mode Switcher Tabs -->
			<div class="mode-tabs">
				<button
					type="button"
					class="tab-btn"
					class:active={inputMode === "builder"}
					onclick={() => (inputMode = "builder")}
				>
					🪄 Guided Form Builder
				</button>
				<button
					type="button"
					class="tab-btn"
					class:active={inputMode === "freehand"}
					onclick={() => (inputMode = "freehand")}
				>
					⌨️ Freehand LaTeX
				</button>
			</div>
		</div>
	{/if}

	<!-- Guided Form Mode -->
	{#if inputMode === "builder"}
		{#if inputType === "generic" || inputType === "auto"}
			<div class="builder-picker">
				<span class="picker-label">Choose Builder Template:</span>
				<div class="picker-btns">
					<button
						type="button"
						class="picker-btn"
						class:active={selectedBuilder === "piecewise"}
						onclick={() => (selectedBuilder = "piecewise")}
					>
						Piecewise / Intervals
					</button>
					<button
						type="button"
						class="picker-btn"
						class:active={selectedBuilder === "ode"}
						onclick={() => (selectedBuilder = "ode")}
					>
						ODE Coefficients
					</button>
					<button
						type="button"
						class="picker-btn"
						class:active={selectedBuilder === "polezero"}
						onclick={() => (selectedBuilder = "polezero")}
					>
						Laplace Poles & Zeros
					</button>
					<button
						type="button"
						class="picker-btn"
						class:active={selectedBuilder === "fourier"}
						onclick={() => (selectedBuilder = "fourier")}
					>
						Fourier Series
					</button>
					<button
						type="button"
						class="picker-btn"
						class:active={selectedBuilder === "phasor"}
						onclick={() => (selectedBuilder = "phasor")}
					>
						Phasor / AC
					</button>
				</div>
			</div>
		{/if}

		<div class="builder-wrapper">
			{#if inputType === "piecewise" || (inputType === "generic" && selectedBuilder === "piecewise")}
				<PiecewiseIntervalInput onChange={handleBuilderChange} />
			{:else if inputType === "ode" || (inputType === "generic" && selectedBuilder === "ode")}
				<OdeResponseInput
					bind:r1
					bind:r2
					onChange={handleBuilderChange}
				/>
			{:else if inputType === "polezero" || (inputType === "generic" && selectedBuilder === "polezero")}
				<PoleZeroInput onChange={handleBuilderChange} />
			{:else if inputType === "fourier" || (inputType === "generic" && selectedBuilder === "fourier")}
				<FourierSeriesInput onChange={handleBuilderChange} />
			{:else if inputType === "phasor" || (inputType === "generic" && selectedBuilder === "phasor")}
				<PhasorInput onChange={handleBuilderChange} />
			{/if}
		</div>
	{:else}
		<!-- Freehand LaTeX Mode -->
		<!-- Symbol Toolbar -->
		<div class="symbol-toolbar">
			{#each symbols as sym}
				<button
					type="button"
					class="symbol-btn"
					onclick={() => insertSymbol(sym.latex)}
					title="Insert {sym.label}"
				>
					<MathInline math={sym.math} />
				</button>
			{/each}
		</div>

		<!-- Text Input Area -->
		<textarea
			id="latex-input"
			class="latex-textarea"
			rows="2"
			{placeholder}
			{value}
			oninput={handleInput}></textarea>
	{/if}

	<!-- Live KaTeX Preview -->
	<div class="preview-box">
		<div class="preview-header">
			<span class="preview-tag">Live Rendered Math Preview:</span>
			<span class="preview-mode-tag">
				{inputMode === "builder"
					? "Guided Form Mode"
					: "Freehand LaTeX Mode"}
			</span>
		</div>
		{#if value.trim()}
			<MathBlock math={value} />
		{:else}
			<span class="preview-empty">
				Input values above to render live math preview...
			</span>
		{/if}
	</div>
</div>

<style>
	.math-input-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 1rem 0;
	}

	.input-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.input-label {
		font-weight: 600;
		font-size: var(--text-base);
		color: var(--text-primary);
	}

	.mode-tabs {
		display: flex;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.2rem;
		gap: 0.2rem;
	}

	.tab-btn {
		background: transparent;
		color: var(--text-muted);
		border: none;
		padding: 0.3rem 0.6rem;
		font-size: var(--text-xs);
		font-weight: 600;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tab-btn:hover,
	.tab-btn:focus-visible {
		color: var(--text-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.tab-btn.active {
		background: var(--accent-primary);
		color: #000;
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.tab-btn.active:focus-visible {
		outline: 2px solid var(--text-primary);
		outline-offset: 2px;
	}

	.builder-picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		flex-wrap: wrap;
	}

	.picker-label {
		color: var(--text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
	}

	.picker-btns {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.picker-btn {
		background: var(--bg-secondary);
		color: var(--text-muted);
		border: 1px solid var(--border-color);
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.picker-btn:hover,
	.picker-btn:focus-visible {
		color: var(--text-primary);
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.picker-btn.active {
		border-color: var(--accent-primary);
		color: var(--accent-primary);
		background: rgba(6, 182, 212, 0.1);
	}

	.symbol-toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.symbol-btn {
		background: var(--bg-card-hover);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-family: var(--font-mono);
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.symbol-btn:hover,
	.symbol-btn:focus-visible {
		background: var(--accent-primary);
		color: #000;
		border-color: var(--accent-primary);
		box-shadow: 0 0 10px var(--accent-glow);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.latex-textarea {
		width: 100%;
		background: var(--bg-input);
		border: 1.5px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 0.75rem;
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: var(--text-base);
		resize: vertical;
		transition: border-color 0.2s ease;
	}

	.latex-textarea:focus {
		border-color: var(--accent-primary);
		box-shadow: 0 0 12px var(--accent-glow);
	}

	.latex-textarea:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.preview-box {
		background: var(--bg-primary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.preview-tag {
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		font-weight: 600;
	}

	.preview-mode-tag {
		font-size: var(--text-2xs);
		color: var(--accent-primary);
		font-weight: 600;
	}

	.preview-empty {
		font-size: var(--text-sm);
		color: var(--text-muted);
		font-style: italic;
	}
</style>
