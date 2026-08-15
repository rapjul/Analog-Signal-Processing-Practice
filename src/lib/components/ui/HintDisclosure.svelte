<script lang="ts">
	/**
	 * HintDisclosure Svelte 5 Component.
	 *
	 * Standardized tiered hint utility for ITS step solvers.
	 * Progressively reveals up to maxTier hint tiers on button press,
	 * labelling each tier (Conceptual Nudge → Formula Setup → Worked Step).
	 *
	 * Rendered hint strings may contain $math$ expressions — each is rendered
	 * through MathText so LaTeX compiles cleanly without raw Unicode math.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathText from "$lib/components/math/MathText.svelte";

	interface Props {
		/**
		 * Array of raw hint strings (one per tier).
		 * May contain $math$ expressions.
		 */
		hints: string[];
		/** Number of hint tiers currently revealed (0 = none revealed). */
		hintTier: number;
		/**
		 * Maximum number of hint tiers available.
		 * Defaults to the length of the hints array.
		 */
		maxTier?: number;
		/** Callback invoked when the user clicks the "Get Hint" / "Get Next Hint" button. */
		onRevealNextHint: () => void;
		/** When true, the hint button is disabled (e.g. solver step is complete). */
		disabled?: boolean;
	}

	let {
		hints,
		hintTier,
		maxTier = hints.length,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		onRevealNextHint,
		disabled = false,
	}: Props = $props();

	/**
	 * Derives the human-readable label for the trigger button based on hintTier.
	 * @param {number} tier Current number of revealed hint tiers
	 * @param {number} max Maximum available hint tiers
	 * @returns {string} Button label text
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function getButtonLabel(tier: number, max: number): string {
		if (tier === 0) return "Get Hint";
		if (tier < max) return `Get Next Hint (${tier}/${max})`;
		return `All Hints Revealed (${max}/${max})`;
	}

	/**
	 * Derives the tier badge label string for the currently active hint tier.
	 * @param {number} tier Currently active 1-based hint tier
	 * @returns {string} Human-readable tier label
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function getTierLabel(tier: number): string {
		switch (tier) {
			case 1:
				return "Tier 1: Conceptual Nudge";
			case 2:
				return "Tier 2: Formula Setup";
			case 3:
				return "Tier 3: Worked Intermediate Step";
			default:
				return `Tier ${tier}`;
		}
	}

	/** Whether all tiers have been revealed. */
	const allRevealed = $derived(hintTier >= maxTier);
	/** Whether the trigger button should be disabled. */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const isButtonDisabled = $derived(disabled || allRevealed);
</script>

<div class="hint-container hints-box">
	<div class="hints-header">
		<button
			id="hint-toggle-btn"
			type="button"
			class="btn-hint hint-toggle-btn"
			onclick={onRevealNextHint}
			disabled={isButtonDisabled}
			aria-expanded={hintTier > 0}
			aria-controls="hint-content-region"
		>
			💡 {getButtonLabel(hintTier, maxTier)}
		</button>
		{#if hintTier > 0}
			<span class="tier-label" aria-live="polite">
				{getTierLabel(hintTier)}
			</span>
		{/if}
	</div>

	<!-- Revealed hint list -->
	{#if hintTier > 0}
		<div
			id="hint-content-region"
			class="hints-content"
			role="region"
			aria-label="Hints"
		>
			{#each hints.slice(0, hintTier) as hint, idx}
				<div class="hint-line">
					<span class="hint-badge">Hint {idx + 1}:</span>
					<span class="hint-text">
						<MathText text={hint} />
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* ── Outer container ──────────────────────────────────── */

	.hints-box {
		background: var(--bg-secondary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-md, 8px);
		padding: 0.85rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	/* ── Header row ───────────────────────────────────────── */

	.hints-header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
	}

	/* ── Trigger button ───────────────────────────────────── */

	.btn-hint {
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.4);
		color: #f59e0b;
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm, 6px);
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		transition:
			background 0.15s ease,
			opacity 0.15s ease;
		white-space: nowrap;
		font-family: inherit;
	}

	.btn-hint:hover:not(:disabled) {
		background: rgba(245, 158, 11, 0.25);
	}

	.btn-hint:focus-visible {
		outline: 2px solid #f59e0b;
		outline-offset: 2px;
	}

	.btn-hint:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* ── Tier label ───────────────────────────────────────── */

	.tier-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	/* ── Revealed hints list ──────────────────────────────── */

	.hints-content {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding-top: 0.4rem;
		border-top: 1px solid var(--border-color);
	}

	.hint-line {
		display: flex;
		gap: 0.5rem;
		font-size: 0.85rem;
		line-height: 1.4;
		flex-wrap: wrap;
		min-width: 0;
	}

	.hint-badge {
		font-weight: 700;
		color: #f59e0b;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.hint-text {
		color: var(--text-secondary);
		min-width: 0;
		overflow-wrap: anywhere;
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.hints-box {
			padding: 0.7rem 0.75rem;
		}

		.btn-hint {
			width: 100%;
			text-align: center;
		}
	}

	/* ── Mobile media query (≤480px) ─────────────────────── */

	@media (max-width: 480px) {
		.hints-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.btn-hint {
			width: 100%;
		}
	}
</style>
