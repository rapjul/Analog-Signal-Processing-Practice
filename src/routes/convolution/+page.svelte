<script lang="ts">
	/**
	 * Continuous-Time Convolution Practice Module Route (/convolution).
	 * Implements graphical flip-and-shift animation canvas, piecewise analytical integration,
	 * interactive interval input, and formula reference.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import MathInline from "$lib/components/math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import ConvolutionPracticeCard from "$lib/components/ui/ConvolutionPracticeCard.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import Navigation from "$lib/components/ui/Navigation.svelte";
	import {
		type ConvolutionPairType,
		type ConvolutionProblem,
		generateConvolutionProblem,
	} from "$lib/math-engine/convolution";

	let selectedPair = $state<ConvolutionPairType>("rect_rect");

	// Active problem state
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
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
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleOptionChange() {
		handleGenerateNext();
	}
</script>

<svelte:head>
	<title>Continuous-Time Convolution Practice — SignalLab</title>
</svelte:head>

<Navigation activeRoute="/convolution" />

<main class="page-container">
	<div class="header-section">
		<h1 class="page-title">Continuous-Time Convolution</h1>
		<p class="page-subtitle">
			Master graphical flip-and-shift overlap integrals, piecewise
			analytical solutions <MathInline math={"y(t) = (x * h)(t)"} />, and
			impulse response synthesis.
		</p>
	</div>

	<!-- Control Bar: Signal Pair Customization -->
	<div class="control-bar">
		<div class="control-group">
			<label for="pair-type-select" class="control-label">
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
					Rectangular Pulse * Shifted Rectangular Pulse (Trapezoid)
				</option>
				<option value="multi_rect">
					Multi-Pulse Signal * Rectangular Pulse (Composite Pulses)
				</option>
				<option value="rect_exp">
					Rectangular Pulse * Exponential Decay [e^(-at) u(t)]
				</option>
				<option value="exp_exp">
					Exponential Decay * Exponential Decay
				</option>
			</select>
		</div>
	</div>

	<!-- Main Practice Workspace (Full Width) -->
	<div class="workspace-container">
		<ConvolutionPracticeCard
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
