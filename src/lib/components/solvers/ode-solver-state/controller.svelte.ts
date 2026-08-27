/**
 * Reactive Step-by-Step ODE Solver Controller Class.
 * Manages reactive step state transitions, pedagogical distractor feedback,
 * answer validations, hints, and error diagnostics for 1st- and 2nd-order ODEs.
 */

import type {
	OdeItsOption,
	OdeProblem,
	OdeRootType,
	SecondOrderOdeItsStep2,
	SecondOrderRootType,
} from "$lib/math-engine/odes/index";
import {
	BaseStepSolverState,
	type BaseStepState,
	createMultiPartStepState,
	createStepState,
	createSubStepState,
	type MultiPartStepState,
	type SolverVisualStateDescriptor,
	type SubStepProgress,
} from "../base-step-solver.svelte";
import {
	odeDevAutoFillStep,
	odeDevGetVisualStates,
	odeDevGoToVisualState,
} from "./dev-helpers";
import {
	derivePreviewCharEq,
	derivePreviewComplexRoots,
	derivePreviewQuadSetup,
	derivePreviewZI,
	derivePreviewZS,
	deriveZSC1,
	deriveZSC2,
} from "./ode-previews";
import type {
	OdeStep1State,
	OdeStep2State,
	OdeStep2SubStepId,
	OdeStep3State,
	OdeStep4State,
	OdeStep5State,
	OdeStep5SubStepId,
	OdeStep6State,
	OdeStep6SubStepId,
	OdeStep7State,
} from "./ode-step-types";
import {
	validateDiscriminantInput,
	validateFactoringRoots,
	validateQuadClassChoice,
	validateQuadRoots,
	validateStep1CharEq,
} from "./step2-roots-validation";
import { validateStep5Coefficients } from "./step5-coefficients-validation";
import {
	validateStep6Constants,
	validateStep6TargetValues,
} from "./step6-initial-conditions-validation";
import {
	validateStep7Concept,
	validateStep7TransientSteadyState,
	validateStep7ZIConstants,
} from "./step7-decomposition-validation";

export type {
	OdeStep1State,
	OdeStep2State,
	OdeStep2SubStepId,
	OdeStep3State,
	OdeStep4State,
	OdeStep5State,
	OdeStep5SubStepId,
	OdeStep6State,
	OdeStep6SubStepId,
	OdeStep7State,
};

/**
 * Reactive Step-by-Step ODE Solver Controller Class.
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
		return derivePreviewCharEq(this.step1, this.problem.params.order);
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
		const result = validateStep1CharEq(this.step1, this.problem);
		if (result.kind === "pass") {
			this.setPassed(this.step1, 2);
		} else if (result.kind === "misconception") {
			this.setMisconception(this.step1, result.message);
		} else if (result.kind === "validation") {
			this.setValidation(this.step1, result.message);
		} else {
			this.setIncorrect(this.step1, result.message);
		}
	}

	/**
	 * Formatted LaTeX preview string of the substituted quadratic formula.
	 */
	previewQuadSetup = $derived.by((): string => {
		return derivePreviewQuadSetup(
			this.problem.params.a2,
			this.problem.params.a1,
			this.problem.params.a0,
		);
	});

	/**
	 * Live rendered preview equation for Step 2 complex roots.
	 */
	previewComplexRoots = $derived.by((): string => {
		return derivePreviewComplexRoots(
			this.step2.sigma,
			this.step2.omegaD,
		);
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
		const result = validateFactoringRoots(this.step2, this.problem);
		if (result.kind === "pass") {
			this.setSubStepPassed(
				this.step2,
				"factoring_inputs",
				undefined,
				3,
			);
		} else if (result.kind === "validation") {
			this.setSubStepValidation(
				this.step2,
				"factoring_inputs",
				result.message,
			);
		} else if (result.kind === "misconception") {
			this.setMisconception(this.step2, result.message);
		} else {
			this.setIncorrect(this.step2, result.message);
		}
	}

	/**
	 * Validates Step 2 Quadratic Formula classification choice.
	 * @param {SecondOrderRootType} choice Selected root classification
	 */
	checkStep2QuadClass(choice: SecondOrderRootType): void {
		const res = validateQuadClassChoice(choice, this.problem);
		if (res.kind === "pass") {
			this.step2.quadClassChoice = choice;
			this.step2.quadNeedsDiscriminantCalc = false;
			this.setSubStepPassed(
				this.step2,
				"quad_classification",
				"quad_root_inputs",
			);
		} else if (res.kind === "first_order_guard") {
			this.setSubStepValidation(
				this.step2,
				"factoring_inputs",
				res.message,
			);
		} else {
			this.step2.quadClassChoice = null;
			this.step2.quadNeedsDiscriminantCalc = true;
			this.setSubStepMisconception(
				this.step2,
				"quad_classification",
				res.message,
			);
			this.step2.activeSubStepId = "remedial_discriminant";
		}
	}

	/**
	 * Validates Step 2 Remedial Discriminant Calculation.
	 */
	checkStep2Discriminant(): void {
		const res = validateDiscriminantInput(
			this.step2.quadDiscriminantInput,
			this.problem,
		);
		if (res.kind === "pass") {
			const s2Data = this.problem.itsData.step2 as SecondOrderOdeItsStep2;
			this.step2.quadDiscriminantVerified = true;
			this.step2.quadNeedsDiscriminantCalc = false;
			this.step2.quadClassChoice = s2Data.rootType;
			this.setSubStepPassed(
				this.step2,
				"remedial_discriminant",
				"quad_root_inputs",
			);
		} else if (res.kind === "validation") {
			this.setSubStepValidation(
				this.step2,
				"remedial_discriminant",
				res.message,
			);
		} else {
			this.setSubStepIncorrect(
				this.step2,
				"remedial_discriminant",
				res.message,
			);
		}
	}

	/**
	 * Validates Step 2 Quadratic Formula root calculations.
	 */
	checkStep2QuadRoots(): void {
		const res = validateQuadRoots(this.step2, this.problem);
		if (res.kind === "pass") {
			this.setSubStepPassed(
				this.step2,
				"quad_root_inputs",
				undefined,
				3,
			);
		} else if (res.kind === "validation") {
			this.setSubStepValidation(
				this.step2,
				"quad_root_inputs",
				res.message,
			);
		} else if (res.kind === "misconception") {
			this.setSubStepMisconception(
				this.step2,
				"quad_root_inputs",
				res.message,
			);
		} else {
			this.setSubStepIncorrect(
				this.step2,
				"quad_root_inputs",
				res.message,
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
		const res = validateStep5Coefficients(this.step5, this.problem);
		if (res.kind === "pass") {
			this.setSubStepPassed(this.step5, "solve", undefined, 6);
		} else if (res.kind === "validation") {
			this.setSubStepValidation(this.step5, "solve", res.message);
		} else {
			this.setSubStepIncorrect(this.step5, "solve", res.message);
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
		const isFirstOrder = this.problem.params.order === 1;
		const res = validateStep6TargetValues(this.step6, this.problem);
		if (res.kind === "pass") {
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
		} else if (res.kind === "validation") {
			this.setSubStepValidation(
				this.step6,
				"target_values",
				res.message,
			);
		} else if (res.kind === "misconception") {
			this.setSubStepMisconception(
				this.step6,
				"target_values",
				res.message,
			);
		} else {
			this.setSubStepIncorrect(
				this.step6,
				"target_values",
				res.message,
			);
		}
	}

	/**
	 * Validates Step 6 Part 6B (Integration Constants).
	 */
	checkStep6Constants(): void {
		const res = validateStep6Constants(this.step6, this.problem);
		if (res.kind === "pass") {
			this.setSubStepPassed(this.step6, "solve_constants", undefined, 7);
		} else if (res.kind === "validation") {
			this.setSubStepValidation(
				this.step6,
				"solve_constants",
				res.message,
			);
		} else {
			this.setSubStepIncorrect(
				this.step6,
				"solve_constants",
				res.message,
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
		return derivePreviewZI(this.step7, this.problem.params);
	});

	/**
	 * Derived Zero-State Constant C1 from superposition: C_{1,ZS} = C_1 - C_{1,ZI}.
	 */
	derivedZSC1 = $derived.by((): string => {
		return deriveZSC1(
			this.step7.ziC1,
			this.problem.itsData.step6.expectedC1,
		);
	});

	/**
	 * Derived Zero-State Constant C2 from superposition: C_{2,ZS} = C_2 - C_{2,ZI}.
	 */
	derivedZSC2 = $derived.by((): string => {
		return deriveZSC2(
			this.step7.ziC2,
			this.problem.itsData.step6.expectedC2,
		);
	});

	/**
	 * Formatted LaTeX preview string of the Zero-State response y_{ZS}(t).
	 */
	previewZS = $derived.by((): string => {
		return derivePreviewZS(
			this.derivedZSC1,
			this.derivedZSC2,
			this.problem.params,
			this.problem.solutions.y_p_latex,
		);
	});

	/**
	 * Validates Step 7 Part 7A: Zero-Input (y_{ZI}) and Zero-State (y_{ZS}) decomposition constants.
	 */
	checkStep7ZI(): void {
		const res = validateStep7ZIConstants(this.step7, this.problem);
		if (res.kind === "pass") {
			this.step7.ziZsPassed = true;
			this.setSubStepPassed(this.step7, "zi_zs", "tr_ss");
		} else if (res.kind === "validation") {
			this.setSubStepValidation(
				this.step7,
				"zi_zs",
				res.message,
			);
		} else if (res.kind === "misconception") {
			this.setSubStepMisconception(
				this.step7,
				"zi_zs",
				res.message,
			);
		} else {
			this.setSubStepIncorrect(
				this.step7,
				"zi_zs",
				res.message,
			);
		}
	}

	/**
	 * Validates Step 7 Part 7B: Transient and Steady-State response selection.
	 */
	checkStep7TrSS(): void {
		const res = validateStep7TransientSteadyState(
			this.step7,
			this.problem,
		);
		if (res.kind === "pass") {
			this.step7.trSsPassed = true;
			this.setSubStepPassed(this.step7, "tr_ss", "concept");
		} else if (res.kind === "validation") {
			this.setSubStepValidation(
				this.step7,
				"tr_ss",
				res.message,
			);
		} else {
			this.setSubStepMisconception(
				this.step7,
				"tr_ss",
				res.message,
			);
		}
	}

	/**
	 * Validates Step 7 Part 7C: Conceptual Mastery question.
	 * @param {OdeItsOption} [opt] Optional selected concept option
	 */
	checkStep7Concept(opt?: OdeItsOption): void {
		const res = validateStep7Concept(this.step7, this.problem, opt);
		if (res.kind === "pass") {
			this.step7.conceptPassed = true;
			this.setSubStepPassed(this.step7, "concept", undefined, 8);
		} else if (res.kind === "validation") {
			this.setSubStepValidation(
				this.step7,
				"concept",
				res.message,
			);
		} else {
			this.setSubStepMisconception(
				this.step7,
				"concept",
				res.message,
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
		const isFactorable =
			this.problem.params.order === 1 ||
			("isFactorable" in this.problem.itsData.step2 &&
				this.problem.itsData.step2.isFactorable &&
				this.problem.params.rootType !== "complex_conjugate");

		const s2Order: OdeStep2SubStepId[] = [];
		if (this.problem.params.order === 2) {
			s2Order.push("strategy_gate");
		}
		if (isFactorable) {
			s2Order.push("factoring_inputs");
		}
		if (this.problem.params.order === 2) {
			s2Order.push(
				"quad_classification",
				"remedial_discriminant",
				"quad_root_inputs",
			);
		}

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
			s2Order,
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
			s2Order[0] ?? "strategy_gate",
		);
		// A first-order characteristic equation is linear, so there is no
		// quadratic-strategy decision to make. Open the single-root input directly.
		if (this.problem.params.order === 1) {
			this.selectStep2Strategy("factoring");
		}
		this.step3 = createStepState({ selected: null as OdeRootType | null });
		this.step4 = createStepState({ selected: null as string | null });
		const s5Order: OdeStep5SubStepId[] = ["first_deriv"];
		if (this.problem.params.order === 2) {
			s5Order.push("second_deriv");
		}
		if (this.problem.forcing.type === "sinusoid") {
			s5Order.push("system_setup");
		}
		s5Order.push("solve");

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
			s5Order,
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

		const s6Order: OdeStep6SubStepId[] =
			this.problem.params.order === 1
				? ["target_values"]
				: ["target_values", "solve_constants"];

		this.step6 = createMultiPartStepState(
			{
				yh0: "",
				dyh0: "",
				c1: "",
				c2: "",
			},
			s6Order,
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
	 * Named visual states supported by the active ODE archetype.
	 */
	override devGetVisualStates(): SolverVisualStateDescriptor[] {
		return odeDevGetVisualStates(this.problem);
	}

	/**
	 * Resets and prepares one named ODE visual state deterministically.
	 * @param {string} stateId Target visual state ID
	 * @returns {boolean} Navigation success status
	 */
	override devGoToVisualState(stateId: string): boolean {
		return odeDevGoToVisualState(this, stateId);
	}

	/**
	 * Automatically fills and validates an ODE step.
	 * @param {number} [stepIndex] Target 1-based step index
	 */
	override devAutoFillStep(stepIndex?: number): void {
		odeDevAutoFillStep(this, stepIndex);
	}
}
