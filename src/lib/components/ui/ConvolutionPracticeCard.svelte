<script lang="ts">
	/**
	 * Convolution practice card with a guided five-step ITS solver.
	 *
	 * Keeps the problem statement spoiler-free, defers the flip-and-shift canvas
	 * and worked solution until completion, and mirrors the ODE/Fourier flow.
	 */

	import ConvolutionCanvas from "$lib/components/canvas/ConvolutionCanvas.svelte";
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import ConvolutionStepSolver from "$lib/components/solvers/ConvolutionStepSolver.svelte";
	import CompletionBanner from "$lib/components/ui/CompletionBanner.svelte";
	import ProblemHeader from "$lib/components/ui/ProblemHeader.svelte";
	import StepReveal from "$lib/components/ui/StepReveal.svelte";
	import {
		type ConvolutionProblem,
		getFiniteConvolutionTransitionTimes,
	} from "$lib/math-engine/convolution/index";
	import type { SolutionStep } from "$lib/math-engine/types";

	interface Props {
		/** Active convolution problem instance. */
		problem: ConvolutionProblem;
		/** Callback triggered when the user requests another problem. */
		onNextProblem: () => void;
	}

	let { problem, onNextProblem }: Props = $props();

	/** Whether the guided tutor has validated all seven parent steps. */
	let isCompleted = $state(false);
	/** Signal selected by the student for the completed animation. */
	let flippedSignal = $state<"x" | "h">("h");
	/** Exploratory moving signal used by the optional early animation. */
	let previewFlippedSignal = $state<"x" | "h">("h");
	/** Whether Step 3 has made the exploratory preview path authoritative. */
	let movingPathVerified = $state(false);
	/** Finite overlap boundaries reused by the completed animation. */
	const transitionTimes = $derived(
		getFiniteConvolutionTransitionTimes(problem.intervals),
	);
	/** Complete path-aware worked solution rendered inside the disclosure. */
	const solutionBreakdown = $derived.by((): SolutionStep[] => {
		const formula =
			problem.itsData.step3.formulaBySignal[flippedSignal].options.find(
				({ isCorrect }) => isCorrect,
			)?.latex ?? "";
		const transformedSections = problem.itsData.step3.sectionsBySignal[
			flippedSignal
		]
			.map(({ leftLatex, rightLatex, includedEndpoint }) => {
				const left =
					includedEndpoint === "left" || includedEndpoint === "both"
						? "["
						: "(";
				const right =
					includedEndpoint === "right" || includedEndpoint === "both"
						? "]"
						: ")";
				return `\\tau\\in${left}${leftLatex},${rightLatex}${right}`;
			})
			.join("\\\\");
		const transitions = problem.itsData.step4.transitionGroups
			.map(({ time }) => `t=${time}`)
			.join(",\\;");
		const setups = problem.itsData.step5.parts
			.map(
				(part) =>
					part.setupBySignal?.[flippedSignal].integralLatex ??
					"y(t)=0",
			)
			.join("\\\\[0.4em]");
		const evaluated = problem.intervals
			.map(
				({ labelLatex, exprLatex }) =>
					`${labelLatex}:&\\quad y(t)=${exprLatex}`,
			)
			.join("\\\\[0.4em]");
		return [
			{
				title: "Record input and output timing",
				description:
					"The support is the time range where a signal can be nonzero. Adding the verified starts and ends gives the output span.",
				latex: problem.itsData.step1.parts
					.map(({ resultLatex }) => resultLatex)
					.join("\\\\"),
				aligned: true,
				responsive: true,
			},
			{
				title: "Define convolution",
				description:
					"Use one fixed signal and reflect and translate the other signal.",
				latex:
					problem.itsData.step2.options.find(
						({ isCorrect }) => isCorrect,
					)?.latex ?? "",
				responsive: true,
			},
			{
				title: "Apply the selected flip-and-shift path",
				description: `The learner selected $${flippedSignal}(t)$ as the moving signal; this same path controls every later bound.`,
				latex: `${formula}\\\\${transformedSections}`,
				aligned: true,
				responsive: true,
			},
			{
				title: "Find transitions and build intervals",
				description:
					"Each transition comes from a fixed breakpoint contacting a reflected moving breakpoint. Sorting them creates the time intervals.",
				latex: `\\mathcal T=\\{${transitions}\\}\\\\\\mathcal R=\\{${problem.itsData.step4.intervalLabels.join(",\\;")}\\}`,
				aligned: true,
				responsive: true,
			},
			{
				title: "Choose every lower and upper limit",
				description:
					"For each time interval, the lower limit is the larger active left edge and the upper limit is the smaller active right edge.",
				latex: setups,
				aligned: true,
				responsive: true,
			},
			{
				title: "Evaluate every definite integral",
				description:
					"Evaluate each verified setup and keep its expression attached to the interval where those bounds apply.",
				latex: evaluated,
				aligned: true,
				responsive: true,
			},
			{
				title: "Assemble the piecewise response",
				description:
					"Combine the interval expressions, including both exterior zero regions.",
				latex: problem.itsData.step7.resultLatex,
				responsive: true,
			},
		];
	});

	$effect(() => {
		if (problem) {
			isCompleted = false;
			movingPathVerified = false;
			previewFlippedSignal = "h";
		}
	});

	/** Synchronizes the optional preview to the learner's verified Step 3 path. */
	function handleMovingSignalVerified(selectedSignal: "x" | "h"): void {
		previewFlippedSignal = selectedSignal;
		movingPathVerified = true;
	}

	/** Reveals the worked solution and graphical verifier after tutor completion. */
	function handleProblemCompleted(selectedSignal: "x" | "h"): void {
		flippedSignal = selectedSignal;
		isCompleted = true;
	}
</script>

<div class="convolution-practice-card">
	<ProblemHeader
		title={problem.title}
		category="Continuous-Time Problem"
		{onNextProblem}
	/>

	<!-- Clean anti-spoiler problem statement -->
	<div class="problem-statement">
		<p class="statement-text">
			<MathText
				text={String.raw`Derive the analytical continuous-time convolution $y(t)=(x*h)(t)$ for the two signals:`}
			/>
		</p>
		<div class="signals-grid">
			<div class="signal-box">
				<span class="signal-label">
					<MathText text={String.raw`Input signal $x(t)$`} />
				</span>
				<MathBlock
					math={`x(t)=${problem.xLatex}`}
					compact={true}
					responsive={true}
				/>
				<p class="endpoint-definition">
					<MathText
						text={`Endpoint convention: ${problem.itsData.step3.sectionsBySignal.x.map(({ originalLatex }) => `$${originalLatex}$`).join(", ")}.`}
					/>
				</p>
			</div>
			<div class="signal-box">
				<span class="signal-label">
					<MathText text={String.raw`Impulse response $h(t)$`} />
				</span>
				<MathBlock
					math={`h(t)=${problem.hLatex}`}
					compact={true}
					responsive={true}
				/>
				<p class="endpoint-definition">
					<MathText
						text={`Endpoint convention: ${problem.itsData.step3.sectionsBySignal.h.map(({ originalLatex }) => `$${originalLatex}$`).join(", ")}.`}
					/>
				</p>
			</div>
		</div>
	</div>

	<details class="early-visual-disclosure">
		<summary>Explore the convolution animation before solving</summary>
		<p>
			This optional geometric preview shows the complete output. Use it to
			build intuition; the tutor still asks you to derive every interval.
		</p>
		<div
			class="preview-path-controls"
			aria-label="Choose the moving signal in the exploratory animation"
		>
			<button
				type="button"
				class:selected={previewFlippedSignal === "x"}
				aria-pressed={previewFlippedSignal === "x"}
				disabled={movingPathVerified}
				onclick={() => (previewFlippedSignal = "x")}
			>
				<MathText text={String.raw`Preview moving $x(t)$`} />
			</button>
			<button
				type="button"
				class:selected={previewFlippedSignal === "h"}
				aria-pressed={previewFlippedSignal === "h"}
				disabled={movingPathVerified}
				onclick={() => (previewFlippedSignal = "h")}
			>
				<MathText text={String.raw`Preview moving $h(t)$`} />
			</button>
		</div>
		{#if movingPathVerified}
			<p class="verified-preview-note">
				Step 3 is verified, so this animation now follows the selected
				path.
			</p>
		{/if}
		<ConvolutionCanvas
			evalX={problem.evalX}
			evalH={problem.evalH}
			evalY={problem.eval}
			timeRange={problem.timeRange ?? [-2, 6]}
			{transitionTimes}
			flippedSignal={previewFlippedSignal}
			movingBreakpoints={previewFlippedSignal === "x"
				? (problem.xBreakpoints ?? [])
				: (problem.hBreakpoints ?? [])}
			movingSupportEdges={previewFlippedSignal === "x"
				? problem.xSupportEdges
				: problem.hSupportEdges}
			fixedBreakpoints={previewFlippedSignal === "x"
				? (problem.hBreakpoints ?? [])
				: (problem.xBreakpoints ?? [])}
			title="Optional Convolution Geometry Preview"
		/>
	</details>

	<!-- Intelligent Tutoring System stepped solver -->
	<div class="solver-container">
		<ConvolutionStepSolver
			{problem}
			onComplete={handleProblemCompleted}
			onMovingSignalVerified={handleMovingSignalVerified}
		/>
	</div>

	<!-- Post-solve verification and visualizer -->
	{#if isCompleted}
		<div class="completion-section">
			<CompletionBanner
				title="Problem Completed!"
				description={String.raw`You have derived every overlap region and assembled the exact piecewise response $y(t)$. Use the animator to connect the verified algebra to the moving overlap geometry.`}
				stats={[
					{ label: "Tutor Steps", value: 7 },
					{
						label: "Verified Regions",
						value: problem.intervals.length,
					},
				]}
			/>

			<section class="verified-response">
				<h3 class="verified-response-title">
					<MathText text={String.raw`Verified response $y(t)$`} />
				</h3>
				<MathBlock
					math={problem.itsData.step7.resultLatex}
					compact={true}
					responsive={true}
				/>
			</section>

			<StepReveal steps={solutionBreakdown} />

			<div class="visualizer-wrapper">
				<ConvolutionCanvas
					evalX={problem.evalX}
					evalH={problem.evalH}
					evalY={problem.eval}
					timeRange={problem.timeRange ?? [-2, 6]}
					{transitionTimes}
					{flippedSignal}
					movingBreakpoints={flippedSignal === "x"
						? (problem.xBreakpoints ?? [])
						: (problem.hBreakpoints ?? [])}
					movingSupportEdges={flippedSignal === "x"
						? problem.xSupportEdges
						: problem.hSupportEdges}
					fixedBreakpoints={flippedSignal === "x"
						? (problem.hBreakpoints ?? [])
						: (problem.xBreakpoints ?? [])}
					title="Verified Flip-and-Shift Overlap Visualizer"
				/>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Practice card container ───────────────────────────── */

	.convolution-practice-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		box-sizing: border-box;
		container-type: inline-size;
	}

	/* ── Problem statement & signal preview ────────────────── */

	.problem-statement {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.statement-text {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0;
		overflow-wrap: anywhere;
	}

	.signals-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		width: 100%;
		max-width: 780px;
		margin-inline: auto;
		min-width: 0;
	}

	.signal-box {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
		width: 100%;
		box-sizing: border-box;
	}

	.signal-box :global(.math-block) {
		width: 100%;
		min-width: 0;
		margin: 0.25rem 0 0;
	}

	.convolution-practice-card :global(.math-block),
	.convolution-practice-card :global(.math-block-content) {
		box-sizing: border-box;
	}

	.signal-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-muted);
	}

	.endpoint-definition {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}

	/* ── Optional early geometric preview ─────────────────── */

	.early-visual-disclosure {
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 0.8rem;
		min-width: 0;
	}

	.early-visual-disclosure > summary {
		cursor: pointer;
		font-weight: 700;
		color: var(--accent-primary);
	}

	.early-visual-disclosure > summary:focus-visible,
	.preview-path-controls button:focus-visible {
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}

	.early-visual-disclosure > p,
	.verified-preview-note {
		color: var(--text-secondary);
		font-size: var(--text-sm);
	}

	.preview-path-controls {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-block: 0.75rem;
	}

	.preview-path-controls button {
		padding: 0.65rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		color: var(--text-primary);
		cursor: pointer;
	}

	.preview-path-controls button.selected {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
	}

	.preview-path-controls button:disabled {
		cursor: not-allowed;
		opacity: 0.75;
	}

	/* ── Solver & completion sections ─────────────────────── */

	.solver-container,
	.visualizer-wrapper {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-width: 0;
	}

	.completion-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding-top: 1rem;
		border-top: 2px dashed var(--border-color);
		animation: completionFadeIn 0.3s ease-out;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		overflow: hidden;
	}

	.verified-response {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		min-width: 0;
	}

	.verified-response-title {
		font-size: var(--text-base);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	@keyframes completionFadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ── Container query (≤700px) ─────────────────────────── */

	@container (max-width: 700px) {
		.signals-grid {
			grid-template-columns: 1fr;
			max-width: 520px;
		}
	}

	/* ── Mobile media query (≤480px) ──────────────────────── */

	@media (max-width: 480px) {
		.convolution-practice-card {
			padding: 1rem 0.75rem;
			gap: 1rem;
		}

		.problem-statement {
			padding: 0.85rem 0.65rem;
		}

		.signal-box {
			padding: 0.5rem;
		}

		.preview-path-controls {
			grid-template-columns: 1fr;
		}
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.convolution-practice-card {
			padding: 0.75rem 0.5rem;
		}

		.problem-statement {
			padding: 0.65rem 0.4rem;
		}
	}
</style>
