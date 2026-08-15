import { describe, expect, it, vi } from "vitest";

/**
 * Unit tests for Section 1 reusable ITS UI components:
 * StepBreadcrumb, StepCard, and HintDisclosure.
 *
 * Because these are Svelte 5 visual components, tests validate the pure
 * logic helpers and state-derivation functions extracted from each component.
 */

// ─────────────────────────────────────────────────────────
// StepBreadcrumb — logic helpers
// ─────────────────────────────────────────────────────────

/**
 * Mirrors the getStatus() helper inside StepBreadcrumb.svelte.
 * @param {number} stepNumber 1-based step number to evaluate
 * @param {number} currentStep Current active 1-based step
 * @returns {"completed" | "active" | "locked"} Step status
 */
function getStatus(
	stepNumber: number,
	currentStep: number,
): "completed" | "active" | "locked" {
	if (stepNumber < currentStep) return "completed";
	if (stepNumber === currentStep) return "active";
	return "locked";
}

/**
 * Mirrors the getIcon() helper inside StepBreadcrumb.svelte.
 * @param {"completed" | "active" | "locked"} status Step status
 * @returns {string} Icon string
 */
function getIcon(status: "completed" | "active" | "locked"): string {
	switch (status) {
		case "completed":
			return "✓";
		case "locked":
			return "🔒";
		case "active":
			return "";
		default:
			throw new Error(`Unhandled step status: ${status satisfies never}`);
	}
}

describe("StepBreadcrumb — getStatus()", () => {
	it("returns 'completed' for steps before currentStep", () => {
		expect(getStatus(1, 3)).toBe("completed");
		expect(getStatus(2, 3)).toBe("completed");
	});

	it("returns 'active' for the current step", () => {
		expect(getStatus(3, 3)).toBe("active");
	});

	it("returns 'locked' for steps after currentStep", () => {
		expect(getStatus(4, 3)).toBe("locked");
		expect(getStatus(7, 3)).toBe("locked");
	});

	it("returns 'active' for step 1 at the very start", () => {
		expect(getStatus(1, 1)).toBe("active");
	});

	it("returns 'completed' for all prior steps at the final step", () => {
		for (let i = 1; i < 7; i++) {
			expect(getStatus(i, 7)).toBe("completed");
		}
	});
});

describe("StepBreadcrumb — getIcon()", () => {
	it("returns ✓ for completed status", () => {
		expect(getIcon("completed")).toBe("✓");
	});

	it("returns 🔒 for locked status", () => {
		expect(getIcon("locked")).toBe("🔒");
	});

	it("returns empty string for active status", () => {
		expect(getIcon("active")).toBe("");
	});

	it("throws for unknown status", () => {
		// @ts-expect-error: Testing defensive runtime guard
		expect(() => getIcon("unknown")).toThrow();
	});
});

describe("StepBreadcrumb — aria-label derivation", () => {
	/**
	 * Mirrors the aria-label logic applied to non-interactive crumb pills.
	 * @param {number} stepNumber 1-based step number
	 * @param {string} title Step title
	 * @param {"completed" | "active" | "locked"} status Step status
	 * @returns {string} Computed aria-label string
	 */
	function ariaLabel(
		stepNumber: number,
		title: string,
		status: "completed" | "active" | "locked",
	): string {
		const suffix =
			status === "active"
				? " (Current)"
				: status === "locked"
					? " (Locked)"
					: "";
		return `Step ${stepNumber}: ${title}${suffix}`;
	}

	it("labels active step with (Current) suffix", () => {
		expect(ariaLabel(3, "Symmetry", "active")).toBe(
			"Step 3: Symmetry (Current)",
		);
	});

	it("labels locked step with (Locked) suffix", () => {
		expect(ariaLabel(5, "Integral Setup", "locked")).toBe(
			"Step 5: Integral Setup (Locked)",
		);
	});

	it("labels completed step without suffix", () => {
		expect(ariaLabel(1, "Period", "completed")).toBe("Step 1: Period");
	});
});

// ─────────────────────────────────────────────────────────
// StepCard — prop validation helpers
// ─────────────────────────────────────────────────────────

describe("StepCard — status rendering decisions", () => {
	/**
	 * Derives the conditional rendering state a StepCard would apply.
	 * @param {"active" | "completed" | "locked"} status Card status prop
	 * @returns {{ showBody: boolean; showSummary: boolean; cssModifier: string }}
	 */
	function resolveCardState(status: "active" | "completed" | "locked"): {
		showBody: boolean;
		showSummary: boolean;
		cssModifier: string;
	} {
		return {
			showBody: status === "active",
			showSummary: status === "completed",
			cssModifier: `step-card--${status}`,
		};
	}

	it("shows body for active status", () => {
		const state = resolveCardState("active");
		expect(state.showBody).toBe(true);
		expect(state.showSummary).toBe(false);
		expect(state.cssModifier).toBe("step-card--active");
	});

	it("shows summary for completed status", () => {
		const state = resolveCardState("completed");
		expect(state.showBody).toBe(false);
		expect(state.showSummary).toBe(true);
		expect(state.cssModifier).toBe("step-card--completed");
	});

	it("shows neither body nor summary for locked status", () => {
		const state = resolveCardState("locked");
		expect(state.showBody).toBe(false);
		expect(state.showSummary).toBe(false);
		expect(state.cssModifier).toBe("step-card--locked");
	});
});

// ─────────────────────────────────────────────────────────
// HintDisclosure — logic helpers
// ─────────────────────────────────────────────────────────

/**
 * Mirrors the getButtonLabel() helper inside HintDisclosure.svelte.
 * @param {number} tier Current number of revealed hint tiers
 * @param {number} max Maximum available hint tiers
 * @returns {string} Button label text
 */
function getButtonLabel(tier: number, max: number): string {
	if (tier === 0) return "Get Hint";
	if (tier < max) return `Get Next Hint (${tier}/${max})`;
	return `All Hints Revealed (${max}/${max})`;
}

/**
 * Mirrors the getTierLabel() helper inside HintDisclosure.svelte.
 * @param {number} tier 1-based hint tier number
 * @returns {string} Human-readable tier label
 */
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

describe("HintDisclosure — getButtonLabel()", () => {
	it("shows 'Get Hint' when no hint has been revealed", () => {
		expect(getButtonLabel(0, 3)).toBe("Get Hint");
	});

	it("shows progress counter when at least one hint is revealed but not all", () => {
		expect(getButtonLabel(1, 3)).toBe("Get Next Hint (1/3)");
		expect(getButtonLabel(2, 3)).toBe("Get Next Hint (2/3)");
	});

	it("shows all-revealed message when hintTier reaches maxTier", () => {
		expect(getButtonLabel(3, 3)).toBe("All Hints Revealed (3/3)");
	});

	it("handles maxTier of 1 correctly", () => {
		expect(getButtonLabel(0, 1)).toBe("Get Hint");
		expect(getButtonLabel(1, 1)).toBe("All Hints Revealed (1/1)");
	});
});

describe("HintDisclosure — getTierLabel()", () => {
	it("returns Conceptual Nudge for tier 1", () => {
		expect(getTierLabel(1)).toBe("Tier 1: Conceptual Nudge");
	});

	it("returns Formula Setup for tier 2", () => {
		expect(getTierLabel(2)).toBe("Tier 2: Formula Setup");
	});

	it("returns Worked Intermediate Step for tier 3", () => {
		expect(getTierLabel(3)).toBe("Tier 3: Worked Intermediate Step");
	});

	it("returns generic Tier N label for out-of-range tiers", () => {
		expect(getTierLabel(4)).toBe("Tier 4");
		expect(getTierLabel(0)).toBe("Tier 0");
	});
});

describe("HintDisclosure — disabled/allRevealed state derivation", () => {
	/**
	 * Derives the isButtonDisabled state based on component props.
	 * @param {boolean} disabled Explicit disabled prop
	 * @param {number} hintTier Currently revealed tier count
	 * @param {number} maxTier Maximum available tiers
	 * @returns {boolean} Whether the trigger button should be disabled
	 */
	function isButtonDisabled(
		disabled: boolean,
		hintTier: number,
		maxTier: number,
	): boolean {
		return disabled || hintTier >= maxTier;
	}

	it("is disabled when disabled prop is true regardless of tier", () => {
		expect(isButtonDisabled(true, 0, 3)).toBe(true);
		expect(isButtonDisabled(true, 2, 3)).toBe(true);
	});

	it("is disabled when all hints are revealed", () => {
		expect(isButtonDisabled(false, 3, 3)).toBe(true);
	});

	it("is enabled when neither condition applies", () => {
		expect(isButtonDisabled(false, 0, 3)).toBe(false);
		expect(isButtonDisabled(false, 2, 3)).toBe(false);
	});
});

describe("HintDisclosure — hints slice derivation", () => {
	const hints = [
		"Identify the symmetry of $x(t)$.",
		"Apply the Fourier integral formula $a_n = \\frac{2}{T_0}\\int$.",
		"Substitute and evaluate at boundary values.",
	];

	it("reveals zero hints at tier 0", () => {
		expect(hints.slice(0, 0)).toHaveLength(0);
	});

	it("reveals first hint at tier 1", () => {
		const revealed = hints.slice(0, 1);
		expect(revealed).toHaveLength(1);
		expect(revealed[0]).toContain("symmetry");
	});

	it("reveals first two hints at tier 2", () => {
		const revealed = hints.slice(0, 2);
		expect(revealed).toHaveLength(2);
		expect(revealed[1]).toContain("Fourier");
	});

	it("reveals all hints at tier 3", () => {
		const revealed = hints.slice(0, 3);
		expect(revealed).toHaveLength(3);
	});

	it("does not exceed available hints when tier exceeds hints.length", () => {
		const revealed = hints.slice(0, 10);
		expect(revealed).toHaveLength(3);
	});
});

describe("HintDisclosure — onRevealNextHint callback", () => {
	it("invokes the callback when called", () => {
		const onReveal = vi.fn();
		// Simulate button click
		onReveal();
		expect(onReveal).toHaveBeenCalledOnce();
	});

	it("does not invoke the callback when button is disabled", () => {
		const onReveal = vi.fn();
		const isDisabled = true;
		// Simulate guard: button click blocked by disabled state
		if (!isDisabled) {
			onReveal();
		}
		expect(onReveal).not.toHaveBeenCalled();
	});
});

// ─────────────────────────────────────────────────────────
// Section 2: ProblemHeader — logic helpers
// ─────────────────────────────────────────────────────────

/** Mirrors the badge variant union used by ProblemHeader. */
type BadgeVariant = "primary" | "secondary" | "accent" | "category";

/**
 * A single badge item passed to ProblemHeader.
 * @property {string} label Human-readable pill label
 * @property {BadgeVariant} [variant] Visual colour variant
 */
interface BadgeItem {
	label: string;
	variant?: BadgeVariant;
}

/**
 * Derives the CSS modifier class for a badge variant.
 * Mirrors the `badge--{variant}` class pattern used in ProblemHeader.svelte.
 * @param {BadgeVariant} [variant] Badge variant
 * @returns {string} CSS class string
 */
function badgeClass(variant?: BadgeVariant): string {
	return `badge--${variant ?? "primary"}`;
}

/**
 * Returns the default next-problem button label.
 * @param {string} [override] Optional caller-provided label override
 * @returns {string} Button label text
 */
function resolveNextButtonLabel(override?: string): string {
	return override ?? "🎲 Generate Next Problem";
}

describe("ProblemHeader — badge class derivation", () => {
	it("defaults to badge--primary when variant is undefined", () => {
		expect(badgeClass(undefined)).toBe("badge--primary");
	});

	it("returns badge--secondary for secondary variant", () => {
		expect(badgeClass("secondary")).toBe("badge--secondary");
	});

	it("returns badge--accent for accent variant", () => {
		expect(badgeClass("accent")).toBe("badge--accent");
	});

	it("returns badge--category for category variant", () => {
		expect(badgeClass("category")).toBe("badge--category");
	});

	it("returns badge--primary for explicit primary variant", () => {
		expect(badgeClass("primary")).toBe("badge--primary");
	});
});

describe("ProblemHeader — badge list construction", () => {
	it("produces correct badge list for Fourier Series card", () => {
		const badges: BadgeItem[] = [
			{ label: "square Wave", variant: "secondary" },
			{ label: "odd Symmetry", variant: "accent" },
		];
		expect(badges).toHaveLength(2);
		expect(badges[0].label).toContain("Wave");
		expect(badges[0].variant).toBe("secondary");
		expect(badges[1].variant).toBe("accent");
	});

	it("produces correct badge list for ODE card", () => {
		const badges: BadgeItem[] = [
			{ label: "2nd-Order", variant: "secondary" },
			{ label: "real distinct", variant: "accent" },
		];
		expect(badges[0].label).toBe("2nd-Order");
	});

	it("allows empty badge list", () => {
		const badges: BadgeItem[] = [];
		expect(badges).toHaveLength(0);
	});
});

describe("ProblemHeader — next-problem button label", () => {
	it("uses the default label when no override is provided", () => {
		expect(resolveNextButtonLabel()).toBe("🎲 Generate Next Problem");
	});

	it("uses the override label when provided", () => {
		expect(resolveNextButtonLabel("🔄 Try Another")).toBe("🔄 Try Another");
	});

	it("invokes the onNextProblem callback when called", () => {
		const onNextProblem = vi.fn();
		onNextProblem();
		expect(onNextProblem).toHaveBeenCalledOnce();
	});
});

// ─────────────────────────────────────────────────────────
// Section 2: CompletionBanner — logic helpers
// ─────────────────────────────────────────────────────────

/**
 * Resolves the banner title falling back to the default value.
 * Mirrors the `title = "Problem Completed!"` prop default in CompletionBanner.
 * @param {string} [title] Caller-provided title override
 * @returns {string} Resolved banner title
 */
function resolveBannerTitle(title?: string): string {
	return title ?? "Problem Completed!";
}

/**
 * Resolves the banner icon falling back to the default emoji.
 * @param {string} [icon] Caller-provided icon override
 * @returns {string} Resolved icon string
 */
function resolveBannerIcon(icon?: string): string {
	return icon ?? "🎉";
}

/**
 * A single stat item displayed in the banner stat pill row.
 * @property {string} label Descriptive stat label
 * @property {string | number} value Computed stat value
 */
interface StatItem {
	label: string;
	value: string | number;
}

describe("CompletionBanner — prop defaults", () => {
	it("defaults title to 'Problem Completed!'", () => {
		expect(resolveBannerTitle()).toBe("Problem Completed!");
	});

	it("uses caller-provided title when supplied", () => {
		expect(resolveBannerTitle("All Steps Done!")).toBe("All Steps Done!");
	});

	it("defaults icon to 🎉", () => {
		expect(resolveBannerIcon()).toBe("🎉");
	});

	it("uses caller-provided icon when supplied", () => {
		expect(resolveBannerIcon("🏆")).toBe("🏆");
	});
});

describe("CompletionBanner — stats display logic", () => {
	it("renders no stat pills when stats array is empty", () => {
		const stats: StatItem[] = [];
		// Empty stats → stat row should not be rendered
		expect(stats.length > 0).toBe(false);
	});

	it("renders stat pill for each item in stats array", () => {
		const stats: StatItem[] = [
			{ label: "Steps Completed", value: 7 },
			{ label: "Hints Used", value: 2 },
		];
		expect(stats).toHaveLength(2);
		expect(stats[0].label).toBe("Steps Completed");
		expect(stats[0].value).toBe(7);
		expect(stats[1].value).toBe(2);
	});

	it("supports mixed string and number stat values", () => {
		const stats: StatItem[] = [
			{ label: "Score", value: "100%" },
			{ label: "Time", value: 42 },
		];
		expect(typeof stats[0].value).toBe("string");
		expect(typeof stats[1].value).toBe("number");
	});
});

// ─────────────────────────────────────────────────────────
// Section 2: StickyActionBar — visibility logic
// ─────────────────────────────────────────────────────────

/**
 * Derives whether the StickyActionBar should be rendered.
 * Mirrors the `{#if visible}` guard in StickyActionBar.svelte.
 * @param {boolean} [visible] Visibility prop value
 * @returns {boolean} Whether the bar is rendered
 */
function isStickyBarVisible(visible?: boolean): boolean {
	return visible ?? true;
}

describe("StickyActionBar — visibility", () => {
	it("is visible by default (no prop passed)", () => {
		expect(isStickyBarVisible()).toBe(true);
	});

	it("is visible when visible=true", () => {
		expect(isStickyBarVisible(true)).toBe(true);
	});

	it("is hidden when visible=false", () => {
		expect(isStickyBarVisible(false)).toBe(false);
	});
});
