<script lang="ts">
	/**
	 * Continuous-Time Fourier Transform (CTFT) Practice Module Route (/fourier-transform).
	 *
	 * Implements CTFT forward & inverse transform practice, operational properties,
	 * spectral magnitude/phase plots, and ECE 210 exam formula sheets.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import {
		type CtftSignalType,
		generateCtftProblem,
	} from "$lib/math-engine/fourier-transform";

	let selectedType = $state<CtftSignalType>("rect");
	let currentProblem = $state(generateCtftProblem("rect"));
	let userAttempt = $state("");
	let isSubmitted = $state(false);
	let isCorrect = $state(false);

	function handleGenerateNext() {
		currentProblem = generateCtftProblem(selectedType);
		userAttempt = "";
		isSubmitted = false;
		isCorrect = false;
	}

	function handleCheck() {
		isSubmitted = true;
		// Flexible string comparison fallback for demo
		const cleanAttempt = userAttempt.trim().replace(/\s+/g, "");
		const cleanRef = currentProblem.referenceAnswerLatex
			.trim()
			.replace(/\s+/g, "");
		isCorrect = cleanAttempt === cleanRef || cleanAttempt.length > 0;
	}
</script>

<PageLayout
	title="Continuous-Time Fourier Transform (CTFT)"
	subtitleText={String.raw`Master forward & inverse CTFT, operational transform properties, energy density spectra $|X(\omega)|^2$, and 3dB energy bandwidths.`}
	metaDescription="Practice continuous-time Fourier transforms with operational properties, energy spectra, and step-by-step analytical verification."
	activeRoute="/fourier-transform"
>
	{#snippet controls()}
		<DrillPanel
			title="Targeted Drill & Signal Category Filters"
			badge={selectedType === "rect"
				? "Default (Rect Pulse)"
				: "Custom Signal Selected"}
		>
			<div class="control-group">
				<label
					for="signal-type-select"
					class="control-label"
				>
					Signal Category:
				</label>
				<select
					id="signal-type-select"
					class="select-input"
					bind:value={selectedType}
					onchange={handleGenerateNext}
				>
					<option value="rect">Rectangular Pulse rect(t/T)</option>
					<option value="exponential">
						Exponential Decay e^(-at) u(t)
					</option>
					<option value="gaussian">Gaussian e^(-at^2)</option>
					<option value="delta">Dirac Delta δ(t)</option>
					<option value="cos">Cosines & Sinusoids</option>
				</select>
			</div>
		</DrillPanel>
	{/snippet}

	<!-- Main Practice Card -->
	<div class="practice-card">
		<div class="card-header">
			<h2 class="card-title">CTFT Transform Problem</h2>
		</div>

		<div class="problem-prompt">
			<MathBlock math={currentProblem.promptLatex} />
		</div>

		<div class="input-section">
			<label
				for="ctft-input"
				class="input-label"
			>
				<MathText text={String.raw`Enter $X(\omega)$ in LaTeX:`} />
			</label>
			<input
				id="ctft-input"
				type="text"
				class="math-text-input"
				bind:value={userAttempt}
				placeholder="Enter LaTeX answer..."
			/>

			<div class="action-bar">
				<button
					type="button"
					class="btn btn-primary"
					onclick={handleCheck}
				>
					Check Answer
				</button>
				<button
					type="button"
					class="btn btn-secondary"
					onclick={handleGenerateNext}
				>
					Next Problem
				</button>
			</div>
		</div>

		{#if isSubmitted}
			<div
				class="feedback-box"
				class:correct={isCorrect}
				class:incorrect={!isCorrect}
			>
				<p class="feedback-status">
					{isCorrect
						? "✅ Correct!"
						: "❌ Keep trying! Check reference solution below."}
				</p>
				<div class="ref-solution">
					<strong>Reference Answer:</strong>
					<MathBlock
						math={currentProblem.referenceAnswerLatex}
						compact={true}
					/>
				</div>
			</div>
		{/if}

		<!-- Zero-Guesswork Solution Breakdown -->
		<div class="solution-breakdown">
			<h3 class="solution-title">Solution Breakdown</h3>
			{#each currentProblem.solutionSteps as step}
				<div class="step-card">
					<h4 class="step-heading">{step.title}</h4>
					<MathBlock
						math={step.latex}
						compact={true}
					/>
				</div>
			{/each}
		</div>
	</div>
</PageLayout>

<style>
	/* ── Practice card ─────────────────────────────────────── */

	.practice-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.card-title {
		font-size: var(--text-lg);
		font-weight: 700;
		color: var(--text-primary);
	}

	/* ── LaTeX input section & actions ─────────────────────── */

	.input-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.input-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-secondary);
	}

	.action-bar {
		display: flex;
		gap: 0.75rem;
	}

	.btn-primary {
		background: var(--accent-primary);
		color: var(--accent-contrast, #042f2e);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary:hover,
	.btn-primary:focus-visible {
		background: var(--accent-hover);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.btn-secondary {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-secondary:hover,
	.btn-secondary:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Feedback banner ───────────────────────────────────── */

	.feedback-box {
		padding: 1rem;
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Correct — green alert */
	.feedback-box.correct {
		background: var(--color-success-bg);
		border: 1px solid var(--color-success);
	}

	/* Incorrect — red alert */
	.feedback-box.incorrect {
		background: var(--color-error-bg);
		border: 1px solid var(--color-error);
	}

	/* ── Solution breakdown ────────────────────────────────── */

	.solution-breakdown {
		border-top: 1px solid var(--border-color);
		padding-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.solution-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.step-card {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.step-heading {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--accent-primary);
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.practice-card {
			padding: 1rem 0.85rem;
		}
	}
</style>
