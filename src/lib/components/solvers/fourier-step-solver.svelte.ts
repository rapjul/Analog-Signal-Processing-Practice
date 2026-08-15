import type {
	FourierItsOption,
	FourierSeriesProblem,
} from "$lib/math-engine/fourier-series";
import {
	BaseStepSolverState,
	type StepFeedbackType,
} from "./base-step-solver.svelte";

/**
 * Step 1 State: Period and Fundamental Frequency inputs and validation.
 */
export interface FourierStep1State {
	/** Student period input string */
	period: string;
	/** Period unit (default: 's') */
	periodUnit: string;
	/** Student frequency input string */
	freq: string;
	/** Frequency unit (default: 'rad/s') */
	freqUnit: string;
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType?: StepFeedbackType | null;
	/** Whether step 1 is validated */
	isValid: boolean;
}

/**
 * Multiple-choice step state for Fourier ITS steps.
 */
export interface FourierChoiceStepState {
	/** Selected option identifier or null if unselected */
	selected: string | null;
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType?: StepFeedbackType | null;
	/** Whether this step is validated */
	isValid: boolean;
}

/**
 * Reactive State and Controller for the 6-Step Fourier Series ITS Solver.
 */
export class FourierStepSolverState extends BaseStepSolverState {
	/** Getter closure returning the active Fourier Series problem */
	private readonly getProblem: () => FourierSeriesProblem;

	/** Active Fourier Series problem definition */
	get problem(): FourierSeriesProblem {
		return this.getProblem();
	}

	/** Step 1 State: Period & Frequency */
	step1: FourierStep1State = $state<FourierStep1State>({
		period: "",
		periodUnit: "s",
		freq: "",
		freqUnit: "rad/s",
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 2 State: Symmetry classification */
	step2: FourierChoiceStepState = $state<FourierChoiceStepState>({
		selected: null,
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 3 State: Vanishing coefficients */
	step3: FourierChoiceStepState = $state<FourierChoiceStepState>({
		selected: null,
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 4 State: Representation form */
	step4: FourierChoiceStepState = $state<FourierChoiceStepState>({
		selected: null,
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 5 State: Integral setup */
	step5: FourierChoiceStepState = $state<FourierChoiceStepState>({
		selected: null,
		feedback: null,
		feedbackType: null,
		isValid: false,
	});

	/** Step 6 State: Final series evaluation */
	step6: FourierChoiceStepState = $state<FourierChoiceStepState>({
		selected: null,
		feedback: null,
		feedbackType: null,
		isValid: false,
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
	 * Creates a new FourierStepSolverState instance.
	 * @param {() => FourierSeriesProblem} getProblem Reactive getter for the active problem
	 * @param {() => (() => void) | undefined} [getOnComplete] Optional reactive getter for completion callback
	 */
	constructor(
		getProblem: () => FourierSeriesProblem,
		getOnComplete?: () => (() => void) | undefined,
	) {
		super(6, getOnComplete);
		this.getProblem = getProblem;
		this.reset();
	}

	/**
	 * Validates Step 1 (Period & Frequency).
	 */
	checkStep1(): void {
		const s1Data = this.problem.itsData.step1;
		const pTrimmed = this.step1.period.trim().toLowerCase();
		const fTrimmed = this.step1.freq.trim().toLowerCase();

		if (pTrimmed === "" || fTrimmed === "") {
			this.step1.isValid = false;
			this.step1.feedbackType = "validation";
			this.step1.feedback =
				"Please enter numeric or symbolic values for both the period $T_0$ and fundamental frequency $\\omega_0$.";
			return;
		}

		const pMatch =
			s1Data.tAliases.some((alias) => pTrimmed === alias.toLowerCase()) ||
			Math.abs(Number.parseFloat(pTrimmed) - s1Data.expectedT) < 0.05;

		const fMatch =
			s1Data.w0Aliases.some(
				(alias) => fTrimmed === alias.toLowerCase(),
			) ||
			Math.abs(Number.parseFloat(fTrimmed) - s1Data.expectedW0) < 0.05;

		if (!pMatch) {
			this.step1.feedbackType = "incorrect";
			this.step1.feedback =
				"Incorrect Period value: inspect the duration over which the waveform repeats itself.";
			this.step1.isValid = false;
			return;
		}
		if (this.step1.periodUnit !== "s") {
			this.step1.feedbackType = "validation";
			this.step1.feedback =
				"Incorrect Period unit: period must be measured in seconds (s).";
			this.step1.isValid = false;
			return;
		}
		if (!fMatch) {
			this.step1.feedbackType = "incorrect";
			this.step1.feedback =
				"Incorrect Fundamental Frequency: use $\\omega_0 = \\frac{2\\pi}{T_0}$. (e.g. $\\pi$ or $\\pi/2$).";
			this.step1.isValid = false;
			return;
		}
		if (this.step1.freqUnit !== "rad/s") {
			this.step1.feedbackType = "validation";
			this.step1.feedback =
				"Incorrect Frequency unit: radian frequency $\\omega_0$ must be in $\\text{rad/s}$.";
			this.step1.isValid = false;
			return;
		}

		this.step1.feedback = null;
		this.step1.feedbackType = null;
		this.step1.isValid = true;
		this.advanceToStep(2);
	}

	/**
	 * Validates Step 2 (Symmetry Selection).
	 * @param {string} symmetry Selected symmetry identifier
	 */
	checkStep2(symmetry: string): void {
		if (!symmetry) {
			this.step2.isValid = false;
			this.step2.feedbackType = "validation";
			this.step2.feedback = "Please select a waveform symmetry option.";
			return;
		}

		this.step2.selected = symmetry;
		const s2Data = this.problem.itsData.step2;

		if (symmetry === s2Data.correctSymmetry) {
			this.step2.feedback = null;
			this.step2.feedbackType = null;
			this.step2.isValid = true;
			this.advanceToStep(3);
		} else {
			this.step2.isValid = false;
			this.step2.feedbackType = "misconception";
			this.step2.feedback =
				s2Data.misconceptions[symmetry] ??
				"Incorrect symmetry. Test whether $x(-t) = x(t)$ (even) or $x(-t) = -x(t)$ (odd).";
		}
	}

	/**
	 * Validates Step 3 (Vanishing Coefficients).
	 * @param {string} choice Selected vanishing choice
	 */
	checkStep3(choice: string): void {
		if (!choice) {
			this.step3.isValid = false;
			this.step3.feedbackType = "validation";
			this.step3.feedback = "Please select which Fourier coefficients vanish.";
			return;
		}

		this.step3.selected = choice;
		const s3Data = this.problem.itsData.step3;

		if (choice === s3Data.correctVanishing) {
			this.step3.feedback = null;
			this.step3.feedbackType = null;
			this.step3.isValid = true;
			this.advanceToStep(4);
		} else {
			this.step3.isValid = false;
			this.step3.feedbackType = "misconception";
			this.step3.feedback =
				s3Data.misconceptions[choice] ??
				"Incorrect vanishing condition for the signal's symmetry.";
		}
	}

	/**
	 * Validates Step 4 (Representation Form).
	 * @param {string} form Selected representation form
	 */
	checkStep4(form: string): void {
		if (!form) {
			this.step4.isValid = false;
			this.step4.feedbackType = "validation";
			this.step4.feedback = "Please select a Fourier series representation form.";
			return;
		}

		this.step4.selected = form;
		const s4Data = this.problem.itsData.step4;

		if (form === s4Data.correctForm) {
			this.step4.feedback = null;
			this.step4.feedbackType = null;
			this.step4.isValid = true;
			this.advanceToStep(5);
		} else {
			this.step4.isValid = false;
			this.step4.feedbackType = "misconception";
			this.step4.feedback =
				s4Data.misconceptions[form] ??
				"Consider which representation requires computing fewer non-zero integrals.";
		}
	}

	/**
	 * Validates Step 5 (Integral Setup Formula Option).
	 * @param {FourierItsOption} opt Selected option
	 */
	checkStep5(opt: FourierItsOption): void {
		if (!opt) {
			this.step5.isValid = false;
			this.step5.feedbackType = "validation";
			this.step5.feedback = "Please select an integral setup formula option.";
			return;
		}

		this.step5.selected = opt.id;
		if (opt.isCorrect) {
			this.step5.feedback = null;
			this.step5.feedbackType = null;
			this.step5.isValid = true;
			this.advanceToStep(6);
		} else {
			this.step5.isValid = false;
			this.step5.feedbackType = "misconception";
			this.step5.feedback =
				opt.feedback ??
				"Incorrect integral formulation. Check scaling factors ($2/T_0$ vs $1/T_0$) and trigonometric kernels.";
		}
	}

	/**
	 * Validates Step 6 (Final Series Expression).
	 * @param {FourierItsOption} opt Selected option
	 */
	checkStep6(opt: FourierItsOption): void {
		if (!opt) {
			this.step6.isValid = false;
			this.step6.feedbackType = "validation";
			this.step6.feedback = "Please select a final trigonometric series option.";
			return;
		}

		this.step6.selected = opt.id;
		if (opt.isCorrect) {
			this.step6.feedback = null;
			this.step6.feedbackType = null;
			this.step6.isValid = true;
			this.advanceToStep(7);
		} else {
			this.step6.isValid = false;
			this.step6.feedbackType = "misconception";
			this.step6.feedback =
				opt.feedback ??
				"Incorrect series expression. Check signs, DC offset $a_0$, and harmonic indices.";
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
			period: "",
			periodUnit: "s",
			freq: "",
			freqUnit: "rad/s",
			feedback: null,
			feedbackType: null,
			isValid: false,
		};
		this.step2 = {
			selected: null,
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
			selected: null,
			feedback: null,
			feedbackType: null,
			isValid: false,
		};
		this.step6 = {
			selected: null,
			feedback: null,
			feedbackType: null,
			isValid: false,
		};
	}
}
