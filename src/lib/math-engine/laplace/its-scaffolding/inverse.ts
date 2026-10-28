import { fraction } from "$lib/math-engine/laplace/algebra";
import {
	delayedLatex,
	delayLatex,
	shiftedTime,
} from "$lib/math-engine/laplace/formatting";
import {
	decompose,
	factorial,
	formatRoc,
	fractionLatex,
	inverseTerms,
	originalTransform,
	rocBounds,
} from "$lib/math-engine/laplace/pfd";
import {
	responseLatex,
	signalLatex,
	signalTransform,
} from "$lib/math-engine/laplace/signals";
import type {
	LaplaceExercise,
	LaplaceResponseTerm,
	LaplaceStage,
	LaplaceTask,
	RationalExercise,
} from "$lib/math-engine/laplace/types";
import { analysisStage, decompositionStages, fieldTask, task } from "./shared";
import { teaching, teachRoc, teachSignal } from "./teaching";

/** @param term - Verified transform term. @param newDelay - Whether this delay still needs a check. @returns New numeric fields and unchanged verified parameters. */
function pairParameters(term: LaplaceResponseTerm, newDelay: boolean) {
	const newWeight =
		term.side === "left" ||
		term.kind === "sine" ||
		(term.kind === "exponential" && term.power >= 2);
	const fields = [
		...(newWeight
			? [
					{
						id: "weight",
						label: "Normalized signed weight",
						target: term.amplitude,
					},
				]
			: []),
		...(newDelay
			? [
					{
						id: "delay",
						label: "Nonnegative time delay",
						target: term.delay,
					},
				]
			: []),
		...(term.kind === "impulse"
			? []
			: [
					{
						id: "parameter",
						entry:
							term.kind === "exponential"
								? { kind: "integer" as const, min: 0 }
								: { kind: "exact" as const },
						label:
							term.kind === "exponential"
								? "Polynomial time power"
								: "Positive angular frequency",
						target:
							term.kind === "exponential"
								? String(term.power)
								: term.frequency,
					},
				]),
	];
	const carried = [
		...(newWeight
			? []
			: [
					`The verified algebraic coefficient carries unchanged as weight $${term.amplitude}$.`,
				]),
		...(term.kind === "impulse"
			? []
			: [
					`The verified pole location gives exponential rate $${term.rate}$.`,
				]),
		...(newDelay
			? []
			: [`Reuse the previously checked delay $${term.delay}$.`]),
	];
	return { newWeight, fields, carried };
}

/** @param terms - Independently solved terms after checked algebra. @returns Family choices and grouped new parameter calculations. */
export function pairingStage(terms: LaplaceResponseTerm[]): LaplaceStage {
	const checkedDelays = new Set<string>();
	return {
		id: "pairs",
		title: "Apply Transform Pairs and Properties",
		tasks: terms.flatMap((term, index): LaplaceTask[] => {
			const delayKey = fraction(term.delay).toLatex();
			const newDelay = !checkedDelays.has(delayKey);
			checkedDelays.add(delayKey);
			const { newWeight, fields, carried } = pairParameters(
				term,
				newDelay,
			);
			const normalizer =
				term.kind === "sine"
					? fraction(term.frequency)
					: fraction(
							term.kind === "exponential"
								? factorial(term.power)
								: 1,
						);
			const coefficient = fractionLatex(term.amplitude)
				.multiply(normalizer)
				.multiply(fraction(term.side === "left" ? -1 : 1));
			return [
				teachSignal(
					task(
						`pair-${index}`,
						`Identify transform pair ${index + 1}`,
						`Which time-domain family corresponds to $${signalTransform(term)}$?`,
						"choice",
						term.kind,
						["exponential", "cosine", "sine", "impulse"],
					),
					term,
				),
				...(fields.length
					? [
							{
								...fieldTask(
									`pair-parameters-${index}-values`,
									`Calculate term ${index + 1}'s remaining parameters`,
									"Use the verified transform and enter only the new pair parameters. Retain normalization and support signs.",
									fields
										.map(
											(field) =>
												`\\text{${field.label}}={{${field.id}}}`,
										)
										.join(",\\quad "),
									fields,
								),
								...teaching(
									term.kind === "exponential"
										? "For $C/(s-a)^m$, $m$ is the denominator power, the time power is $m-1$, and the right-sided weight is $C/(m-1)!$. The factorial multiplies the positive integers up to that power, with $0!=1$."
										: term.kind === "sine"
											? "A sine pair has its angular frequency in the numerator. Divide the coefficient by that frequency to obtain the time-domain weight."
											: "The delay multiplier $e^{-ds}$ shifts the entire pair by $d$ in time, including its support. Cosine pairs retain their numerator coefficient on right-sided support.",
									`Apply the selected pair to $${signalTransform(term)}$. ${carried.join(" ")} Check the denominator power or frequency, and any delay multiplier.`,
									`${term.kind === "exponential" ? `The denominator power is $${term.power + 1}$, so the time power is $${term.power + 1}-1=${term.power}$.` : `The delay multiplier here is $${delayLatex(term.delay) || "1"}$, so replace $t$ by $${shiftedTime(term.delay)}$ in the entire pair.`} ${newWeight ? `The numerator coefficient is $${coefficient.toLatex()}$; divide by $${normalizer.toLatex()}$${term.side === "left" ? " and apply the left-sided minus sign" : ""} to obtain the signed weight $${term.amplitude}$.` : "The verified coefficient needs no extra normalization."}`,
									"Check Pair Parameters",
								),
								conclusions: carried,
							} satisfies LaplaceTask,
						]
					: []),
				{
					...teachSignal(
						task(
							`inverse-${index}`,
							`Invert term ${index + 1}`,
							`Invert $${signalTransform(term)}$. Include its supplied support.`,
							"t",
							signalLatex(term),
						),
						term,
					),
					terms: [term],
					conclusions: fields.length ? [] : carried,
				},
			].map((part) => ({
				...part,
				formula: signalTransform(term),
			}));
		}),
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
	const transform = delayedLatex(originalTransform(data), input.delay);
	const response = responseLatex(terms),
		rocLatex = formatRoc(roc, data.poles),
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
						"Unilateral transform using initial conditions",
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
		{
			id: "interpret",
			title: "Verify and Interpret",
			tasks: finalTasks.map((part) =>
				teachRoc(part, data.poles, roc, rocLatex, conditions),
			),
		},
	].filter((stage) => stage.tasks.length);
	if (spec.system)
		for (const stage of stages)
			for (const part of stage.tasks)
				if (part.kind === "t") part.lhs = "h(t)";
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
