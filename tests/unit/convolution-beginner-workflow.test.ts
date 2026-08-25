import { describe, expect, it } from "vitest";
import { parseConvolutionScalarInput } from "$lib/components/solvers/convolution-solver-state/expression-validation";
import {
	createBoundsState,
	validateBoundsStage,
} from "$lib/components/solvers/convolution-solver-state/step5-bounds";
import {
	createEvaluationState,
	intervalSampleTimes,
	validateEvaluationStage,
} from "$lib/components/solvers/convolution-solver-state/step6-evaluation";
import {
	type ConvolutionProblemSelection,
	generateConfiguredConvolutionProblem,
	TEXTBOOK_CONVOLUTION_SELECTION,
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
} from "$lib/math-engine/convolution/index";
import { buildEvaluationTerms } from "$lib/math-engine/convolution/its-scaffolding/evaluation-terms";

function configured(
	xType: "rect" | "triangle" | "multi_rect" | "exponential",
	hType: "rect" | "triangle" | "multi_rect" | "exponential",
): ConvolutionProblemSelection {
	return {
		x: {
			...TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
			componentAmplitudes: ["default", "default"],
			type: xType,
		},
		h: {
			...TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
			componentAmplitudes: ["default", "default"],
			type: hType,
		},
	};
}

describe("convolution beginner workflow metadata", () => {
	it("describes fixed and transformed intervals before revealing overlap", () => {
		const problem = generateConfiguredConvolutionProblem(
			TEXTBOOK_CONVOLUTION_SELECTION,
			{ seed: 4 },
		);
		const exterior = problem.itsData.step5.parts[0].setupBySignal?.h;
		const interior = problem.itsData.step5.parts.find(
			(part) => part.setupBySignal?.h.hasOverlap,
		)?.setupBySignal?.h;
		expect(exterior?.intervalComparisons).toHaveLength(1);
		expect(exterior?.intervalComparisons[0]).toMatchObject({
			fixedIntervalLatex: expect.stringContaining("t_{x"),
			transformedIntervalLatex: expect.stringContaining("t-t_{h"),
			hasOverlap: false,
		});
		expect(interior?.intervalComparisons[0]?.hasOverlap).toBe(true);
	});

	it("validates symbolic bounds and split work", () => {
		const problem = generateConfiguredConvolutionProblem(
			configured("triangle", "triangle"),
			{ seed: 7 },
		);
		const part = problem.itsData.step5.parts.find(
			(candidate) => candidate.setupBySignal?.h.hasOverlap,
		);
		const setup = part?.setupBySignal?.h;
		if (!part || !setup) throw new Error("Expected overlap setup.");
		const state = createBoundsState(problem).subSteps[part.id];
		expect(validateBoundsStage(state, setup).kind).toBe("blank");
		state.hasOverlap = false;
		expect(validateBoundsStage(state, setup).kind).toBe("misconception");
		state.hasOverlap = true;
		state.stage = "bounds";
		state.boundInputs = setup.overlaps.map((overlap) => ({
			lowerValues: ["", ""],
			upperValues: ["", ""],
			lower: "",
			upper: "",
			splits: overlap.splitPointsLatex.map(() => ""),
		}));
		expect(validateBoundsStage(state, setup).kind).toBe("blank");
		setup.overlaps.forEach((overlap, index) => {
			state.boundInputs[index].lower = overlap.lowerLatex;
			state.boundInputs[index].upper = overlap.upperLatex;
		});
		expect(validateBoundsStage(state, setup).kind).toBe("valid");
	});

	it("diagnoses every staged bounds field and completes split-point work", () => {
		const problem = generateConfiguredConvolutionProblem(
			configured("triangle", "triangle"),
			{ seed: 7 },
		);
		const part = problem.itsData.step5.parts.find((candidate) =>
			candidate.setupBySignal?.h.overlaps.some(
				(overlap) => overlap.splitPointsLatex.length > 0,
			),
		);
		const setup = part?.setupBySignal?.h;
		if (!part || !setup) throw new Error("Expected split overlap setup.");
		const state = createBoundsState(problem).subSteps[part.id];
		state.hasOverlap = true;
		state.stage = "bounds";
		state.boundInputs = setup.overlaps.map((overlap) => ({
			lowerValues: ["", ""],
			upperValues: ["", ""],
			lower: "",
			upper: "",
			splits: overlap.splitPointsLatex.map(() => ""),
		}));
		expect(validateBoundsStage(state, setup).kind).toBe("blank");
		setup.overlaps.forEach((overlap, index) => {
			state.boundInputs[index].lower = "999";
			state.boundInputs[index].upper = overlap.upperLatex;
		});
		expect(validateBoundsStage(state, setup).kind).toBe("misconception");
		setup.overlaps.forEach((overlap, index) => {
			state.boundInputs[index].lower = overlap.lowerLatex;
			state.boundInputs[index].upper = "999";
		});
		expect(validateBoundsStage(state, setup).kind).toBe("misconception");
		setup.overlaps.forEach((overlap, index) => {
			state.boundInputs[index].upper = overlap.upperLatex;
		});
		expect(validateBoundsStage(state, setup)).toMatchObject({
			kind: "valid",
			nextStage: "splits",
		});
		state.stage = "splits";
		expect(validateBoundsStage(state, setup).kind).toBe("blank");
		setup.overlaps.forEach((overlap, index) => {
			state.boundInputs[index].splits = overlap.splitPointsLatex.map(
				() => "999",
			);
		});
		expect(validateBoundsStage(state, setup).kind).toBe("incorrect");
		setup.overlaps.forEach((overlap, index) => {
			state.boundInputs[index].splits = [...overlap.splitPointsLatex];
		});
		expect(validateBoundsStage(state, setup).kind).toBe("valid");
		const exterior = problem.itsData.step5.parts[0].setupBySignal?.h;
		if (!exterior) throw new Error("Expected exterior setup.");
		const exteriorState =
			createBoundsState(problem).subSteps[
				problem.itsData.step5.parts[0].id
			];
		exteriorState.hasOverlap = false;
		expect(validateBoundsStage(exteriorState, exterior).kind).toBe("valid");
	});

	it("derives concrete polynomial and exponential evaluation terms", () => {
		for (const selection of [
			configured("rect", "rect"),
			configured("triangle", "triangle"),
			{
				...configured("triangle", "rect"),
				x: {
					...configured("triangle", "rect").x,
					shiftState: "shifted" as const,
					shiftValue: "1" as const,
				},
			},
			configured("exponential", "rect"),
			configured("rect", "exponential"),
			configured("exponential", "exponential"),
		]) {
			const problem = generateConfiguredConvolutionProblem(selection, {
				seed: 13,
			});
			const terms = problem.itsData.step6.parts.flatMap(
				(part) => part.evaluationBySignal?.h ?? [],
			);
			expect(terms.length).toBeGreaterThan(0);
			expect(terms.every((term) => term.integrandLatex.length > 0)).toBe(
				true,
			);
			expect(
				terms.every((term) => term.primitiveLatex.includes("F")),
			).toBe(true);
		}
	});

	it("handles incomplete and out-of-range evaluation metadata defensively", () => {
		const problem = generateConfiguredConvolutionProblem(
			TEXTBOOK_CONVOLUTION_SELECTION,
			{ seed: 3 },
		);
		const partIndex = problem.itsData.step5.parts.findIndex(
			(candidate) => candidate.setupBySignal?.h.hasOverlap,
		);
		const setup = problem.itsData.step5.parts[partIndex]?.setupBySignal?.h;
		const interval = problem.intervals[partIndex];
		if (!setup || !interval || !problem.resolvedSignals)
			throw new Error("Expected configured evaluation context.");
		const context = {
			seed: problem.seed,
			intervals: problem.intervals,
			xSections: problem.resolvedSignals.x.sections,
			hSections: problem.resolvedSignals.h.sections,
			xBreakpoints: problem.xBreakpoints ?? [],
			hBreakpoints: problem.hBreakpoints ?? [],
			resolvedSignals: problem.resolvedSignals,
		};
		expect(buildEvaluationTerms(interval, undefined, context, "h")).toEqual(
			[],
		);
		expect(
			buildEvaluationTerms(
				interval,
				setup,
				{ ...context, resolvedSignals: undefined },
				"h",
			),
		).toEqual([]);

		const invalidLower = structuredClone(setup);
		invalidLower.overlaps[0].lowerLatex = "(";
		expect(
			buildEvaluationTerms(interval, invalidLower, context, "h"),
		).toEqual([]);
		const invalidUpper = structuredClone(setup);
		invalidUpper.overlaps[0].upperLatex = "(";
		expect(
			buildEvaluationTerms(interval, invalidUpper, context, "h"),
		).toEqual([]);

		const missingFixedPiece = {
			...context,
			resolvedSignals: {
				...context.resolvedSignals,
				x: { ...context.resolvedSignals.x, pieces: [] },
			},
		};
		expect(
			buildEvaluationTerms(interval, setup, missingFixedPiece, "h"),
		).toEqual([]);
		const missingMovingPiece = {
			...context,
			resolvedSignals: {
				...context.resolvedSignals,
				h: { ...context.resolvedSignals.h, pieces: [] },
			},
		};
		expect(
			buildEvaluationTerms(interval, setup, missingMovingPiece, "h"),
		).toEqual([]);

		const fallbackLower = structuredClone(setup);
		fallbackLower.overlaps[0].lowerLatex = undefined as never;
		expect(
			buildEvaluationTerms(interval, fallbackLower, context, "h").length,
		).toBeGreaterThanOrEqual(0);
		const fallbackUpper = structuredClone(setup);
		fallbackUpper.overlaps[0].upperLatex = undefined as never;
		expect(
			buildEvaluationTerms(interval, fallbackUpper, context, "h").length,
		).toBeGreaterThanOrEqual(0);
	});

	it("rejects malformed, wrong-bound, and reversed-sign evaluation work", () => {
		const problem = generateConfiguredConvolutionProblem(
			TEXTBOOK_CONVOLUTION_SELECTION,
			{ seed: 2 },
		);
		const part = problem.itsData.step6.parts.find(
			(candidate) => (candidate.evaluationBySignal?.h.length ?? 0) > 0,
		);
		if (!part) throw new Error("Expected evaluation part.");
		const index = problem.itsData.step6.parts.indexOf(part);
		const interval = problem.intervals[index];
		const state = createEvaluationState(problem, "h").subSteps[part.id];
		const term = part.evaluationBySignal?.h[0];
		const input = state.termInputs[0];
		if (!term || !input) throw new Error("Expected evaluation term.");
		expect(
			validateEvaluationStage(
				state,
				part,
				"h",
				interval.exprLatex,
				interval.min,
				interval.max,
			).kind,
		).toBe("blank");
		input.amplitudeProduct = "(";
		expect(
			validateEvaluationStage(
				state,
				part,
				"h",
				interval.exprLatex,
				interval.min,
				interval.max,
			).kind,
		).toBe("malformed");
		input.amplitudeProduct = term.geometry?.amplitudeProductLatex ?? "1";
		state.stage = "upper";
		input.upper = term.lowerSubstitutionLatex;
		expect(
			validateEvaluationStage(
				state,
				part,
				"h",
				interval.exprLatex,
				interval.min,
				interval.max,
			).kind,
		).toBe("incorrect");
		input.upper = term.upperSubstitutionLatex;
		state.stage = "difference";
		input.difference = `(${term.lowerSubstitutionLatex})-(${term.upperSubstitutionLatex})`;
		expect(
			validateEvaluationStage(
				state,
				part,
				"h",
				interval.exprLatex,
				interval.min,
				interval.max,
			).kind,
		).toBe("incorrect");
	});

	it("validates every evaluation stage and the final combined expression", () => {
		const problem = generateConfiguredConvolutionProblem(
			TEXTBOOK_CONVOLUTION_SELECTION,
			{ seed: 2 },
		);
		const part = problem.itsData.step6.parts.find(
			(candidate) => (candidate.evaluationBySignal?.h.length ?? 0) > 0,
		);
		if (!part) throw new Error("Expected evaluation part.");
		const interval =
			problem.intervals[problem.itsData.step6.parts.indexOf(part)];
		const state = createEvaluationState(problem, "h").subSteps[part.id];
		const term = part.evaluationBySignal?.h[0];
		const input = state.termInputs[0];
		if (!term?.geometry || !input)
			throw new Error("Expected rectangle term.");
		const validate = () =>
			validateEvaluationStage(
				state,
				part,
				"h",
				interval.exprLatex,
				interval.min,
				interval.max,
			);
		for (const [stage, key, expected, nextStage] of [
			[
				"geometry-amplitude",
				"amplitudeProduct",
				term.geometry.amplitudeProductLatex,
				"geometry-width",
			],
			[
				"geometry-width",
				"overlapWidth",
				term.geometry.overlapWidthLatex,
				"upper",
			],
			["upper", "upper", term.upperSubstitutionLatex, "lower"],
			["lower", "lower", term.lowerSubstitutionLatex, "difference"],
		] as const) {
			state.stage = stage;
			input[key] = "";
			expect(validate().kind).toBe("blank");
			input[key] = "(";
			expect(validate().kind).toBe("malformed");
			input[key] = "999";
			expect(validate().kind).toBe("incorrect");
			input[key] = expected;
			expect(validate()).toMatchObject({ kind: "valid", nextStage });
		}
		state.stage = "difference";
		input.difference = term.differenceLatex;
		expect(validate()).toMatchObject({
			kind: "valid",
			nextStage: "combined",
		});
		state.stage = "combined";
		state.input = "";
		expect(validate().kind).toBe("blank");
		state.input = "(";
		expect(validate().kind).toBe("malformed");
		state.input = "999";
		expect(validate().kind).toBe("incorrect");
		state.input = interval.exprLatex;
		expect(validate().kind).toBe("valid");
		state.stage = "upper";
		state.activeTermIndex = 99;
		expect(validate()).toMatchObject({
			kind: "valid",
			nextStage: "combined",
		});
	});

	it("advances from one split evaluation term to the next", () => {
		const problem = generateConfiguredConvolutionProblem(
			configured("triangle", "triangle"),
			{ seed: 7 },
		);
		const part = problem.itsData.step6.parts.find(
			(candidate) => (candidate.evaluationBySignal?.h.length ?? 0) > 1,
		);
		if (!part) throw new Error("Expected split evaluation part.");
		const interval =
			problem.intervals[problem.itsData.step6.parts.indexOf(part)];
		const state = createEvaluationState(problem, "h").subSteps[part.id];
		const first = part.evaluationBySignal?.h[0];
		if (!first) throw new Error("Expected first split term.");
		state.stage = "difference";
		state.termInputs[0].difference = first.differenceLatex;
		expect(
			validateEvaluationStage(
				state,
				part,
				"h",
				interval.exprLatex,
				interval.min,
				interval.max,
			),
		).toMatchObject({
			kind: "valid",
			nextTermIndex: 1,
			nextStage: "upper",
		});

		const rectangleProblem = generateConfiguredConvolutionProblem(
			TEXTBOOK_CONVOLUTION_SELECTION,
			{ seed: 2 },
		);
		const rectanglePart = rectangleProblem.itsData.step6.parts.find(
			(candidate) =>
				candidate.evaluationBySignal?.h[0]?.geometry !== undefined,
		);
		const rectangleTerm = rectanglePart?.evaluationBySignal?.h[0];
		if (!rectanglePart || !rectangleTerm)
			throw new Error("Expected rectangle geometry term.");
		const syntheticPart = structuredClone(rectanglePart);
		syntheticPart.evaluationBySignal = {
			x: [rectangleTerm, rectangleTerm],
			h: [rectangleTerm, rectangleTerm],
		};
		const syntheticState = createEvaluationState(
			{
				...rectangleProblem,
				itsData: {
					...rectangleProblem.itsData,
					step6: {
						...rectangleProblem.itsData.step6,
						parts: [syntheticPart],
					},
				},
			},
			"h",
		).subSteps[syntheticPart.id];
		syntheticState.stage = "difference";
		syntheticState.termInputs[0].difference = rectangleTerm.differenceLatex;
		expect(
			validateEvaluationStage(
				syntheticState,
				syntheticPart,
				"h",
				"0",
				-1,
				1,
			),
		).toMatchObject({
			kind: "valid",
			nextTermIndex: 1,
			nextStage: "geometry-amplitude",
		});

		const metadataFreePart = structuredClone(rectanglePart);
		delete metadataFreePart.evaluationBySignal;
		const metadataFreeProblem = {
			...rectangleProblem,
			itsData: {
				...rectangleProblem.itsData,
				step6: {
					...rectangleProblem.itsData.step6,
					parts: [metadataFreePart],
				},
			},
		};
		const metadataFreeState = createEvaluationState(
			metadataFreeProblem,
			"h",
		).subSteps[metadataFreePart.id];
		metadataFreeState.stage = "upper";
		expect(
			validateEvaluationStage(
				metadataFreeState,
				metadataFreePart,
				"h",
				"0",
				-1,
				1,
			),
		).toMatchObject({ kind: "valid", nextStage: "combined" });
	});

	it("parses infinity with Typst oo notation alongside standard formats", () => {
		expect(parseConvolutionScalarInput("oo")).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(parseConvolutionScalarInput("+oo")).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(parseConvolutionScalarInput("-oo")).toBe(
			Number.NEGATIVE_INFINITY,
		);
		expect(parseConvolutionScalarInput("infinity")).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(parseConvolutionScalarInput("-infinity")).toBe(
			Number.NEGATIVE_INFINITY,
		);
		expect(parseConvolutionScalarInput("inf")).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(parseConvolutionScalarInput("-inf")).toBe(
			Number.NEGATIVE_INFINITY,
		);
		expect(parseConvolutionScalarInput("\\infty")).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(parseConvolutionScalarInput("-\\infty")).toBe(
			Number.NEGATIVE_INFINITY,
		);
		expect(parseConvolutionScalarInput("∞")).toBe(Number.POSITIVE_INFINITY);
		expect(parseConvolutionScalarInput("-∞")).toBe(
			Number.NEGATIVE_INFINITY,
		);
		expect(Number.isNaN(parseConvolutionScalarInput("foo"))).toBe(true);
		expect(Number.isNaN(parseConvolutionScalarInput("wood"))).toBe(true);
	});

	it("validates evaluate stage before symbolic bounds", () => {
		const problem = generateConfiguredConvolutionProblem(
			configured("triangle", "triangle"),
			{ seed: 7 },
		);
		const part = problem.itsData.step5.parts.find(
			(candidate) => candidate.setupBySignal?.h.hasOverlap,
		);
		const setup = part?.setupBySignal?.h;
		if (!part || !setup) throw new Error("Expected overlap setup.");
		const state = createBoundsState(problem).subSteps[part.id];
		state.hasOverlap = true;
		state.stage = "evaluate";
		expect(validateBoundsStage(state, setup).kind).toBe("blank");

		state.boundInputs = setup.overlaps.map(() => ({
			lowerValues: ["999", "999"],
			upperValues: ["999", "999"],
			lower: "",
			upper: "",
			splits: [],
		}));
		expect(validateBoundsStage(state, setup).kind).toBe("incorrect");

		state.boundInputs = setup.overlaps.map((overlap) => ({
			lowerValues: [
				String(overlap.lowerCandidateValues[0]),
				String(overlap.lowerCandidateValues[1] ?? ""),
			],
			upperValues: ["999", "999"],
			lower: "",
			upper: "",
			splits: [],
		}));
		expect(validateBoundsStage(state, setup).kind).toBe("incorrect");

		state.boundInputs = setup.overlaps.map((overlap) => ({
			lowerValues: [
				String(overlap.lowerCandidateValues[0]),
				String(overlap.lowerCandidateValues[1] ?? ""),
			],
			upperValues: [
				String(overlap.upperCandidateValues[0]),
				String(overlap.upperCandidateValues[1] ?? ""),
			],
			lower: "",
			upper: "",
			splits: [],
		}));
		expect(validateBoundsStage(state, setup)).toMatchObject({
			kind: "valid",
			nextStage: "bounds",
		});
	});
});
