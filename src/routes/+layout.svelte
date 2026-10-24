<script lang="ts">
	import { onMount } from "svelte";
	import "../app.css";
	import favicon from "$lib/assets/favicon.svg";
	import UpdateToast from "$lib/components/ui/UpdateToast.svelte";
	import { shouldRegisterServiceWorker } from "$lib/pwa-policy";

	let { children } = $props();

	let showToast = $state(false);
	let toastMode = $state<"update" | "offline">("update");
	let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null =
		$state(null);

	/**
	 * Preserves the active route / path in sessionStorage prior to service worker refresh.
	 */
	function handleUpdateSW() {
		if (typeof window !== "undefined") {
			sessionStorage.setItem(
				"signallab_last_active_path",
				window.location.pathname,
			);
		}
		if (updateServiceWorker) {
			void updateServiceWorker(true);
		}
	}

	/**
	 * Dismisses the visible PWA toast notification.
	 */
	function handleDismissToast() {
		showToast = false;
	}

	/**
	 * Initializes and registers the PWA Service Worker via `virtual:pwa-register`
	 * to enable offline capabilities and background cache updates.
	 *
	 * @returns {Promise<void>} Resolves once registration has been initiated.
	 */
	async function initServiceWorker(): Promise<void> {
		if (
			!shouldRegisterServiceWorker(
				import.meta.env.DEV,
				import.meta.env.VITE_SIGNALLAB_DEV_PWA,
			)
		)
			return;
		if (typeof window !== "undefined" && "serviceWorker" in navigator) {
			const { registerSW } = await import("virtual:pwa-register");
			updateServiceWorker = registerSW({
				immediate: true,
				/**
				 * Callback fired when a new Service Worker version is installed and waiting.
				 */
				onNeedRefresh() {
					toastMode = "update";
					showToast = true;
				},
				/**
				 * Callback fired when content is cached and ready for offline use.
				 */
				onOfflineReady() {
					toastMode = "offline";
					showToast = true;
				},
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
<UpdateToast
	show={showToast}
	mode={toastMode}
	onUpdate={handleUpdateSW}
	onDismiss={handleDismissToast}
/>
