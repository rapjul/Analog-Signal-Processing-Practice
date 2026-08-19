import {
	formatExpTerm,
	formatLinearCombination,
	formatSignedLinearTerm,
	sanitizeLatexMath,
} from "$lib/math-engine/formatting";
import { parseNumericInput, toFractionLatex } from "$lib/math-engine/fraction";
import { approximatelyEqual } from "$lib/math-engine/numeric";
import type {
	OdeItsOption,
	OdeProblem,
	OdeRootType,
	SecondOrderOdeItsStep2,
	SecondOrderRootType,
} from "$lib/math-engine/odes";
import {
	BaseStepSolverState,
	type BaseStepState,
	createMultiPartStepState,
	createStepState,
	createSubStepState,
	type MultiPartStepState,
	type SolverVisualStateDescriptor,
	type SubStepProgress,
} from "./base-step-solver.svelte";

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

/**
 * Reactive Step-by-Step ODE Solver Controller Class.
 * Manages reactive step state transitions, pedagogical distractor feedback,
 * answer validations, hints, and error diagnostics for 2nd-order ODEs.
 */
export class OdeStepSolverState extends BaseStepSolverState {
	/** Reactive getter for current active ODE problem */
	private getProblem: () => OdeProblem;

	/**
	 * Accesses the active ODE problem.
	 */
	get problem(): OdeProblem {
		return this.getProblem();
	}

	/** Step 1 State: Characteristic Equation Setup */
	step1: OdeStep1State = $state<OdeStep1State>(
		createStepState({ a2: "", a1: "", a0: "" }),
	);

	/** Step 2 State: Characteristic Roots & Strategy State Machine */
	step2: OdeStep2State = $state<OdeStep2State>(
		createMultiPartStepState(
			{
				strategy: null as "factoring" | "quadratic" | null,
				r1: "",
				r2: "",
				sigma: "",
				omegaD: "",
				quadClassChoice: null as SecondOrderRootType | null,
				quadDiscriminantInput: "",
				quadNeedsDiscriminantCalc: false,
				quadDiscriminantVerified: false,
			},
			[
				"strategy_gate",
				"factoring_inputs",
				"quad_classification",
				"remedial_discriminant",
				"quad_root_inputs",
			],
			{
				strategy_gate: createSubStepState(
					"strategy_gate",
					"Select Solving Strategy",
				),
				factoring_inputs: createSubStepState(
					"factoring_inputs",
					"Factoring & Roots",
				),
				quad_classification: createSubStepState(
					"quad_classification",
					"Root Classification",
				),
				remedial_discriminant: createSubStepState(
					"remedial_discriminant",
					"Calculate Discriminant",
				),
				quad_root_inputs: createSubStepState(
					"quad_root_inputs",
					"Quadratic Formula Roots",
				),
			},
			"strategy_gate",
		),
	);

	/** Step 3 State: Homogeneous Form Template */
	step3: OdeStep3State = $state<OdeStep3State>(
		createStepState({ selected: null as OdeRootType | null }),
	);

	/** Step 4 State: Particular Solution Ansatz */
	step4: OdeStep4State = $state<OdeStep4State>(
		createStepState({ selected: null as string | null }),
	);

	/** Step 5 State: Undetermined Particular Coefficients */
	step5: OdeStep5State = $state<OdeStep5State>(
		createMultiPartStepState(
			{
				selectedFirstDeriv: null as string | null,
				selectedSecondDeriv: null as string | null,
				selectedDerivatives: null as string | null,
				selectedSystem: null as string | null,
				kp: "",
				a: "",
				b: "",
			},
			["first_deriv", "second_deriv", "system_setup", "solve"],
			{
				first_deriv: createSubStepState(
					"first_deriv",
					"Part 5A-1: First Derivative",
				),
				second_deriv: createSubStepState(
					"second_deriv",
					"Part 5A-2: Second Derivative",
				),
				system_setup: createSubStepState(
					"system_setup",
					"Part 5B: System Setup",
				),
				solve: createSubStepState(
					"solve",
					"Part 5C: Undetermined Coefficients",
				),
			},
			"first_deriv",
		),
	);

	/** Step 6 State: Initial Conditions Constants */
	step6: OdeStep6State = $state<OdeStep6State>(
		createMultiPartStepState(
			{
				yh0: "",
				dyh0: "",
				c1: "",
				c2: "",
			},
			["target_values", "solve_constants"],
			{
				target_values: createSubStepState(
					"target_values",
					"Part 6A: Target Initial Values",
				),
				solve_constants: createSubStepState(
					"solve_constants",
					"Part 6B: Integration Constants",
				),
			},
			"target_values",
		),
	);

	/** Step 7 State: Response Decomposition & Conceptual Mastery */
	step7: OdeStep7State = $state<OdeStep7State>(
		createMultiPartStepState(
			{
				ziC1: "",
				ziC2: "",
				selectedTransient: null as string | null,
				selectedSteadyState: null as string | null,
				selectedConcept: null as string | null,
				ziZsPassed: false,
				trSsPassed: false,
				conceptPassed: false,
			},
			["zi_zs", "tr_ss", "concept"],
			{
				zi_zs: createSubStepState(
					"zi_zs",
					"Part 7A: Zero-Input & Zero-State",
				),
				tr_ss: createSubStepState(
					"tr_ss",
					"Part 7B: Transient & Steady-State",
				),
				concept: createSubStepState(
					"concept",
					"Part 7C: Conceptual Mastery",
				),
			},
			"zi_zs",
		),
	);

	/**
	 * Returns the active step state object for the active step index.
	 */
	get currentStepState(): BaseStepState | undefined {
		switch (this.currentStep) {
			case 1:
				return this.step1;
			case 2:
				return this.step2;
			case 3:
				return this.step3;
			case 4:
				return this.step4;
			case 5:
				return this.step5;
			case 6:
				return this.step6;
			case 7:
				return this.step7;
			default:
				return undefined;
		}
	}

	/**
	 * Live rendered preview equation for Step 1 Characteristic Equation.
	 */
	previewCharEq = $derived.by((): string => {
		const a2Str = this.step1.a2.trim();
		const a1Str = this.step1.a1.trim();
		const a0Str = this.step1.a0.trim();

		let term2 = "s^2";
		if (a2Str !== "") {
			const n2 = parseNumericInput(a2Str);
			if (!Number.isNaN(n2)) {
				if (n2 === 1) term2 = "s^2";
				else if (n2 === -1) term2 = "-s^2";
				else term2 = `${a2Str}s^2`;
			} else {
				term2 = `${a2Str}s^2`;
			}
		} else {
			term2 = "a_2 s^2";
		}

		let term1 = "+ a_1 s";
		if (a1Str !== "") {
			const n1 = parseNumericInput(a1Str);
			if (!Number.isNaN(n1)) {
				if (n1 === 1) term1 = "+ s";
				else if (n1 === -1) term1 = "- s";
				else if (n1 >= 0) term1 = `+ ${a1Str}s`;
				else
					term1 = `- ${a1Str.startsWith("-") ? a1Str.slice(1).trim() : Math.abs(n1)}s`;
			} else {
				term1 = `+ ${a1Str}s`;
			}
		} else {
			term1 = "+ a_1 s";
		}

		let term0 = "+ a_0";
		if (a0Str !== "") {
			const n0 = parseNumericInput(a0Str);
			if (!Number.isNaN(n0)) {
				if (n0 >= 0) term0 = `+ ${a0Str}`;
				else
					term0 = `- ${a0Str.startsWith("-") ? a0Str.slice(1).trim() : Math.abs(n0)}`;
			} else {
				term0 = `+ ${a0Str}`;
			}
		} else {
			term0 = "+ a_0";
		}

		return this.problem.params.order === 1
			? `${term1.replace(/^\+\s*/, "")} ${term0} = 0`
			: `${term2} ${term1} ${term0} = 0`;
	});

	/**
	 * LaTeX string of the correct particular solution ansatz for Step 4 summary.
	 */
	correctAnsatz = $derived.by((): string => {
		return (
			this.problem.itsData.step4.options.find((opt) => opt.isCorrect)
				?.latex ?? ""
		);
	});

	/**
	 * Formatted step badge for Step 5 (e.g. "Step 5A-1", "Step 5A-2", "Step 5B", "Step 5C").
	 */
	get step5Badge(): string {
		if (this.currentStep !== 5) return "Step 5";
		switch (this.step5.activeSubStepId) {
			case "first_deriv":
				return "Step 5A-1";
			case "second_deriv":
				return "Step 5A-2";
			case "system_setup":
				return "Step 5B";
			case "solve":
				return "Step 5C";
			default:
				return "Step 5";
		}
	}

	/**
	 * Sub-step progress descriptor for Step 5 Undetermined Coefficients.
	 */
	get step5Progress(): SubStepProgress {
		const isSinusoid = this.problem.forcing.type === "sinusoid";
		const isSecondOrder = this.problem.params.order === 2;
		const total = isSinusoid
			? isSecondOrder
				? 4
				: 3
			: isSecondOrder
				? 3
				: 2;
		let current = 1;
		switch (this.step5.activeSubStepId) {
			case "first_deriv":
				current = 1;
				break;
			case "second_deriv":
				current = 2;
				break;
			case "system_setup":
				current = isSecondOrder ? 3 : 2;
				break;
			case "solve":
				current = total;
				break;
			default:
				current = 1;
				break;
		}
		return {
			current,
			total,
			label: `Part ${current} of ${total}`,
		};
	}

	/**
	 * Formatted subpart badge for Step 5C / Step 5B coefficient solve block.
	 */
	get step5CSubpartBadge(): string {
		return this.problem.forcing.type === "sinusoid" ? "Part 5C" : "Part 5B";
	}

	/**
	 * Formatted step badge for Step 6 (e.g. "Step 6" for 1st-order, "Step 6A", "Step 6B" for 2nd-order).
	 */
	get step6Badge(): string {
		if (this.currentStep !== 6 || this.problem.params.order === 1) {
			return "Step 6";
		}
		switch (this.step6.activeSubStepId) {
			case "target_values":
				return "Step 6A";
			case "solve_constants":
				return "Step 6B";
			default:
				return "Step 6";
		}
	}

	/**
	 * Sub-step progress descriptor for Step 6 Initial Conditions.
	 */
	get step6Progress(): SubStepProgress {
		if (this.problem.params.order === 1) {
			return {
				current: 1,
				total: 1,
				label: "Part 1 of 1",
			};
		}
		return this.getSubStepProgress(this.step6);
	}

	/**
	 * Formatted step badge for Step 7 (e.g. "Step 7A", "Step 7B", "Step 7C").
	 */
	get step7Badge(): string {
		if (this.currentStep !== 7) return "Step 7";
		switch (this.step7.activeSubStepId) {
			case "zi_zs":
				return "Step 7A";
			case "tr_ss":
				return "Step 7B";
			case "concept":
				return "Step 7C";
			default:
				return "Step 7";
		}
	}

	/**
	 * Sub-step progress descriptor for Step 7 Response Decomposition.
	 */
	get step7Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step7);
	}

	/**
	 * Progressive hints for the currently active step or sub-step.
	 */
	activeHints = $derived.by((): string[] => {
		const sId = this.currentStep;
		const its = this.problem.itsData;

		const stepMap: Record<
			number,
			{
				state: BaseStepState | MultiPartStepState;
				its: {
					hints: string[];
					subStepHints?: Record<string, string[]>;
				};
			}
		> = {
			1: { state: this.step1, its: its.step1 },
			2: { state: this.step2, its: its.step2 },
			3: { state: this.step3, its: its.step3 },
			4: { state: this.step4, its: its.step4 },
			5: { state: this.step5, its: its.step5 },
			6: { state: this.step6, its: its.step6 },
			7: { state: this.step7, its: its.step7 },
		};

		const current = stepMap[sId];
		if (!current) return [];

		if ("activeSubStepId" in current.state && current.its.subStepHints) {
			const subId = current.state.activeSubStepId;
			return current.its.subStepHints[subId] ?? current.its.hints;
		}

		return current.its.hints ?? [];
	});

	/**
	 * Creates a new OdeStepSolverState instance.
	 * @param {() => OdeProblem} getProblem Reactive getter for active ODE problem
	 * @param {() => (() => void) | undefined} [getOnComplete] Optional reactive getter for completion callback
	 */
	constructor(
		getProblem: () => OdeProblem,
		getOnComplete?: () => (() => void) | undefined,
	) {
		super(7, getOnComplete);
		this.getProblem = getProblem;
		this.reset();
	}

	/**
	 * Validates Step 1 (Characteristic Equation Formulation).
	 */
	checkStep1(): void {
		const s1Data = this.problem.itsData.step1;
		const isFirstOrder = this.problem.params.order === 1;
		const vA2 = isFirstOrder ? 0 : parseNumericInput(this.step1.a2);
		const vA1 = parseNumericInput(this.step1.a1);
		const vA0 = parseNumericInput(this.step1.a0);

		if (Number.isNaN(vA2) || Number.isNaN(vA1) || Number.isNaN(vA0)) {
			this.setValidation(
				this.step1,
				isFirstOrder
					? "Please enter numeric values for both coefficients: $a_1$ and $a_0$."
					: "Please enter numeric values for all three coefficients: $a_2$, $a_1$, and $a_0$.",
			);
			return;
		}

		if (
			approximatelyEqual(vA0, this.problem.forcing.K) &&
			!approximatelyEqual(vA0, s1Data.expectedA0)
		) {
			this.setMisconception(
				this.step1,
				s1Data.misconceptions.forcing_rhs,
			);
			return;
		}

		if (
			approximatelyEqual(vA2, s1Data.expectedA2) &&
			approximatelyEqual(vA1, s1Data.expectedA1) &&
			approximatelyEqual(vA0, s1Data.expectedA0)
		) {
			this.setPassed(this.step1, 2);
		} else {
			this.setIncorrect(
				this.step1,
				isFirstOrder
					? "Incorrect coefficients. Substitute $\\frac{dy}{dt} \\to s$ and $y(t) \\to 1$, setting the homogeneous right-hand side to $0$."
					: "Incorrect coefficients. Substitute $\\frac{d^2 y}{dt^2} \\to s^2$, $\\frac{dy}{dt} \\to s$, and $y(t) \\to 1$, setting the homogeneous right-hand side to $0$.",
			);
		}
	}

	/**
	 * Formatted LaTeX preview string of the substituted quadratic formula.
	 */
	previewQuadSetup = $derived.by((): string => {
		const b = this.problem.params.a1;
		const a = this.problem.params.a2;
		const c = this.problem.params.a0;
		const disc = b * b - 4 * a * c;
		const negB = -b;
		return `s = \\frac{-(${b}) \\pm \\sqrt{(${b})^2 - 4(${a})(${c})}}{2(${a})} = \\frac{${negB} \\pm \\sqrt{${disc}}}{${2 * a}}`;
	});

	/**
	 * Live rendered preview equation for Step 2 complex roots.
	 */
	previewComplexRoots = $derived.by((): string => {
		const sigStr =
			this.step2.sigma.trim() !== ""
				? this.step2.sigma.trim()
				: "\\sigma";
		const omStr =
			this.step2.omegaD.trim() !== ""
				? this.step2.omegaD.trim()
				: "\\omega_d";
		return `s = ${sigStr} \\pm j${omStr}`;
	});

	/**
	 * Legacy alias for selecting quadratic root classification in Step 2.
	 * @param {SecondOrderRootType} choice Root classification choice
	 */
	selectQuadRootClassification(choice: SecondOrderRootType): void {
		this.checkStep2QuadClass(choice);
	}

	/**
	 * Legacy alias for verifying discriminant in Step 2 remediation.
	 */
	verifyDiscriminant(): void {
		this.checkStep2Discriminant();
	}

	/**
	 * Legacy dispatcher for verifying Step 2 roots.
	 */
	checkStep2(): void {
		if (!this.step2.strategy) {
			this.setValidation(this.step2, "Please select a solving strategy.");
			return;
		}
		if (this.step2.strategy === "factoring") {
			this.checkStep2Factoring();
		} else if (this.step2.strategy === "quadratic") {
			if (
				!this.step2.quadClassChoice &&
				!this.step2.quadDiscriminantVerified
			) {
				this.setValidation(
					this.step2,
					"Please select the root classification first.",
				);
				return;
			}
			this.checkStep2QuadRoots();
		}
	}

	/**
	 * Selects the solving strategy in Step 2 Gate.
	 * @param {"factoring" | "quadratic"} strat Selected strategy
	 */
	selectStep2Strategy(strat: "factoring" | "quadratic"): void {
		this.clearFeedback();

		if (this.problem.params.order === 2) {
			const s2Data = this.problem.itsData.step2 as SecondOrderOdeItsStep2;
			if (strat === "factoring" && !s2Data.isFactorable) {
				this.setMisconception(
					this.step2,
					s2Data.misconceptions.unfactorable_complex ||
						s2Data.misconceptions.unfactorable_general,
				);
				return;
			}
		}

		this.step2.strategy = strat;
		if (strat === "factoring") {
			this.setSubStepPassed(
				this.step2,
				"strategy_gate",
				"factoring_inputs",
			);
		} else {
			this.setSubStepPassed(
				this.step2,
				"strategy_gate",
				"quad_classification",
			);
		}
	}

	/**
	 * Validates Step 2 Factoring Path root inputs.
	 */
	checkStep2Factoring(): void {
		const s2Data = this.problem.itsData.step2;
		const rootType = s2Data.rootType;
		if (this.problem.params.order === 1) {
			const value = parseNumericInput(this.step2.r1);
			if (Number.isNaN(value)) {
				this.setSubStepValidation(
					this.step2,
					"factoring_inputs",
					"Please enter a numeric value or fraction for the root $r$.",
				);
				return;
			}
			if (approximatelyEqual(value, s2Data.r1)) {
				this.setSubStepPassed(
					this.step2,
					"factoring_inputs",
					undefined,
					3,
				);
			} else {
				this.setSubStepIncorrect(
					this.step2,
					"factoring_inputs",
					`Incorrect root. Isolate $s$ in $${this.problem.params.a1}s + ${this.problem.params.a0} = 0$.`,
				);
			}
			return;
		}

		if (this.problem.params.order === 2) {
			const s2Data = this.problem.itsData.step2 as SecondOrderOdeItsStep2;
			if (!s2Data.isFactorable || rootType === "complex_conjugate") {
				this.setIncorrect(
					this.step2,
					"This polynomial cannot be factored over real integers. Please use the quadratic formula strategy.",
				);
				return;
			}
		}

		switch (rootType) {
			case "distinct_real": {
				const v1 = parseNumericInput(this.step2.r1);
				const v2 = parseNumericInput(this.step2.r2);

				if (Number.isNaN(v1) || Number.isNaN(v2)) {
					this.setValidation(
						this.step2,
						"Please enter numeric values or fractions for both roots $r_1$ and $r_2$.",
					);
					return;
				}

				const r1 = s2Data.r1;
				const r2 = s2Data.r2 ?? 0;
				const matchDirect =
					approximatelyEqual(v1, r1) && approximatelyEqual(v2, r2);
				const matchSwapped =
					approximatelyEqual(v1, r2) && approximatelyEqual(v2, r1);

				if (matchDirect || matchSwapped) {
					this.setSubStepPassed(
						this.step2,
						"factoring_inputs",
						undefined,
						3,
					);
				} else if (
					(approximatelyEqual(v1, -r1) &&
						approximatelyEqual(v2, -r2)) ||
					(approximatelyEqual(v1, -r2) && approximatelyEqual(v2, -r1))
				) {
					this.setMisconception(
						this.step2,
						"Check your signs. Remember that factoring as $(s - r_1)(s - r_2) = 0$ means the roots are $s = r_1$ and $s = r_2$.",
					);
				} else if (
					(approximatelyEqual(v1, -r1) &&
						approximatelyEqual(v2, r2)) ||
					(approximatelyEqual(v1, r1) &&
						approximatelyEqual(v2, -r2)) ||
					(approximatelyEqual(v1, -r2) &&
						approximatelyEqual(v2, r1)) ||
					(approximatelyEqual(v1, r2) && approximatelyEqual(v2, -r1))
				) {
					this.setMisconception(
						this.step2,
						"Check the sign of your roots. One of your factored roots has an inverted sign.",
					);
				} else {
					this.setIncorrect(
						this.step2,
						`Incorrect roots. Factoring $${this.problem.itsData.step1.latex}$ gives $${this.problem.itsData.step2.factoredFormLatex}$.`,
					);
				}
				break;
			}

			case "repeated_real": {
				const v1 = parseNumericInput(this.step2.r1);

				if (Number.isNaN(v1)) {
					this.setValidation(
						this.step2,
						"Please enter a numeric value or fraction for the repeated root $r$.",
					);
					return;
				}

				const r1 = s2Data.r1;
				if (approximatelyEqual(v1, r1)) {
					this.setSubStepPassed(
						this.step2,
						"factoring_inputs",
						undefined,
						3,
					);
				} else if (approximatelyEqual(v1, -r1) && Math.abs(r1) > 0.01) {
					this.setMisconception(
						this.step2,
						"Check your sign. If factored as $(s - r)^2 = 0$, then the root is $s = r$.",
					);
				} else {
					this.setIncorrect(
						this.step2,
						`Incorrect repeated root. Factoring gives $(s - (${r1}))^2 = 0$.`,
					);
				}
				break;
			}

			default:
				throw new Error(
					`Unhandled root type in factoring branch: ${rootType}`,
				);
		}
	}

	/**
	 * Validates Step 2 Quadratic Formula classification choice.
	 * @param {SecondOrderRootType} choice Selected root classification
	 */
	checkStep2QuadClass(choice: SecondOrderRootType): void {
		if (this.problem.params.order === 1) {
			this.setSubStepValidation(
				this.step2,
				"factoring_inputs",
				"First-order differential equations are linear and do not use quadratic classification.",
			);
			return;
		}
		const s2Data = this.problem.itsData.step2 as SecondOrderOdeItsStep2;
		if (choice === s2Data.rootType) {
			this.step2.quadClassChoice = choice;
			this.step2.quadNeedsDiscriminantCalc = false;
			this.setSubStepPassed(
				this.step2,
				"quad_classification",
				"quad_root_inputs",
			);
		} else {
			this.step2.quadClassChoice = null;
			this.step2.quadNeedsDiscriminantCalc = true;
			this.setSubStepMisconception(
				this.step2,
				"quad_classification",
				`Incorrect classification. Calculate the discriminant $\\Delta = b^2 - 4ac$ to confirm whether $\\Delta > 0$, $\\Delta = 0$, or $\\Delta < 0$.`,
			);
			this.step2.activeSubStepId = "remedial_discriminant";
		}
	}

	/**
	 * Validates Step 2 Remedial Discriminant Calculation.
	 */
	checkStep2Discriminant(): void {
		if (this.problem.params.order === 1) {
			this.setSubStepValidation(
				this.step2,
				"factoring_inputs",
				"First-order differential equations do not have a quadratic discriminant.",
			);
			return;
		}
		const s2Data = this.problem.itsData.step2 as SecondOrderOdeItsStep2;
		const vDisc = parseNumericInput(this.step2.quadDiscriminantInput);

		if (Number.isNaN(vDisc)) {
			this.setSubStepValidation(
				this.step2,
				"remedial_discriminant",
				"Please enter a numeric value for $\\Delta = b^2 - 4ac$.",
			);
			return;
		}

		const expDisc = s2Data.discriminant;
		if (approximatelyEqual(vDisc, expDisc)) {
			this.step2.quadDiscriminantVerified = true;
			this.step2.quadNeedsDiscriminantCalc = false;
			this.step2.quadClassChoice = s2Data.rootType;
			this.setSubStepPassed(
				this.step2,
				"remedial_discriminant",
				"quad_root_inputs",
			);
		} else {
			this.setSubStepIncorrect(
				this.step2,
				"remedial_discriminant",
				`Incorrect discriminant. $\\Delta = (${this.problem.params.a1})^2 - 4(${this.problem.params.a2})(${this.problem.params.a0}) = ${expDisc}$.`,
			);
		}
	}

	/**
	 * Validates Step 2 Quadratic Formula root calculations.
	 */
	checkStep2QuadRoots(): void {
		if (this.problem.params.order === 1) {
			this.setSubStepValidation(
				this.step2,
				"factoring_inputs",
				"First-order differential equations do not use quadratic root formulas.",
			);
			return;
		}
		const s2Data = this.problem.itsData.step2 as SecondOrderOdeItsStep2;
		const rootType = s2Data.rootType;

		switch (rootType) {
			case "complex_conjugate": {
				const vSig = parseNumericInput(this.step2.sigma);
				const vOm = parseNumericInput(this.step2.omegaD);

				if (Number.isNaN(vSig) || Number.isNaN(vOm)) {
					this.setSubStepValidation(
						this.step2,
						"quad_root_inputs",
						"Please enter numeric values for both real part $\\sigma$ and damped frequency $\\omega_d$.",
					);
					return;
				}

				const expSig = s2Data.r1;
				const expOm = s2Data.im ?? 0;

				if (
					approximatelyEqual(vSig, expSig) &&
					approximatelyEqual(vOm, expOm)
				) {
					this.setSubStepPassed(
						this.step2,
						"quad_root_inputs",
						undefined,
						3,
					);
				} else if (approximatelyEqual(vSig, -expSig)) {
					this.setSubStepMisconception(
						this.step2,
						"quad_root_inputs",
						"Check the sign of $\\sigma$. In the quadratic formula, $\\sigma = \\frac{-b}{2a}$.",
					);
				} else {
					this.setSubStepIncorrect(
						this.step2,
						"quad_root_inputs",
						`Incorrect roots. $\\sigma = \\frac{-(${this.problem.params.a1})}{${2 * this.problem.params.a2}} = ${expSig}$ and $\\omega_d = \\frac{\\sqrt{${Math.abs(s2Data.discriminant)}}}{${2 * Math.abs(this.problem.params.a2)}} = ${expOm}$.`,
					);
				}
				break;
			}

			case "distinct_real": {
				const v1 = parseNumericInput(this.step2.r1);
				const v2 = parseNumericInput(this.step2.r2);

				if (Number.isNaN(v1) || Number.isNaN(v2)) {
					this.setSubStepValidation(
						this.step2,
						"quad_root_inputs",
						"Please enter numeric values for both roots $r_1$ and $r_2$.",
					);
					return;
				}

				const r1 = s2Data.r1;
				const r2 = s2Data.r2 ?? 0;
				const matchDirect =
					approximatelyEqual(v1, r1) && approximatelyEqual(v2, r2);
				const matchSwapped =
					approximatelyEqual(v1, r2) && approximatelyEqual(v2, r1);

				if (matchDirect || matchSwapped) {
					this.setSubStepPassed(
						this.step2,
						"quad_root_inputs",
						undefined,
						3,
					);
				} else if (
					(approximatelyEqual(v1, -r1) &&
						approximatelyEqual(v2, -r2)) ||
					(approximatelyEqual(v1, -r2) && approximatelyEqual(v2, -r1))
				) {
					this.setSubStepMisconception(
						this.step2,
						"quad_root_inputs",
						"Check the signs of your roots. In the quadratic formula, the leading numerator term is $-b$.",
					);
				} else {
					this.setSubStepIncorrect(
						this.step2,
						"quad_root_inputs",
						`Incorrect roots. $s = \\frac{-(${this.problem.params.a1}) \\pm \\sqrt{${s2Data.discriminant}}}{${2 * this.problem.params.a2}}$, yielding $r_1 = ${r1}, r_2 = ${r2}.`,
					);
				}
				break;
			}

			case "repeated_real": {
				const v1 = parseNumericInput(this.step2.r1);

				if (Number.isNaN(v1)) {
					this.setSubStepValidation(
						this.step2,
						"quad_root_inputs",
						"Please enter a numeric value for the repeated root $r$.",
					);
					return;
				}

				const r1 = s2Data.r1;
				if (approximatelyEqual(v1, r1)) {
					this.setSubStepPassed(
						this.step2,
						"quad_root_inputs",
						undefined,
						3,
					);
				} else if (approximatelyEqual(v1, -r1) && Math.abs(r1) > 0.01) {
					this.setSubStepMisconception(
						this.step2,
						"quad_root_inputs",
						"Check your sign. For a repeated root with $\\Delta = 0$, $r = \\frac{-b}{2a}$.",
					);
				} else {
					this.setSubStepIncorrect(
						this.step2,
						"quad_root_inputs",
						`Incorrect repeated root. With $\\Delta = 0$, $r = \\frac{-b}{2a} = \\frac{${-this.problem.params.a1}}{${2 * this.problem.params.a2}}$.`,
					);
				}
				break;
			}

			default:
				throw new Error(
					`Unhandled root classification choice: ${String(this.step2.quadClassChoice)}`,
				);
		}
	}

	/**
	 * Validates Step 3 (Homogeneous Form Template Selection).
	 * @param {OdeRootType} template Selected template
	 */
	checkStep3(template: OdeRootType): void {
		const s3Data = this.problem.itsData.step3;
		this.checkChoiceStep(
			this.step3,
			template,
			s3Data.correctTemplate,
			s3Data.misconceptions,
			"Incorrect homogeneous template for the characteristic root structure.",
			"Please select a homogeneous solution form template.",
			4,
		);
	}

	/**
	 * Validates Step 4 (Particular Solution Ansatz).
	 * @param {OdeItsOption} opt Selected option
	 */
	checkStep4(opt: OdeItsOption): void {
		this.checkOptionCardStep(
			this.step4,
			opt,
			"Incorrect trial ansatz guess. Check for resonance collisions or missing trigonometric pairs.",
			"Please select a particular solution ansatz.",
			5,
		);
	}

	/**
	 * Validates Step 5 Part 5A-1 (First Derivative y_p'(t)).
	 * @param {OdeItsOption} opt Selected derivative option
	 */
	checkStep5FirstDeriv(opt: OdeItsOption): void {
		this.step5.selectedFirstDeriv = opt.id;
		if (opt.isCorrect) {
			const isSecondOrder = this.problem.params.order >= 2;
			if (isSecondOrder) {
				this.setSubStepPassed(
					this.step5,
					"first_deriv",
					"second_deriv",
				);
			} else {
				const nextSub =
					this.problem.forcing.type === "sinusoid"
						? "system_setup"
						: "solve";
				this.setSubStepPassed(this.step5, "first_deriv", nextSub);
			}
		} else {
			this.setSubStepMisconception(
				this.step5,
				"first_deriv",
				opt.feedback ??
					"Incorrect first derivative of the trial particular solution.",
			);
		}
	}

	/**
	 * Validates Step 5 Part 5A-2 (Second Derivative y_p''(t)).
	 * @param {OdeItsOption} opt Selected derivative option
	 */
	checkStep5SecondDeriv(opt: OdeItsOption): void {
		if (this.problem.params.order === 1) {
			this.setSubStepValidation(
				this.step5,
				this.step5.activeSubStepId ?? "first_deriv",
				"First-order differential equations do not have a second derivative.",
			);
			return;
		}
		this.step5.selectedSecondDeriv = opt.id;
		if (opt.isCorrect) {
			const nextSub =
				this.problem.forcing.type === "sinusoid"
					? "system_setup"
					: "solve";
			this.setSubStepPassed(this.step5, "second_deriv", nextSub);
		} else {
			this.setSubStepMisconception(
				this.step5,
				"second_deriv",
				opt.feedback ??
					"Incorrect second derivative of the trial particular solution.",
			);
		}
	}

	/**
	 * Validates Step 5 Part 5A (Trial Derivatives - legacy combined).
	 * @param {OdeItsOption} opt Selected derivative option
	 */
	checkStep5Derivatives(opt: OdeItsOption): void {
		this.step5.selectedDerivatives = opt.id;
		if (opt.isCorrect) {
			const nextSubStep =
				this.problem.forcing.type === "sinusoid"
					? "system_setup"
					: "solve";
			this.setSubStepPassed(this.step5, "derivatives", nextSubStep);
		} else {
			this.setSubStepMisconception(
				this.step5,
				"derivatives",
				opt.feedback ??
					"Incorrect derivatives of the trial particular solution.",
			);
		}
	}

	/**
	 * Validates Step 5 Part 5B (System Setup).
	 * @param {OdeItsOption} opt Selected system setup option
	 */
	checkStep5System(opt: OdeItsOption): void {
		this.step5.selectedSystem = opt.id;
		if (opt.isCorrect) {
			this.setSubStepPassed(this.step5, "system_setup", "solve");
		} else {
			this.setSubStepMisconception(
				this.step5,
				"system_setup",
				opt.feedback ??
					"Incorrect system setup for the undetermined coefficients.",
			);
		}
	}

	/**
	 * Validates Step 5 Part 5C (Undetermined Coefficients).
	 */
	checkStep5Coeffs(): void {
		const s5Data = this.problem.itsData.step5;
		if (this.problem.forcing.type === "sinusoid") {
			const vA = parseNumericInput(this.step5.a);
			const vB = parseNumericInput(this.step5.b);

			if (Number.isNaN(vA) || Number.isNaN(vB)) {
				this.setSubStepValidation(
					this.step5,
					"solve",
					"Please enter numeric values for both coefficients: $A$ and $B$.",
				);
				return;
			}

			const expA = s5Data.expectedA ?? 0;
			const expB = s5Data.expectedB ?? 0;

			if (approximatelyEqual(vA, expA) && approximatelyEqual(vB, expB)) {
				this.setSubStepPassed(this.step5, "solve", undefined, 6);
			} else {
				this.setSubStepIncorrect(
					this.step5,
					"solve",
					"Incorrect coefficients $A$ and $B$. Solve the $2\\times 2$ system by substitution or Cramer's Rule.",
				);
			}
		} else {
			const vKp = parseNumericInput(this.step5.kp);

			if (Number.isNaN(vKp)) {
				this.setSubStepValidation(
					this.step5,
					"solve",
					"Please enter a numeric value for $K_p$.",
				);
				return;
			}

			const expKp = s5Data.expectedKp ?? 0;

			if (approximatelyEqual(vKp, expKp)) {
				this.setSubStepPassed(this.step5, "solve", undefined, 6);
			} else {
				this.setSubStepIncorrect(
					this.step5,
					"solve",
					`Incorrect coefficient $K_p$. Expected $K_p = ${toFractionLatex(expKp)}$.`,
				);
			}
		}
	}

	/**
	 * Legacy/shortcut wrapper for checking Step 5.
	 */
	checkStep5(): void {
		this.checkStep5Coeffs();
	}

	/**
	 * Validates Step 6 Part 6A: Target homogeneous initial values (y_h(0+) and y_h'(0+))
	 * or direct C_1 calculation for 1st-order equations.
	 */
	checkStep6TargetValues(): void {
		const s6Data = this.problem.itsData.step6;
		const isFirstOrder = this.problem.params.order === 1;
		const vYh0 = parseNumericInput(this.step6.yh0);
		const vDYh0 = isFirstOrder ? 0 : parseNumericInput(this.step6.dyh0);

		if (Number.isNaN(vYh0) || (!isFirstOrder && Number.isNaN(vDYh0))) {
			this.setSubStepValidation(
				this.step6,
				"target_values",
				isFirstOrder
					? "Please enter a numeric value or fraction for the constant $C_1 = y_h(0^+)$."
					: "Please enter numeric values or fractions for both target values: $y_h(0^+)$ and $y_h'(0^+)$.",
			);
			return;
		}

		const expYh0 = s6Data.targetYh0;
		const expDYh0 = s6Data.targetDYh0;

		if (
			approximatelyEqual(vYh0, expYh0) &&
			(isFirstOrder || approximatelyEqual(vDYh0, expDYh0 ?? 0))
		) {
			if (isFirstOrder) {
				this.step6.c1 = this.step6.yh0;
				this.setSubStepPassed(
					this.step6,
					"target_values",
					undefined,
					7,
				);
			} else {
				this.setSubStepPassed(
					this.step6,
					"target_values",
					"solve_constants",
				);
			}
		} else if (
			approximatelyEqual(vYh0, this.problem.initialConditions.y0) &&
			(isFirstOrder ||
				approximatelyEqual(
					vDYh0,
					this.problem.initialConditions.dy0 ?? 0,
				))
		) {
			this.setSubStepMisconception(
				this.step6,
				"target_values",
				"Forgetting Particular Contribution: Initial conditions apply to the TOTAL response $y(t) = y_h(t) + y_p(t)$. You must subtract $y_p(0^+)$ to find the homogeneous contribution $y_h(0^+)$.",
			);
		} else {
			this.setSubStepIncorrect(
				this.step6,
				"target_values",
				isFirstOrder
					? `Incorrect value. $C_1 = y_h(0^+) = y(0^+) - y_p(0^+) = ${toFractionLatex(expYh0)}$.`
					: `Incorrect target values. $y_h(0^+) = y(0^+) - y_p(0^+) = ${toFractionLatex(expYh0)}$ and $y_h'(0^+) = y'(0^+) - y_p'(0^+) = ${toFractionLatex(expDYh0 ?? 0)}$.`,
			);
		}
	}

	/**
	 * Validates Step 6 Part 6B (Integration Constants).
	 */
	checkStep6Constants(): void {
		const s6Data = this.problem.itsData.step6;
		const isFirstOrder = this.problem.params.order === 1;
		const vC1 = parseNumericInput(this.step6.c1);
		const vC2 = isFirstOrder ? 0 : parseNumericInput(this.step6.c2);

		if (Number.isNaN(vC1) || Number.isNaN(vC2)) {
			this.setSubStepValidation(
				this.step6,
				"solve_constants",
				"Please enter numeric values for both constants: $C_1$ and $C_2$.",
			);
			return;
		}

		if (
			approximatelyEqual(vC1, s6Data.expectedC1) &&
			(isFirstOrder || approximatelyEqual(vC2, s6Data.expectedC2 ?? 0))
		) {
			this.setSubStepPassed(this.step6, "solve_constants", undefined, 7);
		} else {
			this.setSubStepIncorrect(
				this.step6,
				"solve_constants",
				"Incorrect constants $C_1$, $C_2$. Solve the linear system matching $y_h(0^+)$ and $y_h'(0^+)$.",
			);
		}
	}

	/**
	 * Legacy/shortcut wrapper for checking Step 6.
	 */
	checkStep6(): void {
		if (
			this.problem.params.order === 1 ||
			this.step6.activeSubStepId === "target_values"
		) {
			this.checkStep6TargetValues();
		} else {
			this.checkStep6Constants();
		}
	}

	/**
	 * Formatted LaTeX preview string of the student's Zero-Input response.
	 */
	previewZI = $derived.by((): string => {
		const c1 =
			this.step7.ziC1.trim() !== "" ? this.step7.ziC1.trim() : "C_{1,ZI}";
		const c2 =
			this.step7.ziC2.trim() !== "" ? this.step7.ziC2.trim() : "C_{2,ZI}";

		if (this.problem.params.order === 1) {
			return sanitizeLatexMath(
				formatSignedLinearTerm(
					c1,
					formatExpTerm(this.problem.params.roots.r1),
					true,
				),
			);
		}

		const params = this.problem.params;
		const rootType = params.rootType;
		const roots = params.roots;

		let raw = "";
		switch (rootType) {
			case "distinct_real": {
				const term1 = formatSignedLinearTerm(
					c1,
					formatExpTerm(roots.r1),
					true,
				);
				const term2 = formatSignedLinearTerm(
					c2,
					formatExpTerm(roots.r2 ?? 0),
					false,
				);
				raw = `${term1} ${term2}`;
				break;
			}
			case "repeated_real": {
				const inner = formatLinearCombination(c1, c2);
				raw = `(${inner}) ${formatExpTerm(roots.r1)}`;
				break;
			}
			case "complex_conjugate": {
				const term1 = formatSignedLinearTerm(
					c1,
					`\\cos(${roots.im ?? 0}t)`,
					true,
				);
				const term2 = formatSignedLinearTerm(
					c2,
					`\\sin(${roots.im ?? 0}t)`,
					false,
				);
				const expTerm = roots.r1 !== 0 ? formatExpTerm(roots.r1) : "";
				raw = expTerm
					? `${expTerm} [${term1} ${term2}]`
					: `${term1} ${term2}`;
				break;
			}
			default:
				raw = `${c1} + ${c2}`;
				break;
		}
		return sanitizeLatexMath(raw);
	});

	/**
	 * Derived Zero-State Constant C1 from superposition: C_{1,ZS} = C_1 - C_{1,ZI}.
	 */
	derivedZSC1 = $derived.by((): string => {
		const totalC1 = this.problem.itsData.step6.expectedC1;
		const vC1 = parseNumericInput(this.step7.ziC1);
		if (Number.isNaN(vC1)) return "C_{1,ZS}";
		const zsC1 = totalC1 - vC1;
		return toFractionLatex(zsC1);
	});

	/**
	 * Derived Zero-State Constant C2 from superposition: C_{2,ZS} = C_2 - C_{2,ZI}.
	 */
	derivedZSC2 = $derived.by((): string => {
		const totalC2 = this.problem.itsData.step6.expectedC2;
		const vC2 = parseNumericInput(this.step7.ziC2);
		if (Number.isNaN(vC2)) return "C_{2,ZS}";
		const zsC2 = (totalC2 ?? 0) - vC2;
		return toFractionLatex(zsC2);
	});

	/**
	 * Formatted LaTeX preview string of the Zero-State response y_{ZS}(t).
	 */
	previewZS = $derived.by((): string => {
		const c1 = this.derivedZSC1;
		const c2 = this.derivedZSC2;

		let homoPart = "";
		if (this.problem.params.order === 1) {
			homoPart = formatSignedLinearTerm(
				c1,
				formatExpTerm(this.problem.params.roots.r1),
				true,
			);
		} else {
			const params = this.problem.params;
			const rootType = params.rootType;
			const roots = params.roots;
			switch (rootType) {
				case "distinct_real": {
					const term1 = formatSignedLinearTerm(
						c1,
						formatExpTerm(roots.r1),
						true,
					);
					const term2 = formatSignedLinearTerm(
						c2,
						formatExpTerm(roots.r2 ?? 0),
						false,
					);
					homoPart = `${term1} ${term2}`;
					break;
				}
				case "repeated_real": {
					const inner = formatLinearCombination(c1, c2);
					homoPart = `(${inner}) ${formatExpTerm(roots.r1)}`;
					break;
				}
				case "complex_conjugate": {
					const term1 = formatSignedLinearTerm(
						c1,
						`\\cos(${roots.im ?? 0}t)`,
						true,
					);
					const term2 = formatSignedLinearTerm(
						c2,
						`\\sin(${roots.im ?? 0}t)`,
						false,
					);
					const expTerm =
						roots.r1 !== 0 ? formatExpTerm(roots.r1) : "";
					homoPart = expTerm
						? `${expTerm} [${term1} ${term2}]`
						: `${term1} ${term2}`;
					break;
				}
				default:
					homoPart = `${c1} + ${c2}`;
					break;
			}
		}

		let full = "";
		const yp = this.problem.solutions.y_p_latex;
		if (yp === "0" || yp === "") {
			full = homoPart;
		} else if (homoPart === "0" || homoPart === "") {
			full = yp;
		} else {
			full = `${homoPart} + ${yp}`;
		}
		return sanitizeLatexMath(full);
	});

	/**
	 * Validates Step 7 Part 7A: Zero-Input (y_{ZI}) and Zero-State (y_{ZS}) decomposition constants.
	 */
	checkStep7ZI(): void {
		const s7Data = this.problem.itsData.step7;
		const isFirstOrder = this.problem.params.order === 1;
		const vC1 = parseNumericInput(this.step7.ziC1);
		const vC2 = isFirstOrder ? 0 : parseNumericInput(this.step7.ziC2);

		if (Number.isNaN(vC1) || Number.isNaN(vC2)) {
			this.setSubStepValidation(
				this.step7,
				"zi_zs",
				"Please enter numeric values or fractions for both Zero-Input constants: $C_{1,ZI}$ and $C_{2,ZI}$.",
			);
			return;
		}

		const expC1 = s7Data.ziConstants.C1;
		const expC2 = s7Data.ziConstants.C2;

		if (
			approximatelyEqual(vC1, expC1) &&
			(isFirstOrder || approximatelyEqual(vC2, expC2 ?? 0))
		) {
			this.step7.ziZsPassed = true;
			this.setSubStepPassed(this.step7, "zi_zs", "tr_ss");
		} else if (
			approximatelyEqual(vC1, this.problem.itsData.step6.expectedC1) &&
			approximatelyEqual(vC2, this.problem.itsData.step6.expectedC2 ?? 0)
		) {
			this.setSubStepMisconception(
				this.step7,
				"zi_zs",
				"Total vs Zero-Input Confusion: You entered the complete constants $C_1, C_2$ from Step 6. Zero-Input constants are determined by satisfying initial conditions with $x(t) = 0$ (so target values are original $y(0^-), y'(0^-)$ without subtracting $y_p$).",
			);
		} else {
			this.setSubStepIncorrect(
				this.step7,
				"zi_zs",
				`Incorrect Zero-Input constants. Solve the homogeneous initial conditions with $y_h(0) = y(0^-) = ${this.problem.initialConditions.y0}$ and $y_h'(0) = y'(0^-) = ${this.problem.initialConditions.dy0}$.`,
			);
		}
	}

	/**
	 * Validates Step 7 Part 7B: Transient and Steady-State response selection.
	 */
	checkStep7TrSS(): void {
		const s7Data = this.problem.itsData.step7;
		if (!this.step7.selectedTransient || !this.step7.selectedSteadyState) {
			this.setSubStepValidation(
				this.step7,
				"tr_ss",
				"Please select both the transient response and the steady-state response options.",
			);
			return;
		}

		const correctTr = s7Data.transientOptions.find((o) => o.isCorrect)?.id;
		const correctSS = s7Data.steadyStateOptions.find(
			(o) => o.isCorrect,
		)?.id;

		const isTrCorrect = this.step7.selectedTransient === correctTr;
		const isSSCorrect = this.step7.selectedSteadyState === correctSS;

		if (isTrCorrect && isSSCorrect) {
			this.step7.trSsPassed = true;
			this.setSubStepPassed(this.step7, "tr_ss", "concept");
		} else if (!isTrCorrect) {
			const chosenOpt = s7Data.transientOptions.find(
				(o) => o.id === this.step7.selectedTransient,
			);
			this.setSubStepMisconception(
				this.step7,
				"tr_ss",
				chosenOpt?.feedback ??
					"Incorrect transient response. Transient components must decay asymptotically to $0$ as $t \\to \\infty$.",
			);
		} else {
			const chosenOpt = s7Data.steadyStateOptions.find(
				(o) => o.id === this.step7.selectedSteadyState,
			);
			this.setSubStepMisconception(
				this.step7,
				"tr_ss",
				chosenOpt?.feedback ??
					"Incorrect steady-state response. Steady-state response persists indefinitely as $t \\to \\infty$.",
			);
		}
	}

	/**
	 * Validates Step 7 Part 7C: Conceptual Mastery question.
	 * @param {OdeItsOption} [opt] Optional selected concept option
	 */
	checkStep7Concept(opt?: OdeItsOption): void {
		if (opt) {
			this.step7.selectedConcept = opt.id;
		}

		if (!this.step7.selectedConcept) {
			this.setSubStepValidation(
				this.step7,
				"concept",
				"Please select an answer for the conceptual mastery question.",
			);
			return;
		}

		const s7Data = this.problem.itsData.step7;
		const chosen =
			opt ??
			s7Data.conceptQuestion.options.find(
				(o) => o.id === this.step7.selectedConcept,
			);

		if (chosen?.isCorrect) {
			this.step7.conceptPassed = true;
			this.setSubStepPassed(this.step7, "concept", undefined, 8);
		} else {
			this.setSubStepMisconception(
				this.step7,
				"concept",
				chosen?.feedback ??
					"Incorrect answer. Review linearity, zero-input, and stability principles.",
			);
		}
	}

	/**
	 * Legacy/shortcut wrapper for checking Step 7.
	 */
	checkStep7(): void {
		this.checkStep7ZI();
	}

	/**
	 * Resets all solver state and step answers for a new problem instance.
	 */
	reset(): void {
		this.currentStep = 1;
		this.isCompleted = false;
		this.hintTier = 0;
		this.step1 = createStepState({ a2: "", a1: "", a0: "" });
		this.step2 = createMultiPartStepState(
			{
				strategy: null as "factoring" | "quadratic" | null,
				r1: "",
				r2: "",
				sigma: "",
				omegaD: "",
				quadClassChoice: null as SecondOrderRootType | null,
				quadDiscriminantInput: "",
				quadNeedsDiscriminantCalc: false,
				quadDiscriminantVerified: false,
			},
			[
				"strategy_gate",
				"factoring_inputs",
				"quad_classification",
				"remedial_discriminant",
				"quad_root_inputs",
			],
			{
				strategy_gate: createSubStepState(
					"strategy_gate",
					"Select Solving Strategy",
				),
				factoring_inputs: createSubStepState(
					"factoring_inputs",
					"Factoring & Roots",
				),
				quad_classification: createSubStepState(
					"quad_classification",
					"Root Classification",
				),
				remedial_discriminant: createSubStepState(
					"remedial_discriminant",
					"Calculate Discriminant",
				),
				quad_root_inputs: createSubStepState(
					"quad_root_inputs",
					"Quadratic Formula Roots",
				),
			},
			"strategy_gate",
		);
		// A first-order characteristic equation is linear, so there is no
		// quadratic-strategy decision to make. Open the single-root input directly.
		if (this.problem.params.order === 1) {
			this.selectStep2Strategy("factoring");
		}
		this.step3 = createStepState({ selected: null as OdeRootType | null });
		this.step4 = createStepState({ selected: null as string | null });
		this.step5 = createMultiPartStepState(
			{
				selectedFirstDeriv: null as string | null,
				selectedSecondDeriv: null as string | null,
				selectedDerivatives: null as string | null,
				selectedSystem: null as string | null,
				kp: "",
				a: "",
				b: "",
			},
			["first_deriv", "second_deriv", "system_setup", "solve"],
			{
				first_deriv: createSubStepState(
					"first_deriv",
					"Part 5A-1: First Derivative",
				),
				second_deriv: createSubStepState(
					"second_deriv",
					"Part 5A-2: Second Derivative",
				),
				system_setup: createSubStepState(
					"system_setup",
					"Part 5B: System Setup",
				),
				solve: createSubStepState(
					"solve",
					"Part 5C: Undetermined Coefficients",
				),
			},
			"first_deriv",
		);
		this.step6 = createMultiPartStepState(
			{
				yh0: "",
				dyh0: "",
				c1: "",
				c2: "",
			},
			["target_values", "solve_constants"],
			{
				target_values: createSubStepState(
					"target_values",
					"Part 6A: Target Initial Values",
				),
				solve_constants: createSubStepState(
					"solve_constants",
					"Part 6B: Integration Constants",
				),
			},
			"target_values",
		);
		this.step7 = createMultiPartStepState(
			{
				ziC1: "",
				ziC2: "",
				selectedTransient: null as string | null,
				selectedSteadyState: null as string | null,
				selectedConcept: null as string | null,
				ziZsPassed: false,
				trSsPassed: false,
				conceptPassed: false,
			},
			["zi_zs", "tr_ss", "concept"],
			{
				zi_zs: createSubStepState(
					"zi_zs",
					"Part 7A: Zero-Input & Zero-State",
				),
				tr_ss: createSubStepState(
					"tr_ss",
					"Part 7B: Transient & Steady-State",
				),
				concept: createSubStepState(
					"concept",
					"Part 7C: Conceptual Mastery",
				),
			},
			"zi_zs",
		);
	}

	/**
	 * Named visual states supported by the active ODE archetype. Conditional
	 * states mirror the real branches in the solver instead of assuming that
	 * every problem exposes the same sub-step layout.
	 */
	override devGetVisualStates(): SolverVisualStateDescriptor[] {
		const states: SolverVisualStateDescriptor[] = [
			{
				id: "ode.step-01.characteristic-equation",
				label: "Step 1 · Characteristic Equation",
				step: 1,
				kind: "interactive",
			},
		];
		if (this.problem.params.order === 2) {
			states.push({
				id: "ode.step-02.strategy-gate",
				label: "Step 2 · Solving Strategy",
				step: 2,
				subStep: "strategy_gate",
				kind: "interactive",
			});
		}

		if (
			this.problem.params.order === 1 ||
			("isFactorable" in this.problem.itsData.step2 &&
				this.problem.itsData.step2.isFactorable &&
				this.problem.params.rootType !== "complex_conjugate")
		) {
			states.push({
				id: "ode.step-02.factoring-inputs",
				label: "Step 2 · Factoring Inputs",
				step: 2,
				subStep: "factoring_inputs",
				kind: "interactive",
			});
		}

		if (this.problem.params.order === 2) {
			states.push(
				{
					id: "ode.step-02.quadratic-classification",
					label: "Step 2 · Quadratic Classification",
					step: 2,
					subStep: "quad_classification",
					kind: "interactive",
				},
				{
					id: "ode.step-02.remedial-discriminant",
					label: "Step 2 · Discriminant Remediation",
					step: 2,
					subStep: "remedial_discriminant",
					kind: "diagnostic",
				},
				{
					id: "ode.step-02.quadratic-roots",
					label: "Step 2 · Quadratic Root Inputs",
					step: 2,
					subStep: "quad_root_inputs",
					kind: "interactive",
				},
			);
		}

		states.push(
			{
				id: "ode.step-03.homogeneous-form",
				label: "Step 3 · Homogeneous Form",
				step: 3,
				kind: "interactive",
			},
			{
				id: "ode.step-04.particular-ansatz",
				label: "Step 4 · Particular Ansatz",
				step: 4,
				kind: "interactive",
			},
			{
				id: "ode.step-05.first-derivative",
				label: "Step 5A-1 · First Derivative",
				step: 5,
				subStep: "first_deriv",
				kind: "interactive",
			},
		);
		if (this.problem.params.order === 2) {
			states.push({
				id: "ode.step-05.second-derivative",
				label: "Step 5A-2 · Second Derivative",
				step: 5,
				subStep: "second_deriv",
				kind: "interactive",
			});
		}

		if (this.problem.forcing.type === "sinusoid") {
			states.push({
				id: "ode.step-05.system-setup",
				label: "Step 5B · Harmonic System Setup",
				step: 5,
				subStep: "system_setup",
				kind: "interactive",
			});
		}

		states.push(
			{
				id: "ode.step-05.solve-coefficients",
				label: "Step 5 · Solve Coefficients",
				step: 5,
				subStep: "solve",
				kind: "interactive",
			},
			{
				id: "ode.step-05.solve-coefficients.hints",
				label: "Step 5 · Solve Coefficients · All Hints",
				step: 5,
				subStep: "solve",
				kind: "hint",
			},
		);

		if (this.problem.params.order === 1) {
			states.push(
				{
					id: "ode.step-06.target-values",
					label: "Step 6 · Initial Condition & Constant",
					step: 6,
					subStep: "target_values",
					kind: "interactive",
				},
				{
					id: "ode.step-06.target-values.misconception",
					label: "Step 6 · Particular-Offset Misconception",
					step: 6,
					subStep: "target_values",
					kind: "diagnostic",
				},
			);
		} else {
			states.push(
				{
					id: "ode.step-06.target-values",
					label: "Step 6A · Target Initial Values",
					step: 6,
					subStep: "target_values",
					kind: "interactive",
				},
				{
					id: "ode.step-06.target-values.misconception",
					label: "Step 6A · Particular-Offset Misconception",
					step: 6,
					subStep: "target_values",
					kind: "diagnostic",
				},
				{
					id: "ode.step-06.integration-constants",
					label: "Step 6B · Integration Constants",
					step: 6,
					subStep: "solve_constants",
					kind: "interactive",
				},
				{
					id: "ode.step-06.integration-constants.hints",
					label: "Step 6B · Integration Constants · All Hints",
					step: 6,
					subStep: "solve_constants",
					kind: "hint",
				},
			);
		}

		states.push(
			{
				id: "ode.step-07.zero-input-state",
				label: "Step 7A · Zero-Input and Zero-State",
				step: 7,
				subStep: "zi_zs",
				kind: "interactive",
			},
			{
				id: "ode.step-07.transient-steady-state",
				label: "Step 7B · Transient and Steady-State",
				step: 7,
				subStep: "tr_ss",
				kind: "interactive",
			},
			{
				id: "ode.step-07.concept",
				label: "Step 7C · Conceptual Mastery",
				step: 7,
				subStep: "concept",
				kind: "interactive",
			},
		);

		return states;
	}

	/** Advances through complete parent steps using the same validation path as the UI. */
	private devPrepareParentStep(targetStep: number): boolean {
		this.reset();
		let guard = 0;
		while (this.currentStep < targetStep && guard < this.totalSteps) {
			const before = this.currentStep;
			this.devAutoFillStep(before);
			if (this.currentStep === before) return false;
			guard += 1;
		}
		return this.currentStep === targetStep;
	}

	/** Selects the correct derivative choices needed to reveal a Step 5 sub-step. */
	private devPrepareStep5SubStep(target: OdeStep5SubStepId): boolean {
		if (!this.devPrepareParentStep(5)) return false;
		if (target === "first_deriv") return true;

		const first = this.problem.itsData.step5.firstDerivativeOptions?.find(
			(option) => option.isCorrect,
		);
		if (!first) return false;
		this.checkStep5FirstDeriv(first);
		if (target === "second_deriv") {
			return this.problem.params.order === 2;
		}

		if (this.problem.params.order === 2) {
			const second =
				this.problem.itsData.step5.secondDerivativeOptions?.find(
					(option) => option.isCorrect,
				);
			if (!second) return false;
			this.checkStep5SecondDeriv(second);
		}
		if (target === "system_setup") {
			return this.problem.forcing.type === "sinusoid";
		}

		if (this.problem.forcing.type === "sinusoid") {
			const system = this.problem.itsData.step5.systemOptions?.find(
				(option) => option.isCorrect,
			);
			if (!system) return false;
			this.checkStep5System(system);
		}
		return this.step5.activeSubStepId === "solve";
	}

	/** Resets and prepares one named ODE visual state deterministically. */
	override devGoToVisualState(stateId: string): boolean {
		if (!import.meta.env.DEV) return false;
		if (!this.devGetVisualStates().some((state) => state.id === stateId)) {
			return false;
		}

		switch (stateId) {
			case "ode.step-01.characteristic-equation":
				return this.devPrepareParentStep(1);
			case "ode.step-02.strategy-gate":
				return this.devPrepareParentStep(2);
			case "ode.step-02.factoring-inputs":
				if (!this.devPrepareParentStep(2)) return false;
				this.selectStep2Strategy("factoring");
				return this.step2.activeSubStepId === "factoring_inputs";
			case "ode.step-02.quadratic-classification":
				if (!this.devPrepareParentStep(2)) return false;
				this.selectStep2Strategy("quadratic");
				return this.step2.activeSubStepId === "quad_classification";
			case "ode.step-02.remedial-discriminant": {
				if (!this.devPrepareParentStep(2)) return false;
				this.selectStep2Strategy("quadratic");
				if (this.problem.params.order === 2) {
					const wrongChoice: SecondOrderRootType =
						this.problem.params.rootType === "distinct_real"
							? "repeated_real"
							: "distinct_real";
					this.checkStep2QuadClass(wrongChoice);
				}
				return this.step2.activeSubStepId === "remedial_discriminant";
			}
			case "ode.step-02.quadratic-roots":
				if (!this.devPrepareParentStep(2)) return false;
				this.selectStep2Strategy("quadratic");
				if (this.problem.params.order === 2) {
					this.checkStep2QuadClass(this.problem.params.rootType);
				}
				return this.step2.activeSubStepId === "quad_root_inputs";
			case "ode.step-03.homogeneous-form":
				return this.devPrepareParentStep(3);
			case "ode.step-04.particular-ansatz":
				return this.devPrepareParentStep(4);
			case "ode.step-05.first-derivative":
				return this.devPrepareStep5SubStep("first_deriv");
			case "ode.step-05.second-derivative":
				return this.devPrepareStep5SubStep("second_deriv");
			case "ode.step-05.system-setup":
				return this.devPrepareStep5SubStep("system_setup");
			case "ode.step-05.solve-coefficients":
				return this.devPrepareStep5SubStep("solve");
			case "ode.step-05.solve-coefficients.hints":
				if (!this.devPrepareStep5SubStep("solve")) return false;
				this.devRevealAllHints();
				return true;
			case "ode.step-06.target-values":
				return this.devPrepareParentStep(6);
			case "ode.step-06.target-values.misconception":
				if (!this.devPrepareParentStep(6)) return false;
				this.step6.yh0 = String(this.problem.initialConditions.y0);
				this.step6.dyh0 = String(this.problem.initialConditions.dy0);
				this.checkStep6TargetValues();
				if (this.currentFeedbackType !== "misconception") {
					this.setSubStepMisconception(
						this.step6,
						"target_values",
						"Initial conditions apply to the total response. Subtract the particular-solution offsets before solving for the homogeneous constants.",
					);
				}
				return true;
			case "ode.step-06.integration-constants":
				if (!this.devPrepareParentStep(6)) return false;
				this.step6.yh0 = toFractionLatex(
					this.problem.itsData.step6.targetYh0,
				);
				this.step6.dyh0 = toFractionLatex(
					this.problem.itsData.step6.targetDYh0 ?? 0,
				);
				this.checkStep6TargetValues();
				return this.step6.activeSubStepId === "solve_constants";
			case "ode.step-07.zero-input-state":
				return this.devPrepareParentStep(7);
			case "ode.step-07.transient-steady-state":
				if (!this.devPrepareParentStep(7)) return false;
				this.step7.ziC1 = toFractionLatex(
					this.problem.itsData.step7.ziConstants.C1,
				);
				this.step7.ziC2 = toFractionLatex(
					this.problem.itsData.step7.ziConstants.C2 ?? 0,
				);
				this.checkStep7ZI();
				return this.step7.activeSubStepId === "tr_ss";
			case "ode.step-07.concept": {
				if (
					!this.devGoToVisualState(
						"ode.step-07.transient-steady-state",
					)
				) {
					return false;
				}
				const transient =
					this.problem.itsData.step7.transientOptions.find(
						(option) => option.isCorrect,
					);
				const steady =
					this.problem.itsData.step7.steadyStateOptions.find(
						(option) => option.isCorrect,
					);
				if (!transient || !steady) return false;
				this.step7.selectedTransient = transient.id;
				this.step7.selectedSteadyState = steady.id;
				this.checkStep7TrSS();
				return this.step7.activeSubStepId === "concept";
			}
			default:
				return false;
		}
	}

	/**
	 * Developer / Test mode method: Automatically fills and validates an ODE step.
	 *
	 * @param {number} [stepIndex] - Target 1-based step index (defaults to currentStep).
	 */
	override devAutoFillStep(stepIndex?: number): void {
		if (!import.meta.env.DEV) return;
		const target = stepIndex ?? this.currentStep;
		switch (target) {
			case 1: {
				this.step1.a2 = String(
					this.problem.params.order === 1
						? 0
						: (this.problem.params.a2 ?? 1),
				);
				this.step1.a1 = String(this.problem.params.a1);
				this.step1.a0 = String(this.problem.params.a0);
				this.checkStep1();
				break;
			}
			case 2: {
				const s2 = this.problem.itsData.step2;
				if (this.problem.params.order === 1) {
					this.step2.strategy = "factoring";
					this.step2.activeSubStepId = "factoring_inputs";
					this.step2.r1 = toFractionLatex(s2.r1);
					this.checkStep2Factoring();
				} else if (this.problem.params.rootType === "distinct_real") {
					const s2Quad = s2 as SecondOrderOdeItsStep2;
					this.step2.strategy = "quadratic";
					this.step2.activeSubStepId = "quad_classification";
					this.checkStep2QuadClass("distinct_real");
					this.step2.r1 = toFractionLatex(s2Quad.r1);
					this.step2.r2 = toFractionLatex(s2Quad.r2);
					this.checkStep2QuadRoots();
				} else if (this.problem.params.rootType === "repeated_real") {
					const s2Quad = s2 as SecondOrderOdeItsStep2;
					this.step2.strategy = "quadratic";
					this.step2.activeSubStepId = "quad_classification";
					this.checkStep2QuadClass("repeated_real");
					this.step2.r1 = toFractionLatex(s2Quad.r1);
					this.checkStep2QuadRoots();
				} else if (
					this.problem.params.rootType === "complex_conjugate"
				) {
					const s2Quad = s2 as SecondOrderOdeItsStep2;
					this.step2.strategy = "quadratic";
					this.step2.activeSubStepId = "quad_classification";
					this.checkStep2QuadClass("complex_conjugate");
					this.step2.sigma = toFractionLatex(s2Quad.r1);
					this.step2.omegaD = toFractionLatex(s2Quad.im ?? 0);
					this.checkStep2QuadRoots();
				} else {
					this.advanceToStep(3);
				}
				break;
			}
			case 3: {
				this.checkStep3(this.problem.params.rootType);
				break;
			}
			case 4: {
				const correctAnsatz = this.problem.itsData.step4.options.find(
					(o) => o.isCorrect,
				);
				if (correctAnsatz) {
					this.checkStep4(correctAnsatz);
				} else {
					this.advanceToStep(5);
				}
				break;
			}
			case 5: {
				const s5 = this.problem.itsData.step5;
				const isSinusoid = this.problem.forcing.type === "sinusoid";
				if (isSinusoid) {
					const d1 = s5.firstDerivativeOptions?.find(
						(o) => o.isCorrect,
					);
					if (d1) this.checkStep5FirstDeriv(d1);
					if (this.problem.params.order >= 2) {
						const d2 = s5.secondDerivativeOptions?.find(
							(o) => o.isCorrect,
						);
						if (d2) this.checkStep5SecondDeriv(d2);
					}
					const sys = s5.systemOptions?.find((o) => o.isCorrect);
					if (sys) this.checkStep5System(sys);
					this.step5.a = toFractionLatex(s5.expectedA ?? 0);
					this.step5.b = toFractionLatex(s5.expectedB ?? 0);
					this.checkStep5Coeffs();
				} else {
					const d1 = s5.firstDerivativeOptions?.find(
						(o) => o.isCorrect,
					);
					if (d1) this.checkStep5FirstDeriv(d1);
					if (this.problem.params.order >= 2) {
						const d2 = s5.secondDerivativeOptions?.find(
							(o) => o.isCorrect,
						);
						if (d2) this.checkStep5SecondDeriv(d2);
					}
					const sys = s5.systemOptions?.find((o) => o.isCorrect);
					if (sys) this.checkStep5System(sys);
					this.step5.kp = toFractionLatex(s5.expectedKp ?? 0);
					this.checkStep5Coeffs();
				}
				break;
			}
			case 6: {
				this.step6.yh0 = toFractionLatex(
					this.problem.itsData.step6.targetYh0,
				);
				if (this.problem.params.order === 1) {
					this.checkStep6TargetValues();
				} else {
					this.step6.dyh0 = toFractionLatex(
						this.problem.itsData.step6.targetDYh0 ?? 0,
					);
					this.checkStep6TargetValues();
					this.step6.c1 = toFractionLatex(
						this.problem.itsData.step6.expectedC1,
					);
					this.step6.c2 = toFractionLatex(
						this.problem.itsData.step6.expectedC2 ?? 0,
					);
					this.checkStep6Constants();
				}
				break;
			}
			case 7: {
				this.step7.ziC1 = toFractionLatex(
					this.problem.itsData.step7.ziConstants.C1,
				);
				this.step7.ziC2 = toFractionLatex(
					this.problem.itsData.step7.ziConstants.C2 ?? 0,
				);
				this.checkStep7ZI();
				const correctTr =
					this.problem.itsData.step7.transientOptions.find(
						(o) => o.isCorrect,
					);
				const correctSS =
					this.problem.itsData.step7.steadyStateOptions.find(
						(o) => o.isCorrect,
					);
				if (correctTr) this.step7.selectedTransient = correctTr.id;
				if (correctSS) this.step7.selectedSteadyState = correctSS.id;
				this.checkStep7TrSS();
				const correctConcept =
					this.problem.itsData.step7.conceptQuestion.options.find(
						(o) => o.isCorrect,
					);
				if (correctConcept) this.checkStep7Concept(correctConcept);
				break;
			}
			default:
				break;
		}
	}
}
