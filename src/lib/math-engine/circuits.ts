/**
 * Circuit Analysis & Transfer Functions H(s) Math Engine.
 * Implements 6 core circuit topologies, transfer function derivations, phasor AC steady-state,
 * and Bode magnitude/phase plots for UIUC ECE 210.
 */

import { formatCircuitTransferFunction } from "$lib/math-engine/circuit-formatting";

/**
 * Supported circuit topologies for transfer function H(s) derivation and Bode analysis.
 *
 * Covers 1st & 2nd-order passive RLC/RC/RL networks and active Op-Amp filters.
 */
export type CircuitTopology =
	/** 2nd-Order Series RLC Band-Pass Filter (Output across Resistor R) */
	| "series-rlc"
	/** 2nd-Order Series RLC Low-Pass Filter (Output across Capacitor C) */
	| "series-rlc-lpf"
	/** 2nd-Order Series RLC High-Pass Filter (Output across Inductor L) */
	| "series-rlc-hpf"
	/** 2nd-Order Parallel RLC Band-Pass Filter */
	| "parallel-rlc"
	/** 2nd-Order Parallel LC in Series with R (Notch / Band-Stop Filter) */
	| "parallel-lc-series-r"
	/** 2nd-Order Parallel RC in Series with L (High-Pass / Phase-Lag Filter) */
	| "parallel-rc-series-l"
	/** 1st-Order RC Low-Pass Filter */
	| "rc-lpf"
	/** 1st-Order RC High-Pass Filter */
	| "rc-hpf"
	/** 1st-Order RL Low-Pass Filter */
	| "rl-lpf"
	/** 1st-Order RL High-Pass Filter */
	| "rl-hpf"
	/** Active 2nd-Order Sallen-Key Low-Pass Filter */
	| "active-sallen-key"
	/** Active 2nd-Order Sallen-Key High-Pass Filter */
	| "active-sallen-key-hpf"
	/** Active Op-Amp Multiple-Feedback Band-Pass Filter */
	| "active-bpf"
	/** Passive/Active Twin-T Notch Filter */
	| "twin-t-notch"
	/** Active Op-Amp Inverting Integrator Circuit */
	| "active-integrator"
	/** Active Op-Amp Inverting Differentiator Circuit */
	| "active-differentiator";

/** Interface representing evaluated transfer function H(s) polynomial coefficients */
export interface TransferFunctionResult {
	/** Numerator polynomial coefficients ordered from highest to lowest power: [bm, ..., b0] */
	numCoeffs: number[];
	/** Denominator polynomial coefficients ordered from highest to lowest power: [an, ..., a0] */
	denCoeffs: number[];
	/** Formatted LaTeX expression for transfer function H(s) */
	hLatex: string;
}

/** Interface representing evaluated Bode magnitude and phase angle at frequency w */
export interface BodePoint {
	/** Frequency omega in rad/s */
	omega: number;
	/** Magnitude response in dB: 20 * log10(|H(j*w)|) */
	magnitudeDb: number;
	/** Phase angle Arg(H(j*w)) in degrees */
	phaseDeg: number;
}

/** Interface for an individual step in the circuit analysis solution breakdown */
export interface CircuitSolutionStep {
	/** Title or descriptive header of the step */
	title: string;
	/** Formatted LaTeX content illustrating algebraic or circuit derivations */
	latex: string;
}

/** Interface representing a dynamically generated circuit analysis practice problem */
export interface CircuitProblem {
	/** Unique identifier for the practice problem */
	id: string;
	/** Selected circuit topology category */
	topology: CircuitTopology;
	/** Component values used by every displayed calculation. */
	components: CircuitComponents;
	/** Formatted LaTeX prompt text describing the circuit and component values */
	promptLatex: string;
	/** Reference correct answer LaTeX string for H(s) */
	referenceAnswerLatex: string;
	/** Granular step-by-step solution derivation breakdown */
	solutionSteps: CircuitSolutionStep[];
}

/** Positive component values in SI units. */
export interface CircuitComponents {
	/** Resistance in ohms. */
	R: number;
	/** Inductance in henries; ignored for topologies without an inductor. */
	L: number;
	/** Capacitance in farads; ignored for topologies without a capacitor. */
	C: number;
}

/**
 * Identifies whether the topology uses an inductor.
 * @param topology - Circuit topology.
 * @returns Whether to show inductance controls.
 */
export function circuitUsesInductor(topology: CircuitTopology): boolean {
	return (
		!topology.startsWith("rc-") &&
		!topology.startsWith("active-") &&
		topology !== "twin-t-notch"
	);
}

/**
 * Identifies whether the topology uses a capacitor.
 * @param topology - Circuit topology.
 * @returns Whether to show capacitance controls.
 */
export function circuitUsesCapacitor(topology: CircuitTopology): boolean {
	return !topology.startsWith("rl-");
}

/**
 * Derives transfer function H(s) polynomial coefficients for a circuit topology.
 *
 * @param {CircuitTopology} topology Circuit topology key
 * @param {{ R?: number; L?: number; C?: number }} params Component values R, L, C
 * @returns {TransferFunctionResult} TransferFunctionResult object
 */
export function evaluateTransferFunction(
	topology: CircuitTopology,
	params: { R?: number; L?: number; C?: number } = {},
): TransferFunctionResult {
	const R = params.R ?? 10;
	const L = params.L ?? 1;
	const C = params.C ?? 0.01;
	const required = [R];
	if (circuitUsesInductor(topology)) required.push(L);
	if (circuitUsesCapacitor(topology)) required.push(C);
	if (!required.every((value) => Number.isFinite(value) && value > 0))
		throw new Error("Circuit components must be positive and finite");
	const components = {
		R,
		L: circuitUsesInductor(topology) ? L : 1,
		C: circuitUsesCapacitor(topology) ? C : 1,
	};
	const result = calculateTransferFunction(topology, components);
	return {
		...result,
		hLatex: formatCircuitTransferFunction(
			result.numCoeffs,
			result.denCoeffs,
			components,
		),
	};
}

/**
 * Calculates numerical polynomial coefficients for one circuit topology.
 * @param topology - Circuit topology.
 * @param components - Validated component values.
 * @returns Numerical coefficients for Bode evaluation.
 */
function calculateTransferFunction(
	topology: CircuitTopology,
	components: CircuitComponents,
): TransferFunctionResult {
	const { R, L, C } = components;

	switch (topology) {
		case "series-rlc": {
			// Series RLC Bandpass (Output across R): H(s) = (R/L * s) / (s^2 + (R/L)s + 1/(LC))
			const rOverL = R / L;
			const w0Sq = 1 / (L * C);
			return {
				numCoeffs: [rOverL, 0],
				denCoeffs: [1, rOverL, w0Sq],
				hLatex: `\\frac{${rOverL} s}{s^2 + ${rOverL} s + ${w0Sq}}`,
			};
		}
		case "series-rlc-lpf": {
			// Series RLC Lowpass (Output across C): H(s) = (1/(LC)) / (s^2 + (R/L)s + 1/(LC))
			const rOverL = R / L;
			const w0Sq = 1 / (L * C);
			return {
				numCoeffs: [w0Sq],
				denCoeffs: [1, rOverL, w0Sq],
				hLatex: `\\frac{${w0Sq}}{s^2 + ${rOverL} s + ${w0Sq}}`,
			};
		}
		case "series-rlc-hpf": {
			// Series RLC Highpass (Output across L): H(s) = s^2 / (s^2 + (R/L)s + 1/(LC))
			const rOverL = R / L;
			const w0Sq = 1 / (L * C);
			return {
				numCoeffs: [1, 0, 0],
				denCoeffs: [1, rOverL, w0Sq],
				hLatex: `\\frac{s^2}{s^2 + ${rOverL} s + ${w0Sq}}`,
			};
		}
		case "rc-lpf": {
			// 1st-order RC LPF: H(s) = (1 / (RC)) / (s + 1 / (RC))
			const wc = 1 / (R * C);
			return {
				numCoeffs: [wc],
				denCoeffs: [1, wc],
				hLatex: `\\frac{${wc}}{s + ${wc}}`,
			};
		}
		case "rc-hpf": {
			// 1st-order RC HPF: H(s) = s / (s + 1 / (RC))
			const wc = 1 / (R * C);
			return {
				numCoeffs: [1, 0],
				denCoeffs: [1, wc],
				hLatex: `\\frac{s}{s + ${wc}}`,
			};
		}
		case "rl-lpf": {
			// 1st-order RL LPF: H(s) = (R / L) / (s + R / L)
			const wc = R / L;
			return {
				numCoeffs: [wc],
				denCoeffs: [1, wc],
				hLatex: `\\frac{${wc}}{s + ${wc}}`,
			};
		}
		case "rl-hpf": {
			// 1st-order RL HPF: H(s) = s / (s + R / L)
			const wc = R / L;
			return {
				numCoeffs: [1, 0],
				denCoeffs: [1, wc],
				hLatex: `\\frac{s}{s + ${wc}}`,
			};
		}
		case "parallel-rlc": {
			const oneOverRC = 1 / (R * C);
			const w0Sq = 1 / (L * C);
			return {
				numCoeffs: [oneOverRC, 0],
				denCoeffs: [1, oneOverRC, w0Sq],
				hLatex: `\\frac{${oneOverRC} s}{s^2 + ${oneOverRC} s + ${w0Sq}}`,
			};
		}
		case "parallel-lc-series-r": {
			const w0Sq = 1 / (L * C);
			const oneOverRC = 1 / (R * C);
			return {
				numCoeffs: [1, 0, w0Sq],
				denCoeffs: [1, oneOverRC, w0Sq],
				hLatex: `\\frac{s^2 + ${w0Sq}}{s^2 + ${oneOverRC} s + ${w0Sq}}`,
			};
		}
		case "parallel-rc-series-l": {
			const w0Sq = 1 / (L * C);
			const oneOverRC = 1 / (R * C);
			return {
				numCoeffs: [1, oneOverRC, 0],
				denCoeffs: [1, oneOverRC, w0Sq],
				hLatex: `\\frac{s^2 + ${oneOverRC} s}{s^2 + ${oneOverRC} s + ${w0Sq}}`,
			};
		}
		case "active-sallen-key": {
			const wc = 1 / (R * C);
			return {
				numCoeffs: [wc * wc],
				denCoeffs: [1, 2 * wc, wc * wc],
				hLatex: `\\frac{${wc * wc}}{s^2 + ${2 * wc} s + ${wc * wc}}`,
			};
		}
		case "active-sallen-key-hpf": {
			const wc = 1 / (R * C);
			return {
				numCoeffs: [1, 0, 0],
				denCoeffs: [1, 2 * wc, wc * wc],
				hLatex: `\\frac{s^2}{s^2 + ${2 * wc} s + ${wc * wc}}`,
			};
		}
		case "active-bpf": {
			const wc = 1 / (R * C);
			return {
				numCoeffs: [-2 * wc, 0],
				denCoeffs: [1, 2 * wc, wc * wc],
				hLatex: `\\frac{-${2 * wc} s}{s^2 + ${2 * wc} s + ${wc * wc}}`,
			};
		}
		case "twin-t-notch": {
			const w0 = 1 / (R * C);
			return {
				numCoeffs: [1, 0, w0 * w0],
				denCoeffs: [1, 4 * w0, w0 * w0],
				hLatex: `\\frac{s^2 + ${w0 * w0}}{s^2 + ${4 * w0} s + ${w0 * w0}}`,
			};
		}
		case "active-integrator": {
			const wc = 1 / (R * C);
			return {
				numCoeffs: [-wc],
				denCoeffs: [1, 0],
				hLatex: `-\\frac{${wc}}{s}`,
			};
		}
		case "active-differentiator": {
			const wc = 1 / (R * C);
			return {
				numCoeffs: [-1 / wc, 0],
				denCoeffs: [1],
				hLatex: `-\\frac{s}{${wc}}`,
			};
		}
		default: {
			const _exhaustiveCheck: never = topology;
			throw new Error(
				`Unsupported topology: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Evaluates polynomial at jw.
 *
 * @param {number[]} coeffs Polynomial coefficients [a_n, ..., a_0]
 * @param {number} omega Frequency in rad/s
 * @returns {{ re: number; im: number }} Complex evaluation { re, im }
 */
function evalPolyJw(
	coeffs: number[],
	omega: number,
): { re: number; im: number } {
	let re = 0;
	let im = 0;
	const n = coeffs.length - 1;
	for (let i = 0; i <= n; i++) {
		const power = n - i;
		const coeff = coeffs[i] ?? 0;
		const wPow = omega ** power;
		if (power % 4 === 0) re += coeff * wPow;
		else if (power % 4 === 1) im += coeff * wPow;
		else if (power % 4 === 2) re -= coeff * wPow;
		else if (power % 4 === 3) im -= coeff * wPow;
	}
	return { re, im };
}

/**
 * Evaluates Bode plot magnitude (dB) and phase (degrees) at frequency omega.
 *
 * @param {CircuitTopology} topology Circuit topology
 * @param {{ R?: number; L?: number; C?: number }} params Component values
 * @param {number} omega Frequency in rad/s
 * @returns {BodePoint} BodePoint object
 */
export function evaluateBodePoint(
	topology: CircuitTopology,
	params: { R?: number; L?: number; C?: number },
	omega: number,
): BodePoint {
	const tf = evaluateTransferFunction(topology, params);
	const num = evalPolyJw(tf.numCoeffs, omega);
	const den = evalPolyJw(tf.denCoeffs, omega);

	const numMag = Math.hypot(num.re, num.im);
	const denMag = Math.hypot(den.re, den.im);
	const mag = denMag === 0 ? 1e6 : numMag / denMag;

	const numAng = Math.atan2(num.im, num.re);
	const denAng = Math.atan2(den.im, den.re);
	const phaseRad = numAng - denAng;

	return {
		omega,
		magnitudeDb: 20 * Math.log10(Math.max(mag, 1e-12)),
		phaseDeg: (phaseRad * 180) / Math.PI,
	};
}

/**
 * Generates a practice circuit problem with randomized component values.
 *
 * Mathematical derivation process:
 * 1. Randomly selects physically realistic component values R (Ohms), L (Henries), and C (Farads)
 *    from predefined discrete sets designed to produce clean, non-fractional characteristic parameters.
 * 2. Evaluates the transfer function H(s) = V_out(s) / V_in(s) using s-domain impedance substitution:
 *    - Z_R(s) = R
 *    - Z_L(s) = s * L
 *    - Z_C(s) = 1 / (s * C)
 * 3. Builds a step-by-step solution breakdown detailing impedance substitution, voltage divider setup,
 *    and final polynomial reduction matching UIUC ECE 210 exam standards.
 *
 * @param {CircuitTopology} topology Target circuit topology key
 * @returns {CircuitProblem} CircuitProblem object containing LaTeX prompt, reference answer, and steps
 */
export function generateCircuitProblem(
	topology: CircuitTopology = "series-rlc",
): CircuitProblem {
	// Discrete component value sets chosen to yield clean integer/rational coefficients in H(s)
	const rValues = [10, 20, 50, 100, 200];
	const lValues = [0.5, 1, 2, 5];
	const cValues = [0.01, 0.02, 0.05, 0.1];

	// Randomly sample R, L, and C
	const R = rValues[Math.floor(Math.random() * rValues.length)] ?? 1000;
	const L = lValues[Math.floor(Math.random() * lValues.length)] ?? 0.01;
	const C = cValues[Math.floor(Math.random() * cValues.length)] ?? 0.000001;
	return createCircuitProblem(topology, { R, L, C });
}

/**
 * Builds a reproducible circuit problem from one component model.
 * @param topology - Circuit topology.
 * @param components - Positive SI component values.
 * @returns Consistent prompt, transfer function, and derivation.
 */
export function createCircuitProblem(
	topology: CircuitTopology,
	components: CircuitComponents,
): CircuitProblem {
	const { R, L, C } = components;

	// Calculate symbolic transfer function polynomial coefficients via evaluateTransferFunction
	const tf = evaluateTransferFunction(topology, { R, L, C });

	// Map topology identifiers to student-friendly descriptive titles
	const topologyNames: Record<CircuitTopology, string> = {
		"series-rlc": "Series RLC Band-Pass Filter",
		"series-rlc-lpf": "Series RLC Low-Pass Filter",
		"series-rlc-hpf": "Series RLC High-Pass Filter",
		"parallel-rlc": "Parallel RLC Band-Pass Filter",
		"parallel-lc-series-r": "Parallel LC Series R Notch Filter",
		"parallel-rc-series-l": "Parallel RC Series L High-Pass Filter",
		"rc-lpf": "1st-Order RC Low-Pass Filter",
		"rc-hpf": "1st-Order RC High-Pass Filter",
		"rl-lpf": "1st-Order RL Low-Pass Filter",
		"rl-hpf": "1st-Order RL High-Pass Filter",
		"active-sallen-key": "Active 2nd-Order Sallen-Key Low-Pass Filter",
		"active-sallen-key-hpf": "Active 2nd-Order Sallen-Key High-Pass Filter",
		"active-bpf": "Active Op-Amp Band-Pass Filter",
		"twin-t-notch": "Twin-T Notch Filter",
		"active-integrator": "Active Op-Amp Integrator Circuit",
		"active-differentiator": "Active Op-Amp Differentiator Circuit",
	};

	const name = topologyNames[topology] ?? topology;
	const impedances = [String.raw`Z_R(s) = ${R}`];
	if (circuitUsesInductor(topology))
		impedances.push(String.raw`Z_L(s) = ${L}s`);
	if (circuitUsesCapacitor(topology))
		impedances.push(String.raw`Z_C(s) = \frac{1}{${C}s}`);

	// Construct granular zero-guesswork solution breakdown steps
	return {
		id: `circuit-${topology}-${Date.now()}`,
		topology,
		components: { ...components },
		promptLatex: `\\text{Derive the transfer function } H(s) \\text{ for the } \\text{${name}} \\text{ with } R = ${R}\\Omega${circuitUsesInductor(topology) ? `, L = ${L}\\text{H}` : ""}${circuitUsesCapacitor(topology) ? `, C = ${C}\\text{F}` : ""}.`,
		referenceAnswerLatex: tf.hLatex,
		solutionSteps: [
			{
				title: "Step 1: Replace Components with s-Domain Impedances",
				latex: impedances.join(String.raw`, \quad `),
			},
			{
				title: "Step 2: Apply Voltage Divider / Node Voltage Equations",
				latex: `H(s) = \\frac{Z_{out}(s)}{Z_{in}(s)} = ${tf.hLatex}`,
			},
			{
				title: "Step 3: Identify Characteristic Parameters",
				latex: `\\text{Derived Transfer Function } H(s) = ${tf.hLatex}`,
			},
		],
	};
}
