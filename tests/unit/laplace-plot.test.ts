import { describe, expect, it } from "vitest";
import { laplacePlot } from "$lib/components/canvas/laplace-plot";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";

describe("verified Laplace diagrams", () => {
	it("distinguishes canceled roots and weighted impulses without plotting finite peaks", () => {
		const canceled = laplacePlot(
			generateLaplaceExercise("inverse", 73, "cancellation"),
		);
		expect(
			canceled.roots.filter((root) => root.kind === "canceled"),
		).toHaveLength(1);
		expect(
			canceled.roots.filter((root) => root.kind === "zero"),
		).toHaveLength(0);
		const impulse = laplacePlot(
			generateLaplaceExercise("inverse", 73, "impulse"),
		);
		expect(impulse.impulses).toHaveLength(1);
		expect(impulse.path).not.toMatch(/NaN|Infinity/);
	});
});
