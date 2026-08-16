<script lang="ts">
	/**
	 * LCC ODEs Practice Module Route (/odes).
	 *
	 * Implements 1st and 2nd-order Linear Constant Coefficient ODE practice engine
	 * with blind exam-mode problem generation by default, optional collapsible targeted filters,
	 * 7-step ITS diagnostic solver, and verified waveform plotting.
	 */

	import MathText from "$lib/components/math/MathText.svelte";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import OdePracticeCard from "$lib/components/ui/OdePracticeCard.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import {
		type ForcingType,
		generateOdeProblem,
		type RootType,
	} from "$lib/math-engine/odes";

	let selectedRootType = $state<RootType | "random">("random");
	let selectedForcingType = $state<ForcingType | "random">("random");

	// Active problem state (default blind random exam practice)
	let currentProblem = $state(generateOdeProblem("random", "random"));

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
	function handleOptionChange() {
		handleGenerateNext();
	}
</script>

<PageLayout
	title="Linear Constant-Coefficient ODEs"
	subtitleText={String.raw`Master homogeneous solutions $y_h(t)$, particular solutions $y_p(t)$, and zero-input vs. zero-state separation.`}
	metaDescription="Practice 1st and 2nd-order Linear Constant Coefficient ODEs with step-by-step solutions for homogeneous, particular, zero-input, and zero-state responses."
	activeRoute="/odes"
>
	{#snippet controls()}
		<DrillPanel
			title="Targeted Drill & Custom Filters"
			badge={selectedRootType === "random" &&
			selectedForcingType === "random"
				? "Random / Exam Mode"
				: "Custom Filter Active"}
		>
			<div class="control-group">
				<label
					for="root-type-select"
					class="control-label"
				>
					Root Classification:
				</label>
				<select
					id="root-type-select"
					class="select-input"
					bind:value={selectedRootType}
					onchange={handleOptionChange}
				>
					<option value="random">Random / Mixed (Default)</option>
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
				<label
					for="forcing-type-select"
					class="control-label"
				>
					<MathText text={String.raw`Forcing Function $x(t)$:`} />
				</label>
				<select
					id="forcing-type-select"
					class="select-input"
					bind:value={selectedForcingType}
					onchange={handleOptionChange}
				>
					<option value="random">Random / Mixed (Default)</option>
					<option value="constant">
						Constant / Step Forcing [K u(t)]
					</option>
					<option value="exponential">
						Exponential Forcing [K e^(pt)]
					</option>
					<option value="sinusoid">
						Sinusoidal Forcing [K cos(ωt)]
					</option>
				</select>
			</div>
		</DrillPanel>
	{/snippet}

	<OdePracticeCard
		problem={currentProblem}
		onNextProblem={handleGenerateNext}
	/>
</PageLayout>
