/**
 * Curated UIUC ECE 210 Circuit Analysis & H(s) Exam Problem Bank (12+ Problems).
 * Covers Series RLC, Parallel RLC, Parallel LC in Series with R,
 * Parallel RC in Series with L, 1st-Order RC/RL LPF, and Active Sallen-Key filters.
 */

import type { CircuitProblem } from "$lib/math-engine/circuits";

export const CIRCUITS_EXAM_BANK: CircuitProblem[] = [
	// --- Topology 1: Series RLC ---
	{
		id: "circuits-bank-1",
		components: { R: 20, L: 2, C: 0.05 },
		topology: "series-rlc",
		promptLatex:
			"\\text{Derive } H(s) = \\frac{V_R(s)}{V_{in}(s)} \\text{ for Series RLC with } R = 20\\Omega, L = 2\\text{H}, C = 0.05\\text{F}",
		referenceAnswerLatex: "\\frac{10 s}{s^2 + 10 s + 10}",
		solutionSteps: [
			{
				title: "Step 1: Impedance Voltage Divider",
				latex: "H(s) = \\frac{R}{sL + R + \\frac{1}{sC}} = \\frac{\\frac{R}{L} s}{s^2 + \\frac{R}{L} s + \\frac{1}{LC}}",
			},
			{
				title: "Step 2: Plug in Values",
				latex: "\\frac{R}{L} = 10, \\quad \\omega_0^2 = \\frac{1}{2 \\times 0.05} = 10 \\implies H(s) = \\frac{10s}{s^2 + 10s + 10}",
			},
		],
	},
	{
		id: "circuits-bank-2",
		components: { R: 4, L: 1, C: 0.25 },
		topology: "series-rlc",
		promptLatex:
			"\\text{Find } H(s) \\text{ for Series RLC Bandpass filter with } R = 4\\Omega, L = 1\\text{H}, C = 0.25\\text{F}",
		referenceAnswerLatex: "\\frac{4 s}{s^2 + 4 s + 4}",
		solutionSteps: [
			{
				title: "Step 1: Apply Transfer Function Formula",
				latex: "H(s) = \\frac{\\frac{R}{L} s}{s^2 + \\frac{R}{L} s + \\frac{1}{LC}}",
			},
			{
				title: "Step 2: Calculate Parameters",
				latex: "\\frac{R}{L} = 4, \\quad \\frac{1}{LC} = 4 \\implies H(s) = \\frac{4s}{s^2 + 4s + 4}",
			},
		],
	},

	// --- Topology 2: Parallel RLC ---
	{
		id: "circuits-bank-3",
		components: { R: 5, L: 2, C: 0.1 },
		topology: "parallel-rlc",
		promptLatex:
			"\\text{Derive } H(s) = \\frac{I_R(s)}{I_{in}(s)} \\text{ for Parallel RLC with } R = 5\\Omega, L = 2\\text{H}, C = 0.1\\text{F}",
		referenceAnswerLatex: "\\frac{2 s}{s^2 + 2 s + 5}",
		solutionSteps: [
			{
				title: "Step 1: Admittance Division",
				latex: "H(s) = \\frac{\\frac{1}{R}}{\\frac{1}{R} + \\frac{1}{sL} + sC} = \\frac{\\frac{1}{RC} s}{s^2 + \\frac{1}{RC} s + \\frac{1}{LC}}",
			},
			{
				title: "Step 2: Plug in Values",
				latex: "\\frac{1}{RC} = \\frac{1}{0.5} = 2, \\quad \\frac{1}{LC} = 5 \\implies H(s) = \\frac{2s}{s^2 + 2s + 5}",
			},
		],
	},
	{
		id: "circuits-bank-4",
		components: { R: 10, L: 1, C: 0.05 },
		topology: "parallel-rlc",
		promptLatex:
			"\\text{Find } H(s) \\text{ for Parallel RLC filter with } R = 10\\Omega, L = 1\\text{H}, C = 0.05\\text{F}",
		referenceAnswerLatex: "\\frac{2 s}{s^2 + 2 s + 20}",
		solutionSteps: [
			{
				title: "Step 1: Apply Parallel RLC Formula",
				latex: "H(s) = \\frac{\\frac{1}{RC} s}{s^2 + \\frac{1}{RC} s + \\frac{1}{LC}}",
			},
			{
				title: "Step 2: Calculate Coefficients",
				latex: "\\frac{1}{RC} = 2, \\quad \\frac{1}{LC} = 20 \\implies H(s) = \\frac{2s}{s^2 + 2s + 20}",
			},
		],
	},

	// --- Topology 3: Parallel LC in Series with R (Notch/Bandstop) ---
	{
		id: "circuits-bank-5",
		components: { R: 10, L: 1, C: 0.01 },
		topology: "parallel-lc-series-r",
		promptLatex:
			"\\text{Find } H(s) \\text{ for Notch Filter with } R = 10\\Omega, L = 1\\text{H}, C = 0.01\\text{F}",
		referenceAnswerLatex: "\\frac{s^2 + 100}{s^2 + 10 s + 100}",
		solutionSteps: [
			{
				title: "Step 1: Derive Notch Transfer Function",
				latex: "H(s) = \\frac{s^2 + \\omega_0^2}{s^2 + \\frac{1}{RC} s + \\omega_0^2}",
			},
			{
				title: "Step 2: Calculate Corner Frequencies",
				latex: "\\omega_0^2 = \\frac{1}{LC} = 100, \\quad \\frac{1}{RC} = 10 \\implies H(s) = \\frac{s^2 + 100}{s^2 + 10s + 100}",
			},
		],
	},
	{
		id: "circuits-bank-6",
		components: { R: 5, L: 2, C: 0.02 },
		topology: "parallel-lc-series-r",
		promptLatex:
			"\\text{Find } H(s) \\text{ for Notch Filter with } R = 5\\Omega, L = 2\\text{H}, C = 0.02\\text{F}",
		referenceAnswerLatex: "\\frac{s^2 + 25}{s^2 + 10 s + 25}",
		solutionSteps: [
			{
				title: "Step 1: Apply Notch Transfer Function",
				latex: "H(s) = \\frac{s^2 + \\frac{1}{LC}}{s^2 + \\frac{1}{RC} s + \\frac{1}{LC}}",
			},
			{
				title: "Step 2: Substitute Values",
				latex: "\\frac{1}{LC} = 25, \\quad \\frac{1}{RC} = 10 \\implies H(s) = \\frac{s^2 + 25}{s^2 + 10s + 25}",
			},
		],
	},

	// --- Topology 4: Parallel RC in Series with L ---
	{
		id: "circuits-bank-7",
		components: { R: 10, L: 1, C: 0.01 },
		topology: "parallel-rc-series-l",
		promptLatex:
			"\\text{Find } H(s) \\text{ for Parallel RC in Series with L with } R = 10\\Omega, L = 1\\text{H}, C = 0.01\\text{F}",
		referenceAnswerLatex: "\\frac{s^2 + 10 s}{s^2 + 10 s + 100}",
		solutionSteps: [
			{
				title: "Step 1: Impedance Derivation",
				latex: "H(s) = \\frac{s^2 + \\frac{1}{RC} s}{s^2 + \\frac{1}{RC} s + \\frac{1}{LC}}",
			},
			{
				title: "Step 2: Substitute Parameters",
				latex: "\\frac{1}{RC} = 10, \\quad \\frac{1}{LC} = 100 \\implies H(s) = \\frac{s^2 + 10s}{s^2 + 10s + 100}",
			},
		],
	},
	{
		id: "circuits-bank-8",
		components: { R: 20, L: 2, C: 0.025 },
		topology: "parallel-rc-series-l",
		promptLatex:
			"\\text{Find } H(s) \\text{ for Parallel RC in Series with L with } R = 20\\Omega, L = 2\\text{H}, C = 0.025\\text{F}",
		referenceAnswerLatex: "\\frac{s^2 + 2 s}{s^2 + 2 s + 20}",
		solutionSteps: [
			{
				title: "Step 1: Impedance Derivation",
				latex: "H(s) = \\frac{s^2 + \\frac{1}{RC} s}{s^2 + \\frac{1}{RC} s + \\frac{1}{LC}}",
			},
			{
				title: "Step 2: Substitute Parameters",
				latex: "\\frac{1}{RC} = 2, \\quad \\frac{1}{LC} = 20 \\implies H(s) = \\frac{s^2 + 2s}{s^2 + 2s + 20}",
			},
		],
	},

	// --- Topology 5: 1st-Order RC / RL Low-Pass Filter ---
	{
		id: "circuits-bank-9",
		components: { R: 1000, L: 1, C: 0.000001 },
		topology: "rc-lpf",
		promptLatex:
			"\\text{Derive 1st-order RC LPF transfer function with } R = 1\\text{k}\\Omega, C = 1\\mu\\text{F}",
		referenceAnswerLatex: "\\frac{1000}{s + 1000}",
		solutionSteps: [
			{
				title: "Step 1: Voltage Divider Formula",
				latex: "H(s) = \\frac{\\frac{1}{sC}}{R + \\frac{1}{sC}} = \\frac{1}{1 + s R C} = \\frac{\\frac{1}{RC}}{s + \\frac{1}{RC}}",
			},
			{
				title: "Step 2: Calculate Corner Frequency w_c",
				latex: "\\omega_c = \\frac{1}{RC} = \\frac{1}{1000 \\times 10^{-6}} = 1000 \\text{ rad/s} \\implies H(s) = \\frac{1000}{s + 1000}",
			},
		],
	},
	{
		id: "circuits-bank-10",
		components: { R: 500, L: 1, C: 0.000002 },
		topology: "rc-lpf",
		promptLatex:
			"\\text{Find 3dB corner frequency } \\omega_c \\text{ for RC LPF with } R = 500\\Omega, C = 2\\mu\\text{F}",
		referenceAnswerLatex: "\\omega_c = 1000 \\text{ rad/s}",
		solutionSteps: [
			{
				title: "Step 1: Corner Frequency Formula",
				latex: "\\omega_c = \\frac{1}{R C}",
			},
			{
				title: "Step 2: Plug in Values",
				latex: "\\omega_c = \\frac{1}{500 \\times 2 \\times 10^{-6}} = 1000 \\text{ rad/s}",
			},
		],
	},

	// --- Topology 6: Active Sallen-Key 2nd-Order Filter ---
	{
		id: "circuits-bank-11",
		components: { R: 100, L: 1, C: 0.0001 },
		topology: "active-sallen-key",
		promptLatex:
			"\\text{Derive 2nd-Order Sallen-Key LPF transfer function with } R = 100\\Omega, C = 100\\mu\\text{F}",
		referenceAnswerLatex: "\\frac{10000}{s^2 + 200 s + 10000}",
		solutionSteps: [
			{
				title: "Step 1: Sallen-Key Transfer Function Formula",
				latex: "H(s) = \\frac{\\omega_c^2}{s^2 + 2 \\omega_c s + \\omega_c^2}",
			},
			{
				title: "Step 2: Calculate Corner Frequency w_c",
				latex: "\\omega_c = \\frac{1}{RC} = 100 \\text{ rad/s} \\implies \\omega_c^2 = 10000 \\implies H(s) = \\frac{10000}{s^2 + 200s + 10000}",
			},
		],
	},
	{
		id: "circuits-bank-12",
		components: { R: 50, L: 1, C: 0.0004 },
		topology: "active-sallen-key",
		promptLatex:
			"\\text{Derive 2nd-Order Sallen-Key LPF with } R = 50\\Omega, C = 400\\mu\\text{F}",
		referenceAnswerLatex: "\\frac{2500}{s^2 + 100 s + 2500}",
		solutionSteps: [
			{
				title: "Step 1: Calculate Corner Frequency w_c",
				latex: "\\omega_c = \\frac{1}{50 \\times 400 \\times 10^{-6}} = 50 \\text{ rad/s}",
			},
			{
				title: "Step 2: Form Transfer Function",
				latex: "\\omega_c^2 = 2500, \\quad 2\\omega_c = 100 \\implies H(s) = \\frac{2500}{s^2 + 100s + 2500}",
			},
		],
	},
];
