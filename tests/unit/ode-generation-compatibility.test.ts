import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateOdeProblem } from "$lib/math-engine/odes/generator";

/** Pins seeded generator output and callback samples captured before the complexity refactor. */
describe("ODE seeded generation compatibility", () => {
	/** Compares all public data and sampled response values over the original 3,072-case matrix. */
	it("preserves the pre-refactor deterministic generation matrix", () => {
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
								hash.update(
									JSON.stringify([
										problem,
										[0, 0.25, 2].map(
											/** @param t - Sample time for each public response callback. */
											(t) => [
												problem.evalComplete(t),
												problem.evalZI(t),
												problem.evalZS(t),
											],
										),
									]),
								);
							}
		expect(hash.digest("hex")).toBe(
			"d94dc242ae481b06b64f364b15012b7b9071166483fca04d5678cea1da47a20b",
		);
	});
});
