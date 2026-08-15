import type {
	OdeItsOption,
	OdeProblem,
	RootType,
} from "$lib/math-engine/odes";
import {
	BaseStepSolverState,
	type StepFeedbackType,
} from "./base-step-solver.svelte";

/**
 * Step 1 State: Characteristic Equation Coefficients (a2 s^2 + a1 s + a0 = 0).
 */
export interface OdeStep1State {
	/** Leading coefficient a2 */
	a2: string;
	/** First derivative coefficient a1 */
	a1: string;
	/** Constant term coefficient a0 */
	a0: string;
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType?: StepFeedbackType | null;
	/** Whether step 1 is validated */
	isValid: boolean;
}

/**
 * Step 2 State: Characteristic Roots Inputs.
 */
export interface OdeStep2State {
	/** First root input string */
	r1: string;
	/** Second root input string (for distinct real) */
	r2: string;
	/** Real part sigma (for complex conjugate) */
	sigma: string;
	/** Imaginary part omega_d (for complex conjugate) */
	omegaD: string;
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType?: StepFeedbackType | null;
	/** Whether step 2 is validated */
	isValid: boolean;
}

/**
 * Step 3 State: Homogeneous Form Template Selection.
 */
export interface OdeStep3State {
	/** Selected RootType template */
	selected: RootType | null;
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType?: StepFeedbackType | null;
	/** Whether step 3 is validated */
	isValid: boolean;
}

/**
 * Step 4 State: Particular Solution Ansatz Card Selection.
 */
export interface OdeStep4State {
	/** Selected option identifier */
	selected: string | null;
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType?: StepFeedbackType | null;
	/** Whether step 4 is validated */
	isValid: boolean;
}

/**
 * Step 5 State: Undetermined Particular Coefficients.
 */
export interface OdeStep5State {
	/** Solved Kp for constant/exponential forcing */
	kp: string;
	/** Solved A for sinusoidal forcing */
	a: string;
	/** Solved B for sinusoidal forcing */
	b: string;
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType?: StepFeedbackType | null;
	/** Whether step 5 is validated */
	isValid: boolean;
}

/**
 * Step 6 State: Initial Conditions Constants C1, C2.
 */
export interface OdeStep6State {
	/** Constant C1 input string */
	c1: string;
	/** Constant C2 input string */
	c2: string;
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType?: StepFeedbackType | null;
	/** Whether step 6 is validated */
	isValid: boolean;
}

/**
 * Step 7 State: Response Decomposition via OdeResponseInput.
 */
export interface OdeStep7State {
	/** LaTeX formatted student response */
	latex: string;
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType?: StepFeedbackType | null;
	/** Whether step 7 is validated */
	isValid: boolean;
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
	step1: OdeStep1State = $state<OdeStep1State>({
		a2: "",
		a1: "",
		a0: "",
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 2 State: Characteristic Roots */
	step2: OdeStep2State = $state<OdeStep2State>({
		r1: "",
		r2: "",
		sigma: "",
		omegaD: "",
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 3 State: Homogeneous Form Template */
	step3: OdeStep3State = $state<OdeStep3State>({
		selected: null,
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 4 State: Particular Solution Ansatz */
	step4: OdeStep4State = $state<OdeStep4State>({
		selected: null,
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 5 State: Undetermined Particular Coefficients */
	step5: OdeStep5State = $state<OdeStep5State>({
		kp: "",
		a: "",
		b: "",
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 6 State: Initial Conditions Constants */
	step6: OdeStep6State = $state<OdeStep6State>({
		c1: "",
		c2: "",
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 7 State: Response Decomposition */
	step7: OdeStep7State = $state<OdeStep7State>({
		latex: "",
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/**
	 * Live rendered preview equation for Step 1 Characteristic Equation.
	 */
	previewCharEq = $derived.by((): string => {
		const a2Str = this.step1.a2.trim();
		const a1Str = this.step1.a1.trim();
		const a0Str = this.step1.a0.trim();

		let term2 = "s^2";
		if (a2Str !== "") {
			const n2 = Number.parseFloat(a2Str);
			if (!Number.isNaN(n2)) {
				if (n2 === 1) term2 = "s^2";
				else if (n2 === -1) term2 = "-s^2";
				else term2 = `${n2}s^2`;
			} else {
				term2 = `${a2Str}s^2`;
			}
		} else {
			term2 = "a_2 s^2";
		}

		let term1 = "+ a_1 s";
		if (a1Str !== "") {
			const n1 = Number.parseFloat(a1Str);
			if (!Number.isNaN(n1)) {
				if (n1 === 1) term1 = "+ s";
				else if (n1 === -1) term1 = "- s";
				else if (n1 >= 0) term1 = `+ ${n1}s`;
				else term1 = `- ${Math.abs(n1)}s`;
			} else {
				term1 = `+ ${a1Str}s`;
			}
		} else {
			term1 = "+ a_1 s";
		}

		let term0 = "+ a_0";
		if (a0Str !== "") {
			const n0 = Number.parseFloat(a0Str);
			if (!Number.isNaN(n0)) {
				if (n0 >= 0) term0 = `+ ${n0}`;
				else term0 = `- ${Math.abs(n0)}`;
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
	 * Active feedback message for the currently active step.
	 */
	currentFeedback = $derived.by((): string => {
		switch (this.currentStep) {
			case 1:
				return this.step1.feedback ?? "";
			case 2:
				return this.step2.feedback ?? "";
			case 3:
				return this.step3.feedback ?? "";
			case 4:
				return this.step4.feedback ?? "";
			case 5:
				return this.step5.feedback ?? "";
			case 6:
				return this.step6.feedback ?? "";
			case 7:
				return this.step7.feedback ?? "";
			default:
				return "";
		}
	});

	/**
	 * Diagnostic feedback classification for the currently active step.
	 */
	currentFeedbackType = $derived.by((): StepFeedbackType | null => {
		switch (this.currentStep) {
			case 1:
				return this.step1.feedbackType ?? null;
			case 2:
				return this.step2.feedbackType ?? null;
			case 3:
				return this.step3.feedbackType ?? null;
			case 4:
				return this.step4.feedbackType ?? null;
			case 5:
				return this.step5.feedbackType ?? null;
			case 6:
				return this.step6.feedbackType ?? null;
			case 7:
				return this.step7.feedbackType ?? null;
			default:
				return null;
		}
	});

	/**
	 * Diagnostic title label for the active feedback banner.
	 */
	currentFeedbackTitle = $derived.by((): string => {
		switch (this.currentFeedbackType) {
			case "validation":
				return "Input Required:";
			case "misconception":
				return "Misconception Detected:";
			case "incorrect":
				return "Incorrect:";
			default:
				return "Feedback:";
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
		const vA2 = Number.parseFloat(this.step1.a2.trim());
		const vA1 = Number.parseFloat(this.step1.a1.trim());
		const vA0 = Number.parseFloat(this.step1.a0.trim());

		if (Number.isNaN(vA2) || Number.isNaN(vA1) || Number.isNaN(vA0)) {
			this.step1.isValid = false;
			this.step1.feedbackType = "validation";
			this.step1.feedback =
				"Please enter numeric values for all three coefficients: $a_2$, $a_1$, and $a_0$.";
			return;
		}

		// Misconception check: student entered RHS forcing amplitude for a0
		if (
			Math.abs(vA0 - this.problem.forcing.K) < 0.05 &&
			Math.abs(vA0 - s1Data.expectedA0) >= 0.05
		) {
			this.step1.isValid = false;
			this.step1.feedbackType = "misconception";
			this.step1.feedback = s1Data.misconceptions.forcing_rhs;
			return;
		}

		if (
			Math.abs(vA2 - s1Data.expectedA2) < 0.05 &&
			Math.abs(vA1 - s1Data.expectedA1) < 0.05 &&
			Math.abs(vA0 - s1Data.expectedA0) < 0.05
		) {
			this.step1.feedback = null;
			this.step1.feedbackType = null;
			this.step1.isValid = true;
			this.advanceToStep(2);
		} else {
			this.step1.isValid = false;
			this.step1.feedbackType = "incorrect";
			this.step1.feedback =
				"Incorrect coefficients. Substitute $\\frac{d^2 y}{dt^2} \\to s^2$, $\\frac{dy}{dt} \\to s$, and $y(t) \\to 1$, setting the homogeneous right-hand side to $0$.";
		}
	}

	/**
	 * Validates Step 2 (Characteristic Roots).
	 */
	checkStep2(): void {
		const s2Data = this.problem.itsData.step2;
		if (s2Data.rootType === "distinct_real") {
			const v1 = Number.parseFloat(this.step2.r1.trim());
			const v2 = Number.parseFloat(this.step2.r2.trim());

			if (Number.isNaN(v1) || Number.isNaN(v2)) {
				this.step2.isValid = false;
				this.step2.feedbackType = "validation";
				this.step2.feedback =
					"Please enter numeric values for both roots: $r_1$ and $r_2$.";
				return;
			}

			const r1 = s2Data.r1;
			const r2 = s2Data.r2 ?? 0;

			const matchDirect =
				Math.abs(v1 - r1) < 0.05 && Math.abs(v2 - r2) < 0.05;
			const matchSwapped =
				Math.abs(v1 - r2) < 0.05 && Math.abs(v2 - r1) < 0.05;

			if (matchDirect || matchSwapped) {
				this.step2.feedback = null;
				this.step2.feedbackType = null;
				this.step2.isValid = true;
				this.advanceToStep(3);
			} else {
				this.step2.isValid = false;
				this.step2.feedbackType = "incorrect";
				this.step2.feedback = `Incorrect roots. Factor the characteristic polynomial $${this.problem.itsData.step1.latex}$.`;
			}
		} else if (s2Data.rootType === "repeated_real") {
			const v1 = Number.parseFloat(this.step2.r1.trim());

			if (Number.isNaN(v1)) {
				this.step2.isValid = false;
				this.step2.feedbackType = "validation";
				this.step2.feedback =
					"Please enter a numeric value for the repeated root $r$.";
				return;
			}

			const r1 = s2Data.r1;

			if (Math.abs(v1 - r1) < 0.05) {
				this.step2.feedback = null;
				this.step2.feedbackType = null;
				this.step2.isValid = true;
				this.advanceToStep(3);
			} else {
				this.step2.isValid = false;
				this.step2.feedbackType = "incorrect";
				this.step2.feedback =
					"Incorrect repeated root. Characteristic equation: $(s - r)^2 = 0$.";
			}
		} else if (s2Data.rootType === "complex_conjugate") {
			const vSigma = Number.parseFloat(this.step2.sigma.trim());
			const vOmega = Number.parseFloat(this.step2.omegaD.trim());

			if (Number.isNaN(vSigma) || Number.isNaN(vOmega)) {
				this.step2.isValid = false;
				this.step2.feedbackType = "validation";
				this.step2.feedback =
					"Please enter numeric values for both the real part $\\sigma$ and imaginary part $\\omega_d$.";
				return;
			}

			const sigma = s2Data.r1;
			const omega = s2Data.im ?? 0;

			if (
				Math.abs(vSigma - sigma) < 0.05 &&
				Math.abs(vOmega - omega) < 0.05
			) {
				this.step2.feedback = null;
				this.step2.feedbackType = null;
				this.step2.isValid = true;
				this.advanceToStep(3);
			} else {
				this.step2.isValid = false;
				this.step2.feedbackType = "incorrect";
				this.step2.feedback =
					"Incorrect complex root components. Ensure real part $\\sigma$ and imaginary part $\\omega_d$ match $s = \\sigma \\pm j \\omega_d$.";
			}
		}
	}

	/**
	 * Validates Step 3 (Homogeneous Form Template Selection).
	 * @param {RootType} template Selected template
	 */
	checkStep3(template: RootType): void {
		if (!template) {
			this.step3.isValid = false;
			this.step3.feedbackType = "validation";
			this.step3.feedback = "Please select a homogeneous solution form template.";
			return;
		}

		this.step3.selected = template;
		const s3Data = this.problem.itsData.step3;

		if (template === s3Data.correctTemplate) {
			this.step3.feedback = null;
			this.step3.feedbackType = null;
			this.step3.isValid = true;
			this.advanceToStep(4);
		} else {
			this.step3.isValid = false;
			this.step3.feedbackType = "misconception";
			this.step3.feedback =
				s3Data.misconceptions[template] ??
				"Incorrect homogeneous template for the characteristic root structure.";
		}
	}

	/**
	 * Validates Step 4 (Particular Solution Ansatz).
	 * @param {OdeItsOption} opt Selected option
	 */
	checkStep4(opt: OdeItsOption): void {
		if (!opt) {
			this.step4.isValid = false;
			this.step4.feedbackType = "validation";
			this.step4.feedback = "Please select a particular solution ansatz.";
			return;
		}

		this.step4.selected = opt.id;
		if (opt.isCorrect) {
			this.step4.feedback = null;
			this.step4.feedbackType = null;
			this.step4.isValid = true;
			this.advanceToStep(5);
		} else {
			this.step4.isValid = false;
			this.step4.feedbackType = "misconception";
			this.step4.feedback =
				opt.feedback ??
				"Incorrect trial ansatz guess. Check for resonance collisions or missing trigonometric pairs.";
		}
	}

	/**
	 * Validates Step 5 (Particular Coefficients).
	 */
	checkStep5(): void {
		const s5Data = this.problem.itsData.step5;
		if (this.problem.forcing.type === "sinusoid") {
			const vA = Number.parseFloat(this.step5.a.trim());
			const vB = Number.parseFloat(this.step5.b.trim());

			if (Number.isNaN(vA) || Number.isNaN(vB)) {
				this.step5.isValid = false;
				this.step5.feedbackType = "validation";
				this.step5.feedback =
					"Please enter numeric values for both coefficients: $A$ and $B$.";
				return;
			}

			const expA = s5Data.expectedA ?? 0;
			const expB = s5Data.expectedB ?? 0;

			if (Math.abs(vA - expA) < 0.05 && Math.abs(vB - expB) < 0.05) {
				this.step5.feedback = null;
				this.step5.feedbackType = null;
				this.step5.isValid = true;
				this.advanceToStep(6);
			} else {
				this.step5.feedbackType = "incorrect";
				this.step5.feedback =
					"Incorrect coefficients $A$ and $B$. Substitute $y_p(t)$ into the ODE and equate like cosine and sine terms.";
				this.step5.isValid = false;
			}
		} else {
			const vKp = Number.parseFloat(this.step5.kp.trim());

			if (Number.isNaN(vKp)) {
				this.step5.isValid = false;
				this.step5.feedbackType = "validation";
				this.step5.feedback =
					"Please enter a numeric value for the particular amplitude $K_p$.";
				return;
			}

			const expKp = s5Data.expectedKp ?? 0;

			if (Math.abs(vKp - expKp) < 0.05) {
				this.step5.feedback = null;
				this.step5.feedbackType = null;
				this.step5.isValid = true;
				this.advanceToStep(6);
			} else {
				this.step5.feedbackType = "incorrect";
				this.step5.feedback =
					"Incorrect $K_p$ coefficient. Substitute $y_p(t)$ into the ODE and solve for $K_p$.";
				this.step5.isValid = false;
			}
		}
	}

	/**
	 * Validates Step 6 (Initial Conditions System & Constants C1, C2).
	 */
	checkStep6(): void {
		const s6Data = this.problem.itsData.step6;
		const vC1 = Number.parseFloat(this.step6.c1.trim());
		const vC2 = Number.parseFloat(this.step6.c2.trim());

		if (Number.isNaN(vC1) || Number.isNaN(vC2)) {
			this.step6.isValid = false;
			this.step6.feedbackType = "validation";
			this.step6.feedback =
				"Please enter numeric values for both constants: $C_1$ and $C_2$.";
			return;
		}

		if (
			Math.abs(vC1 - s6Data.expectedC1) < 0.05 &&
			Math.abs(vC2 - s6Data.expectedC2) < 0.05
		) {
			this.step6.feedback = null;
			this.step6.feedbackType = null;
			this.step6.isValid = true;
			this.advanceToStep(7);
		} else {
			this.step6.isValid = false;
			this.step6.feedbackType = "incorrect";
			this.step6.feedback =
				"Incorrect constants $C_1$, $C_2$. Remember to account for the velocity offset $y_p'(0^+)$ when setting up $y'(0^+) = y_h'(0^+) + y_p'(0^+)$.";
		}
	}

	/**
	 * Handles submission from Step 7 Response Decomposition.
	 * @param {string} value LaTeX formatted student response
	 */
	handleStep7Submit(value: string): void {
		if (value && value.trim().length > 3) {
			this.step7.feedback = null;
			this.step7.feedbackType = null;
			this.step7.isValid = true;
			this.advanceToStep(8);
		} else {
			this.step7.isValid = false;
			this.step7.feedbackType = "validation";
			this.step7.feedback =
				"Please enter the complete total response equation.";
		}
	}

	/**
	 * Resets all step inputs, feedbacks, and status.
	 */
	reset(): void {
		this.currentStep = 1;
		this.isCompleted = false;
		this.hintTier = 0;

		this.step1 = {
			a2: "",
			a1: "",
			a0: "",
			feedback: null,
			feedbackType: null,
			isValid: false,
		};
		this.step2 = {
			r1: "",
			r2: "",
			sigma: "",
			omegaD: "",
			feedback: null,
			feedbackType: null,
			isValid: false,
		};
		this.step3 = {
			selected: null,
			feedback: null,
			feedbackType: null,
			isValid: false,
		};
		this.step4 = {
			selected: null,
			feedback: null,
			feedbackType: null,
			isValid: false,
		};
		this.step5 = {
			kp: "",
			a: "",
			b: "",
			feedback: null,
			feedbackType: null,
			isValid: false,
		};
		this.step6 = {
			c1: "",
			c2: "",
			feedback: null,
			feedbackType: null,
			isValid: false,
		};
		this.step7 = {
			latex: "",
			feedback: null,
			feedbackType: null,
			isValid: false,
		};
	}
}
