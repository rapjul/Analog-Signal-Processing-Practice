import { fraction } from "../algebra";
import { decompose, formatRoc, rocBounds } from "../pfd";
import type { LaplaceExercise, RationalExercise } from "../types";
import { createRationalExercise } from "./inverse";
import { analysisStage, task } from "./shared";

/** @param input - System-analysis configuration. @returns Pole/zero, ROC, sidedness, and stability workflow. */
export function createRocExercise(input: RationalExercise): LaplaceExercise {
	const problem = createRationalExercise({
		...input,
		workflow: "roc",
		system: true,
	});
	const data = decompose(input.rational);
	const distinct = new Set(
		data.poles.map((factor) => fraction(factor.real).toNumber()),
	).size;
	const allRegions = Array.from(
		{ length: distinct + 1 },
		(_, index) => `$${formatRoc(rocBounds(data.poles, index))}$`,
	).join("; ");
	const side = !data.poles.length
		? "Finite-duration impulses or zero signal"
		: problem.roc[0] === -Infinity
			? "Left-sided"
			: problem.roc[1] === Infinity
				? "Right-sided"
				: "Two-sided";
	problem.stages = [
		analysisStage(data, input.rational.zeros, input.rational.poles),
		{
			id: "regions",
			title: "Construct the Admissible Regions",
			tasks: [
				task(
					"all-regions",
					"List admissible open ROCs",
					"Sort distinct pole real parts. Only neighboring boundaries define a strip; no pole is included.",
					"choice",
					allRegions,
					[
						allRegions,
						"One strip from the minimum to the maximum regardless of interior poles",
						"ROC boundaries are the zeros",
					],
				),
			],
		},
		{
			id: "select-region",
			title: "Select the Required Region",
			tasks: [
				task(
					"select-roc",
					"Apply the supplied constraint",
					"Use the given support or ROC to select the unique inverse.",
					"choice",
					`$${problem.rocLatex}$`,
					Array.from(
						{ length: distinct + 1 },
						(_, index) =>
							`$${formatRoc(rocBounds(data.poles, index))}$`,
					),
				),
			],
		},
		{
			id: "sidedness",
			title: "Determine Sidedness and Causality",
			tasks: [
				task(
					"side",
					"Classify the support",
					"A strip corresponds to a two-sided response. Finite-duration impulse-only responses need separate treatment.",
					"choice",
					side,
					[
						"Left-sided",
						"Right-sided",
						"Two-sided",
						"Finite-duration impulses or zero signal",
					],
				),
				task(
					"causality",
					"Is the system causal?",
					"A causal impulse response vanishes for all negative times, including shifted support.",
					"choice",
					problem.terms.every(
						(term) =>
							term.side === "right" || term.kind === "impulse",
					)
						? "Causal"
						: "Noncausal",
					["Causal", "Noncausal"],
				),
			],
		},
		{
			id: "stability",
			title: "Assess Input-Output Stability",
			tasks: [
				task(
					"axis",
					"Check the imaginary axis",
					"The entire line Re(s)=0 must lie inside the ROC.",
					"choice",
					problem.stable
						? "Axis is inside the ROC"
						: "Axis is outside the ROC",
					["Axis is inside the ROC", "Axis is outside the ROC"],
				),
				task(
					"bibo",
					"Assess BIBO stability",
					"A reduced transfer function does not establish internal stability of an unspecified realization.",
					"choice",
					problem.stable ? "BIBO stable" : "Not BIBO stable",
					["BIBO stable", "Not BIBO stable"],
				),
			],
		},
	];
	return problem;
}
