/**
 * Unit Test Suite for Continuous-Time Convolution Math Engine (TDD Phase 1 - RED).
 * Tests analytical piecewise convolution solvers, numerical integration, and problem generator.
 */

import { describe, expect, it } from "vitest";
import {
	type ConvolutionInterval,
	evalExpDecay,
	evalRect,
	evalTri,
	generateConvolutionProblem,
	solveExpExpConvolution,
	solveMultiRectConvolution,
	solveRectExpConvolution,
	solveRectRectConvolution,
	solveShiftedRectConvolution,
	solveShiftedTriTriConvolution,
	solveTriRectConvolution,
} from "$lib/math-engine/convolution";
import {
	buildConvolutionItsData,
	type ConvolutionItsBuildContext,
	formatConvolutionPiecewiseLatex,
	getFiniteConvolutionTransitionTimes,
} from "$lib/math-engine/convolution/its-scaffolding";

describe("Continuous-Time Convolution Math Engine", () => {
	describe("Primitive Signal Evaluators", () => {
		it("evaluates rectangular pulse rect(t / T) correctly", () => {
			// rect of width 2 centered at t = 1 (active in [0, 2])
			expect(evalRect(-0.5, 0, 2, 3)).toBe(0);
			expect(evalRect(0.5, 0, 2, 3)).toBe(3);
			expect(evalRect(1.5, 0, 2, 3)).toBe(3);
			expect(evalRect(2.5, 0, 2, 3)).toBe(0);
		});

		it("evaluates causal exponential decay K * exp(-a * t) * u(t) correctly", () => {
			expect(evalExpDecay(-1, 2, 5)).toBe(0);
			expect(evalExpDecay(0, 2, 5)).toBe(5);
			expect(evalExpDecay(1, 2, 5)).toBeCloseTo(5 * Math.exp(-2), 4);
		});

		it("evaluates symmetric triangular pulse correctly", () => {
			// tri centered at 0, width 4 (span [-2, 2]), peak 2
			expect(evalTri(-3, 0, 4, 2)).toBe(0);
			expect(evalTri(0, 0, 4, 2)).toBe(2);
			expect(evalTri(1, 0, 4, 2)).toBe(1);
			expect(evalTri(3, 0, 4, 2)).toBe(0);
		});
	});

	describe("Analytical Piecewise Convolution Solvers", () => {
		it("solves triangle-rectangle convolution across edges and the apex", () => {
			const result = solveTriRectConvolution();
			expect(result.eval(-4)).toBe(0);
			expect(result.eval(-2)).toBeCloseTo(0.25);
			expect(result.eval(0)).toBeCloseTo(1.5);
			expect(result.eval(2)).toBeCloseTo(0.25);
			expect(result.eval(3)).toBe(0);
			expect(
				getFiniteConvolutionTransitionTimes(result.intervals),
			).toEqual([-3, -1, 1, 3]);
		});

		it("solves shifted triangle-triangle convolution with cubic symmetry", () => {
			const shift = 2;
			const result = solveShiftedTriTriConvolution(shift);
			expect(result.eval(shift)).toBeCloseTo(4 / 3);
			expect(result.eval(shift - 1)).toBeCloseTo(result.eval(shift + 1));
			expect(result.eval(shift - 3)).toBeCloseTo(1 / 24);
			expect(result.eval(shift + 4)).toBe(0);
			expect(
				getFiniteConvolutionTransitionTimes(result.intervals),
			).toEqual([-2, 0, 2, 4, 6]);
		});
		it("solves Rect(0,2) * Rect(0,2) convolution (Identical Width Rects)", () => {
			// x(t) = rect in [0, 2] with height 1
			// h(t) = rect in [0, 2] with height 1
			// y(t) = x * h is a triangle in [0, 4] peaking at t = 2 with max area 2
			const result = solveRectRectConvolution(
				{ tStart: 0, width: 2, height: 1 },
				{ tStart: 0, width: 2, height: 1 },
			);

			expect(result.eval(-1)).toBe(0);
			expect(result.eval(0)).toBe(0);
			expect(result.eval(1)).toBe(1); // half area
			expect(result.eval(2)).toBe(2); // max overlap area
			expect(result.eval(3)).toBe(1); // receding area
			expect(result.eval(4)).toBe(0);
			expect(result.intervals.length).toBeGreaterThanOrEqual(3);
		});

		it("solves Rect(0,1) * Rect(0,3) convolution (Unequal Width Rects)", () => {
			// x(t) = rect in [0, 1], h(t) = rect in [0, 3]
			// y(t) increases 0->1 in [0, 1], plateaus at 1 in [1, 3], decreases 1->0 in [3, 4]
			const result = solveRectRectConvolution(
				{ tStart: 0, width: 1, height: 1 },
				{ tStart: 0, width: 3, height: 1 },
			);

			expect(result.eval(0.5)).toBe(0.5);
			expect(result.eval(2.0)).toBe(1.0);
			expect(result.eval(3.5)).toBe(0.5);
			expect(result.eval(4.5)).toBe(0);
		});

		it("solves Shifted Rect Pulse convolution (Trapezoid Response)", () => {
			// x(t) in [0, 2], h(t) in [1, 4]
			const result = solveShiftedRectConvolution(
				{ tStart: 0, width: 2, height: 1 },
				{ tStart: 1, width: 3, height: 1 },
			);

			expect(result.pairType).toBe("rect_shifted_rect");
			expect(result.eval(0.5)).toBe(0);
			expect(result.eval(2.0)).toBe(1.0); // growing
			expect(result.eval(3.5)).toBe(2.0); // plateau
			expect(result.eval(5.0)).toBe(1.0); // receding
			expect(result.eval(6.5)).toBe(0);
		});

		it("solves Multi-Rect Pulse Array convolution", () => {
			const result = solveMultiRectConvolution();
			expect(result.pairType).toBe("multi_rect");
			expect(result.eval(0.5)).toBe(0.5);
			expect(result.eval(1.5)).toBe(1.0);
			expect(result.eval(3.5)).toBe(0.5);
			expect(result.eval(4.5)).toBe(1.0);
		});

		it("solves Rect(0,2) * Exponential(a=1) convolution", () => {
			// x(t) = rect in [0, 2] with height 1
			// h(t) = e^{-t} u(t)
			// For t in [0, 2]: integral_0^t e^{-tau} dtau = 1 - e^{-t}
			// For t > 2: integral_{t-2}^t e^{-tau} dtau = e^{-(t-2)} - e^{-t}
			const result = solveRectExpConvolution(
				{ tStart: 0, width: 2, height: 1 },
				{ a: 1, K: 1 },
			);

			expect(result.eval(-0.5)).toBe(0);
			expect(result.eval(1.0)).toBeCloseTo(1 - Math.exp(-1), 4);
			expect(result.eval(3.0)).toBeCloseTo(
				Math.exp(-1) - Math.exp(-3),
				4,
			);
			expect(result.evalX).toBeDefined();
			expect(result.evalH).toBeDefined();
			expect(result.evalH(1)).toBeCloseTo(Math.exp(-1), 4);
		});

		it("solves Exponential(a=1) * Exponential(b=2) convolution", () => {
			// x(t) = e^{-t} u(t), h(t) = e^{-2t} u(t)
			// y(t) = (e^{-t} - e^{-2t}) u(t)
			const result = solveExpExpConvolution(
				{ a: 1, K: 1 },
				{ a: 2, K: 1 },
			);

			expect(result.eval(-1)).toBe(0);
			expect(result.eval(0)).toBe(0);
			expect(result.eval(1)).toBeCloseTo(Math.exp(-1) - Math.exp(-2), 4);
			expect(result.eval(2)).toBeCloseTo(Math.exp(-2) - Math.exp(-4), 4);
		});
	});

	describe("Problem Generator", () => {
		it("reproduces identifiers, parameters, and tutor choices from a seed", () => {
			const first = generateConvolutionProblem("rect_rect", { seed: 42 });
			const second = generateConvolutionProblem("rect_rect", {
				seed: 42,
			});
			expect(second.id).toBe(first.id);
			expect(second.seed).toBe(42);
			expect(second.xLatex).toBe(first.xLatex);
			expect(second.hLatex).toBe(first.hLatex);
			expect(second.itsData).toEqual(first.itsData);
		});

		it.each(["tri_rect", "tri_shifted_tri"] as const)(
			"generates exact %s practice problems",
			(pairType) => {
				const problem = generateConvolutionProblem(pairType, {
					seed: 9,
				});
				expect(problem.pairType).toBe(pairType);
				expect(problem.xBreakpoints).toHaveLength(3);
				expect(problem.hBreakpoints?.length).toBeGreaterThanOrEqual(2);
				expect(problem.itsData.step5.parts).toHaveLength(
					problem.intervals.length,
				);
			},
		);
		it("generates a valid convolution problem for rect_rect pair", () => {
			const problem = generateConvolutionProblem("rect_rect");
			expect(problem.pairType).toBe("rect_rect");
			expect(problem.title).toBeDefined();
			expect(problem.xLatex).toBeDefined();
			expect(problem.hLatex).toBeDefined();
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
			expect(problem.eval(2)).toBeGreaterThanOrEqual(0);
			expect(problem.evalX).toBeDefined();
			expect(problem.evalH).toBeDefined();
			expect(problem.itsData.step6.parts).toHaveLength(
				problem.intervals.length,
			);
			expect(
				problem.itsData.step6.parts.every(
					(part) => part.options.length === 0,
				),
			).toBe(true);
			expect(problem.itsData.step7.resultLatex).toBe(
				formatConvolutionPiecewiseLatex(problem.intervals),
			);
		});

		it("generates a valid convolution problem for rect_shifted_rect pair", () => {
			const problem = generateConvolutionProblem("rect_shifted_rect");
			expect(problem.pairType).toBe("rect_shifted_rect");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});

		it("keeps unshifted, one-shifted, and two-shifted rectangle categories distinct", () => {
			for (let seed = 0; seed < 20; seed += 1) {
				const unshifted = generateConvolutionProblem("rect_rect", {
					seed,
				});
				const oneShifted = generateConvolutionProblem(
					"rect_shifted_rect",
					{ seed },
				);
				const bothShifted = generateConvolutionProblem(
					"rect_both_shifted",
					{ seed },
				);
				const center = (edges: number[]): number =>
					((edges[0] ?? 0) + (edges[1] ?? 0)) / 2;
				const width = (edges: number[]): number =>
					(edges[1] ?? 0) - (edges[0] ?? 0);

				expect(center(unshifted.xSupportEdges)).toBe(0);
				expect(center(unshifted.hSupportEdges)).toBe(0);
				expect(unshifted.xLatex).not.toContain("t -");
				expect(unshifted.hLatex).not.toContain("t -");

				expect(center(oneShifted.xSupportEdges)).toBe(0);
				expect(center(oneShifted.hSupportEdges)).toBeGreaterThan(0);
				expect(oneShifted.xLatex).not.toContain("t -");
				expect(oneShifted.hLatex).toContain("t -");

				expect(center(bothShifted.xSupportEdges)).toBeGreaterThan(0);
				expect(center(bothShifted.hSupportEdges)).toBeGreaterThan(0);
				expect(bothShifted.xLatex).toContain("t -");
				expect(bothShifted.hLatex).toContain("t -");

				for (const problem of [unshifted, oneShifted, bothShifted]) {
					expect(width(problem.xSupportEdges)).not.toBe(
						width(problem.hSupportEdges),
					);
					expect(problem.intervals).toHaveLength(5);
					expect(problem.intervals[0]?.max).toBe(
						(problem.xSupportEdges[0] ?? 0) +
							(problem.hSupportEdges[0] ?? 0),
					);
					expect(problem.intervals.at(-1)?.min).toBe(
						(problem.xSupportEdges[1] ?? 0) +
							(problem.hSupportEdges[1] ?? 0),
					);
					expect(
						problem.eval(
							center(problem.xSupportEdges) +
								center(problem.hSupportEdges),
						),
					).toBeGreaterThan(0);
				}
			}
		});

		it("formats centered rectangular output expressions without double negatives", () => {
			const problem = generateConvolutionProblem("rect_rect", {
				seed: 7,
			});
			expect(
				problem.intervals.map(({ exprLatex }) => exprLatex),
			).not.toEqual(
				expect.arrayContaining([expect.stringContaining("- -")]),
			);
			expect(problem.intervals[1]?.exprLatex).toContain("t +");
		});

		it("generates a valid convolution problem for multi_rect pair", () => {
			const problem = generateConvolutionProblem("multi_rect");
			expect(problem.pairType).toBe("multi_rect");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});

		it("generates a valid convolution problem for rect_exp pair", () => {
			const problem = generateConvolutionProblem("rect_exp");
			expect(problem.pairType).toBe("rect_exp");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
			expect(problem.evalH(0)).toBe(1);
			expect(problem.evalH(1)).toBeGreaterThan(0);
		});

		it("generates a valid convolution problem for exp_exp pair", () => {
			const problem = generateConvolutionProblem("exp_exp");
			expect(problem.pairType).toBe("exp_exp");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});

		it("generates a valid convolution problem for step_exp pair", () => {
			const problem = generateConvolutionProblem("step_exp");
			expect(problem.pairType).toBe("step_exp");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
			expect(problem.eval(0)).toBe(0);
			expect(problem.eval(2)).toBeGreaterThan(0);
		});

		it("generates a valid convolution problem for step_rect pair", () => {
			const problem = generateConvolutionProblem("step_rect");
			expect(problem.pairType).toBe("step_rect");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});

		it.each([
			"rect_rect",
			"rect_shifted_rect",
			"rect_both_shifted",
			"multi_rect",
			"rect_exp",
			"exp_exp",
			"tri_rect",
			"tri_shifted_tri",
			"step_exp",
			"step_rect",
		] as const)(
			"builds a complete seven-step tutor scaffold for %s",
			(pairType) => {
				const problem = generateConvolutionProblem(pairType);
				expect(problem.itsData.step1.parts).toHaveLength(3);
				expect(problem.itsData.step1.intro).toMatch(
					/interval where it can be non-zero/i,
				);
				for (const step of [
					problem.itsData.step2,
					problem.itsData.step7,
				]) {
					expect(step.hints).toHaveLength(3);
					expect(step.options).toHaveLength(4);
					expect(
						step.options.filter(({ isCorrect }) => isCorrect),
					).toHaveLength(1);
				}
				for (const signal of ["x", "h"] as const) {
					const formula =
						problem.itsData.step3.formulaBySignal[signal];
					expect(formula.options).toHaveLength(4);
					expect(
						formula.options.filter(({ isCorrect }) => isCorrect),
					).toHaveLength(1);
					expect(
						problem.itsData.step3.sectionsBySignal[signal].length,
					).toBeGreaterThan(0);
				}
				expect(problem.itsData.step4.intervalLabels).toHaveLength(
					problem.intervals.length,
				);
				expect(
					problem.itsData.step4.transitionGroups.map(
						({ time }) => time,
					),
				).toEqual(
					getFiniteConvolutionTransitionTimes(problem.intervals),
				);
				expect(problem.itsData.step5.parts).toHaveLength(
					problem.intervals.length,
				);
				expect(problem.itsData.step6.parts).toHaveLength(
					problem.intervals.length,
				);
				expect(problem.xSupportEdges.length).toBeGreaterThanOrEqual(2);
				expect(problem.hSupportEdges.length).toBeGreaterThanOrEqual(2);
			},
		);
	});

	describe("Intelligent Tutoring Scaffolding", () => {
		/** Creates one exact interval fixture for deterministic scaffold branches. */
		function interval(
			labelLatex: string,
			min: number,
			max: number,
			exprLatex: string,
		): ConvolutionInterval {
			return { labelLatex, min, max, exprLatex, eval: () => 0 };
		}

		it("deduplicates and sorts only finite analytical transition times", () => {
			expect(
				getFiniteConvolutionTransitionTimes([
					interval("a", Number.NEGATIVE_INFINITY, 2, "0"),
					interval("b", 2, 5, "t"),
					interval("c", 5, Number.POSITIVE_INFINITY, "1"),
				]),
			).toEqual([2, 5]);
		});

		it("formats replacement expressions and falls back when replacements are missing", () => {
			const intervals = [
				interval("t<0", Number.NEGATIVE_INFINITY, 0, "0"),
				interval("t\\ge0", 0, Number.POSITIVE_INFINITY, "t"),
			];
			const formatted = formatConvolutionPiecewiseLatex(intervals, ["1"]);
			expect(formatted).toContain("1 & t<0");
			expect(formatted).toContain("t & t\\ge0");
		});

		/** Creates a minimal structured scaffold context. */
		function context(intervals: ConvolutionInterval[]) {
			return {
				intervals,
				xSections: [
					{
						id: "x-1",
						start: 0,
						end: 1,
						startIncluded: true,
						endIncluded: false,
					},
				],
				hSections: [
					{
						id: "h-1",
						start: 0,
						end: 1,
						startIncluded: true,
						endIncluded: false,
					},
				],
				xBreakpoints: [0, 1],
				hBreakpoints: [0, 1],
			};
		}

		it("builds an empty multipart scaffold for an empty analytical partition", () => {
			const data = buildConvolutionItsData(context([]));
			expect(data.step6.parts).toEqual([]);
			expect(data.step7.resultLatex).toContain("\\begin{cases}");
			expect(data.step4.transitionGroups).toEqual([]);
		});

		it("creates typed setup and evaluation parts for one isolated zero interval", () => {
			const data = buildConvolutionItsData(
				context([
					interval(
						"t\\in\\mathbb{R}",
						Number.NEGATIVE_INFINITY,
						Number.POSITIVE_INFINITY,
						"0",
					),
				]),
			);
			expect(data.step6.parts[0].resultLatex).toContain("y(t)=0");
			expect(data.step5.parts[0].setupBySignal?.x.hasOverlap).toBe(false);
		});

		it("retains zero, linear, repeated, and constant typed expressions", () => {
			const data = buildConvolutionItsData(
				context([
					interval("a", Number.NEGATIVE_INFINITY, 0, "0"),
					interval("b", 0, 1, "t"),
					interval("c", 1, 2, "t"),
					interval("d", 2, Number.POSITIVE_INFINITY, "2"),
				]),
			);
			expect(
				data.step6.parts.map(({ resultLatex }) => resultLatex),
			).toEqual(
				expect.arrayContaining([
					expect.stringContaining("y(t)=0"),
					expect.stringContaining("y(t)=t"),
					expect.stringContaining("y(t)=2"),
				]),
			);
		});

		it("covers left-unbounded and fully unbounded representative interval times", () => {
			const data = buildConvolutionItsData({
				...context([
					interval("t<0", Number.NEGATIVE_INFINITY, 0, "1"),
					interval(
						"t\\in\\mathbb{R}",
						Number.NEGATIVE_INFINITY,
						Number.POSITIVE_INFINITY,
						"1",
					),
				]),
			});
			expect(data.step5.parts).toHaveLength(2);
			expect(data.step5.parts.every((part) => part.setupBySignal)).toBe(
				true,
			);
		});

		it("covers every endpoint convention and negative-infinite translated edges", () => {
			const fixture: ConvolutionItsBuildContext = {
				intervals: [interval("t\\in\\mathbb{R}", -1, 1, "1")],
				xSections: [
					{
						id: "x-both",
						start: Number.NEGATIVE_INFINITY,
						end: Number.NEGATIVE_INFINITY,
						startIncluded: true,
						endIncluded: true,
					},
					{
						id: "x-left-after-flip",
						start: 0,
						end: 2,
						startIncluded: false,
						endIncluded: true,
					},
				],
				hSections: [
					{
						id: "h-neither",
						start: -1,
						end: 1,
						startIncluded: false,
						endIncluded: false,
					},
				],
				xBreakpoints: [Number.NEGATIVE_INFINITY, 0, 2],
				hBreakpoints: [-1, 0, 1],
			};
			const data = buildConvolutionItsData(fixture);
			const sections = data.step3.sectionsBySignal.x;
			expect(
				sections.map(({ includedEndpoint }) => includedEndpoint),
			).toEqual(["both", "left"]);
			expect(sections[0].leftLatex).toBe("\\infty");
			expect(sections[0].originalLatex).toContain("]");
		});

		it("counts overlapping sections, removes duplicate splits, and defaults empty supports", () => {
			const overlapping: ConvolutionItsBuildContext = {
				intervals: [interval("1<t<2", 1, 2, "t")],
				xSections: [
					{
						id: "x-1",
						start: -1,
						end: 2,
						startIncluded: true,
						endIncluded: false,
					},
					{
						id: "x-2",
						start: 0,
						end: 3,
						startIncluded: true,
						endIncluded: false,
					},
				],
				hSections: [
					{
						id: "h-1",
						start: 0,
						end: 1,
						startIncluded: true,
						endIncluded: false,
					},
				],
				xBreakpoints: [-1, 1, 1, 3],
				hBreakpoints: [0, 1],
			};
			const data = buildConvolutionItsData(overlapping);
			expect(data.step4.sectionOverlapCounts.x).toBe(1);
			const overlaps =
				data.step5.parts[0].setupBySignal?.h.overlaps ?? [];
			expect(overlaps).not.toHaveLength(0);
			expect(
				overlaps.every(
					({ splitPointsLatex }) =>
						splitPointsLatex.filter((point) => point === "1")
							.length === 1,
				),
			).toBe(true);

			const empty = buildConvolutionItsData({
				intervals: [],
				xSections: [],
				hSections: [],
				xBreakpoints: [],
				hBreakpoints: [],
			});
			expect(
				empty.step1.parts.map(({ start, end }) => [start, end]),
			).toEqual([
				[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
				[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
				[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
			]);
		});
	});
});
