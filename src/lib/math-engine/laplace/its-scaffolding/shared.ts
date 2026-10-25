import { polynomialLatex, rationalLatex, zero } from "../algebra";
import type { LaplaceDecomposition } from "../pfd";
import type { LaplaceFactor, LaplaceStage, LaplaceTask } from "../types";

/** @param id - Stable ID. @param title - Heading. @param prompt - Question. @param kind - Control. @param answer - Exact target. @param choices - Options. @returns Checked task. */
export function task(
	id: string,
	title: string,
	prompt: string,
	kind: LaplaceTask["kind"],
	answer: string,
	choices?: string[],
): LaplaceTask {
	return {
		id,
		title,
		prompt,
		kind,
		answer,
		...(choices ? { choices: [...new Set(choices)] } : {}),
		hints: [
			"Identify the applicable rule before calculating.",
			`Use your verified earlier work. ${prompt}`,
			`Worked guidance: ${kind === "choice" ? answer : `$${answer}$`}. Check your answer to continue.`,
		],
	};
}

/** @param factors - Roots with multiplicities. @returns Explicit root list. */
export function rootList(factors: LaplaceFactor[]): string {
	return factors.length
		? factors
				.map(
					(factor) =>
						`$${factor.real}${factor.frequency !== "0" ? `\\pm j(${factor.frequency})` : ""}$ (multiplicity ${factor.multiplicity})`,
				)
				.join("; ")
		: "No finite roots";
}

/** @param title - Heading. @param id - Stable ID. @param factors - Roots. @param other - Distractor. @returns Root-set question. */
function rootTask(
	title: string,
	id: string,
	factors: LaplaceFactor[],
	other: LaplaceFactor[],
): LaplaceTask {
	const answer = rootList(factors);
	return task(
		id,
		title,
		"Identify every root and its multiplicity. Distinguish numerator roots from denominator roots.",
		"choice",
		answer,
		[
			answer,
			rootList(other),
			"No finite roots",
			"All original roots remain despite cancellation",
		],
	);
}

/** @param data - Exact analysis. @param originalZeros - Numerator factors. @param originalPoles - Denominator factors. @returns Mandatory rational analysis. */
export function analysisStage(
	data: LaplaceDecomposition,
	originalZeros: LaplaceFactor[],
	originalPoles: LaplaceFactor[],
): LaplaceStage {
	const tasks: LaplaceTask[] = [
		task(
			"factor-numerator",
			"Factor the numerator",
			"Enter an equivalent numerator. Identify its factors before continuing.",
			"s",
			polynomialLatex(data.originalNumerator),
		),
		rootTask(
			"Identify original numerator roots",
			"original-zeros",
			originalZeros,
			originalPoles,
		),
		task(
			"factor-denominator",
			"Factor the denominator",
			"Enter an equivalent denominator and identify its factors.",
			"s",
			polynomialLatex(data.originalDenominator),
		),
		rootTask(
			"Identify original denominator roots",
			"original-poles",
			originalPoles,
			originalZeros,
		),
		task(
			"cancellation",
			"Check for common factors",
			"Do numerator and denominator share an exact factor? Near-matching roots do not cancel.",
			"choice",
			data.canceled.length ? "Common factors exist" : "No common factors",
			["Common factors exist", "No common factors"],
		),
	];
	if (data.canceled.length) {
		tasks.push(
			rootTask(
				"Identify canceled factors and copies",
				"canceled-factors",
				data.canceled,
				originalPoles,
			),
		);
		tasks.push(
			task(
				"reduced-expression",
				"Write the reduced expression",
				"Cancel matching copies only; enter the resulting rational expression.",
				"s",
				rationalLatex({ n: data.numerator, d: data.denominator }),
			),
		);
	}
	if (zero(data.numerator))
		tasks.push(
			task(
				"zero-transform",
				"Recognize the zero transform",
				"An identically zero numerator has no discrete zero list.",
				"choice",
				"Identically zero; no finite poles",
				[
					"Identically zero; no finite poles",
					"All original denominator roots are poles",
				],
			),
		);
	else
		tasks.push(
			rootTask(
				"Identify surviving zeros",
				"surviving-zeros",
				data.zeros,
				originalZeros,
			),
		);
	tasks.push(
		rootTask(
			"Identify genuine poles",
			"surviving-poles",
			data.poles,
			originalPoles,
		),
	);
	if (
		data.numerator.length >= data.denominator.length &&
		!zero(data.numerator)
	)
		tasks.push(
			task(
				"quotient",
				"Find the polynomial quotient",
				"Divide before PFD. A constant quotient becomes a Dirac impulse.",
				"scalar",
				data.quotient,
			),
		);
	return {
		id: "analysis",
		title: "Analyze Zeros, Poles, and Cancellations",
		tasks,
	};
}

/** @param data - Verified PFD. @returns Setup, coefficient, and reconstruction stages. */
export function decompositionStages(
	data: LaplaceDecomposition,
): LaplaceStage[] {
	if (!data.slots.length) return [];
	return [
		{
			id: "setup",
			title: "Set Up Partial Fractions",
			tasks: [
				task(
					"template",
					"Choose the complete PFD template",
					"Include every repeated-factor power and linear numerators over quadratics.",
					"choice",
					`Use $${data.template}$`,
					[
						`Use $${data.template}$`,
						"Keep one constant over the original denominator",
						"Use only the highest power of each repeated factor",
					],
				),
			],
		},
		{
			id: "coefficients",
			title: "Calculate Each Coefficient",
			tasks: data.slots.map((slot) => ({
				...task(
					`coefficient-${slot.label}`,
					`Calculate $${slot.label}$`,
					`For $\\frac{${slot.label}(${polynomialLatex(slot.basis)})}{${polynomialLatex(slot.denominator)}}$, use cover-up for a simple real pole; otherwise clear denominators and match coefficients.`,
					"scalar",
					slot.value,
				),
				formula: `N(s)=D(s)\\left(${data.template}\\right)`,
			})),
		},
		{
			id: "reconstruct",
			title: "Verify the Decomposition",
			tasks: [
				task(
					"reconstruction",
					"Recombine the fractions",
					"Enter your PFD sum, including any constant quotient. It must reconstruct the reduced transform.",
					"s",
					rationalLatex({ n: data.numerator, d: data.denominator }),
				),
			],
		},
	];
}
