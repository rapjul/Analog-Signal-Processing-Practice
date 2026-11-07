/**
 * Makes display mathematics keyboard-scrollable only while it overflows.
 * @param node Component root containing rendered display equations.
 * @returns Cleanup for DOM, layout, and font observers.
 */
export function overflowMath(node: HTMLElement): { destroy: () => void } {
	let displays: HTMLElement[] = [];
	/** Updates Tab stops after layout, visibility, or font changes. */
	function measure(): void {
		for (const display of displays) {
			if (
				display.clientWidth > 0 &&
				display.scrollWidth > display.clientWidth + 1
			)
				display.tabIndex = 0;
			else display.removeAttribute("tabindex");
		}
	}
	const resize =
		typeof ResizeObserver === "undefined"
			? undefined
			: new ResizeObserver(measure);
	/** Reconnects layout observation when rendered mathematics changes. */
	function refresh(): void {
		resize?.disconnect();
		displays = Array.from(
			node.querySelectorAll<HTMLElement>(".katex-display"),
		);
		resize?.observe(node);
		for (const display of displays) resize?.observe(display);
		measure();
	}
	const mutations = new MutationObserver(refresh);
	mutations.observe(node, {
		childList: true,
		subtree: true,
		characterData: true,
	});
	document.fonts?.addEventListener("loadingdone", measure);
	window.addEventListener("resize", measure);
	refresh();
	return {
		/** Releases DOM and font listeners when the component is removed. */
		destroy(): void {
			resize?.disconnect();
			mutations.disconnect();
			document.fonts?.removeEventListener("loadingdone", measure);
			window.removeEventListener("resize", measure);
		},
	};
}
