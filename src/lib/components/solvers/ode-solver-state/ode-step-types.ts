/**
 * ODE Solver State Types & Substep Identifiers.
 *
 * Defines the state interfaces for steps 1 through 7 of the ODE ITS solver.
 */

import type {
	OdeRootType,
	SecondOrderRootType,
} from "$lib/math-engine/odes/index";
import type {
	BaseStepState,
	MultiPartStepState,
} from "../base-step-solver.svelte";

/**
 * Step 1 State: Characteristic Equation Coefficients (a2 s^2 + a1 s + a0 = 0).
 */
export interface OdeStep1State extends BaseStepState {
	/** Leading coefficient a2 */
	a2: string;
	/** First derivative coefficient a1 */
	a1: string;
	/** Constant term coefficient a0 */
	a0: string;
}

/**
 * Step 2 Sub-step Identifiers.
 */
export type OdeStep2SubStepId =
	| "strategy_gate"
	| "factoring_inputs"
	| "quad_classification"
	| "remedial_discriminant"
	| "quad_root_inputs";

/**
 * Step 2 State: Characteristic Roots & Quadratic Setup Inputs.
 */
export interface OdeStep2State extends MultiPartStepState<OdeStep2SubStepId> {
	/** Selected solving strategy: factoring or quadratic formula */
	strategy: "factoring" | "quadratic" | null;
	/** First root input string (for distinct real / repeated) */
	r1: string;
	/** Second root input string (for distinct real) */
	r2: string;
	/** Real part sigma (for complex conjugate) */
	sigma: string;
	/** Imaginary part omega_d (for complex conjugate) */
	omegaD: string;
	/** Selected root classification in quadratic formula path */
	quadClassChoice: SecondOrderRootType | null;
	/** Calculated discriminant input string (Delta = b^2 - 4ac) */
	quadDiscriminantInput: string;
	/** Whether the student selected an incorrect classification and must calculate Delta */
	quadNeedsDiscriminantCalc: boolean;
	/** Whether the discriminant has been verified successfully */
	quadDiscriminantVerified: boolean;
}

/**
 * Step 3 State: Homogeneous Form Template Selection.
 */
export interface OdeStep3State extends BaseStepState {
	/** Selected RootType template */
	selected: OdeRootType | null;
}

/**
 * Step 4 State: Particular Solution Ansatz Card Selection.
 */
export interface OdeStep4State extends BaseStepState {
	/** Selected option identifier */
	selected: string | null;
}

/**
 * Step 5 Sub-step Identifiers.
 */
export type OdeStep5SubStepId =
	"first_deriv" | "second_deriv" | "system_setup" | "solve";

/**
 * Step 5 State: Undetermined Particular Coefficients.
 */
export interface OdeStep5State extends MultiPartStepState<OdeStep5SubStepId> {
	/** Selected first derivative option ID (Part 5A-1) */
	selectedFirstDeriv: string | null;
	/** Selected second derivative option ID (Part 5A-2) */
	selectedSecondDeriv: string | null;
	/** Selected derivative option ID (legacy combined) */
	selectedDerivatives: string | null;
	/** Selected grouped system setup option ID */
	selectedSystem: string | null;
	/** Solved Kp for constant/exponential forcing */
	kp: string;
	/** Solved A for sinusoidal forcing */
	a: string;
	/** Solved B for sinusoidal forcing */
	b: string;
}

/**
 * Step 6 Sub-step Identifiers.
 */
export type OdeStep6SubStepId = "target_values" | "solve_constants";

/**
 * Step 6 State: Initial Conditions Constants C1, C2.
 */
export interface OdeStep6State extends MultiPartStepState<OdeStep6SubStepId> {
	/** Target homogeneous value y_h(0+) = y(0+) - y_p(0+) */
	yh0: string;
	/** Target homogeneous derivative y_h'(0+) = y'(0+) - y_p'(0+) */
	dyh0: string;
	/** Constant C1 input string */
	c1: string;
	/** Constant C2 input string */
	c2: string;
}

/**
 * Step 7 Sub-step Identifiers.
 */
export type OdeStep7SubStepId = "zi_zs" | "tr_ss" | "concept";

/**
 * Step 7 State: Response Decomposition & Conceptual Mastery.
 */
export interface OdeStep7State extends MultiPartStepState<OdeStep7SubStepId> {
	/** Zero-input C1 constant input string */
	ziC1: string;
	/** Zero-input C2 constant input string */
	ziC2: string;
	/** Selected transient response option identifier */
	selectedTransient: string | null;
	/** Selected steady-state response option identifier */
	selectedSteadyState: string | null;
	/** Selected conceptual question option identifier */
	selectedConcept: string | null;
	/** Whether the zero-input / zero-state subpart has passed */
	ziZsPassed: boolean;
	/** Whether the transient / steady-state subpart has passed */
	trSsPassed: boolean;
	/** Whether the conceptual question subpart has passed */
	conceptPassed: boolean;
}
