import type {
	ForcingFunction,
	HomogeneousSolution,
	ParticularSolution,
} from "./types";

/** The decay-based split shared by generation and teaching choices. */
interface ResponseDecomposition {
	/** Whether the particular solution belongs to the transient response. */
	particularDecays: boolean;
	/** All terms that vanish asymptotically. */
	y_tr_latex: string;
	/** Persistent terms, or zero when the full response decays. */
	y_ss_latex: string;
}

/**
 * Separates decaying and persistent terms for the generator's stable systems.
 * @param forcing - Generated input function.
 * @param homogeneous - Complete homogeneous contribution.
 * @param particular - Forced contribution.
 * @param completeLatex - Formatted total response.
 * @returns Transient and steady-state expressions and their basis classification.
 */
export function classifyResponseDecomposition(
	forcing: ForcingFunction,
	homogeneous: HomogeneousSolution,
	particular: ParticularSolution,
	completeLatex: string,
): ResponseDecomposition {
	const particularDecays =
		forcing.type === "exponential" && (forcing.p ?? -1) < 0;
	return {
		particularDecays,
		y_tr_latex: particularDecays ? completeLatex : homogeneous.latex,
		y_ss_latex: particularDecays ? "0" : particular.latex,
	};
}
