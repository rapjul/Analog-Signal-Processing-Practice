/**
 * @file Unit tests for modular Fourier series solver state factories and developer helpers.
 */

import { describe, expect, it } from "vitest";
import {
	createCoefficientMultiPartState,
	createSymmetryMultiPartState,
} from "$lib/components/solvers/fourier-series-solver-state/factory-helpers";
import { fourierDevGetVisualStates } from "$lib/components/solvers/fourier-series-solver-state/dev-helpers";
import { generateFourierSeriesProblem } from "$lib/math-engine/fourier-series/index";
import type {
	FourierCoefficientPart,
	FourierItsStep2,
} from "$lib/math-engine/fourier-series/index";

describe("Fourier Series Solver State Factories & Dev Helpers", () => {
	describe("createCoefficientMultiPartState", () => {
		it("initializes multi-part state for ordered coefficient parts", () => {
			const parts: FourierCoefficientPart[] = [
				{
					id: "a0-part",
					target: "a0",
					title: "DC Offset a0",
					prompt: "Evaluate a0",
					resultLatex: "0",
					options: [{ id: "opt1", latex: "0", isCorrect: true }],
					hints: ["Hint 1"],
				},
				{
					id: "an-part",
					target: "an",
					title: "Cosine Coefficient an",
					prompt: "Evaluate an",
					resultLatex: "0",
					options: [{ id: "opt2", latex: "0", isCorrect: true }],
					hints: ["Hint 2"],
				},
			];

			const state = createCoefficientMultiPartState(parts);
			expect(state.subStepOrder).toEqual(["a0-part", "an-part"]);
			expect(state.activeSubStepId).toBe("a0-part");
			expect(state.subSteps["a0-part"]?.title).toBe("DC Offset a0");
			expect(state.subSteps["an-part"]?.title).toBe("Cosine Coefficient an");
		});

		it("falls back gracefully when given empty coefficient parts", () => {
			const state = createCoefficientMultiPartState([]);
			expect(state.subStepOrder).toEqual(["placeholder"]);
			expect(state.activeSubStepId).toBe("placeholder");
			expect(state.subSteps["placeholder"]).toBeDefined();
		});
	});

	describe("createSymmetryMultiPartState", () => {
		it("initializes origin parity and half-wave sub-steps with independent hints", () => {
			const step2Data: FourierItsStep2 = {
				correctOriginParity: "odd",
				correctHalfWaveSymmetry: true,
				hints: ["Origin parity hint"],
				halfWaveHints: ["Half wave hint"],
				misconceptions: {},
			};

			const state = createSymmetryMultiPartState(step2Data);
			expect(state.subStepOrder).toEqual(["origin-parity", "half-wave"]);
			expect(state.activeSubStepId).toBe("origin-parity");
			expect(state.subSteps["origin-parity"]?.hints).toEqual([
				"Origin parity hint",
			]);
			expect(state.subSteps["half-wave"]?.hints).toEqual([
				"Half wave hint",
			]);
		});
	});

	describe("fourierDevGetVisualStates", () => {
		it("generates full list of visual step states for a standard problem", () => {
			const problem = generateFourierSeriesProblem("square");
			const visualStates = fourierDevGetVisualStates(problem);
			expect(visualStates.length).toBeGreaterThan(6);
			expect(visualStates.some((s) => s.id.includes("period-frequency"))).toBe(
				true,
			);
			expect(visualStates.some((s) => s.id.includes("symmetry"))).toBe(
				true,
			);
			expect(visualStates.some((s) => s.id.includes("half-wave"))).toBe(
				true,
			);
		});
	});
});
