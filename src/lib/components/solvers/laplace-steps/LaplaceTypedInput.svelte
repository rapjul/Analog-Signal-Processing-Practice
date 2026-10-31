<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import {
		entryInstruction,
		permitsEntryDraft,
	} from "$lib/math-engine/laplace/input-entry";
	import type { LaplaceEntry } from "$lib/math-engine/laplace/types";

	/** A domain-aware input retaining ordinary keyboard and accessibility attributes. */
	interface Props extends Omit<
		HTMLInputAttributes,
		"value" | "type" | "oninput"
	> {
		/** Learner-owned numeric or mathematical draft. */ value?:
			string | undefined;
		/** Numeric configuration value; blank is represented by NaN until validation. */ numericValue?: number;
		/** Receives edits for numeric configuration fields. */ onnumericedit?: (
			value: number,
		) => void;
		/** Declared mathematical input domain. */ entry?: LaplaceEntry;
		/** Clears stale grading feedback after an accepted edit. */ onedit?: () => void;
	}
	let {
		value = $bindable(),
		numericValue,
		onnumericedit,
		entry = { kind: "literal" },
		onedit,
		...attributes
	}: Props = $props();
	let issue = $state("");
	let rejectedRun = false;
	const uid = $props.id();
	let draft = $derived(
		numericValue === undefined
			? (value ?? "")
			: Number.isFinite(numericValue)
				? String(numericValue)
				: "",
	);
	$effect(() => {
		void draft;
		issue = "";
		rejectedRun = false;
	});
	/** @param event - Keyboard insertion or explicit correction. Prevents a rejected decimal separator from silently turning the rest of a typing run into an integer. */
	function keydown(
		event: KeyboardEvent & { currentTarget: HTMLInputElement },
	): void {
		const input = event.currentTarget;
		const replacing = input.selectionStart !== input.selectionEnd;
		const correction =
			replacing ||
			event.ctrlKey ||
			event.metaKey ||
			[
				"Backspace",
				"Delete",
				"ArrowLeft",
				"ArrowRight",
				"Home",
				"End",
				"Tab",
			].includes(event.key);
		if (correction) rejectedRun = false;
		if (
			rejectedRun &&
			(entry.kind === "integer" || entry.kind === "degree") &&
			/^\d$/.test(event.key)
		) {
			event.preventDefault();
			return;
		}
		attributes.onkeydown?.(event);
	}
	/** @param event - Deliberate pointer repositioning. Starts a new editing gesture without discarding the retained draft. */
	function reposition(
		event: MouseEvent & { currentTarget: HTMLInputElement },
	): void {
		rejectedRun = false;
		attributes.onclick?.(event);
	}
	/** @param event - Proposed complete insertion. Reject unsupported notation without stripping it. */
	function edit(event: Event & { currentTarget: HTMLInputElement }): void {
		const proposed = event.currentTarget.value;
		if (!permitsEntryDraft(proposed, entry)) {
			event.currentTarget.value = draft;
			issue = `${entryInstruction(entry)}${entry.kind === "integer" || entry.kind === "degree" ? " Select or delete to start a new entry." : ""}`;
			rejectedRun = true;
			return;
		}
		if (numericValue !== undefined)
			onnumericedit?.(proposed ? Number(proposed) : Number.NaN);
		else value = proposed;
		issue = "";
		rejectedRun = false;
		onedit?.();
	}
</script>

<input
	{...attributes}
	id={attributes.id ?? uid}
	type="text"
	inputmode={entry.kind === "integer" || entry.kind === "degree"
		? "numeric"
		: "text"}
	aria-describedby={[
		attributes["aria-describedby"],
		issue ? `${uid}-issue` : "",
	]
		.filter(Boolean)
		.join(" ") || undefined}
	value={permitsEntryDraft(draft, entry) ? draft : ""}
	oninput={edit}
	onkeydown={keydown}
	onclick={reposition}
/>
{#if issue}<span
		id={`${uid}-issue`}
		class="entry-issue"
		role="status">{issue}</span
	>{/if}

<style>
	input {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.6rem;
		font: inherit;
	}
	input:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}
	.entry-issue {
		display: block;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
</style>
