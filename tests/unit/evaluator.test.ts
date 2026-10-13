import { describe, expect, it } from "vitest";
import {
	evaluateLatexAt,
	evaluatePiecewiseLatexAt,
	normalizeMathLatex,
	tryEvaluateLatexAt,
	validateConvolutionResponse,
	validateLatexAnswer,
} from "$lib/math-engine/evaluator";

describe("Math Engine Evaluator (evaluator.ts)", () => {
	describe("tryEvaluateLatexAt", () => {
		/** Unsupported identifiers and text must remain unevaluable during grading. */
		it.each([
			"mu(t-100)",
			"nu(t-100)",
			String.raw`\operatorname{menu}(t)`,
			String.raw`\text{u(t-100)}`,
			String.raw`\mathrm{u}(t)`,
		])(
			"rejects unsupported named or text input %s",
			/** @param expression - Identifier or formatted text containing u. */
			(expression) => {
				expect(tryEvaluateLatexAt(expression, 2)).toBeNull();
			},
		);
		/** Mathematical brace groups must retain valid unit-step multiplication. */
		it("evaluates unit-step shorthand inside fractions", () => {
			expect(tryEvaluateLatexAt(String.raw`\frac{tu(t-1)}{2}`, 0)).toBe(
				0,
			);
			expect(tryEvaluateLatexAt(String.raw`\frac{tu(t-1)}{2}`, 2)).toBe(
				1,
			);
		});
		/** Unit-step shorthand must preserve support regardless of multiplication syntax. */
		it.each(["tu(t-100)", "t u(t-100)", "t*u(t-100)"])(
			"preserves the delayed support of %s",
			/** @param expression - Equivalent unit-step multiplication spelling. */
			(expression) => {
				expect(tryEvaluateLatexAt(expression, -3)).toBeCloseTo(0);
				expect(tryEvaluateLatexAt(expression, 2)).toBe(0);
			},
		);

		/** Rewriting bare unit steps must not corrupt LaTeX command names. */
		it("preserves LaTeX commands ending in u while handling adjacent bare steps", () => {
			expect(tryEvaluateLatexAt("tu(t-1)", 0)).toBe(0);
			expect(tryEvaluateLatexAt("tu(t-1)", 2)).toBe(2);
			expect(tryEvaluateLatexAt(String.raw`\mu(t-100)`, 2)).toBeNull();
			expect(tryEvaluateLatexAt(String.raw`\nu(t-100)`, 2)).toBeNull();
		});
		/** Strict single-expression evaluation must reject multi-value answers. */
		it("rejects sequences while retaining nested scalar delimiters", () => {
			expect(tryEvaluateLatexAt("(t,99)", 2)).toBeNull();
			expect(tryEvaluateLatexAt("0,invalid", 2)).toBeNull();
			expect(tryEvaluateLatexAt("((2t+4))", 3)).toBe(10);
		});

		/** Unit-step support must be evaluated at the supplied sample time. */
		it("evaluates causal and shifted unit steps on both sides of their onset", () => {
			expect(tryEvaluateLatexAt("3u(t)", -1)).toBe(0);
			expect(tryEvaluateLatexAt("3u(t)", 1)).toBe(3);
			expect(tryEvaluateLatexAt("3u(t-2)", 1)).toBe(0);
			expect(tryEvaluateLatexAt("3u(t-2)", 3)).toBe(3);
			expect(tryEvaluateLatexAt(String.raw`3u\left(t+2\right)`, -1)).toBe(
				3,
			);
			expect(tryEvaluateLatexAt("u(z)", 1)).toBeNull();
		});
		it("evaluates exact polynomial, exponential, and equation-form answers", () => {
			expect(tryEvaluateLatexAt("(t+1)^2", 2)).toBe(9);
			expect(tryEvaluateLatexAt("e^{-t}", 0)).toBe(1);
			expect(tryEvaluateLatexAt("y(t)=2t+1", 3)).toBe(7);
		});

		it("returns null for blank, malformed, unsupported, and non-finite results", () => {
			expect(tryEvaluateLatexAt("", 0)).toBeNull();
			expect(tryEvaluateLatexAt("not valid math", 0)).toBeNull();
			expect(tryEvaluateLatexAt("z+1", 0)).toBeNull();
			expect(tryEvaluateLatexAt("1/0", 0)).toBeNull();
		});
	});
	describe("normalizeMathLatex", () => {
		it("normalizes bare math function names to LaTeX syntax", () => {
			expect(normalizeMathLatex("cos(2t) + sin(3t)")).toBe(
				String.raw`\cos(2t) + \sin(3t)`,
			);
			expect(normalizeMathLatex("exp(-2t) + tan(t)")).toBe(
				String.raw`\exp(-2t) + \tan(t)`,
			);
			expect(normalizeMathLatex("sqrt(s^2 + 4)")).toBe(
				String.raw`\sqrt(s^2 + 4)`,
			);
		});

		it("normalizes bare pi and pi-variable collisions", () => {
			expect(normalizeMathLatex("5cos(100pi t)")).toBe(
				String.raw`5\cos(100\pi t)`,
			);
			expect(normalizeMathLatex("5cos(100pit)")).toBe(
				String.raw`5\cos(100\pi t)`,
			);
			expect(normalizeMathLatex("2*pi*f")).toBe(String.raw`2*\pi*f`);
			expect(normalizeMathLatex("pit")).toBe(String.raw`\pi t`);
		});

		it("replaces LaTeX multiplication symbols with arithmetic operator", () => {
			expect(normalizeMathLatex(String.raw`2 \cdot t + 3 \times s`)).toBe(
				"2  *  t + 3  *  s",
			);
		});

		it("removes LaTeX sizing delimiters", () => {
			expect(
				normalizeMathLatex(String.raw`\left( \frac{1}{2} \right)`),
			).toBe(String.raw`( \frac{1}{2} )`);
		});
	});

	describe("evaluateLatexAt", () => {
		it("evaluates basic algebraic expressions at point t", () => {
			const val = evaluateLatexAt("2t + 5", 3);
			expect(val).toBe(11);
		});

		it("evaluates exponential and trigonometric expressions", () => {
			const val = evaluateLatexAt(String.raw`e^{-2t} + \cos(3t)`, 0);
			expect(val).toBeCloseTo(2, 5);
		});

		it("evaluates bare function and bare pi inputs identically to LaTeX syntax", () => {
			const latexVal = evaluateLatexAt(String.raw`5\cos(100\pi t)`, 0.01);
			const bareVal1 = evaluateLatexAt("5cos(100pi t)", 0.01);
			const bareVal2 = evaluateLatexAt("5cos(100pit)", 0.01);
			const expected = 5 * Math.cos(100 * Math.PI * 0.01);

			expect(latexVal).toBeCloseTo(expected, 4);
			expect(bareVal1).toBeCloseTo(expected, 4);
			expect(bareVal2).toBeCloseTo(expected, 4);
		});

		it("evaluates expressions containing unit step functions u(t)", () => {
			const val = evaluateLatexAt("5 e^{-t} u(t)", 1);
			expect(val).toBeCloseTo(5 * Math.exp(-1), 4);

			const shiftedVal = evaluateLatexAt("3 e^{-2(t-1)} u(t-1)", 2);
			expect(shiftedVal).toBeCloseTo(3 * Math.exp(-2), 4);
		});

		it("evaluates fractions formatted with \\frac", () => {
			const val = evaluateLatexAt(
				String.raw`\frac{3}{4} t + \frac{1}{2}`,
				2,
			);
			expect(val).toBeCloseTo(2, 5);
		});

		it("evaluates complex rational expressions for transfer functions", () => {
			// H(s) = (s + 3) / (s^2 + 4s + 13) at s = 2
			const val = evaluateLatexAt(
				String.raw`\frac{s + 3}{s^2 + 4s + 13}`,
				2,
			);
			const expected = (2 + 3) / (4 + 8 + 13); // 5 / 25 = 0.2
			expect(val).toBeCloseTo(expected, 5);
		});

		it("evaluates square root and power expressions", () => {
			const sqrtVal = evaluateLatexAt(String.raw`\sqrt{s^2 + 16}`, 3);
			expect(sqrtVal).toBeCloseTo(5, 5);

			const powerVal = evaluateLatexAt("(t + 2)^3", 1);
			expect(powerVal).toBe(27);
		});

		it("evaluates nth root expressions (Root AST operator)", () => {
			// \sqrt[3]{t + 7} at t = 1 -> (8)^(1/3) = 2
			const rootVal = evaluateLatexAt(String.raw`\sqrt[3]{t + 7}`, 1);
			expect(rootVal).toBeCloseTo(2, 5);
		});

		it("evaluates tangent, natural logarithm, and common logarithm functions", () => {
			// tan(t) at t = pi/4
			const tanVal = evaluateLatexAt(String.raw`\tan(t)`, Math.PI / 4);
			expect(tanVal).toBeCloseTo(1, 4);

			// ln(t) at t = e
			const lnVal = evaluateLatexAt(String.raw`\ln(t)`, Math.E);
			expect(lnVal).toBeCloseTo(1, 4);

			// log(t) (natural log in MathJSON) at t = e^2
			const logVal = evaluateLatexAt(String.raw`\log(t)`, Math.E ** 2);
			expect(logVal).toBeCloseTo(2, 4);
		});

		it("evaluates absolute value expressions (Abs AST operator)", () => {
			// |t - 5| at t = 2 -> 3
			const absVal = evaluateLatexAt("|t - 5|", 2);
			expect(absVal).toBeCloseTo(3, 5);

			const absLatexVal = evaluateLatexAt(
				String.raw`\left| t - 5 \right|`,
				2,
			);
			expect(absLatexVal).toBeCloseTo(3, 5);
		});

		it("evaluates negation and parenthesized sequence/delimiter AST nodes", () => {
			// -cos(t) at t = 0 -> -1
			const negVal = evaluateLatexAt(String.raw`-\cos(t)`, 0);
			expect(negVal).toBeCloseTo(-1, 5);

			// ((2t + 4)) with nested delimiters at t = 3 -> 10
			const nestedVal = evaluateLatexAt("((2t + 4))", 3);
			expect(nestedVal).toBe(10);
		});

		it("defensively handles division by zero and indeterminate forms by returning 0", () => {
			const divZero = evaluateLatexAt(String.raw`\frac{5}{0}`, 1);
			expect(divZero).toBe(0);
		});

		it("returns 0 gracefully on unparseable / malformed syntax", () => {
			const val = evaluateLatexAt("((( malformed % syntax", 1);
			expect(val).toBe(0);
		});
	});

	describe("evaluatePiecewiseLatexAt", () => {
		it("evaluates piecewise interval expressions with & separators", () => {
			const piecewise = String.raw`\begin{cases} 0, & t < 0 \\ t, & 0 \le t < 1 \\ 2 - t, & 1 \le t \le 2 \\ 0, & t \ge 2 \end{cases}`;
			expect(evaluatePiecewiseLatexAt(piecewise, -1)).toBe(0);
			expect(evaluatePiecewiseLatexAt(piecewise, 0.5)).toBe(0.5);
			expect(evaluatePiecewiseLatexAt(piecewise, 1.5)).toBe(0.5);
			expect(evaluatePiecewiseLatexAt(piecewise, 3)).toBe(0);
		});

		it("evaluates piecewise interval expressions with \\leq and \\geq variants", () => {
			const piecewise = String.raw`\begin{cases} 0, & t < 0 \\ 2t, & 0 \leq t < 2 \\ 4, & t \geq 2 \end{cases}`;
			expect(evaluatePiecewiseLatexAt(piecewise, -0.5)).toBe(0);
			expect(evaluatePiecewiseLatexAt(piecewise, 1)).toBe(2);
			expect(evaluatePiecewiseLatexAt(piecewise, 3)).toBe(4);
		});

		it("evaluates piecewise interval expressions with \\lt and \\gt macros", () => {
			const piecewise = String.raw`\begin{cases} 0, & t \lt 0 \\ 3t, & 0 \le t \lt 2 \\ 6, & t \gt 2 \end{cases}`;
			expect(evaluatePiecewiseLatexAt(piecewise, -1)).toBe(0);
			expect(evaluatePiecewiseLatexAt(piecewise, 1)).toBe(3);
			expect(evaluatePiecewiseLatexAt(piecewise, 3)).toBe(6);
		});

		it("evaluates piecewise interval expressions with \\text{for} syntax", () => {
			const piecewise = String.raw`\begin{cases} 0 \quad \text{for} \quad t < 0 \\ 3t \quad \text{for} \quad 0 \le t < 2 \\ 6 \quad \text{for} \quad t \ge 2 \end{cases}`;
			expect(evaluatePiecewiseLatexAt(piecewise, -1)).toBe(0);
			expect(evaluatePiecewiseLatexAt(piecewise, 1)).toBe(3);
			expect(evaluatePiecewiseLatexAt(piecewise, 4)).toBe(6);
		});

		it("returns 0 when sample point does not match any piecewise interval condition", () => {
			const piecewise = String.raw`\begin{cases} 2t, & 1 \le t \le 2 \end{cases}`;
			expect(evaluatePiecewiseLatexAt(piecewise, 5)).toBe(0);
		});

		it("returns 0 on unclosed cases environment and falls back to single-expression when cases keyword is absent", () => {
			const singleExpr = "2t + 4";
			expect(evaluatePiecewiseLatexAt(singleExpr, 3)).toBe(10);

			const unclosedCases = String.raw`\begin{cases} 2t + 4`;
			expect(evaluatePiecewiseLatexAt(unclosedCases, 3)).toBe(0);
		});

		it("returns 0 for unrecognized or malformed condition strings", () => {
			const piecewise = String.raw`\begin{cases} 2t, & \text{invalid condition syntax} \end{cases}`;
			expect(evaluatePiecewiseLatexAt(piecewise, 1)).toBe(0);
		});
	});

	describe("validateLatexAnswer", () => {
		/** Rejected syntax must not be interpreted as a valid zero-valued answer. */
		it("rejects unevaluable answers against zero while accepting genuine zero", () => {
			/** Supplies a valid zero-valued reference response. */
			const zero = (): number => 0;
			for (const answer of ["(3,7)", "invalid", "1/0"]) {
				expect(validateLatexAnswer(answer, zero).isCorrect).toBe(false);
			}
			expect(validateLatexAnswer("0", zero).isCorrect).toBe(true);
			expect(validateLatexAnswer("t-t", zero).isCorrect).toBe(true);
			/** @param t - Sample time; one undefined reference value must fail grading. */
			const invalidReference = (t: number): number =>
				t === 0.3 ? Number.NaN : 0;
			expect(validateLatexAnswer("0", invalidReference).isCorrect).toBe(
				false,
			);
		});
		it("validates a matching LaTeX answer against reference function", () => {
			const refEval = (t: number): number =>
				2 * Math.exp(-t) + Math.sin(t);
			const result = validateLatexAnswer(
				String.raw`2e^{-t} + \sin(t)`,
				refEval,
			);
			expect(result.isCorrect).toBe(true);
			expect(result.score).toBe(100);
			expect(result.message).toContain("Correct");
		});

		it("validates student answers using bare syntax (cos without backslash)", () => {
			const refEval = (t: number): number => 3 * Math.cos(2 * t);
			const result = validateLatexAnswer("3cos(2t)", refEval);
			expect(result.isCorrect).toBe(true);
			expect(result.score).toBe(100);
		});

		it("rejects an incorrect LaTeX answer", () => {
			const refEval = (t: number): number => 2 * Math.exp(-t);
			const result = validateLatexAnswer("5t + 10", refEval);
			expect(result.isCorrect).toBe(false);
			expect(result.score).toBe(0);
			expect(result.message).toContain("Incorrect");
		});

		it("rejects empty or whitespace-only student submissions with prompt message", () => {
			const refEval = (t: number): number => 2 * t;
			const emptyRes = validateLatexAnswer("", refEval);
			expect(emptyRes.isCorrect).toBe(false);
			expect(emptyRes.score).toBe(0);
			expect(emptyRes.message).toBe(
				"Please enter an answer before submitting.",
			);

			const spaceRes = validateLatexAnswer("   ", refEval);
			expect(spaceRes.isCorrect).toBe(false);
			expect(spaceRes.score).toBe(0);
			expect(spaceRes.message).toBe(
				"Please enter an answer before submitting.",
			);
		});
	});

	describe("validateConvolutionResponse", () => {
		it("validates a matching piecewise convolution solution", () => {
			const piecewise = String.raw`\begin{cases} 0, & t < 0 \\ t, & 0 \le t < 1 \\ 2 - t, & 1 \le t \le 2 \\ 0, & t \ge 2 \end{cases}`;
			const refEval = (t: number): number => {
				if (t < 0) return 0;
				if (t < 1) return t;
				if (t <= 2) return 2 - t;
				return 0;
			};
			const isAccurate = validateConvolutionResponse(
				piecewise,
				refEval,
				[-2, 4],
			);
			expect(isAccurate).toBe(true);
		});

		it("rejects an incorrect convolution expression", () => {
			const refEval = (t: number): number => (t >= 0 && t <= 2 ? 1 : 0);
			const isAccurate = validateConvolutionResponse(
				"5t + 2",
				refEval,
				[-2, 4],
			);
			expect(isAccurate).toBe(false);
		});

		it("returns false for empty or whitespace-only convolution response", () => {
			const refEval = (t: number): number => (t >= 0 ? 1 : 0);
			expect(validateConvolutionResponse("", refEval)).toBe(false);
			expect(validateConvolutionResponse("   ", refEval)).toBe(false);
		});
	});
});
