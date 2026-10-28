import {
	CanonicalError,
	literalScalar,
} from "$lib/math-engine/canonical-algebra";
import {
	canonicalTransformsMatch,
	normalizeCanonicalTransform,
	normalizeLaplaceInterval,
} from "$lib/math-engine/canonical-transform";
import { parseStrictLatex } from "$lib/math-engine/evaluator";
import { normalizeTransformNotation } from "$lib/math-engine/transform-notation";
import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { fraction } from "./algebra";
import { laplaceExpression } from "./answer-entry";
import { signalLatex } from "./signals";
import type { LaplaceResponseTerm } from "./types";

/** @param text - Expression. @param variable - Allowed symbol. @param lhs - Optional matching assignment label. @returns Strict parsed AST. */
function parseExpression(
	text: string,
	variable: "s" | "t",
	lhs?: string,
): unknown {
	if (text.length > 16384)
		throw new CanonicalError(
			"unsupported",
			"Use at most 16,384 characters.",
		);
	if (!text.trim())
		throw new CanonicalError("invalid", "Enter an answer before checking.");
	const body = laplaceExpression(text, variable, lhs);
	const expression =
		variable === "t"
			? normalizeTransformNotation(body, "t")
			: normalizeTransformNotation(body, "omega");
	return parseStrictLatex(expression);
}

/** @param correct - Exact structural match. @returns Student-facing result. */
function outcome(correct: boolean): TransformValidationResult {
	return {
		status: correct ? "correct" : "incorrect",
		message: correct
			? "Verified exactly within the supported answer language."
			: "Recheck the coefficients, factors, signs, and support.",
	};
}

/** @param error - Strict verification exception. @returns Conservative outcome. */
function failure(error: unknown): TransformValidationResult {
	return error instanceof CanonicalError
		? { status: error.status, message: error.message }
		: {
				status: "invalid",
				message:
					"Enter valid mathematics with matching brackets and finite constants.",
			};
}

/** @param answer - Ordinary expression without support functions. @param target - Independently assembled active terms. @param bounds - Exact open interval. @returns Interval equality retaining strict distribution rejection. */
export function verifyLaplaceInterval(
	answer: string,
	target: string,
	bounds: { min: string | null; max: string | null },
): TransformValidationResult {
	try {
		const actual = parseExpression(answer, "t");
		/** @param node - Parsed subtree. @returns Whether interval-only input still contains support or distributions. */
		const hasSupport = (node: unknown): boolean =>
			node === "Heaviside" ||
			node === "DiracDelta" ||
			(Array.isArray(node) && node.some(hasSupport));
		if (hasSupport(actual))
			return {
				status: "invalid",
				message:
					"On this interval, evaluate support functions first. Enter only the ordinary active-term sum; keep impulses separate.",
			};
		/** @param value - Exact finite boundary. @returns Scalar identity for interval comparison. */
		const endpoint = (value: string) => {
			const q = fraction(value);
			return literalScalar(String(q.numerator)).divide(
				literalScalar(String(q.denominator)),
			);
		};
		const interval = {
			min:
				bounds.min === null
					? -Infinity
					: fraction(bounds.min).toNumber(),
			max:
				bounds.max === null
					? Infinity
					: fraction(bounds.max).toNumber(),
			minExact: bounds.min === null ? undefined : endpoint(bounds.min),
			maxExact: bounds.max === null ? undefined : endpoint(bounds.max),
		};
		return outcome(
			canonicalTransformsMatch(
				normalizeLaplaceInterval(actual, interval),
				normalizeLaplaceInterval(
					parseExpression(target, "t"),
					interval,
				),
			),
		);
	} catch (error) {
		return failure(error);
	}
}

/** @param answer - Submitted s-domain expression. @param target - Independently built exact expression. @param lhs - Optional task-specific assignment label. @returns Structural comparison. */
export function verifyLaplaceS(
	answer: string,
	target: string,
	lhs?: string,
): TransformValidationResult {
	try {
		return outcome(
			canonicalTransformsMatch(
				normalizeCanonicalTransform(
					parseExpression(answer, "s", lhs),
					"s",
				),
				normalizeCanonicalTransform(parseExpression(target, "s"), "s"),
			),
		);
	} catch (error) {
		return failure(error);
	}
}

/** @param answer - Exact constant calculation. @param target - Independent exact target. @returns Strict scalar comparison without accepting canceled free variables. */
export function verifyLaplaceScalar(
	answer: string,
	target: string,
): TransformValidationResult {
	try {
		const ast = parseExpression(answer, "s");
		/** @param node - Parsed expression subtree. @returns Whether a free symbol occurs before any simplification. */
		const hasVariable = (node: unknown): boolean => {
			if (Array.isArray(node)) return node.slice(1).some(hasVariable);
			return (
				typeof node === "string" &&
				!["Pi", "ExponentialE"].includes(node) &&
				!/^[+-]?[0-9.]+$/.test(node)
			);
		};
		if (hasVariable(ast))
			return {
				status: "invalid",
				message: "Enter a constant calculation without variables.",
			};
		return verifyLaplaceS(answer, target);
	} catch (error) {
		return failure(error);
	}
}

/** @param terms - One mode and support direction. @returns Surviving pole multiplicity on its infinite tail, or zero after exact cancellation. */
export function laplaceTailOrder(terms: LaplaceResponseTerm[]): number {
	if (!terms.length) return 0;
	const right = terms[0]!.side === "right";
	const delays = terms
		.map((term) => fraction(term.delay))
		.sort((a, b) => a.toNumber() - b.toNumber());
	const boundary = right ? delays.at(-1)! : delays[0]!;
	const exact = literalScalar(String(boundary.numerator)).divide(
		literalScalar(String(boundary.denominator)),
	);
	const normalized = normalizeLaplaceInterval(
		parseExpression(terms.map(signalLatex).join("+"), "t"),
		right
			? { min: boundary.toNumber(), max: Infinity, minExact: exact }
			: { min: -Infinity, max: boundary.toNumber(), maxExact: exact },
	);
	return Math.max(
		0,
		...normalized.right.terms.map(
			(term) =>
				term.factor.numerator.length -
				term.factor.denominator.length +
				1,
		),
	);
}

/** @param answer - Submitted response. @param terms - Structured target terms. @param lhs - Optional task-specific assignment label. @returns Global support and distribution comparison. */
export function verifyLaplaceTime(
	answer: string,
	terms: LaplaceResponseTerm[],
	lhs?: string,
): TransformValidationResult {
	try {
		const actual = parseExpression(answer, "t", lhs);
		// Construct target ASTs term-by-term from solved parameters, independently of the displayed sum.
		const expected: unknown = terms.length
			? [
					"Add",
					...terms.map((term) =>
						parseExpression(signalLatex(term), "t"),
					),
				]
			: 0;
		const delays = new Map<number, ReturnType<typeof fraction>>();
		for (const delay of ["0", ...terms.map((term) => term.delay)]) {
			const exact = fraction(delay),
				numeric = exact.toNumber();
			const previous = delays.get(numeric);
			if (previous && previous.add(exact.negate()).numerator !== 0n)
				throw new CanonicalError(
					"unsupported",
					"Support boundaries are too close for this tutor's numeric display range.",
				);
			delays.set(numeric, exact);
		}
		const boundaries = [-Infinity, ...delays.keys()].sort((a, b) => a - b);
		boundaries.push(Infinity);
		/** @param endpoint - Numeric projection. @returns Exact finite boundary scalar. */
		const exactEndpoint = (endpoint: number) => {
			const value = delays.get(endpoint);
			return value
				? literalScalar(String(value.numerator)).divide(
						literalScalar(String(value.denominator)),
					)
				: undefined;
		};
		for (let i = 1; i < boundaries.length; i++) {
			const interval = {
				min: boundaries[i - 1]!,
				max: boundaries[i]!,
				minExact: exactEndpoint(boundaries[i - 1]!),
				maxExact: exactEndpoint(boundaries[i]!),
			};
			if (
				!canonicalTransformsMatch(
					normalizeLaplaceInterval(actual, interval),
					normalizeLaplaceInterval(expected, interval),
				)
			)
				return outcome(false);
		}
		return outcome(true);
	} catch (error) {
		return failure(error);
	}
}
