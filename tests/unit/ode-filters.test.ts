import { describe, expect, it } from "vitest";
import {
	normalizeOdeFilters,
	type OdeFilterSelections,
	parseOdeFilters,
	serializeOdeFilters,
} from "../../src/lib/problems/ode-filters";

describe("ode-filters module", () => {
	const defaultFilters: OdeFilterSelections = {
		order: "random",
		rootType: "random",
		forcingType: "random",
		leadingCoefficient: "random",
		resonance: "random",
		seed: 42,
	};

	describe("normalizeOdeFilters (headless / URL precedence)", () => {
		it("normalizes first-order constraints", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				order: 1,
				rootType: "distinct_real",
				resonance: "repeated",
			};
			const result = normalizeOdeFilters(input);

			expect(result.order).toBe(1);
			expect(result.rootType).toBe("random");
			expect(result.resonance).toBe("simple");
		});

		it("normalizes repeated resonance constraints", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				order: "random",
				rootType: "random",
				forcingType: "constant",
				resonance: "repeated",
			};
			const result = normalizeOdeFilters(input);

			expect(result.order).toBe(2);
			expect(result.rootType).toBe("repeated_real");
			expect(result.forcingType).toBe("exponential");
			expect(result.resonance).toBe("repeated");
		});

		it("normalizes simple resonance with non-exponential forcing and second order", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				order: 2,
				rootType: "random",
				forcingType: "sinusoid",
				resonance: "simple",
			};
			const result = normalizeOdeFilters(input);

			expect(result.order).toBe(2);
			expect(result.rootType).toBe("distinct_real");
			expect(result.forcingType).toBe("exponential");
			expect(result.resonance).toBe("simple");
		});

		it("disables resonance for concrete non-exponential forcing with random resonance", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				forcingType: "constant",
				resonance: "random",
			};
			const result = normalizeOdeFilters(input);

			expect(result.forcingType).toBe("constant");
			expect(result.resonance).toBe("none");
		});

		it("explicit simple resonance overrides incompatible forcing during URL restoration", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				forcingType: "constant",
				resonance: "simple",
			};
			const result = normalizeOdeFilters(input);

			expect(result.forcingType).toBe("exponential");
			expect(result.resonance).toBe("simple");
		});

		it("disables resonance for complex conjugate roots", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				order: 2,
				rootType: "complex_conjugate",
				resonance: "simple",
			};
			const result = normalizeOdeFilters(input);

			expect(result.rootType).toBe("complex_conjugate");
			expect(result.resonance).toBe("none");
		});

		it("implies second order when a concrete root type is selected with random order", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				order: "random",
				rootType: "distinct_real",
				resonance: "none",
			};
			const result = normalizeOdeFilters(input);

			expect(result.order).toBe(2);
			expect(result.rootType).toBe("distinct_real");
		});
	});

	describe("normalizeOdeFilters (interactive changeSource precedence)", () => {
		it("handles order change to 1", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				order: 1,
				rootType: "distinct_real",
				resonance: "repeated",
			};
			const result = normalizeOdeFilters(input, "ode-order-select");

			expect(result.order).toBe(1);
			expect(result.rootType).toBe("random");
			expect(result.resonance).toBe("simple");
		});

		it("handles order change to random", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				order: "random",
				rootType: "distinct_real",
			};
			const result = normalizeOdeFilters(input, "ode-order-select");

			expect(result.order).toBe("random");
			expect(result.rootType).toBe("random");
		});

		it("handles root type change to concrete value", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				order: "random",
				rootType: "distinct_real",
				resonance: "simple",
			};
			const result = normalizeOdeFilters(input, "root-type-select");

			expect(result.order).toBe(2);
			expect(result.rootType).toBe("distinct_real");
			expect(result.resonance).toBe("none");
		});

		it("handles forcing type change to non-exponential", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				forcingType: "sinusoid",
				resonance: "simple",
			};
			const result = normalizeOdeFilters(input, "forcing-type-select");

			expect(result.forcingType).toBe("sinusoid");
			expect(result.resonance).toBe("none");
		});

		it("handles resonance change to simple", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				order: 2,
				rootType: "random",
				forcingType: "constant",
				resonance: "simple",
			};
			const result = normalizeOdeFilters(input, "resonance-select");

			expect(result.resonance).toBe("simple");
			expect(result.forcingType).toBe("exponential");
			expect(result.rootType).toBe("distinct_real");
		});

		it("handles resonance change to repeated", () => {
			const input: OdeFilterSelections = {
				...defaultFilters,
				order: 1,
				rootType: "random",
				forcingType: "constant",
				resonance: "repeated",
			};
			const result = normalizeOdeFilters(input, "resonance-select");

			expect(result.resonance).toBe("repeated");
			expect(result.order).toBe(2);
			expect(result.rootType).toBe("repeated_real");
			expect(result.forcingType).toBe("exponential");
		});

		it("leading coefficient change leaves other filters untouched", () => {
			const input: OdeFilterSelections = {
				order: 2,
				rootType: "repeated_real",
				forcingType: "exponential",
				leadingCoefficient: "non_monic",
				resonance: "repeated",
				seed: 1234,
			};
			const result = normalizeOdeFilters(input, "leading-coeff-select");

			expect(result).toEqual(input);
		});

		it("throws an error when an unhandled change source is provided", () => {
			const input: OdeFilterSelections = { ...defaultFilters };
			expect(() =>
				normalizeOdeFilters(
					input,
					"invalid-change-source" as unknown as "ode-order-select",
				),
			).toThrow(
				"Unhandled ODE filter change source: invalid-change-source",
			);
		});
	});

	describe("parseOdeFilters", () => {
		it("parses empty query params with fallback seed", () => {
			const params = new URLSearchParams();
			const result = parseOdeFilters(params, 999);

			expect(result).toEqual({
				order: "random",
				rootType: "random",
				forcingType: "random",
				leadingCoefficient: "random",
				resonance: "random",
				seed: 999,
			});
		});

		it("parses valid query parameters accurately", () => {
			const params = new URLSearchParams(
				"order=2&rootType=distinct_real&forcing=exponential&leading=monic&resonance=simple&seed=12345",
			);
			const result = parseOdeFilters(params);

			expect(result).toEqual({
				order: 2,
				rootType: "distinct_real",
				forcingType: "exponential",
				leadingCoefficient: "monic",
				resonance: "simple",
				seed: 12345,
			});
		});

		it("falls back cleanly on corrupted or invalid query params", () => {
			const params = new URLSearchParams(
				"order=99&rootType=<script>alert(1)</script>&forcing=invalid&leading=bad&resonance=none&seed=-500",
			);
			const result = parseOdeFilters(params, 777);

			expect(result.order).toBe("random");
			expect(result.rootType).toBe("random");
			expect(result.forcingType).toBe("random");
			expect(result.leadingCoefficient).toBe("random");
			expect(result.resonance).toBe("none");
			expect(result.seed).toBe(777);
		});
	});

	describe("serializeOdeFilters & round-trip idempotency", () => {
		it("serializes filter state to canonical URLSearchParams", () => {
			const filters: OdeFilterSelections = {
				order: 2,
				rootType: "complex_conjugate",
				forcingType: "sinusoid",
				leadingCoefficient: "non_monic",
				resonance: "none",
				seed: 55555,
			};
			const serialized = serializeOdeFilters(filters);

			expect(serialized.get("order")).toBe("2");
			expect(serialized.get("rootType")).toBe("complex_conjugate");
			expect(serialized.get("forcing")).toBe("sinusoid");
			expect(serialized.get("leading")).toBe("non_monic");
			expect(serialized.get("resonance")).toBe("none");
			expect(serialized.get("seed")).toBe("55555");
		});

		it("performs idempotent round-trip serialization and parsing", () => {
			const original: OdeFilterSelections = {
				order: 2,
				rootType: "repeated_real",
				forcingType: "exponential",
				leadingCoefficient: "monic",
				resonance: "repeated",
				seed: 888888,
			};

			const serialized = serializeOdeFilters(original);
			const roundTrip = parseOdeFilters(serialized, original.seed);

			expect(roundTrip).toEqual(original);
		});
	});
});
