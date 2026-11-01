import { describe, expect, it } from "vitest";
import {
	type CtftSignalType,
	createCtftProblem,
	validateCtftAnswer,
} from "$lib/math-engine/fourier-transform/index";
import {
	createLaplacePfdProblem,
	validateLaplacePfdAnswer,
} from "$lib/math-engine/laplace/index";
import { transformAdversaries } from "$lib/testing/transform-adversaries";

/**
 * Advances a deterministic parameter seed without global randomness.
 * @param seed - Current unsigned seed.
 * @returns Next reproducible seed.
 */
function nextSeed(seed: number): number {
	return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

describe("family-aware practice verification", () => {
	/** The shared matrix must fail on each practice surface, independent of probes. */
	it.each(transformAdversaries("omega"))(
		"rejects $name on both grading surfaces",
		/**
		 * @param attack - Named CTFT attack with an equivalent time-domain spelling.
		 * @returns Nothing after both independent grading checks.
		 */
		(attack) => {
			const ctft = createCtftProblem("delta", {
				a: 1,
				T: 2,
				w0: 3,
				t0: 0,
			});
			const laplace = createLaplacePfdProblem([1, 1], [-1, -4]);
			expect(
				validateCtftAnswer(`1+(${attack.expression})`, ctft).status,
				attack.name,
			).not.toBe("correct");
			const timeAttack = transformAdversaries("t").find(
				/**
				 * @param candidate - Time-domain attack spelling.
				 * @returns Whether it belongs to the same regression category.
				 */
				(candidate) => candidate.name === attack.name,
			)!;
			expect(
				validateLaplacePfdAnswer(
					`(${laplace.referenceAnswerLatex})+(${timeAttack.expression})`,
					laplace,
				).status,
				attack.name,
			).not.toBe("correct");
		},
	);
	/** Every generated CTFT family retains supported references and phase variants. */
	it.each([
		"rect",
		"exponential",
		"gaussian",
		"delta",
		"cos",
	] as CtftSignalType[])(
		"verifies seeded %s references and independently rejects extra basis terms",
		(type) => {
			let seed = 73;
			for (let index = 0; index < 8; index++) {
				seed = nextSeed(seed);
				const params = {
					a: 1 + (seed % 5),
					T: 1 + ((seed >>> 4) % 5),
					w0: 2 + ((seed >>> 8) % 5),
					t0: index % 2 ? 2 : 0,
				};
				const problem = createCtftProblem(type, params);
				expect(
					validateCtftAnswer(problem.referenceAnswerLatex, problem)
						.status,
					JSON.stringify(params),
				).toBe("correct");
				expect(
					validateCtftAnswer(
						`(${problem.referenceAnswerLatex})+10^{-20}e^{-omega^2}`,
						problem,
					).status,
				).not.toBe("correct");
			}
		},
	);
	/** Residue coefficients, cancellations, and both support branches come from parameters. */
	it("verifies Laplace cancellations and tolerates matched decimal residues", () => {
		for (const numerator of [
			[1, 1],
			[1, 4],
			[1, 2],
			[2, 3],
			[3, 8],
			[0, 0],
		] as [number, number][]) {
			const problem = createLaplacePfdProblem(numerator, [-1, -4]);
			expect(
				validateLaplacePfdAnswer(problem.referenceAnswerLatex, problem)
					.status,
			).toBe("correct");
			const a = (numerator[1] - numerator[0]) / 3,
				b = (numerator[1] - 4 * numerator[0]) / -3;
			expect(
				validateLaplacePfdAnswer(
					`(${a}e^{-t}+${b}e^{-4t})u(t)`,
					problem,
				).status,
			).toBe("correct");
		}
	});
	/** Display strings cannot become an alternative source of truth for correctness. */
	it("builds targets independently of displayed answers", () => {
		const ctft = createCtftProblem("exponential", {
			a: 2,
			T: 2,
			w0: 3,
			t0: 0,
		});
		expect(
			validateCtftAnswer(String.raw`\frac{1}{2+j\omega}`, {
				...ctft,
				referenceAnswerLatex: "123",
			}).status,
		).toBe("correct");
		const laplace = createLaplacePfdProblem([1, 1], [-1, -4]);
		expect(
			validateLaplacePfdAnswer("e^{-4t}u(t)", {
				...laplace,
				referenceAnswerLatex: "123",
			}).status,
		).toBe("correct");
	});
});
