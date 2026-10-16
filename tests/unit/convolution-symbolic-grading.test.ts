/** Cross-family verification of convolution tutor progression and adversaries. */
import { describe, expect, it } from "vitest";
import { verifyConvolutionExpression } from "$lib/components/solvers/convolution-solver-state/expression-validation";
import {
	createEvaluationState,
	validateEvaluationStage,
} from "$lib/components/solvers/convolution-solver-state/step6-evaluation";
import { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
import {
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION as base,
	CONVOLUTION_SIGNAL_TYPES,
	generateConfiguredConvolutionProblem,
} from "$lib/math-engine/convolution/index";

describe("convolution symbolic grading", () => {
	/** A false tail must leave the last step unverified and completion hidden. */
	it("rejects truncated exponential output through the final-row controller", () => {
		const problem = generateConfiguredConvolutionProblem(
			{
				x: { ...base, type: "exponential" },
				h: { ...base, type: "exponential" },
			},
			{ seed: 13 },
		);
		const solver = new ConvolutionStepSolverState(
			/** Returns this test problem. */ () => problem,
		);
		solver.currentStep = 7;
		const row = solver.step7.rows[1];
		if (!row) throw new Error("Expected active output row.");
		row.input = "t*e^{-t}u(6-t)";
		solver.checkStep7Row(1);
		expect(row.isValid).toBe(false);
		expect(solver.isCompleted).toBe(false);
		expect(solver.currentStep).toBe(7);
		row.input = "t*e^{-t}u(t)";
		solver.checkStep7Row(1);
		expect(solver.isCompleted).toBe(true);
	});
	for (const x of CONVOLUTION_SIGNAL_TYPES)
		for (const h of CONVOLUTION_SIGNAL_TYPES) {
			/** Every generated family must support both paths without a grading deadlock. */
			it(`verifies signed shifted ${x} * ${h} work on both paths`, () => {
				const problem = generateConfiguredConvolutionProblem(
					{
						x: {
							...base,
							type: x,
							parameterMode: "random",
							amplitude: "random_signed",
							componentAmplitudes: [
								"random_signed",
								"random_signed",
							],
							shiftState: "shifted",
							shiftValue: "-2",
						},
						h: {
							...base,
							type: h,
							parameterMode: "random",
							amplitude: "random_signed",
							componentAmplitudes: [
								"random_signed",
								"random_signed",
							],
							shiftState: "shifted",
							shiftValue: "1",
						},
					},
					{ seed: 41 },
				);
				for (const moving of ["x", "h"] as const) {
					const state = createEvaluationState(problem, moving);
					for (const [
						index,
						part,
					] of problem.itsData.step6.parts.entries()) {
						if (part.carriedZero) continue;
						const interval = problem.intervals[index];
						const terms = part.evaluationBySignal?.[moving];
						const field = state.subSteps[part.id];
						if (!interval || !terms || !field)
							throw new Error(
								"Expected complete interval metadata.",
							);
						for (const [termIndex, term] of terms.entries()) {
							field.activeTermIndex = termIndex;
							const input = field.termInputs[termIndex];
							if (!input) throw new Error("Expected term input.");
							for (const stage of [
								"upper",
								"lower",
								"difference",
							] as const) {
								field.stage = stage;
								input[stage] =
									stage === "upper"
										? term.upperSubstitutionLatex
										: stage === "lower"
											? term.lowerSubstitutionLatex
											: term.differenceLatex;
								expect(
									validateEvaluationStage(
										field,
										part,
										moving,
										interval.exprLatex,
										interval.min,
										interval.max,
									).kind,
									`${moving} ${index} ${termIndex} ${stage}`,
								).toBe("valid");
							}
						}
						field.stage = "combined";
						field.input = `(${interval.exprLatex})+0`;
						expect(
							validateEvaluationStage(
								field,
								part,
								moving,
								interval.exprLatex,
								interval.min,
								interval.max,
							).kind,
						).toBe("valid");
						const sum = terms
							.map(
								/** @param term - Independently integrated piece. */ (
									term,
								) => `(${term.differenceLatex})`,
							)
							.join("+");
						expect(
							verifyConvolutionExpression(
								sum,
								interval.exprLatex,
								interval,
							).status,
							`${moving} ${index} term sum`,
						).toBe("correct");
					}
				}
			}, 30_000);
		}
});
