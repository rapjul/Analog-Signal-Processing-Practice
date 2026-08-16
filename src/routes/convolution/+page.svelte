<script lang="ts">
	/**
	 * Continuous-Time Convolution Practice Module Route (/convolution).
	 *
	 * Implements graphical flip-and-shift animation canvas, piecewise analytical integration,
	 * interactive interval input, and formula reference.
	 */

	import ConvolutionPracticeCard from "$lib/components/ui/ConvolutionPracticeCard.svelte";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import {
		type ConvolutionPairType,
		type ConvolutionProblem,
		generateConvolutionProblem,
	} from "$lib/math-engine/convolution";

	let selectedPair = $state<ConvolutionPairType>("rect_rect");

	// Active problem state
	let currentProblem = $state<ConvolutionProblem>(
		generateConvolutionProblem("rect_rect"),
	);

	/**
	 * Regenerates a new convolution problem using current selected signal pair option.
	 */
	function handleGenerateNext() {
		currentProblem = generateConvolutionProblem(selectedPair);
	}

	/**
	 * Handles change to signal pair selector.
	 */
	function handleOptionChange() {
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
			badge={selectedPair === "rect_rect"
				? "Default (Rect * Rect)"
				: "Custom Signal Pair"}
		>
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
				</select>
			</div>
		</DrillPanel>
	{/snippet}

	<ConvolutionPracticeCard
		problem={currentProblem}
		onNextProblem={handleGenerateNext}
	/>
</PageLayout>
