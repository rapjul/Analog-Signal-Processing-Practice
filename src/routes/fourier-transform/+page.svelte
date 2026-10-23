<script lang="ts">
	/** Guided forward CTFT derivation and transform-pair practice. */
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathInline from "$lib/components/math/MathInline.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import CtftStepSolver from "$lib/components/solvers/CtftStepSolver.svelte";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import ProblemHeader from "$lib/components/ui/ProblemHeader.svelte";
	import {
		CTFT_FAMILIES,
		type CtftPracticeMode,
	} from "$lib/math-engine/ctft-lesson";
	import {
		type CtftSignalType,
		createCtftProblem,
		generateCtftProblem,
	} from "$lib/math-engine/fourier-transform";

	let selectedType = $state<CtftSignalType>("rect");
	let mode = $state<CtftPracticeMode>("derivation");
	let currentProblem = $state(
		createCtftProblem("rect", { a: 1, T: 2, w0: 2, t0: 0 }),
	);
	/** Generates a fresh signal while preserving the teaching mode. */
	function handleGenerateNext(): void {
		currentProblem = generateCtftProblem(selectedType);
	}
</script>

<PageLayout
	title="Continuous-Time Fourier Transform (CTFT)"
	subtitleText="Practice forward CTFT through guided derivation or transform pairs and time-shift properties."
	metaDescription="Derive continuous-time Fourier transforms with verified intermediate steps, transform pairs, time-shift properties, and completed spectra."
	activeRoute="/fourier-transform"
>
	{#snippet controls()}
		<DrillPanel
			title="Signal Category & Teaching Mode"
			badge={mode === "derivation"
				? "Guided Derivation"
				: "Pairs & Properties"}
		>
			<div class="control-group">
				<label
					for="signal-type-select"
					class="control-label">Signal Category:</label
				>
				<select
					id="signal-type-select"
					class="select-input"
					bind:value={selectedType}
					onchange={handleGenerateNext}
				>
					{#each CTFT_FAMILIES as family}<option value={family.id}
							>{family.label}</option
						>{/each}
				</select>
			</div>
			<div class="control-group">
				<label
					for="ctft-mode-select"
					class="control-label">Teaching Mode:</label
				>
				<select
					id="ctft-mode-select"
					class="select-input"
					bind:value={mode}
					aria-describedby="mode-reset-note"
					><option value="derivation">Derivation</option><option
						value="pairs-properties">Pairs & Properties</option
					></select
				>
				<p id="mode-reset-note">
					Changing modes starts a fresh attempt on the same signal.
				</p>
			</div>
		</DrillPanel>
	{/snippet}
	<div class="practice-card">
		<ProblemHeader
			title="CTFT Transform Problem"
			onNextProblem={handleGenerateNext}
		/>
		<div class="problem-prompt">
			<MathBlock
				math={currentProblem.promptLatex}
				responsive
			/>
		</div>
		<details class="conventions">
			<summary>Transform conventions & input notation</summary>
			<MathBlock
				math={String.raw`X(\omega)=\int_{-\infty}^{\infty}x(t)e^{-j\omega t}\,dt,\quad x(t)=\frac{1}{2\pi}\int_{-\infty}^{\infty}X(\omega)e^{j\omega t}\,d\omega`}
				compact
				responsive
			/>
			<MathBlock
				math={String.raw`\operatorname{sinc}(z)=\frac{\sin(\pi z)}{\pi z},\quad\operatorname{sinc}(0)=1`}
				compact
			/>
			<p>
				<MathText
					text={String.raw`$\omega$ is angular frequency in rad/s. $j$ is the imaginary unit. Impulses have complex weights, not finite heights.`}
				/>
			</p>
		</details>
		<p id="ctft-notation">
			Enter LaTeX, fractions, or supported input notation such as
			<MathInline
				math={String.raw`\texttt{pi}`}
				copyText="pi"
			/>,
			<MathInline
				math={String.raw`\texttt{j}`}
				copyText="j"
			/>, and
			<MathInline
				math={String.raw`\texttt{omega}`}
				copyText="omega"
			/>. Equivalent exponential inputs include
			<MathInline
				math={String.raw`\texttt{e\textasciicircum(-j*omega)}`}
				copyText="e^(-j*omega)"
			/>
			and <MathInline
				math={String.raw`\texttt{e\textasciicircum\{-j*omega\}}`}
				copyText={"e^{-j*omega}"}
			/>. Select an example to copy its input text. All intermediate
			answers must be verified before the worked solution and plots
			unlock.
		</p>
		<CtftStepSolver
			problem={currentProblem}
			{mode}
		/>
	</div>
</PageLayout>

<style>
	/* ═══════════════════════════════════════════════════════════════════════
	   Practice card and conventions
	   ═══════════════════════════════════════════════════════════════════════ */
	.practice-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: clamp(0.65rem, 3vw, 1.5rem);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		min-width: 0;
	}
	p {
		color: var(--text-secondary);
	}
	summary {
		cursor: pointer;
	}
	summary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 4px;
		border-radius: var(--radius-sm);
	}
	.conventions {
		min-width: 0;
	}
</style>
