<script lang="ts">
	import LaplaceCompletion from "$lib/components/canvas/LaplaceCompletion.svelte";
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import LaplaceStepSolver from "$lib/components/solvers/LaplaceStepSolver.svelte";
	import type { LaplaceExercise } from "$lib/math-engine/laplace/types";
	import CompletionBanner from "./CompletionBanner.svelte";
	import ProblemHeader from "./ProblemHeader.svelte";
	import WorkedSolution from "./WorkedSolution.svelte";
	/** Practice card with isolated attempt and assistance state. */
	interface Props {
		/** Active problem. */ problem: LaplaceExercise;
		/** Next exercise action. */ onNextProblem: () => void;
	}
	let { problem, onNextProblem }: Props = $props();
	let completed = $state(false),
		assisted = $state(false);
	$effect(() => {
		void problem;
		completed = false;
		assisted = false;
	});
</script>

<div class="practice-card laplace-practice-card">
	<ProblemHeader
		title="Laplace Practice"
		category={problem.spec.workflow === "ode"
			? "Initial-Value Problem"
			: problem.spec.workflow === "roc"
				? "System Analysis"
				: "Transform Problem"}
		{onNextProblem}
	/>
	<div class="problem-prompt">
		<MathBlock math={problem.prompt} />
		<p><MathText text={problem.conditions} /></p>
	</div>
	{#key problem}
		<LaplaceStepSolver
			{problem}
			onComplete={() => (completed = true)}
		/>
		{#if completed}<CompletionBanner
				title={assisted
					? "Guided Practice Completed with Assistance"
					: "Problem Completed!"}
				description="Every required task has passed verification. Review your derivation and the completed diagrams below."
			/>{/if}
		<WorkedSolution
			verified={completed}
			onAssist={() => (assisted = true)}
		>
			<div class="solution-breakdown">
				<h3>Complete worked solution</h3>
				{#each problem.stages as stage}<section>
						<h4>{stage.title}</h4>
						{#each stage.tasks as task}<p>
								<strong><MathText text={task.title} /></strong>
							</p>
							{#if task.kind === "choice"}<p>
									<MathText text={task.answer} />
								</p>{:else}<MathBlock
									math={task.answer}
									compact
								/>{/if}{/each}
					</section>{/each}
				<MathBlock
					math={problem.response}
					compact
				/>
			</div>
		</WorkedSolution>
	{/key}
	{#if completed}<LaplaceCompletion {problem} />{/if}
</div>

<style>
	.laplace-practice-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: clamp(0.75rem, 3vw, 1.5rem);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		min-width: 0;
		width: 100%;
		box-sizing: border-box;
	}
	.problem-prompt {
		background: var(--bg-secondary);
		padding: 1rem;
		border-radius: var(--radius-md);
		min-width: 0;
		overflow-x: auto;
	}
	.solution-breakdown,
	section {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	section {
		border-bottom: 1px solid var(--border-color);
		padding: 0.5rem 0;
	}
</style>
