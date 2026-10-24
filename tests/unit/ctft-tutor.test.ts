/** Mathematical and lifecycle contracts for both CTFT teaching paths. */
import { renderToString } from "katex";
import { describe, expect, it, vi } from "vitest";
import { CtftStepSolverState } from "$lib/components/solvers/ctft-step-solver.svelte";
import {
	type CtftSignalType,
	createCtftProblem,
	evaluateCtftSpectrum,
	evaluateEnergySpectrum,
	validateCtftAnswer,
} from "$lib/math-engine/fourier-transform/index";
import {
	buildCtftLesson,
	CTFT_COURSE_FAMILIES,
	type CtftPracticeMode,
} from "$lib/math-engine/fourier-transform/its-scaffolding/lesson";
import {
	buildCtftSpectrum,
	evaluateCtftRegular,
} from "$lib/math-engine/fourier-transform/spectrum";
import {
	validateCtftCalculation,
	validateCtftConstant,
	validateCtftImpulseRows,
	withCtftCalculationDiagnostics,
} from "$lib/math-engine/fourier-transform/tutor-validation";

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

/** Keeps course recognition bounded while retaining internal Gaussian lessons. */
it("uses the four course families in both teaching modes", () => {
	expect(
		CTFT_COURSE_FAMILIES.map(
			/** @param family - Course option. @returns Stable identifier. */
			(family) => family.id,
		),
	).toEqual(["rect", "exponential", "delta", "cos"]);
	for (const mode of modes) {
		for (const family of families) {
			const lesson = buildCtftLesson(
				createCtftProblem(family, { a: 2, T: 2, w0: 3, t0: 0 }),
				mode,
			);
			const options = lesson.stages[0]!.parts[0]!.choices!;
			expect(
				options.some(
					/** @param option - Recognition choice. @returns Whether Gaussian is offered. */
					(option) => option.id === "gaussian",
				),
			).toBe(family === "gaussian");
		}
	}
});

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
	/** Setup guidance names the forward transformation and remains specific to the selected family. */
	it("keeps setup hints family-specific and accepts both frequency aliases", () => {
		const rect = buildCtftLesson(
			createCtftProblem("rect", { a: 2, T: 2, w0: 3, t0: 0 }),
			"derivation",
		);
		const setup = rect.stages.find(
			/** @param stage - Lesson stage. @returns Whether it sets up the integral. */
			(stage) => stage.id === "setup",
		)!.parts[0]!;
		expect(setup.hints).toHaveLength(3);
		expect(setup.hints.join(" ")).toContain("forward transformation");
		expect(setup.hints.join(" ")).not.toMatch(
			/kernel|sifting|Euler|Gaussian/,
		);
		const delta = createCtftProblem("delta", { a: 2, T: 2, w0: 3, t0: 1 });
		for (const symbol of ["w", "omega"])
			expect(validateCtftAnswer(`e^(-j ${symbol})`, delta).status).toBe(
				"correct",
			);
	});
	/** Coordinates use exact scalar equality with their original independent input budget. */
	it("accepts prefixed and maximum-length exact constants without embedding", () => {
		for (const input of [
			"X(omega)=3",
			"3".padEnd(16384),
			`( ${" ".repeat(16377)}3 )`,
		])
			expect(
				validateCtftConstant(input, "3", true).status,
				input.length.toString(),
			).toBe("correct");
		expect(validateCtftConstant("3".padEnd(16385), "3", true).status).toBe(
			"unsupported",
		);
		expect(validateCtftConstant("3.000000001", "3", true).status).toBe(
			"incorrect",
		);
	});
	/** Remediation preserves the canonical outcome and original syntax ranges without mutating its input. */
	it("adds bounded time-variable diagnostics without changing verification", () => {
		const original = {
			status: "invalid" as const,
			message: "Unclosed bracket",
			diagnostics: [{ start: 1, end: 2, message: "Close this bracket" }],
		};
		const diagnosed = withCtftCalculationDiagnostics("e^{j t}", original);
		expect(diagnosed.status).toBe("invalid");
		expect(diagnosed.diagnostics).toHaveLength(2);
		expect(diagnosed.diagnostics?.[0]).toEqual(original.diagnostics[0]);
		expect(diagnosed.diagnostics?.[1]).toMatchObject({ start: 5, end: 6 });
		expect(original.message).toBe("Unclosed bracket");
		expect(
			withCtftCalculationDiagnostics("t".repeat(16385), original),
		).toBe(original);
		expect(withCtftCalculationDiagnostics("omega", original)).toBe(
			original,
		);
		const verified = { status: "correct" as const, message: "Verified" };
		expect(withCtftCalculationDiagnostics("t", verified)).toBe(verified);
	});
	/** Every derivation calculation retains canonical grading while describing time-independent results correctly. */
	it("uses neutral residual-time guidance across all derivation families", () => {
		for (const family of families) {
			const lesson = buildCtftLesson(
				createCtftProblem(family, { a: 2, T: 4, w0: 3, t0: 0 }),
				"derivation",
			);
			for (const stage of lesson.stages) {
				for (const task of stage.parts) {
					if (task.kind !== "calculation") continue;
					const answer = `(${task.expected})+t+t`;
					const original = validateCtftCalculation(
						answer,
						task.expected,
					);
					const result = withCtftCalculationDiagnostics(
						answer,
						original,
					);
					expect(original.status).toBe("unsupported");
					expect(result.status).toBe(original.status);
					expect(result.message).toBe(
						"The requested intermediate result must not contain the time variable $t$. Complete the operation shown in the task context.",
					);
					expect(result.diagnostics).toHaveLength(2);
					for (const diagnostic of result.diagnostics!) {
						expect(
							answer.slice(diagnostic.start, diagnostic.end),
						).toBe("t");
						expect(diagnostic.message).toBe(
							"Complete the requested calculation without leaving $t$ in the answer.",
						);
					}
					expect(
						validateCtftCalculation(task.expected, task.expected)
							.status,
					).toBe("correct");
				}
			}
		}
		const answer = Array(12).fill("t").join("+");
		const original = validateCtftCalculation(answer, "1/2");
		expect(
			withCtftCalculationDiagnostics(answer, original).diagnostics,
		).toHaveLength(8);
	});
	for (const mode of modes)
		for (const family of ["rect", "exponential", "delta", "cos"] as const) {
			/** Real recognition retries retain ownership guards and report the topic actually being checked. */
			it(`gives task-specific choice feedback for ${family} in ${mode}`, () => {
				const expectedFeedback: Record<string, string> = {
					family: "Check the selected signal family.",
					definition: "Check the forward-transformation setup.",
					operation:
						"Check whether the signal is translated in time.",
				};
				for (const t0 of [0, 1, -1]) {
					const callback = vi.fn();
					const solver = new CtftStepSolverState(
						createCtftProblem(family, { a: 2, T: 4, w0: 3, t0 }),
						mode,
						callback,
					);
					for (
						let attempt = 0;
						attempt < 100 && !solver.isCompleted;
						attempt++
					) {
						const stage = solver.activeStage!;
						const task = solver.activePart!;
						const state = solver.currentStepState!;
						if (task.kind === "choice") {
							solver.editAnswer(
								stage.id,
								task.id,
								"unknown-option",
							);
							solver.check(stage.id, task.id);
							expect(state.result?.status).toBe("invalid");
							const wrong = task.choices!.find(
								/** @param option - Owned recognition choice. @returns A valid distractor. */
								(option) => option.id !== task.expected,
							)!;
							solver.editAnswer(stage.id, task.id, wrong.id);
							solver.check(stage.id, task.id);
							expect(state.result?.status).toBe("incorrect");
							expect(state.result?.message).toBe(
								expectedFeedback[task.id],
							);
							expect(state.feedback).not.toContain("kernel");
							expect(solver.activePart).toBe(task);
						}
						answerCurrent(solver);
						if (task.kind === "choice") {
							expect(state.result?.message).toBe(
								"Correct! This choice matches the current task.",
							);
							expect(state.isValid).toBe(true);
						}
					}
					expect(callback).toHaveBeenCalledTimes(1);
				}
			});
		}
	/** Pair-only guidance cannot refer to calculations that this teaching path omits. */
	it("keeps input sizing and guidance consistent with each mode", () => {
		for (const family of families) {
			const lesson = buildCtftLesson(
				createCtftProblem(family, { a: 2, T: 6, w0: 3, t0: 0 }),
				"pairs-properties",
			);
			for (const task of lesson.stages.find(
				/** @param stage - Lesson stage. @returns Base assembly selection. */ (
					stage,
				) => stage.id === "base",
			)!.parts) {
				expect(task.hints).toHaveLength(3);
				expect(task.hints.join(" ")).not.toMatch(
					/verified endpoint|verified exponent|your sine expression|upper minus lower/,
				);
				expect(task.identityLatex ?? "").not.toContain("\\int");
			}
		}
		const derivation = buildCtftLesson(
			createCtftProblem("rect", { a: 2, T: 6, w0: 3, t0: 0 }),
			"derivation",
		);
		const parts = derivation.stages.find(
			/** @param stage - Lesson stage. @returns Base calculation selection. */ (
				stage,
			) => stage.id === "base",
		)!.parts;
		expect(
			parts.map(
				/** @param task - Owned calculation. @returns Stable task identity. */ (
					task,
				) => task.id,
			),
		).toEqual(["primitive", "endpoints", "sine", "limit", "expression"]);
		expect(
			parts.find(
				/** @param task - Owned calculation. @returns Zero-frequency exercise. */ (
					task,
				) => task.id === "limit",
			)?.inputSize,
		).toBe("scalar");
	});
	for (const mode of modes)
		for (const shift of [0, 2, -1])
			for (const notation of [
				"padded",
				"internal-whitespace",
				"equation-prefix",
			] as const) {
				/** Accepted scalar notation must survive both cosine assembly stages without reopening verified fields. */
				it(`assembles ${notation} impulse fields in ${mode}, translation ${shift}`, () => {
					const problem = createCtftProblem("cos", {
						a: 2,
						T: 4,
						w0: 3,
						t0: shift,
					});
					const callback = vi.fn();
					const solver = new CtftStepSolverState(
						{ ...problem, referenceAnswerLatex: "123" },
						mode,
						callback,
					);
					while (!solver.isCompleted) {
						const task = solver.activePart!;
						if (
							task.kind !== "location" &&
							task.kind !== "weight"
						) {
							answerCurrent(solver);
							continue;
						}
						const location = task.id.endsWith("0") ? 3 : -3;
						const state = solver.currentStepState!;
						if (task.kind === "location") {
							state.input =
								notation === "padded"
									? String(location).padEnd(8200)
									: notation === "internal-whitespace"
										? `(${" ".repeat(8200)}${location})`
										: `X(omega)=${location}`;
						} else {
							const translation =
								solver.activeStage!.id === "base" ? 0 : shift;
							state.input = `${notation === "equation-prefix" ? "X(omega)=" : ""}pi e^{-j(${location})(${translation})}`;
						}
						solver.check(solver.activeStage!.id, task.id);
						expect(
							state.isValid,
							`${task.id}: ${state.result?.message}`,
						).toBe(true);
					}
					expect(callback).toHaveBeenCalledTimes(1);
					expect(solver.stages.base!.isValid).toBe(true);
					expect(solver.stages.final!.isValid).toBe(true);
				});
			}
	/** Each input retains its own raw limit; assembly never imposes a second combined text limit. */
	it("preserves per-field limits and constant-only distribution semantics", () => {
		const problem = createCtftProblem("cos", { a: 2, T: 4, w0: 3, t0: 0 });
		expect(
			validateCtftImpulseRows(
				["-3", "3"],
				["pi".padEnd(16384), "pi".padEnd(16384)],
				problem,
			).status,
		).toBe("correct");
		expect(
			validateCtftImpulseRows(
				["-3", "3"],
				["pi".padEnd(16385), "pi"],
				problem,
			).status,
		).toBe("unsupported");
		for (const [answer, status] of [
			["", "invalid"],
			["\\frac{", "invalid"],
			["omega-omega+pi", "invalid"],
			["0/0", "invalid"],
			["tan(omega)", "unsupported"],
			["delta(omega)", "unsupported"],
			["\\delta(omega)", "invalid"],
		] as const)
			expect(
				validateCtftImpulseRows(["-3", "3"], [answer, "pi"], problem)
					.status,
			).toBe(status);
		expect(
			validateCtftImpulseRows(["j", "3"], ["pi", "pi"], problem).status,
		).toBe("unsupported");
		expect(
			validateCtftImpulseRows(
				["-3", "3.000000001"],
				["pi", "pi"],
				problem,
			).status,
		).toBe("incorrect");
		expect(
			validateCtftImpulseRows(["-3", "3"], ["pi+1e-10", "pi"], problem)
				.status,
		).toBe("correct");
	});
	/** Coalescing duplicate coordinates and removing zero weights cannot hide a missing impulse. */
	it("independently rejects incomplete or altered distributions", () => {
		const problem = createCtftProblem("cos", { a: 2, T: 4, w0: 3, t0: 0 });
		for (const [locations, weights] of [
			[
				["-3", "-3"],
				["pi", "pi"],
			],
			[
				["-3", "-3"],
				["pi", "-pi"],
			],
			[
				["-3", "3"],
				["0", "pi"],
			],
			[
				["-3", "3"],
				["2pi", "pi"],
			],
		])
			expect(
				validateCtftImpulseRows(locations!, weights!, problem).status,
			).toBe("incorrect");
		expect(
			validateCtftImpulseRows(["-3"], ["pi", "pi"], problem).status,
		).toBe("invalid");
		expect(
			validateCtftImpulseRows(["-3", "3"], ["pi"], problem).status,
		).toBe("invalid");
	});
	/** Intermediate identities accept algebraic alternatives while rejecting sign and endpoint errors. */
	it("grades derivation algebra independently of the displayed solution", () => {
		for (const [answer, target] of [
			["j/omega", "1/(-j omega)"],
			["2 sin(2 omega)/omega", "(e^{-2j omega}-e^{2j omega})/(-j omega)"],
			["-1/(2+j omega)", "1/(-2-j omega)"],
			["(-j omega)^2", "-omega^2"],
			["-omega^2/8", "(-j omega)^2/(4*2)"],
			["pi", "(1/2)*(2 pi)"],
		] as const)
			expect(validateCtftCalculation(answer, target).status).toBe(
				"correct",
			);
		for (const [answer, target] of [
			["-j/omega", "j/omega"],
			["1/(2+j omega)", "-1/(2+j omega)"],
			["omega^2", "-omega^2"],
			["2 pi", "pi"],
		] as const)
			expect(validateCtftCalculation(answer, target).status).toBe(
				"incorrect",
			);
		expect(validateCtftCalculation("\\frac{", "1").status).toBe("invalid");
		expect(validateCtftCalculation("sin(omega^2)", "1").status).toBe(
			"unsupported",
		);
	});
	/** Full-spectrum answers and stale final submissions cannot bypass unfinished integral work. */
	it("requires intermediate derivation work before a base spectrum", () => {
		const solver = new CtftStepSolverState(
			createCtftProblem("rect", { T: 4, a: 2, w0: 3, t0: 0 }),
			"derivation",
		);
		advance(solver, "base");
		expect(solver.activePart?.id).toBe("primitive");
		solver.stages.base!.parts.expression!.input = "4 sinc(2 omega/pi)";
		solver.check("base", "expression");
		expect(solver.stages.base!.cursor).toBe(0);
		solver.currentStepState!.input = "4 sinc(2 omega/pi)";
		solver.check("base", "primitive");
		expect(solver.currentStepState!.isValid).toBe(false);
		solver.currentStepState!.input = "j/omega";
		solver.check("base", "primitive");
		expect(solver.activePart?.id).toBe("endpoints");
	});
	/** Mode-specific paths carry derivations only in Derivation, with recognition hints suited to choices. */
	it("keeps intermediate algebra and hints consistent with the selected mode", () => {
		for (const family of families)
			for (const mode of modes) {
				const lesson = buildCtftLesson(
					createCtftProblem(family, { T: 4, a: 2, w0: 3, t0: -1 }),
					mode,
				);
				const base = lesson.stages.find(
					/** @param stage - Lesson stage. @returns Base-stage identity. */ (
						stage,
					) => stage.id === "base",
				)!;
				expect(
					base.parts.some(
						/** @param task - Lesson task. @returns Whether intermediate algebra is required. */ (
							task,
						) => task.kind === "calculation",
					),
				).toBe(mode === "derivation");
				expect(Boolean(base.derivationLatex)).toBe(
					mode === "derivation",
				);
				if (base.derivationLatex)
					expect(() =>
						renderToString(base.derivationLatex!, {
							throwOnError: true,
						}),
					).not.toThrow();
				for (const stage of lesson.stages)
					for (const task of stage.parts)
						if (task.kind === "choice")
							expect(task.hints[1]).not.toContain(
								"exact constants",
							);
			}
	});
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
		solver.editAnswer("final", "expression", "stale draft");
		expect(solver.currentStepState?.input).toBe("");
		expect(solver.currentStep).toBe(1);
		solver.currentStepState!.input = "forged-option";
		solver.check("pair", "family");
		expect(solver.currentStepState?.result?.status).toBe("invalid");
		answerCurrent(solver);
		solver.editAnswer("pair", "family", "cos");
		expect(solver.stages.pair!.parts.family!.input).toBe("rect");
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
	}, 20_000);
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
