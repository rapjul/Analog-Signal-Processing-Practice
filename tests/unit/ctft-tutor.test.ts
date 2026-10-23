/** Mathematical and lifecycle contracts for both CTFT teaching paths. */
import { renderToString } from "katex";
import { describe, expect, it, vi } from "vitest";
import { CtftStepSolverState } from "$lib/components/solvers/ctft-step-solver.svelte";
import {
	buildCtftLesson,
	type CtftPracticeMode,
} from "$lib/math-engine/ctft-lesson";
import {
	buildCtftSpectrum,
	evaluateCtftRegular,
} from "$lib/math-engine/ctft-spectrum";
import {
	validateCtftConstant,
	validateCtftImpulseRows,
} from "$lib/math-engine/ctft-tutor-validation";
import {
	type CtftSignalType,
	createCtftProblem,
	evaluateCtftSpectrum,
	evaluateEnergySpectrum,
} from "$lib/math-engine/fourier-transform";

/** Family matrix, including regular and distribution spectra. */
const families: CtftSignalType[] = [
	"rect",
	"exponential",
	"gaussian",
	"delta",
	"cos",
];
/** Both supported lesson sequences. */
const modes: CtftPracticeMode[] = ["derivation", "pairs-properties"];

/**
 * Answers the current task through the same public validation entry point as the UI.
 * @param solver - Active lesson controller.
 * @param reverse - Enter cosine locations in reverse order.
 */
function answerCurrent(solver: CtftStepSolverState, reverse = false): void {
	const task = solver.activePart!;
	const stage = solver.activeStage!;
	const state = solver.currentStepState!;
	state.input = task.expected;
	if (task.kind === "location" && reverse)
		state.input = String(-Number(task.expected));
	if (task.kind === "weight") {
		const location =
			solver.stages[stage.id]!.parts[
				task.id.replace("weight", "location")
			]!.input;
		state.input = `\\pi e^{-j(${location})(${stage.id === "base" ? 0 : solver.problem.params.t0})}`;
	}
	solver.check(stage.id, task.id);
	expect(
		state.isValid,
		`${solver.problem.signalType}/${solver.lesson.mode}/${stage.id}/${task.id}: ${state.feedback}`,
	).toBe(true);
}

/**
 * Traverses verified tasks without developer autofill or forced navigation.
 * @param solver - Active controller.
 * @param stop - Mathematical stage to leave active, or completion.
 */
function advance(solver: CtftStepSolverState, stop = "complete"): void {
	for (
		let count = 0;
		count < 40 && !solver.isCompleted && solver.activeStage?.id !== stop;
		count++
	)
		answerCurrent(solver);
}

describe("CTFT tutor", () => {
	for (const mode of modes)
		for (const family of families)
			for (const shift of [0, 2, -1]) {
				/** Every mode/family/translation path must validate every stage and complete once. */
				it(`${mode}: ${family}, translation ${shift}`, () => {
					const callback = vi.fn();
					const problem = createCtftProblem(family, {
						a: 3,
						T: 4,
						w0: 5,
						t0: shift,
					});
					const solver = new CtftStepSolverState(
						{
							...problem,
							referenceAnswerLatex: "123",
							solutionSteps: [],
						},
						mode,
						callback,
					);
					expect(solver.totalSteps).toBe(
						mode === "derivation" ? 6 : 5,
					);
					expect(
						solver.lesson.stages.some(
							(stage) => stage.id === "setup",
						),
					).toBe(mode === "derivation");
					for (
						let count = 0;
						count < 40 && !solver.isCompleted;
						count++
					)
						answerCurrent(solver, true);
					expect(solver.isCompleted).toBe(true);
					expect(callback).toHaveBeenCalledTimes(1);
					solver.check("final", "expression");
					solver.advanceToStep(99);
					expect(callback).toHaveBeenCalledTimes(1);
					solver.reset();
					expect(solver.currentStep).toBe(1);
					expect(solver.currentStepState?.input).toBe("");
					expect(solver.isCompleted).toBe(false);
				});
			}
	/** Active lesson ownership is enforced independently of disabled DOM controls. */
	it("rejects stale, forged, duplicate, and out-of-order submissions", () => {
		const solver = new CtftStepSolverState(
			createCtftProblem("rect", { a: 2, T: 4, w0: 3, t0: 1 }),
			"derivation",
		);
		solver.advanceToStep(7);
		solver.check("final", "expression");
		expect(solver.currentStep).toBe(1);
		solver.currentStepState!.input = "forged-option";
		solver.check("pair", "family");
		expect(solver.currentStepState?.result?.status).toBe("invalid");
		answerCurrent(solver);
		solver.check("pair", "family");
		expect(solver.currentStep).toBe(2);
		solver.check("parameters", "t0");
		expect(solver.activePart?.id).toBe("T");
		solver.currentStepState!.input = "2";
		solver.check("parameters", "T");
		expect(solver.currentStepState?.feedback).toContain("full width");
	});
	/** Every scalar path retains malformed/unsupported outcomes and exact coordinates. */
	it("checks bounded constant syntax, exact coordinates, and complex weights", () => {
		expect(validateCtftConstant("4/2", "2", true).status).toBe("correct");
		expect(validateCtftConstant("2.000000001", "2", true).status).toBe(
			"incorrect",
		);
		expect(validateCtftConstant("2+omega-omega", "2", true).status).toBe(
			"invalid",
		);
		expect(validateCtftConstant("\\pi", "\\pi").status).toBe("correct");
		expect(validateCtftConstant("1/0", "2").status).toBe("invalid");
		expect(validateCtftConstant("\\tan(omega)", "2").status).toBe(
			"unsupported",
		);
		expect(validateCtftConstant("x".repeat(16385), "2").status).toBe(
			"unsupported",
		);
	});
	/** Each field must make progress only on a proven result, with targeted remediation. */
	it("retains invalid and unsupported states and diagnoses phase/scaling errors", () => {
		const solver = new CtftStepSolverState(
			createCtftProblem("rect", { a: 2, T: 4, w0: 3, t0: 1 }),
			"pairs-properties",
		);
		advance(solver, "base");
		for (const [input, expected] of [
			["", "invalid"],
			["\\tan(omega)", "unsupported"],
			["sinc(2omega/pi)", "incorrect"],
		]) {
			solver.currentStepState!.input = input!;
			solver.check("base", "expression");
			expect(solver.currentStepState?.result?.status).toBe(expected);
			expect(solver.activeStage?.id).toBe("base");
		}
		expect(solver.currentFeedback).toContain("normalized sinc");
		answerCurrent(solver);
		answerCurrent(solver);
		solver.currentStepState!.input = "e^{jomega}";
		solver.check("property", "phase");
		expect(solver.currentFeedback).toContain("phase sign");
		answerCurrent(solver);
		solver.currentStepState!.input = String.raw`\frac{2\sin(2\omega)}{\omega} e^{j\omega}`;
		solver.check("final", "expression");
		expect(solver.currentStepState?.result?.status).toBe("incorrect");
		expect(solver.isCompleted).toBe(false);
		solver.currentStepState!.input = String.raw`\frac{2\sin(2\omega)}{\omega} e^{-j\omega}`;
		solver.check("final", "expression");
		expect(solver.isCompleted).toBe(true);
	});
	/** Wrong recognition and property selections never transfer verification to later tasks. */
	it("keeps recognition, setup, property, and hints attached to their current tasks", () => {
		const solver = new CtftStepSolverState(
			createCtftProblem("delta", { a: 2, T: 4, w0: 3, t0: 1 }),
			"derivation",
		);
		solver.currentStepState!.input = "cos";
		solver.check("pair", "family");
		expect(solver.currentStep).toBe(1);
		expect(solver.currentStepState?.result?.status).toBe("incorrect");
		solver.revealNextHint();
		expect(solver.hintTier).toBe(1);
		advance(solver, "setup");
		expect(solver.hintTier).toBe(0);
		solver.currentStepState!.input = "wrong";
		solver.check("setup", "definition");
		expect(solver.currentStepState?.result?.status).toBe("incorrect");
		advance(solver, "property");
		solver.currentStepState!.input = "modulation";
		solver.check("property", "operation");
		expect(solver.currentStepState?.result?.status).toBe("incorrect");
		answerCurrent(solver);
		solver.currentStepState!.input = "1/0";
		solver.check("property", "phase");
		expect(solver.currentStepState?.result?.status).toBe("invalid");
		solver.reset();
		expect(solver.hintTier).toBe(0);
		expect(solver.currentStepState?.result).toBeNull();
	});
	/** Two equal locations cannot hide a missing paired impulse. */
	it("rejects duplicate locations and phase on only one impulse", () => {
		const problem = createCtftProblem("cos", { a: 2, T: 4, w0: 3, t0: 1 });
		const solver = new CtftStepSolverState(problem, "pairs-properties");
		advance(solver, "base");
		answerCurrent(solver);
		answerCurrent(solver);
		solver.currentStepState!.input = "-3";
		solver.check("base", "location-1");
		expect(solver.currentFeedback).toContain("other carrier");
		expect(
			validateCtftImpulseRows(["-3", "3"], ["pi", "pi e^{-j3}"], problem)
				.status,
		).toBe("incorrect");
	});
	/** Lesson presentation is mode-specific and all mathematical options render. */
	it("keeps displayed setup, pairs, and completed expressions coherent", () => {
		for (const family of families)
			for (const mode of modes) {
				const lesson = buildCtftLesson(
					createCtftProblem(family, { a: 2, T: 4, w0: 3, t0: -1 }),
					mode,
				);
				for (const latex of [
					lesson.standardPair,
					lesson.finalLatex,
					...(lesson.stages
						.find((stage) => stage.id === "setup")
						?.parts[0]?.choices?.map((choice) => choice.label) ??
						[]),
				])
					expect(() =>
						renderToString(latex, { throwOnError: true }),
					).not.toThrow();
			}
	});
	/** Every visual state is reachable through actual validators, including shifted weights. */
	it("prepares every named task capture and completes without forced advancement", () => {
		const solver = new CtftStepSolverState(
			createCtftProblem("cos", { a: 2, T: 4, w0: 3, t0: -1 }),
			"derivation",
		);
		const descriptors = solver.devGetVisualStates();
		expect(new Set(descriptors.map((state) => state.id)).size).toBe(
			descriptors.length,
		);
		for (const state of descriptors) {
			expect(solver.devGoToVisualState(state.id), state.id).toBe(true);
			expect(solver.activePart?.id).toBe(state.subStep);
		}
		solver.reset();
		solver.devSolveAll();
		expect(solver.isCompleted).toBe(true);
	});
});

describe("independent spectrum data", () => {
	/** Distribution weights must never enter a pointwise or squared-height API. */
	it("separates impulses and evaluates their distinct complex weights", () => {
		expect(() => evaluateCtftSpectrum("cos", { w0: 3 }, 3)).toThrow(
			"distribution",
		);
		expect(() => evaluateEnergySpectrum("cos", { w0: 3 }, 3)).toThrow(
			"distribution",
		);
		const data = buildCtftSpectrum(
			createCtftProblem("cos", { a: 2, T: 4, w0: 3, t0: 1 }),
		);
		expect(data.points).toEqual([]);
		expect(data.impulses.map((impulse) => impulse.location)).toEqual([
			-3, 3,
		]);
		expect(data.impulses[0]!.weight.abs()).toBeCloseTo(Math.PI);
		expect(data.impulses[0]!.weight.im).toBeCloseTo(Math.PI * Math.sin(3));
		expect(data.impulses[1]!.weight.im).toBeCloseTo(-Math.PI * Math.sin(3));
	});
	/** Independent complex formulas verify phase sign and translation invariance of magnitude. */
	it("matches rational and Gaussian values and masks sinc zeros", () => {
		const exponential = createCtftProblem("exponential", {
			a: 2,
			T: 4,
			w0: 3,
			t0: -1,
		});
		const value = evaluateCtftRegular(exponential, 2);
		expect(value.re).toBeCloseTo((Math.cos(2) + Math.sin(2)) / 4);
		expect(value.im).toBeCloseTo((Math.sin(2) - Math.cos(2)) / 4);
		const gaussian = evaluateCtftRegular(
			createCtftProblem("gaussian", { a: 2, T: 4, w0: 3, t0: 0 }),
			2,
		);
		expect(gaussian.re).toBeCloseTo(
			Math.sqrt(Math.PI / 2) * Math.exp(-0.5),
		);
		const rect = buildCtftSpectrum(
			createCtftProblem("rect", { a: 2, T: 4, w0: 3, t0: 1 }),
		);
		expect(rect.points[200]!.magnitude).toBe(4);
		expect(
			rect.points.filter((point) => point.phase === null).length,
		).toBeGreaterThan(0);
		const delta = buildCtftSpectrum(
			createCtftProblem("delta", { a: 2, T: 4, w0: 3, t0: 0 }),
		);
		expect(
			delta.points.every(
				(point) => point.magnitude === 1 && point.phase === 0,
			),
		).toBe(true);
	});
});
