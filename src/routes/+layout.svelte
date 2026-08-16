<script lang="ts">
	import { onMount } from "svelte";
	import "../app.css";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import favicon from "$lib/assets/favicon.svg";

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let { children } = $props();

	/**
	 * Initializes and registers the PWA Service Worker via `virtual:pwa-register`
	 * to enable offline capabilities and background cache updates.
	 *
	 * @returns {Promise<void>} Resolves once registration has been initiated.
	 */
	async function initServiceWorker(): Promise<void> {
		if (typeof window !== "undefined" && "serviceWorker" in navigator) {
			const { registerSW } = await import("virtual:pwa-register");
			registerSW({
				immediate: true,
				/**
				 * Callback fired when the Service Worker is successfully registered.
				 *
				 * @param {string | undefined} swScriptUrl - The script URL of the registered service worker.
				 * @param {ServiceWorkerRegistration | undefined} registration - The registration instance.
				 */
				onRegisteredSW(swScriptUrl, registration) {
					console.log(
						"PWA Service Worker registered:",
						swScriptUrl,
						registration,
					);
				},
				/**
				 * Callback fired if the Service Worker registration encounters an error.
				 *
				 * @param {unknown} error - The registration error.
				 */
				onRegisterError(error) {
					console.error(
						"PWA Service Worker registration error:",
						error,
					);
				},
			});
		}
	}

	onMount(() => {
		void initServiceWorker();
	});
</script>

<svelte:head>
	<link
		rel="icon"
		href={favicon}
	/>
</svelte:head>

{@render children()}
