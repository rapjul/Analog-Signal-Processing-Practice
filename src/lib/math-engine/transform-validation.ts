/** Family-aware transform verification; samples provide secondary diagnostics only. */
import { CanonicalError } from "$lib/math-engine/canonical-algebra";
import {
	type CanonicalTransform,
	canonicalTransformsMatch,
	evaluateCanonicalRegular,
	normalizeCanonicalTransform,
} from "$lib/math-engine/canonical-transform";
import type { Complex } from "$lib/math-engine/complex";
import { parseStrictLatex } from "$lib/math-engine/evaluator";
import { normalizeTransformNotation } from "$lib/math-engine/transform-notation";

/** Outcome of checking a supported transform expression. */
export interface TransformValidationResult {
	/** Only verified canonical matches may complete practice. */
	status: "correct" | "incorrect" | "invalid" | "unsupported";
	/** Accessible diagnostic shown to the learner. */
	message: string;
	/** Secondary numerical observations never establish correctness. */
	numericCheck?: "consistent" | "inconclusive" | "mismatch";
}

/** Weighted Dirac impulse used by independently generated plotting diagnostics. */
export interface SpectrumImpulse {
	/** Frequency location in radians per second. */ location: number;
	/** Complex distribution weight. */ weight: Complex;
}

/** Independent structured target plus optional numerical diagnostics. */
export interface TransformReference {
	/** Allowed independent variable. */ variable: "t" | "omega";
	/** Mandatory canonical target, built from structured problem parameters. */ canonicalTarget: CanonicalTransform;
	/** Domain samples for secondary diagnostics. */ samples: number[];
	/** Characteristic scale retained for diagnostic callers. */ sampleScale?: number;
	/** Support boundaries retained for diagnostic callers. */ stepTransitions?: number[];
	/** Independent regular reference evaluator used only after canonical verification. */ evaluate: (
		value: number,
	) => Complex;
	/** Independent distribution diagnostic data. */ impulses?: SpectrumImpulse[];
}

/**
 * @param answer - Bounded original input, never rewritten into a symbolic value.
 * @param result - Failed verification result.
 * @returns The same status with a conditional notation hint for a pi-like decimal.
 */
function failureFeedback(
	answer: string,
	result: TransformValidationResult,
): TransformValidationResult {
	if (/(?<![\w.])3\.14\d*(?:…|\.{3})?(?![\d.eE])/.test(answer))
		return {
			...result,
			message: `${result.message} If you intended the constant pi, enter its name in the answer field.`,
		};
	return result;
}

/**
 * Records numerical consistency after global structure has already matched.
 * @param value - Verified submitted canonical form.
 * @param reference - Independent numerical diagnostics.
 * @returns Diagnostic observation; it cannot promote an unsupported expression.
 */
function numericDiagnostic(
	value: CanonicalTransform,
	reference: TransformReference,
): "consistent" | "inconclusive" | "mismatch" {
	let result: "consistent" | "inconclusive" | "mismatch" = "consistent";
	for (const point of reference.samples) {
		try {
			const actual = evaluateCanonicalRegular(value, point),
				expected = reference.evaluate(point);
			if (!Number.isFinite(expected.re) || !Number.isFinite(expected.im))
				return "inconclusive";
			if (actual.sub(expected).abs() > 1e-8 + 1e-8 * expected.abs())
				return "mismatch";
		} catch {
			// A removable sinc sample can be inconclusive without invalidating its exact identity.
			result = "inconclusive";
		}
	}
	return result;
}

/**
 * Verifies supported global structure against an independently constructed target.
 * @param answer - Student expression.
 * @param reference - Required canonical target and secondary diagnostics.
 * @returns Typed verification or a student-facing diagnostic.
 */
export function validateTransformAnswer(
	answer: string,
	reference: TransformReference,
): TransformValidationResult {
	if (answer.length > 16384)
		return {
			status: "unsupported",
			message:
				"Please shorten the answer to 16,384 characters or fewer and use the standard transform form.",
		};
	if (!answer.trim())
		return {
			status: "invalid",
			message: "Please enter an answer before submitting.",
		};
	if (
		!reference.canonicalTarget ||
		reference.canonicalTarget.variable !== reference.variable
	)
		return {
			status: "unsupported",
			message: "This problem has no canonical verification target.",
		};
	try {
		const expression = normalizeTransformNotation(
			answer,
			reference.variable,
		);
		const submitted = normalizeCanonicalTransform(
			parseStrictLatex(expression),
			reference.variable,
		);
		if (!canonicalTransformsMatch(submitted, reference.canonicalTarget))
			return failureFeedback(answer, {
				status: "incorrect",
				message:
					"Not yet correct. Check coefficients, signs, shifts, poles, and signal support.",
			});
		return {
			status: "correct",
			message: "Correct! Your supported answer form matches the problem.",
			numericCheck: numericDiagnostic(submitted, reference),
		};
	} catch (error) {
		return failureFeedback(
			answer,
			error instanceof CanonicalError
				? { status: error.status, message: error.message }
				: {
						status: "invalid",
						message:
							"Check the answer's syntax, matching brackets, and finite constants.",
					},
		);
	}
}
