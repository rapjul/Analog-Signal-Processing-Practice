import type {
	FourierItsOption,
	FourierSeriesProblem,
} from "$lib/math-engine/fourier-series";
import { parseNumericInput } from "$lib/math-engine/fraction";
import {
	BaseStepSolverState,
	type BaseStepState,
	createStepState,
	type SolverVisualStateDescriptor,
} from "./base-step-solver.svelte";

/**
 * Step 1 State: Period and Fundamental Frequency inputs and validation.
 */
export interface FourierStep1State extends BaseStepState {
	/** Student period input string */
	period: string;
	/** Period unit (default: 's') */
	periodUnit: string;
	/** Student frequency input string */
	freq: string;
	/** Frequency unit (default: 'rad/s') */
	freqUnit: string;
}

/**
 * Multiple-choice step state for Fourier ITS steps.
 */
export interface FourierChoiceStepState extends BaseStepState {
	/** Selected option identifier or null if unselected */
	selected: string | null;
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
	step1: FourierStep1State = $state<FourierStep1State>(
		createStepState({
			period: "",
			periodUnit: "s",
			freq: "",
			freqUnit: "rad/s",
		}),
	);

	/** Step 2 State: Symmetry classification */
	step2: FourierChoiceStepState = $state<FourierChoiceStepState>(
		createStepState({ selected: null as string | null }),
	);

	/** Step 3 State: Vanishing coefficients */
	step3: FourierChoiceStepState = $state<FourierChoiceStepState>(
		createStepState({ selected: null as string | null }),
	);

	/** Step 4 State: Representation form */
	step4: FourierChoiceStepState = $state<FourierChoiceStepState>(
		createStepState({ selected: null as string | null }),
	);

	/** Step 5 State: Integral setup */
	step5: FourierChoiceStepState = $state<FourierChoiceStepState>(
		createStepState({ selected: null as string | null }),
	);

	/** Step 6 State: Final series evaluation */
	step6: FourierChoiceStepState = $state<FourierChoiceStepState>(
		createStepState({ selected: null as string | null }),
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
			default:
				return undefined;
		}
	}

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
			this.setValidation(
				this.step1,
				"Please enter numeric or symbolic values for both the period $T_0$ and fundamental frequency $\\omega_0$.",
			);
			return;
		}
		if (this.step1.periodUnit !== "s" && this.step1.periodUnit !== "ms") {
			this.setValidation(
				this.step1,
				"Unsupported period unit. Choose seconds or milliseconds.",
			);
			return;
		}
		if (this.step1.freqUnit !== "rad/s" && this.step1.freqUnit !== "Hz") {
			this.setValidation(
				this.step1,
				"Unsupported frequency unit. Choose radians per second or hertz.",
			);
			return;
		}

		const periodScale = this.step1.periodUnit === "ms" ? 0.001 : 1;
		const frequencyScale = this.step1.freqUnit === "Hz" ? 2 * Math.PI : 1;
		const periodSeconds = parseNumericInput(pTrimmed) * periodScale;
		const frequencyRadiansPerSecond =
			parseNumericInput(fTrimmed) * frequencyScale;
		const pMatch =
			(this.step1.periodUnit === "s" &&
				s1Data.tAliases.some(
					(alias) => pTrimmed === alias.toLowerCase(),
				)) ||
			Math.abs(periodSeconds - s1Data.expectedT) < 0.05;

		const fMatch =
			(this.step1.freqUnit === "rad/s" &&
				s1Data.w0Aliases.some(
					(alias) => fTrimmed === alias.toLowerCase(),
				)) ||
			Math.abs(frequencyRadiansPerSecond - s1Data.expectedW0) < 0.05;

		if (!pMatch) {
			this.setIncorrect(
				this.step1,
				"Incorrect Period value: inspect the duration over which the waveform repeats itself.",
			);
			return;
		}
		if (!fMatch) {
			this.setIncorrect(
				this.step1,
				"Incorrect Fundamental Frequency: use $\\omega_0 = \\frac{2\\pi}{T_0}$. (e.g. $\\pi$ or $\\pi/2$).",
			);
			return;
		}
		this.setPassed(this.step1, 2);
	}

	/**
	 * Validates Step 2 (Symmetry Selection).
	 * @param {string} symmetry Selected symmetry identifier
	 */
	checkStep2(symmetry: string): void {
		const s2Data = this.problem.itsData.step2;
		this.checkChoiceStep(
			this.step2,
			symmetry,
			s2Data.correctSymmetry,
			s2Data.misconceptions,
			"Incorrect symmetry. Test whether $x(-t) = x(t)$ (even) or $x(-t) = -x(t)$ (odd).",
			"Please select a waveform symmetry option.",
			3,
		);
	}

	/**
	 * Validates Step 3 (Vanishing Coefficients).
	 * @param {string} choice Selected vanishing choice
	 */
	checkStep3(choice: string): void {
		const s3Data = this.problem.itsData.step3;
		this.checkChoiceStep(
			this.step3,
			choice,
			s3Data.correctVanishing,
			s3Data.misconceptions,
			"Incorrect vanishing condition for the signal's symmetry.",
			"Please select which Fourier coefficients vanish.",
			4,
		);
	}

	/**
	 * Validates Step 4 (Representation Form).
	 * @param {string} form Selected representation form
	 */
	checkStep4(form: string): void {
		const s4Data = this.problem.itsData.step4;
		this.checkChoiceStep(
			this.step4,
			form,
			s4Data.correctForm,
			s4Data.misconceptions,
			"Consider which representation requires computing fewer non-zero integrals.",
			"Please select a Fourier series representation form.",
			5,
		);
	}

	/**
	 * Validates Step 5 (Integral Setup Formula Option).
	 * @param {FourierItsOption} opt Selected option
	 */
	checkStep5(opt: FourierItsOption): void {
		this.checkOptionCardStep(
			this.step5,
			opt,
			"Incorrect integral formulation. Check scaling factors ($2/T_0$ vs $1/T_0$) and trigonometric kernels.",
			"Please select an integral setup formula option.",
			6,
		);
	}

	/**
	 * Validates Step 6 (Final Series Expression).
	 * @param {FourierItsOption} opt Selected option
	 */
	checkStep6(opt: FourierItsOption): void {
		this.checkOptionCardStep(
			this.step6,
			opt,
			"Incorrect series expression. Check signs, DC offset $a_0$, and harmonic indices.",
			"Please select a final trigonometric series option.",
			7,
		);
	}

	/**
	 * Resets all step inputs, feedbacks, and status.
	 */
	reset(): void {
		this.currentStep = 1;
		this.isCompleted = false;
		this.hintTier = 0;

		this.step1 = createStepState({
			period: "",
			periodUnit: "s",
			freq: "",
			freqUnit: "rad/s",
		});
		this.step2 = createStepState({ selected: null as string | null });
		this.step3 = createStepState({ selected: null as string | null });
		this.step4 = createStepState({ selected: null as string | null });
		this.step5 = createStepState({ selected: null as string | null });
		this.step6 = createStepState({ selected: null as string | null });
	}

	/** Named visual states for the six-step Fourier Series solver. */
	override devGetVisualStates(): SolverVisualStateDescriptor[] {
		return [
			{
				id: "fourier.step-01.period-frequency",
				label: "Step 1 · Period and Frequency",
				step: 1,
				kind: "interactive",
			},
			{
				id: "fourier.step-02.symmetry",
				label: "Step 2 · Waveform Symmetry",
				step: 2,
				kind: "interactive",
			},
			{
				id: "fourier.step-02.symmetry.misconception",
				label: "Step 2 · Symmetry Misconception",
				step: 2,
				kind: "diagnostic",
			},
			{
				id: "fourier.step-03.vanishing-coefficients",
				label: "Step 3 · Vanishing Coefficients",
				step: 3,
				kind: "interactive",
			},
			{
				id: "fourier.step-04.representation-form",
				label: "Step 4 · Representation Form",
				step: 4,
				kind: "interactive",
			},
			{
				id: "fourier.step-05.integral-setup",
				label: "Step 5 · Integral Setup",
				step: 5,
				kind: "interactive",
			},
			{
				id: "fourier.step-05.integral-setup.hints",
				label: "Step 5 · Integral Setup · All Hints",
				step: 5,
				kind: "hint",
			},
			{
				id: "fourier.step-06.final-series",
				label: "Step 6 · Final Series",
				step: 6,
				kind: "interactive",
			},
		];
	}

	/** Advances through complete parent steps using the real validation methods. */
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

	/** Resets and prepares one named Fourier visual state deterministically. */
	override devGoToVisualState(stateId: string): boolean {
		if (!import.meta.env.DEV) return false;
		if (!this.devGetVisualStates().some((state) => state.id === stateId)) {
			return false;
		}

		switch (stateId) {
			case "fourier.step-01.period-frequency":
				return this.devPrepareParentStep(1);
			case "fourier.step-02.symmetry":
				return this.devPrepareParentStep(2);
			case "fourier.step-02.symmetry.misconception": {
				if (!this.devPrepareParentStep(2)) return false;
				const choices = ["even", "odd", "none", "half_wave"];
				const wrong = choices.find(
					(choice) =>
						choice !== this.problem.itsData.step2.correctSymmetry,
				);
				if (!wrong) return false;
				this.checkStep2(wrong);
				return this.currentFeedbackType === "misconception";
			}
			case "fourier.step-03.vanishing-coefficients":
				return this.devPrepareParentStep(3);
			case "fourier.step-04.representation-form":
				return this.devPrepareParentStep(4);
			case "fourier.step-05.integral-setup":
				return this.devPrepareParentStep(5);
			case "fourier.step-05.integral-setup.hints":
				if (!this.devPrepareParentStep(5)) return false;
				this.devRevealAllHints();
				return true;
			case "fourier.step-06.final-series":
				return this.devPrepareParentStep(6);
			default:
				return false;
		}
	}

	/**
	 * Developer / Test mode method: Automatically fills and validates a Fourier Series step.
	 *
	 * @param {number} [stepIndex] - Target 1-based step index (defaults to currentStep).
	 */
	override devAutoFillStep(stepIndex?: number): void {
		if (!import.meta.env.DEV) return;
		const target = stepIndex ?? this.currentStep;
		switch (target) {
			case 1: {
				const s1 = this.problem.itsData.step1;
				this.step1.period = String(s1.expectedT);
				this.step1.periodUnit = "s";
				this.step1.freq = s1.w0Aliases[0] ?? String(s1.expectedW0);
				this.step1.freqUnit = "rad/s";
				this.checkStep1();
				break;
			}
			case 2: {
				this.checkStep2(this.problem.itsData.step2.correctSymmetry);
				break;
			}
			case 3: {
				this.checkStep3(this.problem.itsData.step3.correctVanishing);
				break;
			}
			case 4: {
				this.checkStep4(this.problem.itsData.step4.correctForm);
				break;
			}
			case 5: {
				const opt = this.problem.itsData.step5.options.find(
					(o) => o.isCorrect,
				);
				if (opt) {
					this.checkStep5(opt);
				} else {
					this.advanceToStep(6);
				}
				break;
			}
			case 6: {
				const opt = this.problem.itsData.step6.options.find(
					(o) => o.isCorrect,
				);
				if (opt) {
					this.checkStep6(opt);
				} else {
					this.advanceToStep(7);
				}
				break;
			}
			default:
				break;
		}
	}
}
