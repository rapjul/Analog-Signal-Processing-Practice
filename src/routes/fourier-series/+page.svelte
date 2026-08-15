<script lang="ts">
	/**
	 * Fourier Series Practice Module Route (/fourier-series).
	 * Implements Trigonometric & Exponential Fourier Series coefficient derivation,
	 * harmonic spectrum analysis, Gibbs phenomenon visualizer, and formula reference.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import MathInline from "$lib/components/math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import FourierPracticeCard from "$lib/components/ui/FourierPracticeCard.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import Navigation from "$lib/components/ui/Navigation.svelte";
	import {
		type FourierSeriesProblem,
		type FourierWaveformType,
		generateFourierSeriesProblem,
	} from "$lib/math-engine/fourier-series";

	let selectedWaveform = $state<FourierWaveformType>("square");

	// Active problem state
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let currentProblem = $state<FourierSeriesProblem>(
		generateFourierSeriesProblem("square"),
	);

	/**
	 * Regenerates a new Fourier series problem using current selected waveform option.
	 */
	function handleGenerateNext() {
		currentProblem = generateFourierSeriesProblem(selectedWaveform);
	}

	/**
	 * Handles change to waveform selector.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleOptionChange() {
		handleGenerateNext();
	}
</script>

<svelte:head>
	<title>Fourier Series Practice — SignalLab</title>
</svelte:head>

<Navigation activeRoute="/fourier-series" />

<main class="page-container">
	<div class="header-section">
		<h1 class="page-title">Fourier Series Analysis</h1>
		<p class="page-subtitle">
			Calculate Trigonometric <MathInline math={"(a_0, a_n, b_n)"} /> and Exponential
			<MathInline math={"(c_n)"} /> Fourier coefficients, Parseval power, and
			observe the Gibbs phenomenon.
		</p>
	</div>

	<!-- Control Bar: Waveform Customization -->
	<div class="control-bar">
		<div class="control-group">
			<label for="waveform-select" class="control-label">
				Periodic Waveform Category:
			</label>
			<select
				id="waveform-select"
				class="select-input"
				bind:value={selectedWaveform}
				onchange={handleOptionChange}
			>
				<option value="square">Square Wave</option>
				<option value="triangle">Triangle Wave</option>
				<option value="sawtooth">Sawtooth Wave</option>
				<option value="half_wave_sine">Half-Wave Rectified Sine Wave</option>
			</select>
		</div>
	</div>

	<!-- Main Practice Workspace (Full Width) -->
	<div class="workspace-container">
		<FourierPracticeCard
			problem={currentProblem}
			onNextProblem={handleGenerateNext}
		/>
	</div>
</main>

<style>
	.page-container {
		max-width: 1100px;
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
		letter-spacing: -0.025em;
		color: var(--text-primary);
	}

	.page-subtitle {
		font-size: 0.95rem;
		color: var(--text-secondary);
	}

	.control-bar {
		display: flex;
		gap: 1.5rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem 1.25rem;
		flex-wrap: wrap;
	}

	.control-group {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
		width: 100%;
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
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		outline: none;
		max-width: 100%;
		text-overflow: ellipsis;
	}

	.select-input:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.workspace-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-width: 0;
	}

	@media (max-width: 480px) {
		.page-container {
			padding: 1rem 0.75rem;
			gap: 1rem;
		}

		.control-bar {
			padding: 0.75rem 0.85rem;
		}

		.select-input {
			width: 100%;
		}
	}
</style>
