/**
 * Step 7 Response Decomposition ITS Scaffolding Builder.
 *
 * Formulates the Zero-Input ($y_{ZI}$) vs Zero-State ($y_{ZS}$) dual decomposition,
 * Transient ($y_{tr}$) vs Steady-State ($y_{ss}$) classification options,
 * and randomized conceptual mastery question pools.
 */

import { formatSignedLinearTerm } from "../../formatting";
import { toFractionLatex } from "../../fraction";
import { randomChoice, shuffleWithRandom } from "../../random";
import type {
	FirstOrderOdeItsStep7,
	HomogeneousSolution,
	OdeItsConceptQuestion,
	OdeItsStep7,
	OdeOrder,
	OdeProblem,
	ParticularSolution,
	SecondOrderOdeItsStep7,
	SecondOrderRootType,
} from "../types";
import { buildResponseChoices } from "./response-options";

/**
 * Concept questions pool for testing fundamental signal processing theory.
 */
export const CONCEPT_QUESTIONS_POOL: OdeItsConceptQuestion[] = [
	{
		prompt: "Why does the Zero-State response $y_{ZS}(t)$ contain exponential terms matching the natural homogeneous modes?",
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
			"Even with zero initial conditions ($y(0^-)=0, y'(0^-)=0$), the forced particular solution $y_p(t)$ is generally non-zero at $t=0$. Natural homogeneous modes with non-zero arbitrary constants $C_{1,ZS}, C_{2,ZS}$ are required to cancel $y_p(0)$ so that the total zero-state response starts from rest.",
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
				feedback: String.raw`Every transient term decays to $0$ as $t \to \infty$, including decaying forced terms such as $t e^{-t}$. Only persistent terms belong to the steady-state response.`,
			},
			{
				id: "cq3_opt3",
				latex: String.raw`\displaystyle \lim_{t \to \infty} y_{tr}(t) = y(0^-)`,
				isCorrect: false,
				feedback: String.raw`Initial conditions dictate the starting values at $t=0$, not the asymptotic limit at $t \to \infty$.`,
			},
		],
		explanation: String.raw`The natural modes decay because all characteristic roots have negative real parts. Decaying exponential inputs also produce decaying particular terms, even with resonance factors $t$ or $t^2$. All these terms belong to $y_{tr}(t)$, whose limit is $0$.`,
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
	/** Whether the particular solution decays and therefore belongs to the transient response. */
	particularDecays?: boolean;
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
 * Builds the Step 7 (Response Decomposition) ITS metadata.
 *
 * @param {BuildStep7Params} params Configuration parameters for Step 7
 * @returns {Step7ScaffoldingResult} Zero-Input system LaTeX and Step 7 ITS metadata
 */
export function buildStep7Data(
	params: BuildStep7Params,
): Step7ScaffoldingResult {
	const {
		resolvedOrder,
		resolvedRootType,
		roots,
		initialConditions,
		homogeneousZI,
		homogeneousZS,
		ziLatex,
		zsLatex,
		y_tr_latex,
		y_ss_latex,
		random,
	} = params;

	const { transientChoices, steadyStateChoices } =
		buildResponseChoices(params);

	// Pick a concept question
	const selectedConceptBase = randomChoice(random, CONCEPT_QUESTIONS_POOL);
	const selectedConceptQ = {
		...selectedConceptBase,
		options: shuffleWithRandom(selectedConceptBase.options, random),
	};

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

	let step7Data: OdeItsStep7;
	if (resolvedOrder === 1) {
		const step7FirstOrder: FirstOrderOdeItsStep7 = {
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
			transientOptions: shuffleWithRandom(transientChoices, random),
			steadyStateOptions: shuffleWithRandom(steadyStateChoices, random),
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
				tr_ss: [
					String.raw`Transient response $y_{tr}(t)$ includes all terms that decay to zero, including decaying exponential particular solutions.`,
					String.raw`Steady-state response $y_{ss}(t)$ contains only persistent terms; it is zero when the entire response decays.`,
					`$y_{tr}(t) = ${y_tr_latex}$ and $y_{ss}(t) = ${y_ss_latex}$.`,
				],
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
			transientOptions: shuffleWithRandom(transientChoices, random),
			steadyStateOptions: shuffleWithRandom(steadyStateChoices, random),
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
				tr_ss: [
					String.raw`Transient response $y_{tr}(t)$ includes all terms that decay to zero, including decaying exponential particular solutions.`,
					String.raw`Steady-state response $y_{ss}(t)$ contains only persistent terms; it is zero when the entire response decays.`,
					`$y_{tr}(t) = ${y_tr_latex}$ and $y_{ss}(t) = ${y_ss_latex}$.`,
				],
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
