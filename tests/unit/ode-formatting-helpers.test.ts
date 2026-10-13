/**
 * @file Unit tests for ODE response formatting helpers and root pair matching algorithm.
 */

import { describe, expect, it } from "vitest";
import { formatHomogeneousResponse } from "$lib/math-engine/odes/formatting";
import { matchRootPair } from "$lib/math-engine/odes/its-scaffolding/step2-roots";
import type { OdeParams } from "$lib/math-engine/odes/types";

describe("ODE Response Formatting & Root Matching Helpers", () => {
	describe("formatHomogeneousResponse", () => {
		it("formats 1st-order ODE homogeneous response", () => {
			const params: OdeParams = {
				order: 1,
				a2: 0,
				a1: 1,
				a0: 3,
				rootType: "single_real",
				roots: { r1: -3 },
			};
			expect(formatHomogeneousResponse("C", "", params)).toBe(
				"C e^{-3t}",
			);
			expect(formatHomogeneousResponse("4", "", params)).toBe(
				"4 e^{-3t}",
			);
		});

		it("formats 2nd-order distinct real roots response", () => {
			const params: OdeParams = {
				order: 2,
				a2: 1,
				a1: 7,
				a0: 10,
				rootType: "distinct_real",
				roots: { r1: -2, r2: -5 },
			};
			expect(formatHomogeneousResponse("C_1", "C_2", params)).toBe(
				"C_1 e^{-2t} + C_2 e^{-5t}",
			);
			expect(formatHomogeneousResponse("3", "-4", params)).toBe(
				"3 e^{-2t} - 4 e^{-5t}",
			);
		});

		it("formats 2nd-order repeated real roots response", () => {
			const params: OdeParams = {
				order: 2,
				a2: 1,
				a1: 6,
				a0: 9,
				rootType: "repeated_real",
				roots: { r1: -3, r2: -3 },
			};
			expect(formatHomogeneousResponse("C_1", "C_2", params)).toBe(
				"(C_1 + C_2t) e^{-3t}",
			);
		});

		it("formats 2nd-order complex conjugate roots response", () => {
			const params: OdeParams = {
				order: 2,
				a2: 1,
				a1: 4,
				a0: 20,
				rootType: "complex_conjugate",
				roots: { r1: -2, im: 4 },
			};
			expect(formatHomogeneousResponse("C_1", "C_2", params)).toBe(
				"e^{-2t} [C_1 \\cos(4t) + C_2 \\sin(4t)]",
			);
		});

		it("formats 2nd-order pure imaginary complex roots (sigma = 0)", () => {
			const params: OdeParams = {
				order: 2,
				a2: 1,
				a1: 0,
				a0: 9,
				rootType: "complex_conjugate",
				roots: { r1: 0, im: 3 },
			};
			expect(formatHomogeneousResponse("C_1", "C_2", params)).toBe(
				"C_1 \\cos(3t) + C_2 \\sin(3t)",
			);
		});

		it("handles fallback default case for unknown root type", () => {
			const params = {
				order: 2,
				a2: 1,
				a1: 3,
				a0: 2,
				rootType: "unknown_type" as any,
				roots: { r1: -1, r2: -2 },
			} as unknown as OdeParams;
			expect(formatHomogeneousResponse("A", "B", params)).toBe("A + B");
		});
	});

	describe("matchRootPair", () => {
		it("detects exact matches in direct order", () => {
			expect(matchRootPair(-2, -3, -2, -3)).toBe("exact");
			expect(matchRootPair(4.5, -1.2, 4.5, -1.2)).toBe("exact");
		});

		it("detects order-invariant matches (swapped roots)", () => {
			expect(matchRootPair(-3, -2, -2, -3)).toBe("swapped");
			expect(matchRootPair(10, 5, 5, 10)).toBe("swapped");
		});

		it("detects both roots inverted misconception", () => {
			expect(matchRootPair(2, 3, -2, -3)).toBe("both_inverted");
			expect(matchRootPair(3, 2, -2, -3)).toBe("both_inverted");
		});

		it("detects single root inverted misconception", () => {
			expect(matchRootPair(2, -3, -2, -3)).toBe("one_inverted");
			expect(matchRootPair(-2, 3, -2, -3)).toBe("one_inverted");
			expect(matchRootPair(-3, 2, -2, -3)).toBe("one_inverted");
			expect(matchRootPair(3, -2, -2, -3)).toBe("one_inverted");
		});

		it("identifies completely incorrect answers", () => {
			expect(matchRootPair(5, 7, -2, -3)).toBe("incorrect");
			expect(matchRootPair(0, 0, -2, -3)).toBe("incorrect");
		});

		it("does not trigger inverted detection on near-zero roots", () => {
			expect(matchRootPair(0.00001, 0.00001, 0, 0)).toBe("exact");
		});
	});
});
