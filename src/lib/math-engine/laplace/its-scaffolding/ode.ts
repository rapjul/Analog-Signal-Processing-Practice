import { fraction, polynomialLatex } from "../algebra";
import { solveLaplaceOde } from "../ode";
import { formatRoc } from "../pfd";
import { analyzeSignalRoc } from "../roc";
import { responseLatex, signalLatex, signalTransform } from "../signals";
import { collectTerms } from "../transform";
import type { LaplaceExercise, LaplaceStage, OdeExercise } from "../types";
import { blockAnalysis } from "./forward";
import { pairingStage } from "./inverse";
import { decompositionStages, task } from "./shared";

/** @param input - Structured unilateral IVP. @returns Eight-stage Laplace ODE tutor. */
export function createOdeExercise(input: OdeExercise): LaplaceExercise {
	const spec = structuredClone(input),
		solution = solveLaplaceOde(spec);
	const order = solution.operator.length - 1,
		terms = [...solution.zi, ...solution.zs];
	const y0 = fraction(spec.initial[0]),
		dy0 = fraction(spec.initial[1]);
	const derivative = `sY(s)-(${y0.toLatex()})`;
	const second = `s^2Y(s)-s(${y0.toLatex()})-(${dy0.toLatex()})`;
	const prompt =
		solution.operator
			.map((coefficient, power) =>
				coefficient.numerator
					? `(${coefficient.toLatex()})${power === 2 ? "y''(t)" : power === 1 ? "y'(t)" : "y(t)"}`
					: "",
			)
			.filter(Boolean)
			.reverse()
			.join("+") + `=${spec.terms.map(signalLatex).join("+")}`;
	const { bounds: roc, poles } = analyzeSignalRoc(terms);
	const decomposition = solution.blocks.flatMap((block, index) =>
		[blockAnalysis([block]), ...decompositionStages(block.data)].flatMap(
			(stage) =>
				stage.tasks.map((part) => ({
					...part,
					id: `ode-block-${index}-${part.id}`,
					title: `Block ${index + 1}: ${part.title}`,
				})),
		),
	);
	const impulses = collectTerms(
		spec.terms
			.filter((term) => term.kind === "impulse")
			.map((term) => ({ ...term, rate: "0", frequency: "0", power: 0 })),
	);
	const jumpTasks = impulses.flatMap((term, index) =>
		term.kind === "impulse"
			? [
					task(
						`jump-${index}`,
						`Check the impulse at $t=${term.delay}$`,
						`Integrate the ODE across this time. Add all coincident impulse weights; the jump in $${order === 1 ? "y" : "y'"}$ equals their combined weight divided by the leading coefficient.`,
						"scalar",
						fraction(term.amplitude)
							.divide(fraction(spec.leading))
							.toLatex(),
					),
				]
			: [],
	);
	const stages: LaplaceStage[] = [
		{
			id: "initial-state",
			title: "Read the Equation and Initial State",
			tasks: [
				task(
					"ode-convention",
					"Choose the unilateral convention",
					"Initial values are supplied at zero minus, including impulses at the origin.",
					"choice",
					"Unilateral transform from zero minus",
					[
						"Unilateral transform from zero minus",
						"Bilateral derivative rule with no initial terms",
					],
				),
				task(
					"ode-y0",
					"Record the initial output",
					"Enter the given value of $y(0^-)$. Do not replace it with a post-impulse value.",
					"scalar",
					y0.toLatex(),
				),
			],
		},
		{
			id: "forcing",
			title: "Transform the Forcing",
			tasks: spec.terms.map((term, index) =>
				task(
					`ode-force-${index}`,
					`Transform forcing term ${index + 1}`,
					`Transform $${signalLatex(term)}$ with its amplitude and delay.`,
					"s",
					signalTransform(term),
				),
			),
		},
		{
			id: "derivatives",
			title: "Transform Derivatives with Initial Conditions",
			tasks: [
				task(
					"ode-derivative",
					"Transform the first derivative",
					"Use $\\mathcal L_+\\{y'\\}=sY-y(0^-)$.",
					"choice",
					`$${derivative}$`,
					[`$${derivative}$`, `$sY(s)+(${y0.toLatex()})$`, "$sY(s)$"],
				),
				...(order === 2
					? [
							task(
								"ode-second",
								"Transform the second derivative",
								"Use $\\mathcal L_+\\{y''\\}=s^2Y-sy(0^-)-y'(0^-)$.",
								"choice",
								`$${second}$`,
								[
									`$${second}$`,
									"$s^2Y(s)$",
									`$s^2Y(s)+s(${y0.toLatex()})+(${dy0.toLatex()})$`,
								],
							),
						]
					: []),
				task(
					"ode-initial-numerator",
					"Collect the initial-condition contribution",
					"Move initial-condition terms to the forcing side and collect their polynomial numerator.",
					"s",
					polynomialLatex(solution.initialNumerator),
				),
			],
		},
		{
			id: "isolate",
			title: "Isolate and Separate the Response",
			tasks: [
				task(
					"ode-zi",
					"Find the zero-input transform",
					"Set forcing to zero and retain the given initial state.",
					"s",
					solution.ziTransform,
				),
				task(
					"ode-zs",
					"Find the zero-state transform",
					"Set the initial state to zero and retain all input terms.",
					"s",
					solution.zsTransform,
				),
				task(
					"ode-total",
					"Isolate the total transform",
					"Combine the independently established zero-input and zero-state contributions.",
					"s",
					solution.transform,
				),
			],
		},
		{
			id: "ode-pfd",
			title: "Simplify and Decompose Each Block",
			tasks: decomposition,
		},
		pairingStage(terms),
		{
			id: "ode-assembly",
			title: "Assemble the Supported Response",
			tasks: [
				{
					...task(
						"ode-response",
						"Combine zero-input and zero-state responses",
						"Return the complete solution for nonnegative time with explicit causal extension.",
						"t",
						solution.response,
					),
					terms,
				},
			],
		},
		{
			id: "ode-verify",
			title: "Verify the Initial State and Impulse Jumps",
			tasks: [
				...jumpTasks,
				{
					...task(
						"ode-check-zi",
						"Verify the zero-input response",
						"Its initial state is the supplied state and its forcing is zero.",
						"t",
						responseLatex(solution.zi),
					),
					terms: solution.zi,
				},
				{
					...task(
						"ode-check-zs",
						"Verify the zero-state response",
						"It uses zero pre-input state, including any subsequent input-induced jumps.",
						"t",
						responseLatex(solution.zs),
					),
					terms: solution.zs,
				},
			],
		},
	].filter((stage) => stage.tasks.length);
	return {
		spec,
		prompt,
		conditions: `Unilateral IVP for $t\\ge0$: $y(0^-)=${y0.toLatex()}${order === 2 ? `,\\ y'(0^-)=${dy0.toLatex()}` : ""}$.`,
		transform: solution.transform,
		response: solution.response,
		terms,
		poles,
		canceled: solution.blocks.flatMap((block) => block.data.canceled),
		roc,
		rocLatex: formatRoc(roc, poles),
		stable: false,
		stages,
	};
}
