<script lang="ts">
	/**
	 * Fourier Series Practice Module Route (/fourier-series).
	 * Implements Trigonometric & Exponential Fourier Series coefficient derivation,
	 * harmonic spectrum analysis, Gibbs phenomenon visualizer, and formula reference.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import MathBlock from "$lib/components/math/MathBlock.svelte";
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

	// Sidebar formulas
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const parsevalMath =
		"P_x = \\frac{1}{T_0} \\int_{T_0} |x(t)|^2 dt = a_0^2 + \\frac{1}{2} \\sum_{n=1}^{\\infty} (a_n^2 + b_n^2)";
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const cnRelationMath =
		"c_n = \\frac{a_n - j b_n}{2}, \\quad c_{-n} = c_n^*";
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
				<option value="square">
					Square Wave (Odd Symmetry, a0=0, an=0)
				</option>
				<option value="triangle">
					Triangle Wave (Even Symmetry, a0=0, bn=0)
				</option>
				<option value="sawtooth"> Sawtooth Wave (Odd Symmetry) </option>
				<option value="half_wave_sine">
					Half-Wave Rectified Sine Wave
				</option>
			</select>
		</div>
	</div>

	<!-- Main Practice Workspace -->
	<div class="workspace-grid">
		<FourierPracticeCard
			problem={currentProblem}
			onNextProblem={handleGenerateNext}
		/>

		<!-- Quick Reference Formula Card -->
		<aside class="reference-sidebar">
			<div class="reference-card">
				<h3 class="ref-title">📖 Fourier Series Formula Sheet</h3>
				<div class="ref-section">
					<h4>Complex & Trig Conversion</h4>
					<MathBlock math={cnRelationMath} compact={true} />
				</div>
				<div class="ref-section">
					<h4>Symmetry Shortcuts</h4>
					<p>
						<strong>Even Function:</strong>
						<MathInline
							math={"x(-t) = x(t) \\rightarrow b_n = 0, c_n \\in \\mathbb{R}"}
						/>
					</p>
					<p>
						<strong>Odd Function:</strong>
						<MathInline
							math={"x(-t) = -x(t) \\rightarrow a_0=0, a_n=0, c_n \\in j\\mathbb{R}"}
						/>
					</p>
					<p>
						<strong>Half-Wave Odd:</strong>
						<MathInline
							math={"x(t - T_0/2) = -x(t) \\rightarrow a_n=b_n=0"}
						/> for even <MathInline math={"n"} />
					</p>
				</div>
				<div class="ref-section">
					<h4>Parseval's Power Theorem</h4>
					<MathBlock math={parsevalMath} compact={true} />
				</div>
				<div class="ref-section">
					<h4>Gibbs Phenomenon</h4>
					<p>
						As <MathInline math={"N \\to \\infty"} />, partial sum
						overshoot at jump discontinuities approaches <MathInline
							math={"\\approx 8.95\\%"}
						/> of the jump height.
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
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
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

	.reference-sidebar {
		display: flex;
		flex-direction: column;
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
		color: var(--text-primary);
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.5rem;
	}

	.ref-section {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.ref-section h4 {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
	}
</style>
