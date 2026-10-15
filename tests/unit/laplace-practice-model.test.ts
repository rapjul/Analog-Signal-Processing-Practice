import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	createLaplacePfdProblem,
	determineStability,
	validateLaplacePfdAnswer,
} from "$lib/math-engine/laplace";
import { propertyOptions } from "$lib/testing/property-options";

describe("Laplace practice model", () => {
	/** Integer-scaled decimal inputs provide an independent cancellation oracle. */
	it("preserves exact decimal cancellation and reference answers across generated parameter combinations", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 9 }),
				fc.integer({ min: 0, max: 100 }),
				fc.uniqueArray(fc.integer({ min: 1, max: 9 }), {
					minLength: 2,
					maxLength: 2,
				}),
				/**
				 * @param linear - Numerator slope scaled by ten.
				 * @param constant - Numerator intercept scaled by one hundred.
				 * @param roots - Distinct negative pole magnitudes scaled by ten.
				 * @returns Nothing after independent exact cancellation and grading checks.
				 */
				(linear, constant, roots) => {
					const poles: [number, number] = [
						-roots[0]! / 10,
						-roots[1]! / 10,
					];
					const problem = createLaplacePfdProblem(
						[linear / 10, constant / 100],
						poles,
					);
					const expected: number[] = [];
					for (const root of roots)
						if (constant !== linear * root)
							expected.push(-root / 10);
					expect(problem.pfd.poles).toEqual(expected);
					expect(
						validateLaplacePfdAnswer(
							problem.referenceAnswerLatex,
							problem,
						).status,
					).toBe("correct");
				},
			),
			propertyOptions(),
		);
	}, 310000);
	/** Decimal root subtraction is exact before residue construction and formatting. */
	it("retains exact residues for decimal poles and exact decimal cancellations", () => {
		const problem = createLaplacePfdProblem([0, 1], [-0.3, -0.1]);
		expect(problem.pfd.residues).toEqual([-5, 5]);
		expect(problem.referenceAnswerLatex).toBe(
			"- 5e^{-0.3t} u(t) + 5e^{-0.1t} u(t)",
		);
		expect(
			validateLaplacePfdAnswer(problem.referenceAnswerLatex, problem)
				.status,
		).toBe("correct");
		const canceled = createLaplacePfdProblem([0.1, 0.07], [-0.7, -1.4]);
		expect(canceled.pfd.poles).toEqual([-1.4]);
		expect(canceled.pfd.residues).toEqual([0.1]);
		expect(
			validateLaplacePfdAnswer(canceled.referenceAnswerLatex, canceled)
				.status,
		).toBe("correct");
	});
	/** Floating cancellation must not remove a genuine pole or omit it from the worked answer. */
	it("retains exact nonzero residues when floating products cancel", () => {
		for (const numerator of [
			[0.1, 0.30000000000000004],
			[3333333333333333, 10000000000000000],
		] as [number, number][]) {
			const problem = createLaplacePfdProblem(numerator, [-3, -4]);
			expect(problem.pfd.poles).toEqual([-3, -4]);
			expect(
				validateLaplacePfdAnswer(problem.referenceAnswerLatex, problem)
					.status,
			).toBe("correct");
			expect(
				determineStability(problem.pfd.poles, "right-sided").rocLatex,
			).toBe(String.raw`\operatorname{Re}(s) > -3`);
		}
	});
	/** Roots and fractional powers must not disguise delayed time-domain tails. */
	it("rejects root-based tails while retaining constant-root coefficients", () => {
		const problem = createLaplacePfdProblem([1, 1], [-1, -4]);
		for (const term of [
			String.raw`\sqrt{(t-100)^2}+t-100`,
			String.raw`\sqrt[4]{(t-100)^4}+t-100`,
			String.raw`((t-100)^2)^{1/2}+t-100`,
			String.raw`(\sqrt{(t-100)^2}+t-100)^2`,
		]) {
			expect(
				validateLaplacePfdAnswer(
					`(${problem.referenceAnswerLatex})+${term}`,
					problem,
				).status,
			).toBe("unsupported");
		}
		for (const coefficient of [
			String.raw`\sqrt{4}/2`,
			String.raw`\sqrt[4]{16}/2`,
		]) {
			expect(
				validateLaplacePfdAnswer(
					`(${coefficient})(${problem.referenceAnswerLatex})`,
					problem,
				).status,
				coefficient,
			).toBe("correct");
		}
	});
	/** A late absolute-value hinge must not pass as the causal inverse response. */
	it("rejects hidden absolute-value tails in Laplace answers", () => {
		const problem = createLaplacePfdProblem([1, 1], [-1, -4]);
		for (const term of ["|t-100|+t-100", "(|t-100|+t-100)u(t)"]) {
			expect(
				validateLaplacePfdAnswer(
					`(${problem.referenceAnswerLatex})+${term}`,
					problem,
				).status,
			).toBe("unsupported");
		}
		expect(
			validateLaplacePfdAnswer(
				`|-1|(${problem.referenceAnswerLatex})`,
				problem,
			).status,
		).toBe("correct");
	});
	/** Delayed terms outside every probe must be rejected before sampling. */
	it("rejects extra support boundaries while accepting equivalent causal factors", () => {
		const problem = createLaplacePfdProblem([1, 1], [-1, -4]);
		for (const term of ["u(t-100)", "u(t+100)", "u(t^2-10000)"]) {
			expect(
				validateLaplacePfdAnswer(
					`(${problem.referenceAnswerLatex})+${term}`,
					problem,
				).status,
			).toBe("unsupported");
		}
		for (const step of ["u(t)", "u(2t)", "u(t-0)"]) {
			expect(
				validateLaplacePfdAnswer(`e^{-4t}${step}`, problem).status,
			).toBe("correct");
		}
		expect(validateLaplacePfdAnswer("e^{-4t}u(-t)", problem).status).toBe(
			"incorrect",
		);
	});
	/** Canceled roots must not constrain the ROC or corrupt residue indexing. */
	it("excludes cancellations at either denominator root from pole metadata", () => {
		for (const [constant, pole] of [
			[1, -4],
			[4, -1],
		] as const) {
			const problem = createLaplacePfdProblem([1, constant], [-1, -4]);
			expect(problem.pfd.denominatorRoots).toEqual([-1, -4]);
			expect(problem.pfd.poles).toEqual([pole]);
			expect(problem.pfd.residues).toEqual([1]);
			expect(
				determineStability(problem.pfd.poles, "right-sided").rocLatex,
			).toBe(String.raw`\operatorname{Re}(s) > ${pole}`);
			expect(
				validateLaplacePfdAnswer(`e^{${pole}t}u(t)`, problem).status,
			).toBe("correct");
		}
	});
	/** The zero transform has no poles and an unrestricted ROC. */
	it("handles cancellation of all poles without an infinite ROC boundary", () => {
		const problem = createLaplacePfdProblem([0, 0], [-1, -4]);
		expect(problem.pfd.poles).toEqual([]);
		expect(problem.pfd.residues).toEqual([]);
		expect(determineStability([], "right-sided").rocLatex).toBe(
			String.raw`s \in \mathbb{C}`,
		);
		expect(validateLaplacePfdAnswer("0", problem).status).toBe("correct");
	});
	/** A high-frequency causal sine must not disappear on the former decimal grid. */
	it("rejects a causal sine term aliased by the original sampling grid", () => {
		const problem = createLaplacePfdProblem([1, 2], [-1, -4]);
		expect(
			validateLaplacePfdAnswer(
				String.raw`(${problem.referenceAnswerLatex})+\sin(400\pi t)u(t)`,
				problem,
			).status,
		).toBe("incorrect");
	});
	/** PFD grading must preserve support and every coefficient, including cancellations. */
	it("grades positive, negative, fractional, and zero residues", () => {
		for (const numerator of [
			[2, 3],
			[1, 1],
			[1, 2],
			[3, 8],
		] as [number, number][]) {
			const problem = createLaplacePfdProblem(numerator, [-1, -4]);
			expect(
				validateLaplacePfdAnswer(problem.referenceAnswerLatex, problem)
					.status,
			).toBe("correct");
			expect(
				validateLaplacePfdAnswer("nonsense", problem).status,
			).not.toBe("correct");
			expect(validateLaplacePfdAnswer("123", problem).status).toBe(
				"incorrect",
			);
			expect(
				validateLaplacePfdAnswer(
					problem.referenceAnswerLatex.replaceAll("u(t)", ""),
					problem,
				).status,
			).toBe("incorrect");
		}
	});
	/** Factored input, pole display data, and rational inverse step must describe one transform. */
	it("uses actual poles and keeps time-domain terms outside the inverse operator", () => {
		const problem = createLaplacePfdProblem([1, 2], [-1, -4]);
		expect(problem.pfd.poles).toEqual([-1, -4]);
		expect(problem.promptLatex).toContain("(s + 1)(s + 4)");
		expect(
			determineStability(problem.pfd.poles, problem.pfd.rocDirection)
				.rocLatex,
		).toContain("-1");
		const last = problem.solutionSteps.at(-1)?.latex ?? "";
		expect(last.slice(0, last.indexOf(String.raw`\right\}`))).not.toContain(
			"u(t)",
		);
		expect(last).toContain(String.raw`\frac{1}{3}`);
	});
});
