/** Bounded syntax diagnostics whose ranges always refer to the learner's input. */
import { parse } from "@cortex-js/compute-engine/latex-syntax";

/** An actionable source range in the original, unnormalized answer. */
export interface TransformDiagnostic {
	/** Accessible description of the issue. */ message: string;
	/** Zero-based UTF-16 start offset. */ start: number;
	/** Exclusive UTF-16 end offset; equal to start for a missing token. */ end: number;
}

/**
 * Finds independent delimiter problems without rewriting or repairing the answer.
 * @param source - Original bounded input.
 * @returns Reliable source diagnostics, capped to avoid an overwhelming error list.
 */
export function transformSyntaxDiagnostics(
	source: string,
): TransformDiagnostic[] {
	if (source.length > 16384) return [];
	const diagnostics: TransformDiagnostic[] = [];
	const stack: { token: string; start: number }[] = [];
	const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
	for (const match of source.matchAll(/\\[a-zA-Z]+|\\[\s\S]|[\s\S]/g)) {
		const token = match[0],
			start = match.index;
		if (pairs[token]) {
			if (stack.length >= 64) return [];
			stack.push({ token, start });
		} else if (")]}".includes(token)) {
			const open = stack.at(-1);
			if (open && pairs[open.token] === token) stack.pop();
			else
				diagnostics.push({
					start,
					end: start + 1,
					message: `Unexpected '${token}'. Check the matching opening bracket.`,
				});
		}
	}
	for (const open of stack)
		diagnostics.push({
			start: open.start,
			end: open.start + 1,
			message: `This '${open.token}' needs a closing '${pairs[open.token]}'.`,
		});
	for (const match of source.matchAll(/\^\s*([({])\s*([)}])/g)) {
		if (
			(match[1] === "(" && match[2] === ")") ||
			(match[1] === "{" && match[2] === "}")
		)
			diagnostics.push({
				start: match.index,
				end: match.index + match[0].length,
				message: "Enter an exponent inside this group.",
			});
	}
	return diagnostics
		.sort(
			/** @param a - First issue. @param b - Second issue. @returns Source order. */ (
				a,
				b,
			) => a.start - b.start,
		)
		.slice(0, 8);
}

/**
 * Adds parser errors only when token serialization preserves original offsets.
 * @param source - Original answer, never normalized before locating errors.
 * @returns Original-source syntax errors, or no guessed range when mapping is uncertain.
 */
export function diagnoseTransformSyntax(source: string): TransformDiagnostic[] {
	const direct = transformSyntaxDiagnostics(source);
	if (
		direct.length ||
		source.length > 16384 ||
		(source.match(/[([{]/g)?.length ?? 0) > 64 ||
		/[^\x20-\x7e\n\r\t]|\\(?:left|right|quad|qquad)\b|%/.test(source)
	)
		return direct;
	const diagnostics: TransformDiagnostic[] = [];
	// The parser serializes whitespace runs as one token. Keep a source map so
	// leading spaces and internal whitespace never move the selected error range.
	let serialized = "";
	const starts: number[] = [],
		ends: number[] = [];
	for (const match of source.matchAll(/\\[a-zA-Z]+|\\[\s\S]|\s+|[\s\S]/g)) {
		const token = /^\s+$/.test(match[0]) ? " " : match[0];
		serialized += token;
		for (let index = 0; index < token.length; index++) {
			starts.push(match.index + index);
			ends.push(
				/^\s+$/.test(match[0])
					? match.index + match[0].length
					: match.index + index + 1,
			);
		}
	}
	/** @param node - Raw parser node. Collects only documented parser source offsets. */
	function visit(node: unknown): void {
		if (Array.isArray(node)) {
			node.forEach(visit);
			return;
		}
		if (!node || typeof node !== "object") return;
		const value = node as {
			fn?: unknown[];
			sourceOffsets?: [number, number];
		};
		if (value.fn?.[0] === "Error" && value.sourceOffsets) {
			const [start, end] = value.sourceOffsets;
			const fragment = value.fn[2] as
				[string, { str?: string }] | undefined;
			const spelling =
				fragment?.[0] === "LatexString" ? fragment[1]?.str : undefined;
			if (
				start >= 0 &&
				end >= start &&
				end <= serialized.length &&
				(start === end || spelling === serialized.slice(start, end))
			)
				diagnostics.push({
					start: starts[start] ?? source.length,
					end:
						end > start
							? ends[end - 1]!
							: (starts[start] ?? source.length),
					message:
						"Check the syntax here: an operand or closing token is missing or unexpected.",
				});
		}
		Object.values(node).forEach(visit);
	}
	try {
		visit(parse(serialized));
	} catch {
		return [];
	}
	return diagnostics.slice(0, 8);
}
