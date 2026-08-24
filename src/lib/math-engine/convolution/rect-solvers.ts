/** Analytical convolution solvers for rectangular-pulse signal pairs. */

import { evalRect } from "./evaluators";
import type {
	ConvolutionInterval,
	ConvolutionResult,
	RectSignal,
} from "./types";

/** Solves two arbitrary finite rectangular pulses. */
export function solveRectRectConvolution(
	rect1: RectSignal,
	rect2: RectSignal,
): ConvolutionResult {
	const firstWidth = Math.min(rect1.width, rect2.width);
	const secondWidth = Math.max(rect1.width, rect2.width);
	const amplitude = rect1.height * rect2.height;
	const firstContact = rect1.tStart + rect2.tStart;
	const fullOverlapStart = firstContact + firstWidth;
	const fullOverlapEnd = firstContact + secondWidth;
	const finalContact = firstContact + firstWidth + secondWidth;
	const risingFactor =
		firstContact === 0
			? "t"
			: firstContact > 0
				? `t - ${firstContact}`
				: `t + ${Math.abs(firstContact)}`;
	const fallingFactor =
		finalContact === 0
			? "-t"
			: finalContact > 0
				? `${finalContact} - t`
				: `-${Math.abs(finalContact)} - t`;
	const scaled = (factor: string): string =>
		amplitude === 1
			? factor
			: String.raw`${amplitude}\left(${factor}\right)`;
	const intervals: ConvolutionInterval[] = [
		{
			labelLatex: `t < ${firstContact}`,
			min: Number.NEGATIVE_INFINITY,
			max: firstContact,
			exprLatex: "0",
			eval: () => 0,
		},
		{
			labelLatex: `${firstContact} \\le t < ${fullOverlapStart}`,
			min: firstContact,
			max: fullOverlapStart,
			exprLatex: scaled(risingFactor),
			eval: (t) => amplitude * (t - firstContact),
		},
	];
	if (firstWidth !== secondWidth) {
		intervals.push({
			labelLatex: `${fullOverlapStart} \\le t < ${fullOverlapEnd}`,
			min: fullOverlapStart,
			max: fullOverlapEnd,
			exprLatex: `${amplitude * firstWidth}`,
			eval: () => amplitude * firstWidth,
		});
	}
	intervals.push(
		{
			labelLatex: `${fullOverlapEnd} \\le t < ${finalContact}`,
			min: fullOverlapEnd,
			max: finalContact,
			exprLatex: scaled(fallingFactor),
			eval: (t) => amplitude * (finalContact - t),
		},
		{
			labelLatex: `t \\ge ${finalContact}`,
			min: finalContact,
			max: Number.POSITIVE_INFINITY,
			exprLatex: "0",
			eval: () => 0,
		},
	);
	const evaluate = (t: number): number => {
		if (t < firstContact || t >= finalContact) return 0;
		if (t < fullOverlapStart) return amplitude * (t - firstContact);
		if (t < fullOverlapEnd) return amplitude * firstWidth;
		return amplitude * (finalContact - t);
	};
	return {
		pairType: "rect_rect",
		intervals,
		eval: evaluate,
		evalX: (tau) => evalRect(tau, rect1.tStart, rect1.width, rect1.height),
		evalH: (tau) => evalRect(tau, rect2.tStart, rect2.width, rect2.height),
	};
}

/** Solves a shifted rectangular-pulse pair through the general rectangle solver. */
export function solveShiftedRectConvolution(
	rect1: RectSignal,
	rect2: RectSignal,
): ConvolutionResult {
	return {
		...solveRectRectConvolution(rect1, rect2),
		pairType: "rect_shifted_rect",
	};
}

/** Solves two separated unit rectangles convolved with a width-two rectangle. */
export function solveMultiRectConvolution(): ConvolutionResult {
	const evalX = (tau: number) =>
		evalRect(tau, 0, 1, 1) + evalRect(tau, 3, 1, 1);
	const evalH = (tau: number) => evalRect(tau, 0, 2, 1);
	const evaluate = (t: number): number => {
		let first = 0;
		if (t >= 0 && t < 1) first = t;
		else if (t >= 1 && t < 2) first = 1;
		else if (t >= 2 && t < 3) first = 3 - t;
		let second = 0;
		if (t >= 3 && t < 4) second = t - 3;
		else if (t >= 4 && t < 5) second = 1;
		else if (t >= 5 && t < 6) second = 6 - t;
		return first + second;
	};
	const definitions: Array<
		[string, number, number, string, (t: number) => number]
	> = [
		["t < 0", Number.NEGATIVE_INFINITY, 0, "0", () => 0],
		["0 \\le t < 1", 0, 1, "t", (t) => t],
		["1 \\le t < 2", 1, 2, "1", () => 1],
		["2 \\le t < 3", 2, 3, "3-t", (t) => 3 - t],
		["3 \\le t < 4", 3, 4, "t-3", (t) => t - 3],
		["4 \\le t < 5", 4, 5, "1", () => 1],
		["5 \\le t < 6", 5, 6, "6-t", (t) => 6 - t],
		["t \\ge 6", 6, Number.POSITIVE_INFINITY, "0", () => 0],
	];
	return {
		pairType: "multi_rect",
		intervals: definitions.map(
			([labelLatex, min, max, exprLatex, evalFn]) => ({
				labelLatex,
				min,
				max,
				exprLatex,
				eval: evalFn,
			}),
		),
		eval: evaluate,
		evalX,
		evalH,
	};
}
