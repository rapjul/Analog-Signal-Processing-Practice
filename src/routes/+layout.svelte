<script lang="ts">
	import "../app.css";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import favicon from "$lib/assets/favicon.svg";

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
