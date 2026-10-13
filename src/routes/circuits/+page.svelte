<script lang="ts">
	/**
	 * Circuit Analysis & Transfer Functions H(s) Module Route (/circuits).
	 *
	 * Implements 6 topology selection, dynamic component value sliders (R, L, C),
	 * transfer function H(s) derivation, and Bode plot calculation.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import WorkedSolution from "$lib/components/ui/WorkedSolution.svelte";
	import {
		type CircuitTopology,
		circuitUsesCapacitor,
		circuitUsesInductor,
		createCircuitProblem,
		evaluateBodePoint,
		evaluateTransferFunction,
		generateCircuitProblem,
	} from "$lib/math-engine/circuits";

	let selectedTopology = $state<CircuitTopology>("series-rlc");
	const initialProblem = generateCircuitProblem("series-rlc");
	let R = $state(initialProblem.components.R);
	let L = $state(initialProblem.components.L);
	let C = $state(initialProblem.components.C);
	let generation = $state(0);

	let currentProblem = $derived({
		...createCircuitProblem(selectedTopology, { R, L, C }),
		id: `circuit-${generation}-${selectedTopology}-${R}-${L}-${C}`,
	});
	let tf = $derived(
		evaluateTransferFunction(
			currentProblem.topology,
			currentProblem.components,
		),
	);
	let cornerBode = $derived(
		evaluateBodePoint(
			currentProblem.topology,
			currentProblem.components,
			10,
		),
	);

	/** Regenerates the component model used by both sliders and calculations. */
	function handleGenerateNext() {
		const next = generateCircuitProblem(selectedTopology);
		({ R, L, C } = next.components);
		generation += 1;
	}
</script>

<PageLayout
	title="Circuit Analysis & Transfer Functions H(s)"
	subtitleText="Derive transfer functions H(s) for 6 core RLC/RC/RL circuit topologies, AC steady-state phasors, and Bode plots."
	metaDescription="Practice circuit transfer function H(s) derivations with interactive RLC sliders, steady-state AC phasors, and Bode plot analysis."
	activeRoute="/circuits"
>
	{#snippet controls()}
		<DrillPanel
			title="Targeted Drill & Circuit Topology Filters"
			badge={selectedTopology === "series-rlc"
				? "Default (Series RLC)"
				: "Custom Topology Selected"}
		>
			<div class="control-group">
				<label
					for="topology-select"
					class="control-label"
				>
					Circuit Topology:
				</label>
				<select
					id="topology-select"
					class="select-input"
					bind:value={selectedTopology}
					onchange={handleGenerateNext}
				>
					<option value="series-rlc">1. Series RLC Filter</option>
					<option value="parallel-rlc">2. Parallel RLC Filter</option>
					<option value="parallel-lc-series-r">
						3. Parallel LC in Series with R (Notch)
					</option>
					<option value="parallel-rc-series-l">
						4. Parallel RC in Series with L
					</option>
					<option value="rc-lpf">
						5. 1st-Order RC Low-Pass Filter
					</option>
					<option value="active-sallen-key">
						6. Active Sallen-Key 2nd-Order LPF
					</option>
				</select>
			</div>
		</DrillPanel>
	{/snippet}

	<div class="practice-card">
		<div class="card-header">
			<h2 class="card-title">Transfer Function H(s) Derivation</h2>
		</div>

		<div class="problem-prompt">
			<MathBlock math={currentProblem.promptLatex} />
		</div>

		<!-- Dynamic Component Sliders -->
		<div class="slider-panel">
			<h3 class="panel-title">Interactive Component Values</h3>
			<div class="slider-row">
				<label for="r-slider">
					<MathText text={String.raw`$R$: ${R} $\Omega$`} />
				</label>
				<input
					id="r-slider"
					type="range"
					min="1"
					max="200"
					bind:value={R}
				/>
			</div>
			{#if circuitUsesInductor(selectedTopology)}
				<div class="slider-row">
					<label for="l-slider">
						<MathText text={String.raw`$L$: ${L} $\text{H}$`} />
					</label>
					<input
						id="l-slider"
						type="range"
						min="0.1"
						max="10"
						step="0.1"
						bind:value={L}
					/>
				</div>
			{/if}
			{#if circuitUsesCapacitor(selectedTopology)}
				<div class="slider-row">
					<label for="c-slider">
						<MathText text={String.raw`$C$: ${C} $\text{F}$`} />
					</label>
					<input
						id="c-slider"
						type="range"
						min="0.001"
						max="0.1"
						step="0.001"
						bind:value={C}
					/>
				</div>
			{/if}
		</div>

		<button
			type="button"
			class="btn btn-secondary"
			onclick={handleGenerateNext}>Next Problem</button
		>
		{#key currentProblem}
			<WorkedSolution>
				<div class="bode-pill">
					<MathText
						text={String.raw`Frequency Sample $\omega = 10\text{ rad/s}$:`}
					/>
					<strong>{cornerBode.magnitudeDb.toFixed(2)} dB</strong>,
					<strong>{cornerBode.phaseDeg.toFixed(2)}°</strong>
				</div>
				<div class="tf-output">
					<h3 class="panel-title">Derived H(s)</h3>
					<MathBlock math={`H(s) = ${tf.hLatex}`} />
				</div>

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
			</WorkedSolution>
		{/key}
	</div>
</PageLayout>

<style>
	/* ── Practice regeneration control ────────────────────── */
	.btn-secondary {
		align-self: flex-start;
		max-width: 100%;
		padding: 0.5rem 1rem;
		background: var(--bg-primary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}
	.btn-secondary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}
	/* ── Practice card ─────────────────────────────────────── */

	.practice-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 100%;
		min-width: 0;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.card-title {
		font-size: var(--text-lg);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.bode-pill {
		background: rgba(6, 182, 212, 0.1);
		border: 1px solid rgba(6, 182, 212, 0.3);
		color: var(--text-primary);
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
	}

	/* ── Parameter slider panel ────────────────────────────── */

	.slider-panel {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.panel-title {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--accent-primary);
	}

	.slider-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--text-sm);
	}

	/* ── Transfer function output ──────────────────────────── */

	.tf-output {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem;
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

	/* ── Mobile media query (≤480px) ─────────────────────── */

	@media (max-width: 480px) {
		.practice-card {
			padding: 1rem 0.85rem;
		}
	}
</style>
