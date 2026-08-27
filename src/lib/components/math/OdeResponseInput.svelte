<script lang="ts">
	/**
	 * OdeResponseInput Svelte 5 Component.
	 *
	 * Structured form builder for linear constant-coefficient differential equation solutions.
	 * Allows users to choose the damping mode template and input numerical/symbolic coefficients.
	 */

	import { formatSignedLinearTerm } from "$lib/math-engine/formatting";
	import MathText from "./MathText.svelte";

	export type ResponseMode =
		| "overdamped" // Distinct real roots
		| "critically_damped" // Repeated real roots
		| "underdamped" // Complex conjugate roots
		| "first_order"; // First-order transient

	interface Props {
		/** Initial or current LaTeX string */
		value?: string;
		/** Root r1 coefficient */
		r1?: string;
		/** Root r2 coefficient */
		r2?: string;
		/** Callback triggered when synthesized LaTeX string changes */
		onChange?: (latex: string) => void;
	}

	let {
		value = "",
		r1 = $bindable(""),
		r2 = $bindable(""),
		onChange,
	}: Props = $props();

	/** Response template mode */
	let mode = $state<ResponseMode>("overdamped");

	/** Coefficient values state */
	let c1 = $state("1");
	let c2 = $state("1");
	let rRoot = $state("-2");
	let sigma = $state("-1");
	let omegaD = $state("3");
	let yp = $state("0");
	let includeStep = $state(true);

	/**
	 * Formats signed term LaTeX string helper.
	 * @param {string} val Coefficient value
	 * @param {string} varSuffix Variable/function suffix (e.g. "e^{-2t}")
	 * @param {boolean} isFirst Whether this is the first term in expression
	 * @returns {string} Formatted LaTeX string
	 */
	function formatTerm(
		val: string,
		varSuffix: string,
		isFirst = false,
	): string {
		const cleanVal = val.trim();
		if (!cleanVal || cleanVal === "0") return "";

		if (cleanVal === "1") {
			return isFirst ? varSuffix : `+ ${varSuffix}`;
		}
		if (cleanVal === "-1") {
			return `- ${varSuffix}`;
		}
		if (cleanVal.startsWith("-")) {
			return `- ${cleanVal.substring(1)}${varSuffix}`;
		}
		return isFirst
			? `${cleanVal}${varSuffix}`
			: `+ ${cleanVal}${varSuffix}`;
	}

	/**
	 * Synthesizes full LaTeX response string based on current mode and inputs.
	 * @returns {string} LaTeX string
	 */
	function synthesizeLatex(): string {
		let bodyStr = "";

		switch (mode) {
			case "overdamped": {
				// C1 e^{r1 t} + C2 e^{r2 t} + yp
				const term1 = formatTerm(c1, `e^{${r1}t}`, true);
				const term2 = formatTerm(c2, `e^{${r2}t}`, !term1);
				const termP = formatTerm(yp, "", !term1 && !term2);
				bodyStr =
					[term1, term2, termP].filter(Boolean).join(" ") || "0";
				break;
			}
			case "critically_damped": {
				// (C1 + C2 t) e^{r t} + yp
				const term1 = formatTerm(c1, `e^{${rRoot}t}`, true);
				const term2 = formatTerm(c2, `t e^{${rRoot}t}`, !term1);
				const termP = formatTerm(yp, "", !term1 && !term2);
				bodyStr =
					[term1, term2, termP].filter(Boolean).join(" ") || "0";
				break;
			}
			case "underdamped": {
				// e^{\sigma t} (C1 \cos(\omega_d t) + C2 \sin(\omega_d t)) + yp
				const cosTerm = formatTerm(c1, `\\cos(${omegaD}t)`, true);
				const sinTerm = formatTerm(c2, `\\sin(${omegaD}t)`, !cosTerm);
				const trigSum = [cosTerm, sinTerm].filter(Boolean).join(" ");

				let expPrefix = "";
				if (sigma !== "0" && sigma.trim() !== "") {
					expPrefix = `e^{${sigma}t}`;
				}

				let homoPart = "";
				if (expPrefix && trigSum) {
					homoPart = `${expPrefix} (${trigSum})`;
				} else if (trigSum) {
					homoPart = trigSum;
				}

				const termP = formatTerm(yp, "", !homoPart);
				bodyStr = [homoPart, termP].filter(Boolean).join(" ") || "0";
				break;
			}
			case "first_order": {
				// C e^{r t} + yp
				const term1 = formatTerm(c1, `e^{${r1}t}`, true);
				const termP = formatTerm(yp, "", !term1);
				bodyStr = [term1, termP].filter(Boolean).join(" ") || "0";
				break;
			}
			default: {
				bodyStr = "0";
				break;
			}
		}

		if (includeStep) {
			if (bodyStr.includes("+") || bodyStr.includes("-")) {
				return `(${bodyStr}) u(t)`;
			}
			return `${bodyStr} u(t)`;
		}

		return bodyStr;
	}

	/**
	 * Updates parent callback whenever form inputs change.
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

<div class="ode-builder">
	<div class="builder-header">
		<span class="builder-title">ODE Solution Template Builder</span>
	</div>

	<!-- Mode Selector Tabs -->
	<div class="mode-selector">
		<button
			type="button"
			class="mode-btn"
			class:active={mode === "overdamped"}
			onclick={() => {
				mode = "overdamped";
				updateValue();
			}}
		>
			Overdamped (Distinct Real)
		</button>
		<button
			type="button"
			class="mode-btn"
			class:active={mode === "critically_damped"}
			onclick={() => {
				mode = "critically_damped";
				updateValue();
			}}
		>
			Critically Damped (Repeated)
		</button>
		<button
			type="button"
			class="mode-btn"
			class:active={mode === "underdamped"}
			onclick={() => {
				mode = "underdamped";
				updateValue();
			}}
		>
			Underdamped (Complex)
		</button>
		<button
			type="button"
			class="mode-btn"
			class:active={mode === "first_order"}
			onclick={() => {
				mode = "first_order";
				updateValue();
			}}
		>
			<MathText text={String.raw`$1^{\text{st}}$ Order Exponential`} />
		</button>
	</div>

	<!-- Dynamic Coefficient Inputs -->
	<div class="inputs-grid">
		{#if mode === "overdamped"}
			<div class="input-card">
				<span class="card-label">
					<MathText text={String.raw`Term 1: $C_1 e^{r_1 t}$`} />
				</span>
				<div class="fields-row">
					<div class="field">
						<label for="c1-input">
							<MathText text={"$C_1$:"} />
						</label>
						<input
							id="c1-input"
							type="text"
							class="text-input sm"
							bind:value={c1}
							oninput={updateValue}
							placeholder="1"
						/>
					</div>
					<div class="field">
						<label for="builder-r1-input">
							<MathText text={"$r_1$:"} />
						</label>
						<input
							id="builder-r1-input"
							type="text"
							class="text-input sm"
							bind:value={r1}
							oninput={updateValue}
							placeholder="-1"
						/>
					</div>
				</div>
			</div>

			<div class="input-card">
				<span class="card-label">
					<MathText text={String.raw`Term 2: $C_2 e^{r_2 t}$`} />
				</span>
				<div class="fields-row">
					<div class="field">
						<label for="c2-input">
							<MathText text={"$C_2$:"} />
						</label>
						<input
							id="c2-input"
							type="text"
							class="text-input sm"
							bind:value={c2}
							oninput={updateValue}
							placeholder="1"
						/>
					</div>
					<div class="field">
						<label for="builder-r2-input">
							<MathText text={"$r_2$:"} />
						</label>
						<input
							id="builder-r2-input"
							type="text"
							class="text-input sm"
							bind:value={r2}
							oninput={updateValue}
							placeholder="-2"
						/>
					</div>
				</div>
			</div>
		{:else if mode === "critically_damped"}
			<div class="input-card">
				<span class="card-label">
					<MathText
						text={String.raw`Homogeneous: $(C_1 + C_2 t) e^{r t}$`}
					/>
				</span>
				<div class="fields-row">
					<div class="field">
						<label for="c1-cd-input">
							<MathText text={"$C_1$:"} />
						</label>
						<input
							id="c1-cd-input"
							type="text"
							class="text-input sm"
							bind:value={c1}
							oninput={updateValue}
							placeholder="1"
						/>
					</div>
					<div class="field">
						<label for="c2-cd-input">
							<MathText text={"$C_2$:"} />
						</label>
						<input
							id="c2-cd-input"
							type="text"
							class="text-input sm"
							bind:value={c2}
							oninput={updateValue}
							placeholder="1"
						/>
					</div>
					<div class="field">
						<label for="r-root-input">
							<MathText text={"Repeated Root $r$:"} />
						</label>
						<input
							id="r-root-input"
							type="text"
							class="text-input sm"
							bind:value={rRoot}
							oninput={updateValue}
							placeholder="-2"
						/>
					</div>
				</div>
			</div>
		{:else if mode === "underdamped"}
			<div class="input-card">
				<span class="card-label">
					<MathText
						text={String.raw`Underdamped: $e^{\sigma t} [C_1 \cos(\omega_d t) + C_2 \sin(\omega_d t)]$`}
					/>
				</span>
				<div class="fields-row">
					<div class="field">
						<label for="sigma-input">
							<MathText text={String.raw`Damping $\sigma$:`} />
						</label>
						<input
							id="sigma-input"
							type="text"
							class="text-input sm"
							bind:value={sigma}
							oninput={updateValue}
							placeholder="-1"
						/>
					</div>
					<div class="field">
						<label for="omegad-input">
							<MathText text={String.raw`Freq $\omega_d$:`} />
						</label>
						<input
							id="omegad-input"
							type="text"
							class="text-input sm"
							bind:value={omegaD}
							oninput={updateValue}
							placeholder="3"
						/>
					</div>
					<div class="field">
						<label for="c1-ud-input">
							<MathText text={String.raw`$C_1$ ($\cos$):`} />
						</label>
						<input
							id="c1-ud-input"
							type="text"
							class="text-input sm"
							bind:value={c1}
							oninput={updateValue}
							placeholder="1"
						/>
					</div>
					<div class="field">
						<label for="c2-ud-input">
							<MathText text={String.raw`$C_2$ ($\sin$):`} />
						</label>
						<input
							id="c2-ud-input"
							type="text"
							class="text-input sm"
							bind:value={c2}
							oninput={updateValue}
							placeholder="1"
						/>
					</div>
				</div>
			</div>
		{:else if mode === "first_order"}
			<div class="input-card">
				<span class="card-label">
					<MathText text={String.raw`Exponential: $C e^{r t}$`} />
				</span>
				<div class="fields-row">
					<div class="field">
						<label for="c1-fo-input">
							<MathText text={"$C$:"} />
						</label>
						<input
							id="c1-fo-input"
							type="text"
							class="text-input sm"
							bind:value={c1}
							oninput={updateValue}
							placeholder="1"
						/>
					</div>
					<div class="field">
						<label for="r1-fo-input">
							<MathText text={"$r$:"} />
						</label>
						<input
							id="r1-fo-input"
							type="text"
							class="text-input sm"
							bind:value={r1}
							oninput={updateValue}
							placeholder="-1"
						/>
					</div>
				</div>
			</div>
		{/if}

		<!-- Common Particular / Offset Input -->
		<div class="input-card offset">
			<span class="card-label">
				<MathText
					text={String.raw`Particular Solution / DC Offset / Forcing Term: $y_p(t)$`}
				/>
			</span>
			<div class="fields-row">
				<div class="field flex-grow">
					<label for="yp-input">
						<MathText text={"$y_p(t)$:"} />
					</label>
					<input
						id="yp-input"
						type="text"
						class="text-input"
						bind:value={yp}
						oninput={updateValue}
						placeholder="0"
					/>
				</div>
				<div class="field checkbox">
					<label for="step-chk">
						<input
							id="step-chk"
							type="checkbox"
							bind:checked={includeStep}
							onchange={updateValue}
						/>
						<MathText text={"Multiply by $u(t)$"} />
					</label>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* ── ODE builder container ─────────────────────────────── */

	.ode-builder {
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

	/* ── Mode selector buttons ─────────────────────────────── */

	.mode-selector {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
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

	/* Active mode button — cyan glow */
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

	/* ── Inputs grid & dynamic parameter cards ─────────────── */

	.inputs-grid {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.input-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.6rem 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	/* Offset card variant */
	.input-card.offset {
		border-color: var(--accent-secondary, var(--border-color));
	}

	.card-label {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--accent-primary);
	}

	.fields-row {
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

	.field.flex-grow {
		flex: 1;
	}

	.field.checkbox label {
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-primary);
	}

	label {
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	/* ── Form inputs ───────────────────────────────────────── */

	.text-input {
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.5rem;
		font-size: 0.85rem;
		font-family: var(--font-mono);
	}

	.text-input.sm {
		width: 60px;
		text-align: center;
	}

	.text-input:focus {
		border-color: var(--accent-primary);
	}

	.text-input:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}
</style>
