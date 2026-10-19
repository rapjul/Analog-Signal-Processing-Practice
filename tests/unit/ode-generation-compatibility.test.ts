import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateOdeProblem } from "$lib/math-engine/odes/generator";

/** Pins seeded data, including the deliberately revised teaching and constraint contracts. */
describe("ODE seeded generation compatibility", () => {
	/** Compares all public data and response decomposition over the original 3,072-case matrix. */
	it("pins deterministic equations and the revised teaching metadata", () => {
		const hash = createHash("sha256");
		for (const seed of [0, 3, 17, 991])
			for (const order of [1, 2, "random"] as const)
				for (const rootType of [
					"distinct_real",
					"repeated_real",
					"complex_conjugate",
					"random",
				] as const)
					for (const forcingType of [
						"constant",
						"exponential",
						"sinusoid",
						"random",
					] as const)
						for (const resonance of [
							"none",
							"simple",
							"repeated",
							"random",
						] as const)
							for (const leadingCoefficient of [
								"monic",
								"non_monic",
								"random",
								-2,
							] as const) {
								const problem = generateOdeProblem({
									seed,
									order,
									rootType,
									forcingType,
									resonance,
									leadingCoefficient,
								});
								hash.update(JSON.stringify(problem));
								for (const t of [0, 0.25, 2]) {
									const complete = problem.evalComplete(t);
									expect(Number.isFinite(complete)).toBe(
										true,
									);
									expect(
										Math.abs(
											complete -
												problem.evalZI(t) -
												problem.evalZS(t),
										),
									).toBeLessThan(
										1e-12 * Math.max(1, Math.abs(complete)),
									);
								}
							}
		// Updated for structural choices, decompositionMode, and explicit-filter precedence.
		expect(hash.digest("hex")).toBe(
			"971d822729a289a17159794b0c1f19998fa95383ee29fe86da36fc1b21cf2a78",
		);
	});
});
