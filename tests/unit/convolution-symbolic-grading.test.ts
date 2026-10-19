/** Cross-family verification of convolution tutor progression and adversaries. */
import { describe, expect, it } from "vitest";
import type { ConvolutionBoundInput } from "$lib/components/solvers/convolution-solver-state/convolution-step-types";
import { verifyConvolutionExpression } from "$lib/components/solvers/convolution-solver-state/expression-validation";
import {
	createBoundsState,
	validateBoundsStage,
} from "$lib/components/solvers/convolution-solver-state/step5-bounds";
import {
	createEvaluationState,
	validateEvaluationStage,
} from "$lib/components/solvers/convolution-solver-state/step6-evaluation";
import { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
import {
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION as base,
	CONVOLUTION_SIGNAL_TYPES,
	type ConvolutionMovingSignal,
	type ConvolutionProblem,
	generateConfiguredConvolutionProblem,
} from "$lib/math-engine/convolution/index";

/**
 * Produces equivalent finite work without treating infinity as arithmetic.
 * @param expression - Generated expression or boundary sentinel.
 * @returns Equivalent expression preserving infinity notation.
 */
function withZero(expression: string): string {
	return expression.includes("\\infty") ? expression : `(${expression})+0`;
}

/**
 * Checks reversed edges and recovery through the real Step 3 controller.
 * @param problem - Configured family problem.
 * @param moving - Signal being reflected.
 * @returns Controller advanced to Step 4 after correct edge verification.
 */
function verifyTransformedEdges(
	problem: ConvolutionProblem,
	moving: ConvolutionMovingSignal,
): ConvolutionStepSolverState {
	const solver = new ConvolutionStepSolverState(
		/** Returns this matrix problem. */ () => problem,
	);
	solver.currentStep = 3;
	solver.chooseMovingSignal(moving);
	const formula = problem.itsData.step3.formulaBySignal[moving].options.find(
		/** @param option - Guided formula choice. */ (option) =>
			option.isCorrect,
	);
	if (!formula) throw new Error("Expected the correct path formula.");
	solver.checkStep3Formula(formula);
	const sections = problem.itsData.step3.sectionsBySignal[moving];
	for (const section of sections) {
		solver.step3.edgeInputs[section.id] = {
			left: withZero(section.leftLatex),
			right: withZero(section.rightLatex),
		};
	}
	const first = sections[0];
	if (!first) throw new Error("Expected a moving signal section.");
	solver.step3.edgeInputs[first.id] = {
		left: first.rightLatex,
		right: first.leftLatex,
	};
	solver.checkStep3Edges();
	expect(solver.currentFeedbackType).toBe("misconception");
	expect(solver.currentStep).toBe(3);
	solver.step3.edgeInputs[first.id] = {
		left: withZero(first.leftLatex),
		right: withZero(first.rightLatex),
	};
	solver.checkStep3Edges();
	expect(solver.step3.subSteps["transform-edges"]?.isValid).toBe(true);
	expect(solver.currentStep).toBe(4);
	return solver;
}

/**
 * Verifies each contact's rejection and accepted equation notations through Step 4.
 * @param solver - Controller with the selected moving path.
 * @param problem - Configured family problem.
 * @param moving - Signal being reflected.
 */
function verifyContacts(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
	moving: ConvolutionMovingSignal,
): void {
	const contacts = problem.itsData.step4.transitionGroups.flatMap(
		/** @param group - Contacts sharing an output transition. */
		(group) => group.contactsBySignal[moving],
	);
	expect(contacts.length).toBeGreaterThan(0);
	for (const contact of contacts) {
		const id = solver.step4.subStepOrder.find(
			/** @param candidate - Guided contact form identifier. */
			(candidate) =>
				candidate.startsWith(contact.id) && candidate.endsWith("-form"),
		);
		if (!id) throw new Error("Expected a contact formulation task.");
		const state = solver.step4.subSteps[id];
		if (!state) throw new Error("Expected contact form state.");
		solver.currentStep = 4;
		solver.step4.activeSubStepId = id;
		state.input = "t+12345";
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(state.isValid).toBe(false);
		for (const answer of [
			withZero(contact.transformedLatex),
			`${contact.fixed}=${withZero(contact.transformedLatex)}`,
			`${withZero(contact.transformedLatex)}=${contact.fixed}`,
		]) {
			solver.currentStep = 4;
			solver.step4.activeSubStepId = id;
			state.isValid = false;
			state.input = answer;
			solver.checkStep4();
			expect(state.isValid, `${moving} ${id} ${answer}`).toBe(true);
			expect(solver.step4.activeSubStepId).not.toBe(id);
		}
	}
}

/**
 * Verifies generated overlap candidates, symbolic limits, and interior splits.
 * @param problem - Configured family problem.
 * @param moving - Signal being reflected.
 * @returns Number of actual interior split expressions checked.
 */
function verifyBounds(
	problem: ConvolutionProblem,
	moving: ConvolutionMovingSignal,
): number {
	const state = createBoundsState(problem);
	let splitCount = 0;
	for (const [index, part] of problem.itsData.step5.parts.entries()) {
		const setup = part.setupBySignal?.[moving];
		const field = state.subSteps[part.id];
		const interval = problem.intervals[index];
		if (!setup || !field || !interval)
			throw new Error("Expected interval setup.");
		field.hasOverlap = !setup.hasOverlap;
		expect(validateBoundsStage(field, setup, interval).kind).toBe(
			"misconception",
		);
		field.hasOverlap = setup.hasOverlap;
		field.boundInputs = setup.overlaps.map<ConvolutionBoundInput>(
			/** @param overlap - One connected integration region. */ (
				overlap,
			) => ({
				lowerValues: [
					String(overlap.lowerCandidateValues[0]),
					String(overlap.lowerCandidateValues[1]),
				],
				upperValues: [
					String(overlap.upperCandidateValues[0]),
					String(overlap.upperCandidateValues[1]),
				],
				lower: withZero(overlap.lowerLatex),
				upper: withZero(overlap.upperLatex),
				splits: overlap.splitPointsLatex.map(withZero),
			}),
		);
		for (const stage of ["evaluate", "bounds", "splits"] as const) {
			field.stage = stage;
			expect(
				validateBoundsStage(field, setup, interval).kind,
				`${moving} ${part.id} ${stage}`,
			).toBe("valid");
		}
		const first = field.boundInputs[0];
		if (first && !first.lower.includes("\\infty")) {
			field.stage = "bounds";
			const original = first.lower;
			first.lower = `(${original})+1`;
			expect(validateBoundsStage(field, setup, interval).kind).toBe(
				"misconception",
			);
			first.lower = original;
			expect(validateBoundsStage(field, setup, interval).kind).toBe(
				"valid",
			);
		}
		field.stage = "splits";
		for (const input of field.boundInputs) {
			splitCount += input.splits.length;
			if (input.splits.length) {
				const original = input.splits[0];
				if (!original) throw new Error("Expected split expression.");
				input.splits[0] = `(${original})+1`;
				expect(validateBoundsStage(field, setup, interval).kind).toBe(
					"incorrect",
				);
				input.splits[0] = original;
				expect(validateBoundsStage(field, setup, interval).kind).toBe(
					"valid",
				);
			}
		}
	}
	return splitCount;
}

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
					const solver = verifyTransformedEdges(problem, moving);
					verifyContacts(solver, problem, moving);
					const splits = verifyBounds(problem, moving);
					if (x === "triangle" || h === "triangle")
						expect(splits).toBeGreaterThan(0);
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
