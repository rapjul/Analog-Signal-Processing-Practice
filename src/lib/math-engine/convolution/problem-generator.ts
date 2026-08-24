/** Seeded catalog generator for the legacy convolution practice categories. */

import {
	createRandomSeed,
	createSeededPrng,
	randomChoice,
	randomInt,
} from "$lib/math-engine/random";
import type { SolutionStep } from "$lib/math-engine/types";
import type { ConvolutionProblem, ConvolutionProblemSource } from "./engine";
import {
	solveExpExpConvolution,
	solveRectExpConvolution,
} from "./exponential-solvers";
import { formatRectPulseLatex } from "./pulse-formatting";
import {
	solveMultiRectConvolution,
	solveRectRectConvolution,
	solveShiftedRectConvolution,
} from "./rect-solvers";
import {
	solveStepExpConvolution,
	solveStepRectConvolution,
} from "./step-solvers";
import {
	solveShiftedTriTriConvolution,
	solveTriRectConvolution,
} from "./triangle-solvers";
import type {
	ConvolutionGenerationOptions,
	ConvolutionPairType,
	ConvolutionResult,
	ExpSignal,
	RectSignal,
} from "./types";

type AttachTutor = (source: ConvolutionProblemSource) => ConvolutionProblem;

/** Builds concise worked-solution metadata shared by generated categories. */
function solutionSteps(result: ConvolutionResult): SolutionStep[] {
	return [
		{
			title: "Define and Transform the Convolution Integral",
			description:
				"Choose one signal to keep fixed and reflect and translate the other signal.",
			latex: String.raw`y(t)=\int_{-\infty}^{\infty}x(\tau)h(t-\tau)\,d\tau`,
		},
		{
			title: "Find Contacts, Bounds, and Interval Results",
			description:
				"Use breakpoint contacts to partition time, then integrate each connected overlap.",
			latex: result.intervals
				.map(
					({ labelLatex, exprLatex }) =>
						String.raw`y(t)=${exprLatex}\quad(${labelLatex})`,
				)
				.join(String.raw`,\quad `),
		},
	];
}

/** Attaches common problem fields to one analytical result. */
function source(
	seed: number,
	pairType: ConvolutionPairType,
	title: string,
	xLatex: string,
	hLatex: string,
	result: ConvolutionResult,
	extra: Partial<ConvolutionProblemSource> = {},
): ConvolutionProblemSource {
	return {
		id: `conv_${pairType}_${seed >>> 0}`,
		seed,
		pairType,
		title,
		xLatex,
		hLatex,
		solutionSteps: solutionSteps(result),
		intervals: result.intervals,
		eval: result.eval,
		evalX: result.evalX,
		evalH: result.evalH,
		...extra,
	};
}

/** Generates one seeded convolution problem from the named practice category. */
export function generateLegacyConvolutionProblem(
	pairType: ConvolutionPairType = "rect_rect",
	options: ConvolutionGenerationOptions = {},
	attachTutor: AttachTutor,
): ConvolutionProblem {
	const seed = options.seed ?? createRandomSeed();
	const random = createSeededPrng(seed);
	switch (pairType) {
		case "rect_rect":
		case "rect_shifted_rect":
		case "rect_both_shifted": {
			const firstWidth = randomInt(random, 1, 2);
			const secondWidth = firstWidth + randomInt(random, 1, 2);
			const firstShift =
				pairType === "rect_both_shifted" ? randomInt(random, 1, 2) : 0;
			const secondShift =
				pairType === "rect_rect" ? 0 : randomInt(random, 1, 3);
			const first: RectSignal = {
				tStart: firstShift - firstWidth / 2,
				width: firstWidth,
				height: 1,
			};
			const second: RectSignal = {
				tStart: secondShift - secondWidth / 2,
				width: secondWidth,
				height: randomInt(random, 1, 2),
			};
			const result =
				pairType === "rect_rect"
					? solveRectRectConvolution(first, second)
					: solveShiftedRectConvolution(first, second);
			result.pairType = pairType;
			return attachTutor(
				source(
					seed,
					pairType,
					"Rectangular Pulse Convolution",
					formatRectPulseLatex(firstWidth, firstShift),
					formatRectPulseLatex(
						secondWidth,
						secondShift,
						second.height,
					),
					result,
					{
						xBreakpoints: [
							first.tStart,
							first.tStart + first.width,
						],
						hBreakpoints: [
							second.tStart,
							second.tStart + second.width,
						],
						timeRange: [
							first.tStart + second.tStart - 2,
							first.tStart +
								first.width +
								second.tStart +
								second.width +
								2,
						],
					},
				),
			);
		}
		case "multi_rect": {
			const result = solveMultiRectConvolution();
			return attachTutor(
				source(
					seed,
					pairType,
					"Multiple Rectangular Pulses",
					String.raw`\operatorname{rect}(t-0.5)+\operatorname{rect}(t-3.5)`,
					String.raw`\operatorname{rect}(t/2-0.5)`,
					result,
					{
						xBreakpoints: [0, 1, 3, 4],
						hBreakpoints: [0, 2],
						timeRange: [-1, 7],
					},
				),
			);
		}
		case "rect_exp": {
			const width = randomInt(random, 1, 3);
			const decay = randomChoice(random, [1, 2, 3]);
			const rectangle: RectSignal = { tStart: 0, width, height: 1 };
			const exponential: ExpSignal = { a: decay, K: 1 };
			const result = solveRectExpConvolution(rectangle, exponential);
			return attachTutor(
				source(
					seed,
					pairType,
					"Rectangular Pulse and Exponential",
					formatRectPulseLatex(width, width / 2),
					`e^{-${decay}t}u(t)`,
					result,
					{
						xBreakpoints: [0, width],
						hBreakpoints: [0],
						timeRange: [-2, width + 5],
					},
				),
			);
		}
		case "exp_exp": {
			const firstRate = randomChoice(random, [1, 2]);
			const secondRate = randomChoice(random, [2, 3]);
			const result = solveExpExpConvolution(
				{ a: firstRate, K: 1 },
				{ a: secondRate, K: 1 },
			);
			return attachTutor(
				source(
					seed,
					pairType,
					"Exponential Convolution",
					`e^{-${firstRate}t}u(t)`,
					`e^{-${secondRate}t}u(t)`,
					result,
					{
						xBreakpoints: [0],
						hBreakpoints: [0],
						timeRange: [-2, 8],
					},
				),
			);
		}
		case "step_exp": {
			const decay = randomChoice(random, [1, 2, 3]);
			const result = solveStepExpConvolution({ a: decay, K: 1 });
			return attachTutor(
				source(
					seed,
					pairType,
					"Unit Step and Exponential",
					"u(t)",
					`e^{-${decay}t}u(t)`,
					result,
					{
						xBreakpoints: [0],
						hBreakpoints: [0],
						timeRange: [-2, 8],
					},
				),
			);
		}
		case "step_rect": {
			const width = randomInt(random, 1, 3);
			const result = solveStepRectConvolution(width);
			return attachTutor(
				source(
					seed,
					pairType,
					"Unit Step and Rectangular Pulse",
					"u(t)",
					formatRectPulseLatex(width, width / 2),
					result,
					{
						xBreakpoints: [0],
						hBreakpoints: [0, width],
						timeRange: [-2, width + 5],
					},
				),
			);
		}
		case "tri_rect": {
			const result = solveTriRectConvolution();
			return attachTutor(
				source(
					seed,
					pairType,
					"Triangular and Rectangular Pulse",
					String.raw`\operatorname{tri}(t/2)`,
					String.raw`\operatorname{rect}(t/2)`,
					result,
					{
						xBreakpoints: [-2, 0, 2],
						hBreakpoints: [-1, 1],
						timeRange: [-5, 5],
					},
				),
			);
		}
		case "tri_shifted_tri": {
			const shift = randomInt(random, 1, 3);
			const result = solveShiftedTriTriConvolution(shift);
			return attachTutor(
				source(
					seed,
					pairType,
					"Shifted Triangular Pulse Convolution",
					String.raw`\operatorname{tri}(t/2)`,
					`\\operatorname{tri}((t-${shift})/2)`,
					result,
					{
						xBreakpoints: [-2, 0, 2],
						hBreakpoints: [shift - 2, shift, shift + 2],
						timeRange: [shift - 5, shift + 5],
					},
				),
			);
		}
		case "bilateral_exp_rect": {
			const first: RectSignal = { tStart: 0, width: 2, height: 1 };
			const result = solveRectRectConvolution(first, first);
			result.pairType = pairType;
			return attachTutor(
				source(
					seed,
					pairType,
					"Bilateral Exponential and Rectangle",
					String.raw`e^{-|t|}`,
					String.raw`\operatorname{rect}(t/2)`,
					result,
					{
						xBreakpoints: [0, 2],
						hBreakpoints: [0, 2],
						timeRange: [-2, 6],
					},
				),
			);
		}
		default: {
			const unhandled: never = pairType;
			throw new Error(`Unknown convolution pair type: ${unhandled}`);
		}
	}
}
