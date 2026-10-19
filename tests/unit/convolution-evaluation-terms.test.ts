/** Independent checks of the concrete exponential teaching ledger. */
import { describe, expect, it } from "vitest";
import {
	generateConfiguredConvolutionProblem,
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
} from "$lib/math-engine/convolution/index";
import {
	evaluateMathJsonStrict,
	parseStrictLatex,
	tryEvaluateLatexAt,
} from "$lib/math-engine/evaluator";

describe("convolution exponential teaching formulas", () => {
	/** Default exponential work omits zero shifts while preserving both signal factors. */
	it.each(["h", "x"] as const)(
		"omits redundant zero shifts when moving %s",
		/** @param moving - Reflected signal. */
		(moving) => {
			const selection = {
				...TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
				type: "exponential" as const,
			};
			const problem = generateConfiguredConvolutionProblem(
				{ x: selection, h: selection },
				{ seed: 13 },
			);
			const terms =
				problem.itsData.step6.parts[1]?.evaluationBySignal?.[moving];
			if (!terms?.length)
				throw new Error("Expected exponential evaluation terms.");
			for (const term of terms) {
				for (const latex of [
					term.fixedPieceLatex,
					term.movingPieceLatex,
					term.integrandLatex,
					term.primitiveLatex,
				]) {
					expect(latex).not.toMatch(
						/-\s*0\b|e\^\{0\}|e\^\{[^{}]*\(0\)\}/,
					);
				}
				const fixed = moving === "h" ? problem.evalX : problem.evalH;
				const movingEval =
					moving === "h" ? problem.evalH : problem.evalX;
				expect(
					evaluateMathJsonStrict(
						parseStrictLatex(term.fixedPieceLatex),
						{
							t: 2,
							tau: 0.5,
						},
					),
				).toBeCloseTo(fixed(0.5), 12);
				expect(
					evaluateMathJsonStrict(
						parseStrictLatex(term.movingPieceLatex),
						{
							t: 2,
							tau: 0.5,
						},
					),
				).toBeCloseTo(movingEval(1.5), 12);
			}
		},
	);
	/** Both moving paths must show the actual factors and their integrated sum. */
	it.each(["h", "x"] as const)(
		"preserves shifted exponential work when moving %s",
		/** @param moving - Reflected signal. */ (moving) => {
			const problem = generateConfiguredConvolutionProblem(
				{
					x: {
						...TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
						type: "exponential",
						shiftState: "shifted",
						shiftValue: "2",
					},
					h: {
						...TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION,
						type: "exponential",
						shiftState: "shifted",
						shiftValue: "-1",
					},
				},
				{ seed: 13 },
			);
			const time = 2;
			const terms =
				problem.itsData.step6.parts[1]?.evaluationBySignal?.[moving];
			if (!terms)
				throw new Error("Expected exponential evaluation terms.");
			expect(terms.length).toBeGreaterThan(0);
			let integral = 0;
			for (const term of terms) {
				const lower = tryEvaluateLatexAt(term.lowerLatex, time);
				const upper = tryEvaluateLatexAt(term.upperLatex, time);
				if (lower === null || upper === null)
					throw new Error("Expected finite overlap bounds.");
				const tau = (lower + upper) / 2;
				const fixed = moving === "h" ? problem.evalX : problem.evalH;
				const movingEval =
					moving === "h" ? problem.evalH : problem.evalX;
				const fixedValue = evaluateMathJsonStrict(
					parseStrictLatex(term.fixedPieceLatex),
					{ t: time, tau },
				);
				const movingValue = evaluateMathJsonStrict(
					parseStrictLatex(term.movingPieceLatex),
					{ t: time, tau },
				);
				expect(fixedValue).toBeCloseTo(fixed(tau), 12);
				expect(movingValue).toBeCloseTo(movingEval(time - tau), 12);
				expect(term.integrandLatex).not.toMatch(/\d\.\d{8}/);
				const contribution = tryEvaluateLatexAt(
					term.differenceLatex,
					time,
				);
				if (contribution === null)
					throw new Error("Expected finite contribution.");
				integral += contribution;
			}
			// Independent midpoint quadrature over the active support.
			const resolved = problem.resolvedSignals;
			if (!resolved) throw new Error("Expected configured signals.");
			const start = resolved.x.shift;
			const end = time - resolved.h.shift;
			const width = (end - start) / 1000;
			let quadrature = 0;
			for (let index = 0; index < 1000; index++) {
				const tau = start + (index + 0.5) * width;
				quadrature +=
					problem.evalX(tau) * problem.evalH(time - tau) * width;
			}
			expect(integral).toBeCloseTo(quadrature, 6);
		},
	);
});
