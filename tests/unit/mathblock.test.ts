import { describe, expect, it } from "vitest";

/**
 * Mirror of getFormattedMath logic from MathBlock.svelte to test environment wrapping behavior.
 */
function getFormattedMath(
	rawMath: string,
	opts: {
		aligned?: boolean;
		cases?: boolean;
		matrix?: "bmatrix" | "pmatrix" | "matrix";
		gathered?: boolean;
	} = {},
): string {
	const trimmed = (rawMath || "").trim();
	if (!trimmed) return "";

	if (opts.matrix && !trimmed.startsWith(`\\begin{${opts.matrix}}`)) {
		return `\\begin{${opts.matrix}}\n${trimmed}\n\\end{${opts.matrix}}`;
	}

	if (opts.cases && !trimmed.startsWith("\\begin{cases}")) {
		return `\\begin{cases}\n${trimmed}\n\\end{cases}`;
	}

	if (opts.aligned && !trimmed.startsWith("\\begin{aligned}")) {
		return `\\begin{aligned}\n${trimmed}\n\\end{aligned}`;
	}

	if (opts.gathered && !trimmed.startsWith("\\begin{gathered}")) {
		return `\\begin{gathered}\n${trimmed}\n\\end{gathered}`;
	}

	return trimmed;
}

describe("MathBlock LaTeX Environment Wrappers", () => {
	it("wraps multi-line expression in aligned environment", () => {
		const raw = "y_{ZI}(t) &= e^{-2t} \\\\\ny_{ZS}(t) &= e^{-3t}";
		const res = getFormattedMath(raw, { aligned: true });
		expect(res).toBe(
			"\\begin{aligned}\ny_{ZI}(t) &= e^{-2t} \\\\\ny_{ZS}(t) &= e^{-3t}\n\\end{aligned}",
		);
	});

	it("wraps piecewise expressions in cases environment", () => {
		const raw = "e^{-at} & t \\ge 0 \\\\\n0 & t < 0";
		const res = getFormattedMath(raw, { cases: true });
		expect(res).toBe(
			"\\begin{cases}\ne^{-at} & t \\ge 0 \\\\\n0 & t < 0\n\\end{cases}",
		);
	});

	it("wraps matrix expressions in bmatrix environment", () => {
		const raw = "1 & 0 \\\\\n0 & 1";
		const res = getFormattedMath(raw, { matrix: "bmatrix" });
		expect(res).toBe("\\begin{bmatrix}\n1 & 0 \\\\\n0 & 1\n\\end{bmatrix}");
	});

	it("prevents duplicate environment wrapping if already wrapped", () => {
		const raw = "\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}";
		const res = getFormattedMath(raw, { aligned: true });
		expect(res).toBe(raw);
	});
});
