<script lang="ts">
	/** Keys attempts by object and mode so even identical IDs reset all state. */
	import type { CtftPracticeMode } from "$lib/math-engine/ctft-lesson";
	import type { GeneratedCtftProblem } from "$lib/math-engine/fourier-transform";
	import CtftSolverSession from "./CtftSolverSession.svelte";

	/** Public guided solver inputs. */
	interface Props {
		/** Parameter-owned signal. */ problem: GeneratedCtftProblem;
		/** Selected teaching path. */ mode?: CtftPracticeMode;
		/** Optional completion callback. */ onComplete?: () => void;
	}
	let { problem, mode = "derivation", onComplete }: Props = $props();
</script>

{#key problem}{#key mode}<CtftSolverSession
			{problem}
			{mode}
			{onComplete}
		/>{/key}{/key}
