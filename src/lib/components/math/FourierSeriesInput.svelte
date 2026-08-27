<script lang="ts">
	/**
	 * FourierSeriesInput Svelte 5 Component.
	 *
	 * Structured Form Builder for Fourier Series representations.
	 * Allows students and users to build Fourier coefficients (a0, an, bn, Fn)
	 * using intuitive Numerator/Denominator fraction inputs and Harmonics selectors
	 * without requiring manual LaTeX coding. Includes live LaTeX preview cards.
	 */

	import FourierCoefficientCard from "./FourierCoefficientCard.svelte";
	import MathInline from "./MathInline.svelte";
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

	let { value = "", onChange }: Props = $props();

	/** Active Fourier representation mode tab */
	let mode = $state<FourierFormMode>("trigonometric");

	/** Global Fundamental Frequency omega0 */
	let omega0 = $state("1");

	/** DC Offset inputs */
	let a0 = $state("0");
	let F0 = $state("0");

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

	// Complex exponential coefficient F_n
	let FnMode = $state<CoeffInputMode>("fraction");
	let FnNum = $state("1");
	let FnDen = $state("j n pi");
	let FnHarmonic = $state<HarmonicOption>("none");
	let FnCustomHarmonic = $state("");
	let FnDirect = $state("\\frac{1}{j n \\pi}");

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

		const cleanNum = formatMathLatex(num) || "1";
		const cleanDen = formatMathLatex(den) || "1";

		let fractionPart = "";
		if (cleanDen === "1") {
			fractionPart = cleanNum;
		} else {
			fractionPart = `\\frac{${cleanNum}}{${cleanDen}}`;
		}

		let multiplierPart = "";
		switch (harmonic) {
			case "odd":
				multiplierPart = "(1 - (-1)^n)";
				break;
			case "even":
				multiplierPart = "(1 + (-1)^n)";
				break;
			case "alt":
				multiplierPart = "(-1)^n";
				break;
			case "custom":
				multiplierPart = formatMathLatex(customHarmonic);
				break;
			case "none":
			default:
				multiplierPart = "";
				break;
		}

		if (multiplierPart) {
			return `${fractionPart} ${multiplierPart}`;
		}
		return fractionPart;
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

	let FnLatex = $derived(
		buildCoeffLatex(
			FnMode,
			FnNum,
			FnDen,
			FnHarmonic,
			FnCustomHarmonic,
			FnDirect,
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
		const cleanF0 = F0.trim();
		const cleanFn = FnLatex.trim();
		const w0 = formatMathLatex(omega0) || "\\omega_0";

		const sumPart =
			cleanFn && cleanFn !== "0"
				? `\\sum_{n=-\\infty, n \\neq 0}^{\\infty} \\left( ${cleanFn} \\right) e^{j n ${w0} t}`
				: "";

		if (cleanF0 && cleanF0 !== "0") {
			return sumPart ? `${cleanF0} + ${sumPart}` : cleanF0;
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
			<MathText text={"Complex Exponential Series ($F_n$)"} />
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
				<label for="F0-input">
					<MathText text={"DC Offset $F_0$:"} />
				</label>
				<input
					id="F0-input"
					type="text"
					class="text-input sm"
					bind:value={F0}
					oninput={updateValue}
					placeholder="0"
				/>
			</div>
		{/if}
	</div>

	<!-- Form Inputs Grid -->
	<div class="inputs-grid">
		{#if mode === "trigonometric"}
			<FourierCoefficientCard
				title={"Cosine Coefficient $a_n$"}
				symbol="a_n"
				bind:mode={anMode}
				bind:num={anNum}
				bind:den={anDen}
				bind:harmonic={anHarmonic}
				bind:customHarmonic={anCustomHarmonic}
				bind:direct={anDirect}
				coeffLatex={anLatex}
				numPlaceholder="e.g. 4 or 2"
				denPlaceholder="e.g. n \pi or n^2 \pi^2"
				directPlaceholder="e.g. 2 / (n \pi)"
				onUpdate={updateValue}
			/>

			<FourierCoefficientCard
				title={"Sine Coefficient $b_n$"}
				symbol="b_n"
				bind:mode={bnMode}
				bind:num={bnNum}
				bind:den={bnDen}
				bind:harmonic={bnHarmonic}
				bind:customHarmonic={bnCustomHarmonic}
				bind:direct={bnDirect}
				coeffLatex={bnLatex}
				numPlaceholder="e.g. 2 or 4"
				denPlaceholder="e.g. n \pi"
				directPlaceholder="e.g. 2 / (n \pi)"
				onUpdate={updateValue}
			/>
		{:else}
			<FourierCoefficientCard
				title={"Complex Exponential Coefficient $F_n$"}
				symbol="F_n"
				bind:mode={FnMode}
				bind:num={FnNum}
				bind:den={FnDen}
				bind:harmonic={FnHarmonic}
				bind:customHarmonic={FnCustomHarmonic}
				bind:direct={FnDirect}
				coeffLatex={FnLatex}
				numPlaceholder="e.g. 1 or A"
				denPlaceholder="e.g. j n \pi"
				directPlaceholder="e.g. 1 / (j n \pi)"
				onUpdate={updateValue}
			/>
		{/if}
	</div>
</div>

<style>
	/* ── Box-drawing section dividers ────────────────────────────────────────── */
	.fourier-builder {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--bg-secondary, #18181b);
		border: 1px solid var(--border-color, #27272a);
		border-radius: 8px;
		padding: 1rem;
	}

	/* ── Mode switcher tabs (Trig vs Exp) ──────────────────── */
	.mode-tabs {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.mode-btn {
		background: var(--bg-card, #121214);
		color: var(--text-secondary, #a1a1aa);
		border: 1px solid var(--border-color, #27272a);
		padding: 0.35rem 0.65rem;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.mode-btn:hover,
	.mode-btn:focus-visible {
		color: var(--text-primary, #f4f4f5);
		border-color: var(--primary, #06b6d4);
		outline: 2px solid var(--primary, #06b6d4);
		outline-offset: 2px;
	}

	/* Active mode tab — filled accent button */
	.mode-btn.active {
		background: var(--primary, #06b6d4);
		color: #000;
		border-color: var(--primary, #06b6d4);
	}

	.mode-btn.active:focus-visible {
		outline: 2px solid var(--text-primary, #f4f4f5);
		outline-offset: 2px;
	}

	/* ── Global parameter cards (w0, DC offset) ─────────────── */
	.global-params-card {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		background: var(--bg-card, #121214);
		border: 1px solid var(--border-color, #27272a);
		border-radius: 6px;
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
		color: var(--text-secondary, #a1a1aa);
		font-size: 0.8rem;
		white-space: nowrap;
	}

	/* ── Form inputs grid ──────────────────────────────────── */
	.inputs-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.text-input {
		background: var(--bg-surface, #09090b);
		color: var(--text-primary, #f4f4f5);
		border: 1px solid var(--border-color, #27272a);
		border-radius: 6px;
		padding: 0.3rem 0.5rem;
		font-size: 0.85rem;
		min-width: 0;
	}

	.text-input.sm {
		width: 75px;
		text-align: center;
	}

	.text-input:focus {
		border-color: var(--primary, #06b6d4);
	}

	.text-input:focus-visible {
		border-color: var(--primary, #06b6d4);
		outline: 2px solid var(--primary, #06b6d4);
		outline-offset: 2px;
	}
</style>
