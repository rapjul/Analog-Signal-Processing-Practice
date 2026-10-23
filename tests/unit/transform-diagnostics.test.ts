/** Original-input diagnostics and parenthesized-power grading contracts. */
import { describe, expect, it } from "vitest";
import {
	createCtftProblem,
	validateCtftAnswer,
} from "$lib/math-engine/fourier-transform";
import { diagnoseTransformSyntax } from "$lib/math-engine/transform-diagnostics";
import { normalizeTransformNotation } from "$lib/math-engine/transform-notation";

describe("transform source diagnostics", () => {
	/** Equivalent exponent delimiters must pass the real canonical verifier. */
	it("accepts nested parenthesized powers and equation prefixes", () => {
		const problem = createCtftProblem("delta", {
			a: 1,
			T: 2,
			w0: 2,
			t0: 2,
		});
		for (const answer of [
			"e^(-2j omega)",
			"X(omega)=e^(-j (1+1) omega)",
			"e^{-2j omega}",
		])
			expect(validateCtftAnswer(answer, problem).status).toBe("correct");
		expect(normalizeTransformNotation("e^((1+2)^(2))", "omega")).toBe(
			"e^{(1+2)^{2}}",
		);
	});
	/** Empty exponents cannot become a verified constant. */
	it("rejects incomplete exponents with their original ranges", () => {
		const answer = "  X(omega)=e^()";
		const result = validateCtftAnswer(
			answer,
			createCtftProblem("delta", { a: 1, T: 2, w0: 2, t0: 0 }),
		);
		expect(result.status).toBe("invalid");
		expect(result.diagnostics).toContainEqual({
			start: 12,
			end: 15,
			message: "Enter an exponent inside this group.",
		});
	});
	/** Multiple original delimiters remain actionable even with aliases and prefixes. */
	it("reports independent unmatched groups without shifting their positions", () => {
		const answer = "X(omega)=e^{-j 6t/2} - e^{j {6t/2}";
		const errors = diagnoseTransformSyntax(answer);
		expect(errors).toHaveLength(1);
		expect(answer.slice(errors[0]!.start, errors[0]!.end)).toBe("{");
		expect(diagnoseTransformSyntax("e^{omega + (2")).toHaveLength(2);
		expect(diagnoseTransformSyntax("(1+2)")).toEqual([]);
	});
	/** Bounds and uncertain parser offsets must never trigger unbounded diagnostics. */
	it("bounds diagnostics and avoids guessing positions after token rewriting", () => {
		expect(diagnoseTransformSyntax("(".repeat(65))).toEqual([]);
		expect(diagnoseTransformSyntax("(".repeat(16385))).toEqual([]);
		expect(diagnoseTransformSyntax(String.raw`\left(1\right)`)).toEqual([]);
		expect(diagnoseTransformSyntax("1+").length).toBeGreaterThan(0);
		expect(diagnoseTransformSyntax("  1  + ")[0]).toMatchObject({
			start: 5,
			end: 7,
		});
	});
});
