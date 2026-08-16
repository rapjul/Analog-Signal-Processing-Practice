import { parseNumericInput, toFractionLatex } from "$lib/math-engine/fraction";
import type { OdeItsOption, OdeProblem, RootType } from "$lib/math-engine/odes";
import {
	BaseStepSolverState,
	type BaseStepState,
	createStepState,
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
 * Step 2 State: Characteristic Roots & Quadratic Setup Inputs.
 */
export interface OdeStep2State extends BaseStepState {
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
	quadClassChoice: RootType | null;
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
	selected: RootType | null;
}

/**
 * Step 4 State: Particular Solution Ansatz Card Selection.
 */
export interface OdeStep4State extends BaseStepState {
	/** Selected option identifier */
	selected: string | null;
}

/**
 * Step 5 State: Undetermined Particular Coefficients.
 */
export interface OdeStep5State extends BaseStepState {
	/** Solved Kp for constant/exponential forcing */
	kp: string;
	/** Solved A for sinusoidal forcing */
	a: string;
	/** Solved B for sinusoidal forcing */
	b: string;
}

/**
 * Step 6 State: Initial Conditions Constants C1, C2.
 */
export interface OdeStep6State extends BaseStepState {
	/** Constant C1 input string */
	c1: string;
	/** Constant C2 input string */
	c2: string;
}

/**
 * Step 7 State: Response Decomposition & Conceptual Mastery.
 */
export interface OdeStep7State extends BaseStepState {
	/** Sub-phase within Step 7: 'zi_zs' -> 'tr_ss' -> 'concept' -> 'done' */
	subStep: "zi_zs" | "tr_ss" | "concept" | "done";
	/** Zero-input C1 constant input */
	ziC1: string;
	/** Zero-input C2 constant input */
	ziC2: string;
	/** Selected option for transient response */
	selectedTransient: string | null;
	/** Selected option for steady-state response */
	selectedSteadyState: string | null;
	/** Selected option ID for conceptual mastery question */
	selectedConcept: string | null;
	/** Whether ZI/ZS phase passed */
	ziZsPassed: boolean;
	/** Whether Transient/Steady-State phase passed */
	trSsPassed: boolean;
	/** Whether conceptual question passed */
	conceptPassed: boolean;
}

/**
 * Reactive State and Controller for the 7-Step ODE ITS Solver.
 */
export class OdeStepSolverState extends BaseStepSolverState {
	/** Getter closure returning active ODE problem */
	private readonly getProblem: () => OdeProblem;

	/** Active ODE problem definition */
	get problem(): OdeProblem {
		return this.getProblem();
	}

	/** Step 1 State: Characteristic Equation */
	step1: OdeStep1State = $state<OdeStep1State>(
		createStepState({ a2: "", a1: "", a0: "" }),
	);

	/** Step 2 State: Characteristic Roots & Strategy */
	step2: OdeStep2State = $state<OdeStep2State>(
		createStepState({
			strategy: null as "factoring" | "quadratic" | null,
			r1: "",
			r2: "",
			sigma: "",
			omegaD: "",
			quadClassChoice: null as RootType | null,
			quadDiscriminantInput: "",
			quadNeedsDiscriminantCalc: false,
			quadDiscriminantVerified: false,
		}),
	);

	/** Step 3 State: Homogeneous Form Template */
	step3: OdeStep3State = $state<OdeStep3State>(
		createStepState({ selected: null as RootType | null }),
	);

	/** Step 4 State: Particular Solution Ansatz */
	step4: OdeStep4State = $state<OdeStep4State>(
		createStepState({ selected: null as string | null }),
	);

	/** Step 5 State: Undetermined Particular Coefficients */
	step5: OdeStep5State = $state<OdeStep5State>(
		createStepState({ kp: "", a: "", b: "" }),
	);

	/** Step 6 State: Initial Conditions Constants */
	step6: OdeStep6State = $state<OdeStep6State>(
		createStepState({ c1: "", c2: "" }),
	);

	/** Step 7 State: Response Decomposition & Conceptual Mastery */
	step7: OdeStep7State = $state<OdeStep7State>(
		createStepState({
			subStep: "zi_zs" as "zi_zs" | "tr_ss" | "concept" | "done",
			ziC1: "",
			ziC2: "",
			selectedTransient: null as string | null,
			selectedSteadyState: null as string | null,
			selectedConcept: null as string | null,
			ziZsPassed: false,
			trSsPassed: false,
			conceptPassed: false,
		}),
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

		return `${term2} ${term1} ${term0} = 0`;
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
	 * Progressive hints for the currently active step.
	 */
	activeHints = $derived.by((): string[] => {
		switch (this.currentStep) {
			case 1:
				return this.problem.itsData.step1.hints;
			case 2:
				return this.problem.itsData.step2.hints;
			case 3:
				return this.problem.itsData.step3.hints;
			case 4:
				return this.problem.itsData.step4.hints;
			case 5:
				return this.problem.itsData.step5.hints;
			case 6:
				return this.problem.itsData.step6.hints;
			case 7:
				return this.problem.itsData.step7.hints;
			default:
				return [];
		}
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
		const vA2 = parseNumericInput(this.step1.a2);
		const vA1 = parseNumericInput(this.step1.a1);
		const vA0 = parseNumericInput(this.step1.a0);

		if (Number.isNaN(vA2) || Number.isNaN(vA1) || Number.isNaN(vA0)) {
			this.setValidation(
				this.step1,
				"Please enter numeric values for all three coefficients: $a_2$, $a_1$, and $a_0$.",
			);
			return;
		}

		// Misconception check: student entered RHS forcing amplitude for a0
		if (
			Math.abs(vA0 - this.problem.forcing.K) < 0.05 &&
			Math.abs(vA0 - s1Data.expectedA0) >= 0.05
		) {
			this.setMisconception(
				this.step1,
				s1Data.misconceptions.forcing_rhs,
			);
			return;
		}

		if (
			Math.abs(vA2 - s1Data.expectedA2) < 0.05 &&
			Math.abs(vA1 - s1Data.expectedA1) < 0.05 &&
			Math.abs(vA0 - s1Data.expectedA0) < 0.05
		) {
			this.setPassed(this.step1, 2);
		} else {
			this.setIncorrect(
				this.step1,
				"Incorrect coefficients. Substitute $\\frac{d^2 y}{dt^2} \\to s^2$, $\\frac{dy}{dt} \\to s$, and $y(t) \\to 1$, setting the homogeneous right-hand side to $0$.",
			);
		}
	}

	/**
	 * Formatted LaTeX preview string of the substituted quadratic formula.
	 */
	previewQuadSetup = $derived.by((): string => {
		const b = this.problem.params.a1;
		const a = 1;
		const c = this.problem.params.a0;
		return String.raw`s = \frac{-(${b}) \pm \sqrt{(${b})^2 - 4(${a})(${c})}}{2(${a})}`;
	});

	/**
	 * Formatted LaTeX preview string of complex roots (sigma +/- j omega_d).
	 */
	previewComplexRoots = $derived.by((): string => {
		const sig =
			this.step2.sigma.trim() !== ""
				? this.step2.sigma.trim()
				: "\\sigma";
		const om =
			this.step2.omegaD.trim() !== ""
				? this.step2.omegaD.trim()
				: "\\omega_d";
		return String.raw`s = ${sig} \pm j ${om}`;
	});

	/**
	 * Handles user selection of root classification in the Quadratic Formula path.
	 * If the choice is correct, reveals root inputs.
	 * If incorrect, locks classification buttons and requires calculating Delta = b^2 - 4ac.
	 * @param {RootType} choice Selected root classification
	 */
	selectQuadRootClassification(choice: RootType): void {
		const s2Data = this.problem.itsData.step2;
		if (choice === s2Data.rootType) {
			this.step2.quadClassChoice = choice;
			this.step2.quadNeedsDiscriminantCalc = false;
			this.clearFeedback();
		} else {
			this.step2.quadClassChoice = null;
			this.step2.quadNeedsDiscriminantCalc = true;
			this.setIncorrect(
				this.step2,
				"Incorrect root classification. Please calculate the discriminant $\\Delta = b^2 - 4ac$ below to determine the true root structure.",
			);
		}
	}

	/**
	 * Validates the student's numerical discriminant calculation Delta = b^2 - 4ac.
	 */
	verifyDiscriminant(): void {
		const s2Data = this.problem.itsData.step2;
		const userDisc = parseNumericInput(this.step2.quadDiscriminantInput);

		if (Number.isNaN(userDisc)) {
			this.setValidation(
				this.step2,
				"Please enter a numeric value for the discriminant $\\Delta = b^2 - 4ac$.",
			);
			return;
		}

		const expectedDisc = s2Data.discriminant;
		if (Math.abs(userDisc - expectedDisc) < 0.05) {
			this.step2.quadDiscriminantVerified = true;
			this.step2.quadClassChoice = s2Data.rootType;
			this.step2.quadNeedsDiscriminantCalc = false;
			this.clearFeedback();
		} else {
			const a1 = this.problem.params.a1;
			const a0 = this.problem.params.a0;
			this.setIncorrect(
				this.step2,
				`Incorrect discriminant. Evaluate $\\Delta = b^2 - 4ac = (${a1})^2 - 4(1)(${a0})$.`,
			);
		}
	}

	/**
	 * Validates Step 2 (Characteristic Roots & Strategy).
	 */
	checkStep2(): void {
		switch (this.step2.strategy) {
			case "quadratic":
				this.checkStep2Quadratic();
				break;
			case "factoring":
				this.checkStep2Factoring();
				break;
			case null:
				this.setValidation(
					this.step2,
					"Please select a solving strategy first.",
				);
				break;
			default:
				throw new Error(
					`Unhandled ODE solving strategy: ${String(this.step2.strategy)}`,
				);
		}
	}

	/**
	 * Validates Step 2 via Factoring path.
	 */
	checkStep2Factoring(): void {
		const s2Data = this.problem.itsData.step2;

		// Diagnostic check: If student selected factoring for a complex / un-factorable polynomial
		if (!s2Data.isFactorable || s2Data.rootType === "complex_conjugate") {
			const feedback =
				s2Data.misconceptions.unfactorable_complex ??
				s2Data.misconceptions.unfactorable_general ??
				"This polynomial cannot be factored over real integers. Please select the Quadratic Formula.";
			this.setIncorrect(this.step2, feedback);
			return;
		}

		if (s2Data.rootType === "distinct_real") {
			const v1 = parseNumericInput(this.step2.r1);
			const v2 = parseNumericInput(this.step2.r2);

			if (Number.isNaN(v1) || Number.isNaN(v2)) {
				this.setValidation(
					this.step2,
					"Please enter numeric values for both roots: $r_1$ and $r_2$.",
				);
				return;
			}

			const r1 = s2Data.r1;
			const r2 = s2Data.r2 ?? 0;

			const matchDirect =
				Math.abs(v1 - r1) < 0.05 && Math.abs(v2 - r2) < 0.05;
			const matchSwapped =
				Math.abs(v1 - r2) < 0.05 && Math.abs(v2 - r1) < 0.05;

			if (matchDirect || matchSwapped) {
				this.setPassed(this.step2, 3);
			} else if (
				(Math.abs(v1 + r1) < 0.05 && Math.abs(v2 + r2) < 0.05) ||
				(Math.abs(v1 + r2) < 0.05 && Math.abs(v2 + r1) < 0.05)
			) {
				this.setMisconception(
					this.step2,
					"Check your signs. Factoring into $(s + a)(s + b) = 0$ yields roots $r_1 = -a$ and $r_2 = -b$.",
				);
			} else if (
				(Math.abs(v1 + r1) < 0.05 && Math.abs(v2 - r2) < 0.05) ||
				(Math.abs(v1 - r1) < 0.05 && Math.abs(v2 + r2) < 0.05) ||
				(Math.abs(v1 + r2) < 0.05 && Math.abs(v2 - r1) < 0.05) ||
				(Math.abs(v1 - r2) < 0.05 && Math.abs(v2 + r1) < 0.05)
			) {
				this.setMisconception(
					this.step2,
					"Check the sign of your roots. Remember that solving the factor $(s - r) = 0$ yields root $s = r$.",
				);
			} else {
				this.setIncorrect(
					this.step2,
					`Incorrect roots. Factor the characteristic polynomial $${this.problem.itsData.step1.latex}$.`,
				);
			}
		} else if (s2Data.rootType === "repeated_real") {
			const v1 = parseNumericInput(this.step2.r1);

			if (Number.isNaN(v1)) {
				this.setValidation(
					this.step2,
					"Please enter a numeric value for the repeated root $r$.",
				);
				return;
			}

			const r1 = s2Data.r1;

			if (Math.abs(v1 - r1) < 0.05) {
				this.setPassed(this.step2, 3);
			} else if (Math.abs(v1 + r1) < 0.05 && Math.abs(r1) > 0.01) {
				this.setMisconception(
					this.step2,
					"Check your sign. Factoring into $(s + a)^2 = 0$ means solving $s + a = 0 \\implies r = -a$.",
				);
			} else {
				this.setIncorrect(
					this.step2,
					"Incorrect repeated root. Characteristic equation: $(s - r)^2 = 0$.",
				);
			}
		}
	}

	/**
	 * Validates Step 2 via Quadratic Formula Setup path.
	 */
	checkStep2Quadratic(): void {
		const s2Data = this.problem.itsData.step2;

		if (!this.step2.quadClassChoice) {
			this.setValidation(
				this.step2,
				"Please select the root classification or calculate the discriminant $\\Delta$.",
			);
			return;
		}

		switch (this.step2.quadClassChoice) {
			case "complex_conjugate": {
				const userSig = parseNumericInput(this.step2.sigma);
				const userOm = parseNumericInput(this.step2.omegaD);

				if (Number.isNaN(userSig) || Number.isNaN(userOm)) {
					this.setValidation(
						this.step2,
						"Please enter numeric values for both the real part $\\sigma$ and imaginary part $\\omega_d$.",
					);
					return;
				}

				const expectedSig = s2Data.r1;
				const expectedOm = Math.abs(s2Data.im ?? 0);

				if (
					Math.abs(userSig - expectedSig) < 0.05 &&
					Math.abs(Math.abs(userOm) - expectedOm) < 0.05
				) {
					this.setPassed(this.step2, 3);
				} else if (
					Math.abs(userSig + expectedSig) < 0.05 &&
					Math.abs(expectedSig) > 0.01
				) {
					this.setMisconception(
						this.step2,
						"Check the sign of the real part $\\sigma$. In the quadratic formula, the real part is $\\sigma = \\frac{-b}{2a}$.",
					);
				} else {
					this.setIncorrect(
						this.step2,
						`Incorrect complex roots. Real part $\\sigma = \\frac{-b}{2a} = \\frac{${-this.problem.params.a1}}{2}$, imaginary part $\\omega_d = \\frac{\\sqrt{|\\Delta|}}{2a} = \\frac{\\sqrt{${Math.abs(s2Data.discriminant)}}}{2}$.`,
					);
				}
				break;
			}

			case "distinct_real": {
				const v1 = parseNumericInput(this.step2.r1);
				const v2 = parseNumericInput(this.step2.r2);

				if (Number.isNaN(v1) || Number.isNaN(v2)) {
					this.setValidation(
						this.step2,
						"Please enter numeric values for both roots: $r_1$ and $r_2$.",
					);
					return;
				}

				const r1 = s2Data.r1;
				const r2 = s2Data.r2 ?? 0;
				const matchDirect =
					Math.abs(v1 - r1) < 0.05 && Math.abs(v2 - r2) < 0.05;
				const matchSwapped =
					Math.abs(v1 - r2) < 0.05 && Math.abs(v2 - r1) < 0.05;

				if (matchDirect || matchSwapped) {
					this.setPassed(this.step2, 3);
				} else if (
					(Math.abs(v1 + r1) < 0.05 && Math.abs(v2 + r2) < 0.05) ||
					(Math.abs(v1 + r2) < 0.05 && Math.abs(v2 + r1) < 0.05)
				) {
					this.setMisconception(
						this.step2,
						"Check the signs of your roots. In the quadratic formula, the leading numerator term is $-b$.",
					);
				} else if (
					(Math.abs(v1 + r1) < 0.05 && Math.abs(v2 - r2) < 0.05) ||
					(Math.abs(v1 - r1) < 0.05 && Math.abs(v2 + r2) < 0.05) ||
					(Math.abs(v1 + r2) < 0.05 && Math.abs(v2 - r1) < 0.05) ||
					(Math.abs(v1 - r2) < 0.05 && Math.abs(v2 + r1) < 0.05)
				) {
					this.setMisconception(
						this.step2,
						"Check the sign of your roots. Verify that you evaluated $s = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$ with correct signs.",
					);
				} else {
					this.setIncorrect(
						this.step2,
						`Incorrect roots. Evaluate $s = \\frac{-(${this.problem.params.a1}) \\pm \\sqrt{${s2Data.discriminant}}}{2}$.`,
					);
				}
				break;
			}

			case "repeated_real": {
				const v1 = parseNumericInput(this.step2.r1);

				if (Number.isNaN(v1)) {
					this.setValidation(
						this.step2,
						"Please enter a numeric value for the repeated root $r$.",
					);
					return;
				}

				const r1 = s2Data.r1;
				if (Math.abs(v1 - r1) < 0.05) {
					this.setPassed(this.step2, 3);
				} else if (Math.abs(v1 + r1) < 0.05 && Math.abs(r1) > 0.01) {
					this.setMisconception(
						this.step2,
						"Check your sign. For a repeated root with $\\Delta = 0$, $r = \\frac{-b}{2a}$.",
					);
				} else {
					this.setIncorrect(
						this.step2,
						`Incorrect repeated root. With $\\Delta = 0$, $r = \\frac{-b}{2a} = \\frac{${-this.problem.params.a1}}{2}$.`,
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
	 * @param {RootType} template Selected template
	 */
	checkStep3(template: RootType): void {
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
	 * Validates Step 5 (Particular Coefficients).
	 */
	checkStep5(): void {
		const s5Data = this.problem.itsData.step5;
		if (this.problem.forcing.type === "sinusoid") {
			const vA = parseNumericInput(this.step5.a);
			const vB = parseNumericInput(this.step5.b);

			if (Number.isNaN(vA) || Number.isNaN(vB)) {
				this.setValidation(
					this.step5,
					"Please enter numeric values for both coefficients: $A$ and $B$.",
				);
				return;
			}

			const expA = s5Data.expectedA ?? 0;
			const expB = s5Data.expectedB ?? 0;

			if (Math.abs(vA - expA) < 0.05 && Math.abs(vB - expB) < 0.05) {
				this.setPassed(this.step5, 6);
			} else {
				this.setIncorrect(
					this.step5,
					"Incorrect coefficients $A$ and $B$. Substitute $y_p(t)$ into the ODE and equate like cosine and sine terms.",
				);
			}
		} else {
			const vKp = parseNumericInput(this.step5.kp);

			if (Number.isNaN(vKp)) {
				this.setValidation(
					this.step5,
					"Please enter a numeric value for the particular amplitude $K_p$.",
				);
				return;
			}

			const expKp = s5Data.expectedKp ?? 0;

			if (Math.abs(vKp - expKp) < 0.05) {
				this.setPassed(this.step5, 6);
			} else {
				this.setIncorrect(
					this.step5,
					"Incorrect $K_p$ coefficient. Substitute $y_p(t)$ into the ODE and solve for $K_p$.",
				);
			}
		}
	}

	/**
	 * Validates Step 6 (Initial Conditions System & Constants C1, C2).
	 */
	checkStep6(): void {
		const s6Data = this.problem.itsData.step6;
		const vC1 = parseNumericInput(this.step6.c1);
		const vC2 = parseNumericInput(this.step6.c2);

		if (Number.isNaN(vC1) || Number.isNaN(vC2)) {
			this.setValidation(
				this.step6,
				"Please enter numeric values for both constants: $C_1$ and $C_2$.",
			);
			return;
		}

		if (
			Math.abs(vC1 - s6Data.expectedC1) < 0.05 &&
			Math.abs(vC2 - s6Data.expectedC2) < 0.05
		) {
			this.setPassed(this.step6, 7);
		} else {
			this.setIncorrect(
				this.step6,
				"Incorrect constants $C_1$, $C_2$. Remember to account for the velocity offset $y_p'(0^+)$ when setting up $y'(0^+) = y_h'(0^+) + y_p'(0^+)$.",
			);
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
		const rootType = this.problem.params.rootType;
		const roots = this.problem.params.roots;

		switch (rootType) {
			case "distinct_real":
				return `${c1} e^{${roots.r1}t} + ${c2} e^{${roots.r2}t}`;
			case "repeated_real":
				return `(${c1} + ${c2}t) e^{${roots.r1}t}`;
			case "complex_conjugate":
				return `e^{${roots.r1}t} [${c1} \\cos(${roots.im}t) + ${c2} \\sin(${roots.im}t)]`;
			default:
				return `${c1} + ${c2}`;
		}
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
		const zsC2 = totalC2 - vC2;
		return toFractionLatex(zsC2);
	});

	/**
	 * Formatted LaTeX preview string of the Zero-State response y_{ZS}(t).
	 */
	previewZS = $derived.by((): string => {
		const c1 = this.derivedZSC1;
		const c2 = this.derivedZSC2;
		const rootType = this.problem.params.rootType;
		const roots = this.problem.params.roots;
		const yp = this.problem.solutions.y_p_latex;

		let homoPart = "";
		switch (rootType) {
			case "distinct_real":
				homoPart = `${c1} e^{${roots.r1}t} + ${c2} e^{${roots.r2}t}`;
				break;
			case "repeated_real":
				homoPart = `(${c1} + ${c2}t) e^{${roots.r1}t}`;
				break;
			case "complex_conjugate":
				homoPart = `e^{${roots.r1}t} [${c1} \\cos(${roots.im}t) + ${c2} \\sin(${roots.im}t)]`;
				break;
			default:
				homoPart = `${c1} + ${c2}`;
				break;
		}
		return yp === "0" ? homoPart : `${homoPart} + ${yp}`;
	});

	/**
	 * Validates Step 7 Phase 1: Zero-Input (y_{ZI}) and Zero-State (y_{ZS}) decomposition constants.
	 */
	checkStep7ZI(): void {
		const s7Data = this.problem.itsData.step7;
		const vC1 = parseNumericInput(this.step7.ziC1);
		const vC2 = parseNumericInput(this.step7.ziC2);

		if (Number.isNaN(vC1) || Number.isNaN(vC2)) {
			this.setValidation(
				this.step7,
				"Please enter numeric values or fractions for both Zero-Input constants: $C_{1,ZI}$ and $C_{2,ZI}$.",
			);
			return;
		}

		const expC1 = s7Data.ziConstants.C1;
		const expC2 = s7Data.ziConstants.C2;

		if (Math.abs(vC1 - expC1) < 0.05 && Math.abs(vC2 - expC2) < 0.05) {
			this.step7.ziZsPassed = true;
			this.step7.subStep = "tr_ss";
			this.clearFeedback();
		} else if (
			Math.abs(vC1 + expC1) < 0.05 ||
			Math.abs(vC2 + expC2) < 0.05
		) {
			this.setMisconception(
				this.step7,
				"Check the signs of your Zero-Input constants. Remember that $y_{ZI}(t)$ matches initial conditions $y(0^-), y'(0^-)$ with forcing $x(t) = 0$.",
			);
		} else {
			this.setIncorrect(
				this.step7,
				"Incorrect Zero-Input constants. Set up the homogeneous system matching $y_h(0^-) = y(0^-)$ and $y_h'(0^-) = y'(0^-)$ without subtracting $y_p$.",
			);
		}
	}

	/**
	 * Validates Step 7 Phase 2: Transient (y_{tr}) and Steady-State (y_{ss}) decomposition.
	 */
	checkStep7TrSS(): void {
		const s7Data = this.problem.itsData.step7;

		if (!this.step7.selectedTransient || !this.step7.selectedSteadyState) {
			this.setValidation(
				this.step7,
				"Please select options for both the Transient Response $y_{tr}(t)$ and Steady-State Response $y_{ss}(t)$.",
			);
			return;
		}

		const trOption = s7Data.transientOptions.find(
			(o) => o.id === this.step7.selectedTransient,
		);
		const ssOption = s7Data.steadyStateOptions.find(
			(o) => o.id === this.step7.selectedSteadyState,
		);

		if (!trOption?.isCorrect) {
			this.setMisconception(
				this.step7,
				trOption?.feedback ||
					"Incorrect Transient response. The transient response consists of the decaying natural modes $y_h(t)$.",
			);
			return;
		}

		if (!ssOption?.isCorrect) {
			this.setMisconception(
				this.step7,
				ssOption?.feedback ||
					"Incorrect Steady-State response. The steady-state response is the persistent forced response $y_p(t)$.",
			);
			return;
		}

		this.step7.trSsPassed = true;
		this.step7.subStep = "concept";
		this.clearFeedback();
	}

	/**
	 * Validates Step 7 Phase 3: Targeted Conceptual Mastery Question.
	 */
	checkStep7Concept(): void {
		const s7Data = this.problem.itsData.step7;

		if (!this.step7.selectedConcept) {
			this.setValidation(
				this.step7,
				"Please select an answer for the conceptual mastery question.",
			);
			return;
		}

		const option = s7Data.conceptQuestion.options.find(
			(o) => o.id === this.step7.selectedConcept,
		);

		if (option?.isCorrect) {
			this.step7.conceptPassed = true;
			this.step7.subStep = "done";
			this.setPassed(this.step7, 8);
		} else {
			this.setMisconception(
				this.step7,
				option?.feedback ||
					"Incorrect choice. Re-examine how linearity and superposition govern response decomposition.",
			);
		}
	}

	/**
	 * Handles submission from Step 7 Response Decomposition (legacy/shortcut compatible).
	 * @param {string} _value LaTeX formatted student response (unused in multi-phase decomposition)
	 */
	handleStep7Submit(_value?: string): void {
		if (this.step7.conceptPassed) {
			this.setPassed(this.step7, 8);
		} else {
			this.checkStep7Concept();
		}
	}

	/**
	 * Resets all step inputs, feedbacks, and status.
	 */
	reset(): void {
		this.currentStep = 1;
		this.isCompleted = false;
		this.hintTier = 0;

		this.step1 = createStepState({ a2: "", a1: "", a0: "" });
		this.step2 = createStepState({
			strategy: null as "factoring" | "quadratic" | null,
			r1: "",
			r2: "",
			sigma: "",
			omegaD: "",
			quadClassChoice: null as RootType | null,
			quadDiscriminantInput: "",
			quadNeedsDiscriminantCalc: false,
			quadDiscriminantVerified: false,
		});
		this.step3 = createStepState({ selected: null as RootType | null });
		this.step4 = createStepState({ selected: null as string | null });
		this.step5 = createStepState({ kp: "", a: "", b: "" });
		this.step6 = createStepState({ c1: "", c2: "" });
		this.step7 = createStepState({
			subStep: "zi_zs" as "zi_zs" | "tr_ss" | "concept" | "done",
			ziC1: "",
			ziC2: "",
			selectedTransient: null as string | null,
			selectedSteadyState: null as string | null,
			selectedConcept: null as string | null,
			ziZsPassed: false,
			trSsPassed: false,
			conceptPassed: false,
		});
	}
}
