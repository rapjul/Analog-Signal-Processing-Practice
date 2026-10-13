import { describe, expect, it } from "vitest";
import {
	type CtftSignalType,
	createCtftProblem,
	validateCtftAnswer,
} from "$lib/math-engine/fourier-transform";

describe("CTFT answer validation", () => {
	/** Real and complex transforms must retain phase and limit behavior. */
	it("accepts equivalent complex rational and normalized sinc expressions", () => {
		const p = createCtftProblem("exponential", {
			a: 2,
			T: 4,
			w0: 3,
			t0: 0,
		});
		for (const answer of [
			String.raw`\frac{1}{2+j\omega}`,
			String.raw`X(\omega)=\frac{2-i\omega}{4+\omega^2}`,
		])
			expect(validateCtftAnswer(answer, p).status).toBe("correct");
		expect(
			validateCtftAnswer(String.raw`\frac{1}{2-j\omega}`, p).status,
		).toBe("incorrect");
		const rect = createCtftProblem("rect", { a: 2, T: 4, w0: 3, t0: 0 });
		expect(validateCtftAnswer("4sinc(2omega/pi)", rect).status).toBe(
			"correct",
		);
	});
	/** Every generated family and phase-shift variant must grade its own exact reference. */
	it("grades every current family with and without shifts", () => {
		for (const type of [
			"rect",
			"exponential",
			"gaussian",
			"delta",
			"cos",
		] as CtftSignalType[])
			for (const t0 of [0, 2]) {
				const problem = createCtftProblem(type, {
					a: 3,
					T: 4,
					w0: 5,
					t0,
				});
				expect(
					validateCtftAnswer(problem.referenceAnswerLatex, problem),
					`${type}, shift ${t0}`,
				).toMatchObject({ status: "correct" });
				expect(validateCtftAnswer("123", problem).status).toBe(
					"incorrect",
				);
			}
	});
	/** Both impulses must be shifted, including their distinct complex weights. */
	it("rejects a phase factor applied only to the second cosine impulse", () => {
		const problem = createCtftProblem("cos", { a: 2, T: 4, w0: 3, t0: 1 });
		expect(
			validateCtftAnswer(
				String.raw`\pi\delta(\omega-3)+\pi\delta(\omega+3)e^{-j\omega}`,
				problem,
			).status,
		).toBe("incorrect");
	});
});
