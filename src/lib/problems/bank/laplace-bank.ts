/**
 * Curated UIUC ECE 210 Laplace Transform Exam Problem Bank (12+ Problems).
 */

import type { LaplaceProblem } from "$lib/math-engine/laplace";

export const LAPLACE_EXAM_BANK: LaplaceProblem[] = [
	// --- Category 1: Inverse Laplace via PFD (Distinct Real Poles) ---
	{
		id: "laplace-bank-1",
		problemType: "inverse_pfd",
		promptLatex: "\\text{Solve for } x(t) = \\mathcal{L}^{-1}\\left\\{\\frac{2s + 10}{s^2 + 6s + 8}\\right\\}",
		referenceAnswerLatex: "3 e^{-2t} u(t) - e^{-4t} u(t)",
		solutionSteps: [
			{
				title: "Step 1: Factor Denominator",
				latex: "s^2 + 6s + 8 = (s + 2)(s + 4)",
			},
			{
				title: "Step 2: Solve PFD Residues",
				latex: "A = \\left. \\frac{2s+10}{s+4} \\right|_{s=-2} = 3, \\quad B = \\left. \\frac{2s+10}{s+2} \\right|_{s=-4} = -1",
			},
			{
				title: "Step 3: Inverse Transform",
				latex: "\\mathcal{L}^{-1}\\left\\{\\frac{3}{s+2} - \\frac{1}{s+4}\\right\\} = (3 e^{-2t} - e^{-4t}) u(t)",
			},
		],
	},
	{
		id: "laplace-bank-2",
		problemType: "inverse_pfd",
		promptLatex: "\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{\\frac{s + 7}{(s + 1)(s + 3)}\\right\\}",
		referenceAnswerLatex: "3 e^{-t} u(t) - 2 e^{-3t} u(t)",
		solutionSteps: [
			{
				title: "Step 1: PFD Setup",
				latex: "\\frac{s+7}{(s+1)(s+3)} = \\frac{A}{s+1} + \\frac{B}{s+3}",
			},
			{
				title: "Step 2: Solve Residues",
				latex: "A = \\left. \\frac{s+7}{s+3} \\right|_{s=-1} = 3, \\quad B = \\left. \\frac{s+7}{s+1} \\right|_{s=-3} = -2",
			},
			{
				title: "Step 3: Inverse Transform",
				latex: "x(t) = (3 e^{-t} - 2 e^{-3t}) u(t)",
			},
		],
	},
	{
		id: "laplace-bank-3",
		problemType: "inverse_pfd",
		promptLatex: "\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{\\frac{5s + 13}{s^2 + 5s + 6}\\right\\}",
		referenceAnswerLatex: "3 e^{-2t} u(t) + 2 e^{-3t} u(t)",
		solutionSteps: [
			{
				title: "Step 1: Factor Denominator",
				latex: "s^2 + 5s + 6 = (s + 2)(s + 3)",
			},
			{
				title: "Step 2: Solve PFD Residues",
				latex: "A = \\left. \\frac{5s+13}{s+3} \\right|_{s=-2} = 3, \\quad B = \\left. \\frac{5s+13}{s+2} \\right|_{s=-3} = 2",
			},
			{
				title: "Step 3: Inverse Transform",
				latex: "x(t) = (3 e^{-2t} + 2 e^{-3t}) u(t)",
			},
		],
	},
	{
		id: "laplace-bank-4",
		problemType: "inverse_pfd",
		promptLatex: "\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{\\frac{4s + 18}{s^2 + 7s + 10}\\right\\}",
		referenceAnswerLatex: "\\frac{10}{3} e^{-2t} u(t) + \\frac{2}{3} e^{-5t} u(t)",
		solutionSteps: [
			{
				title: "Step 1: Factor Denominator",
				latex: "s^2 + 7s + 10 = (s + 2)(s + 5)",
			},
			{
				title: "Step 2: Solve PFD Residues",
				latex: "A = \\left. \\frac{4s+18}{s+5} \\right|_{s=-2} = \\frac{10}{3}, \\quad B = \\left. \\frac{4s+18}{s+2} \\right|_{s=-5} = \\frac{2}{3}",
			},
			{
				title: "Step 3: Inverse Transform",
				latex: "x(t) = \\left(\\frac{10}{3} e^{-2t} + \\frac{2}{3} e^{-5t}\\right) u(t)",
			},
		],
	},

	// --- Category 2: Direct Inverse Laplace Transforms (Without PFD) ---
	{
		id: "laplace-bank-13",
		problemType: "inverse_direct",
		promptLatex: "\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{\\frac{3s + 8}{s^2 + 16}\\right\\}",
		referenceAnswerLatex: "(3 \\cos(4t) + 2 \\sin(4t)) u(t)",
		solutionSteps: [
			{
				title: "Step 1: Separate into Standard Trigonometric Forms",
				latex: "X(s) = 3 \\cdot \\frac{s}{s^2 + 4^2} + 2 \\cdot \\frac{4}{s^2 + 4^2}",
			},
			{
				title: "Step 2: Recall Standard Transform Pairs",
				latex: "\\mathcal{L}^{-1}\\left\\{\\frac{s}{s^2 + \\omega^2}\\right\\} = \\cos(\\omega t) u(t), \\quad \\mathcal{L}^{-1}\\left\\{\\frac{\\omega}{s^2 + \\omega^2}\\right\\} = \\sin(\\omega t) u(t)",
			},
			{
				title: "Step 3: Evaluate Inverse Transform directly",
				latex: "x(t) = (3 \\cos(4t) + 2 \\sin(4t)) u(t)",
			},
		],
	},
	{
		id: "laplace-bank-14",
		problemType: "inverse_direct",
		promptLatex: "\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{\\frac{s + 3}{(s + 3)^2 + 25}\\right\\}",
		referenceAnswerLatex: "e^{-3t} \\cos(5t) u(t)",
		solutionSteps: [
			{
				title: "Step 1: Identify Frequency-Shifting Property",
				latex: "\\mathcal{L}^{-1}\\{F(s + a)\\} = e^{-at} f(t) \\quad \\text{where } F(s) = \\frac{s}{s^2 + 5^2}",
			},
			{
				title: "Step 2: Evaluate Unshifted Time Function",
				latex: "f(t) = \\mathcal{L}^{-1}\\left\\{\\frac{s}{s^2 + 5^2}\\right\\} = \\cos(5t) u(t)",
			},
			{
				title: "Step 3: Apply Damping Exponential",
				latex: "x(t) = e^{-3t} \\cos(5t) u(t)",
			},
		],
	},
	{
		id: "laplace-bank-15",
		problemType: "inverse_direct",
		promptLatex: "\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{\\frac{4 e^{-2s}}{s + 5}\\right\\}",
		referenceAnswerLatex: "4 e^{-5(t-2)} u(t-2)",
		solutionSteps: [
			{
				title: "Step 1: Identify Time-Shift Property",
				latex: "\\mathcal{L}^{-1}\\{e^{-t_0 s} F(s)\\} = f(t - t_0) u(t - t_0) \\quad \\text{with } t_0 = 2",
			},
			{
				title: "Step 2: Inverse Transform of Unshifted Expression",
				latex: "f(t) = \\mathcal{L}^{-1}\\left\\{\\frac{4}{s + 5}\\right\\} = 4 e^{-5t} u(t)",
			},
			{
				title: "Step 3: Substitute Delayed Time Variable (t - 2)",
				latex: "x(t) = 4 e^{-5(t-2)} u(t-2)",
			},
		],
	},
	{
		id: "laplace-bank-16",
		problemType: "inverse_direct",
		promptLatex: "\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{\\frac{6}{(s + 4)^4}\\right\\}",
		referenceAnswerLatex: "t^3 e^{-4t} u(t)",
		solutionSteps: [
			{
				title: "Step 1: Match Power Rule Transform Pair",
				latex: "\\mathcal{L}^{-1}\\left\\{\\frac{n!}{s^{n+1}}\\right\\} = t^n u(t) \\quad \\text{with } n = 3, \\text{ since } 3! = 6",
			},
			{
				title: "Step 2: Apply s-Domain Shift Property",
				latex: "\\mathcal{L}^{-1}\\left\\{\\frac{6}{(s + 4)^4}\\right\\} = e^{-4t} \\mathcal{L}^{-1}\\left\\{\\frac{6}{s^4}\\right\\}",
			},
			{
				title: "Step 3: Write Final Time-Domain Expression",
				latex: "x(t) = t^3 e^{-4t} u(t)",
			},
		],
	},
	{
		id: "laplace-bank-17",
		problemType: "inverse_direct",
		promptLatex: "\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{5 + \\frac{6}{s + 2}\\right\\}",
		referenceAnswerLatex: "5 \\delta(t) + 6 e^{-2t} u(t)",
		solutionSteps: [
			{
				title: "Step 1: Identify Impulse & Exponential Pairs",
				latex: "\\mathcal{L}^{-1}\\{1\\} = \\delta(t), \\quad \\mathcal{L}^{-1}\\left\\{\\frac{1}{s + 2}\\right\\} = e^{-2t} u(t)",
			},
			{
				title: "Step 2: Apply Linearity Property",
				latex: "x(t) = 5 \\mathcal{L}^{-1}\\{1\\} + 6 \\mathcal{L}^{-1}\\left\\{\\frac{1}{s + 2}\\right\\}",
			},
			{
				title: "Step 3: Combine Terms",
				latex: "x(t) = 5 \\delta(t) + 6 e^{-2t} u(t)",
			},
		],
	},

	// --- Category 3: Forward Laplace Transform ---
	{
		id: "laplace-bank-5",
		problemType: "forward",
		promptLatex: "\\text{Compute } X(s) = \\mathcal{L}\\{(4 e^{-3t} + 2 e^{-5t}) u(t)\\}",
		referenceAnswerLatex: "\\frac{6s + 26}{s^2 + 8s + 15}",
		solutionSteps: [
			{
				title: "Step 1: Apply Exponential Transform Pair",
				latex: "\\mathcal{L}\\{e^{-at} u(t)\\} = \\frac{1}{s + a} \\implies X(s) = \\frac{4}{s+3} + \\frac{2}{s+5}",
			},
			{
				title: "Step 2: Combine Over Common Denominator",
				latex: "\\frac{4(s+5) + 2(s+3)}{(s+3)(s+5)} = \\frac{6s + 26}{s^2 + 8s + 15}",
			},
		],
	},
	{
		id: "laplace-bank-6",
		problemType: "forward",
		promptLatex: "\\text{Compute } X(s) = \\mathcal{L}\\{(e^{-t} - e^{-4t}) u(t)\\}",
		referenceAnswerLatex: "\\frac{3}{s^2 + 5s + 4}",
		solutionSteps: [
			{
				title: "Step 1: Apply Exponential Transform Pair",
				latex: "X(s) = \\frac{1}{s+1} - \\frac{1}{s+4}",
			},
			{
				title: "Step 2: Combine Terms",
				latex: "\\frac{(s+4) - (s+1)}{(s+1)(s+4)} = \\frac{3}{s^2 + 5s + 4}",
			},
		],
	},
	{
		id: "laplace-bank-7",
		problemType: "forward",
		promptLatex: "\\text{Compute } X(s) = \\mathcal{L}\\{(3 + 2 e^{-2t}) u(t)\\}",
		referenceAnswerLatex: "\\frac{5s + 6}{s(s + 2)}",
		solutionSteps: [
			{
				title: "Step 1: Apply Step & Exponential Pairs",
				latex: "\\mathcal{L}\\{3 u(t)\\} = \\frac{3}{s}, \\quad \\mathcal{L}\\{2 e^{-2t} u(t)\\} = \\frac{2}{s+2}",
			},
			{
				title: "Step 2: Combine Fractions",
				latex: "\\frac{3(s+2) + 2s}{s(s+2)} = \\frac{5s + 6}{s(s+2)}",
			},
		],
	},
	{
		id: "laplace-bank-8",
		problemType: "forward",
		promptLatex: "\\text{Compute } X(s) = \\mathcal{L}\\{(\\delta(t) + 4 e^{-2t}) u(t)\\}",
		referenceAnswerLatex: "\\frac{s + 6}{s + 2}",
		solutionSteps: [
			{
				title: "Step 1: Apply Impulse & Exponential Pairs",
				latex: "\\mathcal{L}\\{\\delta(t)\\} = 1, \\quad \\mathcal{L}\\{4 e^{-2t} u(t)\\} = \\frac{4}{s+2}",
			},
			{
				title: "Step 2: Add Terms",
				latex: "1 + \\frac{4}{s+2} = \\frac{(s+2) + 4}{s+2} = \\frac{s+6}{s+2}",
			},
		],
	},

	// --- Category 3: ROC & System Stability ---
	{
		id: "laplace-bank-9",
		problemType: "roc_stability",
		promptLatex: "\\text{Determine ROC and BIBO stability for causal system } X(s) = \\frac{s+1}{(s+2)(s+5)}",
		referenceAnswerLatex: "\\operatorname{Re}(s) > -2, \\quad \\text{BIBO Stable}",
		solutionSteps: [
			{
				title: "Step 1: Find Poles",
				latex: "D(s) = (s+2)(s+5) = 0 \\implies p_1 = -2, p_2 = -5",
			},
			{
				title: "Step 2: Right-Sided Causal ROC",
				latex: "\\operatorname{Re}(s) > \\max(-2, -5) \\implies \\operatorname{Re}(s) > -2",
			},
			{
				title: "Step 3: Check Stability",
				latex: "\\operatorname{Re}(s) = 0 \\text{ is in ROC } \\implies \\text{BIBO Stable}",
			},
		],
	},
	{
		id: "laplace-bank-10",
		problemType: "roc_stability",
		promptLatex: "\\text{Determine ROC and BIBO stability for anti-causal system } X(s) = \\frac{1}{s - 3}",
		referenceAnswerLatex: "\\operatorname{Re}(s) < 3, \\quad \\text{BIBO Stable}",
		solutionSteps: [
			{
				title: "Step 1: Find Pole",
				latex: "p_1 = 3",
			},
			{
				title: "Step 2: Left-Sided ROC",
				latex: "\\operatorname{Re}(s) < 3",
			},
			{
				title: "Step 3: Check Stability",
				latex: "\\operatorname{Re}(s) = 0 \\text{ lies in } \\operatorname{Re}(s) < 3 \\implies \\text{BIBO Stable}",
			},
		],
	},
	{
		id: "laplace-bank-11",
		problemType: "roc_stability",
		promptLatex: "\\text{Determine ROC and BIBO stability for causal system } X(s) = \\frac{1}{s - 2}",
		referenceAnswerLatex: "\\operatorname{Re}(s) > 2, \\quad \\text{Unstable}",
		solutionSteps: [
			{
				title: "Step 1: Find Pole",
				latex: "p_1 = 2",
			},
			{
				title: "Step 2: Causal ROC",
				latex: "\\operatorname{Re}(s) > 2",
			},
			{
				title: "Step 3: Check Stability",
				latex: "\\operatorname{Re}(s) = 0 \\text{ is NOT in } \\operatorname{Re}(s) > 2 \\implies \\text{Unstable}",
			},
		],
	},
	{
		id: "laplace-bank-12",
		problemType: "roc_stability",
		promptLatex: "\\text{Determine ROC and BIBO stability for two-sided system } X(s) = \\frac{1}{(s+2)(s-4)} \\text{ with } -2 < \\operatorname{Re}(s) < 4",
		referenceAnswerLatex: "-2 < \\operatorname{Re}(s) < 4, \\quad \\text{BIBO Stable}",
		solutionSteps: [
			{
				title: "Step 1: Identify Poles",
				latex: "p_1 = -2, p_2 = 4",
			},
			{
				title: "Step 2: Strip ROC",
				latex: "-2 < \\operatorname{Re}(s) < 4",
			},
			{
				title: "Step 3: Check Stability",
				latex: "\\operatorname{Re}(s) = 0 \\text{ lies in strip } (-2, 4) \\implies \\text{BIBO Stable}",
			},
		],
	},
];
