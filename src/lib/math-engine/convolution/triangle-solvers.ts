/** Analytical convolution solvers involving triangular pulses. */

import { evalRect, evalTri } from "./evaluators";
import type { ConvolutionInterval, ConvolutionResult } from "./types";

/** Solves the exact convolution of tri(t/2) and rect(t/2). */
export function solveTriRectConvolution(): ConvolutionResult {
	const evaluate = (t: number): number => {
		if (t < -3 || t >= 3) return 0;
		if (t < -1) return ((t + 3) * (t + 3)) / 4;
		if (t < 1) return (3 - t * t) / 2;
		return ((t - 3) * (t - 3)) / 4;
	};
	const intervals: ConvolutionInterval[] = [
		{
			labelLatex: "t < -3",
			min: Number.NEGATIVE_INFINITY,
			max: -3,
			exprLatex: "0",
			supportIntersectionLatex: "\\varnothing",
			integralSetupLatex: "y(t)=0",
			flipXSupportIntersectionLatex: "\\varnothing",
			flipXIntegralSetupLatex: "y(t)=0",
			eval: () => 0,
		},
		{
			labelLatex: "-3 \\le t < -1",
			min: -3,
			max: -1,
			exprLatex: "\\frac{(t+3)^2}{4}",
			supportIntersectionLatex: "[-2,t+1]",
			integralSetupLatex:
				"y(t)=\\int_{-2}^{t+1}\\left(1+\\frac{\\tau}{2}\\right)d\\tau",
			flipXSupportIntersectionLatex: "[-1,t+2]",
			flipXIntegralSetupLatex:
				"y(t)=\\int_{-1}^{t+2}\\left(1+\\frac{t-\\tau}{2}\\right)d\\tau",
			eval: evaluate,
		},
		{
			labelLatex: "-1 \\le t < 1",
			min: -1,
			max: 1,
			exprLatex: "\\frac{3-t^2}{2}",
			supportIntersectionLatex: "[t-1,t+1]",
			integralSetupLatex:
				"y(t)=\\int_{t-1}^{0}\\left(1+\\frac{\\tau}{2}\\right)d\\tau+\\int_0^{t+1}\\left(1-\\frac{\\tau}{2}\\right)d\\tau",
			flipXSupportIntersectionLatex: "[-1,1]",
			flipXIntegralSetupLatex:
				"y(t)=\\int_{-1}^{t}\\left(1-\\frac{t-\\tau}{2}\\right)d\\tau+\\int_t^1\\left(1+\\frac{t-\\tau}{2}\\right)d\\tau",
			eval: evaluate,
		},
		{
			labelLatex: "1 \\le t < 3",
			min: 1,
			max: 3,
			exprLatex: "\\frac{(t-3)^2}{4}",
			supportIntersectionLatex: "[t-1,2]",
			integralSetupLatex:
				"y(t)=\\int_{t-1}^{2}\\left(1-\\frac{\\tau}{2}\\right)d\\tau",
			flipXSupportIntersectionLatex: "[t-2,1]",
			flipXIntegralSetupLatex:
				"y(t)=\\int_{t-2}^{1}\\left(1-\\frac{t-\\tau}{2}\\right)d\\tau",
			eval: evaluate,
		},
		{
			labelLatex: "t \\ge 3",
			min: 3,
			max: Number.POSITIVE_INFINITY,
			exprLatex: "0",
			supportIntersectionLatex: "\\varnothing",
			integralSetupLatex: "y(t)=0",
			flipXSupportIntersectionLatex: "\\varnothing",
			flipXIntegralSetupLatex: "y(t)=0",
			eval: () => 0,
		},
	];
	return {
		pairType: "tri_rect",
		intervals,
		eval: evaluate,
		evalX: (tau) => evalTri(tau, 0, 4, 1),
		evalH: (tau) => evalRect(tau, -1, 2, 1),
	};
}

/** Solves two identical triangular pulses when the second is shifted. */
export function solveShiftedTriTriConvolution(
	shift: number,
): ConvolutionResult {
	const evaluate = (t: number): number => {
		const z = t - shift;
		if (z < -4 || z >= 4) return 0;
		if (z < -2) return (z + 4) ** 3 / 24;
		if (z < 0) return 4 / 3 - (z * z) / 2 - z ** 3 / 8;
		if (z < 2) return 4 / 3 - (z * z) / 2 + z ** 3 / 8;
		return (4 - z) ** 3 / 24;
	};
	const boundaries = [shift - 4, shift - 2, shift, shift + 2, shift + 4];
	const expressions = [
		"0",
		`\\frac{(t-${shift}+4)^3}{24}`,
		`\\frac{4}{3}-\\frac{(t-${shift})^2}{2}-\\frac{(t-${shift})^3}{8}`,
		`\\frac{4}{3}-\\frac{(t-${shift})^2}{2}+\\frac{(t-${shift})^3}{8}`,
		`\\frac{(${shift}+4-t)^3}{24}`,
		"0",
	];
	const intervals: ConvolutionInterval[] = expressions.map(
		(exprLatex, index) => ({
			labelLatex:
				index === 0
					? `t < ${boundaries[0]}`
					: index === expressions.length - 1
						? `t \\ge ${boundaries.at(-1)}`
						: `${boundaries[index - 1]} \\le t < ${boundaries[index]}`,
			min:
				index === 0
					? Number.NEGATIVE_INFINITY
					: (boundaries[index - 1] ?? Number.NEGATIVE_INFINITY),
			max:
				index === expressions.length - 1
					? Number.POSITIVE_INFINITY
					: (boundaries[index] ?? Number.POSITIVE_INFINITY),
			exprLatex,
			supportIntersectionLatex:
				exprLatex === "0"
					? "\\varnothing"
					: `[-2,2]\\cap[t-${shift}-2,t-${shift}+2]`,
			integralSetupLatex:
				exprLatex === "0"
					? "y(t)=0"
					: `y(t)=\\int_{\\max(-2,t-${shift}-2)}^{\\min(2,t-${shift}+2)}\\operatorname{tri}(\\tau/2)\\operatorname{tri}((t-\\tau-${shift})/2)\\,d\\tau`,
			flipXSupportIntersectionLatex:
				exprLatex === "0"
					? "\\varnothing"
					: `[${shift - 2},${shift + 2}]\\cap[t-2,t+2]`,
			flipXIntegralSetupLatex:
				exprLatex === "0"
					? "y(t)=0"
					: `y(t)=\\int_{\\max(${shift - 2},t-2)}^{\\min(${shift + 2},t+2)}\\operatorname{tri}((\\tau-${shift})/2)\\operatorname{tri}((t-\\tau)/2)\\,d\\tau`,
			eval: exprLatex === "0" ? () => 0 : evaluate,
		}),
	);
	return {
		pairType: "tri_shifted_tri",
		intervals,
		eval: evaluate,
		evalX: (tau) => evalTri(tau, 0, 4, 1),
		evalH: (tau) => evalTri(tau, shift, 4, 1),
	};
}
