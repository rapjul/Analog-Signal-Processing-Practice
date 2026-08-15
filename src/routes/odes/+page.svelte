<script lang="ts">
	/**
	 * LCC ODEs Practice Module Route (/odes).
	 * Implements 1st and 2nd-order Linear Constant Coefficient ODE practice engine
	 * with randomized problem generation, multi-stage inputs,
	 * diagnostic validation, and waveform plotting.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathInline from "$lib/components/math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import Navigation from "$lib/components/ui/Navigation.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import OdePracticeCard from "$lib/components/ui/OdePracticeCard.svelte";
	import {
		type ForcingType,
		generateOdeProblem,
		type RootType,
	} from "$lib/math-engine/odes";

	let selectedRootType = $state<RootType>("distinct_real");
	let selectedForcingType = $state<ForcingType>("constant");

	// Active problem state
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let currentProblem = $state(
		generateOdeProblem("distinct_real", "constant"),
	);

	/**
	 * Regenerates a new ODE problem using current selected options.
	 */
	function handleGenerateNext() {
		currentProblem = generateOdeProblem(
			selectedRootType,
			selectedForcingType,
		);
	}

	/**
	 * Handles changes to root or forcing function selectors.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleOptionChange() {
		handleGenerateNext();
	}
</script>

<svelte:head>
	<title>LCC ODEs Practice — SignalLab</title>
</svelte:head>

<Navigation activeRoute="/odes" />

<main class="page-container">
	<div class="header-section">
		<h1 class="page-title">Linear Constant-Coefficient ODEs</h1>
		<p class="page-subtitle">
			Master homogeneous solutions <MathInline math={"y_h(t)"} />,
			particular solutions <MathInline math={"y_p(t)"} />, and zero-input
			vs. zero-state separation.
		</p>
	</div>

	<!-- Control Bar: Generator Customization -->
	<div class="control-bar">
		<div class="control-group">
			<label for="root-type-select" class="control-label">
				Root Classification:
			</label>
			<select
				id="root-type-select"
				class="select-input"
				bind:value={selectedRootType}
				onchange={handleOptionChange}
			>
				<option value="distinct_real">
					Distinct Real Roots (Overdamped)
				</option>
				<option value="repeated_real">
					Repeated Real Roots (Critically Damped)
				</option>
				<option value="complex_conjugate">
					Complex Conjugate Roots (Underdamped)
				</option>
			</select>
		</div>

		<div class="control-group">
			<label for="forcing-type-select" class="control-label">
				Forcing Function <MathInline math={"x(t)"} />:
			</label>
			<select
				id="forcing-type-select"
				class="select-input"
				bind:value={selectedForcingType}
				onchange={handleOptionChange}
			>
				<option value="constant">
					Constant / Step Forcing [K u(t)]
				</option>
				<option value="exponential">
					Exponential Forcing [K exp(p*t)]
				</option>
				<option value="sinusoid">
					Sinusoidal Forcing [K cos(omega*t)]
				</option>
			</select>
		</div>
	</div>

	<!-- Main Practice Workspace (Full Width) -->
	<div class="workspace-container">
		<OdePracticeCard
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
