import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import {
	findEscapedLatexViolations,
	lintPaths,
} from "../../scripts/lint-escaped-latex.mjs";

const backslash = String.fromCharCode(92);
const escapedBackslash = backslash + backslash;
const tick = String.fromCharCode(96);

/**
 * Detects escaped LaTeX commands in quoted strings and interpolated templates.
 */
it("detects escaped commands in quoted strings and untagged templates", function detectsEscapedStrings() {
	const templateSource = [
		"const interpolated = ",
		tick,
		escapedBackslash + "text{",
		"${label}",
		"}",
		tick,
		";",
	].join("");
	const source = [
		'const quoted = "' + escapedBackslash + "frac{x}{y}" + '";',
		templateSource,
		"",
	].join("\n");
	const violations = findEscapedLatexViolations(source, "fixture.ts");

	expect(violations).toHaveLength(2);
	expect(violations[0]?.line).toBe(1);
	expect(violations[0]?.command).toBe(backslash + "frac");
	expect(violations[1]?.line).toBe(2);
	expect(violations[1]?.command).toBe(backslash + "text");
});

/**
 * Detects escaped LaTeX in Svelte script and markup expressions.
 */
it("detects escaped commands in Svelte expressions", function detectsSvelteExpressions() {
	const source = [
		'<script lang="ts">const formula = "' +
			escapedBackslash +
			'frac{x}{y}";</script>',
		'<MathText text={"' + escapedBackslash + 'text{example}"} />',
	].join("\n");
	const violations = findEscapedLatexViolations(source, "fixture.svelte");

	expect(violations).toHaveLength(2);
	expect(violations[0]?.line).toBe(1);
	expect(violations[0]?.command).toBe(backslash + "frac");
	expect(violations[1]?.line).toBe(2);
	expect(violations[1]?.command).toBe(backslash + "text");
});

/**
 * Ignores raw templates, comments, regular expressions, ordinary escapes, and paths.
 */
it("ignores String.raw templates and non-LaTeX JavaScript strings", function ignoresSafeStrings() {
	const rawTemplate = [
		"const formula = String.raw",
		tick,
		escapedBackslash + "frac{",
		"${label}",
		"}",
		tick,
		";",
	].join("");
	const rawInterpolation = [
		"const formula = String.raw",
		tick,
		escapedBackslash + "frac{",
		"${",
		'"' + escapedBackslash + "text{x}" + '"',
		"}",
		"}",
		tick,
		";",
	].join("");
	const source = [
		"// " + escapedBackslash + "frac appears only in this comment.",
		"const regex = /" + escapedBackslash + "frac/;",
		'const newline = "' + backslash + 'n";',
		'const path = "C:' + escapedBackslash + 'Users\\\\student";',
		rawTemplate,
		rawInterpolation,
	].join("\n");

	expect(findEscapedLatexViolations(source, "fixture.ts")).toEqual([
		{
			line: 6,
			command: backslash + "text",
			offset: expect.any(Number),
		},
	]);
	expect(
		findEscapedLatexViolations(
			"<MathText text={String.raw" +
				tick +
				escapedBackslash +
				"frac{x}{y}" +
				tick +
				"} />",
			"fixture.svelte",
		),
	).toEqual([]);
});

/**
 * Scans explicit staged paths and the default source, test, and script directories.
 */
it("supports explicit paths and default directory scans", async function scansRequestedPaths() {
	const projectRoot = await mkdtemp(
		path.join(tmpdir(), "escaped-latex-lint-"),
	);

	try {
		await Promise.all([
			mkdir(path.join(projectRoot, "src"), { recursive: true }),
			mkdir(path.join(projectRoot, "tests"), { recursive: true }),
			mkdir(path.join(projectRoot, "scripts"), { recursive: true }),
		]);
		await Promise.all([
			writeFile(
				path.join(projectRoot, "src", "app.ts"),
				'const formula = "' + escapedBackslash + "omega" + '";',
			),
			writeFile(
				path.join(projectRoot, "tests", "fixture.ts"),
				"const value = 1;",
			),
			writeFile(
				path.join(projectRoot, "scripts", "tool.mjs"),
				"const value = 2;",
			),
			writeFile(
				path.join(projectRoot, "src", "notes.txt"),
				escapedBackslash + "frac",
			),
		]);

		const staged = await lintPaths(
			[path.join(projectRoot, "src", "app.ts")],
			projectRoot,
		);
		expect(staged.files).toEqual(["src/app.ts"]);
		expect(staged.violations).toEqual([
			{
				file: "src/app.ts",
				line: 1,
				command: backslash + "omega",
			},
		]);

		const fullScan = await lintPaths([], projectRoot);
		expect(fullScan.files).toEqual([
			"scripts/tool.mjs",
			"src/app.ts",
			"tests/fixture.ts",
		]);
		expect(fullScan.violations).toEqual(staged.violations);
	} finally {
		await rm(projectRoot, { recursive: true, force: true });
	}
});
