/** Transform-specific presentation normalization; decimal values remain unchanged. */
import { CanonicalError } from "$lib/math-engine/canonical-algebra";
import { transformSyntaxDiagnostics } from "./transform-diagnostics";

/** Opening group retained until the matching ordinary or sized closing token. */
interface Group {
	/** Required closing delimiter. */ closing: string;
	/** Whether this group began with a sized command. */ sized: boolean;
	/** Whether square brackets specify a root index. */ root: boolean;
}

/** @returns A malformed-group diagnostic before parsing can discard commands. */
function delimiterError(): CanonicalError {
	return new CanonicalError(
		"invalid",
		"Check matching brackets and paired left/right delimiters.",
	);
}

/**
 * @param token - Opening or closing delimiter.
 * @param closing - Whether this token closes a group.
 * @param sized - Whether a left/right command introduced it.
 * @param root - Whether an opening square bracket is a root index.
 * @param stack - Pending groups, bounded before parsing.
 * @returns Equivalent grouping while preserving root indices and absolute values.
 */
function groupToken(
	token: string,
	closing: boolean,
	sized: boolean,
	root: boolean,
	stack: Group[],
): string {
	if (closing) {
		const open = stack.pop();
		if (!open || open.closing !== token || open.sized !== sized)
			throw delimiterError();
		return token === "]" && !open.root ? ")" : token;
	}
	if (stack.length >= 64)
		throw new CanonicalError(
			"unsupported",
			"This expression exceeds the supported grouping depth. Use the standard transform form.",
		);
	const pairs: Record<string, string> = {
		"(": ")",
		"[": "]",
		"{": "}",
		"|": "|",
	};
	stack.push({ closing: pairs[token]!, sized, root });
	return token === "[" && !root ? "(" : token;
}

/**
 * @param tokens - Command-aware lexical tokens.
 * @param start - Position immediately following a sized command.
 * @returns Delimiter position, refusing unsupported or absent sized delimiters.
 */
function sizedDelimiter(tokens: string[], start: number): number {
	let index = start;
	while (tokens[index] !== undefined && /^\s$/.test(tokens[index]!)) index++;
	if (!tokens[index] || !"()[]|".includes(tokens[index]!))
		throw delimiterError();
	return index;
}

/**
 * @param source - Whitespace-normalized LaTeX.
 * @returns Balanced grouping with only complete sizing command tokens removed.
 */
function normalizeGroups(source: string): string {
	const tokens = source.match(/\\[a-zA-Z]+|\\[\s\S]|[\s\S]/g) ?? [];
	const stack: Group[] = [];
	const output: string[] = [];
	let previous = "";
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index]!;
		if (token === "\\left" || token === "\\right") {
			index = sizedDelimiter(tokens, index + 1);
			output.push(
				groupToken(
					tokens[index]!,
					token === "\\right",
					true,
					false,
					stack,
				),
			);
		} else if ("([{)]}".includes(token)) {
			output.push(
				groupToken(
					token,
					")]}".includes(token),
					false,
					token === "[" && previous === "\\sqrt",
					stack,
				),
			);
		} else output.push(token);
		if (!/^\s$/.test(token)) previous = token;
	}
	if (stack.length) throw delimiterError();
	return output.join("");
}

/**
 * Converts complete parenthesized exponents without changing nested grouping.
 * @param source - Balanced normalized grouping.
 * @returns Equivalent LaTeX powers with braced exponents.
 */
function normalizePowers(source: string): string {
	const output = source.split("");
	const stack: number[] = [];
	for (let index = 0; index < source.length; index++) {
		if (source[index] === "(") stack.push(index);
		if (source[index] !== ")") continue;
		const start = stack.pop();
		if (start === undefined) continue;
		let before = start - 1;
		while (before >= 0 && /\s/.test(source[before]!)) before--;
		if (source[before] === "^") {
			output[start] = "{";
			output[index] = "}";
		}
	}
	return output.join("");
}

/**
 * @param answer - Bounded student input.
 * @param variable - Expected independent symbol.
 * @returns Parser-ready expression, preserving exact mathematical values.
 */
export function normalizeTransformNotation(
	answer: string,
	variable: "t" | "omega",
): string {
	const emptyPower = transformSyntaxDiagnostics(answer).find(
		/** @param diagnostic - Source issue. @returns Whether an exponent is empty. */
		(diagnostic) =>
			diagnostic.message === "Enter an exponent inside this group.",
	);
	if (emptyPower) throw new CanonicalError("invalid", emptyPower.message);
	const prefix =
		variable === "t"
			? /^x\s*\(\s*t\s*\)\s*=\s*/
			: /^X\s*\(\s*(?:[ij]\s*)?(?:\\omega|omega|w)\s*\)\s*=\s*/;
	const spaced = answer.trim().replace(/\\(?:[,;:!]| |quad\b|qquad\b)/g, " ");
	const expression = normalizePowers(normalizeGroups(spaced)).replace(
		prefix,
		"",
	);
	if (/\^\s*\{\s*\}/.test(expression))
		throw new CanonicalError(
			"invalid",
			"Enter an exponent inside this group.",
		);
	if (expression.includes("="))
		throw new CanonicalError(
			"invalid",
			"Enter one expression or use the problem's supported equation prefix.",
		);
	return expression
		.replace(/π/g, "\\pi ")
		.replace(/\\delta\b/g, "\\operatorname{DiracDelta}")
		.replace(/(^|[^a-zA-Z\\])sinc(?=\s*\()/g, "$1\\operatorname{sinc}")
		.replace(/(^|[^a-zA-Z\\])([ij])(?:omega|w)\b/g, "$1$2\\omega")
		.replace(/(^|[^a-zA-Z\\])omega\b/g, "$1\\omega")
		.replace(/(^|[^a-zA-Z\\])w\b/g, "$1\\omega")
		.trim();
}
