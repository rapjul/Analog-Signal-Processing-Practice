/** Analytical convolution solvers involving causal exponential signals. */

import { evalExpDecay, evalRect } from "./evaluators";
import type {
	ConvolutionInterval,
	ConvolutionResult,
	ExpSignal,
	RectSignal,
} from "./types";

/** Solves a finite rectangle convolved with a causal exponential decay. */
export function solveRectExpConvolution(
	rect: RectSignal,
	exponential: ExpSignal,
): ConvolutionResult {
	const { tStart, width, height } = rect;
	const { a, K } = exponential;
	const end = tStart + width;
	const scale = (height * K) / a;
	const evaluate = (t: number): number => {
		if (t < tStart) return 0;
		if (t < end) return scale * (1 - Math.exp(-a * (t - tStart)));
		return scale * (Math.exp(-a * (t - end)) - Math.exp(-a * (t - tStart)));
	};
	const intervals: ConvolutionInterval[] = [
		{
			labelLatex: `t < ${tStart}`,
			min: Number.NEGATIVE_INFINITY,
			max: tStart,
			exprLatex: "0",
			eval: () => 0,
		},
		{
			labelLatex: `${tStart} \\le t < ${end}`,
			min: tStart,
			max: end,
			exprLatex: `${scale}(1-e^{-${a}(t-${tStart})})`,
			eval: evaluate,
		},
		{
			labelLatex: `t \\ge ${end}`,
			min: end,
			max: Number.POSITIVE_INFINITY,
			exprLatex: `${scale}(e^{-${a}(t-${end})}-e^{-${a}(t-${tStart})})`,
			eval: evaluate,
		},
	];
	return {
		pairType: "rect_exp",
		intervals,
		eval: evaluate,
		evalX: (tau) => evalRect(tau, tStart, width, height),
		evalH: (tau) => evalExpDecay(tau, a, K),
	};
}

/** Solves two causal exponential decays, including equal decay rates. */
export function solveExpExpConvolution(
	first: ExpSignal,
	second: ExpSignal,
): ConvolutionResult {
	const amplitude = first.K * second.K;
	const equalRates = first.a === second.a;
	const scale = equalRates ? amplitude : amplitude / (second.a - first.a);
	const evaluate = (t: number): number => {
		if (t < 0) return 0;
		if (equalRates) return amplitude * t * Math.exp(-first.a * t);
		return scale * (Math.exp(-first.a * t) - Math.exp(-second.a * t));
	};
	const expression = equalRates
		? `${amplitude}t e^{-${first.a}t}`
		: `\\frac{${amplitude}}{${second.a - first.a}}\\left(e^{-${first.a}t}-e^{-${second.a}t}\\right)`;
	return {
		pairType: "exp_exp",
		intervals: [
			{
				labelLatex: "t < 0",
				min: Number.NEGATIVE_INFINITY,
				max: 0,
				exprLatex: "0",
				eval: () => 0,
			},
			{
				labelLatex: "t \\ge 0",
				min: 0,
				max: Number.POSITIVE_INFINITY,
				exprLatex: expression,
				eval: evaluate,
			},
		],
		eval: evaluate,
		evalX: (tau) => evalExpDecay(tau, first.a, first.K),
		evalH: (tau) => evalExpDecay(tau, second.a, second.K),
	};
}
