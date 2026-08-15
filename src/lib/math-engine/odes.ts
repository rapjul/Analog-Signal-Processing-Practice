/**
 * Linear Constant Coefficient Ordinary Differential Equations Math Engine.
 * Handles 1st and 2nd-order ODE problem generation, analytical solving, step-by-step LaTeX solution breakdown,
 * and numerical evaluation for UIUC ECE 210.
 *
 * Implements:
 * - Second-order linear constant-coefficient ODEs: y''(t) + a1 y'(t) + a0 y(t) = x(t)
 * - Characteristic polynomial solving: Q(s) = s^2 + a1 s + a0 = 0
 * - Root classification: distinct real, repeated real, and complex conjugate roots
 * - Natural homogeneous response y_h(t) computation matching initial conditions y(0+), y'(0+)
 * - Particular solution y_p(t) for constant, exponential, and sinusoidal forcing functions
 * - Zero-Input response y_{ZI}(t) (due to initial energy only, x(t) = 0)
 * - Zero-State response y_{ZS}(t) (due to forcing input only, y(0-) = y'(0-) = 0)
 * - Complete response: y(t) = y_{ZI}(t) + y_{ZS}(t) = y_h(t) + y_p(t)
 */

import { formatOdeLhs, formatQuadraticPolynomial } from "./formatting";
import { toFractionLatex } from "./fraction";
import type { SolutionStep } from "./types";

/**
 * Classification of characteristic polynomial roots for second-order differential equations.
 * Dictates the functional form of the natural/homogeneous response y_h(t).
 */
export type RootType =
	/** Two distinct real roots r1 != r2, producing real exponential terms e^(r1 t) and e^(r2 t) */
	| "distinct_real"
	/** Repeated real root r1 = r2, producing damped terms e^(r t) and t e^(r t) */
	| "repeated_real"
	/** Complex conjugate pair alpha +/- j omega, producing damped sinusoids e^(alpha t) cos(omega t) and e^(alpha t) sin(omega t) */
	| "complex_conjugate";

/**
 * Forcing function x(t) input type for differential equations.
 * Dictates the undetermined coefficient form for the particular solution y_p(t).
 */
export type ForcingType =
	/** Constant input x(t) = K */
	| "constant"
	/** Exponential input x(t) = K e^(p t) */
	| "exponential"
	/** Sinusoidal input x(t) = K cos(omega t) */
	| "sinusoid";

/** Structural parameters defining a linear constant-coefficient ODE */
export interface OdeParams {
	/** Order of ODE (1 or 2) */
	order: number;
	/** Coefficient a2 for highest derivative y'' (defaults to 1 for monic polynomials) */
	a2: number;
	/** Coefficient a1 for first derivative y' */
	a1: number;
	/** Coefficient a0 for zero derivative y */
	a0: number;
	/** Characteristic polynomial roots r1, r2, and imaginary component im */
	roots: { r1: number; r2?: number; im?: number };
	/** Classification of roots (distinct_real, repeated_real, or complex_conjugate) */
	rootType: RootType;
}

/** Interface representing input forcing function x(t) */
export interface ForcingFunction {
	/** Forcing type category (constant, exponential, sinusoid) */
	type: ForcingType;
	/** Amplitude K */
	K: number;
	/** Exponential growth/decay rate p for K * exp(p*t) */
	p?: number;
	/** Radian frequency omega for K * cos(omega*t) */
	omega?: number;
	/** Formatted LaTeX string representation of forcing function x(t) */
	latex: string;
}

/** Interface representing solved particular solution y_p(t) */
export interface ParticularSolution {
	/** Functional form string description of trial ansatz */
	formDescription: string;
	/** Formatted LaTeX rendered particular solution y_p(t) */
	latex: string;
	/** Evaluator function for y_p(t) at time t */
	eval: (t: number) => number;
	/** Evaluator function for derivative y_p'(t) at time t */
	evalDeriv: (t: number) => number;
	/** Derived undetermined coefficients (Kp, A, B) */
	coeffs: { Kp?: number; A?: number; B?: number };
}

/** Interface representing natural homogeneous response y_h(t) */
export interface HomogeneousSolution {
	/** Formatted LaTeX rendered homogeneous solution y_h(t) */
	latex: string;
	/** Integration constant C1 */
	C1: number;
	/** Integration constant C2 */
	C2: number;
	/** Evaluator function for y_h(t) at time t */
	eval: (t: number) => number;
}

/** Evaluation option for ITS multiple-choice steps */
export interface OdeItsOption {
	/** Unique option id */
	id: string;
	/** LaTeX rendered mathematical expression */
	latex: string;
	/** Whether this option is mathematically correct */
	isCorrect: boolean;
	/** Targeted diagnostic explanation for why this distractor is incorrect */
	feedback?: string;
}

/** ITS Step 1: Characteristic Equation */
export interface OdeItsStep1 {
	/** Expected coefficient a2 for s^2 */
	expectedA2: number;
	/** Expected coefficient a1 for s */
	expectedA1: number;
	/** Expected coefficient a0 for constant term */
	expectedA0: number;
	/** Formatted characteristic equation LaTeX: a2 s^2 + a1 s + a0 = 0 */
	latex: string;
	/** 3-tiered progressive hints */
	hints: string[];
	/** Diagnostic feedback for misconceptions */
	misconceptions: Record<string, string>;
}

/** ITS Step 2: Characteristic Roots */
export interface OdeItsStep2 {
	/** Classification of characteristic roots */
	rootType: RootType;
	/** First root (real part if complex) */
	r1: number;
	/** Second root (real part if distinct real) */
	r2?: number;
	/** Imaginary component omega_d (if complex conjugate) */
	im?: number;
	/** 3-tiered progressive hints */
	hints: string[];
}

/** ITS Step 3: Homogeneous Form Template */
export interface OdeItsStep3 {
	/** Correct template matching the roots */
	correctTemplate: RootType;
	/** Instantiated template formula with roots and symbolic constants C1, C2 */
	formLatex: string;
	/** 3-tiered progressive hints */
	hints: string[];
	/** Diagnostic feedback for incorrect template selections */
	misconceptions: Record<string, string>;
}

/** ITS Step 4: Particular Solution Ansatz */
export interface OdeItsStep4 {
	/** Multiple-choice options for trial ansatz */
	options: OdeItsOption[];
	/** 3-tiered progressive hints */
	hints: string[];
}

/** ITS Step 5: Particular Coefficients */
export interface OdeItsStep5 {
	/** Solved Kp for constant/exponential forcing */
	expectedKp?: number;
	/** Solved A for sinusoidal forcing */
	expectedA?: number;
	/** Solved B for sinusoidal forcing */
	expectedB?: number;
	/** 3-tiered progressive hints */
	hints: string[];
}

/** ITS Step 6: Initial Conditions System and Constants */
export interface OdeItsStep6 {
	/** Solved constant C1 */
	expectedC1: number;
	/** Solved constant C2 */
	expectedC2: number;
	/** Particular value at t=0 */
	yp0: number;
	/** Particular derivative value at t=0 */
	dyp0: number;
	/** Effective homogeneous target y_h(0+) = y(0+) - y_p(0+) */
	targetYh0: number;
	/** Effective homogeneous target y_h'(0+) = y'(0+) - y_p'(0+) */
	targetDYh0: number;
	/** 3-tiered progressive hints */
	hints: string[];
}

/** ITS Step 7: Response Decomposition */
export interface OdeItsStep7 {
	/** Zero-input LaTeX expression */
	expectedZI: string;
	/** Zero-state LaTeX expression */
	expectedZS: string;
	/** 3-tiered progressive hints */
	hints: string[];
}

/** Complete ITS problem data container for ODE problem */
export interface OdeItsData {
	/** Step 1: Characteristic Equation Setup */
	step1: OdeItsStep1;
	/** Step 2: Roots */
	step2: OdeItsStep2;
	/** Step 3: Homogeneous Form */
	step3: OdeItsStep3;
	/** Step 4: Particular Ansatz */
	step4: OdeItsStep4;
	/** Step 5: Particular Coefficients */
	step5: OdeItsStep5;
	/** Step 6: Initial Conditions & Solved Constants */
	step6: OdeItsStep6;
	/** Step 7: Response Decomposition */
	step7: OdeItsStep7;
}

/** Complete ODE practice problem object containing metadata, analytical solutions, steps, and evaluators */
export interface OdeProblem {
	/** Unique problem identifier */
	id: string;
	/** Title of problem */
	title: string;
	/** Subjective difficulty level classification */
	difficulty: "easy" | "medium" | "hard";
	/** Differential equation parameters */
	params: OdeParams;
	/** Input forcing function parameters */
	forcing: ForcingFunction;
	/** Initial conditions y(0+) and y'(0+) */
	initialConditions: { y0: number; dy0: number };
	/** Formatted LaTeX differential equation prompt text */
	odeLatex: string;
	/** Expected target analytical solution components */
	solutions: {
		/** Classification of characteristic roots */
		rootType: RootType;
		/** First root of characteristic equation (real part if complex) */
		r1: number;
		/** Second root of characteristic equation (real part if complex) */
		r2?: number;
		/** Imaginary part of first root (if complex) */
		r1_im?: number;
		/** Imaginary part of second root (if complex) */
		r2_im?: number;
		/** LaTeX rendered homogeneous solution y_h(t) */
		y_h_latex: string;
		/** LaTeX rendered particular solution y_p(t) */
		y_p_latex: string;
		/** LaTeX rendered complete solution y(t) */
		y_complete_latex: string;
		/** LaTeX rendered zero-input response y_zi(t) */
		y_zi_latex: string;
		/** LaTeX rendered zero-state response y_zs(t) */
		y_zs_latex: string;
	};
	/** Progressive step-by-step solution breakdown steps for <StepReveal> */
	steps: SolutionStep[];
	/** Complete numerical evaluator closure for y(t) = y_h(t) + y_p(t) */
	evalComplete: (t: number) => number;
	/** Zero-input numerical evaluator closure for y_zi(t) */
	evalZI: (t: number) => number;
	/** Zero-state numerical evaluator closure for y_zs(t) */
	evalZS: (t: number) => number;
	/** Intelligent Tutoring System step-by-step metadata */
	itsData: OdeItsData;
}


/**
 * Solves a 2nd order characteristic equation s^2 + a1*s + a0 = 0.
 * @param {number} a1 Coefficient of s
 * @param {number} a0 Constant term
 * @returns {OdeParams} Parameter object containing roots and classification
 */
export function solveCharacteristicEquation(a1: number, a0: number): OdeParams {
	const disc = a1 * a1 - 4 * a0;
	if (Math.abs(disc) < 1e-9) {
		const r = -a1 / 2;
		return {
			order: 2,
			a2: 1,
			a1,
			a0,
			roots: { r1: r, r2: r },
			rootType: "repeated_real",
		};
	} else if (disc > 0) {
		const sqrtDisc = Math.sqrt(disc);
		const r1 = (-a1 + sqrtDisc) / 2;
		const r2 = (-a1 - sqrtDisc) / 2;
		return {
			order: 2,
			a2: 1,
			a1,
			a0,
			roots: { r1, r2 },
			rootType: "distinct_real",
		};
	} else {
		const sigma = -a1 / 2;
		const omega_d = Math.sqrt(-disc) / 2;
		return {
			order: 2,
			a2: 1,
			a1,
			a0,
			roots: { r1: sigma, im: omega_d },
			rootType: "complex_conjugate",
		};
	}
}

/**
 * Computes the particular solution y_p(t) for a 2nd-order ODE y'' + a1*y' + a0*y = x(t).
 * @param {OdeParams} ode ODE parameters
 * @param {ForcingFunction} forcing Forcing function parameters
 * @returns {ParticularSolution} Particular solution object
 */
export function computeParticularSolution(
	ode: OdeParams,
	forcing: ForcingFunction,
): ParticularSolution {
	const { a1, a0, rootType, roots } = ode;

	switch (forcing.type) {
		case "constant": {
			const K = forcing.K;
			if (Math.abs(a0) < 1e-9) {
				throw new Error("a0 must be non-zero for constant forcing");
			}
			const Kp = K / a0;
			return {
				formDescription: "y_p(t) = K_p",
				latex: `${toFractionLatex(Kp)}`,
				eval: () => Kp,
				evalDeriv: () => 0,
				coeffs: { Kp },
			};
		}
		case "exponential": {
			const K = forcing.K;
			const p = forcing.p ?? -1;

			// Check if p is a characteristic root
			const isRoot =
				rootType === "distinct_real" &&
				(Math.abs(p - roots.r1) < 1e-6 || Math.abs(p - (roots.r2 ?? 0)) < 1e-6);

			if (!isRoot) {
				const denom = p * p + a1 * p + a0;
				const Kp = K / denom;
				return {
					formDescription: "y_p(t) = K_p e^{p t}",
					latex: `${toFractionLatex(Kp)} e^{${p} t}`,
					eval: (t: number) => Kp * Math.exp(p * t),
					evalDeriv: (t: number) => Kp * p * Math.exp(p * t),
					coeffs: { Kp },
				};
			} else {
				const denom = 2 * p + a1;
				const Kp = K / denom;
				return {
					formDescription: "y_p(t) = K_p t e^{p t}",
					latex: `${toFractionLatex(Kp)} t e^{${p} t}`,
					eval: (t: number) => Kp * t * Math.exp(p * t),
					evalDeriv: (t: number) => Kp * (1 + p * t) * Math.exp(p * t),
					coeffs: { Kp },
				};
			}
		}
		case "sinusoid": {
			const K = forcing.K;
			const w = forcing.omega ?? 1;

			// Substitute y_p(t) = A*cos(w*t) + B*sin(w*t) into y_p'' + a1*y_p' + a0*y_p = K*cos(w*t):
			//   cos(w*t) term:  (a0 - w^2)*A + (a1*w)*B     = K
			//   sin(w*t) term: -(a1*w)*A     + (a0 - w^2)*B = 0
			// System matrix: [ m11  m12 ] [ A ] = [ K ]
			//                [ m21  m22 ] [ B ]   [ 0 ]
			const m11 = a0 - w * w;
			const m12 = a1 * w;
			const m21 = -a1 * w;
			const m22 = a0 - w * w;

			const det = m11 * m22 - m12 * m21;
			const A = (K * m22) / det;
			const B = (-K * m21) / det;

			const latexA = toFractionLatex(A);
			const latexB = toFractionLatex(B);

			let latexStr = "";
			if (Math.abs(A) > 1e-6) latexStr += `${latexA} \\cos(${w}t)`;
			if (B > 1e-6) latexStr += ` + ${latexB} \\sin(${w}t)`;
			else if (B < -1e-6) latexStr += ` - ${toFractionLatex(Math.abs(B))} \\sin(${w}t)`;
			if (!latexStr) latexStr = "0";

			return {
				formDescription: "y_p(t) = A \\cos(\\omega t) + B \\sin(\\omega t)",
				latex: latexStr,
				eval: (t: number) => A * Math.cos(w * t) + B * Math.sin(w * t),
				evalDeriv: (t: number) =>
					-A * w * Math.sin(w * t) + B * w * Math.cos(w * t),
				coeffs: { A, B },
			};
		}
		default: {
			throw new Error(`Unhandled forcing function type: ${forcing.type}`);
		}
	}
}

/**
 * Solves for constants C1 and C2 of the homogeneous solution given target initial conditions.
 * @param {OdeParams} ode ODE parameters
 * @param {number} targetY0 Target y_h(0+)
 * @param {number} targetDY0 Target y_h'(0+)
 * @returns {HomogeneousSolution} Homogeneous solution object
 */
export function solveHomogeneousConstants(
	ode: OdeParams,
	targetY0: number,
	targetDY0: number,
): HomogeneousSolution {
	const { rootType, roots } = ode;

	switch (rootType) {
		case "distinct_real": {
			const r1 = roots.r1;
			const r2 = roots.r2 ?? 0;
			// Solve initial condition system for y_h(t) = C1*e^(r1*t) + C2*e^(r2*t):
			//   y_h(0)  = C1 + C2 = targetY0
			//   y_h'(0) = r1*C1 + r2*C2 = targetDY0
			//           => C2 = (targetDY0 - r1 * targetY0) / (r2 - r1)
			const C2 = (targetDY0 - r1 * targetY0) / (r2 - r1);
			const C1 = targetY0 - C2;

			const c1Str = toFractionLatex(C1);
			const c2Str = toFractionLatex(C2);

			let latex = "";
			if (Math.abs(C1) > 1e-6) latex += `${c1Str} e^{${r1}t}`;
			if (C2 > 1e-6) latex += ` + ${c2Str} e^{${r2}t}`;
			else if (C2 < -1e-6) latex += ` - ${toFractionLatex(Math.abs(C2))} e^{${r2}t}`;
			if (!latex) latex = "0";

			return {
				latex,
				C1,
				C2,
				eval: (t: number) => C1 * Math.exp(r1 * t) + C2 * Math.exp(r2 * t),
			};
		}
		case "repeated_real": {
			const r = roots.r1;
			// Solve initial condition system for y_h(t) = (C1 + C2*t)*e^(r*t):
			//   y_h(0)  = C1 = targetY0
			//  y_h'(0)  = r*C1 + C2 = targetDY0 => C2 = targetDY0 - r*C1
			const C1 = targetY0;
			const C2 = targetDY0 - r * C1;

			const c1Str = toFractionLatex(C1);
			const c2Str = toFractionLatex(C2);

			let inner = "";
			if (Math.abs(C1) > 1e-6) inner += `${c1Str}`;
			if (C2 > 1e-6) inner += ` + ${c2Str}t`;
			else if (C2 < -1e-6) inner += ` - ${toFractionLatex(Math.abs(C2))}t`;

			const latex = inner ? `(${inner}) e^{${r}t}` : "0";

			return {
				latex,
				C1,
				C2,
				eval: (t: number) => (C1 + C2 * t) * Math.exp(r * t),
			};
		}
		// Complex conjugate: r1 = sigma + j*omega_d
		case "complex_conjugate": {
			const sigma = roots.r1;
			const omega_d = roots.im ?? 0;

			// Solve initial condition system for y_h(t) = e^(sigma*t)*(C1*cos(omega_d*t) + C2*sin(omega_d*t)):
			//   y_h(0)  = C1 = targetY0
			//  y_h'(0)  = sigma*C1 + omega_d*C2 = targetDY0 => C2 = (targetDY0 - sigma*C1) / omega_d
			const C1 = targetY0;
			const C2 = (targetDY0 - sigma * C1) / omega_d;

			const c1Str = toFractionLatex(C1);
			const c2Str = toFractionLatex(C2);

			let inner = "";
			if (Math.abs(C1) > 1e-6)
				inner += `${c1Str} \\cos(${toFractionLatex(omega_d)}t)`;
			if (C2 > 1e-6)
				inner += ` + ${c2Str} \\sin(${toFractionLatex(omega_d)}t)`;
			else if (C2 < -1e-6)
				inner += ` - ${toFractionLatex(Math.abs(C2))} \\sin(${toFractionLatex(omega_d)}t)`;

			const sigmaStr = sigma !== 0 ? `e^{${toFractionLatex(sigma)}t}` : "";
			const latex = inner ? `${sigmaStr} [ ${inner} ]` : "0";

			return {
				latex,
				C1,
				C2,
				eval: (t: number) =>
					Math.exp(sigma * t) *
					(C1 * Math.cos(omega_d * t) + C2 * Math.sin(omega_d * t)),
			};
		}
		default: {
			throw new Error(`Unhandled root type: ${rootType}`);
		}
	}
}

/**
 * Backward Constructive Generator for 2nd-order LCC ODE problems.
 * Constructs problems backwards from target roots to guarantee exact integer coefficients.
 *
 * Mathematical derivation process:
 * 1. Characteristic Polynomial Backward Synthesis:
 *    - For distinct real roots r1, r2 < 0: Q(s) = (s - r1)(s - r2) = s^2 - (r1 + r2)s + r1*r2.
 *    - For repeated real root r < 0: Q(s) = (s - r)^2 = s^2 - 2r s + r^2.
 *    - For complex conjugate pair alpha +/- j w_d: Q(s) = (s - alpha)^2 + w_d^2 = s^2 - 2 alpha s + (alpha^2 + w_d^2).
 * 2. Particular Solution (Ansatz Substitution):
 *    - Constant input x(t) = K -> y_p(t) = K_p where K_p = K / a0.
 *    - Exponential input x(t) = K e^(p t) -> y_p(t) = K_p e^(p t) where K_p = K / Q(p).
 *    - Sinusoidal input x(t) = K cos(w t) -> y_p(t) = A cos(w t) + B sin(w t) solved via 2x2 linear system.
 * 3. Total Response & Response Separation:
 *    - Solves 2x2 system for initial conditions y(0+) and y'(0+).
 *    - Decomposes into Zero-Input Response y_ZI(t) (x(t) = 0) and Zero-State Response y_ZS(t) (y(0+) = y'(0+) = 0).
 *
 * @param {RootType} targetRootType Desired characteristic root classification
 * @param {ForcingType} forcingType Desired input forcing function category
 * @returns {OdeProblem} Fully formulated OdeProblem object
 */
export function generateOdeProblem(
	targetRootType: RootType | "random" = "random",
	forcingType: ForcingType | "random" = "random",
): OdeProblem {
	const rootTypes: RootType[] = [
		"distinct_real",
		"repeated_real",
		"complex_conjugate",
	];
	const resolvedRootType: RootType =
		!targetRootType || targetRootType === "random"
			? rootTypes[Math.floor(Math.random() * rootTypes.length)]
			: targetRootType;

	const forcingTypes: ForcingType[] = ["constant", "exponential", "sinusoid"];
	const resolvedForcingType: ForcingType =
		!forcingType || forcingType === "random"
			? forcingTypes[Math.floor(Math.random() * forcingTypes.length)]
			: forcingType;

	let a1: number;
	let a0: number;
	let roots: { r1: number; r2?: number; im?: number };

	switch (resolvedRootType) {
		case "distinct_real": {
			// Characteristic polynomial: Q(s) = (s - r1)(s - r2) = s^2 - (r1 + r2)s + r1*r2 = s^2 + a1*s + a0
			const r1 = -Math.floor(Math.random() * 4 + 1); // -1 to -4
			const r2 = -Math.floor(Math.random() * 4 + 5); // -5 to -8
			a1 = -(r1 + r2);
			a0 = r1 * r2;
			roots = { r1, r2 };
			break;
		}
		case "repeated_real": {
			// Characteristic polynomial: Q(s) = (s - r)^2 = s^2 - 2r*s + r^2 = s^2 + a1*s + a0
			const r = -Math.floor(Math.random() * 4 + 1); // -1 to -4
			a1 = -2 * r;
			a0 = r * r;
			roots = { r1: r, r2: r };
			break;
		}
		// Complex conjugate: r1 = sigma + j*omega_d
		case "complex_conjugate": {
			// Characteristic polynomial: Q(s) = (s - sigma)^2 + omega_d^2 = s^2 - 2*sigma*s + (sigma^2 + omega_d^2) = s^2 + a1*s + a0
			const sigma = -Math.floor(Math.random() * 3 + 1); // -1 to -3
			const omega_d = Math.floor(Math.random() * 4 + 2); // 2 to 5
			a1 = -2 * sigma;
			a0 = sigma * sigma + omega_d * omega_d;
			roots = { r1: sigma, im: omega_d };
			break;
		}
		default: {
			throw new Error(`Unhandled target root type: ${resolvedRootType}`);
		}
	}

	const odeParams: OdeParams = {
		order: 2,
		a2: 1,
		a1,
		a0,
		roots,
		rootType: resolvedRootType,
	};

	let forcing: ForcingFunction;
	switch (resolvedForcingType) {
		case "constant": {
			const K = Math.floor(Math.random() * 6 + 1) * a0; // Multiple of a0 for clean y_p
			forcing = {
				type: "constant",
				K,
				latex: `${K}`,
			};
			break;
		}
		case "exponential": {
			const K = Math.floor(Math.random() * 5 + 2) * 2;
			const p = -Math.floor(Math.random() * 3 + 9); // -9 to -11 (avoid matching roots)
			forcing = {
				type: "exponential",
				K,
				p,
				latex: `${K} e^{${p}t}`,
			};
			break;
		}
		case "sinusoid": {
			const K = Math.floor(Math.random() * 10 + 2);
			const w = Math.floor(Math.random() * 3 + 1); // w = 1, 2, 3
			forcing = {
				type: "sinusoid",
				K,
				omega: w,
				latex: `${K} \\cos(${w}t)`,
			};
			break;
		}
		default: {
			throw new Error(`Unhandled forcing function type: ${forcingType}`);
		}
	}

	const initialConditions = {
		y0: Math.floor(Math.random() * 6 - 2), // -2 to 3
		dy0: Math.floor(Math.random() * 8 - 4), // -4 to 3
	};

	const particular = computeParticularSolution(odeParams, forcing);

	// Complete Response Solution (Complete y_h matches y(0+) - y_p(0+) and y'(0+) - y_p'(0+))
	const targetYh0 = initialConditions.y0 - particular.eval(0);
	const targetDYh0 = initialConditions.dy0 - particular.evalDeriv(0);
	const homogeneousComplete = solveHomogeneousConstants(
		odeParams,
		targetYh0,
		targetDYh0,
	);

	// Zero-Input Response Solution (x(t) = 0, y_p = 0, driven by y(0-), y'(0-))
	const homogeneousZI = solveHomogeneousConstants(
		odeParams,
		initialConditions.y0,
		initialConditions.dy0,
	);

	// Zero-State Response Solution (y(0-) = 0, y'(0-) = 0, driven by x(t))
	const targetYhZS = 0 - particular.eval(0);
	const targetDYhZS = 0 - particular.evalDeriv(0);
	const homogeneousZS = solveHomogeneousConstants(
		odeParams,
		targetYhZS,
		targetDYhZS,
	);

	const odeLatex = `${formatOdeLhs(1, a1, a0)} = ${forcing.latex}`;

	const completeLatex =
		particular.latex === "0"
			? homogeneousComplete.latex
			: `${homogeneousComplete.latex} + ${particular.latex}`;
	const ziLatex = homogeneousZI.latex;
	const zsLatex =
		particular.latex === "0"
			? homogeneousZS.latex
			: `${homogeneousZS.latex} + ${particular.latex}`;

	// Step 1: Characteristic Equation & Quadratic Root Solving
	const charEqLhs = formatQuadraticPolynomial(1, a1, a0, "s").replace(
		" = 0",
		"",
	);
	let step1Latex: string;
	switch (resolvedRootType) {
		case "distinct_real": {
			const r1 = roots.r1;
			const r2 = roots.r2 ?? 0;
			const f1 = r1 > 0 ? `- ${r1}` : `+ ${-r1}`;
			const f2 = r2 > 0 ? `- ${r2}` : `+ ${-r2}`;
			step1Latex = `${charEqLhs} &= 0 \\\\\n (s ${f1})(s ${f2}) &= 0 \\\\\n \\implies r_1 = ${r1}, \\; r_2 &= ${r2}`;
			break;
		}
		case "repeated_real": {
			const r = roots.r1;
			const f = r > 0 ? `- ${r}` : `+ ${-r}`;
			step1Latex = `${charEqLhs} &= 0 \\\\\n (s ${f})^2 &= 0 \\\\\n \\implies r_1 = r_2 &= ${r}`;
			break;
		}
		case "complex_conjugate": {
			const sigma = roots.r1;
			const omega_d = roots.im ?? 0;
			const disc = a1 * a1 - 4 * a0;
			step1Latex = `& ${charEqLhs} = 0 \\\\\n \\implies & s = \\frac{-(${a1}) \\pm \\sqrt{${a1}^2 - 4(1)(${a0})}}{2(1)} \\\\\n & = \\frac{-${a1} \\pm \\sqrt{${disc}}}{2} = ${sigma} \\pm j${omega_d}`;
			break;
		}
		default: {
			throw new Error(`Unhandled target root type: ${resolvedRootType}`);
		}
	}

	// Step 2: Homogeneous Solution General Form
	let step2Latex: string;
	switch (resolvedRootType) {
		case "distinct_real": {
			step2Latex = "y_h(t) = C_1 e^{r_1 t} + C_2 e^{r_2 t}";
			break;
		}
		case "repeated_real": {
			step2Latex = "y_h(t) = (C_1 + C_2 t) e^{r t}";
			break;
		}
		case "complex_conjugate": {
			step2Latex =
				"y_h(t) = e^{\\sigma t} [C_1 \\cos(\\omega_d t) + C_2 \\sin(\\omega_d t)]";
			break;
		}
		default: {
			throw new Error(`Unhandled target root type: ${resolvedRootType}`);
		}
	}

	// Step 3: Instantiated Homogeneous Solution Form with Roots
	let step3Latex: string;
	switch (resolvedRootType) {
		case "distinct_real": {
			step3Latex = `y_h(t) = C_1 e^{${roots.r1}t} + C_2 e^{${roots.r2}t}`;
			break;
		}
		case "repeated_real": {
			step3Latex = `y_h(t) = (C_1 + C_2 t) e^{${roots.r1}t}`;
			break;
		}
		case "complex_conjugate": {
			step3Latex = `y_h(t) = e^{${roots.r1}t} [C_1 \\cos(${roots.im}t) + C_2 \\sin(${roots.im}t)]`;
			break;
		}
		default: {
			throw new Error(`Unhandled target root type: ${resolvedRootType}`);
		}
	}

	// Step 4: Particular Solution Ansatz & Derivatives
	let step4Ansatz: string;
	let step4Derivs: string;
	switch (forcing.type) {
		case "constant": {
			step4Ansatz = "y_p(t) &= K_p";
			step4Derivs = "y_p'(t) &= 0 \\\\\n y_p''(t) &= 0";
			break;
		}
		case "exponential": {
			const p = forcing.p ?? 0;
			step4Ansatz = `y_p(t) &= K_p e^{${p}t}`;
			step4Derivs = `y_p'(t) &= ${p} K_p e^{${p}t} \\\\\n y_p''(t) &= ${p * p} K_p e^{${p}t}`;
			break;
		}
		case "sinusoid": {
			const w = forcing.omega ?? 1;
			step4Ansatz = `y_p(t) &= A \\cos(${w}t) + B \\sin(${w}t)`;
			step4Derivs = `y_p'(t) &= -${w} A \\sin(${w}t) + ${w} B \\cos(${w}t) \\\\\n y_p''(t) &= -${w * w} A \\cos(${w}t) - ${w * w} B \\sin(${w}t)`;
			break;
		}
		default: {
			throw new Error(`Unhandled forcing function type: ${forcing.type}`);
		}
	}

	// Step 5: Substitute y_p(t) into ODE & Solve Coefficients
	let step5Latex: string;
	switch (forcing.type) {
		case "constant": {
			step5Latex = `0 + 0 + ${a0} K_p &= ${forcing.K} \\\\\n \\implies \\; \\; \\, K_p &= ${toFractionLatex(particular.coeffs.Kp ?? 0)} \\\\\n \\implies y_p(t) &= ${particular.latex}`;
			break;
		}
		case "exponential": {
			const p = forcing.p ?? 0;
			const denom = p * p + a1 * p + a0;
			step5Latex = `(${p * p} + ${a1}(${p}) + ${a0}) K_p e^{${p}t} &= ${forcing.K} e^{${p}t} \\\\\n \\implies ${denom} K_p &= ${forcing.K} \\\\\n \\implies y_p(t) &= ${particular.latex}`;
			break;
		}
		case "sinusoid": {
			const K = forcing.K;
			const w = forcing.omega ?? 1;
			const m11 = a0 - w * w;
			const m12 = a1 * w;
			const m21 = -a1 * w;
			const m22 = a0 - w * w;
			step5Latex = `\\begin{cases} (${m11})A + (${m12})B = ${K} \\\\ (${m21})A + (${m22})B = 0 \\end{cases} \\implies y_p(t) = ${particular.latex}`;
			break;
		}
		default: {
			throw new Error(`Unhandled forcing function type: ${forcing.type}`);
		}
	}

	// Step 6: Form Complete Solution with Unsolved Constants
	const step6Latex =
		particular.latex === "0"
			? `y(t) = y_h(t) = ${step3Latex.replace("y_h(t) = ", "")}`
			: `y(t) = ${step3Latex.replace("y_h(t) = ", "")} + ${particular.latex}`;

	// Step 7: Initial Conditions System of Linear Equations
	let step7Latex: string;
	switch (resolvedRootType) {
		case "distinct_real": {
			const r1 = roots.r1;
			const r2 = roots.r2 ?? 0;
			const targetY0Frac = toFractionLatex(targetYh0);
			const targetDY0Frac = toFractionLatex(targetDYh0);
			step7Latex = `y(0^+) &= C_1 + C_2 + y_p(0^+) = ${initialConditions.y0} \\\\[0.5em] y'(0^+) &= ${r1} C_1 + ${r2} C_2 + y_p'(0^+) = ${initialConditions.dy0} \\\\[1.25em]\n \\implies &\\begin{cases} C_1 + C_2 = ${targetY0Frac} \\\\[0.5em] ${r1} C_1 + ${r2} C_2 = ${targetDY0Frac} \\end{cases}`;
			break;
		}
		case "repeated_real": {
			const r = roots.r1;
			const targetY0Frac = toFractionLatex(targetYh0);
			const targetDY0Frac = toFractionLatex(targetDYh0);
			step7Latex = `y(0^+) &= C_1 + y_p(0^+) = ${initialConditions.y0} \\\\[0.5em] y'(0^+) &= ${r} C_1 + C_2 + y_p'(0^+) = ${initialConditions.dy0} \\\\[1.25em]\n \\implies &\\begin{cases} C_1 = ${targetY0Frac} \\\\[0.5em] ${r} C_1 + C_2 = ${targetDY0Frac} \\end{cases}`;
			break;
		}
		case "complex_conjugate": {
			const sigma = roots.r1;
			const omega_d = roots.im ?? 0;
			const targetY0Frac = toFractionLatex(targetYh0);
			const targetDY0Frac = toFractionLatex(targetDYh0);
			step7Latex = `y(0^+) &= C_1 + y_p(0^+) = ${initialConditions.y0} \\\\[0.5em] y'(0^+) &= ${sigma} C_1 + ${omega_d} C_2 + y_p'(0^+) = ${initialConditions.dy0} \\\\[1.25em]\n \\implies &\\begin{cases} C_1 = ${targetY0Frac} \\\\[0.5em] ${sigma} C_1 + ${omega_d} C_2 = ${targetDY0Frac} \\end{cases}`;
			break;
		}
		default: {
			throw new Error(`Unhandled root type in Step 7 breakdown: ${resolvedRootType}`);
		}
	}

	// Step 8: Solved Constants & Total Response Equation
	const c1Str = toFractionLatex(homogeneousComplete.C1);
	const c2Str = toFractionLatex(homogeneousComplete.C2);
	const step8Latex = `C_1 &= ${c1Str}, \\quad C_2 = ${c2Str} \\\\[0.75em]\n \\implies y(t) &= ${completeLatex}`;

	// Step 9: Zero-Input & Zero-State Separation
	const step9Latex = `y_{ZI}(t) &= ${ziLatex} \\\\[0.75em]\n y_{ZS}(t) &= ${zsLatex}`;

	// Step 4 Particular Ansatz Options
	let step4Options: OdeItsOption[];
	switch (forcing.type) {
		case "constant": {
			step4Options = [
				{ id: "c1", latex: "y_p(t) = K_p", isCorrect: true },
				{
					id: "d1",
					latex: "y_p(t) = K_p t",
					isCorrect: false,
					feedback:
						"Resonance Multiplier Error: The factor of $t$ is only necessary if $s=0$ is a characteristic root ($a_0 = 0$). Here $a_0 \\neq 0$.",
				},
				{
					id: "d2",
					latex: "y_p(t) = K_p e^{-t}",
					isCorrect: false,
					feedback:
						"Ansatz Mismatch: The forcing input is constant, so the particular trial guess must be a constant $K_p$, not an exponential.",
				},
				{
					id: "d3",
					latex: "y_p(t) = A \\cos(t) + B \\sin(t)",
					isCorrect: false,
					feedback:
						"Ansatz Mismatch: Sinusoidal ansatz is only used for oscillating sinusoidal inputs.",
				},
			];
			break;
		}
		case "exponential": {
			const p = forcing.p ?? 0;
			step4Options = [
				{ id: "c1", latex: `y_p(t) = K_p e^{${p}t}`, isCorrect: true },
				{
					id: "d1",
					latex: "y_p(t) = K_p",
					isCorrect: false,
					feedback:
						"Ansatz Mismatch: The forcing input contains an exponential, so the particular trial solution must have an exponential.",
				},
				{
					id: "d2",
					latex: `y_p(t) = K_p t e^{${p}t}`,
					isCorrect: false,
					feedback:
						"Resonance Multiplier Error: The factor of $t$ is only needed when the exponential frequency matches a characteristic root.",
				},
				{
					id: "d3",
					latex: `y_p(t) = A \\cos(${p}t) + B \\sin(${p}t)`,
					isCorrect: false,
					feedback:
						"Ansatz Mismatch: Exponential forcing requires an exponential trial solution, not sinusoids.",
				},
			];
			break;
		}
		case "sinusoid": {
			const w = forcing.omega ?? 1;
			step4Options = [
				{
					id: "c1",
					latex: `y_p(t) = A \\cos(${w}t) + B \\sin(${w}t)`,
					isCorrect: true,
				},
				{
					id: "d1",
					latex: `y_p(t) = A \\cos(${w}t)`,
					isCorrect: false,
					feedback:
						"Missing Sine Component: Derivatives of cosine generate sine terms ($y_p' \\propto \\sin$), so both $A \\cos(\\omega t)$ and $B \\sin(\\omega t)$ are required.",
				},
				{
					id: "d2",
					latex: `y_p(t) = K_p e^{j ${w}t}`,
					isCorrect: false,
					feedback:
						"Complex Notation: Use the real-valued trigonometric pair $A \\cos(\\omega t) + B \\sin(\\omega t)$ for real differential equations.",
				},
				{
					id: "d3",
					latex: "y_p(t) = K_p",
					isCorrect: false,
					feedback:
						"Ansatz Mismatch: A constant trial solution cannot balance time-varying sinusoidal forcing.",
				},
			];
			break;
		}
		default: {
			throw new Error(`Unhandled forcing type in step 4: ${forcing.type}`);
		}
	}

	const charEqFormatted = formatQuadraticPolynomial(1, a1, a0, "s");
	const itsData: OdeItsData = {
		step1: {
			expectedA2: 1,
			expectedA1: a1,
			expectedA0: a0,
			latex: charEqFormatted,
			hints: [
				"Recall that differential operators map directly to powers of $s$: $\\frac{d^2}{dt^2} \\to s^2$, $\\frac{d}{dt} \\to s$, and $y(t) \\to 1$.",
				`Set the unforced homogeneous right-hand side to $0$ ($x(t) = 0$) to obtain $a_2 s^2 + a_1 s + a_0 = 0$.`,
				`For this differential equation, the characteristic equation is ${charEqFormatted}.`,
			],
			misconceptions: {
				forcing_rhs:
					"The characteristic equation reflects the unforced (homogeneous) system response with $x(t) = 0$, not the forcing amplitude.",
				sign_error:
					"Watch the signs: maintain the exact signs of the derivative coefficients from the original ODE.",
				operator_power:
					"Each derivative order corresponds to a power of $s$: $\\frac{d^2 y}{dt^2} \\to s^2$, $\\frac{dy}{dt} \\to s^1$, and $y(t) \\to s^0 = 1$.",
			},
		},
		step2: {
			rootType: resolvedRootType,
			r1: roots.r1,
			r2: roots.r2,
			im: roots.im,
			hints: [
				"Form the characteristic polynomial $s^2 + a_1 s + a_0 = 0$ by replacing derivatives with powers of $s$.",
				`The characteristic equation is ${charEqFormatted}. Apply the quadratic formula $s = \\frac{-${a1} \\pm \\sqrt{${a1 * a1} - 4(${a0})}}{2}$.`,
				resolvedRootType === "distinct_real"
					? `The characteristic roots are distinct real: $r_1 = ${roots.r1}, \\; r_2 = ${roots.r2}$.`
					: resolvedRootType === "repeated_real"
						? `The characteristic root is repeated: $r = ${roots.r1}$.`
						: `The characteristic roots are complex conjugate: $\\sigma = ${roots.r1}, \\; \\omega_d = ${roots.im}$ ($${roots.r1} \\pm j${roots.im}$).`,
			],
		},
		step3: {
			correctTemplate: resolvedRootType,
			formLatex: step3Latex,
			hints: [
				"Look at the roots found in Step 2: are they distinct real, repeated real, or complex conjugate?",
				"Distinct roots produce $C_1 e^{r_1 t} + C_2 e^{r_2 t}$. Repeated roots produce $(C_1 + C_2 t) e^{r t}$. Complex roots produce $e^{\\sigma t}[C_1 \\cos(\\omega_d t) + C_2 \\sin(\\omega_d t)]$.",
				`Since the roots are ${resolvedRootType.replace("_", " ")}, select the corresponding template.`,
			],
			misconceptions: {
				distinct_real:
					"Distinct real roots produce two separate exponential modes $C_1 e^{r_1 t} + C_2 e^{r_2 t}$.",
				repeated_real:
					"Repeated roots require the $(C_1 + C_2 t)$ multiplier to maintain two linearly independent basis solutions.",
				complex_conjugate:
					"Complex conjugate roots $\\sigma \\pm j\\omega_d$ generate oscillatory sines/cosines damped by an exponential envelope.",
			},
		},
		step4: {
			options: step4Options,
			hints: [
				`Inspect the forcing function $x(t) = ${forcing.latex}$. What form should the trial particular solution $y_p(t)$ take?`,
				"Match the functional shape of $x(t) (constant \\to K_p, exponential \\to K_p e^{pt}, sinusoid \\to A \\cos(\\omega t) + B \\sin(\\omega t))$.",
				"Check if the trial guess collides with any characteristic root in the homogeneous solution (resonance).",
			],
		},
		step5: {
			expectedKp: particular.coeffs.Kp,
			expectedA: particular.coeffs.A,
			expectedB: particular.coeffs.B,
			hints: [
				"Take derivatives of $y_p(t)$ ($y_p'$ and $y_p''$) and substitute them into the left-hand side of the ODE.",
				"Collect like terms and equate coefficients with the right-hand side forcing input $x(t)$.",
				forcing.type === "constant"
					? `Substitute $y_p = K_p, y_p'=0, y_p''=0$: $0 + 0 + ${a0} K_p = ${forcing.K} \\implies K_p = ${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`
					: forcing.type === "exponential"
						? `Substitute $y_p = K_p e^{${forcing.p}t}$: $(${((forcing.p ?? 0) ** 2) + a1 * (forcing.p ?? 0) + a0}) K_p = ${forcing.K} \\implies K_p = ${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`
						: `Set up the $2\\times 2$ system for $A$ and $B$ and solve.`,
			],
		},
		step6: {
			expectedC1: homogeneousComplete.C1,
			expectedC2: homogeneousComplete.C2,
			yp0: particular.eval(0),
			dyp0: particular.evalDeriv(0),
			targetYh0,
			targetDYh0,
			hints: [
				"Remember initial conditions apply to the TOTAL solution $y(t) = y_h(t) + y_p(t)$. First find $y_p(0^+)$ and $y_p'(0^+)$.",
				`Calculate the target homogeneous values: $y_h(0^+) = y(0^+) - y_p(0^+) = ${initialConditions.y0} - (${toFractionLatex(particular.eval(0))}) = ${toFractionLatex(targetYh0)}$ and $y_h'(0^+) = y'(0^+) - y_p'(0^+) = ${initialConditions.dy0} - (${toFractionLatex(particular.evalDeriv(0))}) = ${toFractionLatex(targetDYh0)}$.`,
				`Solve the $2\\times 2$ linear system for $C_1$ and $C_2$: $C_1 = ${c1Str}, \\; C_2 = ${c2Str}$.`,
			],
		},
		step7: {
			expectedZI: ziLatex,
			expectedZS: zsLatex,
			hints: [
				"$y_{ZI}(t)$ is the zero-input response (natural response satisfying initial conditions with $x(t)=0$).",
				"$y_{ZS}(t)$ is the zero-state response (response driven purely by $x(t)$ with zero initial conditions).",
				`$y_{ZI}(t) = ${ziLatex}$, \\; $y_{ZS}(t) = ${zsLatex}$.`,
			],
		},
	};

	// Progressive step-by-step solution pipeline (9 zero-guesswork steps)
	const steps = [
		{
			title: "Step 1: Characteristic Equation & Roots",
			description:
				"Form the characteristic polynomial, set it equal to 0, and solve for its roots.",
			latex: step1Latex,
			aligned: true,
		},
		{
			title: "Step 2: Homogeneous Solution Functional Form",
			description: `Based on the ${resolvedRootType.replace("_", " ")} root classification, state the general homogeneous solution template.`,
			latex: step2Latex,
		},
		{
			title: "Step 3: Instantiated Homogeneous Solution",
			description:
				"Substitute the calculated characteristic roots into the homogeneous solution form.",
			latex: step3Latex,
		},
		{
			title: "Step 4: Particular Solution Ansatz & Derivatives",
			description:
				"Form the trial particular solution $y_p(t)$ and calculate its derivatives for ODE substitution.",
			latex: `${step4Ansatz} \\\\\n${step4Derivs}`,
			aligned: true,
		},
		{
			title: "Step 5: Substitute $y_p(t)$ & Solve Coefficients",
			description:
				"Substitute $y_p(t)$ and its derivatives into the ODE to solve for the undetermined coefficient(s).",
			latex: step5Latex,
			aligned: true,
		},
		{
			title: "Step 6: Total Response Form $y(t) = y_h(t) + y_p(t)$",
			description:
				"Combine the natural response $y_h(t)$ and particular response $y_p(t)$ into the total solution structure.",
			latex: step6Latex,
		},
		{
			title: "Step 7: Initial Conditions Linear System",
			description:
				"Evaluate $y(0^+)$ and $y'(0^+)$ to build a 2x2 system of linear equations for constants $C_1$ and $C_2$.",
			latex: step7Latex,
			aligned: true,
		},
		{
			title: "Step 8: Solve Constants & Total Response Equation",
			description:
				"Solve the 2x2 system for constants $C_1$ and $C_2$ to state the total response $y(t)$.",
			latex: step8Latex,
			aligned: true,
		},
		{
			title: "Step 9: Separation of Responses (Zero-Input & Zero-State)",
			description:
				"Decompose the total response into Zero-Input (initial energy only) and Zero-State (input driven only) components.",
			latex: step9Latex,
			aligned: true,
		},
	];

	const evalComplete = (t: number) =>
		homogeneousComplete.eval(t) + particular.eval(t);
	const evalZI = (t: number) => homogeneousZI.eval(t);
	const evalZS = (t: number) => homogeneousZS.eval(t) + particular.eval(t);

	const difficulty: "easy" | "medium" | "hard" =
		resolvedRootType === "distinct_real" && resolvedForcingType === "constant"
			? "easy"
			: resolvedRootType === "complex_conjugate" || resolvedForcingType === "sinusoid"
				? "hard"
				: "medium";

	return {
		id: `ode_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
		title: "Practice Problem: 2nd-Order LCC ODE",
		difficulty,
		params: odeParams,
		forcing,
		initialConditions,
		odeLatex,
		solutions: {
			rootType: resolvedRootType,
			r1: roots.r1,
			r2: roots.r2,
			r1_im: roots.im,
			r2_im: roots.im ? -roots.im : undefined,
			y_h_latex: homogeneousComplete.latex,
			y_p_latex: particular.latex,
			y_complete_latex: completeLatex,
			y_zi_latex: ziLatex,
			y_zs_latex: zsLatex,
		},
		steps,
		evalComplete,
		evalZI,
		evalZS,
		itsData,
	};
}
