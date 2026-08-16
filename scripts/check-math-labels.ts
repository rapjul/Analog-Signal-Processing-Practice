import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Scans directories recursively to find files matching a suffix.
 *
 * @param dir - Directory path to search.
 * @param suffix - File suffix to match.
 * @returns Array of absolute file paths matching the suffix.
 */
function findFiles(dir: string, suffix: string): string[] {
	let files: string[] = [];
	const entries = readdirSync(dir);
	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			files = files.concat(findFiles(fullPath, suffix));
		} else if (entry.endsWith(suffix)) {
			files.push(fullPath);
		}
	}
	return files;
}

/**
 * Validates Svelte files to ensure that every <MathFormula> component
 * specifies a non-empty `label` attribute.
 */
function checkMathLabels(): void {
	const srcDir = join(process.cwd(), "src");
	const svelteFiles = findFiles(srcDir, ".svelte");
	let failureCount = 0;

	// A simple regex to look for <MathFormula tags. Since Svelte files can have multi-line tags,
	// we'll extract matched blocks or analyze the file line-by-line / text blocks.
	// A robust way is to find '<MathFormula' and match up to the closing '>' (or '/>'),
	// then inspect if 'label=' or 'label={' is present within the tag context.
	const mathFormulaRegex = /<MathFormula\b([\s\S]*?)\/?>/g;

	for (const file of svelteFiles) {
		const content = readFileSync(file, "utf8");
		let match: RegExpExecArray | null;

		// Reset regex index
		mathFormulaRegex.lastIndex = 0;

		// biome-ignore lint/suspicious/noAssignInExpressions: Standard regex iteration pattern.
		while ((match = mathFormulaRegex.exec(content)) !== null) {
			const tagAttributes = match[1];
			// Check if label attribute exists inside the tag attributes
			const hasLabel =
				/\blabel\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\})/i.test(
					tagAttributes,
				);

			if (!hasLabel) {
				// Find line number of the match
				const offset = match.index;
				const linesUpToMatch = content.slice(0, offset).split("\n");
				const lineNumber = linesUpToMatch.length;

				console.error(
					`\x1b[31mError:\x1b[0m <MathFormula> is missing a 'label' attribute in ${file}:${lineNumber}`,
				);
				failureCount++;
			}
		}
	}

	if (failureCount > 0) {
		console.error(`\nFound ${failureCount} missing label(s).`);
		process.exit(1);
	} else {
		console.log(
			"\x1b[32mSuccess:\x1b[0m All <MathFormula> components have a 'label' attribute.",
		);
	}
}

checkMathLabels();
