/**
 * Step 4 Particular Solution Ansatz ITS Scaffolding Builder.
 *
 * Formulates multiple-choice trial solution options, resonance distractors,
 * and misconception explanations for constant, exponential, and sinusoidal forcing functions.
 */

import type {
	ForcingFunction,
	OdeItsOption,
	ParticularSolution,
} from "../types";

/**
 * Parameters required to build Step 4 ITS data.
 */
export interface BuildStep4Params {
	/** Forcing function descriptor */
	forcing: ForcingFunction;
	/** Particular solution computation results including resonance multiplicity */
	particular: ParticularSolution;
}

/**
 * Result structure of Step 4 scaffolding generation.
 */
export interface Step4ScaffoldingResult {
	/** Multiple-choice trial ansatz options with targeted distractor feedback */
	step4Options: OdeItsOption[];
	/** Step 4 guidance hints */
	step4Hints: string[];
}

/**
 * Builds the Step 4 (Particular Solution Ansatz) ITS metadata.
 *
 * @param {BuildStep4Params} params Configuration parameters for Step 4
 * @returns {Step4ScaffoldingResult} Trial ansatz options and hints
 */
export function buildStep4Data(
	params: BuildStep4Params,
): Step4ScaffoldingResult {
	const { forcing, particular } = params;

	let step4Options: OdeItsOption[];
	switch (forcing.type) {
		case "constant": {
			step4Options = [
				{ id: "c1", latex: "y_p(t) = K_p", isCorrect: true },
				{
					id: "d1",
					latex: "y_p(t) = K_p t",
					isCorrect: false,
					feedback: String.raw`Resonance Multiplier Error: The factor of $t$ is only necessary if $s=0$ is a characteristic root ($a_0 = 0$). Here $a_0 \neq 0$.`,
				},
				{
					id: "d2",
					latex: "y_p(t) = K_p e^{-t}",
					isCorrect: false,
					feedback:
						"Ansatz Mismatch: The forcing input is constant, so the particular trial guess must be a constant $K_p$, not an exponential.",
				},
				{
					id: "d3",
					latex: String.raw`y_p(t) = A \cos(t) + B \sin(t)`,
					isCorrect: false,
					feedback:
						"Ansatz Mismatch: Sinusoidal ansatz is only used for oscillating sinusoidal inputs.",
				},
			];
			break;
		}
		case "exponential": {
			const p = forcing.p ?? 0;
			const multiplier =
				particular.resonanceMultiplicity === 0
					? ""
					: particular.resonanceMultiplicity === 1
						? "t "
						: "t^2 ";
			const correctLatex = `y_p(t) = K_p ${multiplier}e^{${p}t}`;
			step4Options = [
				{ id: "c1", latex: correctLatex, isCorrect: true },
				{
					id: "d1",
					latex: "y_p(t) = K_p",
					isCorrect: false,
					feedback:
						"Ansatz Mismatch: The forcing input contains an exponential, so the particular trial solution must have an exponential.",
				},
				{
					id: "d2",
					latex:
						particular.resonanceMultiplicity === 1
							? `y_p(t) = K_p t^2 e^{${p}t}`
							: `y_p(t) = K_p t e^{${p}t}`,
					isCorrect: false,
					feedback:
						particular.resonanceMultiplicity === 1
							? "Resonance Multiplier Error: Simple resonance (multiplicity 1) requires exactly one factor of $t$. Multiplying by $t^2$ over-corrects."
							: "Resonance Multiplier Error: Use one factor of $t$ for each collision with a characteristic root.",
				},
				{
					id: "d3",
					latex: String.raw`y_p(t) = A \cos(${p}t) + B \sin(${p}t)`,
					isCorrect: false,
					feedback:
						"Ansatz Mismatch: Exponential forcing requires an exponential trial solution, not sinusoids.",
				},
			];
			break;
		}
		case "sinusoid": {
			const w = forcing.omega ?? 1;
			step4Options = [
				{
					id: "c1",
					latex: String.raw`y_p(t) = A \cos(${w}t) + B \sin(${w}t)`,
					isCorrect: true,
				},
				{
					id: "d1",
					latex: String.raw`y_p(t) = A \cos(${w}t)`,
					isCorrect: false,
					feedback: String.raw`Missing Sine Component: Derivatives of cosine generate sine terms ($y_p' \propto \sin$), so both $A \cos(${w}t)$ and $B \sin(${w}t)$ are required.`,
				},
				{
					id: "d2",
					latex: `y_p(t) = K_p e^{j ${w}t}`,
					isCorrect: false,
					feedback: String.raw`Complex Notation: Use the real-valued trigonometric pair $A \cos(${w}t) + B \sin(${w}t)$ for real differential equations.`,
				},
				{
					id: "d3",
					latex: "y_p(t) = K_p",
					isCorrect: false,
					feedback:
						"Ansatz Mismatch: A constant trial solution cannot balance time-varying sinusoidal forcing.",
				},
			];
			break;
		}
		default: {
			throw new Error(
				`Unhandled forcing type for Step 4 options: ${String((forcing as ForcingFunction).type)}`,
			);
		}
	}

	const step4Hints = [
		`Inspect the forcing function $x(t) = ${forcing.latex}$. What form should the trial particular solution $y_p(t)$ take?`,
		String.raw`Match the functional shape of $x(t)$ (constant $\to K_p$, exponential $\to K_p e^{pt}$, sinusoid $\to A \cos(kt) + B \sin(kt)$).`,
		"Check if the trial guess collides with any characteristic root in the homogeneous solution (resonance).",
	];

	return { step4Options, step4Hints };
}
