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
		type RootType,
	} from "$lib/math-engine/odes";
	import { createRandomSeed } from "$lib/math-engine/random";

	let selectedOrder = $state<OdeOrder | "random">("random");
	let selectedRootType = $state<RootType | "random">("random");
	let selectedForcingType = $state<ForcingType | "random">("random");
	let selectedLeadingCoefficient = $state<LeadingCoefficientType | "random">(
		"random",
	);
	let selectedResonance = $state<ResonanceType | "random">("random");
	let seed = $state(createRandomSeed());

	const allowedOrders = new Set(["1", "2", "random"]);
	const allowedRoots = new Set<RootType | "random">([
		"random",
		"distinct_real",
		"repeated_real",
		"complex_conjugate",
	]);
	const allowedForcing = new Set<ForcingType | "random">([
		"random",
		"constant",
		"exponential",
		"sinusoid",
	]);
	const allowedLeading = new Set<LeadingCoefficientType | "random">([
		"random",
		"monic",
		"non_monic",
	]);
	const allowedResonance = new Set<ResonanceType | "random">([
		"random",
		"none",
		"simple",
		"repeated",
	]);

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

	function normalizeSelections(changedControl?: string): void {
		if (
			changedControl === "ode-order-select" &&
			selectedOrder === "random"
		) {
			selectedRootType = "random";
		}
		if (selectedOrder === 1) {
			selectedRootType = "random";
			if (selectedResonance === "repeated") selectedResonance = "simple";
		}

		if (
			changedControl === "forcing-type-select" &&
			selectedForcingType !== "exponential"
		) {
			selectedResonance = "none";
		}
		if (
			changedControl === "root-type-select" &&
			selectedRootType !== "random"
		) {
			selectedResonance = "none";
		}
		if (selectedResonance === "simple") {
			selectedForcingType = "exponential";
			selectedRootType = selectedOrder === 2 ? "distinct_real" : "random";
		}
		if (selectedResonance === "repeated") {
			selectedOrder = 2;
			selectedRootType = "repeated_real";
			selectedForcingType = "exponential";
		}
		if (
			(selectedResonance === "none" || selectedResonance === "random") &&
			selectedOrder === "random" &&
			selectedRootType !== "random"
		) {
			selectedOrder = 2;
		}
	}

	// Active problem state (default blind random exam practice)
	let currentProblem = $state(generateOdeProblem(generationOptions()));

	onMount(() => {
		const params = page.url.searchParams;
		const orderParam = params.get("order");
		const rootParam = params.get("rootType") as RootType | "random" | null;
		const forcingParam = params.get("forcing") as
			ForcingType | "random" | null;
		const leadingParam = params.get("leading") as
			LeadingCoefficientType | "random" | null;
		const resonanceParam = params.get("resonance") as
			ResonanceType | "random" | null;
		const seedParam = params.get("seed");
		if (orderParam && allowedOrders.has(orderParam)) {
			selectedOrder =
				orderParam === "random"
					? "random"
					: (Number(orderParam) as OdeOrder);
		}
		if (rootParam && allowedRoots.has(rootParam))
			selectedRootType = rootParam;
		if (forcingParam && allowedForcing.has(forcingParam))
			selectedForcingType = forcingParam;
		if (leadingParam && allowedLeading.has(leadingParam))
			selectedLeadingCoefficient = leadingParam;
		if (resonanceParam && allowedResonance.has(resonanceParam))
			selectedResonance = resonanceParam;
		if (seedParam && /^\d{1,10}$/.test(seedParam)) {
			const parsedSeed = Number(seedParam);
			if (Number.isSafeInteger(parsedSeed) && parsedSeed <= 0xffff_ffff) {
				seed = parsedSeed;
			}
		}
		normalizeSelections();
		currentProblem = generateOdeProblem(generationOptions());
		// SvelteKit initializes its router immediately after component mount.
		// Defer normalization by one task so router-level replaceState is safe.
		window.setTimeout(syncShareableUrl, 0);
	});

	function syncShareableUrl(): void {
		if (typeof window === "undefined") return;
		const url = new URL(window.location.href);
		url.searchParams.set("order", String(selectedOrder));
		url.searchParams.set("rootType", selectedRootType);
		url.searchParams.set("forcing", selectedForcingType);
		url.searchParams.set("leading", selectedLeadingCoefficient);
		url.searchParams.set("resonance", selectedResonance);
		url.searchParams.set("seed", String(seed));
		replaceState(`${url.pathname}${url.search}${url.hash}`, page.state);
	}

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
	 */
	function handleOptionChange(event: Event) {
		normalizeSelections((event.currentTarget as HTMLSelectElement).id);
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
