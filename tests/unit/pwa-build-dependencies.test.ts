import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileList } from "filelist";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getManifest } from "workbox-build";

/** Verifies the overridden build dependencies through their consumers. */
describe("PWA build dependency compatibility", () => {
	let directory: string;

	/** Creates nested assets for manifest and file matching. */
	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), "signallab-pwa-"));
		await mkdir(join(directory, "nested"));
		await Promise.all(
			[
				"app.js",
				"nested/style.css",
				"nested/ignored.js",
				"notes.txt",
			].map(
				/**
				 * Writes an asset at its relative fixture path.
				 * @param path - Relative fixture path.
				 */
				(path) => writeFile(join(directory, path), `content: ${path}`),
			),
		);
	});

	/** Removes the isolated fixture after each test. */
	afterEach(async () => {
		if (directory) await rm(directory, { recursive: true, force: true });
	});

	/** Workbox must include matching assets and honor exclusions. */
	it("generates the expected precache manifest", async () => {
		const result = await getManifest({
			globDirectory: directory,
			globPatterns: ["**/*.{js,css}"],
			globIgnores: ["**/ignored.js"],
		});
		expect(result.warnings).toEqual([]);
		expect(
			result.manifestEntries
				.map(
					/**
					 * Selects the asset URL.
					 * @param entry - Workbox precache entry.
					 */
					(entry) => entry.url,
				)
				.sort(),
		).toEqual(["app.js", "nested/style.css"]);
		for (const entry of result.manifestEntries) {
			expect(entry.revision).toMatch(/^[a-f0-9]{32}$/);
		}
	});

	/** FileList normalizes patterns with Windows separators before matching. */
	it.skipIf(process.platform === "win32")(
		"matches and excludes nested files with FileList",
		() => {
			const files = new FileList();
			files.include(join(directory, "**", "*.js"));
			files.exclude(join(directory, "**", "ignored.js"));
			expect(files.toArray()).toEqual([join(directory, "app.js")]);
		},
	);
});
