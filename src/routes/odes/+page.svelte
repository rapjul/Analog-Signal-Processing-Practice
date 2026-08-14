<script lang="ts">
	/**
	 * LCC ODEs Practice Module Route (/odes).
	 * Implements 1st and 2nd-order Linear Constant Coefficient ODE practice engine
	 * with randomized problem generation, multi-stage inputs,
	 * diagnostic validation, and waveform plotting.
	 */
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathInline from "$lib/components/math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import Navigation from "$lib/components/ui/Navigation.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import PracticeCard from "$lib/components/ui/PracticeCard.svelte";
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

	// Sidebar formulas
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const yhDistinct = "y_h(t) = C_1 e^{r_1 t} + C_2 e^{r_2 t}";
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const yhRepeated = "y_h(t) = (C_1 + C_2 t) e^{r t}";
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const yhComplex =
		"y_h(t) = e^{\\sigma t} [C_1 \\cos(\\omega_d t) + C_2 \\sin(\\omega_d t)]";

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
			<label for="root-type-select" class="control-label"
				>Root Classification:</label
			>
			<select
				id="root-type-select"
				class="select-input"
				bind:value={selectedRootType}
				onchange={handleOptionChange}
			>
				<option value="distinct_real"
					>Distinct Real Roots (Overdamped)</option
				>
				<option value="repeated_real"
					>Repeated Real Roots (Critically Damped)</option
				>
				<option value="complex_conjugate"
					>Complex Conjugate Roots (Underdamped)</option
				>
			</select>
		</div>

		<div class="control-group">
			<label for="forcing-type-select" class="control-label"
				>Forcing Function x(t):</label
			>
			<select
				id="forcing-type-select"
				class="select-input"
				bind:value={selectedForcingType}
				onchange={handleOptionChange}
			>
				<option value="constant"
					>Constant / Step Forcing [K u(t)]</option
				>
				<option value="exponential"
					>Exponential Forcing [K exp(p*t)]</option
				>
				<option value="sinusoid"
					>Sinusoidal Forcing [K cos(omega*t)]</option
				>
			</select>
		</div>
	</div>

	<!-- Main Practice Workspace -->
	<div class="workspace-grid">
		<PracticeCard
			problem={currentProblem}
			onNextProblem={handleGenerateNext}
		/>

		<!-- Quick Reference Formula Card -->
		<aside class="reference-sidebar">
			<div class="reference-card">
				<h3 class="ref-title">📖 ODE Formula Sheet</h3>
				<div class="ref-section">
					<h4>Characteristic Polynomial & Roots</h4>
					<MathBlock math={"s^2 + a_1 s + a_0 = 0"} compact={true} />
				</div>
				<div class="ref-section">
					<h4>
						Homogeneous Solutions <MathInline math={"y_h(t)"} />
					</h4>
					<p>
						<strong>Distinct Real:</strong>
						<MathInline math={yhDistinct} />
					</p>
					<p>
						<strong>Repeated Real:</strong>
						<MathInline math={yhRepeated} />
					</p>
					<p>
						<strong>Complex Conjugate:</strong>
						<MathInline math={yhComplex} />
					</p>
				</div>
				<div class="ref-section">
					<h4>Response Separation</h4>
					<p>
						<strong
							>Zero-Input (<MathInline
								math={"y_{ZI}"}
							/>):</strong
						>
						Set <MathInline math={"x(t) = 0"} />, driven by <MathInline
							math={"y(0^-), y'(0^-)"}
						/>.
					</p>
					<p>
						<strong
							>Zero-State (<MathInline
								math={"y_{ZS}"}
							/>):</strong
						>
						Set <MathInline math={"y(0^-)=0, y'(0^-)=0"} />, driven
						by <MathInline math={"x(t)"} />.
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
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--accent-primary);
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.5rem;
	}

	.ref-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.ref-section h4 {
		font-size: 0.85rem;
		color: var(--text-primary);
		font-weight: 600;
	}
</style>
