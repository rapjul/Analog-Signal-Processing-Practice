<script lang="ts">
	/**
	 * PiecewiseIntervalInput Svelte 5 Component.
	 *
	 * Provides a structured form builder for defining piecewise signals and convolution intervals,
	 * auto-synthesizing canonical LaTeX for the math engine.
	 */

	import MathInline from "./MathInline.svelte";

	export interface IntervalRow {
		/** Unique identifier for row rendering */
		id: string;
		/** Condition format type */
		conditionType: "t_less" | "between" | "t_greater";
		/** Lower boundary value string (e.g. "0", "-2") */
		lowerBound: string;
		/** Upper boundary value string (e.g. "2", "5") */
		upperBound: string;
		/** Custom LaTeX/text condition string */
		customCondition: string;
		/** Expression value inside interval (e.g. "0", "2t", "e^{-2t}") */
		expression: string;
	}

	interface Props {
		/** Initial or current LaTeX string */
		value?: string;
		/** Callback triggered when synthesized LaTeX string changes */
		onChange?: (latex: string) => void;
	}

	let { value = "", onChange }: Props = $props();

	/** Interval list state */
	let intervals = $state<IntervalRow[]>([
		{
			id: "1",
			conditionType: "t_less",
			lowerBound: "0",
			upperBound: "0",
			customCondition: "",
			expression: "0",
		},
		{
			id: "2",
			conditionType: "between",
			lowerBound: "0",
			upperBound: "0",
			customCondition: "",
			expression: "t-2",
		},
		{
			id: "3",
			conditionType: "t_greater",
			lowerBound: "0",
			upperBound: "0",
			customCondition: "",
			expression: "e^{-t}",
		},
	]);

	/**
	 * Generates a unique string ID for new interval rows.
	 * @returns {string} Unique string ID
	 */
	function generateId(): string {
		return Math.random().toString(36).substring(2, 9);
	}

	/**
	 * Formats an individual interval's condition string into LaTeX.
	 * @param {IntervalRow} row Interval data row
	 * @returns {string} Formatted condition LaTeX string
	 */
	function formatCondition(row: IntervalRow): string {
		switch (row.conditionType) {
			case "t_less":
				return `t < ${row.upperBound || "0"}`;
			case "between":
				return `${row.lowerBound || "0"} \\le t \\le ${row.upperBound || "1"}`;
			case "t_greater":
				return `t \\ge ${row.lowerBound || "0"}`;
			default:
				return "t";
		}
	}

	/**
	 * Synthesizes the full LaTeX piecewise expression from all rows.
	 * @returns {string} LaTeX piecewise string
	 */
	function synthesizeLatex(): string {
		if (intervals.length === 0) return "";
		if (intervals.length === 1) {
			const expr = intervals[0].expression.trim() || "0";
			const cond = formatCondition(intervals[0]);
			return `${expr} \\quad \\text{for } ${cond}`;
		}

		const casesStr = intervals
			.map((row) => {
				const expr = row.expression.trim() || "0";
				const cond = formatCondition(row);
				return `${expr}, & ${cond}`;
			})
			.join(" \\\\ ");

		return `\\begin{cases} ${casesStr} \\end{cases}`;
	}

	/**
	 * Adds a new interval row to the list.
	 */
	function addInterval() {
		const lastRow = intervals[intervals.length - 1];
		let nextLower = "0";
		if (lastRow) {
			nextLower =
				lastRow.conditionType === "t_less"
					? lastRow.upperBound
					: lastRow.lowerBound || "0";
		}

		intervals.push({
			id: generateId(),
			conditionType: "t_greater",
			lowerBound: nextLower,
			upperBound: `${Number.parseInt(nextLower, 10) + 2}`,
			customCondition: "",
			expression: "0",
		});

		updateValue();
	}

	/**
	 * Removes an interval row by ID.
	 * @param {string} id Row ID to remove
	 */
	function removeInterval(id: string) {
		if (intervals.length <= 1) return;
		intervals = intervals.filter((row) => row.id !== id);
		updateValue();
	}

	/**
	 * Triggers parent update callback with newly synthesized LaTeX.
	 */
	function updateValue() {
		const latex = synthesizeLatex();
		if (onChange) {
			onChange(latex);
		}
	}

	// Update latex whenever internal state mutates
	$effect(() => {
		updateValue();
	});
</script>

<div class="piecewise-builder">
	<div class="builder-header">
		<span class="builder-title">
			Interval Builder (Piecewise / Convolution)
		</span>
		<button
			type="button"
			class="add-row-btn"
			onclick={addInterval}
		>
			+ Add Interval
		</button>
	</div>

	<div class="rows-container">
		{#each intervals as row, index (row.id)}
			<div class="interval-row">
				<span class="row-num">#{index + 1}</span>

				<!-- Condition Type Selector -->
				<div class="field-group">
					<label for="cond-type-{row.id}">Format:</label>
					<select
						id="cond-type-{row.id}"
						class="select-input"
						bind:value={row.conditionType}
						onchange={updateValue}
					>
						<option value="t_less">t &lt; A</option>
						<option value="between">A &le; t &le; B</option>
						<option value="t_greater">t &gt; A</option>
					</select>
				</div>

				<!-- Dynamic Boundary Inputs -->
				<div
					class="section-divider"
					aria-hidden="true"
				></div>

				{#if row.conditionType === "t_less"}
					<div class="field-group">
						<label for="upper-{row.id}">Limit:</label>
						<input
							id="upper-{row.id}"
							type="text"
							class="text-input sm"
							bind:value={row.upperBound}
							oninput={updateValue}
							placeholder="0"
							aria-label="Upper limit A for t < A"
						/>
					</div>
				{:else if row.conditionType === "between"}
					<div class="field-group inline">
						<label for="lower-{row.id}">Limits:</label>
						<input
							id="lower-{row.id}"
							type="text"
							class="text-input sm"
							bind:value={row.lowerBound}
							oninput={updateValue}
							placeholder="0"
							aria-label="Lower boundary A"
						/>
						<span class="sep"
							><MathInline math={"\\le t \\le"} /></span
						>
						<input
							id="upper-between-{row.id}"
							type="text"
							class="text-input sm"
							bind:value={row.upperBound}
							oninput={updateValue}
							placeholder="2"
							aria-label="Upper boundary B"
						/>
					</div>
				{:else if row.conditionType === "t_greater"}
					<div class="field-group">
						<label for="lower-gt-{row.id}">Limit:</label>
						<input
							id="lower-gt-{row.id}"
							type="text"
							class="text-input sm"
							bind:value={row.lowerBound}
							oninput={updateValue}
							placeholder="0"
							aria-label="Lower limit A for t > A"
						/>
					</div>
				{/if}

				<!-- Expression Input -->
				<div
					class="section-divider"
					aria-hidden="true"
				></div>

				<div class="field-group flex-grow">
					<label for="expr-{row.id}">Expression:</label>
					<input
						id="expr-{row.id}"
						type="text"
						class="text-input mono"
						bind:value={row.expression}
						oninput={updateValue}
						placeholder="e.g. 2t or e^-t"
					/>
				</div>

				<!-- Delete Button -->
				{#if intervals.length > 1}
					<button
						type="button"
						class="remove-row-btn"
						onclick={() => removeInterval(row.id)}
						title="Remove interval {row.id}"
					>
						✕
					</button>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	/* ── Piecewise builder container ───────────────────────── */

	.piecewise-builder {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	/* ── Header & add row button ───────────────────────────── */

	.builder-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.builder-title {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--accent-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.add-row-btn {
		background: var(--accent-bg);
		color: var(--accent-primary);
		border: 1px solid var(--accent-primary);
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-row-btn:hover,
	.add-row-btn:focus-visible {
		background: var(--accent-primary);
		color: var(--black-100);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Interval rows list & row card ─────────────────────── */

	.rows-container {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.interval-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		flex-wrap: nowrap;
		max-width: 100%;
		box-sizing: border-box;
	}

	.row-num {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--white-85);
		min-width: 1.5rem;
		flex-shrink: 0;
	}

	.section-divider {
		width: 2px;
		height: 1.5rem;
		background: color-mix(in oklab, var(--border-color), var(--white-80));
		opacity: 0.5;
		flex-shrink: 0;
	}

	/* ── Field groups & labels ─────────────────────────────── */

	.field-group {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.field-group.inline {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
	}

	.field-group.flex-grow {
		flex: 1;
		min-width: 100px;
		margin-top: 0;
	}

	label {
		color: var(--white-85);
		font-size: 0.8rem;
		white-space: nowrap;
		font-weight: 500;
	}

	/* ── Form inputs & controls ────────────────────────────── */

	.select-input,
	.text-input {
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.5rem;
		font-size: 0.85rem;
		box-sizing: border-box;
	}

	.text-input.mono {
		font-family: var(--font-mono);
		width: 100%;
		min-width: 0;
	}

	.text-input.sm {
		width: 50px;
		text-align: center;
	}

	.select-input:focus,
	.text-input:focus {
		border-color: var(--accent-primary);
	}

	.select-input:focus-visible,
	.text-input:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.sep {
		color: var(--white-85);
		font-size: 0.8rem;
		font-weight: 500;
	}

	/* ── Row remove action button ──────────────────────────── */

	.remove-row-btn {
		position: static;
		background: transparent;
		color: var(--text-muted);
		border: none;
		font-size: 0.9rem;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		border-radius: var(--radius-sm);
		transition: color 0.2s ease;
		flex-shrink: 0;
	}

	.remove-row-btn:hover,
	.remove-row-btn:focus-visible {
		color: var(--color-error);
		outline: 2px solid var(--color-error);
		outline-offset: 2px;
	}
</style>
