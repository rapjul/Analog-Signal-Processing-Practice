import { describe, expect, it } from "vitest";
import { laplacePlot } from "$lib/components/canvas/laplace-plot";
import { createLaplaceExercise } from "$lib/math-engine/laplace/configuration";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import { solveLaplaceOde } from "$lib/math-engine/laplace/ode";
import { totalCanceledFactors } from "$lib/math-engine/laplace/roc";

describe("verified Laplace diagrams", () => {
	/** Verifies exact combined zeros against independently derived rational numerators. */
	it("plots combined forward and ODE zeros instead of omitting them", () => {
		const term = {
			kind: "exponential" as const,
			amplitude: "1",
			rate: "-1",
			frequency: "0",
			power: 0,
			delay: "0",
			side: "right" as const,
		};
		const forward = createLaplaceExercise({
			workflow: "forward",
			seed: 73,
			terms: [term, { ...term, rate: "-2" }],
		});
		const zero = laplacePlot(forward).roots.find(
			(marker) => marker.kind === "zero",
		)!;
		expect(zero.label).toContain("-3/2");
		expect(laplacePlot(forward).zeroInfo.kind).toBe("finite");
		const ode = createLaplaceExercise({
			workflow: "ode",
			seed: 73,
			leading: "1",
			roots: [{ real: "-1", frequency: "0", multiplicity: 1 }],
			initial: ["2", "0"],
			terms: [{ ...term, rate: "-2" }],
		});
		expect(
			laplacePlot(ode).roots.find((marker) => marker.kind === "zero")!
				.label,
		).toContain("-5/2");
	});
	/** Checks repeated and conjugate zeros, and clearly states unplotted implicit sets. */
	it("retains exact quadratic multiplicities and explains delayed or implicit zeros", () => {
		const term = {
			kind: "exponential" as const,
			amplitude: "1",
			rate: "-1",
			frequency: "0",
			power: 0,
			delay: "0",
			side: "right" as const,
		};
		const build = (terms: (typeof term)[]) =>
			createLaplaceExercise({ workflow: "forward", seed: 73, terms });
		const repeated = laplacePlot(
			createLaplaceExercise({
				workflow: "forward",
				seed: 73,
				terms: [
					{ ...term, kind: "impulse" },
					{ ...term, amplitude: "-2" },
					{ ...term, power: 1 },
				],
			}),
		);
		expect(repeated.zeroInfo.factors).toEqual([
			{ real: "0/1", frequency: "0/1", multiplicity: 2 },
		]);
		const conjugate = laplacePlot(
			createLaplaceExercise({
				workflow: "forward",
				seed: 73,
				terms: [
					{ ...term, kind: "impulse" },
					{ ...term, amplitude: "2" },
					{ ...term, amplitude: "-5", rate: "-2" },
				],
			}),
		);
		expect(
			conjugate.roots.filter((marker) => marker.kind === "zero"),
		).toHaveLength(2);
		const delayed = laplacePlot(build([term, { ...term, delay: "1" }]));
		expect(delayed.zeroInfo.kind).toBe("delayed");
		expect(delayed.zeroInfo.description).toContain(
			"does not mean there are no zeros",
		);
		const implicit = laplacePlot(
			createLaplaceExercise({
				workflow: "forward",
				seed: 73,
				terms: [
					{ ...term, kind: "cosine", rate: "0", frequency: "1" },
					{ ...term, kind: "cosine", rate: "0", frequency: "2" },
				],
			}),
		);
		expect(implicit.zeroInfo.kind).toBe("implicit");
		expect(implicit.zeroInfo.description).toContain("not plotted");
	});
	/** Impulse direction follows its signed weight and coincident zero weights disappear. */
	it("keeps negative impulse direction and omits zero distributions", () => {
		const term = {
			kind: "impulse" as const,
			amplitude: "-1",
			rate: "0",
			frequency: "0",
			power: 0,
			delay: "1",
			side: "right" as const,
		};
		const negative = createLaplaceExercise({
			workflow: "forward",
			seed: 73,
			terms: [term],
		});
		expect(laplacePlot(negative).impulses[0]!.direction).toBe(-1);
		expect(
			laplacePlot({
				...negative,
				terms: [term, { ...term, amplitude: "1" }],
			}).impulses,
		).toEqual([]);
	});
	it("keeps block-only cancellations out of the complete ODE diagram", () => {
		const spec = generateLaplaceExercise("ode", 73).spec;
		if (spec.workflow !== "ode") throw new Error("Expected ODE fixture.");
		spec.roots = [{ real: "-2", frequency: "0", multiplicity: 1 }];
		spec.initial = ["0", "0"];
		spec.terms[0]!.amplitude = "3";
		expect(solveLaplaceOde(spec).blocks[0]!.data.canceled).toHaveLength(1);
		const problem = createLaplaceExercise(spec);
		expect(problem.poles.map((factor) => factor.real)).toContain("-2");
		expect(problem.canceled).toEqual([]);
		expect(
			laplacePlot(problem).roots.filter(
				(marker) => marker.kind === "canceled",
			),
		).toEqual([]);
		spec.initial = ["-1", "0"];
		spec.terms[0]!.rate = "-3";
		spec.terms[0]!.amplitude = "1";
		expect(createLaplaceExercise(spec).canceled).toEqual([
			{ real: "-2", frequency: "0", multiplicity: 1 },
		]);
	});
	it("retains supported fourth-order responses whose unreduced block metadata spans five factors", () => {
		const spec = generateLaplaceExercise("ode", 73).spec;
		if (spec.workflow !== "ode") throw new Error("Expected ODE fixture.");
		spec.roots = [{ real: "0", frequency: "0", multiplicity: 1 }];
		spec.initial = ["0", "0"];
		spec.terms = ["1", "2"].map((frequency) => ({
			...spec.terms[0]!,
			kind: "cosine",
			rate: "0",
			amplitude: "1",
			frequency,
		}));
		const problem = createLaplaceExercise(spec);
		expect(problem.poles).toHaveLength(2);
		expect(problem.canceled).toEqual([
			{ real: "0", frequency: "0", multiplicity: 1 },
		]);
	});
	it("labels partial and finite-duration cancellations from the total forward response", () => {
		const spec = generateLaplaceExercise("forward", 73).spec;
		if (spec.workflow !== "forward")
			throw new Error("Expected forward fixture.");
		const term = { ...spec.terms[0]!, amplitude: "1", rate: "0", power: 1 };
		spec.terms = [term, { ...term, amplitude: "-1", delay: "1" }];
		const partial = createLaplaceExercise(spec);
		expect(partial.poles).toEqual([
			{ real: "0", frequency: "0", multiplicity: 1 },
		]);
		expect(partial.canceled).toEqual([
			{ real: "0", frequency: "0", multiplicity: 1 },
		]);
		expect(
			laplacePlot(partial).roots.filter(
				(marker) => marker.kind === "canceled",
			)[0]!.label,
		).toContain("removed multiplicity 1");
		spec.terms.forEach((item) => {
			item.power = 0;
		});
		const finite = createLaplaceExercise(spec);
		expect(finite.poles).toEqual([]);
		expect(finite.canceled).toHaveLength(1);
		expect(
			totalCanceledFactors(
				[[{ real: "-1/2", frequency: "0", multiplicity: 2 }]],
				[{ real: "-0.5", frequency: "0", multiplicity: 1 }],
			),
		).toEqual([{ real: "-1/2", frequency: "0", multiplicity: 1 }]);
	});
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
