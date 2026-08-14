<script lang="ts">
	/**
	 * Circuit Analysis & Transfer Functions H(s) Module Route (/circuits).
	 * Implements 6 topology selection, dynamic component value sliders (R, L, C),
	 * transfer function H(s) derivation, and Bode plot calculation.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import Navigation from "$lib/components/ui/Navigation.svelte";
	import {
		type CircuitTopology,
		evaluateBodePoint,
		evaluateTransferFunction,
		generateCircuitProblem,
	} from "$lib/math-engine/circuits";

	let selectedTopology = $state<CircuitTopology>("series-rlc");
	let R = $state(10);
	let L = $state(1);
	let C = $state(0.01);

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let currentProblem = $state(generateCircuitProblem("series-rlc"));
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let tf = $derived(evaluateTransferFunction(selectedTopology, { R, L, C }));
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let cornerBode = $derived(
		evaluateBodePoint(selectedTopology, { R, L, C }, 10),
	);

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleGenerateNext() {
		currentProblem = generateCircuitProblem(selectedTopology);
	}
</script>

<svelte:head>
	<title>Circuit Analysis & Transfer Functions — SignalLab</title>
</svelte:head>

<Navigation activeRoute="/circuits" />

<main class="page-container">
	<div class="header-section">
		<h1 class="page-title">Circuit Analysis & Transfer Functions H(s)</h1>
		<p class="page-subtitle">
			Derive transfer functions H(s) for 6 core RLC/RC/RL circuit
			topologies, AC steady-state phasors, and Bode plots.
		</p>
	</div>

	<!-- Topology Bar -->
	<div class="control-bar">
		<div class="control-group">
			<label for="topology-select" class="control-label"
				>Circuit Topology:</label
			>
			<select
				id="topology-select"
				class="select-input"
				bind:value={selectedTopology}
				onchange={handleGenerateNext}
			>
				<option value="series-rlc">1. Series RLC Filter</option>
				<option value="parallel-rlc">2. Parallel RLC Filter</option>
				<option value="parallel-lc-series-r"
					>3. Parallel LC in Series with R (Notch)</option
				>
				<option value="parallel-rc-series-l"
					>4. Parallel RC in Series with L</option
				>
				<option value="rc-lpf">5. 1st-Order RC Low-Pass Filter</option>
				<option value="active-sallen-key"
					>6. Active Sallen-Key 2nd-Order LPF</option
				>
			</select>
		</div>
	</div>

	<div class="workspace-grid">
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
					<label for="r-slider">R: {R} Ω</label>
					<input
						id="r-slider"
						type="range"
						min="1"
						max="100"
						bind:value={R}
					/>
				</div>
				<div class="slider-row">
					<label for="l-slider">L: {L} H</label>
					<input
						id="l-slider"
						type="range"
						min="0.1"
						max="10"
						step="0.1"
						bind:value={L}
					/>
				</div>
				<div class="slider-row">
					<label for="c-slider">C: {C} F</label>
					<input
						id="c-slider"
						type="range"
						min="0.001"
						max="0.1"
						step="0.001"
						bind:value={C}
					/>
				</div>
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
						<MathBlock math={step.latex} compact={true} />
					</div>
				{/each}
			</div>
		</div>

		<!-- Bode Sidebar -->
		<aside class="reference-sidebar">
			<div class="reference-card">
				<h3 class="ref-title">⚡ Bode Response Info</h3>
				<div class="ref-section">
					<h4>Frequency Sample: ω = 10 rad/s</h4>
					<p>
						Magnitude: <strong
							>{cornerBode.magnitudeDb.toFixed(2)} dB</strong
						>
					</p>
					<p>
						Phase: <strong>{cornerBode.phaseDeg.toFixed(2)}°</strong
						>
					</p>
				</div>
			</div>
		</aside>
	</div>
</main>

<style>
	.page-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.header-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.page-subtitle {
		font-size: 0.95rem;
		color: var(--text-secondary);
	}

	.control-bar {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem 1.25rem;
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.control-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.select-input {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		outline: none;
	}

	.select-input:focus {
		border-color: var(--accent-primary);
	}

	.workspace-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 320px;
		gap: 1.5rem;
		align-items: start;
	}

	@media (max-width: 900px) {
		.workspace-grid {
			grid-template-columns: 1fr;
		}
	}

	.practice-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.card-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
	}

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
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--accent-primary);
	}

	.slider-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
	}

	.tf-output {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem;
	}

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

	.reference-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.ref-title {
		font-size: 1rem;
		font-weight: 700;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.5rem;
	}

	.ref-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.ref-section h4 {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
	}
</style>
