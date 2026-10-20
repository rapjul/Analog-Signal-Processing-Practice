/**
 * ODE Domain Types & Interfaces.
 *
 * Defines mathematical models, classification types, configuration options,
 * and ITS step data contracts for 1st- and 2nd-order Linear Constant-Coefficient ODEs.
 */

import type {
	BaseItsStep,
	ItsOption,
	WithRandom,
} from "$lib/math-engine/types";

/**
 * Classification of characteristic polynomial roots for first-order differential equations.
 */
export type FirstOrderRootType = "single_real";

/**
 * Classification of characteristic polynomial roots for second-order differential equations.
 *
 * Dictates the functional form of the natural/homogeneous response y_h(t).
 */
export type SecondOrderRootType =
	/** Two distinct real roots r1 != r2, producing real exponential terms e^(r1 t) and e^(r2 t) */
	| "distinct_real"
	/** Repeated real root r1 = r2, producing damped terms e^(r t) and t e^(r t) */
	| "repeated_real"
	/** Complex conjugate pair alpha +/- j omega, producing damped sinusoids e^(alpha t) cos(omega t) and e^(alpha t) sin(omega t) */
	| "complex_conjugate";

/**
 * Combined root type classification across all ODE orders.
 */
export type OdeRootType = FirstOrderRootType | SecondOrderRootType;

/**
 * Forcing function x(t) input type for differential equations.
 *
 * Dictates the undetermined coefficient form for the particular solution y_p(t).
 */
export type ForcingType =
	/** Constant input x(t) = K */
	| "constant"
	/** Exponential input x(t) = K e^(p t) */
	| "exponential"
	/** Sinusoidal input x(t) = K cos(omega t) */
	| "sinusoid";

/** Order of differential equation (1st- or 2nd-order) */
export type OdeOrder = 1 | 2;

/** Leading coefficient normalization classification */
export type LeadingCoefficientType = "monic" | "non_monic";

/** System resonance status for exponential inputs */
export type ResonanceType = "none" | "simple" | "repeated";

/** Public controls for reproducible ODE problem generation. */
export interface OdeGenerationOptions {
	/** Differential equation order (1, 2, or "random") */
	order?: WithRandom<OdeOrder>;
	/** Target root classification (or "random") */
	rootType?: WithRandom<SecondOrderRootType>;
	/** Target forcing function type (or "random") */
	forcingType?: WithRandom<ForcingType>;
	/** Leading coefficient configuration */
	leadingCoefficient?:
		number | WithRandom<LeadingCoefficientType | "non-monic">;
	/** Resonance configuration */
	resonance?: WithRandom<
		ResonanceType | "nonresonant" | "resonant" | boolean
	>;
	/** Explicit pseudo-random number generator seed */
	seed?: number;
}

/** Parameters defining a first-order linear constant-coefficient ODE */
export interface FirstOrderOdeParams {
	/** Order of ODE (strictly 1) */
	order: 1;
	/** Coefficient a2 for y'' (strictly 0 for first order) */
	a2: 0;
	/** Coefficient a1 for first derivative y' */
	a1: number;
	/** Coefficient a0 for zero derivative y */
	a0: number;
	/** Characteristic polynomial single real root */
	roots: { r1: number };
	/** Classification of roots (strictly single_real) */
	rootType: FirstOrderRootType;
}

/** Parameters defining a second-order linear constant-coefficient ODE */
export interface SecondOrderOdeParams {
	/** Order of ODE (strictly 2) */
	order: 2;
	/** Coefficient a2 for second derivative y'' (non-zero) */
	a2: number;
	/** Coefficient a1 for first derivative y' */
	a1: number;
	/** Coefficient a0 for zero derivative y */
	a0: number;
	/** Characteristic polynomial roots r1, r2, and imaginary component im */
	roots: { r1: number; r2?: number | undefined; im?: number | undefined };
	/** Classification of roots */
	rootType: SecondOrderRootType;
}

/** Structural parameters defining a linear constant-coefficient ODE */
export type OdeParams = FirstOrderOdeParams | SecondOrderOdeParams;

/** Interface representing input forcing function x(t) */
export interface ForcingFunction {
	/** Forcing type category (constant, exponential, sinusoid) */
	type: ForcingType;
	/** Amplitude K */
	K: number;
	/** Exponential growth/decay rate p for K * exp(p*t) */
	p?: number | undefined;
	/** Radian frequency omega for K * cos(omega*t) */
	omega?: number | undefined;
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
	coeffs: {
		Kp?: number | undefined;
		A?: number | undefined;
		B?: number | undefined;
	};
	/** Multiplicity of the forcing frequency as a characteristic root. */
	resonanceMultiplicity: 0 | 1 | 2;
}

/** Interface representing natural homogeneous response y_h(t) */
export interface HomogeneousSolution {
	/** Formatted LaTeX rendered homogeneous solution y_h(t) */
	latex: string;
	/** Integration constant C1 */
	C1: number;
	/** Integration constant C2 (second-order only) */
	C2?: number | undefined;
	/** Evaluator function for y_h(t) at time t */
	eval: (t: number) => number;
}

/** Evaluation option for ITS multiple-choice steps (alias to shared ItsOption) */
export type OdeItsOption = ItsOption & {
	/** Independent mathematical coefficients for generated numeric choices. */
	coefficients?: Readonly<Record<string, number>>;
};

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

/** First-Order ITS Step 2: Characteristic Root (Direct Linear Isolation) */
export interface FirstOrderOdeItsStep2 extends BaseItsStep {
	/** Classification of characteristic root */
	rootType: FirstOrderRootType;
	/** Exact symbolic formatted root string in LaTeX */
	symbolicRootsLatex: string;
	/** Formatted factored polynomial expression (e.g. "a1(s - r) = 0") */
	factoredFormLatex?: string | undefined;
	/** Single characteristic root */
	r1: number;
	/** Diagnostic misconception feedback dictionary */
	misconceptions: Record<string, string>;
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]> | undefined;
}

/** Second-Order ITS Step 2: Characteristic Roots, Factoring & Quadratic Formula */
export interface SecondOrderOdeItsStep2 extends BaseItsStep {
	/** Classification of characteristic roots */
	rootType: SecondOrderRootType;
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
	/** Formatted factored polynomial expression if factorable */
	factoredFormLatex?: string | undefined;
	/** First root (real part if complex) */
	r1: number;
	/** Second root (real part if distinct real) */
	r2: number;
	/** Imaginary component omega_d (if complex conjugate) */
	im?: number | undefined;
	/** Diagnostic misconception feedback dictionary */
	misconceptions: Record<string, string>;
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]> | undefined;
}

/** ITS Step 2: Characteristic Roots & Strategy */
export type OdeItsStep2 = FirstOrderOdeItsStep2 | SecondOrderOdeItsStep2;

/** First-Order ITS Step 3: Homogeneous Form Template */
export interface FirstOrderOdeItsStep3 extends BaseItsStep {
	/** Correct template matching the single real root */
	correctTemplate: FirstOrderRootType;
	/** Instantiated template formula with roots and symbolic constant C1 */
	formLatex: string;
	/** Diagnostic feedback for incorrect template selections */
	misconceptions: Record<string, string>;
}

/** Second-Order ITS Step 3: Homogeneous Form Template */
export interface SecondOrderOdeItsStep3 extends BaseItsStep {
	/** Correct template matching the roots */
	correctTemplate: SecondOrderRootType;
	/** Instantiated template formula with roots and symbolic constants C1, C2 */
	formLatex: string;
	/** Diagnostic feedback for incorrect template selections */
	misconceptions: Record<string, string>;
}

/** ITS Step 3: Homogeneous Form Template */
export type OdeItsStep3 = FirstOrderOdeItsStep3 | SecondOrderOdeItsStep3;

/** ITS Step 4: Particular Solution Ansatz */
export interface OdeItsStep4 extends BaseItsStep {
	/** Multiple-choice candidate ansatz options including pedagogical distractors */
	options: OdeItsOption[];
}

/** First-Order ITS Step 5: Particular Coefficients and Scaffolding */
export interface FirstOrderOdeItsStep5 extends BaseItsStep {
	/** Solved Kp for constant/exponential forcing */
	expectedKp?: number | undefined;
	/** Solved A for sinusoidal forcing */
	expectedA?: number | undefined;
	/** Solved B for sinusoidal forcing */
	expectedB?: number | undefined;
	/** Multiple-choice derivative options */
	derivativeOptions?: OdeItsOption[] | undefined;
	/** Multiple-choice first derivative options for Part 5A-1 */
	firstDerivativeOptions?: OdeItsOption[] | undefined;
	/** Second derivative options (undefined for first order) */
	secondDerivativeOptions?: undefined;
	/** Multiple-choice system setup options for Part 5B */
	systemOptions?: OdeItsOption[] | undefined;
	/** Correct derivative LaTeX string */
	derivativesLatex?: string | undefined;
	/** Correct first derivative LaTeX string */
	firstDerivLatex?: string | undefined;
	/** Second derivative LaTeX (undefined for first order) */
	secondDerivLatex?: undefined;
	/** Correct system equations LaTeX string */
	systemLatex?: string | undefined;
	/** Trial and derivatives substituted into the original coefficient-weighted ODE. */
	substitutionLatex?: string | undefined;
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]> | undefined;
}

/** Second-Order ITS Step 5: Particular Coefficients and Scaffolding */
export interface SecondOrderOdeItsStep5 extends BaseItsStep {
	/** Solved Kp for constant/exponential forcing */
	expectedKp?: number | undefined;
	/** Solved A for sinusoidal forcing */
	expectedA?: number | undefined;
	/** Solved B for sinusoidal forcing */
	expectedB?: number | undefined;
	/** Multiple-choice derivative options */
	derivativeOptions?: OdeItsOption[] | undefined;
	/** Multiple-choice first derivative options for Part 5A-1 */
	firstDerivativeOptions?: OdeItsOption[] | undefined;
	/** Multiple-choice second derivative options for Part 5A-2 */
	secondDerivativeOptions?: OdeItsOption[] | undefined;
	/** Multiple-choice system setup options for Part 5B */
	systemOptions?: OdeItsOption[] | undefined;
	/** Correct derivative LaTeX string */
	derivativesLatex?: string | undefined;
	/** Correct first derivative LaTeX string */
	firstDerivLatex?: string | undefined;
	/** Correct second derivative LaTeX string */
	secondDerivLatex?: string | undefined;
	/** Correct system equations LaTeX string */
	systemLatex?: string | undefined;
	/** Trial and derivatives substituted into the original coefficient-weighted ODE. */
	substitutionLatex?: string | undefined;
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]> | undefined;
}

/** ITS Step 5: Particular Coefficients and Scaffolding */
export type OdeItsStep5 = FirstOrderOdeItsStep5 | SecondOrderOdeItsStep5;

/** First-Order ITS Step 6: Initial Conditions System and Constants */
export interface FirstOrderOdeItsStep6 extends BaseItsStep {
	/** Solved constant C1 */
	expectedC1: number;
	/** Solved constant C2 (undefined for first order) */
	expectedC2?: undefined;
	/** Particular value at t=0 */
	yp0: number;
	/** Particular derivative value at t=0 (undefined for first order) */
	dyp0?: undefined;
	/** Effective homogeneous target y_h(0+) = y(0+) - y_p(0+) */
	targetYh0: number;
	/** Effective homogeneous target derivative (undefined for first order) */
	targetDYh0?: undefined;
	/** Concrete evaluated system of initial conditions LaTeX string */
	icSystemLatex: string;
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]>;
}

/** Second-Order ITS Step 6: Initial Conditions System and Constants */
export interface SecondOrderOdeItsStep6 extends BaseItsStep {
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
	subStepHints?: Record<string, string[]> | undefined;
}

/** ITS Step 6: Initial Conditions System and Constants */
export type OdeItsStep6 = FirstOrderOdeItsStep6 | SecondOrderOdeItsStep6;

/** Targeted conceptual mastery question for Step 7 */
export interface OdeItsConceptQuestion {
	/** Question prompt formatted in LaTeX */
	prompt: string;
	/** List of multiple choice option answers */
	options: OdeItsOption[];
	/** Detailed conceptual explanation upon completion */
	explanation: string;
}

/** First-Order ITS Step 7: Response Decomposition & Conceptual Mastery */
export interface FirstOrderOdeItsStep7 extends BaseItsStep {
	/** Determines whether Part B identifies algebraic or long-term response components. */
	decompositionMode: OdeDecompositionMode;
	/** Zero-input LaTeX expression */
	expectedZI: string;
	/** Zero-state LaTeX expression */
	expectedZS: string;
	/** Homogeneous constants for Zero-Input response (x(t) = 0) */
	ziConstants: { C1: number; C2?: undefined };
	/** Homogeneous constants for Zero-State response (initial conditions = 0) */
	zsConstants: { C1: number; C2?: undefined };
	/** Transient response LaTeX expression y_{tr}(t) */
	y_tr_latex: string;
	/** Steady-state response LaTeX expression y_{ss}(t) */
	y_ss_latex: string;
	/** Multiple-choice options for transient response identification */
	transientOptions: OdeItsOption[];
	/** Multiple-choice options for steady-state response identification */
	steadyStateOptions: OdeItsOption[];
	/** Targeted conceptual mastery question */
	conceptQuestion: OdeItsConceptQuestion;
	/** Evaluated linear system equations for Zero-Input initial conditions */
	ziSystemLatex: string;
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]> | undefined;
}

/** Second-Order ITS Step 7: Response Decomposition & Conceptual Mastery */
export interface SecondOrderOdeItsStep7 extends BaseItsStep {
	/** Determines whether Part B identifies algebraic or long-term response components. */
	decompositionMode: OdeDecompositionMode;
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
	conceptQuestion: OdeItsConceptQuestion;
	/** Evaluated linear system equations for Zero-Input initial conditions */
	ziSystemLatex: string;
	/** Sub-step-specific progressive hints */
	subStepHints?: Record<string, string[]> | undefined;
}

/** ITS Step 7: Response Decomposition */
export type OdeItsStep7 = FirstOrderOdeItsStep7 | SecondOrderOdeItsStep7;

/** The two distinct response decompositions taught in Part B. */
export type OdeDecompositionMode =
	"homogeneous_particular" | "transient_steady_state";

/** Complete ITS problem data container for first-order ODE problem */
export interface FirstOrderOdeItsData {
	step1: OdeItsStep1;
	step2: FirstOrderOdeItsStep2;
	step3: FirstOrderOdeItsStep3;
	step4: OdeItsStep4;
	step5: FirstOrderOdeItsStep5;
	step6: FirstOrderOdeItsStep6;
	step7: FirstOrderOdeItsStep7;
}

/** Complete ITS problem data container for second-order ODE problem */
export interface SecondOrderOdeItsData {
	step1: OdeItsStep1;
	step2: SecondOrderOdeItsStep2;
	step3: SecondOrderOdeItsStep3;
	step4: OdeItsStep4;
	step5: SecondOrderOdeItsStep5;
	step6: SecondOrderOdeItsStep6;
	step7: SecondOrderOdeItsStep7;
}

/** Complete ITS problem data container for ODE problem */
export type OdeItsData = FirstOrderOdeItsData | SecondOrderOdeItsData;

/** Base ODE practice problem properties shared across all orders */
export interface BaseOdeProblem {
	/** Unique problem identifier */
	id: string;
	/** Title of problem */
	difficulty: "easy" | "medium" | "hard";
	/** Seed that fully reproduces this problem, including option ordering. */
	seed: number;
	/** Input forcing function parameters */
	forcing: ForcingFunction;
	/** Formatted LaTeX differential equation prompt text */
	odeLatex: string;
	/** Complete numerical evaluator closure for y(t) = y_h(t) + y_p(t) */
	evalComplete: (t: number) => number;
	/** Zero-input numerical evaluator closure for y_zi(t) */
	evalZI: (t: number) => number;
	/** Zero-state numerical evaluator closure for y_zs(t) */
	evalZS: (t: number) => number;
}

/** Complete first-order ODE practice problem */
export interface FirstOrderOdeProblem extends BaseOdeProblem {
	title: string;
	/** First-order differential equation parameters */
	params: FirstOrderOdeParams;
	/** Initial condition y(0+) */
	initialConditions: { y0: number; dy0?: undefined };
	/** Expected target analytical solution components */
	solutions: {
		/** Classification of characteristic roots (strictly single_real) */
		rootType: FirstOrderRootType;
		/** Single real root of characteristic equation */
		r1: number;
		r2?: undefined;
		r1_im?: undefined;
		r2_im?: undefined;
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
	/** Intelligent Tutoring System step-by-step metadata */
	itsData: FirstOrderOdeItsData;
}

/** Complete second-order ODE practice problem */
export interface SecondOrderOdeProblem extends BaseOdeProblem {
	title: string;
	/** Second-order differential equation parameters */
	params: SecondOrderOdeParams;
	/** Initial conditions y(0+) and y'(0+) */
	initialConditions: { y0: number; dy0: number };
	/** Expected target analytical solution components */
	solutions: {
		/** Classification of characteristic roots */
		rootType: SecondOrderRootType;
		/** First root of characteristic equation (real part if complex) */
		r1: number;
		/** Second root of characteristic equation (real part if distinct real) */
		r2: number;
		/** Imaginary part of first root (if complex) */
		r1_im?: number | undefined;
		/** Imaginary part of second root (if complex) */
		r2_im?: number | undefined;
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
	/** Intelligent Tutoring System step-by-step metadata */
	itsData: SecondOrderOdeItsData;
}

/** Complete ODE practice problem object containing metadata, analytical solutions, and evaluators */
export type OdeProblem = FirstOrderOdeProblem | SecondOrderOdeProblem;

/** Characteristic equation coefficients for a first-order ODE ($a_1 s + a_0 = 0$) */
export interface FirstOrderCharacteristicCoefficients {
	/** Differential equation order discriminator (1) */
	order: 1;
	/** First derivative coefficient $a_1$ ($a_1 y' + a_0 y = x(t)$) */
	a1: number;
	/** Zero-th derivative coefficient $a_0$ ($a_1 y' + a_0 y = x(t)$) */
	a0: number;
}

/** Characteristic equation coefficients for a second-order ODE ($a_2 s^2 + a_1 s + a_0 = 0$) */
export interface SecondOrderCharacteristicCoefficients {
	/** Differential equation order discriminator (2) */
	order: 2;
	/** Second derivative coefficient $a_2$ ($a_2 y'' + a_1 y' + a_0 y = x(t)$) */
	a2?: number;
	/** First derivative coefficient $a_1$ ($a_2 y'' + a_1 y' + a_0 y = x(t)$) */
	a1: number;
	/** Zero-th derivative coefficient $a_0$ ($a_2 y'' + a_1 y' + a_0 y = x(t)$) */
	a0: number;
}

/** Characteristic equation coefficients for either a 1st- or 2nd-order ODE */
export type CharacteristicEquationCoefficients =
	| FirstOrderCharacteristicCoefficients
	| SecondOrderCharacteristicCoefficients;
