import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateOdeProblem } from "$lib/math-engine/odes/generator";

/** Pins seeded data, including the deliberately revised teaching and constraint contracts. */
describe("ODE seeded generation compatibility", () => {
	/** Compares all public data and response decomposition over the original 3,072-case matrix. */
	it("pins deterministic equations and the revised teaching metadata", () => {
		const hash = createHash("sha256");
		const solutionHash = createHash("sha256");
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
								solutionHash.update(
									JSON.stringify({
										params: problem.params,
										forcing: problem.forcing,
										initialConditions:
											problem.initialConditions,
										solutions: problem.solutions,
									}),
								);
								for (const t of [0, 0.25, 2]) {
									const complete = problem.evalComplete(t);
									solutionHash.update(
										JSON.stringify([
											complete,
											problem.evalZI(t),
											problem.evalZS(t),
										]),
									);
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
		// Captured before review fixes: teaching changes must preserve every solved problem.
		expect(solutionHash.digest("hex")).toBe(
			"4454088bb1308a082bf7d64cf76b91b1ec1c0495ce5fd102a11baf9c4c61bcb5",
		);
		// Reviewed teaching changes: matched systems, three constant choices, and signed offsets.
		expect(hash.digest("hex")).toBe(
			"f9fd9db13b01f6c813d9ce6d66ffcb3a5ca824cda8b5fb92ad30cfc68e4fe28b",
		);
	});
});
