import { expect, it } from "vitest";
import { solverVisualFileName } from "$lib/testing/solver-visual-files";

/** Existing short baseline names must remain byte-for-byte compatible. */
it("preserves existing readable baseline filenames", () => {
	expect(
		solverVisualFileName("Step 2A.Hints", "dark", "desktop-1280x800"),
	).toBe("step-2a.hints__dark__desktop-1280x800.png");
});

/** Long branch identities need deterministic distinct names and room for diagnostic suffixes. */
it("bounds long names without losing branch identity", () => {
	const prefix = "ode-branch.".repeat(30);
	const first = solverVisualFileName(
		`${prefix}first`,
		"dark",
		"mobile-narrow-320x568",
	);
	const second = solverVisualFileName(
		`${prefix}second`,
		"dark",
		"mobile-narrow-320x568",
	);
	expect(first).toHaveLength(220);
	expect(first.replace(/\.png$/, "-expected.png").length).toBeLessThan(255);
	expect(first).not.toBe(second);
	expect(first).toBe(
		solverVisualFileName(`${prefix}first`, "dark", "mobile-narrow-320x568"),
	);
	expect(first).toMatch(/__dark__mobile-narrow-320x568\.png$/);
});
