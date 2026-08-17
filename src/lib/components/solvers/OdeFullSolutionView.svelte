<script lang="ts">
	/**
	 * OdeFullSolutionView Svelte 5 Component.
	 *
	 * Displays a comprehensive, zero-guesswork worked solution breakdown for
	 * completed 2nd-order Linear Constant-Coefficient ODE problems.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathInline from "$lib/components/math/MathInline.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import { toFractionLatex } from "$lib/math-engine/fraction";
	import type { OdeProblem } from "$lib/math-engine/odes";

	interface Props {
		/** Completed ODE problem instance */
		problem: OdeProblem;
	}

	let { problem }: Props = $props();
	let isOpen = $state(false);

	/**
	 * Toggles the full worked derivation open/closed state.
	 */
	function toggleOpen(): void {
		isOpen = !isOpen;
	}
</script>

<div class="full-solution-container">
	<button
		type="button"
		class="full-solution-toggle-btn"
		onclick={toggleOpen}
		aria-expanded={isOpen}
	>
		<span class="toggle-icon">{isOpen ? "▼" : "▶"}</span>
		<span class="toggle-title">
			{isOpen
				? "Hide Complete Worked Solution"
				: "View Complete Worked Solution (All 7 Steps)"}
		</span>
		<span class="toggle-badge">Zero-Guesswork Derivation</span>
	</button>

	{#if isOpen}
		<div class="solution-content">
			<!-- Step 1: Characteristic Equation -->
			<div class="solution-step-card">
				<div class="step-card-header">
					<span class="step-badge">Step 1</span>
					<h4 class="step-title">
						Characteristic Equation Formulation
					</h4>
				</div>
				<p class="step-prose">
					<MathText
						text={String.raw`Mapping differential operators $\frac{d^n}{dt^n} \to s^n$ and setting the homogeneous right-hand side to $0$ ($x(t) = 0$):`}
					/>
				</p>
				<MathBlock
					math={`Q(s) = ${problem.itsData.step1.latex}`}
					compact={true}
					hideHeader={true}
				/>
			</div>

			<!-- Step 2: Characteristic Roots -->
			<div class="solution-step-card">
				<div class="step-card-header">
					<span class="step-badge">Step 2</span>
					<h4 class="step-title">
						Characteristic Roots & Classification
					</h4>
				</div>
				<p class="step-prose">
					<MathText
						text={String.raw`Evaluating discriminant $\Delta = b^2 - 4ac = (${problem.params.a1})^2 - 4(1)(${problem.params.a0}) = ${problem.itsData.step2.discriminant}$ and applying the quadratic formula:`}
					/>
				</p>
				<MathBlock
					math={`s = \\frac{-(${problem.params.a1}) \\pm \\sqrt{${problem.itsData.step2.discriminant}}}{2(1)} \\implies ${problem.itsData.step2.symbolicRootsLatex}`}
					compact={true}
					hideHeader={true}
				/>
				{#if problem.itsData.step2.factoredFormLatex}
					<p class="step-sub-prose">
						<MathText
							text={`Factored Form: $${problem.itsData.step2.factoredFormLatex}$`}
						/>
					</p>
				{/if}
			</div>

			<!-- Step 3: Homogeneous Form -->
			<div class="solution-step-card">
				<div class="step-card-header">
					<span class="step-badge">Step 3</span>
					<h4 class="step-title">Homogeneous Solution Form</h4>
				</div>
				<p class="step-prose">
					<MathText
						text={String.raw`Based on the root structure (${problem.params.rootType.replace("_", " ")}), the natural basis modes form:`}
					/>
				</p>
				<MathBlock
					math={problem.itsData.step3.formLatex}
					compact={true}
					hideHeader={true}
				/>
			</div>

			<!-- Step 4: Particular Solution Ansatz -->
			<div class="solution-step-card">
				<div class="step-card-header">
					<span class="step-badge">Step 4</span>
					<h4 class="step-title">Particular Solution Ansatz</h4>
				</div>
				<p class="step-prose">
					<MathText
						text={String.raw`Matching the functional form of the input forcing function $x(t) = ${problem.forcing.latex}$:`}
					/>
				</p>
				<MathBlock
					math={problem.itsData.step4.options.find((o) => o.isCorrect)
						?.latex ?? "y_p(t)"}
					compact={true}
					hideHeader={true}
				/>
			</div>

			<!-- Step 5: Undetermined Coefficients -->
			<div class="solution-step-card">
				<div class="step-card-header">
					<span class="step-badge">Step 5</span>
					<h4 class="step-title">
						Undetermined Coefficients Derivation
					</h4>
				</div>
				{#if problem.forcing.type === "sinusoid"}
					<p class="step-prose">
						<MathText
							text={String.raw`Taking trial derivatives $y_p'(t)$ and $y_p''(t)$:`}
						/>
					</p>
					<MathBlock
						math={problem.itsData.step5.derivativesLatex ?? ""}
						compact={true}
						hideHeader={true}
					/>
					<p class="step-prose">
						<MathText
							text={String.raw`Substituting into $y'' + a_1 y' + a_0 y = ${problem.forcing.latex}$ and equating sine/cosine harmonics:`}
						/>
					</p>
					<MathBlock
						math={problem.itsData.step5.systemLatex ?? ""}
						compact={true}
						hideHeader={true}
					/>
					<p class="step-prose">
						<MathText
							text={String.raw`Solving the $2\times 2$ algebraic system yields:`}
						/>
					</p>
					<MathBlock
						math={`A = ${toFractionLatex(problem.itsData.step5.expectedA ?? 0)}, \\quad B = ${toFractionLatex(problem.itsData.step5.expectedB ?? 0)} \\implies y_p(t) = ${problem.solutions.y_p_latex}`}
						compact={true}
						hideHeader={true}
					/>
				{:else}
					<p class="step-prose">
						<MathText
							text={String.raw`Substituting $y_p(t)$ into $y'' + a_1 y' + a_0 y = ${problem.forcing.latex}$:`}
						/>
					</p>
					<MathBlock
						math={`y_p(t) = ${problem.solutions.y_p_latex}`}
						compact={true}
						hideHeader={true}
					/>
				{/if}
			</div>

			<!-- Step 6: Initial Conditions System -->
			<div class="solution-step-card">
				<div class="step-card-header">
					<span class="step-badge">Step 6</span>
					<h4 class="step-title">
						Initial Conditions & Complete Response
					</h4>
				</div>
				<p class="step-prose">
					<MathText
						text={String.raw`Initial conditions apply to the complete response $y(t) = y_h(t) + y_p(t)$. Subtracting forcing offsets at $t = 0^+$:`}
					/>
				</p>
				<MathBlock
					math={`y_h(0^+) = y(0^+) - y_p(0^+) = ${problem.initialConditions.y0} - (${toFractionLatex(problem.itsData.step6.yp0)}) = ${toFractionLatex(problem.itsData.step6.targetYh0)}`}
					compact={true}
					hideHeader={true}
				/>
				<MathBlock
					math={`y_h'(0^+) = y'(0^+) - y_p'(0^+) = ${problem.initialConditions.dy0} - (${toFractionLatex(problem.itsData.step6.dyp0)}) = ${toFractionLatex(problem.itsData.step6.targetDYh0)}`}
					compact={true}
					hideHeader={true}
				/>
				<p class="step-prose">
					<MathText
						text={String.raw`Solving for integration constants $C_1, C_2$ gives the complete response:`}
					/>
				</p>
				<MathBlock
					math={`C_1 = ${toFractionLatex(problem.itsData.step6.expectedC1)}, \\quad C_2 = ${toFractionLatex(problem.itsData.step6.expectedC2)}`}
					compact={true}
					hideHeader={true}
				/>
				<MathBlock
					math={`y(t) = ${problem.solutions.y_complete_latex}`}
					compact={true}
					hideHeader={true}
				/>
			</div>

			<!-- Step 7: Response Decomposition -->
			<div class="solution-step-card">
				<div class="step-card-header">
					<span class="step-badge">Step 7</span>
					<h4 class="step-title">
						Response Decomposition & Superposition
					</h4>
				</div>
				<div class="decomp-grid">
					<div class="decomp-card">
						<span class="decomp-label"
							>Zero-Input Response <MathInline
								math={"y_{ZI}(t)"}
							/>:</span
						>
						<MathBlock
							math={`y_{ZI}(t) = ${problem.solutions.y_zi_latex}`}
							compact={true}
							hideHeader={true}
						/>
					</div>
					<div class="decomp-card">
						<span class="decomp-label"
							>Zero-State Response <MathInline
								math={"y_{ZS}(t)"}
							/>:</span
						>
						<MathBlock
							math={`y_{ZS}(t) = ${problem.solutions.y_zs_latex}`}
							compact={true}
							hideHeader={true}
						/>
					</div>
					<div class="decomp-card">
						<span class="decomp-label"
							>Transient Response <MathInline
								math={"y_{tr}(t)"}
							/>:</span
						>
						<MathBlock
							math={`y_{tr}(t) = ${problem.solutions.y_tr_latex}`}
							compact={true}
							hideHeader={true}
						/>
					</div>
					<div class="decomp-card">
						<span class="decomp-label"
							>Steady-State Response <MathInline
								math={"y_{ss}(t)"}
							/>:</span
						>
						<MathBlock
							math={`y_{ss}(t) = ${problem.solutions.y_ss_latex}`}
							compact={true}
							hideHeader={true}
						/>
					</div>
				</div>
				<div class="superposition-identity-box">
					<span class="identity-badge">Superposition Identity</span>
					<MathBlock
						math={String.raw`y(t) = y_{ZI}(t) + y_{ZS}(t) = y_{tr}(t) + y_{ss}(t)`}
						compact={true}
						hideHeader={true}
					/>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Full solution accordion container ───────────────────── */

	.full-solution-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-4, 1rem);
		margin-top: var(--space-6, 1.5rem);
		width: 100%;
	}

	/* ── Full solution toggle button ─────────────────────────── */

	.full-solution-toggle-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3, 0.75rem);
		padding: var(--space-4, 1rem) var(--space-5, 1.25rem);
		background: var(--surface-2, #182234);
		border: 1px solid var(--border-color, #2a3a52);
		border-radius: var(--radius-md, 8px);
		color: var(--text-1, #f8fafc);
		font-family: inherit;
		font-size: var(--font-size-base, 1rem);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		text-align: left;
	}

	.full-solution-toggle-btn:hover {
		background: var(--surface-3, #223048);
		border-color: var(--accent-cyan, #06b6d4);
	}

	.full-solution-toggle-btn:focus-visible {
		outline: 2px solid var(--accent-cyan, #06b6d4);
		outline-offset: 2px;
	}

	.toggle-icon {
		color: var(--accent-cyan, #06b6d4);
		font-size: var(--font-size-sm, 0.875rem);
	}

	.toggle-title {
		flex: 1;
	}

	.toggle-badge {
		font-size: var(--font-size-xs, 0.75rem);
		font-weight: 500;
		padding: 0.2rem 0.5rem;
		background: rgba(6, 182, 212, 0.15);
		color: var(--accent-cyan, #06b6d4);
		border: 1px solid rgba(6, 182, 212, 0.3);
		border-radius: var(--radius-sm, 4px);
		white-space: nowrap;
	}

	/* ── Solution content list ───────────────────────────────── */

	.solution-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-4, 1rem);
	}

	/* ── Individual step breakdown card ──────────────────────── */

	.solution-step-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3, 0.75rem);
		padding: var(--space-4, 1rem);
		background: var(--surface-1, #0f172a);
		border: 1px solid var(--border-color, #2a3a52);
		border-radius: var(--radius-md, 8px);
	}

	.step-card-header {
		display: flex;
		align-items: center;
		gap: var(--space-3, 0.75rem);
	}

	.step-badge {
		font-size: var(--font-size-xs, 0.75rem);
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		background: var(--surface-3, #223048);
		color: var(--accent-cyan, #06b6d4);
		border-radius: var(--radius-sm, 4px);
	}

	.step-title {
		margin: 0;
		font-size: var(--font-size-md, 1.05rem);
		color: var(--text-1, #f8fafc);
	}

	.step-prose {
		margin: 0;
		font-size: var(--font-size-sm, 0.9rem);
		color: var(--text-2, #94a3b8);
	}

	.step-sub-prose {
		margin: 0;
		font-size: var(--font-size-sm, 0.875rem);
		color: var(--accent-cyan, #06b6d4);
	}

	/* ── Decomposition grid ──────────────────────────────────── */

	.decomp-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3, 0.75rem);
	}

	.decomp-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2, 0.5rem);
		padding: var(--space-3, 0.75rem);
		background: var(--surface-2, #182234);
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--border-color, #2a3a52);
	}

	.decomp-label {
		font-size: var(--font-size-xs, 0.8rem);
		font-weight: 600;
		color: var(--text-2, #94a3b8);
	}

	/* ── Superposition identity highlight box ────────────────── */

	.superposition-identity-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2, 0.5rem);
		padding: var(--space-3, 0.75rem);
		background: rgba(6, 182, 212, 0.08);
		border: 1px solid rgba(6, 182, 212, 0.25);
		border-radius: var(--radius-sm, 4px);
	}

	.identity-badge {
		font-size: var(--font-size-xs, 0.75rem);
		font-weight: 700;
		color: var(--accent-cyan, #06b6d4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* ── Mobile media query (≤480px) ─────────────────────────── */

	@media (max-width: 480px) {
		.full-solution-toggle-btn {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2, 0.5rem);
		}

		.decomp-grid {
			grid-template-columns: 1fr;
		}
	}

	/* ── Narrow viewport (≤360px) container query ───────────── */

	@container (max-width: 360px) {
		.decomp-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
