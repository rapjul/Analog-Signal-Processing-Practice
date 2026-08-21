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
	import FourierPracticeCard from "$lib/components/ui/FourierPracticeCard.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import {
		type FourierSeriesProblem,
		type FourierWaveformType,
		generateFourierSeriesProblem,
	} from "$lib/math-engine/fourier-series";
	import { createRandomSeed } from "$lib/math-engine/random";
	import {
		isPrimaryFourierDrillWaveform,
		parseFourierSeriesFilters,
		serializeFourierSeriesFilters,
	} from "$lib/problems/fourier-series-filters";

	const initialFilters = parseFourierSeriesFilters(page.url.searchParams);
	let selectedWaveform = $state<FourierWaveformType>(initialFilters.waveform);
	let seed = $state(initialFilters.seed);

	// Active problem state generated once from canonical initial filters
	let currentProblem = $state<FourierSeriesProblem>(
		generateFourierSeriesProblem(initialFilters.waveform, {
			seed: initialFilters.seed,
		}),
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
		currentProblem = generateFourierSeriesProblem(selectedWaveform, {
			seed,
		});
		syncShareableUrl();
	}

	/**
	 * Handles change to waveform selector.
	 */
	function handleOptionChange(): void {
		handleGenerateNext();
	}

	/**
	 * Formats a waveform identifier for the conditional URL-only selector option.
	 * @param {FourierWaveformType} waveform Waveform identifier
	 * @returns {string} Human-readable label
	 */
	function formatWaveformLabel(waveform: FourierWaveformType): string {
		switch (waveform) {
			case "square":
				return "Square Wave";
			case "square_odd":
				return "Odd Square Wave";
			case "square_even":
				return "Even Square Wave";
			case "triangle":
				return "Triangle Wave";
			case "triangle_odd":
				return "Odd Triangle Wave";
			case "triangle_even":
				return "Even Triangle Wave";
			case "sawtooth":
				return "Sawtooth Wave";
			case "half_wave_sine":
				return "Half-Wave Rectified Sine Wave";
			case "full_wave_sine":
				return "Full-Wave Rectified Sine Wave";
			default: {
				const _exhaustiveCheck: never = waveform;
				throw new Error(
					`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
				);
			}
		}
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
			badge={selectedWaveform === "square"
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
					{#if !isPrimaryFourierDrillWaveform(selectedWaveform)}
						<option value={selectedWaveform}>
							{formatWaveformLabel(selectedWaveform)} (URL Variant)
						</option>
					{/if}
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
