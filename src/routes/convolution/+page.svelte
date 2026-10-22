<script lang="ts">
	import { onMount } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import MathText from "$lib/components/math/MathText.svelte";
	import ConvolutionPracticeCard from "$lib/components/ui/ConvolutionPracticeCard.svelte";
	import DrillPanel from "$lib/components/ui/DrillPanel.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import {
		type ConvolutionProblem,
		type ConvolutionProblemSelection,
		DEFAULT_CONVOLUTION_SELECTION,
		generateConfiguredConvolutionProblem,
		TEXTBOOK_CONVOLUTION_SELECTION,
	} from "$lib/math-engine/convolution/index";
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
	type ProblemPreset = "random" | "textbook" | "custom";
	let activePreset = $state<ProblemPreset>(
		initialFilters.isShared ? "custom" : "random",
	);

	/** Clones a selection so preset arrays never share mutable state. */
	function cloneSelection(
		value: ConvolutionProblemSelection,
	): ConvolutionProblemSelection {
		return {
			x: {
				...value.x,
				componentAmplitudes: [...value.x.componentAmplitudes],
			},
			h: {
				...value.h,
				componentAmplitudes: [...value.h.componentAmplitudes],
			},
		};
	}

	function isTextbookDefault(): boolean {
		return (
			JSON.stringify(selection) ===
			JSON.stringify(TEXTBOOK_CONVOLUTION_SELECTION)
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

	/** Applies one beginner-facing preset and generates a fresh problem. */
	function applyPreset(preset: Exclude<ProblemPreset, "custom">): void {
		activePreset = preset;
		selection = cloneSelection(
			preset === "random"
				? DEFAULT_CONVOLUTION_SELECTION
				: TEXTBOOK_CONVOLUTION_SELECTION,
		);
		seed = createRandomSeed();
		regenerateCurrentSeed();
	}

	/** Marks an independent field change as a custom configuration. */
	function handleCustomSelection(): void {
		activePreset = "custom";
		regenerateCurrentSeed();
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
			case "step":
				return "Unit Step";
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
			<div
				class="preset-picker"
				role="group"
				aria-label="Problem preset"
			>
				<button
					type="button"
					class:active={activePreset === "random"}
					aria-pressed={activePreset === "random"}
					onclick={() => applyPreset("random")}
				>
					Random Problem
				</button>
				<button
					type="button"
					class:active={activePreset === "textbook"}
					aria-pressed={activePreset === "textbook"}
					onclick={() => applyPreset("textbook")}
				>
					Textbook Example
				</button>
			</div>
			<p class="preset-description">
				{activePreset === "textbook"
					? "Use two unshifted unit rectangular pulses, matching the introductory ECE 210 example."
					: activePreset === "random"
						? "Choose both signal types and shifts randomly while keeping textbook parameters and +1 amplitudes."
						: "Use the individual controls below to build a custom signal pair."}
			</p>
			<input
				type="hidden"
				name="seed"
				value={seed}
			/>
			<details class="customize-disclosure">
				<summary>Customize problem</summary>
				<div class="signal-grid">
					{#each signals as signal}
						{@const resolved =
							currentProblem.resolvedSignals?.[signal]}
						<fieldset class="signal-card">
							<legend>
								{#if signal === "x"}
									<MathText
										text={String.raw`Input signal $x(t)$`}
									/>
								{:else}
									<MathText
										text={String.raw`Impulse response $h(t)$`}
									/>
								{/if}
							</legend>

							<label for={`${signal}-type`}>Signal Type</label>
							<select
								id={`${signal}-type`}
								bind:value={selection[signal].type}
								onchange={handleCustomSelection}
							>
								<option value="random">Random</option>
								<option value="rect">Rectangular Pulse</option>
								<option value="triangle"
									>Triangular Pulse</option
								>
								<option value="multi_rect">
									Multiple Rectangular Pulses
								</option>
								<option value="exponential">
									Causal Exponential Decay
								</option>
								<option value="step">Unit Step</option>
							</select>
							<p class="resolved-type">
								Current problem: {signalTypeName(
									resolved?.kind,
								)}
							</p>

							{#if resolved?.kind !== "step"}
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
									onchange={handleCustomSelection}
								>
									<option value="default">
										Default ({resolved?.kind === "triangle"
											? 2
											: 1})
									</option>
									<option value="random">Random (1–3)</option>
								</select>
							{/if}

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
											selection[signal]
												.componentAmplitudes[component]
										}
										onchange={handleCustomSelection}
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
								<label for={`${signal}-amplitude`}
									>Amplitude</label
								>
								<select
									id={`${signal}-amplitude`}
									bind:value={selection[signal].amplitude}
									onchange={handleCustomSelection}
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

							<label for={`${signal}-shift-state`}
								>Shift State</label
							>
							<select
								id={`${signal}-shift-state`}
								bind:value={selection[signal].shiftState}
								onchange={handleCustomSelection}
							>
								<option value="unshifted">Unshifted</option>
								<option value="shifted">Shifted</option>
								<option value="random">Random</option>
							</select>

							<label for={`${signal}-shift-value`}
								>Shift Value</label
							>
							<select
								id={`${signal}-shift-value`}
								bind:value={selection[signal].shiftValue}
								disabled={selection[signal].shiftState ===
									"unshifted"}
								onchange={handleCustomSelection}
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
			</details>

			<div class="configuration-footer">
				<p class="complexity-preview">
					<strong>
						{currentProblem.regionCount ??
							currentProblem.intervals.length}
					</strong>
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
	.preset-picker {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.preset-picker button {
		padding: 0.75rem 1rem;
		font: inherit;
		font-weight: 700;
		color: var(--text-primary);
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.preset-picker button.active {
		color: var(--accent-primary);
		background: var(--bg-secondary);
		border-color: var(--accent-primary);
	}

	.preset-description {
		margin: 0.75rem 0 1rem;
		color: var(--text-secondary);
	}

	.customize-disclosure {
		margin-bottom: 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
	}

	.customize-disclosure summary {
		padding: 0.8rem 1rem;
		font-weight: 700;
		color: var(--text-primary);
		cursor: pointer;
	}

	.signal-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		padding: 0 1rem 1rem;
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
	.preset-picker button:focus-visible,
	.customize-disclosure summary:focus-visible,
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
		.preset-picker {
			grid-template-columns: 1fr;
		}

		.signal-card {
			grid-template-columns: 1fr;
		}

		.resolved-type {
			grid-column: 1;
		}
	}
</style>
