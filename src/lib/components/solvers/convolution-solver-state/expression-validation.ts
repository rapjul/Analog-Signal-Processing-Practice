/** Shared strict typed-expression validation for convolution tutor steps. */

import { CanonicalError } from "$lib/math-engine/canonical-algebra";
import {
	type CanonicalInterval,
	canonicalTransformsMatch,
	normalizeCanonicalInterval,
	UNSUPPORTED_FORM_MESSAGE,
} from "$lib/math-engine/canonical-transform";
import { parseStrictLatex } from "$lib/math-engine/evaluator";
import { parseNumericInput } from "$lib/math-engine/fraction";
import { normalizeTransformNotation } from "$lib/math-engine/transform-notation";

/** Symbolically established answer status with an accessible explanation. */
export interface ConvolutionVerificationResult {
	/** Only a correct result may advance the tutor. */
	status: "correct" | "incorrect" | "invalid" | "unsupported";
	/** Explanation of an unsupported form or failed comparison. */
	message: string;
}

/**
 * Verifies expressions on an open domain without certifying numerical samples.
 * @param student - Submitted expression or infinity sentinel.
 * @param expected - Reference expression or infinity sentinel.
 * @param interval - Active interval; defaults to the complete real line.
 * @returns Canonical equivalence or a conservative diagnostic.
 */
export function verifyConvolutionExpression(
	student: string,
	expected: string,
	interval: CanonicalInterval = { min: -Infinity, max: Infinity },
): ConvolutionVerificationResult {
	try {
		if (student.length > 16384 || expected.length > 16384)
			throw new CanonicalError(
				"unsupported",
				"Please shorten the expression to 16,384 characters or fewer.",
			);
		const actualScalar = parseConvolutionScalarInput(student);
		const targetScalar = parseConvolutionScalarInput(expected);
		/** @param value - Parsed scalar. @returns Whether it is an infinity sentinel. */
		const isInfinity = (value: number): boolean =>
			value === Infinity || value === -Infinity;
		/**
		 * Normalizes one bounded expression while preserving its support.
		 * @param expression - Student or reference expression.
		 * @returns Canonical representation on the requested domain.
		 */
		const normalize = (expression: string) =>
			normalizeCanonicalInterval(
				parseStrictLatex(
					normalizeTransformNotation(
						expression.replace(/^\s*y\s*\(\s*t\s*\)\s*=\s*/, ""),
						"t",
					),
				),
				interval,
			);
		if (isInfinity(actualScalar) || isInfinity(targetScalar)) {
			// Validate finite operands before diagnosing a boundary mismatch.
			if (!isInfinity(actualScalar)) normalize(student);
			if (!isInfinity(targetScalar)) normalize(expected);
			return {
				status: Object.is(actualScalar, targetScalar)
					? "correct"
					: "incorrect",
				message: "Use the verified finite or infinite boundary.",
			};
		}
		const correct = canonicalTransformsMatch(
			normalize(student),
			normalize(expected),
		);
		return {
			status: correct ? "correct" : "incorrect",
			message: correct
				? "The expressions agree on this interval."
				: "This expression does not match the verified result on this interval.",
		};
	} catch (error) {
		return error instanceof CanonicalError
			? {
					status: error.status,
					message:
						error.status === "unsupported" &&
						error.message === UNSUPPORTED_FORM_MESSAGE
							? "This form cannot be verified. Use a polynomial or a sum of polynomial-times-exponential terms with support constant throughout this interval."
							: error.message,
				}
			: {
					status: "invalid",
					message:
						"Enter valid mathematics in t with matching brackets and finite constants.",
				};
	}
}

/** Parses a finite scalar or a common positive/negative infinity spelling. */
export function parseConvolutionScalarInput(input: string): number {
	const normalized = input
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "")
		.replace(/\\infty|∞|(?<![a-z])oo(?![a-z])/g, "infinity");
	if (["infinity", "+infinity", "inf", "+inf"].includes(normalized))
		return Number.POSITIVE_INFINITY;
	if (["-infinity", "-inf"].includes(normalized))
		return Number.NEGATIVE_INFINITY;
	return parseNumericInput(input);
}

/** Compares finite or infinite scalar input against an exact expected value. */
export function convolutionScalarMatches(
	input: string,
	expected: number,
): boolean {
	const value = parseConvolutionScalarInput(input);
	return Object.is(value, expected) || Math.abs(value - expected) < 1e-9;
}

/**
 * Compares one-variable expressions through bounded symbolic verification.
 * @param student - Student expression or infinity boundary sentinel.
 * @param expected - Verified expression or infinity boundary sentinel.
 * @param interval - Open interval on which the expressions must agree.
 * @returns Whether their supported canonical forms match.
 */
export function convolutionExpressionsMatch(
	student: string,
	expected: string,
	interval?: CanonicalInterval,
): boolean {
	return (
		verifyConvolutionExpression(student, expected, interval).status ===
		"correct"
	);
}

/**
 * Compares a contact formulation input against expected transformed expression and fixed value.
 *
 * Accepts:
 * - Bare transformed expression: `t - 1`
 * - Full equation: `2 = t - 1`
 * - Reversed equation: `t - 1 = 2`
 *
 * @param input - Student-entered string.
 * @param expectedFixed - Fixed signal breakpoint coordinate.
 * @param expectedTransformedLatex - Expected transformed moving breakpoint expression.
 */
export function verifyConvolutionContactEquation(
	input: string,
	expectedFixed: number,
	expectedTransformedLatex: string,
): ConvolutionVerificationResult {
	const trimmed = input.trim();
	if (input.length > 16384) return verifyConvolutionExpression(input, "0");
	if (trimmed.includes("=")) {
		const parts = trimmed.split("=").map((p) => p.trim());
		if (parts.length !== 2 || parts.some((part) => !part))
			return {
				status: "invalid",
				message:
					"Enter one contact equation with an expression on each side of the equals sign.",
			};
		const left = parts[0];
		const right = parts[1];
		const orientations = [
			[
				verifyConvolutionExpression(left!, String(expectedFixed)),
				verifyConvolutionExpression(right!, expectedTransformedLatex),
			],
			[
				verifyConvolutionExpression(left!, expectedTransformedLatex),
				verifyConvolutionExpression(right!, String(expectedFixed)),
			],
		];
		if (
			orientations.some((results) =>
				results.every(({ status }) => status === "correct"),
			)
		)
			return {
				status: "correct",
				message:
					"The contact equation matches the selected moving path.",
			};
		return (
			orientations
				.flat()
				.find(
					({ status }) =>
						status === "invalid" || status === "unsupported",
				) ?? {
				status: "incorrect",
				message:
					"Set the fixed breakpoint equal to the reflected moving breakpoint.",
			}
		);
	}
	return verifyConvolutionExpression(trimmed, expectedTransformedLatex);
}

/**
 * Reports whether the supported contact equation is established symbolically.
 * @param input - Bare transformed expression or contact equation.
 * @param expectedFixed - Fixed breakpoint coordinate.
 * @param expectedTransformedLatex - Reflected moving breakpoint expression.
 * @returns Whether the equation matches in either orientation.
 */
export function convolutionContactEquationMatches(
	input: string,
	expectedFixed: number,
	expectedTransformedLatex: string,
): boolean {
	return (
		verifyConvolutionContactEquation(
			input,
			expectedFixed,
			expectedTransformedLatex,
		).status === "correct"
	);
}

/**
 * Compares a contact solve input against expected transition time.
 *
 * Accepts:
 * - Bare number: `3`
 * - Equation: `t = 3`, `3 = t`
 *
 * @param input - Student-entered string.
 * @param expectedTime - Target transition time scalar.
 */
export function convolutionContactSolveMatches(
	input: string,
	expectedTime: number,
): boolean {
	let normalized = input.trim();
	if (normalized.includes("=")) {
		const parts = normalized.split("=").map((p) => p.trim());
		if (parts.length !== 2) return false;
		const left = parts[0];
		const right = parts[1];
		if (left === undefined || right === undefined) return false;
		if (left.toLowerCase() === "t") normalized = right;
		else if (right.toLowerCase() === "t") normalized = left;
		else return false;
	}
	return convolutionScalarMatches(normalized, expectedTime);
}
