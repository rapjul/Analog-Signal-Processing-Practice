<script lang="ts">
	/**
	 * Continuous-Time Convolution Practice Module Route (/convolution).
	 * Implements analytical piecewise convolution practice
	 * with signal pair customization, interactive flip-and-shift animator,
	 * guided piecewise input validation, and formula sheet reference.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import MathInline from "$lib/components/math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import ConvolutionPracticeCard from "$lib/components/ui/ConvolutionPracticeCard.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import Navigation from "$lib/components/ui/Navigation.svelte";
	import {
		type ConvolutionProblem,
		generateConvolutionProblem,
	} from "$lib/math-engine/convolution";

	type SignalPairOption =
		| "rect_rect"
		| "rect_shifted_rect"
		| "multi_rect"
		| "rect_exp"
		| "exp_exp";

	let selectedPair = $state<SignalPairOption>("rect_rect");

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

	// Sidebar formulas
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const convIntegralMath =
		"(x * h)(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) d\\tau";
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const rectRectMath =
		"\\operatorname{rect}\\left(\\frac{t}{T}\\right) * \\operatorname{rect}\\left(\\frac{t}{T}\\right) = T \\operatorname{tri}\\left(\\frac{t}{2T}\\right)";
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

	<!-- Main Practice Workspace -->
	<div class="workspace-grid">
		<ConvolutionPracticeCard
			problem={currentProblem}
			onNextProblem={handleGenerateNext}
		/>

		<!-- Quick Reference Formula Card -->
		<aside class="reference-sidebar">
			<div class="reference-card">
				<h3 class="ref-title">📖 Convolution Formula Sheet</h3>
				<div class="ref-section">
					<h4>Convolution Integral Definition</h4>
					<MathBlock math={convIntegralMath} compact={true} />
				</div>
				<div class="ref-section">
					<h4>Core Operational Properties</h4>
					<p>
						<strong>Commutative:</strong>
						<MathInline math={"x * h = h * x"} />
					</p>
					<p>
						<strong>Distributive:</strong>
						<MathInline
							math={"x * (h_1 + h_2) = x * h_1 + x * h_2"}
						/>
					</p>
					<p>
						<strong>Shift Property:</strong>
						<MathInline
							math={"x(t - t_1) * h(t - t_2) = y(t - t_1 - t_2)"}
						/>
					</p>
					<p>
						<strong>Impulse Identity:</strong>
						<MathInline
							math={"x(t) * \\delta(t - t_0) = x(t - t_0)"}
						/>
					</p>
				</div>
				<div class="ref-section">
					<h4>Standard Transform Result</h4>
					<MathBlock math={rectRectMath} compact={true} />
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
