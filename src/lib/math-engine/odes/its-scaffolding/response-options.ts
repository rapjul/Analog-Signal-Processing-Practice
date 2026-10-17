import {
	formatExpTerm,
	formatSignedLinearTerm,
} from "$lib/math-engine/formatting";
import { toFractionLatex } from "$lib/math-engine/fraction";
import type {
	HomogeneousSolution,
	OdeItsOption,
} from "$lib/math-engine/odes/types";
import type { BuildStep7Params } from "./step7-decomposition";

/** Coefficients of the first natural mode, second natural mode, and particular solution. */
export type ResponseCoefficients = readonly [number, number, number];

/** Distinct choices for both parts of the response-classification exercise. */
interface ResponseChoices {
	/** Choices for all decaying contributions. */
	transientChoices: OdeItsOption[];
	/** Choices for persistent contributions. */
	steadyStateChoices: OdeItsOption[];
}

/**
 * Expresses a natural response and optional forced contribution in the shared basis.
 * @param solution - Natural coefficients of the response.
 * @param particular - Amplitude of the particular-solution basis function.
 * @returns Independent response coefficients.
 */
function naturalCoefficients(
	solution: HomogeneousSolution,
	particular = 0,
): ResponseCoefficients {
	return [solution.C1, solution.C2 ?? 0, particular];
}

/**
 * Constructs and deduplicates the transient response options.
 * @param params - Solved response data.
 * @param firstModeLatex - Unit first natural mode for replacements.
 * @returns Distinct transient choices.
 */
function buildTransientChoices(
	params: BuildStep7Params,
	firstModeLatex: string,
): OdeItsOption[] {
	return distinctResponseOptions(
		[
			{
				id: "tr_correct",
				latex: `y_{tr}(t) = ${params.y_tr_latex}`,
				isCorrect: true,
			},
			{
				id: "tr_yp",
				latex: `y_{tr}(t) = ${params.particular.latex}`,
				isCorrect: false,
				feedback: params.particularDecays
					? "The decaying particular solution belongs to the transient response, but you must also include any nonzero homogeneous contribution."
					: "The constant or sinusoidal particular solution persists and belongs to the steady-state response.",
			},
			{
				id: "tr_zi",
				latex: `y_{tr}(t) = ${params.ziLatex}`,
				isCorrect: false,
				feedback:
					"The zero-input response accounts for the original initial state. Include every decaying term in the total response to obtain the complete transient response.",
			},
		],
		{
			tr_correct: naturalCoefficients(
				params.homogeneousComplete,
				params.particularDecays ? 1 : 0,
			),
			tr_yp: [0, 0, 1],
			tr_zi: naturalCoefficients(params.homogeneousZI),
		},
		firstModeLatex,
	);
}

/**
 * Constructs and deduplicates the persistent response options.
 * @param params - Solved response data.
 * @param firstModeLatex - Unit first natural mode for replacements.
 * @returns Distinct steady-state choices.
 */
function buildSteadyStateChoices(
	params: BuildStep7Params,
	firstModeLatex: string,
): OdeItsOption[] {
	return distinctResponseOptions(
		[
			{
				id: "ss_correct",
				latex: `y_{ss}(t) = ${params.y_ss_latex}`,
				isCorrect: true,
			},
			{
				id: "ss_yh",
				latex: `y_{ss}(t) = ${params.homogeneousComplete.latex}`,
				isCorrect: false,
				feedback: String.raw`Misconception: The homogeneous solution $y_h(t)$ contains decaying exponential terms that vanish as $t \to \infty$, so it is transient, not steady-state.`,
			},
			{
				id: "ss_zs",
				latex: `y_{ss}(t) = ${params.zsLatex}`,
				isCorrect: false,
				feedback: params.particularDecays
					? "This zero-state response decays completely. The steady-state response is zero because no forced or natural term persists."
					: "The zero-state response includes decaying natural terms as well as the persistent forced response; retain only the persistent part for steady-state.",
			},
		],
		{
			ss_correct: [0, 0, params.particularDecays ? 0 : 1],
			ss_yh: naturalCoefficients(params.homogeneousComplete),
			ss_zs: naturalCoefficients(params.homogeneousZS, 1),
		},
		firstModeLatex,
	);
}

/**
 * Builds seeded-shuffle-ready classification choices over the solved response basis.
 * @param params - Solved response and characteristic-root data.
 * @returns Distinct transient and steady-state choice sets.
 */
export function buildResponseChoices(
	params: BuildStep7Params,
): ResponseChoices {
	const firstModeLatex =
		params.resolvedOrder === 2 &&
		params.resolvedRootType === "complex_conjugate"
			? `${formatExpTerm(params.roots.r1)} \\cos(${toFractionLatex(params.roots.im ?? 0)}t)`
			: formatExpTerm(params.roots.r1);
	return {
		transientChoices: buildTransientChoices(params, firstModeLatex),
		steadyStateChoices: buildSteadyStateChoices(params, firstModeLatex),
	};
}

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
