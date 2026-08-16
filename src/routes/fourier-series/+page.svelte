<script lang="ts">
	/**
	 * Fourier Series Practice Module Route (/fourier-series).
	 *
	 * Implements Trigonometric & Exponential Fourier Series coefficient derivation,
	 * harmonic spectrum analysis, Gibbs phenomenon visualizer, and formula reference.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import FourierPracticeCard from "$lib/components/ui/FourierPracticeCard.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
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

<PageLayout
	title="Fourier Series Analysis"
	subtitleText={String.raw`Calculate Trigonometric $(a_0, a_n, b_n)$ and Exponential $(c_n)$ Fourier coefficients, Parseval power, and observe the Gibbs phenomenon.`}
	metaDescription="Practice deriving Trigonometric and Exponential Fourier Series coefficients with harmonic spectrum analysis and Gibbs phenomenon visualization."
	activeRoute="/fourier-series"
>
	{#snippet controls()}
		<DrillPanel
			title="Targeted Drill & Waveform Customization"
			badge={selectedWaveform === "square"
				? "Default (Square Wave)"
				: "Custom Waveform Selected"}
		>
			<div class="control-group">
				<label
					for="waveform-select"
					class="control-label"
				>
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
					<option value="half_wave_sine">
						Half-Wave Rectified Sine Wave
					</option>
				</select>
			</div>
		</DrillPanel>
	{/snippet}

	<FourierPracticeCard
		problem={currentProblem}
		onNextProblem={handleGenerateNext}
	/>
</PageLayout>
