import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { normalizeCanonicalTransform } from "$lib/math-engine/canonical-transform";
import { Complex } from "$lib/math-engine/complex";
import * as evaluator from "$lib/math-engine/evaluator";
import {
	createCtftProblem,
	validateCtftAnswer,
} from "$lib/math-engine/fourier-transform/index";
import {
	createLaplacePfdProblem,
	validateLaplacePfdAnswer,
} from "$lib/math-engine/laplace/index";
import { normalizeTransformNotation } from "$lib/math-engine/transform-notation";
import { validateTransformAnswer } from "$lib/math-engine/transform-validation";
import { propertyOptions } from "$lib/testing/property-options";

/** Supported reference families, independent of the presentation generated below. */
const families = ["delta", "exponential", "gaussian", "rect", "cos"] as const;
/** Semantically empty supported LaTeX spacing commands. */
const spaces = [
	"",
	" ",
	"\t",
	String.raw`\,`,
	String.raw`\;`,
	String.raw`\:`,
	String.raw`\!`,
	String.raw`\quad `,
	String.raw`\qquad `,
	"\\ ",
] as const;

/**
 * @param variable - Expected independent variable, optionally with imaginary frequency.
 * @param sized - Whether to use sizing commands.
 * @param square - Whether to use equivalent square grouping.
 * @param space - Supported presentation whitespace.
 * @returns A complete equation prefix without changing mathematical values.
 */
function prefix(
	variable: string,
	sized: boolean,
	square: boolean,
	space: string,
): string {
	const name = variable === "t" ? "x" : "X";
	const left = square ? "[" : "(",
		right = square ? "]" : ")";
	return `${name}${space}${sized ? "\\left" : ""}${left}${space}${variable}${space}${sized ? "\\right" : ""}${right}${space}=${space}`;
}

/**
 * @param family - Supported CTFT family.
 * @param sized - Whether the equation prefix uses sized delimiters.
 * @param square - Whether the prefix uses bracket grouping.
 * @param space - Empty LaTeX spacing.
 * @param variable - Equivalent frequency notation.
 * @param shift - Generated time shift.
 * @returns Nothing after grading and normalization idempotence checks.
 */
function ctftProperty(
	family: (typeof families)[number],
	sized: boolean,
	square: boolean,
	space: string,
	variable: string,
	shift: number,
): void {
	const problem = createCtftProblem(family, { a: 2, T: 4, w0: 3, t0: shift });
	const answer =
		prefix(variable, sized, square, space) + problem.referenceAnswerLatex;
	expect(validateCtftAnswer(answer, problem).status, answer).toBe("correct");
	const normalized = normalizeTransformNotation(answer, "omega");
	expect(normalizeTransformNotation(normalized, "omega")).toBe(normalized);
}

/**
 * @param sized - Whether the prefix uses sizing commands.
 * @param square - Whether the prefix uses square grouping.
 * @param space - Presentation-only spacing.
 * @param scale - Positive step scaling.
 * @returns Nothing after causal support and indexed-root equivalence checks.
 */
function laplaceProperty(
	sized: boolean,
	square: boolean,
	space: string,
	scale: number,
): void {
	const problem = createLaplacePfdProblem([1, 1], [-1, -4]);
	const answer =
		prefix("t", sized, square, space) +
		String.raw`\frac{\sqrt[\sqrt[4]{16}]{4}}{2}e^{-4t}u(${scale}t)`;
	expect(validateLaplacePfdAnswer(answer, problem).status, answer).toBe(
		"correct",
	);
}

/**
 * @param sized - Whether to vary prefix delimiters.
 * @param space - Empty spacing.
 * @param mutation - Deliberate mathematical error.
 * @returns Nothing after showing presentation cannot hide a structural difference.
 */
function mutationProperty(
	sized: boolean,
	space: string,
	mutation: string,
): void {
	const problem = createLaplacePfdProblem([1, 1], [-1, -4]);
	expect(
		validateLaplacePfdAnswer(
			prefix("t", sized, false, space) + mutation,
			problem,
		).status,
	).not.toBe("correct");
}

/**
 * @param variable - Grading surface.
 * @param invalid - Guaranteed malformed syntax, independent of parser behavior.
 * @param padding - Harmless surrounding whitespace.
 * @returns Nothing after checking malformed input cannot complete either surface.
 */
function malformedProperty(
	variable: "t" | "omega",
	invalid: string,
	padding: string,
): void {
	const reference = {
		variable,
		canonicalTarget: normalizeCanonicalTransform(1, variable),
		samples: [1],
		evaluate: () => new Complex(1),
	};
	expect(
		validateTransformAnswer(padding + invalid + padding, reference).status,
	).not.toBe("correct");
}

/**
 * @param op - Binary operation with the wrong number of operands.
 * @param value - Boxed literal.
 * @returns Nothing after malformed boxed ASTs fail without partial normalization.
 */
function boxedProperty(op: string, value: number): void {
	expect(() =>
		normalizeCanonicalTransform(
			{ fn: [op, { num: String(value) }] },
			"omega",
		),
	).toThrow();
}

describe("transform notation properties", () => {
	/** Valid variants are generated from known references, rather than random strings. */
	it("preserves all CTFT families through prefix and spacing variants", () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...families),
				fc.boolean(),
				fc.boolean(),
				fc.constantFrom(...spaces),
				fc.constantFrom(
					"omega",
					"w",
					String.raw`\omega`,
					"jw",
					"iomega",
					String.raw`j\omega`,
				),
				fc.integer({ min: -2, max: 2 }),
				ctftProperty,
			),
			propertyOptions(),
		);
	}, 310000);
	/** Nested indexed roots must survive bracket normalization. */
	it("preserves Laplace prefixes, nested root indices, and causal factors", () => {
		fc.assert(
			fc.property(
				fc.boolean(),
				fc.boolean(),
				fc.constantFrom(...spaces),
				fc.integer({ min: 1, max: 12 }),
				laplaceProperty,
			),
			propertyOptions(),
		);
	}, 310000);
	/** Changing poles, support, or basis terms must remain a mathematical error. */
	it("does not hide structural mutations with notation rewrites", () => {
		fc.assert(
			fc.property(
				fc.boolean(),
				fc.constantFrom(...spaces),
				fc.constantFrom(
					"e^{-5t}u(t)",
					"e^{-4t}u(-t)",
					"e^{-4t}u(t)+10^{-20}e^{-t}",
					"e^{-4t}u(t)+10^{-20}/(t-100)",
				),
				mutationProperty,
			),
			propertyOptions(),
		);
	}, 310000);
	/** Shrinking preserves the malformed construction instead of guessing an oracle. */
	it("rejects malformed delimiters, prefixes, and multiple equations", () => {
		fc.assert(
			fc.property(
				fc.constantFrom("t" as const, "omega" as const),
				fc.constantFrom(
					"X\\left(omega)=1",
					"X\\left(omega\\right]=1",
					"x(t)=1=1",
					"1+(2]",
					"\\frac{1}{",
					"X\\leftarrow(omega)=1",
					"\\left.1\\right)",
					"(1,1)",
					"X(garbage)=1",
					String.raw`\leftpi/pi`,
					String.raw`\rightpi/pi`,
					String.raw`\lefte/e`,
					String.raw`\leftsqrt{4}/2`,
					String.raw`1\cdotpi/pi`,
					String.raw`1\timespi/pi`,
					"y(t)=1",
				),
				fc.constantFrom("", " ", "\n"),
				malformedProperty,
			),
			propertyOptions(),
		);
	}, 310000);
	/** The same strict arity applies to boxed parser representations. */
	it("rejects malformed boxed AST compositions", () => {
		fc.assert(
			fc.property(
				fc.constantFrom("Divide", "Power", "Root", "Rational"),
				fc.integer({ min: -1000, max: 1000 }),
				boxedProperty,
			),
			propertyOptions(),
		);
	}, 310000);
	/** Explicit fixtures protect every accepted surface even if random generation misses one. */
	it.each(families)(
		"accepts sized prefixes for %s and preserves absolute values and roots",
		/**
		 * @param family - Independently reported signal family, avoiding a combined timing budget.
		 * @returns Nothing after every delimiter and spacing variant is verified.
		 */
		(family) => {
			for (const sized of [true, false])
				for (const square of [true, false])
					for (const space of spaces)
						ctftProperty(
							family,
							sized,
							square,
							space,
							String.raw`\omega`,
							0,
						);
			ctftProperty(family, false, false, "", "omega", -1);
			laplaceProperty(true, false, " ", 2);
			expect(
				normalizeTransformNotation(
					String.raw`\left|\pi\right|`,
					"omega",
				),
			).toBe(String.raw`|\pi|`);
		},
		30000,
	);
	/** Current generator parameter sets and both shift signs retain their reference answers. */
	it("preserves every current generator value across causal and negative shifts", () => {
		for (const family of families) {
			const values =
				family === "rect"
					? [1, 2, 4, 6]
					: family === "cos"
						? [2, 3, 4, 5, 10]
						: [1, 2, 3, 4, 5];
			for (const value of values)
				for (const shift of [-2, -1, 0, 1, 2, 3]) {
					const problem = createCtftProblem(family, {
						a: value,
						T: family === "rect" ? value : 4,
						w0: family === "cos" ? value : 3,
						t0: shift,
					});
					expect(
						validateCtftAnswer(
							problem.referenceAnswerLatex,
							problem,
						).status,
						JSON.stringify({ family, value, shift }),
					).toBe("correct");
				}
		}
	}, 70000);
	/** Failed decimal answers receive guidance, never substitution or a second grading pass. */
	it("suggests symbolic pi without changing decimal semantics", () => {
		const reference = {
			variable: "omega" as const,
			canonicalTarget: normalizeCanonicalTransform("Pi", "omega"),
			samples: [0],
			evaluate: () => new Complex(Math.PI),
		};
		for (const answer of [
			"3.14",
			"3.14…",
			"3.14159265358979323843-3.14159265358979323843+3.14",
		]) {
			const result = validateTransformAnswer(answer, reference);
			expect(result.status).not.toBe("correct");
			expect(result.message).toContain("If you intended the constant pi");
			expect(result.message).toContain("type 'pi' (lowercase)");
			expect(result.message).not.toContain("π");
		}
		for (const answer of ["pi", "π", String.raw`\pi`, "3.141592653589793"])
			expect(validateTransformAnswer(answer, reference).status).toBe(
				"correct",
			);
		expect(validateTransformAnswer("2", reference).message).not.toContain(
			"intended the constant pi",
		);
	});
	/** Resource guards run before the third-party parser allocates its AST. */
	it("rejects oversized and deeply grouped input before parsing", () => {
		const parse = vi.spyOn(evaluator, "parseStrictLatex");
		const reference = {
			variable: "omega" as const,
			canonicalTarget: normalizeCanonicalTransform(1, "omega"),
			samples: [0],
			evaluate: () => new Complex(1),
		};
		try {
			expect(
				validateTransformAnswer("1".repeat(16385), reference).status,
			).toBe("unsupported");
			expect(
				validateTransformAnswer(
					"(".repeat(65) + "1" + ")".repeat(65),
					reference,
				).status,
			).toBe("unsupported");
			expect(parse).not.toHaveBeenCalled();
			expect(
				validateTransformAnswer("1" + " ".repeat(16383), reference)
					.status,
			).toBe("correct");
			expect(parse).toHaveBeenCalledTimes(1);
		} finally {
			parse.mockRestore();
		}
	});
});
