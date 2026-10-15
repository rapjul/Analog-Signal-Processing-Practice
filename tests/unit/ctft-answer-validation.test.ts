import { describe, expect, it } from "vitest";
import { CanonicalError } from "$lib/math-engine/canonical-algebra";
import { createCtftCanonicalTarget } from "$lib/math-engine/canonical-targets";
import { normalizeCanonicalTransform } from "$lib/math-engine/canonical-transform";
import {
	type CtftSignalType,
	createCtftProblem,
	validateCtftAnswer,
} from "$lib/math-engine/fourier-transform";

describe("CTFT answer validation", () => {
	/** An earlier zero cannot hide an unsupported product of two impulse factors. */
	it("rejects impulse products independently of zero-factor order", () => {
		const problem = createCtftProblem("delta", {
			a: 1,
			T: 2,
			w0: 3,
			t0: 0,
		});
		const impulse = String.raw`\delta(\omega-2)`;
		for (const factors of [
			["0", impulse, impulse],
			[impulse, "0", impulse],
			[impulse, impulse, "0"],
		])
			expect(
				validateCtftAnswer(`1+${factors.join(" ")}`, problem).status,
			).toBe("unsupported");
	});
	/** Recursive syntax checks must precede folding of masked or canceled distributions. */
	it("rejects nested, factored, and powered distribution products before simplification", () => {
		const problem = createCtftProblem("delta", {
			a: 1,
			T: 2,
			w0: 3,
			t0: 0,
		});
		const d = String.raw`\delta(\omega-2)`;
		for (const product of [
			`${d}(0${d})`,
			`(0${d})${d}`,
			`(0${d})(0${d})`,
			`0(${d}${d})`,
			`(${d}-${d})${d}`,
			`(0${d})^2`,
			`${d}((0${d})/1)`,
			`${d}(e^{0${d}}-1)`,
		])
			expect(
				validateCtftAnswer(`1+${product}`, problem).status,
				product,
			).toBe("unsupported");
		for (const term of [`0${d}`, `${d}-${d}`, `0${d}\\omega`])
			expect(
				validateCtftAnswer(`1+(${term})`, problem).status,
				term,
			).toBe("correct");
		const impulse = [
			"Multiply",
			"DiracDelta",
			["Delimiter", ["Subtract", "omega", 2]],
		];
		for (const ast of [
			["Multiply", impulse, ["Multiply", 0, impulse]],
			{
				fn: [
					"Multiply",
					{ fn: impulse },
					{ fn: ["Multiply", 0, { fn: impulse }] },
				],
			},
			["Power", ["Multiply", 0, impulse], 2],
		]) {
			expect(() => normalizeCanonicalTransform(ast, "omega")).toThrow(
				CanonicalError,
			);
			expect(() => normalizeCanonicalTransform(ast, "omega")).toThrow(
				"outside the supported answer forms",
			);
		}
	});
	/** A smooth multiplier with a removable point needs a limit, not an undefined-answer diagnosis. */
	it("reports unresolved impulse-multiplier limits as unsupported", () => {
		const problem = createCtftProblem("cos", { a: 1, T: 4, w0: 2, t0: 0 });
		const impulses = String.raw`\pi(\delta(\omega-2)+\delta(\omega+2))`;
		const smooth = String.raw`\operatorname{sinc}((\omega-2)/4)+\operatorname{sinc}((\omega+2)/4)`;
		expect(
			validateCtftAnswer(`(${smooth})(${impulses})`, problem).status,
		).toBe("unsupported");
		expect(
			validateCtftAnswer(String.raw`(\omega^2/4)(${impulses})`, problem)
				.status,
		).toBe("correct");
	});
	/** Runtime data outside the typed family union must fail without escaping the grader. */
	it("reports an unsupported target for an unknown runtime signal family", () => {
		const problem = createCtftProblem("delta", {
			a: 1,
			T: 2,
			w0: 3,
			t0: 0,
		});
		const unknown = "future-family" as CtftSignalType;
		expect(() =>
			createCtftCanonicalTarget(unknown, problem.params),
		).toThrow("This signal family has no supported verification target.");
		expect(
			validateCtftAnswer("1", { ...problem, signalType: unknown }),
		).toEqual({
			status: "unsupported",
			message: "This signal family has no supported verification target.",
		});
	});
	/** Off-grid probes must reject supported terms that vanish on the former decimal grid. */
	it("rejects a sine term aliased by the original sampling grid", () => {
		const problem = createCtftProblem("delta", {
			a: 1,
			T: 2,
			w0: 3,
			t0: 0,
		});
		expect(
			validateCtftAnswer(String.raw`1+\sin(100\pi\omega)`, problem)
				.status,
		).toBe("incorrect");
	});
	/** Standard electrical-engineering prefixes and factoring must remain equivalent. */
	it("accepts imaginary-frequency prefixes, tight jw, and bracket-factored impulses", () => {
		const exponential = createCtftProblem("exponential", {
			a: 2,
			T: 2,
			w0: 3,
			t0: 0,
		});
		for (const answer of [
			String.raw`X(j\omega)=\frac{1}{2+j\omega}`,
			String.raw`X(jw)=\frac{1}{2+jw}`,
		])
			expect(validateCtftAnswer(answer, exponential).status).toBe(
				"correct",
			);
		const cosine = createCtftProblem("cos", { a: 2, T: 2, w0: 3, t0: 0 });
		expect(
			validateCtftAnswer(
				String.raw`\pi\left[\delta(\omega-3)+\delta(\omega+3)\right]`,
				cosine,
			).status,
		).toBe("correct");
	});
	/** Finite removable limits are verified without skipping the zero-frequency comparison. */
	it("accepts a removable sinc singularity but rejects genuine poles and undefined constants", () => {
		const problem = createCtftProblem("rect", { a: 2, T: 2, w0: 3, t0: 0 });
		expect(
			validateCtftAnswer(
				String.raw`\frac{2\sin(\omega)}{\omega}`,
				problem,
			).status,
		).toBe("correct");
		const shifted = createCtftProblem("rect", { a: 2, T: 2, w0: 3, t0: 2 });
		expect(
			validateCtftAnswer(
				String.raw`\frac{2\sin(\omega)}{\omega}e^{-j2\omega}`,
				shifted,
			).status,
		).toBe("correct");
		for (const answer of ["1/omega", "1/0"])
			expect(validateCtftAnswer(answer, problem).status).not.toBe(
				"correct",
			);
	});
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
