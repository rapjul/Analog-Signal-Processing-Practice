/** Step 5 derivatives and coefficient matching derived from structured trial functions. */
import { toFractionLatex } from "../../fraction";
import { shuffleWithRandom } from "../../random";
import { finiteOdeValue, normalizeOdeForcing } from "../numerics";
import type {
	ForcingFunction,
	OdeItsOption,
	OdeItsStep5,
	OdeOrder,
	ParticularSolution,
} from "../types";
import {
	combineTrialTerms,
	differentiateTrial,
	formatTrial,
	type TrialTerm,
	trialSignature,
	uniqueOdeOptions,
} from "./trial-algebra";

/** Inputs for the undetermined-coefficient teaching pipeline. */
export interface BuildStep5Params {
	/** Differential order. */
	resolvedOrder: OdeOrder;
	/** Second derivative coefficient. */
	a2: number;
	/** First derivative coefficient. */
	a1: number;
	/** Zero derivative coefficient. */
	a0: number;
	/** Input descriptor. */
	forcing: ForcingFunction;
	/** Analytical particular solution. */
	particular: ParticularSolution;
	/** Seeded random source. */
	random: () => number;
}

/**
 * Scales a structured expression without modifying its basis.
 * @param terms - Original expression.
 * @param scale - Multiplier.
 * @returns Scaled terms.
 */
function scaleTrial(terms: TrialTerm[], scale: number): TrialTerm[] {
	return terms.map(
		/** Scales one term. @param term - Original term. */ (term) => ({
			...term,
			coefficient: term.coefficient * scale,
		}),
	);
}

/**
 * Builds choices by applying algebraic mistakes to a correct derivative.
 * @param terms - Correct derivative.
 * @param rate - Exponential rate.
 * @param frequency - Angular frequency.
 * @param derivative - Derivative order for labels and identifiers.
 * @param trial - Original trial for missing-rule distractors.
 * @returns Distinct symbolic derivative choices.
 */
function derivativeChoices(
	terms: TrialTerm[],
	rate: number,
	frequency: number,
	derivative: 1 | 2,
	trial: TrialTerm[],
): OdeItsOption[] {
	const prefix = derivative === 1 ? "y_p'(t)" : "y_p''(t)";
	const constantTrial =
		rate === 0 &&
		trial.every(
			/** Identifies a constant basis. @param term - Trial term. */
			(term) => term.power === 0 && term.harmonic === "plain",
		);
	const candidates = [
		{
			id: `d${derivative}_correct`,
			terms,
			isCorrect: true,
			feedback: undefined,
		},
		{
			id: `d${derivative}_sign`,
			terms: scaleTrial(terms, -1),
			isCorrect: false,
			feedback:
				"Check the derivative signs, including the product and chain rules.",
		},
		{
			id: `d${derivative}_missing_factor`,
			terms: trial,
			isCorrect: false,
			feedback:
				"Differentiate the trial function; retain every product-rule and chain-rule contribution.",
		},
		{
			id: `d${derivative}_extra_term`,
			terms: [
				...terms,
				{
					coefficient: 1,
					symbol: "K_p" as const,
					power: constantTrial ? derivative : 0,
					harmonic: "plain" as const,
				},
			],
			isCorrect: false,
			feedback:
				"An extra term has been introduced. Differentiate each term separately.",
		},
	];
	// Trigonometric trials use A and B throughout; do not invent a third unknown.
	const extraCandidate = candidates[3];
	if (
		extraCandidate &&
		trial.some(
			/** Detects the harmonic trial. @param term - Trial term. */ (
				term,
			) => term.harmonic !== "plain",
		)
	)
		extraCandidate.terms = [
			...terms,
			{ coefficient: 1, symbol: "A", power: 0, harmonic: "cos" },
		];
	return uniqueOdeOptions(
		// Supply a distinct sign mistake even when an omitted factor happens to equal one.
		[
			...candidates,
			{
				id: `d${derivative}_partial_sign`,
				terms: terms.map(
					/** Flips only the first unknown's terms. @param term - Derivative term. */ (
						term,
					) => ({
						...term,
						coefficient:
							term.coefficient * (term.symbol === "A" ? -1 : 1),
					}),
				),
				isCorrect: false,
				feedback:
					"Check the signs of every differentiated trigonometric term.",
			},
		].map(
			/** Formats a structured candidate. @param candidate - Derivative choice. */ (
				candidate,
			) => ({
				id: candidate.id,
				isCorrect: candidate.isCorrect,
				feedback: candidate.feedback,
				latex: `${prefix} = ${formatTrial(candidate.terms, rate, frequency)}`,
				coefficients: trialSignature(candidate.terms),
			}),
		),
	).slice(0, 4);
}

/**
 * Derives the normalized trial and original-equation substitution.
 * @param params - ODE coefficients, normalized input, and solved particular response.
 * @returns Shared mathematical expressions for rendering and grading.
 */
function buildTrialContext(params: BuildStep5Params) {
	const { resolvedOrder, a2, a1, a0, particular } = params;
	const forcing = normalizeOdeForcing(params.forcing);
	const rate =
		forcing.type === "exponential"
			? finiteOdeValue(forcing.p ?? Number.NaN, "Exponential rate")
			: 0;
	const frequency =
		forcing.type === "sinusoid"
			? finiteOdeValue(
					forcing.omega ?? Number.NaN,
					"Sinusoidal frequency",
				)
			: 1;
	const power = particular.resonanceMultiplicity;
	const trial: TrialTerm[] =
		forcing.type === "sinusoid"
			? [
					{ coefficient: 1, symbol: "A", power, harmonic: "cos" },
					{ coefficient: 1, symbol: "B", power, harmonic: "sin" },
				]
			: [{ coefficient: 1, symbol: "K_p", power, harmonic: "plain" }];
	const first = differentiateTrial(trial, rate, frequency);
	const second = differentiateTrial(first, rate, frequency);
	const substituted = combineTrialTerms([
		...scaleTrial(trial, a0),
		...scaleTrial(first, a1),
		...scaleTrial(second, resolvedOrder === 2 ? a2 : 0),
	]);
	const rhs: TrialTerm = {
		coefficient: -forcing.K,
		symbol: "input",
		power: 0,
		harmonic: forcing.type === "sinusoid" ? "cos" : "plain",
	};
	const equation = [...substituted, rhs];
	return {
		...params,
		forcing,
		rate,
		frequency,
		power,
		trial,
		first,
		second,
		substituted,
		rhs,
		equation,
	};
}

/**
 * Matches the independent basis functions in a substituted trial equation.
 * @param equation - Structured terms with the forcing moved to the left.
 * @returns Scalar equation or simultaneous system in LaTeX.
 */
function formatCoefficientSystem(equation: TrialTerm[]): string {
	const rows = new Map<string, TrialTerm[]>();
	for (const term of equation) {
		const key = `${term.harmonic}:${term.power}`;
		rows.set(key, [...(rows.get(key) ?? []), term]);
	}
	const equations: string[] = [];
	for (const terms of rows.values()) {
		const left = terms
			.filter(
				/** Selects unknown coefficients. @param term - Equation term. */ (
					term,
				) => term.symbol !== "input",
			)
			.map(
				/** Removes the matched basis function. @param term - Unknown coefficient. */ (
					term,
				) => ({ ...term, power: 0, harmonic: "plain" as const }),
			);
		const target = -terms
			.filter(
				/** Selects the input amplitude. @param term - Equation term. */ (
					term,
				) => term.symbol === "input",
			)
			.reduce(
				/** Adds known terms. @param sum - Accumulator. @param term - Input term. */ (
					sum,
					term,
				) => sum + term.coefficient,
				0,
			);
		equations.push(`${formatTrial(left)} = ${toFractionLatex(target)}`);
	}
	return equations.length === 1
		? equations.join("")
		: `\\begin{cases} ${equations.join(" \\\\ ")} \\end{cases}`;
}

/**
 * Formats and signs a coefficient-system choice from one shared set of terms.
 * @param id - Stable choice identifier.
 * @param terms - Equation terms with the input moved to the left.
 * @param isCorrect - Whether this is the original substituted equation.
 * @param feedback - Explanation for an incorrect equation.
 * @returns Display and mathematical signature derived from identical terms.
 */
function coefficientSystemChoice(
	id: string,
	terms: TrialTerm[],
	isCorrect: boolean,
	feedback?: string,
): OdeItsOption {
	return {
		id,
		latex: formatCoefficientSystem(terms),
		isCorrect,
		...(feedback === undefined ? {} : { feedback }),
		coefficients: trialSignature(terms, true),
	};
}

/**
 * Builds distinct coefficient-matching choices from the same trial equation.
 * @param context - Normalized trial and substituted equation.
 * @returns Shuffled mathematical choices with a single correct answer.
 */
function buildSystemChoices(
	context: ReturnType<typeof buildTrialContext>,
): OdeItsOption[] {
	const { forcing, trial, a0, substituted, rhs, equation, random } = context;
	const systemCandidates: OdeItsOption[] = [
		coefficientSystemChoice("sys_correct", equation, true),
		coefficientSystemChoice(
			"sys_wrong_target",
			[...substituted, { ...rhs, coefficient: forcing.K }],
			false,
			"Match the sign and amplitude of the original forcing input.",
		),
		coefficientSystemChoice(
			"sys_missing_derivatives",
			[...scaleTrial(trial, a0), rhs],
			false,
			"Include the contributions of all derivatives in the original ODE.",
		),
		coefficientSystemChoice(
			"sys_extra_input",
			[...substituted, { ...rhs, coefficient: -(forcing.K + 1) }],
			false,
			"The coefficient on the right must match the original forcing amplitude.",
		),
	];
	// Keep the existing five-choice harmonic layout without reintroducing equivalent equations.
	for (
		let offset = 2;
		offset <= 5 && uniqueOdeOptions(systemCandidates).length < 5;
		offset++
	) {
		const amplitude = forcing.K + offset;
		systemCandidates.push(
			coefficientSystemChoice(
				`sys_amplitude_${offset}`,
				[...substituted, { ...rhs, coefficient: -amplitude }],
				false,
				"Match the original forcing amplitude when equating coefficients.",
			),
		);
	}
	return shuffleWithRandom(
		uniqueOdeOptions(systemCandidates).slice(0, 5),
		random,
	);
}

/**
 * Builds derivatives, substitution equations, hints, and unambiguous choices.
 * @param params - ODE coefficients, input, and solved particular response.
 * @returns Order-specific teaching metadata.
 */
export function buildStep5Data(params: BuildStep5Params): OdeItsStep5 {
	const context = buildTrialContext(params);
	const {
		resolvedOrder,
		a2,
		a1,
		a0,
		particular,
		random,
		forcing,
		rate,
		frequency,
		power,
		trial,
		first,
		second,
		equation,
	} = context;
	const systemLatex = formatCoefficientSystem(equation);
	const firstDerivLatex = `y_p'(t) = ${formatTrial(first, rate, frequency)}`;
	const substitutionLatex = `${resolvedOrder === 2 ? `${toFractionLatex(a2)}\\left(${formatTrial(second, rate, frequency)}\\right) + ` : ""}${toFractionLatex(a1)}\\left(${formatTrial(first, rate, frequency)}\\right) + ${toFractionLatex(a0)}\\left(${formatTrial(trial, rate, frequency)}\\right) = ${forcing.latex}`;
	const secondDerivLatex = `y_p''(t) = ${formatTrial(second, rate, frequency)}`;
	const firstDerivativeOptions = shuffleWithRandom(
		derivativeChoices(first, rate, frequency, 1, trial),
		random,
	);
	const secondDerivativeOptions = shuffleWithRandom(
		derivativeChoices(second, rate, frequency, 2, trial),
		random,
	);
	const systemOptions = buildSystemChoices(context);
	const solved =
		forcing.type === "sinusoid"
			? `$A = ${toFractionLatex(particular.coeffs.A ?? 0)}, \\quad B = ${toFractionLatex(particular.coeffs.B ?? 0)}$.`
			: `$K_p = ${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`;
	const derivativeHint =
		power > 0
			? "Apply the product rule to the resonance multiplier and every remaining factor."
			: forcing.type === "constant"
				? "The derivative of a constant is zero."
				: "Apply the chain rule, retaining the input rate or angular frequency.";
	const common = {
		expectedKp: particular.coeffs.Kp,
		expectedA: particular.coeffs.A,
		expectedB: particular.coeffs.B,
		firstDerivativeOptions,
		derivativeOptions: firstDerivativeOptions,
		systemOptions,
		firstDerivLatex,
		derivativesLatex:
			resolvedOrder === 1
				? firstDerivLatex
				: `${firstDerivLatex}, \\quad ${secondDerivLatex}`,
		systemLatex,
		substitutionLatex,
		hints: [
			"Differentiate the trial solution before substituting into the original ODE.",
			`Match coefficients: $${systemLatex}$.`,
			`Solve the resulting equation(s): ${solved}`,
		],
		subStepHints: {
			first_deriv: [
				"Differentiate the trial solution once.",
				derivativeHint,
				`$${firstDerivLatex}$`,
			],
			second_deriv: [
				"Differentiate the first derivative once more.",
				derivativeHint,
				`$${secondDerivLatex}$`,
			],
			system_setup: [
				"Substitute the trial and its derivatives, retaining the ODE coefficients.",
				"Match coefficients of each independent basis function.",
				`$${systemLatex}$`,
			],
			solve: [
				"Solve the coefficient-matching equation(s).",
				`Use $${systemLatex}$.`,
				`Coefficients: ${solved}`,
			],
		},
	};
	return resolvedOrder === 1
		? common
		: { ...common, secondDerivativeOptions, secondDerivLatex };
}
