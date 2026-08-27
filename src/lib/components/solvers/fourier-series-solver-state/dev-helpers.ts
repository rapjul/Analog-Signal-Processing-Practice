/**
 * Developer & Testing Fixtures for Reactive Fourier Series Step Solver.
 *
 * Provides visual state enumeration, deterministic state machine navigation,
 * and automated step filling routines for test runners and demo harnesses.
 */

import type { SolverVisualStateDescriptor } from "$lib/components/solvers/base-step-solver.svelte";
import type {
	FourierSeriesProblem,
	OriginParity,
} from "$lib/math-engine/fourier-series/index";
import type { FourierSeriesStepSolverState } from "../fourier-series-step-solver.svelte";

/**
 * Named visual states for the seven-step Fourier Series solver.
 *
 * @param {FourierSeriesProblem} problem - Active Fourier Series problem instance.
 * @returns {SolverVisualStateDescriptor[]} List of supported visual states.
 */
export function fourierDevGetVisualStates(
	problem: FourierSeriesProblem,
): SolverVisualStateDescriptor[] {
	const states: SolverVisualStateDescriptor[] = [
		{
			id: "fourier-series.step-01.period-frequency",
			label: "Step 1 · Period and Frequency",
			step: 1,
			kind: "interactive",
		},
		{
			id: "fourier-series.step-02.symmetry",
			label: "Step 2A · Origin Parity",
			step: 2,
			subStep: "origin-parity",
			kind: "interactive",
		},
		{
			id: "fourier-series.step-02.half-wave-symmetry",
			label: "Step 2B · Half-Wave Symmetry",
			step: 2,
			subStep: "half-wave",
			kind: "interactive",
		},
		{
			id: "fourier-series.step-02.symmetry.misconception",
			label: "Step 2A · Symmetry Misconception",
			step: 2,
			subStep: "origin-parity",
			kind: "diagnostic",
		},
		{
			id: "fourier-series.step-03.vanishing-coefficients",
			label: "Step 3 · Vanishing Coefficients",
			step: 3,
			kind: "interactive",
		},
		{
			id: "fourier-series.step-04.representation-form",
			label: "Step 4 · Representation Form",
			step: 4,
			kind: "interactive",
		},
	];

	const s5Parts = problem.itsData.step5.parts;
	if (s5Parts.length > 1) {
		s5Parts.forEach((part, idx) => {
			const partLetter = String.fromCharCode(65 + idx);
			const id =
				idx === 0
					? "fourier-series.step-05.integral-setup"
					: `fourier-series.step-05.integral-setup-${part.target}`;
			states.push(
				{
					id,
					label: `Step 5${partLetter} · ${part.title}`,
					step: 5,
					subStep: part.id,
					kind: "interactive",
				},
				{
					id: `${id}.hints`,
					label: `Step 5${partLetter} · ${part.title} · All Hints`,
					step: 5,
					subStep: part.id,
					kind: "hint",
				},
			);
		});
	} else if (s5Parts.length === 1 && s5Parts[0]) {
		const part = s5Parts[0];
		states.push(
			{
				id: "fourier-series.step-05.integral-setup",
				label: `Step 5 · ${part.title}`,
				step: 5,
				subStep: part.id,
				kind: "interactive",
			},
			{
				id: "fourier-series.step-05.integral-setup.hints",
				label: `Step 5 · ${part.title} · All Hints`,
				step: 5,
				subStep: part.id,
				kind: "hint",
			},
		);
	}

	const s6Parts = problem.itsData.step6.parts;
	if (s6Parts.length > 1) {
		s6Parts.forEach((part, idx) => {
			const partLetter = String.fromCharCode(65 + idx);
			const id =
				idx === 0
					? "fourier-series.step-06.coefficient-evaluation"
					: `fourier-series.step-06.coefficient-evaluation-${part.target}`;
			states.push(
				{
					id,
					label: `Step 6${partLetter} · ${part.title}`,
					step: 6,
					subStep: part.id,
					kind: "interactive",
				},
				{
					id: `${id}.hints`,
					label: `Step 6${partLetter} · ${part.title} · All Hints`,
					step: 6,
					subStep: part.id,
					kind: "hint",
				},
			);
		});
	} else if (s6Parts.length === 1 && s6Parts[0]) {
		const part = s6Parts[0];
		states.push(
			{
				id: "fourier-series.step-06.coefficient-evaluation",
				label: `Step 6 · ${part.title}`,
				step: 6,
				subStep: part.id,
				kind: "interactive",
			},
			{
				id: "fourier-series.step-06.coefficient-evaluation.hints",
				label: `Step 6 · ${part.title} · All Hints`,
				step: 6,
				subStep: part.id,
				kind: "hint",
			},
		);
	}

	states.push({
		id: "fourier-series.step-07.final-series",
		label: "Step 7 · Final Series",
		step: 7,
		kind: "interactive",
	});
	states.push({
		id: "fourier-series.step-07.final-series.hints",
		label: "Step 7 · Final Series · All Hints",
		step: 7,
		kind: "hint",
	});

	return states;
}

/** Advances through complete parent steps using the real validation methods. */
function devPrepareParentStep(
	solver: FourierSeriesStepSolverState,
	targetStep: number,
): boolean {
	solver.reset();
	let guard = 0;
	while (solver.currentStep < targetStep && guard < solver.totalSteps) {
		const before = solver.currentStep;
		solver.devAutoFillStep(before);
		if (solver.currentStep === before) return false;
		guard += 1;
	}
	return solver.currentStep === targetStep;
}

/** Advances through completed Step 5 parts until the target subpart is active. */
function devPrepareStep5SubStep(
	solver: FourierSeriesStepSolverState,
	targetSubStepId: string,
): boolean {
	if (!devPrepareParentStep(solver, 5)) return false;
	const parts = solver.problem.itsData.step5.parts;
	const targetIndex = parts.findIndex(({ id }) => id === targetSubStepId);
	if (targetIndex === -1) return false;
	for (let i = 0; i < targetIndex; i++) {
		const part = parts[i];
		if (!part) return false;
		const opt = part.options.find((o) => o.isCorrect);
		if (!opt) return false;
		solver.checkStep5(opt);
	}
	return solver.step5.activeSubStepId === targetSubStepId;
}

/** Advances through completed Step 6 parts until the target subpart is active. */
function devPrepareStep6SubStep(
	solver: FourierSeriesStepSolverState,
	targetSubStepId: string,
): boolean {
	if (!devPrepareParentStep(solver, 6)) return false;
	const parts = solver.problem.itsData.step6.parts;
	const targetIndex = parts.findIndex(({ id }) => id === targetSubStepId);
	if (targetIndex === -1) return false;
	for (let i = 0; i < targetIndex; i++) {
		const part = parts[i];
		if (!part) return false;
		const opt = part.options.find((o) => o.isCorrect);
		if (!opt) return false;
		solver.checkStep6(opt);
	}
	return solver.step6.activeSubStepId === targetSubStepId;
}

/**
 * Resets and prepares one named Fourier visual state deterministically.
 *
 * @param {FourierSeriesStepSolverState} solver - Active Fourier Series solver controller.
 * @param {string} stateId - Target visual state identifier.
 * @returns {boolean} Navigation success status.
 */
export function fourierDevGoToVisualState(
	solver: FourierSeriesStepSolverState,
	stateId: string,
): boolean {
	if (!import.meta.env.DEV) return false;
	if (!solver.devGetVisualStates().some((state) => state.id === stateId)) {
		return false;
	}

	switch (stateId) {
		case "fourier-series.step-01.period-frequency":
			return devPrepareParentStep(solver, 1);
		case "fourier-series.step-02.symmetry":
			return devPrepareParentStep(solver, 2);
		case "fourier-series.step-02.half-wave-symmetry":
			if (!devPrepareParentStep(solver, 2)) return false;
			solver.checkStep2OriginParity(
				solver.problem.itsData.step2.correctOriginParity,
			);
			return solver.step2.activeSubStepId === "half-wave";
		case "fourier-series.step-02.symmetry.misconception": {
			if (!devPrepareParentStep(solver, 2)) return false;
			const choices = ["even", "odd", "none"];
			const wrong = choices.find(
				(choice) =>
					choice !== solver.problem.itsData.step2.correctOriginParity,
			);
			if (!wrong) return false;
			solver.checkStep2OriginParity(wrong as OriginParity);
			return solver.currentFeedbackType === "misconception";
		}
		case "fourier-series.step-03.vanishing-coefficients":
			return devPrepareParentStep(solver, 3);
		case "fourier-series.step-04.representation-form":
			return devPrepareParentStep(solver, 4);
		case "fourier-series.step-07.final-series":
			return devPrepareParentStep(solver, 7);
		case "fourier-series.step-07.final-series.hints":
			if (!devPrepareParentStep(solver, 7)) return false;
			solver.devRevealAllHints();
			return true;
		default:
			break;
	}

	if (stateId.startsWith("fourier-series.step-05.")) {
		const isHints = stateId.endsWith(".hints");
		const baseId = isHints ? stateId.slice(0, -6) : stateId;
		const parts = solver.problem.itsData.step5.parts;
		let targetSubStepId = parts[0]?.id;
		if (baseId !== "fourier-series.step-05.integral-setup") {
			const suffix = baseId.replace(
				"fourier-series.step-05.integral-setup-",
				"",
			);
			const matchedPart = parts.find(
				(p) => p.target === suffix || p.id === suffix,
			);
			if (!matchedPart) return false;
			targetSubStepId = matchedPart.id;
		}
		if (
			!targetSubStepId ||
			!devPrepareStep5SubStep(solver, targetSubStepId)
		) {
			return false;
		}
		if (isHints) solver.devRevealAllHints();
		return true;
	}

	if (stateId.startsWith("fourier-series.step-06.")) {
		const isHints = stateId.endsWith(".hints");
		const baseId = isHints ? stateId.slice(0, -6) : stateId;
		const parts = solver.problem.itsData.step6.parts;
		let targetSubStepId = parts[0]?.id;
		if (baseId !== "fourier-series.step-06.coefficient-evaluation") {
			const suffix = baseId.replace(
				"fourier-series.step-06.coefficient-evaluation-",
				"",
			);
			const matchedPart = parts.find(
				(p) => p.target === suffix || p.id === suffix,
			);
			if (!matchedPart) return false;
			targetSubStepId = matchedPart.id;
		}
		if (
			!targetSubStepId ||
			!devPrepareStep6SubStep(solver, targetSubStepId)
		) {
			return false;
		}
		if (isHints) solver.devRevealAllHints();
		return true;
	}

	return false;
}

/**
 * Developer / Test mode method: Automatically fills and validates a Fourier Series step.
 *
 * @param {FourierSeriesStepSolverState} solver - Active Fourier Series solver controller.
 * @param {number} [stepIndex] - Target 1-based step index (defaults to currentStep).
 */
export function fourierDevAutoFillStep(
	solver: FourierSeriesStepSolverState,
	stepIndex?: number,
): void {
	if (!import.meta.env.DEV) return;
	const target = stepIndex ?? solver.currentStep;
	switch (target) {
		case 1: {
			const s1 = solver.problem.itsData.step1;
			solver.step1.period = String(s1.expectedT);
			solver.step1.periodUnit = "s";
			solver.step1.freq = s1.w0Aliases[0] ?? String(s1.expectedW0);
			solver.step1.freqUnit = "rad/s";
			solver.checkStep1();
			break;
		}
		case 2: {
			solver.checkStep2OriginParity(
				solver.problem.itsData.step2.correctOriginParity,
			);
			if (solver.currentStep === 2) {
				solver.checkStep2HalfWave(
					solver.problem.itsData.step2.correctHalfWaveSymmetry,
				);
			}
			break;
		}
		case 3: {
			solver.checkStep3(solver.problem.itsData.step3.correctVanishing);
			break;
		}
		case 4: {
			solver.checkStep4(solver.problem.itsData.step4.correctForm);
			break;
		}
		case 5: {
			while (solver.currentStep === 5) {
				const part = solver.problem.itsData.step5.parts.find(
					({ id }) => id === solver.step5.activeSubStepId,
				);
				const opt = part?.options.find((option) => option.isCorrect);
				if (!opt) break;
				solver.checkStep5(opt);
			}
			break;
		}
		case 6: {
			while (solver.currentStep === 6) {
				const part = solver.problem.itsData.step6.parts.find(
					({ id }) => id === solver.step6.activeSubStepId,
				);
				const opt = part?.options.find((option) => option.isCorrect);
				if (!opt) break;
				solver.checkStep6(opt);
			}
			break;
		}
		case 7: {
			const opt = solver.problem.itsData.step7.options.find(
				(o) => o.isCorrect,
			);
			if (opt) {
				solver.checkStep7(opt);
			} else {
				solver.advanceToStep(8);
			}
			break;
		}
		default:
			break;
	}
}
