import { describe, expect, it } from "vitest";
import { renderLaplaceFieldTask } from "$lib/math-engine/laplace/answer-entry";
import {
	createLaplaceExercise,
	normalizeLaplaceConfigurationDraft,
} from "$lib/math-engine/laplace/configuration";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import {
	entryIssue,
	entryTarget,
	permitsEntryDraft,
	ZERO_POLYNOMIAL,
} from "$lib/math-engine/laplace/input-entry";
import { verifyLaplaceScalar } from "$lib/math-engine/laplace/verification";

describe("declared Laplace input domains", () => {
	/** Whole-number notation must reject the whole insertion rather than salvage digits. */
	it("rejects noninteger drafts without changing their meaning", () => {
		for (const value of ["(", "1.5", "1/2", "1e2", "-1", "1 2", "2s"])
			for (const entry of [
				{ kind: "integer" as const },
				{ kind: "degree" as const, zero: true },
			]) {
				expect(permitsEntryDraft(value, entry), value).toBe(false);
				expect(entryIssue(value, entry)?.status, value).toBe("invalid");
			}
		expect(permitsEntryDraft("", { kind: "integer" })).toBe(true);
		expect(
			entryIssue("0", { kind: "integer", min: 1, max: 4 })?.status,
		).toBe("invalid");
		expect(entryIssue("4", { kind: "integer", min: 1, max: 4 })).toBeNull();
	});
	/** Literal fields retain exact fractional roots and necessary incomplete signed drafts. */
	it("accepts exact literals while keeping incomplete numbers invalid", () => {
		for (const value of ["-3/2", "0.125", "-2", "1/.5"])
			expect(entryIssue(value, { kind: "literal" }), value).toBeNull();
		for (const value of ["-", ".", "1/", "1/0", "1+2", "\\frac{1}{2}"])
			expect(entryIssue(value, { kind: "literal" })?.status, value).toBe(
				"invalid",
			);
	});
	/** Constant calculations remain exact; free variables cannot cancel into an accepted coefficient. */
	it("grades equivalent exact arithmetic without admitting variables", () => {
		for (const value of ["1/2+1/4", "0.75", String.raw`\frac{3}{4}`])
			expect(verifyLaplaceScalar(value, "3/4").status, value).toBe(
				"correct",
			);
		for (const value of ["s-s+3/4", "t", "Y(s)", "(", "X(s)=3/4"])
			expect(verifyLaplaceScalar(value, "3/4").status, value).not.toBe(
				"correct",
			);
	});
	/** Undefined degree is an explicit UI selection, never a visible negative degree. */
	it("adapts explicit zero-polynomial selection only at the mathematical boundary", () => {
		const entry = { kind: "degree" as const, zero: true };
		expect(entryTarget("-1", entry)).toBe(ZERO_POLYNOMIAL);
		expect(entryIssue(ZERO_POLYNOMIAL, entry)).toBeNull();
		expect(
			entryIssue(ZERO_POLYNOMIAL, { kind: "degree", zero: false })
				?.status,
		).toBe("invalid");
		const preview = renderLaplaceFieldTask(
			{
				frame: "d={{n}}",
				fields: [{ id: "n", label: "Degree", target: "-1", entry }],
			},
			{ n: ZERO_POLYNOMIAL },
		);
		expect(preview).toContain("undefined");
		expect(preview).not.toContain("-1");
	});
	/** Hidden editor parameters are normalized on a copy without changing the wire schema. */
	it("neutralizes unused custom parameters and preflights zero expressions", () => {
		const spec = generateLaplaceExercise("forward", 73, "distinct").spec;
		if (spec.workflow !== "forward")
			throw new Error("Expected forward fixture");
		spec.terms[0]!.kind = "impulse";
		spec.terms[0]!.frequency = "99";
		const clean = normalizeLaplaceConfigurationDraft(spec);
		expect(clean.workflow === "forward" && clean.terms[0]!.frequency).toBe(
			"0",
		);
		expect(spec.terms[0]!.frequency).toBe("99");
		const zero = generateLaplaceExercise("inverse", 73, "distinct").spec;
		if (zero.workflow !== "inverse")
			throw new Error("Expected inverse fixture");
		zero.rational.gain = "0";
		expect(() => createLaplaceExercise(zero)).not.toThrow();
	});
});
