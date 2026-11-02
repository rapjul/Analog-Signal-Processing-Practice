#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { parse as parseSvelte } from "svelte/compiler";
import * as ts from "typescript";

/**
 * @typedef {object} EscapedLatexViolation
 * @property {number} line Source line containing the escaped LaTeX command.
 * @property {string} command LaTeX command that uses JavaScript escaping.
 * @property {number} offset Source offset of the command.
 */

/**
 * @typedef {object} FileViolation
 * @property {string} file Path relative to the project root.
 * @property {number} line Source line containing the escaped LaTeX command.
 * @property {string} command LaTeX command that uses JavaScript escaping.
 */

const DEFAULT_TARGETS = ["src", "tests", "scripts"];
const SUPPORTED_EXTENSIONS = new Set([
	".cjs",
	".cts",
	".js",
	".jsx",
	".mjs",
	".mts",
	".svelte",
	".ts",
	".tsx",
]);
const LATEX_COMMANDS = new Set([
	"alpha",
	"angle",
	"approx",
	"arg",
	"begin",
	"cdot",
	"circ",
	"cos",
	"deg",
	"delta",
	"Delta",
	"dfrac",
	"displaystyle",
	"dots",
	"end",
	"equiv",
	"eta",
	"exp",
	"F",
	"frac",
	"ge",
	"iff",
	"implies",
	"in",
	"infty",
	"int",
	"j",
	"le",
	"left",
	"leftrightarrow",
	"lim",
	"ln",
	"log",
	"longleftrightarrow",
	"Longrightarrow",
	"mathbb",
	"mathcal",
	"mathrm",
	"max",
	"min",
	"mp",
	"mu",
	"ne",
	"neq",
	"omega",
	"Omega",
	"operatorname",
	"phi",
	"pi",
	"pm",
	"pmod",
	"qquad",
	"quad",
	"Re",
	"right",
	"rm",
	"sigma",
	"sin",
	"sqrt",
	"square",
	"sum",
	"tan",
	"tau",
	"text",
	"textasciicircum",
	"texttt",
	"tfrac",
	"theta",
	"tilde",
	"times",
	"to",
	"X",
]);
const ESCAPED_CONTROL_SEQUENCE = /(?:\\\\)+([A-Za-z]+)/g;

/**
 * Finds escaped LaTeX commands in JavaScript, TypeScript, or Svelte source.
 *
 * @param {string} source Source contents to inspect.
 * @param {string} filePath File path used to select the parser.
 * @returns {EscapedLatexViolation[]} Escaped LaTeX commands found in the source.
 */
export function findEscapedLatexViolations(source, filePath) {
	/** @type {EscapedLatexViolation[]} */
	const violations = [];

	if (path.extname(filePath) === ".svelte") {
		scanSvelteSource(source, filePath, violations);
	} else {
		scanTypeScriptSource(source, filePath, violations);
	}

	return violations;
}

/**
 * Scans JavaScript or TypeScript AST string and template nodes.
 *
 * @param {string} source Source contents to inspect.
 * @param {string} filePath File path supplied to the TypeScript parser.
 * @param {EscapedLatexViolation[]} violations Mutable output collection.
 * @returns {void}
 */
function scanTypeScriptSource(source, filePath, violations) {
	const extension = path.extname(filePath);
	const scriptKind =
		extension === ".tsx"
			? ts.ScriptKind.TSX
			: extension === ".jsx"
				? ts.ScriptKind.JSX
				: extension === ".js" ||
					  extension === ".mjs" ||
					  extension === ".cjs"
					? ts.ScriptKind.JS
					: ts.ScriptKind.TS;
	const sourceFile = ts.createSourceFile(
		filePath,
		source,
		ts.ScriptTarget.Latest,
		true,
		scriptKind,
	);

	/**
	 * Visits a TypeScript AST node and checks its string-bearing children.
	 *
	 * @param {ts.Node} node AST node to inspect.
	 * @returns {void}
	 */
	function visit(node) {
		if (ts.isStringLiteral(node)) {
			scanRawText(
				node.getText(sourceFile),
				node.getStart(sourceFile),
				source,
				violations,
			);
			return;
		}

		if (ts.isRegularExpressionLiteral(node)) return;

		if (ts.isNoSubstitutionTemplateLiteral(node)) {
			if (!isRawTaggedTemplate(node.parent, node)) {
				scanRawText(
					node.getText(sourceFile),
					node.getStart(sourceFile),
					source,
					violations,
				);
			}
			return;
		}

		if (ts.isTemplateExpression(node)) {
			if (!isRawTaggedTemplate(node.parent, node)) {
				scanRawText(
					node.head.getText(sourceFile),
					node.head.getStart(sourceFile),
					source,
					violations,
				);
				for (const span of node.templateSpans) {
					scanRawText(
						span.literal.getText(sourceFile),
						span.literal.getStart(sourceFile),
						source,
						violations,
					);
					visit(span.expression);
				}
			} else {
				for (const span of node.templateSpans) visit(span.expression);
			}
			return;
		}

		if (
			ts.isTaggedTemplateExpression(node) &&
			isTypeScriptStringRawTag(node.tag)
		) {
			if (ts.isTemplateExpression(node.template)) {
				for (const span of node.template.templateSpans) {
					visit(span.expression);
				}
			}
			return;
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
}

/**
 * Scans Svelte script and markup-expression AST nodes.
 *
 * @param {string} source Svelte component contents.
 * @param {string} filePath File path supplied to the Svelte parser.
 * @param {EscapedLatexViolation[]} violations Mutable output collection.
 * @returns {void}
 */
function scanSvelteSource(source, filePath, violations) {
	const root = parseSvelte(source, { filename: filePath, modern: true });
	/** @type {WeakSet<object>} */
	const visited = new WeakSet();

	/**
	 * Visits Svelte and embedded JavaScript AST nodes without scanning comments or CSS.
	 *
	 * @param {unknown} value AST value to inspect.
	 * @param {Record<string, any> | null} parent Parent AST node when available.
	 * @returns {void}
	 */
	function visit(value, parent = null) {
		if (!value || typeof value !== "object") return;
		if (visited.has(value)) return;
		visited.add(value);

		if (Array.isArray(value)) {
			for (const child of value) visit(child, parent);
			return;
		}

		const node = /** @type {Record<string, any>} */ (value);

		if (node.type === "Literal") {
			if (typeof node.raw === "string" && !node.regex) {
				scanRawText(node.raw, node.start, source, violations);
			}
			return;
		}

		if (node.type === "TemplateLiteral") {
			const isRaw =
				parent?.type === "TaggedTemplateExpression" &&
				isSvelteStringRawTag(parent.tag);

			if (!isRaw) {
				for (const quasi of node.quasis ?? []) {
					scanRawText(
						quasi.value?.raw ?? "",
						quasi.start ?? node.start,
						source,
						violations,
					);
				}
			}

			for (const expression of node.expressions ?? []) {
				visit(expression, node);
			}
			return;
		}

		if (node.type === "TaggedTemplateExpression") {
			visit(node.tag, node);
			if (isSvelteStringRawTag(node.tag)) {
				for (const expression of node.quasi?.expressions ?? []) {
					visit(expression, node.quasi);
				}
			} else {
				visit(node.quasi, node);
			}
			return;
		}

		for (const [key, child] of Object.entries(node)) {
			if (key !== "loc" && key !== "parent") visit(child, node);
		}
	}

	visit(root.instance?.content ?? null);
	visit(root.module?.content ?? null);
	visit(root.fragment);
}

/**
 * Adds matches from one raw source fragment to the diagnostics collection.
 *
 * @param {string} rawText Source fragment including its original escapes.
 * @param {number} baseOffset Source offset where the fragment begins.
 * @param {string} source Full file contents for line calculation.
 * @param {EscapedLatexViolation[]} violations Mutable output collection.
 * @returns {void}
 */
function scanRawText(rawText, baseOffset, source, violations) {
	ESCAPED_CONTROL_SEQUENCE.lastIndex = 0;
	let match;

	while ((match = ESCAPED_CONTROL_SEQUENCE.exec(rawText)) !== null) {
		const command = match[1];
		if (command === undefined || !LATEX_COMMANDS.has(command)) continue;

		const offset = baseOffset + match.index;
		violations.push({
			line: lineAt(source, offset),
			command: String.fromCharCode(92) + command,
			offset,
		});
	}
}

/**
 * Calculates a one-based line number for a source offset.
 *
 * @param {string} source Full file contents.
 * @param {number} offset Source offset.
 * @returns {number} One-based line number.
 */
function lineAt(source, offset) {
	let line = 1;
	for (let index = 0; index < offset; index += 1) {
		if (source[index] === "\n") line += 1;
	}
	return line;
}

/**
 * Checks whether a TypeScript template is tagged with the built-in String.raw.
 *
 * @param {ts.Node} parent Parent AST node.
 * @param {ts.Node} template Template AST node.
 * @returns {boolean} Whether String.raw owns the template.
 */
function isRawTaggedTemplate(parent, template) {
	return (
		ts.isTaggedTemplateExpression(parent) &&
		parent.template === template &&
		isTypeScriptStringRawTag(parent.tag)
	);
}

/**
 * Checks whether a TypeScript tag expression is String.raw.
 *
 * @param {ts.Expression} tag Tag expression.
 * @returns {boolean} Whether the tag is String.raw.
 */
function isTypeScriptStringRawTag(tag) {
	return (
		ts.isPropertyAccessExpression(tag) &&
		tag.name.text === "raw" &&
		ts.isIdentifier(tag.expression) &&
		tag.expression.text === "String"
	);
}

/**
 * Checks whether a Svelte ESTree tag expression is String.raw.
 *
 * @param {Record<string, any> | null | undefined} tag Tag expression.
 * @returns {boolean} Whether the tag is String.raw.
 */
function isSvelteStringRawTag(tag) {
	return (
		tag?.type === "MemberExpression" &&
		tag.computed === false &&
		tag.object?.type === "Identifier" &&
		tag.object.name === "String" &&
		tag.property?.type === "Identifier" &&
		tag.property.name === "raw"
	);
}

/**
 * Collects supported source files from supplied paths or the default project trees.
 *
 * @param {string[]} targets File or directory paths, possibly empty.
 * @param {string} projectRoot Absolute project root.
 * @returns {Promise<string[]>} Sorted absolute source paths.
 */
export async function collectSourceFiles(targets, projectRoot = process.cwd()) {
	const files = new Set();
	const paths = targets.length > 0 ? targets : DEFAULT_TARGETS;

	/**
	 * Sorts directory entries by name for stable file discovery.
	 *
	 * @param {import("node:fs").Dirent} left First directory entry.
	 * @param {import("node:fs").Dirent} right Second directory entry.
	 * @returns {number} Locale comparison result.
	 */
	function compareDirectoryEntries(left, right) {
		return left.name.localeCompare(right.name);
	}

	/**
	 * Adds source files beneath a file or directory path.
	 *
	 * @param {string} targetPath Absolute or project-relative path.
	 * @returns {Promise<void>}
	 */
	async function collect(targetPath) {
		const absolutePath = path.resolve(projectRoot, targetPath);
		let details;

		try {
			details = await stat(absolutePath);
		} catch (error) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === "ENOENT"
			) {
				return;
			}
			throw error;
		}

		if (details.isDirectory()) {
			const entries = await readdir(absolutePath, {
				withFileTypes: true,
			});
			entries.sort(compareDirectoryEntries);
			for (const entry of entries) {
				if (entry.isDirectory()) {
					await collect(path.join(absolutePath, entry.name));
				} else if (
					entry.isFile() &&
					SUPPORTED_EXTENSIONS.has(path.extname(entry.name))
				) {
					files.add(path.join(absolutePath, entry.name));
				}
			}
			return;
		}

		if (
			details.isFile() &&
			SUPPORTED_EXTENSIONS.has(path.extname(absolutePath))
		) {
			files.add(absolutePath);
		}
	}

	for (const targetPath of paths) await collect(targetPath);
	return [...files].sort();
}

/**
 * Lints file paths and returns paths and violations relative to the project root.
 *
 * @param {string[]} targets File or directory paths, possibly empty.
 * @param {string} projectRoot Absolute project root.
 * @returns {Promise<{files: string[], violations: FileViolation[]}>} Scan results.
 */
export async function lintPaths(targets, projectRoot = process.cwd()) {
	const files = await collectSourceFiles(targets, projectRoot);
	/** @type {FileViolation[]} */
	const violations = [];
	const relativeFiles = [];

	for (const filePath of files) {
		const source = await readFile(filePath, "utf8");
		const relativeFile = path
			.relative(projectRoot, filePath)
			.split(path.sep)
			.join("/");
		relativeFiles.push(relativeFile);

		for (const violation of findEscapedLatexViolations(source, filePath)) {
			violations.push({
				file: relativeFile,
				line: violation.line,
				command: violation.command,
			});
		}
	}

	return { files: relativeFiles, violations };
}

/**
 * Runs the command-line check and prints actionable diagnostics.
 *
 * @param {string[]} targets File paths supplied on the command line.
 * @returns {Promise<number>} Process exit code.
 */
export async function main(targets = process.argv.slice(2)) {
	try {
		const { files, violations } = await lintPaths(targets);
		for (const violation of violations) {
			console.error(
				violation.file +
					":" +
					violation.line +
					": " +
					violation.command +
					" is escaped in a JavaScript string; use String.raw for LaTeX.",
			);
		}
		if (violations.length > 0) return 1;

		console.log(
			"Escaped LaTeX check passed (" + files.length + " source files).",
		);
		return 0;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("Escaped LaTeX check failed: " + message);
		return 2;
	}
}

const invokedPath = process.argv[1]
	? pathToFileURL(path.resolve(process.argv[1])).href
	: null;
if (import.meta.url === invokedPath) process.exitCode = await main();
