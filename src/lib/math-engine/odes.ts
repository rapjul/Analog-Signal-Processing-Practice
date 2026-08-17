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

import {
	formatOdeLhs,
	formatQuadraticPolynomial,
	formatRootFactor,
	formatSignedLinearTerm,
	sanitizeLatexMath,
} from "./formatting";
import { toFractionLatex } from "./fraction";
import type { BaseItsStep, ItsOption } from "./types";

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

/** Evaluation option for ITS multiple-choice steps (alias to shared ItsOption) */
export type OdeItsOption = ItsOption;

/** ITS Step 1: Characteristic Equation */
export interface OdeItsStep1 extends BaseItsStep {
	/** Formatted characteristic equation LaTeX: a2 s^2 + a1 s + a0 = 0 */
	latex: string;
	/** Expected coefficient a2 for s^2 */
	expectedA2: number;
	/** Expected coefficient a1 for s */
	expectedA1: number;
	/** Expected coefficient a0 for constant term */
	expectedA0: number;
	/** Diagnostic feedback for misconceptions */
	misconceptions: Record<string, string>;
}

/** ITS Step 2: Characteristic Roots & Strategy */
export interface OdeItsStep2 extends BaseItsStep {
	/** Classification of characteristic roots */
	rootType: RootType;
	/** Whether the characteristic polynomial can be factored over integers */
	isFactorable: boolean;
	/** Polynomial discriminant b^2 - 4ac */
	discriminant: number;
	/** Quadratic formula parameters and setup values */
	quadSetup: {
		/** Leading coefficient a (for s^2) */
		a: number;
		/** First derivative coefficient b (for s) */
		b: number;
		/** Constant coefficient c */
		c: number;
		/** Negated b (-b) */
		negB: number;
		/** Discriminant b^2 - 4ac */
		disc: number;
		/** Denominator 2a */
		twoA: number;
	};
	/** Exact symbolic formatted roots string in LaTeX */
	symbolicRootsLatex: string;
	/** Formatted factored polynomial expression (e.g. "(s + 2)(s + 3) = 0") if factorable */
	factoredFormLatex?: string;
	/** First root (real part if complex) */
	r1: number;
	/** Second root (real part if distinct real) */
	r2?: number;
	/** Imaginary component omega_d (if complex conjugate) */
	im?: number;
	/** Diagnostic misconception feedback dictionary */
	misconceptions: Record<string, string>;
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]>;
}

/** ITS Step 3: Homogeneous Form Template */
export interface OdeItsStep3 extends BaseItsStep {
	/** Correct template matching the roots */
	correctTemplate: RootType;
	/** Instantiated template formula with roots and symbolic constants C1, C2 */
	formLatex: string;
	/** Diagnostic feedback for incorrect template selections */
	misconceptions: Record<string, string>;
}

/** ITS Step 4: Particular Solution Ansatz */
export interface OdeItsStep4 extends BaseItsStep {
	/** Multiple-choice candidate ansatz options including pedagogical distractors */
	options: OdeItsOption[];
}

/** ITS Step 5: Particular Coefficients and Scaffolding */
export interface OdeItsStep5 extends BaseItsStep {
	/** Solved Kp for constant/exponential forcing */
	expectedKp?: number;
	/** Solved A for sinusoidal forcing */
	expectedA?: number;
	/** Solved B for sinusoidal forcing */
	expectedB?: number;
	/** Multiple-choice derivative options for combined legacy / Part 5A */
	derivativeOptions?: OdeItsOption[];
	/** Multiple-choice first derivative options for Part 5A-1 */
	firstDerivativeOptions?: OdeItsOption[];
	/** Multiple-choice second derivative options for Part 5A-2 (order >= 2) */
	secondDerivativeOptions?: OdeItsOption[];
	/** Multiple-choice system setup options for Part 5B */
	systemOptions?: OdeItsOption[];
	/** Correct derivative LaTeX string */
	derivativesLatex?: string;
	/** Correct first derivative LaTeX string */
	firstDerivLatex?: string;
	/** Correct second derivative LaTeX string */
	secondDerivLatex?: string;
	/** Correct system equations LaTeX string */
	systemLatex?: string;
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]>;
}

/** ITS Step 6: Initial Conditions System and Constants */
export interface OdeItsStep6 extends BaseItsStep {
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
	/** Concrete evaluated system of initial conditions LaTeX string */
	icSystemLatex: string;
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]>;
}

/** ITS Step 7: Response Decomposition & Conceptual Mastery */
export interface OdeItsStep7 extends BaseItsStep {
	/** Zero-input LaTeX expression */
	expectedZI: string;
	/** Zero-state LaTeX expression */
	expectedZS: string;
	/** Homogeneous constants for Zero-Input response (x(t) = 0) */
	ziConstants: { C1: number; C2: number };
	/** Homogeneous constants for Zero-State response (initial conditions = 0) */
	zsConstants: { C1: number; C2: number };
	/** Transient response LaTeX expression y_{tr}(t) */
	y_tr_latex: string;
	/** Steady-state response LaTeX expression y_{ss}(t) */
	y_ss_latex: string;
	/** Multiple-choice options for transient response identification */
	transientOptions: OdeItsOption[];
	/** Multiple-choice options for steady-state response identification */
	steadyStateOptions: OdeItsOption[];
	/** Targeted conceptual mastery question */
	conceptQuestion: {
		/** Question prompt formatted in LaTeX */
		prompt: string;
		/** List of multiple choice option answers */
		options: OdeItsOption[];
		/** Detailed conceptual explanation upon completion */
		explanation: string;
	};
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]>;
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

/** Complete ODE practice problem object containing metadata, analytical solutions, and evaluators */
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
		/** LaTeX rendered transient response y_tr(t) */
		y_tr_latex: string;
		/** LaTeX rendered steady-state response y_ss(t) */
		y_ss_latex: string;
	};
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
				(Math.abs(p - roots.r1) < 1e-6 ||
					Math.abs(p - (roots.r2 ?? 0)) < 1e-6);

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
					evalDeriv: (t: number) =>
						Kp * (1 + p * t) * Math.exp(p * t),
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
			else if (B < -1e-6)
				latexStr += ` - ${toFractionLatex(Math.abs(B))} \\sin(${w}t)`;
			if (!latexStr) latexStr = "0";

			return {
				formDescription:
					"y_p(t) = A \\cos(\\omega t) + B \\sin(\\omega t)",
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
			else if (C2 < -1e-6)
				latex += ` - ${toFractionLatex(Math.abs(C2))} e^{${r2}t}`;
			if (!latex) latex = "0";

			return {
				latex,
				C1,
				C2,
				eval: (t: number) =>
					C1 * Math.exp(r1 * t) + C2 * Math.exp(r2 * t),
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
			else if (C2 < -1e-6)
				inner += ` - ${toFractionLatex(Math.abs(C2))}t`;

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

			const sigmaStr =
				sigma !== 0 ? `e^{${toFractionLatex(sigma)}t}` : "";
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
	const y_tr_latex = homogeneousComplete.latex;
	const y_ss_latex = particular.latex;

	// Characteristic Equation LHS for hint calculations
	const charEqLhs = formatQuadraticPolynomial(1, a1, a0, "s").replace(
		" = 0",
		"",
	);

	// Homogeneous Solution Form with Roots for Step 3
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
			throw new Error(
				`Unhandled forcing type in step 4: ${forcing.type}`,
			);
		}
	}

	// Step 5 Derivative and System Scaffolding Options
	let step5DerivativeOptions: OdeItsOption[] = [];
	let step5FirstDerivOptions: OdeItsOption[] = [];
	let step5SecondDerivOptions: OdeItsOption[] = [];
	let step5SystemOptions: OdeItsOption[] = [];
	let step5DerivLatex = "";
	let step5FirstDerivLatex = "";
	let step5SecondDerivLatex = "";
	let step5SysLatex = "";

	if (forcing.type === "sinusoid") {
		const w = forcing.omega ?? 1;
		const w2 = w * w;
		const m11 = a0 - w2;
		const m12 = a1 * w;
		const m21 = -a1 * w;
		const m22 = a0 - w2;

		step5FirstDerivLatex = `y_p'(t) = -${w}A \\sin(${w}t) + ${w}B \\cos(${w}t)`;
		step5SecondDerivLatex = `y_p''(t) = -${w2}A \\cos(${w}t) - ${w2}B \\sin(${w}t)`;
		step5DerivLatex = `${step5FirstDerivLatex}, \\quad ${step5SecondDerivLatex}`;
		step5SysLatex = `\\begin{cases} (${m11})A + (${m12})B = ${forcing.K} \\\\ (${m21})A + (${m22})B = 0 \\end{cases}`;

		step5FirstDerivOptions = [
			{
				id: "d1_correct",
				latex: step5FirstDerivLatex,
				isCorrect: true,
			},
			{
				id: "d1_sign_cos",
				latex: `y_p'(t) = ${w}A \\sin(${w}t) + ${w}B \\cos(${w}t)`,
				isCorrect: false,
				feedback: `Trig Sign Error: $\\frac{d}{dt}\\cos(${w}t) = -${w}\\sin(${w}t)$, which introduces a negative sign on the sine term.`,
			},
			{
				id: "d1_sign_sin",
				latex: `y_p'(t) = -${w}A \\sin(${w}t) - ${w}B \\cos(${w}t)`,
				isCorrect: false,
				feedback: `Trig Sign Error: $\\frac{d}{dt}\\sin(${w}t) = +${w}\\cos(${w}t)$, maintaining a positive sign on the cosine term.`,
			},
			{
				id: "d1_missing_factor",
				latex: `y_p'(t) = -A \\sin(${w}t) + B \\cos(${w}t)`,
				isCorrect: false,
				feedback: `Chain Rule Error: Differentiating $\\cos(${w}t)$ and $\\sin(${w}t)$ pulls out the inner factor of ${w}.`,
			},
		];

		step5SecondDerivOptions = [
			{
				id: "d2_correct",
				latex: step5SecondDerivLatex,
				isCorrect: true,
			},
			{
				id: "d2_positive_signs",
				latex: `y_p''(t) = ${w2}A \\cos(${w}t) + ${w2}B \\sin(${w}t)`,
				isCorrect: false,
				feedback: `Sign Error: Differentiating $\\sin(${w}t)$ yields $+${w}\\cos(${w}t)$ (preserving the preceding negative sign), and differentiating $\\cos(${w}t)$ introduces another negative sign.`,
			},
			{
				id: "d2_missing_square",
				latex: `y_p''(t) = -${w}A \\cos(${w}t) - ${w}B \\sin(${w}t)`,
				isCorrect: false,
				feedback: `Chain Rule Error: Differentiating twice accumulates an inner factor of $(${w})^2 = ${w2}$.`,
			},
			{
				id: "d2_sign_sin_term",
				latex: `y_p''(t) = -${w2}A \\cos(${w}t) + ${w2}B \\sin(${w}t)`,
				isCorrect: false,
				feedback: `Sign Error: The second derivative of $B\\sin(${w}t)$ is $-${w2}B\\sin(${w}t)$.`,
			},
		];

		step5DerivativeOptions = [
			{
				id: "deriv_correct",
				latex: step5DerivLatex,
				isCorrect: true,
			},
			{
				id: "deriv_sign_err",
				latex: `y_p'(t) = ${w}A \\sin(${w}t) - ${w}B \\cos(${w}t), \\quad y_p''(t) = ${w2}A \\cos(${w}t) + ${w2}B \\sin(${w}t)`,
				isCorrect: false,
				feedback: `Sign Error in Derivatives: $\\frac{d}{dt}\\cos(${w}t) = -${w}\\sin(${w}t)$ and $\\frac{d}{dt}\\sin(${w}t) = ${w}\\cos(${w}t)$.`,
			},
			{
				id: "deriv_missing_omega",
				latex: `y_p'(t) = -A \\sin(${w}t) + B \\cos(${w}t), \\quad y_p''(t) = -A \\cos(${w}t) - B \\sin(${w}t)`,
				isCorrect: false,
				feedback: `Chain Rule Error: Differentiating $\\cos(${w}t)$ and $\\sin(${w}t)$ pulls out an inner factor of ${w}.`,
			},
		];

		step5SystemOptions = [
			{
				id: "sys_correct",
				latex: step5SysLatex,
				isCorrect: true,
			},
			{
				id: "sys_sign_err",
				latex: `\\begin{cases} (${m11})A - (${m12})B = ${forcing.K} \\\\ (${m12})A + (${m22})B = 0 \\end{cases}`,
				isCorrect: false,
				feedback: `Sign Error: Substituting $y_p', y_p''$ into $y'' + ${a1}y' + ${a0}y$ yields $(${m21})A + (${m22})B = 0$ for the sine equation.`,
			},
			{
				id: "sys_missing_factor",
				latex: `\\begin{cases} (${m11})A + (${a1})B = ${forcing.K} \\\\ (-${a1})A + (${m22})B = 0 \\end{cases}`,
				isCorrect: false,
				feedback: `Missing Inner Factor: The first derivative term contributes $a_1 \\cdot ${w} = ${m12}$, not just $a_1$.`,
			},
			{
				id: "sys_uncoupled",
				latex: `\\begin{cases} (${a0})A = ${forcing.K} \\\\ (${a0})B = 0 \\end{cases}`,
				isCorrect: false,
				feedback: `Missing Derivatives: You must include contributions from $y_p''$ ($-${w2}$) and $y_p'$ ($a_1 \\cdot ${w} = ${m12}$) in the grouped harmonic terms.`,
			},
			{
				id: "sys_wrong_target",
				latex: `\\begin{cases} (${m11})A + (${m12})B = 0 \\\\ (${m21})A + (${m22})B = ${forcing.K} \\end{cases}`,
				isCorrect: false,
				feedback: `Target Forcing Error: The input $x(t) = ${forcing.K}\\cos(${w}t)$ is pure cosine, so the cosine sum equates to ${forcing.K} and the sine sum equates to $0$.`,
			},
		];
	} else if (forcing.type === "constant") {
		step5FirstDerivLatex = "y_p'(t) = 0";
		step5SecondDerivLatex = "y_p''(t) = 0";
		step5DerivLatex = "y_p'(t) = 0, \\quad y_p''(t) = 0";
		step5SysLatex = `${a0} K_p = ${forcing.K}`;

		step5FirstDerivOptions = [
			{ id: "d1_const_correct", latex: "y_p'(t) = 0", isCorrect: true },
			{
				id: "d1_const_err",
				latex: "y_p'(t) = K_p",
				isCorrect: false,
				feedback:
					"The derivative of a constant $K_p$ with respect to time $t$ is strictly 0.",
			},
			{
				id: "d1_const_t",
				latex: "y_p'(t) = t K_p",
				isCorrect: false,
				feedback: "A constant $K_p$ does not depend on time.",
			},
		];
		step5SecondDerivOptions = [
			{ id: "d2_const_correct", latex: "y_p''(t) = 0", isCorrect: true },
			{
				id: "d2_const_err",
				latex: "y_p''(t) = K_p",
				isCorrect: false,
				feedback: "The derivative of 0 is 0.",
			},
		];
		step5DerivativeOptions = [
			{
				id: "deriv_correct",
				latex: step5DerivLatex,
				isCorrect: true,
			},
			{
				id: "deriv_nonzero",
				latex: "y_p'(t) = K_p, \\quad y_p''(t) = K_p",
				isCorrect: false,
				feedback:
					"Derivative of a constant: The derivative of any constant $K_p$ with respect to time is strictly zero.",
			},
		];
		step5SystemOptions = [
			{
				id: "sys_correct",
				latex: step5SysLatex,
				isCorrect: true,
			},
			{
				id: "sys_nonzero_deriv",
				latex: `(1 + ${a1} + ${a0}) K_p = ${forcing.K}`,
				isCorrect: false,
				feedback:
					"Derivatives of the constant $y_p(t) = K_p$ vanish: $y_p' = 0$ and $y_p'' = 0$.",
			},
			{
				id: "sys_missing_a0",
				latex: `K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `You must multiply $y_p(t) = K_p$ by the coefficient $a_0 = ${a0}$ in the ODE.`,
			},
			{
				id: "sys_sign_err",
				latex: `-${a0} K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `Sign Error: Maintain the positive coefficient $a_0 = ${a0}$.`,
			},
		];
	} else {
		const p = forcing.p ?? 0;
		const polyAtP = p * p + a1 * p + a0;
		step5FirstDerivLatex = `y_p'(t) = ${p} K_p e^{${p}t}`;
		step5SecondDerivLatex = `y_p''(t) = ${p * p} K_p e^{${p}t}`;
		step5DerivLatex = `${step5FirstDerivLatex}, \\quad ${step5SecondDerivLatex}`;
		step5SysLatex = `${polyAtP} K_p = ${forcing.K}`;

		step5FirstDerivOptions = [
			{
				id: "d1_exp_correct",
				latex: step5FirstDerivLatex,
				isCorrect: true,
			},
			{
				id: "d1_exp_sign",
				latex: `y_p'(t) = ${-p} K_p e^{${p}t}`,
				isCorrect: false,
				feedback: `Chain Rule Sign: Differentiating $e^{${p}t}$ brings down $+${p}$, not ${-p}.`,
			},
			{
				id: "d1_exp_nofactor",
				latex: `y_p'(t) = K_p e^{${p}t}`,
				isCorrect: false,
				feedback: `Chain Rule Error: Differentiating $e^{${p}t}$ pulls down an inner factor of $p = ${p}$.`,
			},
		];
		step5SecondDerivOptions = [
			{
				id: "d2_exp_correct",
				latex: step5SecondDerivLatex,
				isCorrect: true,
			},
			{
				id: "d2_exp_linear",
				latex: `y_p''(t) = ${p} K_p e^{${p}t}`,
				isCorrect: false,
				feedback: `Chain Rule Error: Differentiating twice squares the factor: $(${p})^2 = ${p * p}$.`,
			},
			{
				id: "d2_exp_neg",
				latex: `y_p''(t) = -${p * p} K_p e^{${p}t}`,
				isCorrect: false,
				feedback: `Sign Error: Squaring $(${p})^2$ is strictly positive ($${p * p}$).`,
			},
		];
		step5DerivativeOptions = [
			{
				id: "deriv_correct",
				latex: step5DerivLatex,
				isCorrect: true,
			},
			{
				id: "deriv_missing_p",
				latex: `y_p'(t) = K_p e^{${p}t}, \\quad y_p''(t) = K_p e^{${p}t}`,
				isCorrect: false,
				feedback: `Chain Rule Error: $\\frac{d}{dt} e^{${p}t} = ${p} e^{${p}t}$ and $\\frac{d^2}{dt^2} e^{${p}t} = ${p * p} e^{${p}t}$.`,
			},
		];
		step5SystemOptions = [
			{
				id: "sys_correct",
				latex: step5SysLatex,
				isCorrect: true,
			},
			{
				id: "sys_sign_lin",
				latex: `${p * p - a1 * p + a0} K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `Sign Error: The linear term $+${a1} y'$ contributes $+${a1}(${p}) = +${a1 * p}$, not $-${a1 * p}$.`,
			},
			{
				id: "sys_no_chain",
				latex: `${1 + a1 + a0} K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `Missing Chain Rule Factors: $y_p''$ produces $(${p})^2 = ${p * p}$ and $y_p'$ produces $${p}$.`,
			},
			{
				id: "sys_missing_second_power",
				latex: `${p + a1 * p + a0} K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `Power Error: The second derivative contributes $p^2 = ${p * p}$, not $p = ${p}$.`,
			},
			{
				id: "sys_missing_a0",
				latex: `${p * p + a1 * p + 1} K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `Coefficient Error: The zero-derivative term is $a_0 y = ${a0} y$, contributing $+${a0}$.`,
			},
		];
	}

	// Step 7 Transient and Steady-State Options
	const transientOptions: OdeItsOption[] = [
		{
			id: "tr_correct",
			latex: `y_{tr}(t) = ${y_tr_latex}`,
			isCorrect: true,
		},
		{
			id: "tr_yp",
			latex: `y_{tr}(t) = ${particular.latex}`,
			isCorrect: false,
			feedback:
				"Misconception: $y_p(t)$ is the forced response (steady-state for step/sinusoidal inputs), not the decaying transient natural response.",
		},
		{
			id: "tr_zi",
			latex: `y_{tr}(t) = ${ziLatex}`,
			isCorrect: false,
			feedback:
				"Misconception: $y_{ZI}(t)$ is the zero-input response (which is indeed transient, but only accounts for initial conditions, not the complete transient response of the total system).",
		},
	];

	const steadyStateOptions: OdeItsOption[] = [
		{
			id: "ss_correct",
			latex: `y_{ss}(t) = ${y_ss_latex}`,
			isCorrect: true,
		},
		{
			id: "ss_yh",
			latex: `y_{ss}(t) = ${homogeneousComplete.latex}`,
			isCorrect: false,
			feedback:
				"Misconception: The homogeneous solution $y_h(t)$ contains decaying exponential terms that vanish as $t \\to \\infty$, so it is transient, not steady-state.",
		},
		{
			id: "ss_zs",
			latex: `y_{ss}(t) = ${zsLatex}`,
			isCorrect: false,
			feedback:
				"Misconception: $y_{ZS}(t)$ contains both the transient natural modes needed to satisfy zero initial conditions AND the forced steady-state response.",
		},
	];

	// Concept Questions Pool
	const conceptQuestionsPool = [
		{
			prompt: String.raw`How do the integration constants of the complete response $y(t) = y_h(t) + y_p(t)$ relate to those of the Zero-Input ($y_{ZI}$) and Zero-State ($y_{ZS}$) responses?`,
			options: [
				{
					id: "cq1_opt1",
					latex: String.raw`C_1 = C_{1,ZI} + C_{1,ZS} \quad \text{and} \quad C_2 = C_{2,ZI} + C_{2,ZS}`,
					isCorrect: true,
				},
				{
					id: "cq1_opt2",
					latex: String.raw`C_1 = C_{1,ZI} \cdot C_{1,ZS} \quad \text{and} \quad C_2 = C_{2,ZI} \cdot C_{2,ZS}`,
					isCorrect: false,
					feedback:
						"Superposition is additive, not multiplicative. In linear systems, responses and their modal constants sum linearly.",
				},
				{
					id: "cq1_opt3",
					latex: String.raw`C_1 = C_{1,ZI} - C_{1,ZS} \quad \text{and} \quad C_2 = C_{2,ZI} - C_{2,ZS}`,
					isCorrect: false,
					feedback:
						"Total response is $y(t) = y_{ZI}(t) + y_{ZS}(t)$, which requires adding the modal constants, not subtracting them.",
				},
				{
					id: "cq1_opt4",
					latex: String.raw`C_{1,ZI} = C_1 \quad \text{and} \quad C_{2,ZI} = C_2 \quad (\text{independent of } y_{ZS})`,
					isCorrect: false,
					feedback:
						"The complete constants $C_1, C_2$ must satisfy $y_h(0^+) = y(0^+) - y_p(0^+)$, so they shift due to $y_p(0^+)$ from the forcing function.",
				},
			],
			explanation:
				"By linearity and superposition, the complete response $y(t) = y_{ZI}(t) + y_{ZS}(t)$. Because both $y_{ZI}$ and $y_{ZS}$ share the identical characteristic basis modes, their integration constants add directly: $C_1 = C_{1,ZI} + C_{1,ZS}$ and $C_2 = C_{2,ZI} + C_{2,ZS}$.",
		},
		{
			prompt: String.raw`If the initial conditions are doubled to $2 y(0^-)$ and $2 y'(0^-)$ while the input $x(t)$ remains unchanged, how do the decomposed responses change?`,
			options: [
				{
					id: "cq2_opt1",
					latex: String.raw`y_{ZI}(t) \to 2 y_{ZI}(t), \quad y_{ZS}(t) \text{ is unchanged}`,
					isCorrect: true,
				},
				{
					id: "cq2_opt2",
					latex: String.raw`\text{Both } y_{ZI}(t) \to 2 y_{ZI}(t) \quad \text{and} \quad y_{ZS}(t) \to 2 y_{ZS}(t)`,
					isCorrect: false,
					feedback:
						"The Zero-State response $y_{ZS}(t)$ is computed with initial conditions strictly equal to zero, so changing $y(0^-)$ has zero effect on $y_{ZS}(t)$.",
				},
				{
					id: "cq2_opt3",
					latex: String.raw`\text{Only } y_{ss}(t) \text{ doubles}`,
					isCorrect: false,
					feedback:
						"The steady-state response $y_{ss}(t) = y_p(t)$ depends entirely on the input $x(t)$, which was not changed.",
				},
				{
					id: "cq2_opt4",
					latex: String.raw`\text{Neither response changes}`,
					isCorrect: false,
					feedback:
						"Initial conditions drive $y_{ZI}(t)$. Since the differential equation is linear, scaling initial conditions by $2$ doubles $y_{ZI}(t)$.",
				},
			],
			explanation:
				"The Zero-Input response $y_{ZI}(t)$ is a linear function of initial state values, so doubling initial conditions doubles $y_{ZI}(t)$. The Zero-State response $y_{ZS}(t)$ assumes zero initial energy and depends solely on $x(t)$, so it remains unchanged.",
		},
		{
			prompt: String.raw`For this stable differential equation ($\operatorname{Re}(r_i) < 0$), what is the limiting behavior of the transient response $y_{tr}(t)$ as $t \to \infty$?`,
			options: [
				{
					id: "cq3_opt1",
					latex: String.raw`\displaystyle \lim_{t \to \infty} y_{tr}(t) = 0 \quad (\text{all natural modes decay to zero})`,
					isCorrect: true,
				},
				{
					id: "cq3_opt2",
					latex: String.raw`\displaystyle \lim_{t \to \infty} y_{tr}(t) = y_p(t)`,
					isCorrect: false,
					feedback:
						"The transient response consists strictly of natural homogeneous modes $e^{rt}$ which decay to $0$ as $t \\to \\infty$, leaving only the steady-state response.",
				},
				{
					id: "cq3_opt3",
					latex: String.raw`\displaystyle \lim_{t \to \infty} y_{tr}(t) = y(0^-)`,
					isCorrect: false,
					feedback:
						"Initial conditions dictate the starting values at $t=0$, not the asymptotic limit at $t \\to \\infty$.",
				},
			],
			explanation: String.raw`Because all characteristic roots have negative real parts ($\operatorname{Re}(r_i) < 0$), every term in the natural homogeneous response contains a factor $e^{-\alpha t}$ (where $\alpha > 0$). Hence, $\displaystyle \lim_{t \to \infty} y_{tr}(t) = 0$.`,
		},
		{
			prompt: String.raw`If the forcing function $x(t)$ is replaced by a different input signal $\tilde{x}(t)$, which response component is guaranteed to remain strictly identical?`,
			options: [
				{
					id: "cq4_opt1",
					latex: String.raw`\text{The Zero-Input response } y_{ZI}(t)`,
					isCorrect: true,
				},
				{
					id: "cq4_opt2",
					latex: String.raw`\text{The Zero-State response } y_{ZS}(t)`,
					isCorrect: false,
					feedback:
						"The Zero-State response $y_{ZS}(t)$ is driven directly by the forcing input $x(t)$, so changing $x(t)$ changes $y_{ZS}(t)$.",
				},
				{
					id: "cq4_opt3",
					latex: String.raw`\text{The particular solution } y_p(t)`,
					isCorrect: false,
					feedback:
						"The particular solution $y_p(t)$ is derived directly from the shape and amplitude of the forcing function $x(t)$.",
				},
				{
					id: "cq4_opt4",
					latex: String.raw`\text{The complete response } y(t)`,
					isCorrect: false,
					feedback:
						"Since $y(t) = y_{ZI}(t) + y_{ZS}(t)$, changing $x(t)$ alters $y_{ZS}(t)$ and therefore changes $y(t)$.",
				},
			],
			explanation:
				"The Zero-Input response $y_{ZI}(t)$ describes how the system relaxes from its initial state with the input set to zero ($x(t) = 0$). It depends exclusively on system dynamics and initial conditions, making it completely independent of $x(t)$.",
		},
	];

	// Pick a concept question
	const selectedConceptQ =
		conceptQuestionsPool[
			Math.floor(Math.random() * conceptQuestionsPool.length)
		];

	// Formulate concrete initial condition system LaTeX
	let icSystemLatex = "";
	if (resolvedRootType === "distinct_real") {
		const r1 = roots.r1;
		const r2 = roots.r2 ?? 0;
		const eq1 = `C_1 + C_2 = ${toFractionLatex(targetYh0)}`;
		const term1 = formatSignedLinearTerm(r1, "C_1", true);
		const term2 = formatSignedLinearTerm(r2, "C_2", false);
		const eq2 = `${term1} ${term2} = ${toFractionLatex(targetDYh0)}`;
		icSystemLatex = `\\begin{cases} ${eq1} \\\\ ${eq2} \\end{cases}`;
	} else if (resolvedRootType === "repeated_real") {
		const r = roots.r1;
		const eq1 = `C_1 = ${toFractionLatex(targetYh0)}`;
		const term1 = formatSignedLinearTerm(r, "C_1", true);
		const eq2 = `${term1} + C_2 = ${toFractionLatex(targetDYh0)}`;
		icSystemLatex = `\\begin{cases} ${eq1} \\\\ ${eq2} \\end{cases}`;
	} else {
		const sig = roots.r1;
		const wd = roots.im ?? 1;
		const eq1 = `C_1 = ${toFractionLatex(targetYh0)}`;
		const term1 = formatSignedLinearTerm(sig, "C_1", true);
		const term2 = formatSignedLinearTerm(wd, "C_2", false);
		const eq2 = `${term1} ${term2} = ${toFractionLatex(targetDYh0)}`;
		icSystemLatex = `\\begin{cases} ${eq1} \\\\ ${eq2} \\end{cases}`;
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
				"Set the unforced homogeneous right-hand side to $0$ ($x(t) = 0$) to obtain $a_2 s^2 + a_1 s + a_0 = 0$.",
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
			isFactorable:
				resolvedRootType === "distinct_real" ||
				resolvedRootType === "repeated_real",
			discriminant: a1 * a1 - 4 * 1 * a0,
			quadSetup: {
				a: 1,
				b: a1,
				c: a0,
				negB: -a1,
				disc: a1 * a1 - 4 * 1 * a0,
				twoA: 2,
			},
			symbolicRootsLatex:
				resolvedRootType === "distinct_real"
					? `r_1 = ${roots.r1}, \\quad r_2 = ${roots.r2}`
					: resolvedRootType === "repeated_real"
						? `r_1 = r_2 = ${roots.r1}`
						: `s = ${roots.r1} \\pm j${roots.im}`,
			factoredFormLatex:
				resolvedRootType === "distinct_real"
					? `${formatRootFactor(roots.r1, "s")}${formatRootFactor(roots.r2 ?? 0, "s")} = 0`
					: resolvedRootType === "repeated_real"
						? `${formatRootFactor(roots.r1, "s")}^2 = 0`
						: undefined,
			r1: roots.r1,
			r2: roots.r2,
			im: roots.im,
			hints: [
				`To solve $${charEqLhs} = 0$, first inspect if it factors cleanly into $(s - r_1)(s - r_2) = 0$. You can check the discriminant $\\Delta = b^2 - 4ac = (${a1})^2 - 4(1)(${a0}) = ${a1 * a1 - 4 * a0}$.`,
				`The quadratic formula is $s = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$. Setting up with $a = 1$, $b = ${a1}$, and $c = ${a0}$ gives $s = \\frac{-(${a1}) \\pm \\sqrt{(${a1})^2 - 4(1)(${a0})}}{2(1)} = \\frac{${-a1} \\pm \\sqrt{${a1 * a1 - 4 * a0}}}{2}$.`,
				resolvedRootType === "distinct_real"
					? `The discriminant $\\Delta = ${a1 * a1 - 4 * a0} > 0$ yields two distinct real roots: $r_1 = ${roots.r1}, \\quad r_2 = ${roots.r2}$.`
					: resolvedRootType === "repeated_real"
						? `The discriminant $\\Delta = 0$ yields a single repeated real root: $r = ${roots.r1}$.`
						: `The discriminant $\\Delta = ${a1 * a1 - 4 * a0} < 0$ produces a negative value under the radical, yielding $\\sqrt{${a1 * a1 - 4 * a0}} = j${(roots.im ?? 0) * 2}$. Dividing by $2$ gives complex conjugate roots: $s = ${roots.r1} \\pm j${roots.im ?? 0}$.`,
			],
			subStepHints: {
				strategy_gate: [
					"Inspect whether two integers multiply to $a_0$ and sum to $a_1$.",
					"If integer factoring is not readily apparent, check whether the discriminant $b^2 - 4ac$ is positive, zero, or negative.",
					"Select Factoring for clean integer roots or Quadratic Formula for guaranteed solution.",
				],
				factoring_inputs: [
					`Find two numbers that multiply to $a_0 = ${a0}$ and add up to $a_1 = ${a1}$.`,
					`Express in factored form $(s - r_1)(s - r_2) = 0$.`,
					`The roots are $r_1 = ${roots.r1}$ and $r_2 = ${roots.r2 ?? roots.r1}$.`,
				],
				quad_classification: [
					`Compute the discriminant $\\Delta = b^2 - 4ac = (${a1})^2 - 4(1)(${a0}) = ${a1 * a1 - 4 * a0}$.`,
					"If $\\Delta > 0$, roots are distinct real. If $\\Delta = 0$, roots are repeated real. If $\\Delta < 0$, roots are complex conjugate.",
					`Since $\\Delta = ${a1 * a1 - 4 * a0}$, classify as ${resolvedRootType.replace("_", " ")}.`,
				],
				remedial_discriminant: [
					"Substitute into $\\Delta = b^2 - 4ac$ with $a=1$, $b=a_1$, and $c=a_0$.",
					`Calculate $(${a1})^2 - 4(1)(${a0}) = ${a1 * a1} - ${4 * a0}$.`,
					`The discriminant value is exactly ${a1 * a1 - 4 * a0}.`,
				],
				quad_root_inputs: [
					"Apply $s = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$.",
					`Evaluate $\\frac{${-a1} \\pm \\sqrt{${a1 * a1 - 4 * a0}}}{2}$.`,
					resolvedRootType === "complex_conjugate"
						? `Real part $\\sigma = ${roots.r1}$, imaginary frequency $\\omega_d = ${roots.im}$.`
						: `The roots are $r_1 = ${roots.r1}$ and $r_2 = ${roots.r2 ?? roots.r1}$.`,
				],
			},
			misconceptions: {
				unfactorable_complex: `The polynomial $${charEqLhs} = 0$ cannot be factored over real integers because its discriminant $\\Delta = b^2 - 4ac = (${a1})^2 - 4(1)(${a0}) = ${a1 * a1 - 4 * a0} < 0$. The negative quantity under the square root generates an imaginary component $\\pm j\\sqrt{${Math.abs(a1 * a1 - 4 * a0)}} = \\pm j${(roots.im ?? 0) * 2}$, requiring the quadratic formula.`,
				unfactorable_general: `Check the discriminant $\\Delta = b^2 - 4ac = (${a1})^2 - 4(1)(${a0}) = ${a1 * a1 - 4 * a0}$. Because $\\Delta$ is not a non-negative perfect square, factoring by integer inspection does not work cleanly. Use the quadratic formula.`,
			},
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
				"Match the functional shape of $x(t)$ (constant $\\to K_p$, exponential $\\to K_p e^{pt}$, sinusoid $\\to A \\cos(kt) + B \\sin(kt)$).",
				"Check if the trial guess collides with any characteristic root in the homogeneous solution (resonance).",
			],
		},
		step5: {
			expectedKp: particular.coeffs.Kp,
			expectedA: particular.coeffs.A,
			expectedB: particular.coeffs.B,
			derivativeOptions: step5DerivativeOptions,
			firstDerivativeOptions: step5FirstDerivOptions,
			secondDerivativeOptions: step5SecondDerivOptions,
			systemOptions: step5SystemOptions,
			derivativesLatex: step5DerivLatex,
			firstDerivLatex: step5FirstDerivLatex,
			secondDerivLatex: step5SecondDerivLatex,
			systemLatex: step5SysLatex,
			hints: [
				"Take derivatives of $y_p(t)$ ($y_p'$ and $y_p''$) and substitute them into the left-hand side of the ODE.",
				"Collect like terms and equate coefficients with the right-hand side forcing input $x(t)$.",
				forcing.type === "constant"
					? `Substitute $y_p = K_p, y_p'=0, y_p''=0$: $0 + 0 + ${a0} K_p = ${forcing.K} \\implies K_p = ${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`
					: forcing.type === "exponential"
						? `Substitute $y_p = K_p e^{${forcing.p}t}$: $(${(forcing.p ?? 0) ** 2 + a1 * (forcing.p ?? 0) + a0}) K_p = ${forcing.K} \\implies K_p = ${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`
						: `Set up the $2\\times 2$ system for $A$ and $B$ and solve.`,
			],
			subStepHints: {
				first_deriv: [
					"Apply differentiation rules to your trial ansatz $y_p(t)$.",
					forcing.type === "sinusoid"
						? `For $y_p(t) = A\\cos(${forcing.omega}t) + B\\sin(${forcing.omega}t)$, apply $\\frac{d}{dt}\\cos(${forcing.omega}t) = -${forcing.omega}\\sin(${forcing.omega}t)$ and $\\frac{d}{dt}\\sin(${forcing.omega}t) = +${forcing.omega}\\cos(${forcing.omega}t)$.`
						: forcing.type === "exponential"
							? `For $y_p(t) = K_p e^{${forcing.p}t}$, bring down the factor $p = ${forcing.p}$.`
							: "The derivative of a constant is strictly zero.",
					`$${step5FirstDerivLatex}$`,
				],
				second_deriv: [
					"Differentiate the first derivative $y_p'(t)$ one more time.",
					forcing.type === "sinusoid"
						? `Differentiating again multiplies each term by an additional factor of ${forcing.omega}, resulting in $(${forcing.omega})^2 = ${(forcing.omega ?? 1) ** 2}$.`
						: forcing.type === "exponential"
							? `Differentiating again multiplies by $p = ${forcing.p}$, producing $p^2 = ${(forcing.p ?? 0) ** 2}$.`
							: "The second derivative of a constant is strictly zero.",
					`$${step5SecondDerivLatex}$`,
				],
				system_setup: [
					`Substitute $y_p, y_p', y_p''$ into the ODE: $y'' + ${a1}y' + ${a0}y = x(t)$.`,
					"Collect like functional terms on the left-hand side and equate their coefficients to the right-hand side forcing input.",
					`Linear system: $${step5SysLatex}$`,
				],
				solve: [
					forcing.type === "sinusoid"
						? "Solve the $2\\times 2$ linear system for coefficients $A$ and $B$."
						: "Solve the linear algebraic equation for the undetermined scale factor $K_p$.",
					forcing.type === "sinusoid"
						? `From the system, substitute or eliminate to obtain $A$ (cos term) and $B$ (sin term).`
						: `Divide the forcing amplitude by the evaluated polynomial value.`,
					forcing.type === "sinusoid"
						? `Coefficients: $A = ${toFractionLatex(particular.coeffs.A ?? 0)}, \\quad B = ${toFractionLatex(particular.coeffs.B ?? 0)}$.`
						: `Coefficient: $K_p = ${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`,
				],
			},
		},
		step6: {
			expectedC1: homogeneousComplete.C1,
			expectedC2: homogeneousComplete.C2,
			yp0: particular.eval(0),
			dyp0: particular.evalDeriv(0),
			targetYh0,
			targetDYh0,
			icSystemLatex,
			hints: [
				"Remember initial conditions apply to the TOTAL solution $y(t) = y_h(t) + y_p(t)$. First find $y_p(0^+)$ and $y_p'(0^+)$.",
				`Calculate the target homogeneous values: $y_h(0^+) = y(0^+) - y_p(0^+) = ${initialConditions.y0} - (${toFractionLatex(particular.eval(0))}) = ${toFractionLatex(targetYh0)}$ and $y_h'(0^+) = y'(0^+) - y_p'(0^+) = ${initialConditions.dy0} - (${toFractionLatex(particular.evalDeriv(0))}) = ${toFractionLatex(targetDYh0)}$.`,
				String.raw`Solve the $2\times 2$ linear system for $C_1$ and $C_2$: $C_1 = ${toFractionLatex(homogeneousComplete.C1)}, \quad C_2 = ${toFractionLatex(homogeneousComplete.C2)}$.`,
			],
			subStepHints: {
				target_values: [
					"Evaluate $y_p(0^+)$ and $y_p'(0^+)$ by substituting $t = 0$ into your particular solution.",
					`Subtract from total initial conditions: $y_h(0^+) = y(0^+) - y_p(0^+)$ and $y_h'(0^+) = y'(0^+) - y_p'(0^+)$.`,
					`Target values: $y_h(0^+) = ${toFractionLatex(targetYh0)}$ and $y_h'(0^+) = ${toFractionLatex(targetDYh0)}$.`,
				],
				solve_constants: [
					`Match the homogeneous expression $y_h(t)$ and its derivative $y_h'(t)$ at $t = 0$ to the target values.`,
					`Solve the linear system: $${icSystemLatex}$.`,
					`Constants: $C_1 = ${toFractionLatex(homogeneousComplete.C1)}, \\quad C_2 = ${toFractionLatex(homogeneousComplete.C2)}$.`,
				],
			},
		},
		step7: {
			expectedZI: ziLatex,
			expectedZS: zsLatex,
			ziConstants: {
				C1: homogeneousZI.C1,
				C2: homogeneousZI.C2,
			},
			zsConstants: {
				C1: homogeneousZS.C1,
				C2: homogeneousZS.C2,
			},
			y_tr_latex,
			y_ss_latex,
			transientOptions,
			steadyStateOptions,
			conceptQuestion: selectedConceptQ,
			hints: [
				"$y_{ZI}(t)$ is the zero-input response (natural response satisfying initial conditions with $x(t)=0$).",
				"$y_{ZS}(t)$ is the zero-state response (response driven purely by $x(t)$ with zero initial conditions).",
				`$y_{ZI}(t) = ${ziLatex}, \\quad y_{ZS}(t) = ${zsLatex}$`,
			],
			subStepHints: {
				zi_zs: [
					"Zero-Input ($y_{ZI}$) satisfies original initial conditions with forcing $x(t) = 0$.",
					"Zero-State ($y_{ZS}$) is driven by the forcing $x(t)$ with zero initial conditions ($y(0^-)=0, y'(0^-)=0$).",
					`$C_{1,ZI} = ${toFractionLatex(homogeneousZI.C1)}, \\; C_{2,ZI} = ${toFractionLatex(homogeneousZI.C2)}$ and $C_{1,ZS} = C_1 - C_{1,ZI} = ${toFractionLatex(homogeneousZS.C1)}, \\; C_{2,ZS} = C_2 - C_{2,ZI} = ${toFractionLatex(homogeneousZS.C2)}$.`,
				],
				tr_ss: [
					"Transient response $y_{tr}(t)$ consists of natural homogeneous modes that decay to zero as $t \\to \\infty$.",
					"Steady-state response $y_{ss}(t)$ is the persistent forced response component matching the input as $t \\to \\infty$.",
					`$y_{tr}(t) = ${y_tr_latex}$ and $y_{ss}(t) = ${y_ss_latex}$.`,
				],
				concept: [
					"Think about system linearity, stability, and the physical definition of each response component.",
					"Review how initial conditions affect Zero-Input vs Zero-State responses.",
					selectedConceptQ.explanation,
				],
			},
		},
	};

	const evalComplete = (t: number) =>
		homogeneousComplete.eval(t) + particular.eval(t);
	const evalZI = (t: number) => homogeneousZI.eval(t);
	const evalZS = (t: number) => homogeneousZS.eval(t) + particular.eval(t);

	const difficulty: "easy" | "medium" | "hard" =
		resolvedRootType === "distinct_real" &&
		resolvedForcingType === "constant"
			? "easy"
			: resolvedRootType === "complex_conjugate" ||
				  resolvedForcingType === "sinusoid"
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
			y_h_latex: sanitizeLatexMath(homogeneousComplete.latex),
			y_p_latex: sanitizeLatexMath(particular.latex),
			y_complete_latex: sanitizeLatexMath(completeLatex),
			y_zi_latex: sanitizeLatexMath(ziLatex),
			y_zs_latex: sanitizeLatexMath(zsLatex),
			y_tr_latex: sanitizeLatexMath(y_tr_latex),
			y_ss_latex: sanitizeLatexMath(y_ss_latex),
		},
		evalComplete,
		evalZI,
		evalZS,
		itsData,
	};
}
