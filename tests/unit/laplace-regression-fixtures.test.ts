import { describe, expect, it } from "vitest";
import { evaluatePfdResidues } from "$lib/math-engine/laplace/index";
import { inverseFixtures } from "./laplace-fixtures";

describe("audited Laplace regression examples", () => {
	it("reconstructs each original numerator from independently audited residues", () => {
		for (const example of inverseFixtures) {
			const result = evaluatePfdResidues(
				[...example.numerator],
				[...example.poles],
			);
			for (const [index, residue] of example.residues.entries())
				expect(result.residues[index]).toBeCloseTo(residue, 12);
			const [a, b] = example.residues;
			const [p, q] = example.poles;
			expect(a + b).toBeCloseTo(example.numerator[0], 12);
			expect(-a * q - b * p).toBeCloseTo(example.numerator[1], 12);
		}
	});
});
