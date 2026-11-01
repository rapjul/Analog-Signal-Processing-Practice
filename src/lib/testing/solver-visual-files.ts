import { createHash } from "node:crypto";

/** @param stateId - Stable catalog identity. @param theme - Controlled capture theme. @param viewport - Controlled viewport name. @returns A readable baseline/artifact filename with room for Playwright's diagnostic suffixes. */
export function solverVisualFileName(
	stateId: string,
	theme: string,
	viewport: string,
): string {
	const state = stateId
		.toLowerCase()
		.replace(/[^a-z0-9.-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	const suffix = `__${theme}__${viewport}.png`;
	const name = `${state}${suffix}`;
	if (name.length <= 220) return name;
	const hash = createHash("sha256")
		.update(stateId)
		.digest("hex")
		.slice(0, 16);
	return `${state.slice(0, 220 - suffix.length - hash.length - 1)}-${hash}${suffix}`;
}
