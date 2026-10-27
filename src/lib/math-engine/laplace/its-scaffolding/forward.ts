import {
	fraction,
	polynomialLatex,
	rationalLatex,
} from "$lib/math-engine/laplace/algebra";
import { formatRoc } from "$lib/math-engine/laplace/pfd";
import {
	analyzeSignalRoc,
	totalCanceledFactors,
} from "$lib/math-engine/laplace/roc";
import {
	responseLatex,
	signalLatex,
	signalRoc,
	signalTransform,
	validateTerms,
} from "$lib/math-engine/laplace/signals";
import {
	collectTerms,
	type TransformBlock,
	transformBlocks,
	zeroDescription,
} from "$lib/math-engine/laplace/transform";
import type {
	ForwardExercise,
	LaplaceExercise,
	LaplaceSignalTerm,
	LaplaceStage,
} from "$lib/math-engine/laplace/types";
import { verifyLaplaceTime } from "$lib/math-engine/laplace/verification";
import { factorTask, fieldTask, rootList, rootTask, task } from "./shared";
import { supportTasks } from "./support";
import { teaching, teachRoc, teachSignal } from "./teaching";

/** @param blocks - Exact rational blocks. @returns Mandatory cancellation and root analysis for every block. */
export function blockAnalysis(blocks: TransformBlock[]): LaplaceStage {
	return {
		id: "block-analysis",
		title: "Simplify and Analyze Each Rational Block",
		tasks: blocks.flatMap((block, index) =>
			[
				{
					...task(
						`block-${index}-numerator`,
						`Combine block ${index + 1}'s numerator`,
						"Clear the common denominator and enter the resulting numerator polynomial.",
						"s",
						polynomialLatex(block.data.originalNumerator),
					),
					...teaching(
						"Combining fractions means expressing them over the same denominator, then adding their adjusted numerators.",
						`Use $${polynomialLatex(block.data.originalDenominator)}$ as this block's common denominator. Each missing factor multiplies its numerator.`,
						`After adding like powers, the numerator is $${polynomialLatex(block.data.originalNumerator)}$. Check this by multiplying each original fraction by its missing denominator factors.`,
						"Check Combined Numerator",
					),
				},
				factorTask(
					`block-${index}-factor-denominator`,
					"Factor the common denominator",
					block.spec.poles,
					block.data.originalDenominator,
				),
				task(
					"cancellation",
					"Check for common factors",
					"Do numerator and denominator share an exact factor? Near-matching roots do not cancel.",
					"choice",
					block.data.canceled.length
						? "Common factors exist"
						: "No common factors",
					["Common factors exist", "No common factors"],
				),
				{
					...fieldTask(
						`block-${index}-copies-values`,
						"Count exact common copies",
						"Compare this block's numerator and denominator factors and count matching copies only.",
						"\\text{Common copies}={{copies}}",
						[
							{
								id: "copies",
								label: "Number of exact common factor copies",
								target: String(
									block.data.canceled.reduce(
										(sum, factor) =>
											sum + factor.multiplicity,
										0,
									),
								),
							},
						],
					),
					...teaching(
						"A denominator factor cancels only if dividing the numerator by it leaves zero remainder.",
						`Test the factors of $${polynomialLatex(block.data.originalDenominator)}$ against $${polynomialLatex(block.data.originalNumerator)}$. For a linear factor, substitution of its root tests the remainder.`,
						`The factors that divide exactly are ${rootList(block.data.canceled)}. Count matching copies, then stop when a nonzero remainder appears.`,
						"Check Common Copies",
					),
				},
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
				...zeroTasks(block, index),
				rootTask(
					"Identify genuine poles",
					`block-${index}-poles`,
					block.data.poles,
					[],
				),
			].map((part) => ({
				...part,
				id:
					part.id === "cancellation"
						? `block-${index}-cancellation`
						: part.id,
			})),
		),
	};
}

/** @param block - Independently reduced rational block. @param index - Stable block index. @returns Exact zero characterization, including nonrational quadratic roots. */
function zeroTasks(
	block: TransformBlock,
	index: number,
): import("$lib/math-engine/laplace/types").LaplaceTask[] {
	const n = block.data.numerator;
	if (n.length <= 2) {
		const root = n.length === 2 ? n[0]!.negate().divide(n[1]!) : null;
		const result = rootTask(
			"Identify surviving finite zeros",
			`block-${index}-zeros`,
			root
				? [
						{
							real: `${root.numerator}/${root.denominator}`,
							frequency: "0",
							multiplicity: 1,
						},
					]
				: [],
			block.data.poles,
		);
		if (n.length === 1 && !n[0]!.numerator) {
			result.construction.mode = "zero";
			result.answer = "Identically zero; no discrete zero list";
			Object.assign(
				result,
				teaching(
					"The zero polynomial vanishes for every value. It has no discrete root list, whereas a nonzero constant has no roots.",
					"This reduced numerator is exactly zero. Select Identically Zero and leave the finite-root rows empty.",
					"For $0=0$, every value satisfies the equation. Thus this block contributes no finite isolated zeros or genuine poles, and it must not be confused with a nonzero constant numerator.",
					"Check Zero Expression",
				),
			);
		}
		return [result];
	}
	if (n.length === 3) {
		const [c, b, a] = n;
		const discriminant = b!
			.multiply(b!)
			.add(a!.multiply(c!).multiply(fraction(-4)));
		return [
			{
				...fieldTask(
					`block-${index}-zero-formula-values`,
					"Construct the exact quadratic roots",
					"Enter the signed linear coefficient, discriminant, and twice the leading coefficient from this reduced numerator.",
					"s=\\frac{-({{b}})\\pm\\sqrt{ {{disc}} }}{ {{twoa}} }",
					[
						{
							id: "b",
							label: "Signed linear coefficient b",
							target: b!.toLatex(),
						},
						{
							id: "disc",
							label: "Discriminant b squared minus four a c",
							target: discriminant.toLatex(),
						},
						{
							id: "twoa",
							label: "Twice the leading coefficient",
							target: a!.multiply(fraction(2)).toLatex(),
						},
					],
				),
				...teaching(
					"The quadratic formula solves $as^2+bs+c=0$, including roots that cannot be written as rational numbers.",
					`For $${polynomialLatex(n)}=0$, read $a=${a!.toLatex()}$, $b=${b!.toLatex()}$, and $c=${c!.toLatex()}$. Compute $b^2-4ac$ before taking its square root.`,
					`Here the discriminant is $(${b!.toLatex()})^2-4(${a!.toLatex()})(${c!.toLatex()})=${discriminant.toLatex()}$. A negative discriminant produces a conjugate pair; zero gives one root of multiplicity two.`,
					"Check Quadratic Roots",
				),
			},
		];
	}
	return [
		{
			...task(
				`block-${index}-numerator`,
				"Construct the finite-zero equation",
				"Enter the reduced numerator polynomial whose zero set defines the finite zeros. Higher-degree roots may lie outside rational-location entry.",
				"s",
				polynomialLatex(n),
			),
			id: `block-${index}-zero-equation`,
			...teaching(
				"Finite zeros are exactly the roots of the reduced numerator. An exact defining polynomial can characterize algebraic roots without decimal approximations.",
				`Set $${polynomialLatex(n)}=0$, using the reduced numerator rather than the denominator.`,
				`${zeroDescription(n)}. This equation describes the full zero set, including multiplicities, without claiming that its roots are rational.`,
				"Check Zero Equation",
			),
		},
	];
}

/** @param input - Forward configuration. @returns Exact transform workflow. */
export function createForwardExercise(input: ForwardExercise): LaplaceExercise {
	const spec = structuredClone(input),
		terms = collectTerms(validateTerms(spec.terms));
	const originalBlocks = transformBlocks(terms);
	const practice = forwardPracticeTerms(terms, originalBlocks);
	const blocks = practice.rewritten
		? transformBlocks(practice.terms)
		: originalBlocks;
	const transform = practice.terms.map(signalTransform).join("+") || "0",
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
		...(practice.rewritten
			? [supportRewriteStage(terms, practice.terms)]
			: []),
		{
			id: "separate",
			title: "Separate Signal Terms",
			tasks: practice.terms.map((term, index) =>
				teachSignal(
					task(
						`forward-family-${index}`,
						`Identify signal term ${index + 1}`,
						`Classify $${signalLatex(term)}$.`,
						"choice",
						term.kind,
						["exponential", "cosine", "sine", "impulse"],
					),
					term,
				),
			),
		},
		{
			id: "transform",
			title: "Apply Pairs, Parameters, and Delays",
			tasks: practice.terms.flatMap((term, index) => [
				task(
					`forward-delay-${index}`,
					`Identify delay ${index + 1}`,
					"A delay $d$ produces the factor $e^{-ds}$.",
					"scalar",
					term.delay,
				),
				teachSignal(
					task(
						`forward-pair-${index}`,
						`Transform term ${index + 1}`,
						`Find the transform of $${signalLatex(term)}$, retaining its weight and delay.`,
						"s",
						signalTransform(term),
					),
					term,
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
				teachRoc(
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
					poles,
					roc,
					rocLatex,
					`The given signal is $${response}$. Combine identical modes and check both infinite time tails.`,
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
			originalBlocks.map((block) => block.spec.poles),
			poles,
		),
		roc,
		rocLatex,
		stable: false,
		stages,
	};
}

/** @param terms - Original complete signal. @param blocks - Algebraic blocks selected using the proved global ROC. @returns Individually transformable practice terms, with an independent time-identity check when rewriting is necessary. */
function forwardPracticeTerms(
	terms: LaplaceSignalTerm[],
	blocks: TransformBlock[],
): { terms: LaplaceSignalTerm[]; rewritten: boolean } {
	try {
		signalRoc(terms);
		return { terms, rewritten: false };
	} catch {
		const combined = collectTerms(blocks.flatMap((block) => block.terms));
		signalRoc(combined);
		if (
			verifyLaplaceTime(responseLatex(combined), terms).status !==
			"correct"
		)
			throw new Error(
				"The combined support could not be verified exactly within the supported signal families.",
			);
		return { terms: combined, rewritten: true };
	}
}

/** @param original - Given supported terms. @param combined - Independently verified common-ROC representation. @returns Support combination before applying termwise transform pairs. */
function supportRewriteStage(
	original: LaplaceSignalTerm[],
	combined: LaplaceSignalTerm[],
): LaplaceStage {
	return {
		id: "combine-support",
		title: "Combine Time Support Before Transforming",
		tasks: supportTasks(original, combined),
	};
}
