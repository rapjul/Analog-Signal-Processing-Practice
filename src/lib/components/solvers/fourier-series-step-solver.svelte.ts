import {
	evaluateMathJsonStrict,
	parseStrictLatex,
} from "$lib/math-engine/evaluator";
import type {
	FourierItsOption,
	FourierSeriesItsStep1,
	FourierSeriesProblem,
	OriginParity,
} from "$lib/math-engine/fourier-series/index";
import { parseNumericInput } from "$lib/math-engine/fraction";
import {
	BaseStepSolverState,
	type BaseStepState,
	createStepState,
	type SolverVisualStateDescriptor,
	type SubStepProgress,
} from "./base-step-solver.svelte";
import type {
	FourierChoiceStepState,
	FourierCoefficientMultiPartState,
	FourierCoefficientSubStepState,
	FourierSeriesChoiceStepState,
	FourierSeriesCoefficientMultiPartState,
	FourierSeriesCoefficientSubStepState,
	FourierSeriesStep1State,
	FourierSeriesSymmetryStepState,
	FourierSeriesSymmetrySubStepId,
	FourierStep1State,
	FourierSymmetryStepState,
	FourierSymmetrySubStepId,
} from "./fourier-series-solver-state/fourier-series-step-types";

export type {
	FourierChoiceStepState,
	FourierCoefficientMultiPartState,
	FourierCoefficientSubStepState,
	FourierSeriesChoiceStepState,
	FourierSeriesCoefficientMultiPartState,
	FourierSeriesCoefficientSubStepState,
	FourierSeriesStep1State,
	FourierSeriesSymmetryStepState,
	FourierSeriesSymmetrySubStepId,
	FourierStep1State,
	FourierSymmetryStepState,
	FourierSymmetrySubStepId,
};

import {
	fourierDevAutoFillStep,
	fourierDevGetVisualStates,
	fourierDevGoToVisualState,
} from "./fourier-series-solver-state/dev-helpers";
import {
	createCoefficientMultiPartState,
	createSymmetryMultiPartState,
} from "./fourier-series-solver-state/factory-helpers";

/**
 * Parses a finite constant expression without assigning any free variables.
 * @param input - Trimmed student frequency input.
 * @returns Parsed numeric value or NaN for unsupported input.
 */
function parseFrequencyValue(input: string): number {
	const numeric = parseNumericInput(input);
	if (Number.isFinite(numeric)) return numeric;
	try {
		return (
			evaluateMathJsonStrict(parseStrictLatex(input), {}) ?? Number.NaN
		);
	} catch {
		return Number.NaN;
	}
}

/**
 * Checks period aliases and converts the chosen time unit before comparison.
 * @param input - Trimmed period input.
 * @param unit - Validated time unit.
 * @param data - Expected period and supported aliases.
 * @returns Whether the period is correct.
 */
function matchesPeriodAnswer(
	input: string,
	unit: string,
	data: FourierSeriesItsStep1,
): boolean {
	const seconds = parseNumericInput(input) * (unit === "ms" ? 0.001 : 1);
	return (
		(unit === "s" &&
			data.tAliases.some((alias) => input === alias.toLowerCase())) ||
		(seconds > 0 && Math.abs(seconds - data.expectedT) < 0.05)
	);
}

/**
 * Checks historical frequency aliases and equivalent constant expressions.
 * @param input - Trimmed frequency input.
 * @param unit - Validated frequency unit.
 * @param data - Expected angular frequency and supported aliases.
 * @returns Whether the converted angular frequency is correct.
 */
function matchesFrequencyAnswer(
	input: string,
	unit: string,
	data: FourierSeriesItsStep1,
): boolean {
	const radians =
		parseFrequencyValue(input) * (unit === "Hz" ? 2 * Math.PI : 1);
	return (
		(unit === "rad/s" &&
			data.w0Aliases.some((alias) => input === alias.toLowerCase())) ||
		(radians > 0 && Math.abs(radians - data.expectedW0) < 0.05)
	);
}

/**
 * Reactive State and Controller for the 7-Step Fourier Series ITS Solver.
 */
export class FourierSeriesStepSolverState extends BaseStepSolverState {
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
	step2: FourierSymmetryStepState = $state<FourierSymmetryStepState>(
		createSymmetryMultiPartState({
			correctOriginParity: "none",
			correctHalfWaveSymmetry: false,
			hints: [],
			halfWaveHints: [],
			misconceptions: {},
		}),
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
	step5: FourierCoefficientMultiPartState = $state(
		createCoefficientMultiPartState([]),
	);

	/** Step 6 State: Harmonic coefficient evaluation */
	step6: FourierCoefficientMultiPartState = $state(
		createCoefficientMultiPartState([]),
	);

	/** Progress through Step 5 coefficient setup parts. */
	get step5Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step5);
	}

	/** Progress through the two Step 2 symmetry classifications. */
	get step2Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step2);
	}

	/** Progress through Step 6 coefficient evaluation parts. */
	get step6Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step6);
	}

	/** Step 7 State: Final series synthesis */
	step7: FourierChoiceStepState = $state<FourierChoiceStepState>(
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
			case 7:
				return this.step7;
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
				return (
					this.step2.subSteps[this.step2.activeSubStepId]?.hints ?? []
				);
			case 3:
				return this.problem.itsData.step3.hints;
			case 4:
				return this.problem.itsData.step4.hints;
			case 5:
				return (
					this.step5.subSteps[this.step5.activeSubStepId]?.hints ?? []
				);
			case 6:
				return (
					this.step6.subSteps[this.step6.activeSubStepId]?.hints ?? []
				);
			case 7:
				return this.problem.itsData.step7.hints;
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
		super(7, getOnComplete);
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

		if (!matchesPeriodAnswer(pTrimmed, this.step1.periodUnit, s1Data)) {
			this.setIncorrect(
				this.step1,
				"Incorrect Period value: inspect the duration over which the waveform repeats itself.",
			);
			return;
		}
		if (!matchesFrequencyAnswer(fTrimmed, this.step1.freqUnit, s1Data)) {
			this.setIncorrect(
				this.step1,
				"Incorrect Fundamental Frequency: use $\\omega_0 = \\frac{2\\pi}{T_0}$. (e.g. $\\pi$ or $\\pi/2$).",
			);
			return;
		}
		this.setPassed(this.step1, 2);
	}

	/**
	 * Validates Step 2 Part 1: parity about the time origin.
	 * @param {OriginParity | null} [originParity] Selected origin parity
	 */
	checkStep2OriginParity(
		originParity: OriginParity | null = this.step2.subSteps["origin-parity"]
			.selected,
	): void {
		const s2Data = this.problem.itsData.step2;
		this.step2.subSteps["origin-parity"].selected = originParity;
		if (originParity === null) {
			this.setSubStepValidation(
				this.step2,
				"origin-parity",
				"Classify the signal's parity about the time origin.",
			);
			return;
		}
		if (originParity !== s2Data.correctOriginParity) {
			this.setSubStepMisconception(
				this.step2,
				"origin-parity",
				s2Data.misconceptions[originParity] ??
					"Test the waveform against $x(-t)=x(t)$ and $x(-t)=-x(t)$.",
			);
			return;
		}
		this.setSubStepPassed(this.step2, "origin-parity", "half-wave");
	}

	/**
	 * Validates Step 2 Part 2: half-wave symmetry.
	 * @param {boolean | null} [hasHalfWaveSymmetry] Selected half-wave property
	 */
	checkStep2HalfWave(
		hasHalfWaveSymmetry: boolean | null = this.step2.subSteps["half-wave"]
			.selected,
	): void {
		const s2Data = this.problem.itsData.step2;
		this.step2.subSteps["half-wave"].selected = hasHalfWaveSymmetry;
		if (hasHalfWaveSymmetry === null) {
			this.setSubStepValidation(
				this.step2,
				"half-wave",
				"Select whether the signal has half-wave symmetry.",
			);
			return;
		}
		if (hasHalfWaveSymmetry !== s2Data.correctHalfWaveSymmetry) {
			this.setSubStepMisconception(
				this.step2,
				"half-wave",
				"Half-wave symmetry is independent of origin parity. Test whether $x(t+T_0/2)=-x(t)$.",
			);
			return;
		}
		this.setSubStepPassed(this.step2, "half-wave", undefined, 3);
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
	checkStep5(opt: FourierItsOption | null): void {
		this.checkCoefficientPart(
			this.step5,
			opt,
			"Incorrect integral formulation. Check the normalization, kernel, and piecewise bounds.",
			6,
		);
	}

	/**
	 * Validates Step 6 (Harmonic Coefficient Evaluation).
	 * @param {FourierItsOption} opt Selected option
	 */
	checkStep6(opt: FourierItsOption | null): void {
		this.checkCoefficientPart(
			this.step6,
			opt,
			"Incorrect coefficient evaluation. Check the applied bounds and harmonic-index factors.",
			7,
		);
	}

	/** Validates one active coefficient part and advances within or beyond it. */
	private checkCoefficientPart(
		step: FourierCoefficientMultiPartState,
		opt: FourierItsOption | null,
		fallbackFeedback: string,
		nextParentStep: number,
	): void {
		const activeId = step.activeSubStepId;
		const active = step.subSteps[activeId];
		if (!active) return;
		if (!opt) {
			this.setSubStepValidation(
				step,
				activeId,
				"Please select an answer for this coefficient part.",
			);
			return;
		}
		active.selected = opt.id;
		if (!opt.isCorrect) {
			this.setSubStepMisconception(
				step,
				activeId,
				opt.feedback ?? fallbackFeedback,
			);
			return;
		}
		const currentIndex = step.subStepOrder.indexOf(activeId);
		const nextSubStepId = step.subStepOrder[currentIndex + 1];
		this.setSubStepPassed(
			step,
			activeId,
			nextSubStepId,
			nextSubStepId ? undefined : nextParentStep,
		);
	}

	/**
	 * Validates Step 7 (Final Series Synthesis).
	 * @param {FourierItsOption} opt Selected option
	 */
	checkStep7(opt: FourierItsOption): void {
		this.checkOptionCardStep(
			this.step7,
			opt,
			"Incorrect series synthesis. Check the DC term, normalization, and non-zero harmonic indices.",
			"Please select the final trigonometric and exponential series.",
			8,
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
		this.step2 = createSymmetryMultiPartState(this.problem.itsData.step2);
		this.step3 = createStepState({ selected: null as string | null });
		this.step4 = createStepState({ selected: null as string | null });
		this.step5 = createCoefficientMultiPartState(
			this.problem.itsData.step5.parts,
		);
		this.step6 = createCoefficientMultiPartState(
			this.problem.itsData.step6.parts,
		);
		this.step7 = createStepState({ selected: null as string | null });
	}

	/** Named visual states for the seven-step Fourier Series solver. */
	override devGetVisualStates(): SolverVisualStateDescriptor[] {
		return fourierDevGetVisualStates(this.problem);
	}

	/** Resets and prepares one named Fourier visual state deterministically. */
	override devGoToVisualState(stateId: string): boolean {
		return fourierDevGoToVisualState(this, stateId);
	}

	/**
	 * Developer / Test mode method: Automatically fills and validates a Fourier Series step.
	 *
	 * @param {number} [stepIndex] - Target 1-based step index (defaults to currentStep).
	 */
	override devAutoFillStep(stepIndex?: number): void {
		fourierDevAutoFillStep(this, stepIndex);
	}
}

// Backward-compatibility alias
export { FourierSeriesStepSolverState as FourierStepSolverState };
