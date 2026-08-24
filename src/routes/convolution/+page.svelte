<script lang="ts">
	import { onMount } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import ConvolutionPracticeCard from "$lib/components/ui/ConvolutionPracticeCard.svelte";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import {
		type ConvolutionProblem,
		type ConvolutionProblemSelection,
		DEFAULT_CONVOLUTION_SELECTION,
		generateConfiguredConvolutionProblem,
	} from "$lib/math-engine/convolution";
	import { createRandomSeed } from "$lib/math-engine/random";
	import {
		CONVOLUTION_AMPLITUDE_SELECTIONS,
		CONVOLUTION_SHIFT_VALUE_SELECTIONS,
		parseConvolutionFilters,
		serializeConvolutionFilters,
	} from "$lib/problems/convolution-filters";

	const initialFilters = parseConvolutionFilters(page.url.searchParams);
	let selection = $state<ConvolutionProblemSelection>(
		initialFilters.selection,
	);
	let seed = $state(initialFilters.seed);
	let currentProblem = $state<ConvolutionProblem>(
		generateConfiguredConvolutionProblem(initialFilters.selection, {
			seed: initialFilters.seed,
		}),
	);
	let shareUrl = $state("");
	let shareStatus = $state("");

	const signals = ["x", "h"] as const;

	function isTextbookDefault(): boolean {
		return (
			JSON.stringify(selection) ===
			JSON.stringify(DEFAULT_CONVOLUTION_SELECTION)
		);
	}

	function clearStaleSharedUrl(): void {
		if (typeof window === "undefined" || !window.location.search) return;
		replaceState(
			`${window.location.pathname}${window.location.hash}`,
			page.state,
		);
	}

	function regenerateCurrentSeed(): void {
		currentProblem = generateConfiguredConvolutionProblem(selection, {
			seed,
		});
		shareUrl = "";
		shareStatus = "";
		clearStaleSharedUrl();
	}

	function handleGenerateNext(): void {
		seed = createRandomSeed();
		regenerateCurrentSeed();
	}

	async function handleShare(): Promise<void> {
		if (typeof window === "undefined") return;
		const params = serializeConvolutionFilters({ selection, seed });
		shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
		try {
			await navigator.clipboard.writeText(shareUrl);
			shareStatus = "Problem link copied to the clipboard.";
		} catch {
			shareStatus =
				"Copy was unavailable. Select and copy the link below.";
		}
	}

	function signalTypeName(kind: string | undefined): string {
		switch (kind) {
			case "rect":
				return "Rectangular Pulse";
			case "triangle":
				return "Triangular Pulse";
			case "multi_rect":
				return "Multiple Rectangular Pulses";
			case "exponential":
				return "Causal Exponential Decay";
			default:
				return "Unknown";
		}
	}

	onMount(() => {
		if (!initialFilters.isShared && window.location.search)
			window.setTimeout(clearStaleSharedUrl, 0);
	});
</script>

<PageLayout
	title="Continuous-Time Convolution"
	subtitleText={String.raw`Master graphical flip-and-shift overlap integrals, piecewise analytical solutions $y(t) = (x * h)(t)$, and impulse response synthesis.`}
	metaDescription="Practice graphical flip-and-shift convolution overlap integrals and analytical piecewise solutions with step-by-step verification."
	activeRoute="/convolution"
>
	{#snippet controls()}
		<DrillPanel
			title="Independent Signal Configuration"
			badge={isTextbookDefault()
				? "ECE 210 Textbook Defaults"
				: "Custom / Random Configuration"}
		>
			<input
				type="hidden"
				name="seed"
				value={seed}
			/>
			<div class="signal-grid">
				{#each signals as signal}
					{@const resolved = currentProblem.resolvedSignals?.[signal]}
					<fieldset class="signal-card">
						<legend
							>{signal === "x"
								? "Input signal x(t)"
								: "Impulse response h(t)"}</legend
						>

						<label for={`${signal}-type`}>Signal Type</label>
						<select
							id={`${signal}-type`}
							bind:value={selection[signal].type}
							onchange={regenerateCurrentSeed}
						>
							<option value="random">Random</option>
							<option value="rect">Rectangular Pulse</option>
							<option value="triangle">Triangular Pulse</option>
							<option value="multi_rect"
								>Multiple Rectangular Pulses</option
							>
							<option value="exponential"
								>Causal Exponential Decay</option
							>
						</select>
						<p class="resolved-type">
							Current problem: {signalTypeName(resolved?.kind)}
						</p>

						<label for={`${signal}-parameter`}>
							{resolved?.kind === "exponential"
								? "Decay Rate"
								: resolved?.kind === "multi_rect"
									? "Component Pulse Width"
									: "Width"}
						</label>
						<select
							id={`${signal}-parameter`}
							bind:value={selection[signal].parameterMode}
							onchange={regenerateCurrentSeed}
						>
							<option value="default"
								>Default ({resolved?.kind === "triangle"
									? 2
									: 1})</option
							>
							<option value="random">Random (1–3)</option>
						</select>

						{#if resolved?.kind === "multi_rect"}
							{#each [0, 1] as component}
								<label
									for={`${signal}-amplitude-${component + 1}`}
								>
									Component {component + 1} Amplitude
								</label>
								<select
									id={`${signal}-amplitude-${component + 1}`}
									bind:value={
										selection[signal].componentAmplitudes[
											component
										]
									}
									onchange={regenerateCurrentSeed}
								>
									{#each CONVOLUTION_AMPLITUDE_SELECTIONS as value}
										<option {value}>
											{value === "default"
												? "Default (+1)"
												: value === "random_signed"
													? "Random Signed"
													: value}
										</option>
									{/each}
								</select>
							{/each}
						{:else}
							<label for={`${signal}-amplitude`}>Amplitude</label>
							<select
								id={`${signal}-amplitude`}
								bind:value={selection[signal].amplitude}
								onchange={regenerateCurrentSeed}
							>
								{#each CONVOLUTION_AMPLITUDE_SELECTIONS as value}
									<option {value}>
										{value === "default"
											? "Default (+1)"
											: value === "random_signed"
												? "Random Signed"
												: value}
									</option>
								{/each}
							</select>
						{/if}

						<label for={`${signal}-shift-state`}>Shift State</label>
						<select
							id={`${signal}-shift-state`}
							bind:value={selection[signal].shiftState}
							onchange={regenerateCurrentSeed}
						>
							<option value="unshifted">Unshifted</option>
							<option value="shifted">Shifted</option>
							<option value="random">Random</option>
						</select>

						<label for={`${signal}-shift-value`}>Shift Value</label>
						<select
							id={`${signal}-shift-value`}
							bind:value={selection[signal].shiftValue}
							disabled={selection[signal].shiftState ===
								"unshifted"}
							onchange={regenerateCurrentSeed}
						>
							{#each CONVOLUTION_SHIFT_VALUE_SELECTIONS as value}
								<option {value}>
									{value === "random_signed"
										? "Random Signed (−5…−1, 1…5)"
										: value === "random_negative"
											? "Random Negative (−5…−1)"
											: value === "random_positive"
												? "Random Positive (1…5)"
												: value}
								</option>
							{/each}
						</select>
					</fieldset>
				{/each}
			</div>

			<div class="configuration-footer">
				<p class="complexity-preview">
					<strong
						>{currentProblem.regionCount ??
							currentProblem.intervals.length}</strong
					>
					piecewise regions. The tutor reveals one region at a time.
				</p>
				<button
					type="button"
					class="share-button"
					onclick={handleShare}>🔗 Share This Problem</button
				>
			</div>
			<p
				class="share-status"
				role="status"
				aria-live="polite"
			>
				{shareStatus}
			</p>
			{#if shareUrl}
				<label
					class="share-url-label"
					for="convolution-share-url">Frozen problem link</label
				>
				<input
					id="convolution-share-url"
					class="share-url"
					readonly
					value={shareUrl}
					onfocus={(event) => event.currentTarget.select()}
				/>
			{/if}
		</DrillPanel>
	{/snippet}

	<ConvolutionPracticeCard
		problem={currentProblem}
		onNextProblem={handleGenerateNext}
	/>
</PageLayout>

<style>
	.signal-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.signal-card {
		display: grid;
		grid-template-columns: minmax(9rem, auto) minmax(0, 1fr);
		align-items: center;
		gap: 0.65rem 0.85rem;
		min-width: 0;
		padding: 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
	}

	.signal-card legend {
		padding: 0 0.4rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.signal-card label,
	.share-url-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-secondary);
	}

	.signal-card select,
	.share-url {
		width: 100%;
		min-width: 0;
		padding: 0.55rem 0.65rem;
		color: var(--text-primary);
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
	}

	.signal-card select:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.resolved-type {
		grid-column: 2;
		margin: -0.25rem 0 0.2rem;
		font-size: var(--text-xs);
		color: var(--accent-primary);
	}

	.configuration-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.complexity-preview,
	.share-status {
		margin: 0;
		color: var(--text-secondary);
	}

	.share-button {
		padding: 0.65rem 1rem;
		font-weight: 700;
		color: var(--accent-primary);
		background: var(--bg-card);
		border: 1px solid var(--accent-primary);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.share-button:focus-visible,
	.signal-card select:focus-visible,
	.share-url:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.share-url-label {
		display: block;
	}

	@media (max-width: 800px) {
		.signal-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.signal-card {
			grid-template-columns: 1fr;
		}

		.resolved-type {
			grid-column: 1;
		}
	}
</style>
