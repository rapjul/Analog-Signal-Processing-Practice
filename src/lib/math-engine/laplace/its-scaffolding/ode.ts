import { fraction, polynomialLatex } from "$lib/math-engine/laplace/algebra";
import { scaledLatex, sumLatex } from "$lib/math-engine/laplace/formatting";
import { solveLaplaceOde } from "$lib/math-engine/laplace/ode";
import { formatRoc } from "$lib/math-engine/laplace/pfd";
import {
	analyzeSignalRoc,
	totalCanceledFactors,
} from "$lib/math-engine/laplace/roc";
import {
	responseLatex,
	signalLatex,
	signalTransform,
} from "$lib/math-engine/laplace/signals";
import { collectTerms } from "$lib/math-engine/laplace/transform";
import type {
	LaplaceExercise,
	LaplaceStage,
	OdeExercise,
} from "$lib/math-engine/laplace/types";
import { blockAnalysis } from "./forward";
import { pairingStage } from "./inverse";
import { decompositionStages, fieldTask, task } from "./shared";
import { teaching, teachSignal } from "./teaching";

/** @param input - Structured unilateral IVP. @returns Eight-stage Laplace ODE tutor. */
export function createOdeExercise(input: OdeExercise): LaplaceExercise {
	const spec = structuredClone(input),
		solution = solveLaplaceOde(spec);
	const order = solution.operator.length - 1,
		terms = [...solution.zi, ...solution.zs];
	const y0 = fraction(spec.initial[0]),
		dy0 = fraction(spec.initial[1]);
	const prompt =
		sumLatex(
			solution.operator
				.map((coefficient, power) =>
					coefficient.numerator
						? scaledLatex(
								coefficient,
								power === 2
									? "y''(t)"
									: power === 1
										? "y'(t)"
										: "y(t)",
							)
						: "",
				)
				.filter(Boolean)
				.reverse(),
		) + `=${sumLatex(spec.terms.map(signalLatex))}`;
	const { bounds: roc, poles } = analyzeSignalRoc(terms);
	const decomposition = solution.blocks.flatMap((block, index) =>
		[
			blockAnalysis([block]),
			...decompositionStages(block.data, true),
		].flatMap((stage) =>
			stage.tasks.map((part) => ({
				...part,
				id: `ode-block-${index}-${part.id}`,
				...(part.when
					? {
							when: {
								...part.when,
								id: `ode-block-${index}-${part.when.id}`,
							},
						}
					: {}),
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
					{
						...task(
							`jump-${index}`,
							`Check the impulse at $t=${term.delay}$`,
							`Integrate the ODE across this time. Add all coincident impulse weights; the jump in $${order === 1 ? "y" : "y'"}$ equals their combined weight divided by the leading coefficient.`,
							"scalar",
							fraction(term.amplitude)
								.divide(fraction(spec.leading))
								.toLatex(),
						),
						...teaching(
							"Integrating across an impulse turns its area into a state jump. Add impulses at the same time before dividing by the leading coefficient.",
							`At $t=${term.delay}$, the combined impulse weight is $${term.amplitude}$ and the leading coefficient is $${spec.leading}$. For this order, the jump is in $${order === 1 ? "y" : "y'"}$.`,
							`The jump is $(${term.amplitude})/(${spec.leading})=${fraction(term.amplitude).divide(fraction(spec.leading)).toLatex()}$. Smooth lower-order terms contribute zero area over the shrinking interval.`,
							"Check Impulse Jump",
						),
					},
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
				teachSignal(
					task(
						`ode-force-${index}`,
						`Transform forcing term ${index + 1}`,
						`Transform $${signalLatex(term)}$ with its amplitude and delay.`,
						"s",
						signalTransform(term),
					),
					term,
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
					"Choose the general unilateral identity valid for arbitrary initial conditions, before substituting this problem's values.",
					"choice",
					"$sY(s)-y(0^-)$",
					["$sY(s)-y(0^-)$", "$sY(s)+y(0^-)$", "$s^2Y(s)-y(0^-)$"],
				),
				fieldTask(
					"ode-derivative-values",
					"Apply the first-derivative rule",
					"Substitute the supplied initial output into the verified rule, retaining its sign, including zero.",
					"\\mathcal L_+\\{y'\\}=sY(s)-({{y0}})",
					[
						{
							id: "y0",
							label: "Initial output $y(0^-)$",
							target: y0.toLatex(),
						},
					],
				),
				...(order === 2
					? [
							task(
								"ode-second",
								"Transform the second derivative",
								"Choose the general unilateral identity valid for arbitrary initial output and derivative values.",
								"choice",
								"$s^2Y(s)-sy(0^-)-y'(0^-)$",
								[
									"$s^2Y(s)-sy(0^-)-y'(0^-)$",
									"$s^2Y(s)-y(0^-)-y'(0^-)$",
									"$s^2Y(s)+sy(0^-)+y'(0^-)$",
								],
							),
							fieldTask(
								"ode-second-values",
								"Apply the second-derivative rule",
								"Substitute the supplied initial output and derivative into their matching slots, retaining their signs, including zeros.",
								"\\mathcal L_+\\{y''\\}=s^2Y(s)-s({{y0}})-({{dy0}})",
								[
									{
										id: "y0",
										label: "Initial output $y(0^-)$",
										target: y0.toLatex(),
									},
									{
										id: "dy0",
										label: "Initial derivative $y'(0^-)$",
										target: dy0.toLatex(),
									},
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
			title: "Analyze Each Response Block and Choose a Method",
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
	for (const stage of stages)
		for (const part of stage.tasks) {
			if (part.id === "ode-initial-numerator")
				Object.assign(
					part,
					teaching(
						"Move the subtracted initial-condition terms to the forcing side, then group equal powers of the transform variable.",
						`Use $y(0^-)=${y0.toLatex()}$${order === 2 ? ` and $y'(0^-)=${dy0.toLatex()}$` : ""} with the coefficients of $D(s)=${polynomialLatex(solution.operator)}$. For second order the initial numerator is $a(sy_0+y'_0)+by_0$; for first order it is $ay_0$.`,
						`The leading derivative contributes $(${spec.leading})(${order === 2 ? `s(${y0.toLatex()})+(${dy0.toLatex()})` : y0.toLatex()})$. Add any first-derivative initial term from the operator before collecting the numerator.`,
						"Check Initial Contribution",
					),
				);
			if (["ode-zi", "ode-zs", "ode-total"].includes(part.id))
				Object.assign(
					part,
					teaching(
						"The same differential operator acts on the initial-state and forcing contributions. Their transforms add by linearity.",
						`Here $D(s)=${polynomialLatex(solution.operator)}$, the initial numerator is $I(s)=${polynomialLatex(solution.initialNumerator)}$, and $F(s)=${sumLatex(spec.terms.map(signalTransform))}$. ${part.id === "ode-zi" ? "Use I and omit F." : part.id === "ode-zs" ? "Use F and omit I." : "Retain both I and F."}`,
						`Dividing the initial part gives $Y_{ZI}(s)=${solution.ziTransform}$; dividing the input part gives $Y_{ZS}(s)=${solution.zsTransform}$. Keep delay factors attached to their input blocks before adding the parts.`,
						"Check Response Transform",
					),
				);
		}
	return {
		spec,
		prompt,
		conditions: `Unilateral IVP for $t\\ge0$: $y(0^-)=${y0.toLatex()}${order === 2 ? `,\\ y'(0^-)=${dy0.toLatex()}` : ""}$.`,
		transform: solution.transform,
		response: solution.response,
		terms,
		poles,
		canceled: totalCanceledFactors(
			solution.blocks.map((block) => block.spec.poles),
			poles,
		),
		roc,
		rocLatex: formatRoc(roc, poles),
		stable: false,
		stages,
	};
}
