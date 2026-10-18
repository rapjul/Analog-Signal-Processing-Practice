import { renderToString } from "katex";
import { describe, expect, it } from "vitest";
import {
	computeParticularSolution,
	generateOdeProblem,
	solveCharacteristicEquation,
} from "$lib/math-engine/odes";
import { formatHarmonicScalar } from "$lib/math-engine/odes/formatting";

/** Verifies harmonic display signs and retention of nonzero numerical amplitudes. */
describe("ODE harmonic LaTeX", () => {
	/** Checks scientific fallback at both numeric extremes and ordinary fraction compatibility. */
	it("formats extreme harmonic scalars as valid nonzero LaTeX", () => {
		for (const value of [
			Number.MIN_VALUE,
			1e-300,
			-1e-300,
			1e-7,
			1e-4,
			1e21,
			1e308,
		]) {
			const latex = formatHarmonicScalar(value);
			expect(latex).not.toBe("0");
			expect(latex).toContain(String.raw`\times 10^{`);
			expect(renderToString(latex, { throwOnError: true })).toContain(
				"katex",
			);
		}
		expect(formatHarmonicScalar(1 / 3)).toBe(String.raw`\frac{1}{3}`);
		expect(formatHarmonicScalar(0)).toBe("0");
	});
	/** Retains tiny coefficients and frequencies rather than rendering a false zero response. */
	it("renders nonzero harmonic terms below ordinary fraction tolerances", () => {
		const response = computeParticularSolution(
			solveCharacteristicEquation({
				order: 2,
				a2: 1e200,
				a1: 1e100,
				a0: 0,
			}),
			{ type: "sinusoid", K: 1e-300, omega: 1e-300, latex: "" },
		);
		expect(response.latex).not.toBe("0");
		expect(response.latex).toContain(String.raw`10^{-300}`);
		expect(response.latex).toContain(String.raw`10^{-100}`);
		expect(response.latex).toContain(String.raw`\cos`);
		expect(response.latex).toContain(String.raw`\sin`);
		expect(response.latex).not.toMatch(/\de[+-]?\d/);
		for (const K of [1e-7, -1e-7, Number.MIN_VALUE, 0]) {
			const resonant = computeParticularSolution(
				solveCharacteristicEquation({
					order: 2,
					a2: 0.5,
					a1: 0,
					a0: 0.5,
				}),
				{ type: "sinusoid", K, omega: 1, latex: "" },
			);
			expect(resonant.latex === "0").toBe(K === 0);
		}
	});
	/** Covers positive/negative sine-only, cosine-only, mixed, and zero responses. */
	it("uses separators only between existing harmonic terms", () => {
		for (const [a1, a0, K, expected] of [
			[2, 1, 6, String.raw`3 \sin(1t)`],
			[2, 1, -6, String.raw`-3 \sin(1t)`],
			[0, 2, 6, String.raw`6 \cos(1t)`],
			[1, 2, 6, String.raw`3 \cos(1t) + 3 \sin(1t)`],
			[1, 2, 0, "0"],
		] as const) {
			const response = computeParticularSolution(
				solveCharacteristicEquation({ order: 2, a2: 1, a1, a0 }),
				{ type: "sinusoid", K, omega: 1, latex: "" },
			);
			expect(response.latex).toBe(expected);
		}
	});

	/** Checks raw generated choices as well as sanitized solution summaries. */
	it("does not emit leading plus signs or doubled plus operators in generated responses", () => {
		for (let seed = 0; seed < 100; seed++) {
			const problem = generateOdeProblem({
				seed,
				order: 2,
				rootType: "repeated_real",
				forcingType: "sinusoid",
				leadingCoefficient: "monic",
			});
			const output = JSON.stringify([
				problem.solutions,
				problem.itsData.step7,
			]);
			expect(output).not.toMatch(/=\s*\+|\+\s*\+/);
		}
	});
});
