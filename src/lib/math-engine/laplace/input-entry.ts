import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { fraction } from "./algebra";
import { fractionLatex } from "./pfd";
import type { LaplaceEntry } from "./types";

/** Explicit learner selection; the math engine's degree sentinel never enters the control. */
export const ZERO_POLYNOMIAL = "zero-polynomial";

/** @param value - Exact internal rational. @returns Plain notation accepted by literal controls. */
export function rationalLiteral(value: string): string {
	const q = fractionLatex(value);
	return q.denominator === 1n
		? String(q.numerator)
		: `${q.numerator}/${q.denominator}`;
}

/** @param entry - Semantic domain. @returns Human-readable input instructions. */
export function entryInstruction(entry: LaplaceEntry): string {
	if (entry.kind === "degree")
		return "Enter a nonnegative whole number, or choose Zero polynomial when available.";
	if (entry.kind === "integer")
		return entry.min === 1
			? "Enter a positive whole number."
			: "Enter a nonnegative whole number.";
	if (entry.kind === "literal")
		return "Enter a signed integer, decimal, or fraction such as -3/2.";
	return "Enter exact constant arithmetic, including fractions or LaTeX.";
}

/** @param raw - Proposed complete control value. @param entry - Declared domain. @returns Whether typing may retain this complete or necessary partial draft. */
export function permitsEntryDraft(raw: string, entry: LaplaceEntry): boolean {
	if (entry.kind === "integer" || entry.kind === "degree")
		return /^\d*$/.test(raw);
	if (entry.kind !== "literal") return true;
	return (
		/^[+-]?$/.test(raw) ||
		/^[+-]?(?:\d+(?:\.\d*)?|\.\d*)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d*)?)?$/.test(
			raw,
		)
	);
}

/** @param raw - Submitted draft. @param entry - Semantic domain. @returns A format/domain issue, leaving correct-versus-incorrect mathematics to the independent verifier. */
export function entryIssue(
	raw: string,
	entry: LaplaceEntry,
): TransformValidationResult | null {
	const value = raw.trim();
	if (entry.kind === "exact" || entry.kind === "expression") return null;
	if (entry.kind === "degree" && entry.zero && value === ZERO_POLYNOMIAL)
		return null;
	if (entry.kind === "boolean")
		return value === "0" || value === "1"
			? null
			: {
					status: "invalid",
					message: "Choose whether this term is active.",
				};
	if (!value) return { status: "invalid", message: entryInstruction(entry) };
	if (entry.kind === "integer" || entry.kind === "degree")
		return integerIssue(value, entry);
	return literalIssue(value, entry);
}

/** @param value - Trimmed whole-number notation. @param entry - Integer bounds or degree semantics. @returns A precise notation or bound issue. */
function integerIssue(
	value: string,
	entry: Extract<LaplaceEntry, { kind: "integer" | "degree" }>,
): TransformValidationResult | null {
	if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
		return { status: "invalid", message: entryInstruction(entry) };
	const min = entry.kind === "integer" ? (entry.min ?? 0) : 0;
	const max = entry.kind === "integer" ? entry.max : undefined;
	if (Number(value) < min || (max !== undefined && Number(value) > max))
		return {
			status: "invalid",
			message: `Enter a whole number ${max === undefined ? `at least ${min}` : `from ${min} through ${max}`}.`,
		};
	return null;
}

/** @param value - Trimmed numeric literal. @param entry - Literal-domain instructions. @returns Whether exact bounded literal parsing succeeds. */
function literalIssue(
	value: string,
	entry: LaplaceEntry,
): TransformValidationResult | null {
	try {
		if (!permitsEntryDraft(value, entry))
			throw new Error("Invalid numeric notation");
		fraction(value);
		return null;
	} catch {
		return { status: "invalid", message: entryInstruction(entry) };
	}
}

/** @param target - Independently derived numeric target. @param entry - Field semantics. @returns A reachable correct UI draft, including the explicit zero selection. */
export function entryTarget(target: string, entry?: LaplaceEntry): string {
	return entry?.kind === "degree" && target === "-1"
		? ZERO_POLYNOMIAL
		: target;
}
