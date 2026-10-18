import { describe, expect, it } from "vitest";
import {
	computeParticularSolution,
	generateOdeProblem,
	solveCharacteristicEquation,
} from "$lib/math-engine/odes";

/** Verifies harmonic display signs without changing amplitude rounding or zero thresholds. */
describe("ODE harmonic LaTeX", () => {
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
