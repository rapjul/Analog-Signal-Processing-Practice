import { formatSignedLinearTerm } from "../../formatting";
import type { OdeItsOption } from "../types";

/** Coefficients of the first natural mode, second natural mode, and particular solution. */
export type ResponseCoefficients = readonly [number, number, number];

/**
 * Compares coefficients over the independent basis used by generated stable ODEs.
 * @param left - First response coefficients.
 * @param right - Second response coefficients.
 * @returns Whether both responses represent the same function.
 */
function equivalentResponses(
	left: ResponseCoefficients,
	right: ResponseCoefficients,
): boolean {
	return left.every(
		/** @param value - First coefficient. @param index - Corresponding basis index. */
		(value, index) =>
			Math.abs(value - right[index]!) <=
			32 *
				Number.EPSILON *
				Math.max(Math.abs(value), Math.abs(right[index]!)),
	);
}

/**
 * Keeps three mathematically distinct choices, replacing collisions with natural modes.
 * @param options - Correct choice first, followed by preferred misconception choices.
 * @param coefficients - Each option's coefficients in the independent solution basis.
 * @param firstModeLatex - Unit-amplitude first natural mode for deterministic replacements.
 * @returns Three choices with exactly one correct answer.
 */
export function distinctResponseOptions(
	options: OdeItsOption[],
	coefficients: Record<string, ResponseCoefficients>,
	firstModeLatex: string,
): OdeItsOption[] {
	const selected: OdeItsOption[] = [];
	const vectors: ResponseCoefficients[] = [];
	const prefix = options[0]!.id.split("_")[0]!;
	const lhs = options[0]!.latex.split("=")[0]!.trim();
	for (const option of options) {
		const vector = coefficients[option.id]!;
		if (
			!vectors.some(
				/** @param existing - Previously accepted response coefficients. */
				(existing) => equivalentResponses(existing, vector),
			)
		) {
			selected.push(option);
			vectors.push(vector);
		}
	}
	// Three different nonzero first-mode amplitudes always supply enough alternatives.
	for (const factor of [1, -1, 2]) {
		if (selected.length === 3) break;
		const vector: ResponseCoefficients = [factor, 0, 0];
		if (
			vectors.some(
				/** @param existing - Previously accepted response coefficients. */
				(existing) => equivalentResponses(existing, vector),
			)
		)
			continue;
		selected.push({
			id: `${prefix}_basis_${factor}`,
			latex: `${lhs} = ${formatSignedLinearTerm(factor, firstModeLatex, true)}`,
			isCorrect: false,
			feedback:
				"Reconstruct the complete response and separate all decaying terms from the persistent terms; this natural mode alone is not the requested response.",
		});
		vectors.push(vector);
	}
	return selected;
}
