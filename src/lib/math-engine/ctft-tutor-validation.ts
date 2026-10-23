/** Strict scalar, phase, and distribution grading for CTFT teaching tasks. */
import { CanonicalError } from "./canonical-algebra";
import {
	evaluateCanonicalRegular,
	normalizeCanonicalTransform,
} from "./canonical-transform";
import { parseStrictLatex } from "./evaluator";
import {
	createCtftProblem,
	type GeneratedCtftProblem,
	validateCtftAnswer,
} from "./fourier-transform";
import { normalizeTransformNotation } from "./transform-notation";
import {
	type TransformValidationResult,
	validateTransformAnswer,
} from "./transform-validation";

/**
 * Detects variable participation before constant-expression simplification.
 * @param node - Parsed bounded mathematical syntax.
 * @returns Whether a transform variable occurs anywhere in the expression.
 */
function containsVariable(node: unknown): boolean {
	if (typeof node === "string") return ["omega", "t", "s"].includes(node);
	if (Array.isArray(node)) return node.some(containsVariable);
	if (node && typeof node === "object")
		return Object.values(node).some(containsVariable);
	return false;
}

/**
 * Verifies a constant against an independent symbolic target, optionally exactly.
 * @param answer - Student constant expression.
 * @param expected - Parameter-derived symbolic constant.
 * @param exact - Require exact equality using a distribution coordinate.
 * @returns Typed verification, retaining unsupported and malformed outcomes.
 */
export function validateCtftConstant(
	answer: string,
	expected: string,
	exact = false,
): TransformValidationResult {
	try {
		const target = normalizeCanonicalTransform(
			parseStrictLatex(expected),
			"omega",
		);
		const result = validateTransformAnswer(answer, {
			variable: "omega",
			canonicalTarget: target,
			samples: [],
			/** @returns The independent constant target. */
			evaluate: () => evaluateCanonicalRegular(target, 0),
		});
		if (result.status !== "correct") return result;
		if (
			containsVariable(
				parseStrictLatex(normalizeTransformNotation(answer, "omega")),
			)
		)
			return {
				status: "invalid",
				message:
					"Enter a constant expression without time or frequency variables.",
			};
		if (!exact) return result;
		const coordinate = normalizeCanonicalTransform(
			parseStrictLatex(
				normalizeTransformNotation(
					`\\delta(\\omega-(${expected}))`,
					"omega",
				),
			),
			"omega",
		);
		return validateTransformAnswer(`\\delta(\\omega-(${answer}))`, {
			variable: "omega",
			canonicalTarget: coordinate,
			samples: [],
			/** @returns The zero regular part of this artificial coordinate comparison. */
			evaluate: () => evaluateCanonicalRegular(coordinate, 0),
		});
	} catch (error) {
		return error instanceof CanonicalError
			? { status: error.status, message: error.message }
			: {
					status: "invalid",
					message: "Enter a finite constant expression.",
				};
	}
}

/**
 * Checks a phase multiplier against the shifted delta's ordinary spectrum.
 * @param answer - Student multiplier.
 * @param problem - Signal supplying the signed translation.
 * @returns Independent canonical verification of exp(−jωt₀).
 */
export function validateCtftPhase(
	answer: string,
	problem: GeneratedCtftProblem,
): TransformValidationResult {
	return validateCtftAnswer(
		answer,
		createCtftProblem("delta", problem.params),
	);
}

/**
 * Assembles checked scalar fields into an independently verified distribution.
 * @param locations - Two constant coordinates.
 * @param weights - Two constant complex weights.
 * @param problem - Base or shifted cosine target.
 * @returns Full canonical distribution verification.
 */
export function validateCtftImpulseRows(
	locations: string[],
	weights: string[],
	problem: GeneratedCtftProblem,
): TransformValidationResult {
	if (locations.length !== 2 || weights.length !== 2)
		return {
			status: "invalid",
			message: "Enter both impulse locations and weights.",
		};
	return validateCtftAnswer(
		`(${weights[0]})\\delta(\\omega-(${locations[0]}))+(${weights[1]})\\delta(\\omega-(${locations[1]}))`,
		problem,
	);
}
