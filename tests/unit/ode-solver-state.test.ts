/**
 * @file Unit tests for modular ODE solver state preview derivations and developer helpers.
 */

import { describe, expect, it } from "vitest";
import { odeDevGetVisualStates } from "$lib/components/solvers/ode-solver-state/dev-helpers";
import {
	derivePreviewCharEq,
	derivePreviewComplexRoots,
	derivePreviewQuadSetup,
	derivePreviewZI,
	derivePreviewZS,
	deriveZSC1,
	deriveZSC2,
} from "$lib/components/solvers/ode-solver-state/ode-previews";
import type {
	OdeStep1State,
	OdeStep7State,
} from "$lib/components/solvers/ode-solver-state/ode-step-types";
import { generateOdeProblem } from "$lib/math-engine/odes/index";
import type { OdeParams } from "$lib/math-engine/odes/types";

describe("ODE Solver State Previews & Dev Helpers", () => {
	describe("derivePreviewCharEq", () => {
		it("formats standard 2nd-order characteristic equation", () => {
			const step1 = {
				a2: "1",
				a1: "5",
				a0: "6",
			} as OdeStep1State;
			expect(derivePreviewCharEq(step1, 2)).toBe("s^2 + 5s + 6 = 0");
		});

		it("formats 2nd-order equation with negative and unitary coefficients", () => {
			const step1 = {
				a2: "-1",
				a1: "-1",
				a0: "-4",
			} as OdeStep1State;
			expect(derivePreviewCharEq(step1, 2)).toBe("-s^2 - s - 4 = 0");
		});

		it("formats 1st-order characteristic equation", () => {
			const step1 = {
				a2: "",
				a1: "1",
				a0: "3",
			} as OdeStep1State;
			expect(derivePreviewCharEq(step1, 1)).toBe("s + 3 = 0");
		});

		it("falls back gracefully when inputs are empty or symbolic", () => {
			const step1 = {
				a2: "",
				a1: "",
				a0: "",
			} as OdeStep1State;
			expect(derivePreviewCharEq(step1, 2)).toBe(
				"a_2 s^2 + a_1 s + a_0 = 0",
			);
		});
	});

	describe("derivePreviewQuadSetup", () => {
		it("formats quadratic formula substitutions", () => {
			const setup = derivePreviewQuadSetup(1, 5, 6);
			expect(setup).toContain(
				"s = \\frac{-(5) \\pm \\sqrt{(5)^2 - 4(1)(6)}}{2(1)}",
			);
			expect(setup).toContain("\\frac{-5 \\pm \\sqrt{1}}{2}");
		});

		it("handles negative coefficients with correct discriminant", () => {
			const setup = derivePreviewQuadSetup(1, -4, 13);
			expect(setup).toContain("\\frac{4 \\pm \\sqrt{-36}}{2}");
		});
	});

	describe("derivePreviewComplexRoots", () => {
		it("formats complex roots preview with given sigma and omegaD", () => {
			expect(derivePreviewComplexRoots("-2", "3")).toBe("s = -2 \\pm j3");
		});

		it("falls back to Greek symbols when empty", () => {
			expect(derivePreviewComplexRoots("", "")).toBe(
				"s = \\sigma \\pm j\\omega_d",
			);
		});
	});

	describe("derivePreviewZI, deriveZSC1, deriveZSC2, derivePreviewZS", () => {
		const params: OdeParams = {
			order: 2,
			a2: 1,
			a1: 3,
			a0: 2,
			rootType: "distinct_real",
			roots: { r1: -1, r2: -2 },
		};

		it("derives zero-input preview with student inputs or default symbols", () => {
			const step7WithInputs = {
				ziC1: "3",
				ziC2: "-1",
			} as OdeStep7State;
			expect(derivePreviewZI(step7WithInputs, params)).toBe(
				"3 e^{-t} - e^{-2t}",
			);

			const step7Empty = {
				ziC1: "",
				ziC2: "",
			} as OdeStep7State;
			expect(derivePreviewZI(step7Empty, params)).toBe(
				"C_{1,ZI} e^{-t} + C_{2,ZI} e^{-2t}",
			);
		});

		it("derives ZS constants by subtracting ZI constants from total constants", () => {
			expect(deriveZSC1("2", 5)).toBe("3");
			expect(deriveZSC1("invalid", 5)).toBe("C_{1,ZS}");
			expect(deriveZSC2("-1", 3)).toBe("4");
			expect(deriveZSC2("invalid", 3)).toBe("C_{2,ZS}");
		});

		it("derives zero-state response preview string combining homogeneous and particular parts", () => {
			expect(derivePreviewZS("2", "-1", params, "5")).toBe(
				"2 e^{-t} - e^{-2t} + 5",
			);
			expect(derivePreviewZS("2", "-1", params, "0")).toBe(
				"2 e^{-t} - e^{-2t}",
			);
		});
	});

	describe("odeDevGetVisualStates", () => {
		it("returns visual states for 2nd order factorable problem", () => {
			const problem = generateOdeProblem({
				order: 2,
				rootType: "distinct_real",
				forcingType: "constant",
			});
			const states = odeDevGetVisualStates(problem);
			expect(states.length).toBeGreaterThan(3);
			expect(
				states.some((s) => s.id.includes("characteristic-equation")),
			).toBe(true);
			expect(states.some((s) => s.id.includes("strategy-gate"))).toBe(
				true,
			);
		});

		it("returns visual states for 1st order problem without strategy gate", () => {
			const problem = generateOdeProblem({
				order: 1,
				forcingType: "constant",
			});
			const states = odeDevGetVisualStates(problem);
			expect(states.some((s) => s.id.includes("strategy-gate"))).toBe(
				false,
			);
		});
	});
});
