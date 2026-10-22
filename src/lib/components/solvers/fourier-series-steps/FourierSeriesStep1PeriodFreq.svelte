<script lang="ts">
	/**
	 * FourierStep1PeriodFreq Svelte 5 Component.
	 *
	 * Step 1: Fundamental Period ($T_0$) & Fundamental Frequency ($\omega_0$) setup.
	 *
	 * Guides students to extract the period from the waveform definition and compute
	 * the corresponding fundamental radian frequency $\omega_0 = 2\pi / T_0$.
	 */

	import MathText from "$lib/components/math/MathText.svelte";
	import type { FourierSeriesStepSolverState } from "$lib/components/solvers/fourier-series-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series/index";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Active reactive Fourier solver controller */
		solver: FourierSeriesStepSolverState;
	}

	let { problem, solver }: Props = $props();

	const status = $derived(
		solver.currentStep === 1
			? "active"
			: solver.currentStep > 1
				? "completed"
				: "locked",
	);
</script>

<StepCard
	stepNumber={1}
	title="Fundamental Period & Frequency"
	{status}
	summaryLatex={String.raw`$${problem.periodLatex}, \quad ${problem.omega0Latex}$`}
>
	<div class="step-body">
		<p class="step-prompt">
			<MathText
				text={String.raw`Enter the fundamental period $T_0$ and fundamental frequency $\omega_0$ from the waveform definition:`}
			/>
		</p>
		<div class="input-row-grid">
			<div class="input-pair">
				<label
					for="fourier-period-input"
					class="field-label"
				>
					<MathText text={"Period $T_0$:"} />
				</label>
				<div class="input-with-unit">
					<input
						id="fourier-period-input"
						type="text"
						class="text-input"
						placeholder="e.g. 2 or 1/4"
						bind:value={solver.step1.period}
						onkeydown={(e) =>
							e.key === "Enter" && solver.checkStep1()}
					/>
					<select
						class="unit-select"
						bind:value={solver.step1.periodUnit}
						aria-label="Period time unit"
					>
						<option value="s">s</option>
						<option value="ms">ms</option>
					</select>
				</div>
			</div>

			<div class="input-pair">
				<label
					for="fourier-freq-input"
					class="field-label"
				>
					<MathText text={String.raw`Fundamental Freq $\omega_0$:`} />
				</label>
				<div class="input-with-unit">
					<input
						id="fourier-freq-input"
						type="text"
						class="text-input"
						placeholder="e.g. pi or pi/2"
						bind:value={solver.step1.freq}
						onkeydown={(e) =>
							e.key === "Enter" && solver.checkStep1()}
					/>
					<select
						class="unit-select"
						bind:value={solver.step1.freqUnit}
						aria-label="Frequency unit"
					>
						<option value="rad/s">rad/s</option>
						<option value="Hz">Hz</option>
					</select>
				</div>
			</div>
		</div>

		<div class="step-actions">
			<button
				type="button"
				class="btn btn-primary"
				onclick={() => solver.checkStep1()}
			>
				Check Period & Frequency →
			</button>
		</div>

		<!-- Feedback & Progressive Hints -->
		<StepFeedback {solver} />
		<HintDisclosure
			hints={solver.activeHints}
			hintTier={solver.hintTier}
			onRevealNextHint={() => solver.revealNextHint()}
		/>
	</div>
</StepCard>

<style>
	/* ── Step body & prompt ────────────────────────────────── */

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		min-width: 0;
	}

	.step-prompt {
		font-size: var(--text-sm);
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
	}

	/* ── Input pairs & row grid ────────────────────────────── */

	.input-row-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		width: 100%;
	}

	.input-pair {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-width: 360px;
		min-width: 0;
		width: 100%;
	}

	.field-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-secondary);
	}

	/* ── Composite input with unit selector ────────────────── */

	.input-with-unit {
		display: flex;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-input);
		max-width: 100%;
		transition: border-color 0.2s ease;
	}

	.input-with-unit:focus-within {
		border-color: var(--accent-primary);
	}

	.text-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		padding: 0.5rem 0.75rem;
		color: var(--text-primary);
		font-size: var(--text-sm);
		border-top-left-radius: var(--radius-sm);
		border-bottom-left-radius: var(--radius-sm);
	}

	.text-input:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--accent-primary);
		outline-offset: 0;
	}

	.unit-select {
		flex-shrink: 0;
		background: var(--bg-secondary);
		border: none;
		border-left: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 0 0.5rem;
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		border-top-right-radius: var(--radius-sm);
		border-bottom-right-radius: var(--radius-sm);
	}

	.unit-select:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--accent-primary);
		outline-offset: 0;
	}

	/* ── Step actions & buttons ────────────────────────────── */

	.step-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.25rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
		border: none;
		font-family: inherit;
		line-height: var(--leading-snug);
		text-wrap: balance;
		max-width: 100%;
	}

	.btn-primary {
		background: var(--accent-primary);
		color: var(--accent-contrast);
	}

	.btn-primary:hover {
		background: var(--accent-hover);
	}

	.btn-primary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Container queries (≤620px) ────────────────────────── */

	@container (max-width: 620px) {
		.input-row-grid {
			grid-template-columns: 1fr;
		}
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.step-actions {
			width: 100%;
		}

		.btn-primary {
			width: 100%;
			text-align: center;
			justify-content: center;
		}
	}
</style>
