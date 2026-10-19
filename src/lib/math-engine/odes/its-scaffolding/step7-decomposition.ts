/**
 * Step 7 Response Decomposition ITS Scaffolding Builder.
 *
 * Formulates the Zero-Input ($y_{ZI}$) vs Zero-State ($y_{ZS}$) dual decomposition,
 * Transient ($y_{tr}$) vs Steady-State ($y_{ss}$) classification options,
 * and randomized conceptual mastery question pools.
 */

import { formatExpTerm, formatSignedLinearTerm } from "../../formatting";
import { toFractionLatex } from "../../fraction";
import { randomChoice, shuffleWithRandom } from "../../random";
import type {
	FirstOrderOdeItsStep7,
	HomogeneousSolution,
	OdeDecompositionMode,
	OdeItsConceptQuestion,
	OdeItsOption,
	OdeItsStep7,
	OdeOrder,
	OdeProblem,
	ParticularSolution,
	SecondOrderOdeItsStep7,
	SecondOrderRootType,
} from "../types";
import { uniqueOdeOptions } from "./trial-algebra";

/**
 * Concept questions pool for testing fundamental signal processing theory.
 */
export const CONCEPT_QUESTIONS_POOL: OdeItsConceptQuestion[] = [
	{
		prompt: "Why can the Zero-State response $y_{ZS}(t)$ contain natural homogeneous modes in addition to the particular solution?",
		options: [
			{
				id: "cq1_opt1",
				latex: String.raw`\text{Natural modes are needed to satisfy the zero initial state } y(0^-)=0 \text{ alongside the forced response.}`,
				isCorrect: true,
			},
			{
				id: "cq1_opt2",
				latex: String.raw`\text{The forcing function } x(t) \text{ always contains the natural frequencies of the system.}`,
				isCorrect: false,
				feedback:
					"The input $x(t)$ is externally chosen and does not automatically contain the system's natural frequencies.",
			},
			{
				id: "cq1_opt3",
				latex: String.raw`y_{ZS}(t) \text{ is identical to the unforced Zero-Input response } y_{ZI}(t).`,
				isCorrect: false,
				feedback:
					"$y_{ZI}(t)$ has no forcing ($x(t)=0$) and satisfies initial conditions, while $y_{ZS}(t)$ has forcing with zero initial conditions.",
			},
		],
		explanation:
			"The particular solution or its derivatives may be non-zero initially. Homogeneous modes cancel those offsets to impose a zero initial state. If the particular solution already satisfies every zero initial condition, no homogeneous correction is needed.",
	},
	{
		prompt: "Under what condition does the total response $y(t)$ equal the Zero-State response $y_{ZS}(t)$?",
		options: [
			{
				id: "cq2_opt1",
				latex: String.raw`\text{When all initial conditions are zero: } y(0^-) = 0, \; y'(0^-) = 0`,
				isCorrect: true,
			},
			{
				id: "cq2_opt2",
				latex: String.raw`\text{When the forcing function is turned off: } x(t) = 0`,
				isCorrect: false,
				feedback:
					"When $x(t) = 0$, $y_{ZS}(t) = 0$ and the total response equals the Zero-Input response $y_{ZI}(t)$.",
			},
			{
				id: "cq2_opt3",
				latex: String.raw`\text{When the system has repeated real roots}`,
				isCorrect: false,
				feedback:
					"Root multiplicity affects the shape of natural modes, not the zero-state condition.",
			},
		],
		explanation:
			"By definition, the Zero-Input response $y_{ZI}(t)$ depends linearly on the initial state. When $y(0^-)=0$ and $y'(0^-)=0$, $y_{ZI}(t) = 0$, so $y(t) = y_{ZI}(t) + y_{ZS}(t) = y_{ZS}(t)$.",
	},
	{
		prompt: "For a stable system with characteristic roots $\\operatorname{Re}(r_i) < 0$, what happens to the transient response $y_{tr}(t)$ as $t \\to \\infty$?",
		options: [
			{
				id: "cq3_opt1",
				latex: String.raw`\displaystyle \lim_{t \to \infty} y_{tr}(t) = 0 \quad (\text{all natural modes decay to zero})`,
				isCorrect: true,
			},
			{
				id: "cq3_opt2",
				latex: String.raw`\displaystyle \lim_{t \to \infty} y_{tr}(t) = y_p(t)`,
				isCorrect: false,
				feedback:
					"Transient means a component that tends to zero. A decaying particular solution can also contribute to the transient response.",
			},
			{
				id: "cq3_opt3",
				latex: String.raw`\displaystyle \lim_{t \to \infty} y_{tr}(t) = y(0^-)`,
				isCorrect: false,
				feedback: String.raw`Initial conditions dictate the starting values at $t=0$, not the asymptotic limit at $t \to \infty$.`,
			},
		],
		explanation: String.raw`Transient components tend to zero. Negative-real-part roots make homogeneous modes decay, and a decaying exponential input also produces a decaying particular response, including resonance terms such as $te^{-\alpha t}$.`,
	},
	{
		prompt: String.raw`If the forcing function $x(t)$ is replaced by a different input signal $\tilde{x}(t)$, which response component is guaranteed to remain strictly identical?`,
		options: [
			{
				id: "cq4_opt1",
				latex: String.raw`\text{The Zero-Input response } y_{ZI}(t)`,
				isCorrect: true,
			},
			{
				id: "cq4_opt2",
				latex: String.raw`\text{The Zero-State response } y_{ZS}(t)`,
				isCorrect: false,
				feedback:
					"The Zero-State response $y_{ZS}(t)$ is driven directly by the forcing input $x(t)$, so changing $x(t)$ changes $y_{ZS}(t)$.",
			},
			{
				id: "cq4_opt3",
				latex: String.raw`\text{The particular solution } y_p(t)`,
				isCorrect: false,
				feedback:
					"The particular solution $y_p(t)$ is derived directly from the shape and amplitude of the forcing function $x(t)$.",
			},
			{
				id: "cq4_opt4",
				latex: String.raw`\text{The complete response } y(t)`,
				isCorrect: false,
				feedback:
					"Since $y(t) = y_{ZI}(t) + y_{ZS}(t)$, changing $x(t)$ alters $y_{ZS}(t)$ and therefore changes $y(t)$.",
			},
		],
		explanation:
			"The Zero-Input response $y_{ZI}(t)$ describes how the system relaxes from its initial state with the input set to zero ($x(t) = 0$). It depends exclusively on system dynamics and initial conditions, making it completely independent of $x(t)$.",
	},
];

/**
 * Parameters required to build Step 7 ITS data.
 */
export interface BuildStep7Params {
	/** Existing decay classification retained for scaffold API compatibility. */
	particularDecays?: boolean;
	/** Teaching split; omitted for compatibility with existing scaffold callers. */
	decompositionMode?: OdeDecompositionMode;
	/** Differential equation order (1 or 2) */
	resolvedOrder: OdeOrder;
	/** Root classification type */
	resolvedRootType: SecondOrderRootType;
	/** Characteristic roots */
	roots: { r1: number; r2?: number; im?: number };
	/** Problem initial conditions */
	initialConditions: OdeProblem["initialConditions"];
	/** Zero-Input homogeneous solution */
	homogeneousZI: HomogeneousSolution;
	/** Zero-State homogeneous solution */
	homogeneousZS: HomogeneousSolution;
	/** Complete response homogeneous solution */
	homogeneousComplete: HomogeneousSolution;
	/** Particular solution computation results */
	particular: ParticularSolution;
	/** Zero-Input solution LaTeX */
	ziLatex: string;
	/** Zero-State solution LaTeX */
	zsLatex: string;
	/** Transient response LaTeX */
	y_tr_latex: string;
	/** Steady-state response LaTeX */
	y_ss_latex: string;
	/** Seeded random number generator */
	random: () => number;
}

/**
 * Result structure of Step 7 scaffolding generation.
 */
export interface Step7ScaffoldingResult {
	/** Zero-Input initial conditions system LaTeX */
	ziSystemLatex: string;
	/** Selected randomized concept question */
	selectedConceptQ: OdeItsConceptQuestion;
	/** Step 7 ITS metadata */
	step7Data: OdeItsStep7;
}

/**
 * Selects consistent symbols, expressions, and hints for the decomposition.
 * @param params - Solved responses and teaching mode.
 * @returns Shared interpretation used by both response-choice sets.
 */
function decompositionPresentation(params: BuildStep7Params) {
	const { homogeneousComplete, particular, y_tr_latex, y_ss_latex } = params;

	const decompositionMode =
		params.decompositionMode ?? "transient_steady_state";
	const isAlgebraic = decompositionMode === "homogeneous_particular";
	const firstSymbol = isAlgebraic ? "y_h" : "y_{tr}";
	const secondSymbol = isAlgebraic ? "y_p" : "y_{ss}";
	const transientParticularScale =
		!isAlgebraic && params.particularDecays ? 1 : 0;
	const steadyParticularScale = 1 - transientParticularScale;
	const decompositionHints = isAlgebraic
		? [
				"The homogeneous contribution satisfies the ODE with the forcing set to zero; its constants match the total initial conditions after subtracting particular offsets.",
				"The particular solution matches the input. For these stable systems with decaying exponential inputs, both contributions decay: the entire response is transient and $y_{ss}(t)=0$.",
				`$y_h(t) = ${homogeneousComplete.latex}$ and $y_p(t) = ${particular.latex}$.`,
			]
		: [
				"Transient response tends to zero as time increases.",
				"For this stable constant or sinusoidal input, the selected particular solution is the persistent steady-state response.",
				`$y_{tr}(t) = ${y_tr_latex}$ and $y_{ss}(t) = ${y_ss_latex}$.`,
			];
	return {
		decompositionMode,
		isAlgebraic,
		firstSymbol,
		secondSymbol,
		transientParticularScale,
		steadyParticularScale,
		decompositionHints,
		firstResponse: isAlgebraic ? homogeneousComplete.latex : y_tr_latex,
		secondResponse: isAlgebraic ? particular.latex : y_ss_latex,
	};
}

/**
 * Builds distinct choices from the selected response bases and interpretation.
 * @param params - Solved responses and teaching mode.
 * @returns Mathematical choices and shared interpretation.
 */
function buildResponseChoices(params: BuildStep7Params) {
	const {
		resolvedOrder,
		resolvedRootType,
		roots,
		homogeneousZI,
		homogeneousZS,
		homogeneousComplete,
		particular,
		ziLatex,
		zsLatex,
	} = params;
	const {
		decompositionMode,
		isAlgebraic,
		firstSymbol,
		secondSymbol,
		transientParticularScale,
		steadyParticularScale,
		decompositionHints,
		firstResponse,
		secondResponse,
	} = decompositionPresentation(params);
	/** Encodes a response in the independent homogeneous and particular bases.
	 * @param homogeneous - Homogeneous constants, if present.
	 * @param particularScale - Multiplier of the selected particular solution.
	 */
	const signature = (
		homogeneous?: HomogeneousSolution,
		particularScale = 0,
	): Record<string, number> => ({
		C1: homogeneous?.C1 ?? 0,
		C2: homogeneous?.C2 ?? 0,
		Kp: particularScale * (particular.coeffs.Kp ?? 0),
		A: particularScale * (particular.coeffs.A ?? 0),
		B: particularScale * (particular.coeffs.B ?? 0),
	});
	const firstBasis = `${formatExpTerm(roots.r1)}${resolvedOrder === 2 && resolvedRootType === "complex_conjugate" ? ` \\cos(${roots.im ?? 1}t)` : ""}`;
	// The legacy array names retain compatibility; the mode defines their meaning.
	const transientOptions: OdeItsOption[] = [
		{
			id: "tr_correct",
			latex: `${firstSymbol}(t) = ${firstResponse}`,
			isCorrect: true,
			coefficients: signature(
				homogeneousComplete,
				transientParticularScale,
			),
		},
		{
			id: "tr_yp",
			latex: `${firstSymbol}(t) = ${particular.latex}`,
			isCorrect: false,
			coefficients: signature(undefined, 1),
			feedback: isAlgebraic
				? "This is the particular solution, not the homogeneous contribution."
				: "For this stable constant or sinusoidal input, the selected particular solution is the steady-state component.",
		},
		{
			id: "tr_zi",
			latex: `${firstSymbol}(t) = ${ziLatex}`,
			isCorrect: false,
			coefficients: signature(homogeneousZI),
			feedback:
				"Zero-input constants satisfy the original initial state; the total homogeneous constants must also account for the particular-solution offsets.",
		},
	];

	const steadyStateOptions: OdeItsOption[] = [
		{
			id: "ss_correct",
			latex: `${secondSymbol}(t) = ${secondResponse}`,
			isCorrect: true,
			coefficients: signature(undefined, steadyParticularScale),
		},
		{
			id: "ss_yh",
			latex: `${secondSymbol}(t) = ${homogeneousComplete.latex}`,
			isCorrect: false,
			coefficients: signature(homogeneousComplete),
			feedback: isAlgebraic
				? "This is the homogeneous solution, not the particular solution."
				: "For this stable system, homogeneous modes decay and are transient.",
		},
		{
			id: "ss_zs",
			latex: `${secondSymbol}(t) = ${zsLatex}`,
			isCorrect: false,
			coefficients: signature(homogeneousZS, 1),
			feedback:
				"The zero-state response includes any homogeneous correction needed to satisfy zero initial conditions, in addition to the particular solution.",
		},
	];
	// A deliberately shifted coefficient supplies a distractor even when all responses vanish.
	transientOptions.push({
		id: "tr_offset",
		latex: `${firstSymbol}(t) = (${firstResponse}) + ${firstBasis}`,
		isCorrect: false,
		coefficients: {
			...signature(homogeneousComplete, transientParticularScale),
			C1: homogeneousComplete.C1 + 1,
		},
		feedback:
			"This adds an extra natural mode and changes the required initial conditions.",
	});
	steadyStateOptions.push({
		id: "ss_offset",
		latex: `${secondSymbol}(t) = (${secondResponse}) + ${firstBasis}`,
		isCorrect: false,
		coefficients: {
			...signature(undefined, steadyParticularScale),
			C1: 1,
		},
		feedback:
			"This includes an extra homogeneous mode rather than only the requested particular or steady-state component.",
	});
	return {
		decompositionMode,
		isAlgebraic,
		decompositionHints,
		transientOptions,
		steadyStateOptions,
	};
}

/**
 * Selects an unambiguous concept question and tailors its initial-state wording.
 * @param params - Differential order, initial state, and seeded source.
 * @param isAlgebraic - Whether the particular contribution decays.
 * @returns Selected and shuffled conceptual question.
 */
function selectConceptQuestion(
	params: BuildStep7Params,
	isAlgebraic: boolean,
): OdeItsConceptQuestion {
	const { random, initialConditions, resolvedOrder } = params;
	// Pick a concept question
	// Keep the limit question's distractors distinct for decaying inputs and zero states.
	const selectedConceptBase = randomChoice(
		random,
		isAlgebraic || initialConditions.y0 === 0
			? CONCEPT_QUESTIONS_POOL.filter(
					/** Excludes an ambiguous limit distractor. @param question - Candidate question. */ (
						question,
					) => question !== CONCEPT_QUESTIONS_POOL[2],
				)
			: CONCEPT_QUESTIONS_POOL,
	);
	const selectedConceptQ = {
		...selectedConceptBase,
		options: shuffleWithRandom(
			selectedConceptBase.options.map(
				/** Tailors the initial state to differential order. @param option - Concept choice. */ (
					option,
				) =>
					resolvedOrder === 1 && option.id === "cq2_opt1"
						? {
								...option,
								latex: String.raw`\text{When the initial condition is zero: } y(0^-)=0`,
							}
						: option,
			),
			random,
		),
		explanation:
			resolvedOrder === 1 &&
			selectedConceptBase === CONCEPT_QUESTIONS_POOL[1]
				? "The zero-input response depends linearly on the initial value. When $y(0^-)=0$, $y_{ZI}(t)=0$, so the total response equals the zero-state response."
				: selectedConceptBase.explanation,
	};
	return selectedConceptQ;
}

/**
 * Renders the initial-condition equations for the zero-input homogeneous modes.
 * @param params - Root family and original initial state.
 * @returns Zero-input initial-condition system in LaTeX.
 */
function zeroInputSystem(params: BuildStep7Params): string {
	const { resolvedOrder, resolvedRootType, roots, initialConditions } =
		params;
	// Formulate Zero-Input initial condition system LaTeX matching y(0-) and y'(0-)
	let ziSystemLatex = "";
	if (resolvedOrder === 1) {
		ziSystemLatex = `C_{1,ZI} = ${toFractionLatex(initialConditions.y0)}`;
	} else if (resolvedRootType === "distinct_real") {
		const r1 = roots.r1;
		const r2 = roots.r2 ?? 0;
		const eq1 = `C_{1,ZI} + C_{2,ZI} = ${toFractionLatex(initialConditions.y0)}`;
		const term1 = formatSignedLinearTerm(r1, "C_{1,ZI}", true);
		const term2 = formatSignedLinearTerm(r2, "C_{2,ZI}", false);
		const eq2 = `${term1} ${term2} = ${toFractionLatex(initialConditions.dy0 ?? 0)}`;
		ziSystemLatex = String.raw`\begin{cases} ${eq1} \\ ${eq2} \end{cases}`;
	} else if (resolvedRootType === "repeated_real") {
		const r = roots.r1;
		const eq1 = `C_{1,ZI} = ${toFractionLatex(initialConditions.y0)}`;
		const term1 = formatSignedLinearTerm(r, "C_{1,ZI}", true);
		const eq2 = `${term1} + C_{2,ZI} = ${toFractionLatex(initialConditions.dy0 ?? 0)}`;
		ziSystemLatex = String.raw`\begin{cases} ${eq1} \\ ${eq2} \end{cases}`;
	} else {
		const sig = roots.r1;
		const wd = roots.im ?? 1;
		const eq1 = `C_{1,ZI} = ${toFractionLatex(initialConditions.y0)}`;
		const term1 = formatSignedLinearTerm(sig, "C_{1,ZI}", true);
		const term2 = formatSignedLinearTerm(wd, "C_{2,ZI}", false);
		const eq2 = `${term1} ${term2} = ${toFractionLatex(initialConditions.dy0 ?? 0)}`;
		ziSystemLatex = String.raw`\begin{cases} ${eq1} \\ ${eq2} \end{cases}`;
	}
	return ziSystemLatex;
}

/**
 * Builds the Step 7 response-decomposition metadata in seeded draw order.
 * @param params - Solved responses, initial state, and teaching configuration.
 * @returns Zero-input system, selected concept, and order-specific metadata.
 */
export function buildStep7Data(
	params: BuildStep7Params,
): Step7ScaffoldingResult {
	const {
		resolvedOrder,
		homogeneousZI,
		homogeneousZS,
		ziLatex,
		zsLatex,
		y_tr_latex,
		y_ss_latex,
		random,
	} = params;
	const {
		decompositionMode,
		isAlgebraic,
		decompositionHints,
		transientOptions,
		steadyStateOptions,
	} = buildResponseChoices(params);
	const selectedConceptQ = selectConceptQuestion(params, isAlgebraic);
	const ziSystemLatex = zeroInputSystem(params);
	let step7Data: OdeItsStep7;
	if (resolvedOrder === 1) {
		const step7FirstOrder: FirstOrderOdeItsStep7 = {
			decompositionMode,
			expectedZI: ziLatex,
			expectedZS: zsLatex,
			ziConstants: {
				C1: homogeneousZI.C1,
			},
			zsConstants: {
				C1: homogeneousZS.C1,
			},
			y_tr_latex,
			y_ss_latex,
			transientOptions: shuffleWithRandom(
				uniqueOdeOptions(transientOptions).slice(0, 3),
				random,
			),
			steadyStateOptions: shuffleWithRandom(
				uniqueOdeOptions(steadyStateOptions).slice(0, 3),
				random,
			),
			conceptQuestion: selectedConceptQ,
			ziSystemLatex,
			hints: [
				"$y_{ZI}(t)$ is the zero-input response (natural response satisfying initial conditions with $x(t)=0$).",
				"$y_{ZS}(t)$ is the zero-state response (response driven purely by $x(t)$ with zero initial conditions).",
				String.raw`$y_{ZI}(t) = ${ziLatex}, \quad y_{ZS}(t) = ${zsLatex}$`,
			],
			subStepHints: {
				zi_zs: [
					"Zero-Input ($y_{ZI}$) satisfies original initial conditions with forcing $x(t) = 0$.",
					"Zero-State ($y_{ZS}$) is driven by $x(t)$ with $y(0^-)=0$.",
					`$C_{1,ZI}=${toFractionLatex(homogeneousZI.C1)}$ and $C_{1,ZS}=${toFractionLatex(homogeneousZS.C1)}$.`,
				],
				tr_ss: [...decompositionHints],
				concept: [
					"Think about system linearity, stability, and the physical definition of each response component.",
					"Review how initial conditions affect Zero-Input vs Zero-State responses.",
					selectedConceptQ.explanation,
				],
			},
		};
		step7Data = step7FirstOrder;
	} else {
		const step7SecondOrder: SecondOrderOdeItsStep7 = {
			decompositionMode,
			expectedZI: ziLatex,
			expectedZS: zsLatex,
			ziConstants: {
				C1: homogeneousZI.C1,
				C2: homogeneousZI.C2 ?? 0,
			},
			zsConstants: {
				C1: homogeneousZS.C1,
				C2: homogeneousZS.C2 ?? 0,
			},
			y_tr_latex,
			y_ss_latex,
			transientOptions: shuffleWithRandom(
				uniqueOdeOptions(transientOptions).slice(0, 3),
				random,
			),
			steadyStateOptions: shuffleWithRandom(
				uniqueOdeOptions(steadyStateOptions).slice(0, 3),
				random,
			),
			conceptQuestion: selectedConceptQ,
			ziSystemLatex,
			hints: [
				"$y_{ZI}(t)$ is the zero-input response (natural response satisfying initial conditions with $x(t)=0$).",
				"$y_{ZS}(t)$ is the zero-state response (response driven purely by $x(t)$ with zero initial conditions).",
				String.raw`$y_{ZI}(t) = ${ziLatex}, \quad y_{ZS}(t) = ${zsLatex}$`,
			],
			subStepHints: {
				zi_zs: [
					"Zero-Input ($y_{ZI}$) satisfies original initial conditions with forcing $x(t) = 0$.",
					"Zero-State ($y_{ZS}$) is driven by $x(t)$ with $y(0^-)=y'(0^-)=0$.",
					`$C_{1,ZI}=${toFractionLatex(homogeneousZI.C1)}$, $C_{2,ZI}=${toFractionLatex(homogeneousZI.C2 ?? 0)}$, $C_{1,ZS}=${toFractionLatex(homogeneousZS.C1)}$, and $C_{2,ZS}=${toFractionLatex(homogeneousZS.C2 ?? 0)}$.`,
				],
				tr_ss: [...decompositionHints],
				concept: [
					"Think about system linearity, stability, and the physical definition of each response component.",
					"Review how initial conditions affect Zero-Input vs Zero-State responses.",
					selectedConceptQ.explanation,
				],
			},
		};
		step7Data = step7SecondOrder;
	}

	return { ziSystemLatex, selectedConceptQ, step7Data };
}
