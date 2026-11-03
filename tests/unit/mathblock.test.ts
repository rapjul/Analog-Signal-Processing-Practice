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

	if (
		opts.matrix &&
		!trimmed.startsWith(String.raw`\begin{${opts.matrix}}`)
	) {
		return String.raw`\begin{${opts.matrix}}
${trimmed}
\end{${opts.matrix}}`;
	}

	if (opts.cases && !trimmed.startsWith(String.raw`\begin{cases}`)) {
		return String.raw`\begin{cases}
${trimmed}
\end{cases}`;
	}

	if (opts.aligned && !trimmed.startsWith(String.raw`\begin{aligned}`)) {
		return String.raw`\begin{aligned}
${trimmed}
\end{aligned}`;
	}

	if (opts.gathered && !trimmed.startsWith(String.raw`\begin{gathered}`)) {
		return String.raw`\begin{gathered}
${trimmed}
\end{gathered}`;
	}

	return trimmed;
}

describe("MathBlock LaTeX Environment Wrappers", () => {
	it("wraps multi-line expression in aligned environment", () => {
		const raw = String.raw`y_{ZI}(t) &= e^{-2t} \\
y_{ZS}(t) &= e^{-3t}`;
		const res = getFormattedMath(raw, { aligned: true });
		expect(res).toBe(
			String.raw`\begin{aligned}
y_{ZI}(t) &= e^{-2t} \\
y_{ZS}(t) &= e^{-3t}
\end{aligned}`,
		);
	});

	it("wraps piecewise expressions in cases environment", () => {
		const raw = String.raw`e^{-at} & t \ge 0 \\
0 & t < 0`;
		const res = getFormattedMath(raw, { cases: true });
		expect(res).toBe(
			String.raw`\begin{cases}
e^{-at} & t \ge 0 \\
0 & t < 0
\end{cases}`,
		);
	});

	it("wraps matrix expressions in bmatrix environment", () => {
		const raw = String.raw`1 & 0 \\
0 & 1`;
		const res = getFormattedMath(raw, { matrix: "bmatrix" });
		expect(res).toBe(String.raw`\begin{bmatrix}
1 & 0 \\
0 & 1
\end{bmatrix}`);
	});

	it("prevents duplicate environment wrapping if already wrapped", () => {
		const raw = String.raw`\begin{aligned}
a &= b \\
c &= d
\end{aligned}`;
		const res = getFormattedMath(raw, { aligned: true });
		expect(res).toBe(raw);
	});
});
