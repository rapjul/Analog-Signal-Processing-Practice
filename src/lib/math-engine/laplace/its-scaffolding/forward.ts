import { polynomialLatex, rationalLatex } from "../algebra";
import { formatRoc } from "../pfd";
import { analyzeSignalRoc, totalCanceledFactors } from "../roc";
import {
	responseLatex,
	signalLatex,
	signalTransform,
	validateTerms,
} from "../signals";
import {
	collectTerms,
	type TransformBlock,
	transformBlocks,
	zeroDescription,
} from "../transform";
import type { ForwardExercise, LaplaceExercise, LaplaceStage } from "../types";
import { rootList, task } from "./shared";

/** @param blocks - Exact rational blocks. @returns Mandatory cancellation and root analysis for every block. */
export function blockAnalysis(blocks: TransformBlock[]): LaplaceStage {
	return {
		id: "block-analysis",
		title: "Simplify and Analyze Each Rational Block",
		tasks: blocks.flatMap((block, index) => [
			task(
				`block-${index}-numerator`,
				`Combine block ${index + 1}'s numerator`,
				"Clear the common denominator and enter the resulting numerator polynomial.",
				"s",
				polynomialLatex(block.data.originalNumerator),
			),
			task(
				`block-${index}-cancellation`,
				"Check for common factors",
				"Do numerator and denominator share an exact factor? Near-matching roots do not cancel.",
				"choice",
				block.data.canceled.length
					? "Common factors exist"
					: "No common factors",
				["Common factors exist", "No common factors"],
			),
			task(
				`block-${index}-reduced`,
				"Write the reduced rational block",
				"Cancel matching copies only. Delay exponentials are retained outside this rational block.",
				"s",
				rationalLatex({
					n: block.data.numerator,
					d: block.data.denominator,
				}),
			),
			task(
				`block-${index}-zeros`,
				"Identify surviving finite zeros",
				"Solve the reduced numerator equation. Zeros do not set the ROC boundaries.",
				"choice",
				zeroDescription(block.data.numerator),
				[
					zeroDescription(block.data.numerator),
					rootList(block.data.poles),
					"All original denominator roots are zeros",
				],
			),
			task(
				`block-${index}-poles`,
				"Identify genuine poles",
				"Use reduced denominator roots and their remaining multiplicities.",
				"choice",
				rootList(block.data.poles),
				[
					rootList(block.data.poles),
					"Keep canceled denominator roots",
					"Poles are the numerator roots",
				],
			),
		]),
	};
}

/** @param input - Forward configuration. @returns Exact transform workflow. */
export function createForwardExercise(input: ForwardExercise): LaplaceExercise {
	const spec = structuredClone(input),
		terms = collectTerms(validateTerms(spec.terms));
	const blocks = transformBlocks(terms);
	const transform = terms.map(signalTransform).join("+") || "0",
		response = responseLatex(terms);
	const { bounds: roc, poles } = analyzeSignalRoc(terms);
	const rocLatex = formatRoc(roc, poles);
	const stages: LaplaceStage[] = [
		{
			id: "convention",
			title: "Understand the Forward Transform",
			tasks: [
				task(
					"forward-convention",
					"Choose the forward convention",
					"The time signal includes explicit support. Transform every term with its stated sidedness.",
					"choice",
					"Bilateral transform with supplied support",
					[
						"Bilateral transform with supplied support",
						"Discard the signal support",
					],
				),
			],
		},
		{
			id: "separate",
			title: "Separate Signal Terms",
			tasks: spec.terms.map((term, index) =>
				task(
					`forward-family-${index}`,
					`Identify signal term ${index + 1}`,
					`Classify $${signalLatex(term)}$.`,
					"choice",
					term.kind,
					["exponential", "cosine", "sine", "impulse"],
				),
			),
		},
		{
			id: "transform",
			title: "Apply Pairs, Parameters, and Delays",
			tasks: spec.terms.flatMap((term, index) => [
				task(
					`forward-delay-${index}`,
					`Identify delay ${index + 1}`,
					"A delay $d$ produces the factor $e^{-ds}$.",
					"scalar",
					term.delay,
				),
				task(
					`forward-pair-${index}`,
					`Transform term ${index + 1}`,
					`Find the transform of $${signalLatex(term)}$, retaining its weight and delay.`,
					"s",
					signalTransform(term),
				),
			]),
		},
		blockAnalysis(blocks),
		{
			id: "combine",
			title: "Assemble the Transform",
			tasks: [
				task(
					"forward-final",
					"Combine the verified terms",
					"Preserve different delay factors. A sum with different delays need not have a finite polynomial zero list.",
					"s",
					transform,
				),
			],
		},
		{
			id: "roc",
			title: "Verify the Region of Convergence",
			tasks: [
				task(
					"forward-roc",
					"Determine the maximal convergence region",
					"Combine equal modes across delays and check both infinite tails. Finite-duration sums can have the whole plane as their ROC, even when individual terms have poles.",
					"choice",
					`$${rocLatex}$`,
					[
						`$${rocLatex}$`,
						"All poles belong to the ROC",
						"The zeros determine the ROC",
					],
				),
			],
		},
	].filter((stage) => stage.tasks.length);
	return {
		spec,
		prompt: `x(t)=${response}`,
		conditions:
			"Find the bilateral transform and its ROC. Signal supports are given explicitly.",
		transform,
		response,
		terms,
		poles,
		canceled: totalCanceledFactors(
			blocks.map((block) => block.spec.poles),
			poles,
		),
		roc,
		rocLatex,
		stable: false,
		stages,
	};
}
