<script lang="ts">
	/**
	 * Fourier Series Practice Module Route (/fourier-series).
	 *
	 * Implements Trigonometric & Exponential Fourier Series coefficient derivation,
	 * harmonic spectrum analysis, Gibbs phenomenon visualizer, and formula reference.
	 */

	import { onMount } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import FourierSeriesPracticeCard from "$lib/components/ui/FourierSeriesPracticeCard.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import {
		type FourierSeriesProblem,
		generateFourierSeriesProblem,
	} from "$lib/math-engine/fourier-series/index";
	import { createRandomSeed } from "$lib/math-engine/random";
	import {
		type FourierSeriesWaveformSelection,
		parseFourierSeriesFilters,
		resolveFourierWaveformSelection,
		serializeFourierSeriesFilters,
	} from "$lib/problems/fourier-series-filters";

	const initialFilters = parseFourierSeriesFilters(page.url.searchParams);
	let selectedWaveform = $state<FourierSeriesWaveformSelection>(
		initialFilters.waveform,
	);
	let seed = $state(initialFilters.seed);

	/** Generates the concrete problem represented by selector state and seed. */
	function generateSelectedProblem(
		selection: FourierSeriesWaveformSelection,
		problemSeed: number,
	): FourierSeriesProblem {
		const waveform = resolveFourierWaveformSelection(
			selection,
			problemSeed,
		);
		return generateFourierSeriesProblem(waveform, { seed: problemSeed });
	}

	// Active problem state generated once from canonical initial filters
	let currentProblem = $state<FourierSeriesProblem>(
		generateSelectedProblem(initialFilters.waveform, initialFilters.seed),
	);

	/** Synchronizes the selected waveform and seed with shareable URL state. */
	function syncShareableUrl(): void {
		if (typeof window === "undefined") return;
		const params = serializeFourierSeriesFilters({
			waveform: selectedWaveform,
			seed,
		});
		replaceState(
			`${window.location.pathname}?${params.toString()}${window.location.hash}`,
			page.state,
		);
	}

	onMount(() => {
		window.setTimeout(syncShareableUrl, 0);
	});

	/**
	 * Regenerates a new Fourier series problem using current selected waveform option.
	 */
	function handleGenerateNext(): void {
		seed = createRandomSeed();
		currentProblem = generateSelectedProblem(selectedWaveform, seed);
		syncShareableUrl();
	}

	/**
	 * Handles change to waveform selector.
	 */
	function handleOptionChange(): void {
		handleGenerateNext();
	}
</script>

<PageLayout
	title="Fourier Series Analysis"
	subtitleText={String.raw`Calculate Trigonometric $(a_0, a_n, b_n)$ and Exponential $(F_n)$ Fourier coefficients, Parseval power, and study harmonic reconstruction.`}
	metaDescription="Practice deriving Trigonometric and Exponential Fourier Series coefficients with harmonic spectrum analysis and Gibbs phenomenon visualization."
	activeRoute="/fourier-series"
>
	{#snippet controls()}
		<DrillPanel
			title="Targeted Drill & Waveform Customization"
			badge={selectedWaveform === "random"
				? "Randomized Across All Waveforms"
				: selectedWaveform === "square"
					? "Default (Square Wave)"
					: "Custom Waveform Selected"}
		>
			<input
				type="hidden"
				name="seed"
				value={seed}
			/>
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
					<option value="random">Random (All Waveforms)</option>
					<option value="square">Square Wave</option>
					<option value="square_odd">Odd Square Wave</option>
					<option value="square_even">Even Square Wave</option>
					<option value="triangle">Triangle Wave</option>
					<option value="triangle_odd">Odd Triangle Wave</option>
					<option value="triangle_even">Even Triangle Wave</option>
					<option value="sawtooth">Sawtooth Wave</option>
					<option value="half_wave_sine">
						Half-Wave Rectified Sine Wave
					</option>
					<option value="full_wave_sine">
						Full-Wave Rectified Sine Wave
					</option>
				</select>
			</div>
		</DrillPanel>
	{/snippet}

	<FourierSeriesPracticeCard
		problem={currentProblem}
		onNextProblem={handleGenerateNext}
	/>
</PageLayout>
