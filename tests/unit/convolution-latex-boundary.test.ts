import { describe, expect, it } from "vitest";
import { withConvolutionItsData } from "$lib/math-engine/convolution/index";

describe("convolution LaTeX construction boundary", () => {
	it("sanitizes every student-facing problem and interval expression", () => {
		const problem = withConvolutionItsData({
			id: "latex-boundary",
			seed: 1,
			pairType: "rect_rect",
			title: "Sanitization fixture",
			xLatex: String.raw`+ \operatorname{rect}(t)`,
			hLatex: String.raw`\operatorname{rect}(t) + - \operatorname{rect}(t-1)`,
			solutionSteps: [],
			intervals: [
				{
					labelLatex: "t < 0",
					min: Number.NEGATIVE_INFINITY,
					max: 0,
					exprLatex: "t - - 1",
					supportIntersectionLatex: String.raw`[0,1] + - [1,2]`,
					integralSetupLatex: String.raw`y(t)=\int_0^1 1 + - 1\,d\tau`,
					flipXSupportIntersectionLatex: String.raw`[0,1] + + [1,2]`,
					flipXIntegralSetupLatex: String.raw`y(t)=\int_0^1 1 - - 1\,d\tau`,
					eval: () => 0,
				},
			],
			eval: () => 0,
			evalX: () => 1,
			evalH: () => 1,
			xBreakpoints: [0, 1],
			hBreakpoints: [0, 1],
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
		});

		expect(problem.xLatex).toBe(String.raw`\operatorname{rect}(t)`);
		expect(problem.hLatex).toBe(
			String.raw`\operatorname{rect}(t) - \operatorname{rect}(t - 1)`,
		);
		expect(problem.intervals[0]).toMatchObject({
			exprLatex: "t + 1",
			supportIntersectionLatex: String.raw`[0,1] - [1,2]`,
			integralSetupLatex: String.raw`y(t)=\int_0^1 1 - 1\,d\tau`,
			flipXSupportIntersectionLatex: String.raw`[0,1] + [1,2]`,
			flipXIntegralSetupLatex: String.raw`y(t)=\int_0^1 1 + 1\,d\tau`,
		});
	});
});
