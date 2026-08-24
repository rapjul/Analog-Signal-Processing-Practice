/** Analytical solvers involving the unit-step signal. */

import { evalExpDecay, evalRect } from "./evaluators";
import type { ConvolutionResult, ExpSignal } from "./types";

/** Solves the convolution of a unit step and a causal exponential. */
export function solveStepExpConvolution(exp: ExpSignal): ConvolutionResult {
	const { a, K } = exp;
	const evaluate = (t: number): number =>
		t < 0 ? 0 : (K / a) * (1 - Math.exp(-a * t));
	return {
		pairType: "step_exp",
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
				exprLatex: `\\frac{${K}}{${a}}\\left(1 - e^{-${a}t}\\right)`,
				eval: evaluate,
			},
		],
		eval: evaluate,
		evalX: (tau) => (tau >= 0 ? 1 : 0),
		evalH: (tau) => evalExpDecay(tau, a, K),
	};
}

/** Solves the convolution of a unit step and a rectangular pulse. */
export function solveStepRectConvolution(width: number): ConvolutionResult {
	const evaluate = (t: number): number => {
		if (t < 0) return 0;
		if (t < width) return t;
		return width;
	};
	return {
		pairType: "step_rect",
		intervals: [
			{
				labelLatex: "t < 0",
				min: Number.NEGATIVE_INFINITY,
				max: 0,
				exprLatex: "0",
				eval: () => 0,
			},
			{
				labelLatex: `0 \\le t < ${width}`,
				min: 0,
				max: width,
				exprLatex: "t",
				eval: (t) => Math.max(0, t),
			},
			{
				labelLatex: `t \\ge ${width}`,
				min: width,
				max: Number.POSITIVE_INFINITY,
				exprLatex: `${width}`,
				eval: () => width,
			},
		],
		eval: evaluate,
		evalX: (tau) => (tau >= 0 ? 1 : 0),
		evalH: (tau) => evalRect(tau, 0, width, 1),
	};
}
