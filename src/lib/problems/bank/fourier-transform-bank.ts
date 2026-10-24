/**
 * Curated UIUC ECE 210 CTFT Exam Problem Bank.
 * Hand-verified problems covering transform pairs, operational properties,
 * duality, energy density spectra |X(ω)|^2, and 3dB energy bandwidths.
 */

import type { CtftProblem } from "$lib/math-engine/fourier-transform/index";

/** Hand-curated CTFT exam practice problems */
export const CTFT_EXAM_BANK: CtftProblem[] = [
	{
		id: "ctft-bank-1",
		promptLatex:
			"\\text{Calculate the CTFT } X(\\omega) \\text{ of } x(t) = \\operatorname{rect}\\left(\\frac{t - 3}{4}\\right)",
		referenceAnswerLatex:
			"4 \\operatorname{sinc}\\left(\\frac{2 \\omega}{\\pi}\\right) e^{-j 3 \\omega}",
		solutionSteps: [
			{
				title: "Step 1: Identify Base Rectangular Transform Pair",
				latex: "\\operatorname{rect}\\left(\\frac{t}{T}\\right) \\iff T \\operatorname{sinc}\\left(\\frac{T \\omega}{2 \\pi}\\right)",
			},
			{
				title: "Step 2: Substitute Parameter T = 4",
				latex: "\\operatorname{rect}\\left(\\frac{t}{4}\\right) \\iff 4 \\operatorname{sinc}\\left(\\frac{4 \\omega}{2 \\pi}\\right) = 4 \\operatorname{sinc}\\left(\\frac{2 \\omega}{\\pi}\\right)",
			},
			{
				title: "Step 3: Apply Time Shift Property",
				latex: "x(t - t_0) \\iff X(\\omega) e^{-j \\omega t_0} \\implies 4 \\operatorname{sinc}\\left(\\frac{2 \\omega}{\\pi}\\right) e^{-j 3 \\omega}",
			},
		],
	},
	{
		id: "ctft-bank-2",
		promptLatex:
			"\\text{Find the inverse CTFT } x(t) \\text{ of } X(\\omega) = \\frac{1}{4 + j\\omega} e^{-j 2 \\omega}",
		referenceAnswerLatex: "e^{-4 (t - 2)} u(t - 2)",
		solutionSteps: [
			{
				title: "Step 1: Recall One-Sided Exponential Pair",
				latex: "e^{-a t} u(t) \\iff \\frac{1}{a + j\\omega} \\implies a = 4",
			},
			{
				title: "Step 2: Apply Time Shift Property in Reverse",
				latex: "X(\\omega) e^{-j \\omega t_0} \\iff x(t - t_0) \\implies e^{-4 (t - 2)} u(t - 2)",
			},
		],
	},
	{
		id: "ctft-bank-3",
		promptLatex:
			"\\text{Compute the 3dB Energy Bandwidth } \\omega_{3dB} \\text{ for } x(t) = e^{-3 t} u(t)",
		referenceAnswerLatex: "\\omega_{3dB} = 3 \\text{ rad/s}",
		solutionSteps: [
			{
				title: "Step 1: Form Energy Spectrum |X(w)|^2",
				latex: "|X(\\omega)|^2 = \\left| \\frac{1}{3 + j\\omega} \\right|^2 = \\frac{1}{9 + \\omega^2}",
			},
			{
				title: "Step 2: Set Spectrum Equal to Half Peak Energy",
				latex: "|X(0)|^2 = \\frac{1}{9} \\implies \\frac{1}{9 + \\omega_{3dB}^2} = \\frac{1}{2} \\cdot \\frac{1}{9} = \\frac{1}{18}",
			},
			{
				title: "Step 3: Solve for Corner Frequency",
				latex: "9 + \\omega_{3dB}^2 = 18 \\implies \\omega_{3dB}^2 = 9 \\implies \\omega_{3dB} = 3 \\text{ rad/s}",
			},
		],
	},
];
