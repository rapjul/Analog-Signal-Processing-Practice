<script lang="ts">
	/**
	 * Continuous-Time Convolution Practice Module Route (/convolution).
	 *
	 * Implements graphical flip-and-shift animation canvas, piecewise analytical integration,
	 * interactive interval input, and formula reference.
	 */

	import { onMount } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import ConvolutionPracticeCard from "$lib/components/ui/ConvolutionPracticeCard.svelte";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import {
		type ConvolutionProblem,
		generateConvolutionProblem,
	} from "$lib/math-engine/convolution";
	import { createRandomSeed } from "$lib/math-engine/random";
	import {
		type ConvolutionPairSelection,
		parseConvolutionFilters,
		resolveConvolutionPairSelection,
		serializeConvolutionFilters,
	} from "$lib/problems/convolution-filters";

	const initialFilters = parseConvolutionFilters(page.url.searchParams);
	let selectedPair = $state<ConvolutionPairSelection>(initialFilters.pair);
	let seed = $state(initialFilters.seed);

	/** Generates the concrete seeded problem represented by route state. */
	function generateSelectedProblem(
		selection: ConvolutionPairSelection,
		problemSeed: number,
	): ConvolutionProblem {
		return generateConvolutionProblem(
			resolveConvolutionPairSelection(selection, problemSeed),
			{ seed: problemSeed },
		);
	}

	let currentProblem = $state<ConvolutionProblem>(
		generateSelectedProblem(initialFilters.pair, initialFilters.seed),
	);

	/** Synchronizes selector state with a canonical shareable URL. */
	function syncShareableUrl(): void {
		if (typeof window === "undefined") return;
		const params = serializeConvolutionFilters({
			pair: selectedPair,
			seed,
		});
		replaceState(
			`${window.location.pathname}?${params.toString()}${window.location.hash}`,
			page.state,
		);
	}

	onMount(() => window.setTimeout(syncShareableUrl, 0));

	/**
	 * Regenerates a new convolution problem using current selected signal pair option.
	 */
	function handleGenerateNext(): void {
		seed = createRandomSeed();
		currentProblem = generateSelectedProblem(selectedPair, seed);
		syncShareableUrl();
	}

	/**
	 * Handles change to signal pair selector.
	 */
	function handleOptionChange(): void {
		handleGenerateNext();
	}
</script>

<PageLayout
	title="Continuous-Time Convolution"
	subtitleText={String.raw`Master graphical flip-and-shift overlap integrals, piecewise analytical solutions $y(t) = (x * h)(t)$, and impulse response synthesis.`}
	metaDescription="Practice graphical flip-and-shift convolution overlap integrals and analytical piecewise solutions with step-by-step verification."
	activeRoute="/convolution"
>
	{#snippet controls()}
		<DrillPanel
			title="Targeted Drill & Signal Pair Filters"
			badge={selectedPair === "random"
				? "Randomized Across All Signal Pairs"
				: "Custom Signal Pair"}
		>
			<input
				type="hidden"
				name="seed"
				value={seed}
			/>
			<div class="control-group">
				<label
					for="pair-type-select"
					class="control-label"
				>
					Signal Pair Category:
				</label>
				<select
					id="pair-type-select"
					class="select-input"
					bind:value={selectedPair}
					onchange={handleOptionChange}
				>
					<option value="random">Random (All Signal Pairs)</option>
					<option value="rect_rect">
						Rectangular Pulse * Rectangular Pulse (Piecewise Linear)
					</option>
					<option value="rect_shifted_rect">
						Rectangular Pulse * Shifted Rectangular Pulse
						(Trapezoid)
					</option>
					<option value="multi_rect">
						Multi-Pulse Signal * Rectangular Pulse (Composite
						Pulses)
					</option>
					<option value="rect_exp">
						Rectangular Pulse * Exponential Decay [e^(-at) u(t)]
					</option>
					<option value="exp_exp">
						Exponential Decay * Exponential Decay
					</option>
					<option value="tri_rect">
						Triangular Pulse * Rectangular Pulse
					</option>
					<option value="tri_shifted_tri">
						Triangular Pulse * Shifted Triangular Pulse
					</option>
				</select>
			</div>
		</DrillPanel>
	{/snippet}

	<ConvolutionPracticeCard
		problem={currentProblem}
		onNextProblem={handleGenerateNext}
	/>
</PageLayout>
