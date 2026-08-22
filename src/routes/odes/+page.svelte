<script lang="ts">
	/**
	 * LCC ODEs Practice Module Route (/odes).
	 *
	 * Implements 1st and 2nd-order Linear Constant Coefficient ODE practice engine
	 * with blind exam-mode problem generation by default, optional collapsible targeted filters,
	 * 7-step ITS diagnostic solver, and verified waveform plotting.
	 */

	import { onMount } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import MathText from "$lib/components/math/MathText.svelte";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import OdePracticeCard from "$lib/components/ui/OdePracticeCard.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import {
		type ForcingType,
		generateOdeProblem,
		type LeadingCoefficientType,
		type OdeGenerationOptions,
		type OdeOrder,
		type ResonanceType,
		type SecondOrderRootType,
	} from "$lib/math-engine/odes/index";
	import { createRandomSeed } from "$lib/math-engine/random";
	import type { WithRandom } from "$lib/math-engine/types";
	import {
		normalizeOdeFilters,
		type OdeFilterChangeSource,
		type OdeFilterSelections,
		parseOdeFilters,
		serializeOdeFilters,
	} from "$lib/problems/ode-filters";

	// Parse and normalize initial filters directly from URL state (no throwaway generation)
	const initialFilters = parseOdeFilters(page.url.searchParams);

	let selectedOrder = $state<WithRandom<OdeOrder>>(initialFilters.order);
	let selectedRootType = $state<WithRandom<SecondOrderRootType>>(
		initialFilters.rootType,
	);
	let selectedForcingType = $state<WithRandom<ForcingType>>(
		initialFilters.forcingType,
	);
	let selectedLeadingCoefficient = $state<WithRandom<LeadingCoefficientType>>(
		initialFilters.leadingCoefficient,
	);
	let selectedResonance = $state<WithRandom<ResonanceType>>(
		initialFilters.resonance,
	);
	let seed = $state(initialFilters.seed);

	/**
	 * Extracts current filter selections as an OdeFilterSelections structure.
	 */
	function getFilterSelections(): OdeFilterSelections {
		return {
			order: selectedOrder,
			rootType: selectedRootType,
			forcingType: selectedForcingType,
			leadingCoefficient: selectedLeadingCoefficient,
			resonance: selectedResonance,
			seed,
		};
	}

	/**
	 * Synchronizes local reactive state with normalized filters.
	 *
	 * @param filters - Normalized ODE filter selections
	 */
	function applyFilterSelections(filters: OdeFilterSelections): void {
		selectedOrder = filters.order;
		selectedRootType = filters.rootType;
		selectedForcingType = filters.forcingType;
		selectedLeadingCoefficient = filters.leadingCoefficient;
		selectedResonance = filters.resonance;
		seed = filters.seed;
	}

	function generationOptions(): OdeGenerationOptions {
		return {
			order: selectedOrder,
			rootType: selectedRootType,
			forcingType: selectedForcingType,
			leadingCoefficient: selectedLeadingCoefficient,
			resonance: selectedResonance,
			seed,
		};
	}

	// Active problem state (generated once with canonical initial filters)
	let currentProblem = $state(generateOdeProblem(generationOptions()));

	function syncShareableUrl(): void {
		if (typeof window === "undefined") return;
		const params = serializeOdeFilters(getFilterSelections());
		replaceState(
			`${window.location.pathname}?${params.toString()}${window.location.hash}`,
			page.state,
		);
	}

	onMount(() => {
		// Sync canonical normalized query parameters on initial page load without adding history
		window.setTimeout(syncShareableUrl, 0);
	});

	/**
	 * Regenerates a new ODE problem using current selected options.
	 */
	function handleGenerateNext() {
		seed = createRandomSeed();
		currentProblem = generateOdeProblem(generationOptions());
		syncShareableUrl();
	}

	/**
	 * Handles changes to root or forcing function selectors.
	 *
	 * @param event - DOM change event from filter select elements
	 */
	function handleOptionChange(event: Event) {
		const changeSource = (event.currentTarget as HTMLSelectElement)
			.id as OdeFilterChangeSource;
		const normalized = normalizeOdeFilters(
			getFilterSelections(),
			changeSource,
		);
		applyFilterSelections(normalized);
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
			badge={selectedOrder === "random" &&
			selectedRootType === "random" &&
			selectedForcingType === "random" &&
			selectedLeadingCoefficient === "random" &&
			selectedResonance === "random"
				? "Random / Exam Mode"
				: "Custom Filter Active"}
		>
			<input
				type="hidden"
				name="seed"
				value={seed}
			/>
			<div class="control-group">
				<label
					for="ode-order-select"
					class="control-label">ODE Order:</label
				>
				<select
					id="ode-order-select"
					class="select-input"
					bind:value={selectedOrder}
					onchange={handleOptionChange}
				>
					<option value="random">Random / Mixed (Default)</option>
					<option value={1}>First Order</option>
					<option value={2}>Second Order</option>
				</select>
			</div>
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
					disabled={selectedOrder === 1}
					aria-describedby={selectedOrder === 1
						? "root-type-first-order-note"
						: undefined}
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
				{#if selectedOrder === 1}
					<small id="root-type-first-order-note">
						First-order equations have one real characteristic root.
					</small>
				{/if}
			</div>

			<div class="control-group">
				<label
					for="leading-coefficient-select"
					class="control-label">Leading Coefficient:</label
				>
				<select
					id="leading-coefficient-select"
					class="select-input"
					bind:value={selectedLeadingCoefficient}
					onchange={handleOptionChange}
				>
					<option value="random">Random / Mixed (Default)</option>
					<option value="monic">Monic (leading coefficient 1)</option>
					<option value="non_monic">Non-monic</option>
				</select>
			</div>

			<div class="control-group">
				<label
					for="resonance-select"
					class="control-label">Exponential Resonance:</label
				>
				<select
					id="resonance-select"
					class="select-input"
					bind:value={selectedResonance}
					onchange={handleOptionChange}
				>
					<option value="random">Random / Mixed (Default)</option>
					<option value="none">Non-resonant</option>
					<option value="simple">Simple-root resonance</option>
					<option value="repeated">Repeated-root resonance</option>
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
