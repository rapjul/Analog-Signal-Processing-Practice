/** Strict scalar, phase, and distribution grading for CTFT teaching tasks. */
import {
	CanonicalError,
	factorAt,
	type Scalar,
	scalar,
	scalarField,
} from "$lib/math-engine/canonical-algebra";
import { createCtftCanonicalTarget } from "$lib/math-engine/canonical-targets";
import {
	type CanonicalImpulse,
	canonicalTransformsMatch,
	evaluateCanonicalRegular,
	normalizeCanonicalTransform,
} from "$lib/math-engine/canonical-transform";
import { parseStrictLatex } from "$lib/math-engine/evaluator";
import { normalizeTransformNotation } from "$lib/math-engine/transform-notation";
import {
	type TransformValidationResult,
	validateTransformAnswer,
} from "$lib/math-engine/transform-validation";
import {
	createCtftProblem,
	type GeneratedCtftProblem,
	validateCtftAnswer,
} from "./engine";

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
 * Adds calculation-neutral time-variable feedback without changing a grading outcome.
 * @param answer - Original intermediate-calculation input.
 * @param result - Canonical verifier's authoritative result.
 * @returns The original result or a copy retaining its status and syntax diagnostics.
 */
export function withCtftCalculationDiagnostics(
	answer: string,
	result: TransformValidationResult,
): TransformValidationResult {
	if (result.status === "correct" || answer.length > 16384) return result;
	const times = [...answer.matchAll(/(^|[^a-zA-Z\\])t(?![a-zA-Z])/g)];
	if (!times.length) return result;
	return {
		...result,
		message:
			"The requested intermediate result must not contain the time variable $t$. Complete the operation shown in the task context.",
		diagnostics: [
			...(result.diagnostics ?? []),
			...times.map(
				/** @param match - Original time token. @returns Its source range. */
				(match) => ({
					start: match.index! + match[1]!.length,
					end: match.index! + match[1]!.length + 1,
					message:
						"Complete the requested calculation without leaving $t$ in the answer.",
				}),
			),
		].slice(0, 8),
	};
}

/**
 * Verifies bounded intermediate algebra with canonical equivalence, without sampling.
 * @param answer - Learner expression in angular frequency.
 * @param expected - Independent parameter-derived intermediate expression.
 * @returns Distinct correct, incorrect, malformed, or unsupported outcome.
 */
export function validateCtftCalculation(
	answer: string,
	expected: string,
): TransformValidationResult {
	try {
		const target = normalizeCanonicalTransform(
			parseStrictLatex(normalizeTransformNotation(expected, "omega")),
			"omega",
		);
		return validateTransformAnswer(answer, {
			variable: "omega",
			canonicalTarget: target,
			samples: [],
			/** @param omega - Frequency requested by the verification interface. @returns Canonical target value. */
			evaluate: (omega) => evaluateCanonicalRegular(target, omega),
		});
	} catch (error) {
		return error instanceof CanonicalError
			? { status: error.status, message: error.message }
			: {
					status: "invalid",
					message:
						"Enter a supported expression in angular frequency.",
				};
	}
}

/**
 * Verifies a constant against an independent symbolic target, optionally exactly.
 * @param answer - Student constant expression.
 * @param expected - Parameter-derived symbolic constant.
 * @param exact - Require exact canonical scalar equality rather than coefficient tolerance.
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
		// Compare parsed values so accepted prefixes and per-field limits survive exact checks.
		return parseImpulseConstant(answer).equals(
			parseImpulseConstant(expected),
		)
			? result
			: {
					status: "incorrect",
					message:
						"Enter the exact constant value, without rounding.",
				};
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
 * Parses one bounded scalar field without embedding its original text in a formula.
 * @param answer - Original field input, including any supported equation prefix.
 * @returns Exact constant after notation, domain, and structural verification.
 */
function parseImpulseConstant(answer: string): Scalar {
	// Retain validateTransformAnswer's per-field bound before parsing or trimming.
	if (answer.length > 16384)
		throw new CanonicalError(
			"unsupported",
			"Please shorten the answer to 16,384 characters or fewer and use the standard transform form.",
		);
	if (!answer.trim())
		throw new CanonicalError(
			"invalid",
			"Please enter an answer before submitting.",
		);
	const ast = parseStrictLatex(normalizeTransformNotation(answer, "omega"));
	const value = normalizeCanonicalTransform(ast, "omega").right;
	if (containsVariable(ast))
		throw new CanonicalError(
			"invalid",
			"Enter a constant expression without time or frequency variables.",
		);
	if (value.impulses.length || value.terms.length > 1)
		throw new CanonicalError(
			"unsupported",
			"Enter a constant complex weight or a real impulse location.",
		);
	const term = value.terms[0];
	if (!term) return scalar(0);
	if (
		term.exponent.length ||
		term.factor.numerator.length > 1 ||
		term.factor.denominator.length !== 1
	)
		throw new CanonicalError(
			"unsupported",
			"Enter a constant complex weight or a real impulse location.",
		);
	return factorAt(term.factor, scalar(0));
}

/**
 * Builds one exact impulse from independent scalar fields.
 * @param locationInput - Real coordinate expression.
 * @param weightInput - Complex constant expression.
 * @returns A parameter-independent submitted impulse.
 */
function parseImpulseRow(
	locationInput: string,
	weightInput: string,
): CanonicalImpulse {
	const location = parseImpulseConstant(locationInput);
	if (!location.isReal())
		throw new CanonicalError(
			"unsupported",
			"Impulse locations must be real constants.",
		);
	return { location, weight: parseImpulseConstant(weightInput) };
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
	try {
		const impulses: CanonicalImpulse[] = [];
		for (let row = 0; row < 2; row++) {
			const impulse = parseImpulseRow(locations[row]!, weights[row]!);
			const previous = impulses.find(
				/** @param candidate - Previously submitted impulse. @returns Exact coordinate equality. */
				(candidate) => candidate.location.equals(impulse.location),
			);
			if (previous) previous.weight = previous.weight.add(impulse.weight);
			else impulses.push(impulse);
		}
		const spectrum = {
			terms: [],
			impulses: impulses.filter(
				/** @param impulse - Collected impulse. @returns Whether its exact weight is nonzero. */
				(impulse) => !scalarField.isZero(impulse.weight),
			),
		};
		const correct = canonicalTransformsMatch(
			{ variable: "omega", left: spectrum, right: spectrum },
			createCtftCanonicalTarget(problem.signalType, problem.params),
		);
		return {
			status: correct ? "correct" : "incorrect",
			message: correct
				? "Correct! Your supported answer form matches the problem."
				: "Not yet correct. Check coefficients, signs, shifts, poles, and signal support.",
		};
	} catch (error) {
		return error instanceof CanonicalError
			? { status: error.status, message: error.message }
			: {
					status: "invalid",
					message:
						"Check the impulse fields' syntax, matching brackets, and finite constants.",
				};
	}
}
