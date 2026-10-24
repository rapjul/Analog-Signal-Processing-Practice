/** Explicit development opt-in prevents cached app shells from crossing worktrees. */

/**
 * Decides whether this application should register its service worker.
 * @param development - Whether Vite is serving development modules.
 * @param optIn - Explicit VITE_SIGNALLAB_DEV_PWA environment setting.
 * @returns Production registration, or development registration only with opt-in.
 */
export function shouldRegisterServiceWorker(
	development: boolean,
	optIn: string | undefined,
): boolean {
	return !development || optIn === "1";
}
