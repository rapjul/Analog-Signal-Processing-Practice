/** Lints the explicit verification documents with the repository's Markdown rules. */
import { readFile } from "node:fs/promises";
import { lint } from "markdownlint/promise";

/** Repository-owned configuration; no glob or additional configuration parsers are needed. */
const config = JSON.parse(
	await readFile(new URL("../.markdownlint.json", import.meta.url), "utf8"),
);
/** Explicit inputs keep local and CI documentation checks identical. */
const files = [
	"docs/transform-answer-verification.md",
	"docs/future-improvements.md",
	"docs/adrs/0036-verify-transform-answers-with-bounded-canonical-forms.md",
];
const results = await lint({ config, files });
let failures = 0;
for (const [file, errors] of Object.entries(results)) {
	for (const error of errors) {
		console.error(
			`${file}:${error.lineNumber} ${error.ruleNames[0]} ${error.ruleDescription}`,
		);
		failures++;
	}
}
if (failures) process.exitCode = 1;
else console.log(`Verified ${files.length} Markdown documents.`);
