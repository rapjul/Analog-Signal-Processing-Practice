import { fraction } from "../algebra";
import {
	decompose,
	formatRoc,
	inverseTerms,
	originalTransform,
	rocBounds,
} from "../pfd";
import { responseLatex, signalLatex, signalTransform } from "../signals";
import type {
	LaplaceExercise,
	LaplaceResponseTerm,
	LaplaceStage,
	RationalExercise,
} from "../types";
import { analysisStage, decompositionStages, task } from "./shared";

/** @param terms - Independently solved terms. @returns Pairing stage with separate weight and support checks. */
export function pairingStage(terms: LaplaceResponseTerm[]): LaplaceStage {
	return {
		id: "pairs",
		title: "Apply Transform Pairs and Properties",
		tasks: terms.flatMap((term, index) => [
			task(
				`pair-${index}`,
				`Identify transform pair ${index + 1}`,
				`Which time-domain family corresponds to $${signalTransform(term)}$?`,
				"choice",
				term.kind,
				["exponential", "cosine", "sine", "impulse"],
			),
			task(
				`weight-${index}`,
				`Find term ${index + 1}'s weight`,
				"Include the factorial, frequency normalization, and any left-sided minus sign.",
				"scalar",
				term.amplitude,
			),
			task(
				`delay-${index}`,
				`Determine term ${index + 1}'s delay`,
				"The factor is $e^{-ds}$; enter $d$.",
				"scalar",
				term.delay,
			),
			{
				...task(
					`inverse-${index}`,
					`Invert term ${index + 1}`,
					`Invert $${signalTransform(term)}$. Include its supplied support.`,
					"t",
					signalLatex(term),
				),
				terms: [term],
			},
		]),
	};
}

/** @param exercise - Inverse or ROC exercise. @returns Checked inverse workflow and solved data. */
export function createRationalExercise(
	exercise: RationalExercise,
): LaplaceExercise {
	const spec = structuredClone(exercise),
		input = spec.rational;
	if (fraction(input.delay).toNumber() < 0)
		throw new Error("Use a nonnegative delay.");
	const data = decompose(input),
		roc = rocBounds(data.poles, input.region),
		terms = inverseTerms(data, input);
	const base = originalTransform(data),
		delay = fraction(input.delay);
	const transform = `${delay.numerator ? `e^{-(${delay.toLatex()})s}` : ""}${base}`;
	const response = responseLatex(terms),
		rocLatex = formatRoc(roc),
		stable = roc[0] < 0 && roc[1] > 0;
	const conditions =
		input.region === -1
			? "Bilateral transform of a right-sided signal."
			: input.region === 0
				? "Bilateral transform of a left-sided signal."
				: `Given ROC: $${rocLatex}$.`;
	const finalTasks = [
		task(
			"roc",
			"Identify the ROC",
			"Choose the open region consistent with genuine poles and supplied support.",
			"choice",
			`$${rocLatex}$`,
			[
				`$${rocLatex}$`,
				"All pole locations belong to the ROC",
				"ROC is determined by the zeros",
			],
		),
	];
	if (spec.system)
		finalTasks.push(
			task(
				"stability",
				"Assess BIBO stability",
				"Does the ROC include the entire imaginary axis? This assesses the input-output map, not hidden internal dynamics.",
				"choice",
				stable ? "BIBO stable" : "Not BIBO stable",
				["BIBO stable", "Not BIBO stable"],
			),
		);
	const stages: LaplaceStage[] = [
		{
			id: "convention",
			title: "Understand the Problem",
			tasks: [
				task(
					"convention",
					"Select the transform convention",
					"This problem supplies bilateral support or ROC information.",
					"choice",
					"Bilateral transform with explicit support",
					[
						"Bilateral transform with explicit support",
						"Unilateral ODE rule with unspecified initial state",
					],
				),
			],
		},
		analysisStage(data, input.zeros, input.poles),
		...decompositionStages(data),
		pairingStage(terms),
		{
			id: "assembly",
			title: "Assemble the Supported Response",
			tasks: [
				{
					...task(
						"response",
						"Combine your verified terms",
						"Include every support factor and impulse weight. Do not multiply impulses by a discontinuous step.",
						"t",
						response,
					),
					terms,
				},
			],
		},
		{ id: "interpret", title: "Verify and Interpret", tasks: finalTasks },
	].filter((stage) => stage.tasks.length);
	return {
		spec,
		prompt: `${spec.system ? "H" : "X"}(s)=${transform}`,
		conditions,
		transform,
		response,
		terms,
		poles: data.poles,
		canceled: data.canceled,
		roc,
		rocLatex,
		stable,
		stages,
	};
}
