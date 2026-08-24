<script lang="ts">
	/** Sequential breakpoint-contact and interval-construction step. */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import {
		type ConvolutionProblem,
		formatConvolutionScalar,
	} from "$lib/math-engine/convolution/index";

	interface Props {
		/** Active exact convolution problem. */
		problem: ConvolutionProblem;
		/** Reactive solver controller. */
		solver: ConvolutionStepSolverState;
	}

	let { problem, solver }: Props = $props();
	const status = $derived(
		solver.currentStep === 4
			? "active"
			: solver.currentStep > 4
				? "completed"
				: "locked",
	);
	const activeId = $derived(solver.step4.activeSubStepId);
	const activeIndex = $derived(solver.step4.subStepOrder.indexOf(activeId));
	const activeState = $derived(solver.step4.subSteps[activeId]);
	const breakpoint = $derived(
		problem.itsData.step4.breakpointParts.find(({ id }) => id === activeId),
	);
	const contacts = $derived(
		problem.itsData.step4.transitionGroups.flatMap(
			(group) => group.contactsBySignal[solver.flippedSignal],
		),
	);
	const activeContact = $derived(
		contacts.find(({ id }) => activeId.startsWith(id)),
	);
	const fixedSignal = $derived(solver.flippedSignal === "h" ? "x" : "h");
	const completedTransitions = $derived(
		problem.itsData.step4.transitionGroups
			.map(({ time }) => `t=${time}`)
			.join(",\\;"),
	);
	const completedIntervals = $derived(
		problem.itsData.step4.intervalLabels.join(",\\;"),
	);

	/** Names one verified ledger entry by its role in the convolution workflow. */
	function ledgerLabel(id: string): string {
		const contactIndex = contacts.findIndex(({ id: contactId }) =>
			id.startsWith(contactId),
		);
		if (contactIndex >= 0)
			return `Contact ${contactIndex + 1} of ${contacts.length} — ${id.endsWith("-form") ? "Formulate" : "Solve"}`;
		if (id === "transition-count") return "Group Transition Times";
		if (id === "interval-count" || id === "interval-builder")
			return "Build Intervals";
		return "Signal Analysis";
	}
</script>

{#snippet headerExtra()}
	{#if status === "active"}<PartProgressPill
			progress={solver.step4Progress}
		/>{/if}
{/snippet}

{#snippet completedSummary()}
	<div class="summary-grid">
		<MathBlock
			math={String.raw`\mathcal{T}=\{${completedTransitions}\}`}
			compact={true}
			hideHeader={true}
			responsive={true}
		/>
		<MathBlock
			math={String.raw`\mathcal{R}=\{${completedIntervals}\}`}
			compact={true}
			hideHeader={true}
			responsive={true}
		/>
	</div>
{/snippet}

<StepCard
	stepNumber={4}
	title="Find Transition Points, Then Build Time Intervals"
	{status}
	{headerExtra}
	summarySnippet={completedSummary}
>
	<div class="step-body">
		<p class="definition">
			<strong>Breakpoint:</strong> a start edge, end edge, interior slope change,
			or piecewise formula change.
		</p>
		<p class="purpose">
			Contact times matter because the overlap formula or active
			integration bounds can change whenever a fixed breakpoint meets a
			transformed moving breakpoint.
		</p>

		<div
			class="work-ledger"
			aria-label="Verified convolution work"
		>
			{#each solver.step4.subStepOrder.slice(0, activeIndex) as completedId}
				{@const completedState = solver.step4.subSteps[completedId]}
				{@const completedBreakpoint =
					problem.itsData.step4.breakpointParts.find(
						({ id }) => id === completedId,
					)}
				{@const completedContact = contacts.find(({ id }) =>
					completedId.startsWith(id),
				)}
				<SubStepBlock
					badge={ledgerLabel(completedId)}
					title={completedState.title}
					isCompleted={true}
				>
					{#snippet summarySnippet()}
						<div class="verified-summary">
							{#if completedId === "section-count-x" || completedId === "section-count-h"}
								{@const signal =
									completedId === "section-count-x"
										? "x"
										: "h"}
								<MathText
									text={`$${signal}(t)$ contains ${completedState.input} connected non-zero section${completedState.input === "1" ? "" : "s"}.`}
								/>
							{:else if completedBreakpoint}
								<MathText
									text={`Verified interior breakpoint: $t=${completedState.input}$.`}
								/>
							{:else if completedContact && completedId.endsWith("-form")}
								<MathText
									text={`Verified contact equation: $${completedContact.equationLatex}$.`}
								/>
							{:else if completedContact}
								<MathText
									text={`Verified contact time: $t=${completedContact.transitionTime}$.`}
								/>
								{#if completedContact.duplicateOf}
									<p class="group-note">
										This matches an earlier contact, so both
										contacts form one transition time.
									</p>
								{/if}
							{:else if completedId === "transition-count"}
								<p>
									{completedState.input} distinct transition times
									verified.
								</p>
							{:else if completedId === "interval-count"}
								<p>
									{completedState.input} output intervals verified.
								</p>
							{/if}
						</div>
					{/snippet}
				</SubStepBlock>
			{/each}
		</div>

		<SubStepBlock
			badge={ledgerLabel(activeId)}
			title={activeState.title}
		>
			{#if activeId === "section-count-x" || activeId === "section-count-h"}
				{@const signal = activeId === "section-count-x" ? "x" : "h"}
				<p class="step-prompt">
					<MathText
						text={`How many connected non-zero sections does $${signal}(t)$ contain? A zero-valued gap separates two sections.`}
					/>
				</p>
			{:else if breakpoint}
				<p class="step-prompt">
					<MathText
						text={`Find interior edge, slope, or formula change ${breakpoint.index} of $${breakpoint.signal}(t)$. Enter its time value.`}
					/>
				</p>
			{:else if activeContact && activeId.endsWith("-form")}
				<p class="step-prompt">
					Use this breakpoint pair to formulate one contact equation.
					The fixed and transformed positions are equal when they
					touch.
				</p>
				<div class="contact-context">
					<MathText
						text={`Fixed $${fixedSignal}(\\tau)$ breakpoint: $\\tau=${formatConvolutionScalar(activeContact.fixed)}$.`}
					/>
					<MathText
						text={`Original moving $${solver.flippedSignal}(t)$ breakpoint: $${formatConvolutionScalar(activeContact.moving)}$.`}
					/>
				</div>
				<p class="context-note">
					<MathText
						text={String.raw`Reflect and translate the moving breakpoint to obtain its position in $\tau$.`}
					/>
				</p>
			{:else if activeContact}
				<p class="step-prompt">
					<MathText
						text={String.raw`Solve the verified contact equation. This value of $t$ is a possible boundary between two overlap formulas.`}
					/>
				</p>
				<MathBlock
					math={activeContact.equationLatex}
					compact={true}
					hideHeader={true}
					responsive={true}
				/>
			{:else if activeId === "transition-count"}
				<p class="step-prompt">
					How many distinct transition times remain after equal
					contact answers are grouped together?
				</p>
			{:else if activeId === "interval-count"}
				<p class="step-prompt">
					How many output intervals are created by the verified
					transition times? Include both exterior intervals.
				</p>
			{:else if activeId === "interval-builder"}
				<p class="step-prompt">
					Use the verified sorted transition times to fill every
					interval boundary.
				</p>
				<form
					class="interval-form"
					onsubmit={(event) => {
						event.preventDefault();
						solver.checkStep4();
					}}
				>
					<div class="interval-list">
						<label>
							<MathText text={String.raw`$t<$`} />
							<input
								type="text"
								bind:value={activeState.intervalInputs[0]}
								aria-label="First interval upper boundary"
							/>
						</label>
						{#each activeState.intervalInputs.slice(0, -1) as _, index}
							<label>
								<input
									type="text"
									bind:value={
										activeState.intervalInputs[index]
									}
									aria-label={`Interval ${index + 2} lower boundary`}
								/><MathText text={String.raw`$\le t<$`} /><input
									type="text"
									bind:value={
										activeState.intervalInputs[index + 1]
									}
									aria-label={`Interval ${index + 2} upper boundary`}
								/>
							</label>
						{/each}
						<label>
							<MathText text={String.raw`$t\ge$`} />
							<input
								type="text"
								bind:value={
									activeState.intervalInputs[
										activeState.intervalInputs.length - 1
									]
								}
								aria-label="Final interval lower boundary"
							/>
						</label>
					</div>
					<button
						type="submit"
						class="check-button"
					>
						Check interval partition
					</button>
				</form>
			{/if}

			{#if activeId !== "interval-builder"}
				<form
					class="scalar-form"
					onsubmit={(event) => {
						event.preventDefault();
						solver.checkStep4();
					}}
				>
					<label class:equation-entry={Boolean(activeContact)}>
						{#if activeContact && activeId.endsWith("-form")}
							<MathText
								text={`$${formatConvolutionScalar(activeContact.fixed)}=$`}
							/>
						{:else if activeContact}
							<MathText text={String.raw`$t=$`} />
						{:else}
							<span>Your answer</span>
						{/if}
						<input
							type="text"
							bind:value={activeState.input}
							placeholder={activeContact &&
							activeId.endsWith("-form")
								? "e.g. t-1 or 2 = t-1"
								: activeContact
									? "e.g. 3 or t = 3"
									: "e.g. 0 or 2"}
							aria-label={activeContact &&
							activeId.endsWith("-form")
								? "Transformed moving breakpoint"
								: activeContact
									? "Contact time after t equals"
									: "Step answer"}
						/>
					</label>
					<button
						type="submit"
						class="check-button">Check this part</button
					>
				</form>
			{/if}
		</SubStepBlock>

		<StepFeedback {solver} />
		<HintDisclosure
			hints={solver.activeHints}
			hintTier={solver.hintTier}
			onRevealNextHint={() => solver.revealNextHint()}
		/>
	</div>
</StepCard>

<style>
	/* ── Step and summary layout ───────────────────────────── */
	.step-body,
	.scalar-form,
	.interval-form,
	.interval-list,
	.verified-summary {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}
	.summary-grid,
	.contact-context,
	.work-ledger {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		width: 100%;
		min-width: 0;
	}
	.definition,
	.purpose,
	.step-prompt,
	.context-note,
	.group-note,
	.verified-summary p {
		margin: 0;
		line-height: var(--leading-relaxed);
	}
	.definition,
	.purpose,
	.context-note,
	.group-note {
		color: var(--text-secondary);
	}
	.step-prompt {
		color: var(--text-primary);
	}
	.context-note,
	.group-note {
		font-size: var(--text-sm);
	}
	.scalar-form label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		max-width: 320px;
		color: var(--text-secondary);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.scalar-form label.equation-entry {
		flex-direction: row;
		align-items: center;
		max-width: 430px;
		font-size: var(--text-base);
	}
	.scalar-form input,
	.interval-list input {
		min-width: 0;
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-input);
		color: var(--text-primary);
		font: inherit;
	}
	.scalar-form .equation-entry input {
		flex: 1;
	}
	.interval-list label {
		display: grid;
		grid-template-columns: auto minmax(70px, 160px) auto minmax(
				70px,
				160px
			);
		align-items: center;
		justify-content: start;
		gap: 0.45rem;
	}
	.interval-list label:first-child,
	.interval-list label:last-child {
		grid-template-columns: auto minmax(70px, 160px);
	}
	.check-button {
		align-self: flex-start;
		padding: 0.55rem 0.9rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--accent-primary);
		color: var(--black-100);
		font-weight: 700;
		cursor: pointer;
	}
	.scalar-form input:focus-visible,
	.interval-list input:focus-visible,
	.check-button:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}

	/* ── Mobile media query (≤720px) ──────────────────────── */
	@media (max-width: 720px) {
		.summary-grid,
		.contact-context,
		.work-ledger {
			grid-template-columns: 1fr;
		}
	}

	/* ── Mobile media query (≤520px) ──────────────────────── */
	@media (max-width: 520px) {
		.interval-list label {
			grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
		}
		.check-button {
			width: 100%;
		}
	}
</style>
