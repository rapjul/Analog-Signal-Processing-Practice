import { describe, expect, it, vi } from "vitest";
import { FourierSeriesStepSolverState } from "$lib/components/solvers/fourier-series-step-solver.svelte";
import { generateFourierSeriesProblem } from "$lib/math-engine/fourier-series/index";

describe("FourierSeriesStepSolverState Reactive Controller", () => {
	/** Checks scaled tolerances after unit conversion while retaining aliases and ordinary bounds. */
	it.each([
		{ T0: 1e-7, input: { period: "0.01" }, accepted: false },
		{
			T0: 1e-7,
			input: { period: "10", periodUnit: "ms" },
			accepted: false,
		},
		{ T0: 1e21, input: { freq: "0.01" }, accepted: false },
		{ T0: 1e21, input: { freq: "0.01", freqUnit: "Hz" }, accepted: false },
		{ T0: 1e-7, input: { period: "0.000000104" }, accepted: true },
		{
			T0: 1e-7,
			input: { period: "0.000104", periodUnit: "ms" },
			accepted: true,
		},
		{ T0: 1e21, input: { freq: "6.5\\times10^{-21}" }, accepted: true },
		{
			T0: 1e21,
			input: { freq: "1.04\\times10^{-21}", freqUnit: "Hz" },
			accepted: true,
		},
		{ T0: 1e-7, input: { period: "0.000000106" }, accepted: false },
		{ T0: 1e21, input: { freq: "6.7\\times10^{-21}" }, accepted: false },
		{ T0: 2, input: { period: "2.06" }, accepted: false },
		{ T0: 2, input: { freq: String(Math.PI + 0.06) }, accepted: false },
		{ T0: 2, input: { period: "2.04", freq: "3.18" }, accepted: true },
		{ T0: 4, input: { period: "4.04", freq: "1.61" }, accepted: true },
		{ T0: 1e-7, input: {}, accepted: true },
		{ T0: 1e21, input: {}, accepted: true },
	])(
		"grades scaled Step 1 input $input for period $T0",
		({ T0, input, accepted }) => {
			const problem = generateFourierSeriesProblem("square", {
				seed: 1,
				T0,
			});
			const solver = new FourierSeriesStepSolverState(() => problem);
			Object.assign(solver.step1, {
				period: String(T0),
				freq: problem.itsData.step1.w0Aliases[0],
				...input,
			});
			solver.checkStep1();
			expect(solver.currentStep).toBe(accepted ? 2 : 1);
			expect(solver.step1.isValid).toBe(accepted);
		},
	);

	/** Checks symbolic constants and equivalent units without binding free variables. */
	it.each([
		[1, "1", "s", "2*pi", "rad/s"],
		[2, "2", "s", "2*pi/2", "rad/s"],
		[4, "4000", "ms", "1/4", "Hz"],
		[8, "8", "s", "pi/4", "rad/s"],
		[8, "8000", "ms", "0.125", "Hz"],
		[8, "8", "s", String(Math.PI / 4), "rad/s"],
	])(
		"accepts equivalent period/frequency inputs for %s",
		(T0, period, periodUnit, freq, freqUnit) => {
			const problem = generateFourierSeriesProblem("square", {
				seed: 1,
				T0: Number(T0),
			});
			const solver = new FourierSeriesStepSolverState(() => problem);
			Object.assign(solver.step1, { period, periodUnit, freq, freqUnit });
			solver.checkStep1();
			expect(solver.currentStep).toBe(2);
		},
	);

	/** Rejects stale aliases, malformed expressions, and expressions containing variables. */
	it.each(["pi/2", "t+pi/4", "1/0", "pi/", "0", "-pi/4"])(
		"rejects invalid frequency %s",
		(freq) => {
			const problem = generateFourierSeriesProblem("square", {
				seed: 1,
				T0: 8,
			});
			const solver = new FourierSeriesStepSolverState(() => problem);
			Object.assign(solver.step1, { period: "8", freq });
			solver.checkStep1();
			expect(solver.currentStep).toBe(1);
			expect(solver.step1.isValid).toBe(false);
		},
	);
	it("initializes in pristine state on Step 1", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierSeriesStepSolverState(() => problem);

		expect(solver.currentStep).toBe(1);
		expect(solver.isCompleted).toBe(false);
		expect(solver.hintTier).toBe(0);
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedback).toBeNull();
		expect(solver.activeHints.length).toBe(3);
		expect(solver.currentFeedback).toBe("");
	});

	it("reveals progressive hints up to Tier 3 and caps", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierSeriesStepSolverState(() => problem);

		expect(solver.hintTier).toBe(0);
		solver.revealNextHint();
		expect(solver.hintTier).toBe(1);
		solver.revealNextHint();
		expect(solver.hintTier).toBe(2);
		solver.revealNextHint();
		expect(solver.hintTier).toBe(3);
		// Should cap at 3
		solver.revealNextHint();
		expect(solver.hintTier).toBe(3);
	});

	it("derives the hint cap from the active hint count", () => {
		const problem = generateFourierSeriesProblem("square");
		problem.itsData.step1.hints.push("Fourth hint", "Fifth hint");
		const solver = new FourierSeriesStepSolverState(() => problem);

		for (let index = 0; index < 6; index += 1) solver.revealNextHint();

		expect(solver.activeHints).toHaveLength(5);
		expect(solver.hintTier).toBe(5);
	});

	it("validates Step 1 with tolerance, units, and alias checking across all branches", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierSeriesStepSolverState(() => problem);

		// 0. Empty inputs (validation)
		solver.step1.period = "";
		solver.step1.freq = "";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.step1.feedback).toContain("values for both");

		// 1. Invalid period value (incorrect)
		solver.step1.period = "999";
		solver.step1.freq = problem.itsData.step1.w0Aliases[0] ?? "";
		solver.step1.periodUnit = "s";
		solver.step1.freqUnit = "rad/s";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.step1.feedback).toContain("Incorrect Period value");
		expect(solver.currentFeedback).toContain("Incorrect Period value");

		// 2. Unsupported period unit (validation)
		solver.step1.period = String(problem.itsData.step1.expectedT);
		solver.step1.periodUnit = "minutes";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.step1.feedback).toContain("Unsupported period unit");

		// 3. Invalid frequency value (incorrect)
		solver.step1.periodUnit = "s";
		solver.step1.freq = "999";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("incorrect");
		expect(solver.currentFeedbackTitle).toBe("Incorrect:");
		expect(solver.step1.feedback).toContain(
			"Incorrect Fundamental Frequency",
		);

		// 4. Unsupported frequency unit (validation)
		solver.step1.freq = problem.itsData.step1.w0Aliases[0] ?? "";
		solver.step1.freqUnit = "cycles/min";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step1.feedbackType).toBe("validation");
		expect(solver.currentFeedbackTitle).toBe("Input Required:");
		expect(solver.step1.feedback).toContain("Unsupported frequency unit");

		// 5. Correct inputs
		solver.step1.freqUnit = "rad/s";
		solver.checkStep1();
		expect(solver.step1.isValid).toBe(true);
		expect(solver.step1.feedback).toBeNull();
		expect(solver.step1.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(2);
		expect(solver.hintTier).toBe(0);
	});

	it("converts equivalent millisecond and hertz answers", () => {
		const problem = generateFourierSeriesProblem("square", {
			seed: 10,
			T0: 4,
		});
		const solver = new FourierSeriesStepSolverState(() => problem);

		solver.step1.period = "4000";
		solver.step1.periodUnit = "ms";
		solver.step1.freq = "0.25";
		solver.step1.freqUnit = "Hz";
		solver.checkStep1();

		expect(solver.step1.isValid).toBe(true);
		expect(solver.currentStep).toBe(2);
	});

	it("advances through Step 2 parity and half-wave parts independently", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierSeriesStepSolverState(() => problem);
		solver.advanceToStep(2);
		expect(solver.step2Progress).toEqual({
			current: 1,
			total: 2,
			label: "Part 1 of 2",
		});
		expect(solver.activeHints).toBe(problem.itsData.step2.hints);

		// An omitted Part 1 answer is a validation error.
		solver.checkStep2OriginParity();
		expect(solver.step2.feedbackType).toBe("validation");
		expect(solver.step2.activeSubStepId).toBe("origin-parity");

		// An incorrect Part 1 answer stays on the parity classification.
		const wrongSymmetry =
			problem.itsData.step2.correctOriginParity === "even"
				? "odd"
				: "even";
		solver.checkStep2OriginParity(wrongSymmetry);
		expect(solver.step2.isValid).toBe(false);
		expect(solver.step2.feedbackType).toBe("misconception");
		expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
		expect(solver.step2.feedback).toBeDefined();
		expect(solver.currentFeedback).toBe(solver.step2.feedback);
		expect(solver.step2.activeSubStepId).toBe("origin-parity");

		// A correct Part 1 answer advances within Step 2 and resets hints.
		solver.revealNextHint();
		solver.checkStep2OriginParity(
			problem.itsData.step2.correctOriginParity,
		);
		expect(solver.currentStep).toBe(2);
		expect(solver.step2.activeSubStepId).toBe("half-wave");
		expect(solver.step2Progress.label).toBe("Part 2 of 2");
		expect(solver.hintTier).toBe(0);
		expect(solver.activeHints).toBe(problem.itsData.step2.halfWaveHints);

		// An omitted Part 2 answer is a validation error.
		solver.checkStep2HalfWave();
		expect(solver.step2.feedbackType).toBe("validation");

		// An incorrect Part 2 answer remains on the half-wave test.
		solver.checkStep2HalfWave(
			!problem.itsData.step2.correctHalfWaveSymmetry,
		);
		expect(solver.step2.feedbackType).toBe("misconception");
		expect(solver.step2.feedback).toContain("independent");
		expect(solver.currentStep).toBe(2);

		// The correct Part 2 answer completes the parent step.
		solver.checkStep2HalfWave(
			problem.itsData.step2.correctHalfWaveSymmetry,
		);
		expect(solver.step2.isValid).toBe(true);
		expect(solver.step2.feedback).toBeNull();
		expect(solver.step2.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(3);
	});

	it("requires half-wave symmetry independently from origin parity", () => {
		const problem = generateFourierSeriesProblem("square_even", {
			seed: 5,
		});
		const solver = new FourierSeriesStepSolverState(() => problem);
		solver.advanceToStep(2);

		solver.checkStep2OriginParity(problem.coeffs.originParity);
		solver.checkStep2HalfWave(false);
		expect(solver.step2.feedbackType).toBe("misconception");
		expect(solver.step2.feedback).toContain("independent");

		solver.checkStep2HalfWave(true);
		expect(solver.currentStep).toBe(3);
	});

	it("accepts a negative half-wave classification when the shifted waveform does not invert", () => {
		const problem = generateFourierSeriesProblem("sawtooth", { seed: 8 });
		const solver = new FourierSeriesStepSolverState(() => problem);
		solver.advanceToStep(2);

		solver.checkStep2OriginParity(problem.coeffs.originParity);
		expect(solver.step2.activeSubStepId).toBe("half-wave");
		solver.checkStep2HalfWave(false);

		expect(problem.coeffs.hasHalfWaveSymmetry).toBe(false);
		expect(solver.currentStep).toBe(3);
	});

	it("validates Step 3 (vanishing) with correct and misconception branches", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierSeriesStepSolverState(() => problem);
		solver.advanceToStep(3);

		// Incorrect vanishing (misconception)
		solver.checkStep3("none");
		expect(solver.step3.isValid).toBe(false);
		expect(solver.step3.feedbackType).toBe("misconception");
		expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
		expect(solver.step3.feedback).toBeDefined();

		// Correct vanishing
		solver.checkStep3(problem.itsData.step3.correctVanishing);
		expect(solver.step3.isValid).toBe(true);
		expect(solver.step3.feedback).toBeNull();
		expect(solver.step3.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(4);
	});

	it("validates Step 4 (representation form) with correct and misconception branches", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierSeriesStepSolverState(() => problem);
		solver.advanceToStep(4);

		// Incorrect form (misconception)
		const wrongForm =
			problem.itsData.step4.correctForm === "trig" ? "exp" : "trig";
		solver.checkStep4(wrongForm);
		expect(solver.step4.isValid).toBe(false);
		expect(solver.step4.feedbackType).toBe("misconception");
		expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
		expect(solver.step4.feedback).toBeDefined();

		// Correct form
		solver.checkStep4(problem.itsData.step4.correctForm);
		expect(solver.step4.isValid).toBe(true);
		expect(solver.step4.feedback).toBeNull();
		expect(solver.step4.feedbackType).toBeNull();
		expect(solver.currentStep).toBe(5);
	});

	it("validates Step 5 (integral setup) with incorrect distractor and correct option", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierSeriesStepSolverState(() => problem);
		solver.advanceToStep(5);
		const part = problem.itsData.step5.parts[0];
		if (!part) throw new Error("Expected part");
		solver.checkStep5(null);
		expect(solver.step5.feedbackType).toBe("validation");

		// Incorrect option (misconception)
		const wrongOpt = part.options.find((o) => !o.isCorrect);
		expect(wrongOpt).toBeDefined();
		if (wrongOpt) {
			solver.checkStep5(wrongOpt);
			expect(solver.step5.isValid).toBe(false);
			expect(solver.step5.feedbackType).toBe("misconception");
			expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
			expect(solver.step5.feedback).toBe(wrongOpt.feedback);
		}

		// Correct option
		const correctOpt = part.options.find((o) => o.isCorrect);
		expect(correctOpt).toBeDefined();
		if (correctOpt) {
			solver.checkStep5(correctOpt);
			expect(solver.step5.isValid).toBe(true);
			expect(solver.step5.feedback).toBeNull();
			expect(solver.step5.feedbackType).toBeNull();
			expect(solver.currentStep).toBe(6);
		}
	});

	it("validates Step 6 coefficient evaluation before advancing", () => {
		const onComplete = vi.fn();
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierSeriesStepSolverState(
			() => problem,
			() => onComplete,
		);
		solver.advanceToStep(6);
		const part = problem.itsData.step6.parts[0];
		if (!part) throw new Error("Expected part");
		solver.checkStep6(null);
		expect(solver.step6.feedbackType).toBe("validation");

		// Incorrect option (misconception)
		const wrongOpt = part.options.find((o) => !o.isCorrect);
		expect(wrongOpt).toBeDefined();
		if (wrongOpt) {
			solver.checkStep6(wrongOpt);
			expect(solver.step6.isValid).toBe(false);
			expect(solver.step6.feedbackType).toBe("misconception");
			expect(solver.currentFeedbackTitle).toBe("Misconception Detected:");
			expect(solver.step6.feedback).toBe(wrongOpt.feedback);
		}

		// Correct option
		const correctOpt = part.options.find((o) => o.isCorrect);
		expect(correctOpt).toBeDefined();
		if (correctOpt) {
			solver.checkStep6(correctOpt);
			expect(solver.step6.isValid).toBe(true);
			expect(solver.step6.feedback).toBeNull();
			expect(solver.step6.feedbackType).toBeNull();
			expect(solver.currentStep).toBe(7);
			expect(solver.isCompleted).toBe(false);
			expect(onComplete).not.toHaveBeenCalled();
		}
	});

	it("advances through each even-wave coefficient part independently", () => {
		const problem = generateFourierSeriesProblem("square_even", {
			seed: 10,
			A: 5,
			T0: 2,
		});
		const solver = new FourierSeriesStepSolverState(() => problem);
		solver.advanceToStep(5);
		expect(solver.step5Progress).toEqual({
			current: 1,
			total: 2,
			label: "Part 1 of 2",
		});

		const setupA0 = problem.itsData.step5.parts[0]?.options.find(
			({ isCorrect }) => isCorrect,
		);
		expect(setupA0).toBeDefined();
		solver.checkStep5(setupA0 ?? null);
		expect(solver.currentStep).toBe(5);
		expect(solver.step5.activeSubStepId).toBe("setup-an");
		expect(solver.step5Progress.label).toBe("Part 2 of 2");

		const setupAn = problem.itsData.step5.parts[1]?.options.find(
			({ isCorrect }) => isCorrect,
		);
		solver.checkStep5(setupAn ?? null);
		expect(solver.currentStep).toBe(6);

		for (const part of problem.itsData.step6.parts) {
			const correct = part.options.find(({ isCorrect }) => isCorrect);
			solver.checkStep6(correct ?? null);
		}
		expect(solver.currentStep).toBe(7);
		expect(solver.step6.isValid).toBe(true);
	});

	it("validates Step 7 synthesis and executes onComplete callback", () => {
		const onComplete = vi.fn();
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierSeriesStepSolverState(
			() => problem,
			() => onComplete,
		);
		solver.advanceToStep(7);

		const wrongOpt = problem.itsData.step7.options.find(
			(option) => !option.isCorrect,
		);
		expect(wrongOpt).toBeDefined();
		if (wrongOpt) {
			solver.checkStep7(wrongOpt);
			expect(solver.step7.feedbackType).toBe("misconception");
			expect(solver.step7.feedback).toBe(wrongOpt.feedback);
		}

		const correctOpt = problem.itsData.step7.options.find(
			(option) => option.isCorrect,
		);
		expect(correctOpt).toBeDefined();
		if (correctOpt) {
			solver.checkStep7(correctOpt);
			expect(solver.step7.isValid).toBe(true);
			expect(solver.currentStep).toBe(8);
			expect(solver.isCompleted).toBe(true);
			expect(onComplete).toHaveBeenCalledTimes(1);
		}
	});

	it("verifies all option LaTeX math strings are valid and non-empty", () => {
		const problem = generateFourierSeriesProblem("sawtooth");

		// Step 5 option math strings
		for (const opt of problem.itsData.step5.parts.flatMap(
			(part) => part.options,
		)) {
			expect(opt.latex).toBeDefined();
			expect(opt.latex.length).toBeGreaterThan(0);
			expect(
				opt.latex.includes("=") ||
					opt.latex.includes("\\int") ||
					opt.latex.includes("0"),
			).toBe(true);
		}

		// Step 6 and Step 7 option math strings
		for (const opt of [
			...problem.itsData.step6.parts.flatMap((part) => part.options),
			...problem.itsData.step7.options,
		]) {
			expect(opt.latex).toBeDefined();
			expect(opt.latex.length).toBeGreaterThan(0);
			expect(opt.latex).toContain("=");
		}
	});

	it("resets state completely when reset() is called", () => {
		const problem = generateFourierSeriesProblem("square");
		const solver = new FourierSeriesStepSolverState(() => problem);

		solver.step1.period = String(problem.itsData.step1.expectedT);
		solver.step1.freq = problem.itsData.step1.w0Aliases[0] ?? "";
		solver.checkStep1();
		solver.revealNextHint();
		expect(solver.currentStep).toBe(2);
		expect(solver.hintTier).toBe(1);

		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.hintTier).toBe(0);
		expect(solver.step1.period).toBe("");
		expect(solver.step1.isValid).toBe(false);
		expect(solver.step2.activeSubStepId).toBe("origin-parity");
		expect(solver.step2.subSteps["origin-parity"].selected).toBeNull();
		expect(solver.step2.subSteps["half-wave"].selected).toBeNull();
		expect(solver.step3.selected).toBeNull();
		expect(solver.step4.selected).toBeNull();
		expect(
			Object.values(solver.step5.subSteps).every(
				(part) => part.selected === null,
			),
		).toBe(true);
		expect(
			Object.values(solver.step6.subSteps).every(
				(part) => part.selected === null,
			),
		).toBe(true);
		expect(solver.step7.selected).toBeNull();
	});

	it("returns and navigates through all dev visual states deterministically for multi-part and single-part problems", () => {
		const problemEven = generateFourierSeriesProblem("square_even", {
			seed: 10,
			A: 5,
			T0: 2,
		});
		const solverEven = new FourierSeriesStepSolverState(() => problemEven);

		const visualStatesEven = solverEven.devGetVisualStates();
		expect(visualStatesEven.length).toBe(16);
		expect(visualStatesEven.map((s) => s.id)).toEqual([
			"fourier-series.step-01.period-frequency",
			"fourier-series.step-02.symmetry",
			"fourier-series.step-02.half-wave-symmetry",
			"fourier-series.step-02.symmetry.misconception",
			"fourier-series.step-03.vanishing-coefficients",
			"fourier-series.step-04.representation-form",
			"fourier-series.step-05.integral-setup",
			"fourier-series.step-05.integral-setup.hints",
			"fourier-series.step-05.integral-setup-an",
			"fourier-series.step-05.integral-setup-an.hints",
			"fourier-series.step-06.coefficient-evaluation",
			"fourier-series.step-06.coefficient-evaluation.hints",
			"fourier-series.step-06.coefficient-evaluation-an",
			"fourier-series.step-06.coefficient-evaluation-an.hints",
			"fourier-series.step-07.final-series",
			"fourier-series.step-07.final-series.hints",
		]);

		// Verify labels
		expect(visualStatesEven[1]!.label).toBe("Step 2A · Origin Parity");
		expect(visualStatesEven[2]!.label).toBe("Step 2B · Half-Wave Symmetry");
		expect(visualStatesEven[6]!.label).toContain("Step 5A");
		expect(visualStatesEven[8]!.label).toContain("Step 5B");
		expect(visualStatesEven[10]!.label).toContain("Step 6A");
		expect(visualStatesEven[12]!.label).toContain("Step 6B");

		// Test each visual state navigation on even problem
		for (const state of visualStatesEven) {
			const success = solverEven.devGoToVisualState(state.id);
			expect(success).toBe(true);
		}

		// Single-part problem (odd symmetry -> bn only)
		const problemOdd = generateFourierSeriesProblem("square", {
			seed: 1,
			A: 2,
			T0: 2,
		});
		const solverOdd = new FourierSeriesStepSolverState(() => problemOdd);
		const visualStatesOdd = solverOdd.devGetVisualStates();
		expect(visualStatesOdd.length).toBe(12);
		expect(visualStatesOdd.map((s) => s.id)).toEqual([
			"fourier-series.step-01.period-frequency",
			"fourier-series.step-02.symmetry",
			"fourier-series.step-02.half-wave-symmetry",
			"fourier-series.step-02.symmetry.misconception",
			"fourier-series.step-03.vanishing-coefficients",
			"fourier-series.step-04.representation-form",
			"fourier-series.step-05.integral-setup",
			"fourier-series.step-05.integral-setup.hints",
			"fourier-series.step-06.coefficient-evaluation",
			"fourier-series.step-06.coefficient-evaluation.hints",
			"fourier-series.step-07.final-series",
			"fourier-series.step-07.final-series.hints",
		]);

		for (const state of visualStatesOdd) {
			const success = solverOdd.devGoToVisualState(state.id);
			expect(success).toBe(true);
		}

		// Test invalid visual state
		expect(solverEven.devGoToVisualState("invalid.state.id")).toBe(false);
	});

	it("executes devSolveAll, devRevealAllHints, and devSimulateMisconception", () => {
		const onComplete = vi.fn();
		const problem = generateFourierSeriesProblem("square_even", {
			seed: 10,
			A: 5,
			T0: 2,
		});
		const solver = new FourierSeriesStepSolverState(
			() => problem,
			() => onComplete,
		);

		// Reveal all hints on Step 1
		solver.devRevealAllHints();
		expect(solver.hintTier).toBe(problem.itsData.step1.hints.length);

		// Simulate misconception
		solver.devSimulateMisconception("Custom diagnostic error message");
		expect(solver.currentFeedback).toBe("Custom diagnostic error message");
		expect(solver.currentFeedbackType).toBe("misconception");

		// Solve all steps to completion
		solver.devSolveAll();
		expect(solver.isCompleted).toBe(true);
		expect(solver.currentStep).toBe(8);
		expect(solver.currentStepState).toBeUndefined();
		expect(solver.activeHints).toEqual([]);
		expect(onComplete).toHaveBeenCalled();

		// Auto fill with unsupported step index
		solver.devAutoFillStep(99);

		// Auto fill step 7 when no option is marked correct
		const modifiedProblem = {
			...problem,
			itsData: {
				...problem.itsData,
				step7: {
					...problem.itsData.step7,
					options: problem.itsData.step7.options.map((o) => ({
						...o,
						isCorrect: false,
					})),
				},
			},
		};
		const solverNoCorrect = new FourierSeriesStepSolverState(
			() => modifiedProblem,
		);
		solverNoCorrect.advanceToStep(7);
		solverNoCorrect.devAutoFillStep(7);
		expect(solverNoCorrect.currentStep).toBe(8);
	});
});
