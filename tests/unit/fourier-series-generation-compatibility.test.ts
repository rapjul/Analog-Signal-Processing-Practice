/** Protects seeded public problem output while internal definitions are consolidated. */
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
	FOURIER_SERIES_WAVEFORM_TYPES,
	generateFourierSeriesItsData,
	generateFourierSeriesProblem,
} from "$lib/math-engine/fourier-series/index";
import * as symbolic from "$lib/math-engine/fourier-series/symbolic-derivations";

/** Ensures public generation paths share one per-invocation symbolic derivation. */
it("constructs the derivation once per complete problem or standalone ITS invocation", () => {
	const spy = vi.spyOn(symbolic, "buildFourierSeriesSymbolicDerivation");
	try {
		const problem = generateFourierSeriesProblem("square", { seed: 1 });
		expect(spy).toHaveBeenCalledTimes(1);
		generateFourierSeriesItsData(problem.coeffs);
		expect(spy).toHaveBeenCalledTimes(2);
	} finally {
		spy.mockRestore();
	}
});

describe.each(FOURIER_SERIES_WAVEFORM_TYPES)(
	"%s generation compatibility",
	(waveform) => {
		/** Records the complete serializable problem, including hints, formulas, and shuffled choices. */
		it.each(["trig", "exp"] as const)(
			"preserves the seeded %s problem",
			(primaryForm) => {
				for (const seed of [1, 19]) {
					const problem = generateFourierSeriesProblem(waveform, {
						seed,
						primaryForm,
					});
					const digest = createHash("sha256")
						.update(JSON.stringify(problem))
						.digest("hex");
					expect(digest).toMatchSnapshot(`seed ${seed}`);
				}
			},
		);
	},
);
