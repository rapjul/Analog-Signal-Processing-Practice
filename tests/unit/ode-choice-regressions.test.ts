import { describe, expect, it } from "vitest";
import { generationRoots } from "$lib/math-engine/odes/generation-parameters";
import { generateOdeProblem } from "$lib/math-engine/odes/generator";
import { buildStep4Data } from "$lib/math-engine/odes/its-scaffolding/step4-ansatz";
import { buildStep5Data } from "$lib/math-engine/odes/its-scaffolding/step5-coefficients";
import { buildStep7Data } from "$lib/math-engine/odes/its-scaffolding/step7-decomposition";
import {
	computeParticularSolution,
	solveCharacteristicEquation,
	solveHomogeneousConstants,
} from "$lib/math-engine/odes/solver";
import type { OdeItsOption } from "$lib/math-engine/odes/types";

/**
 * Evaluates derivative choices independently of the teaching algebra implementation.
 * @param signature - Coefficients keyed by harmonic, polynomial power, and unknown.
 * @param t - Evaluation time.
 * @param rate - Exponential rate.
 * @param frequency - Trigonometric frequency.
 * @returns The expression using fixed arbitrary unknown coefficients.
 */
function evaluateSignature(
	signature: Readonly<Record<string, number>>,
	t: number,
	rate: number,
	frequency: number,
): number {
	let total = 0;
	const values: Record<string, number> = { K_p: 1.7, A: 2.3, B: -0.8 };
	for (const [key, coefficient] of Object.entries(signature)) {
		const [harmonic, power, symbol] = key.split(":");
		const basis =
			harmonic === "cos"
				? Math.cos(frequency * t)
				: harmonic === "sin"
					? Math.sin(frequency * t)
					: Math.exp(rate * t);
		total += coefficient * values[symbol!]! * t ** Number(power) * basis;
	}
	return total;
}

/**
 * Verifies distinct structural signatures and one correct choice.
 * @param choices - Generated choices to audit.
 */
function expectUniqueChoices(choices: OdeItsOption[]): void {
	expect(choices.length).toBeGreaterThanOrEqual(2);
	expect(
		choices.filter(
			/** Selects correct choices. @param choice - Candidate choice. */ (
				choice,
			) => choice.isCorrect,
		),
	).toHaveLength(1);
	const keys = choices.map(
		/** Canonicalizes nonzero coefficients. @param choice - Candidate choice. */ (
			choice,
		) =>
			JSON.stringify(
				Object.entries(choice.coefficients!)
					.filter(
						/** Removes zero coordinates. @param entry - Basis coefficient. */ ([
							,
							value,
						]) => value !== 0,
					)
					.sort(),
			),
	);
	expect(new Set(keys).size).toBe(choices.length);
}

describe("ODE teaching choice regressions", () => {
	/** Prevents a formatting giveaway while retaining five distinct harmonic systems. */
	it("renders every sinusoidal system choice as matched coefficient equations", () => {
		for (const order of [1, 2] as const) {
			for (let seed = 0; seed < 30; seed++) {
				const { systemOptions = [] } = generateOdeProblem({
					order,
					forcingType: "sinusoid",
					seed,
				}).itsData.step5;
				expect(systemOptions).toHaveLength(5);
				expectUniqueChoices(systemOptions);
				for (const option of systemOptions) {
					expect(option.latex).toMatch(/^\\begin\{cases\}/);
					expect(option.latex).not.toMatch(/\\(?:cos|sin)/);
					expect(option.latex.match(/=/g)).toHaveLength(2);
				}
			}
		}
	});

	/** Restores three distinct derivative choices without weakening equivalence checks. */
	it("offers zero, an unchanged constant, and a time-powered constant for each derivative", () => {
		for (const order of [1, 2] as const) {
			for (let seed = 0; seed < 20; seed++) {
				const step5 = generateOdeProblem({
					order,
					forcingType: "constant",
					resonance: "none",
					seed,
				}).itsData.step5;
				const derivatives = [step5.firstDerivativeOptions ?? []];
				if ("secondDerivativeOptions" in step5)
					derivatives.push(step5.secondDerivativeOptions ?? []);
				for (const [index, choices] of derivatives.entries()) {
					expect(choices).toHaveLength(3);
					expectUniqueChoices(choices);
					const signatures = choices.map(
						/** Reads a choice's mathematical coefficients. @param choice - Derivative choice. */
						(choice) => choice.coefficients,
					);
					expect(signatures).toEqual(
						expect.arrayContaining([
							{},
							{ "plain:0:K_p": 1 },
							{ [`plain:${index + 1}:K_p`]: 1 },
						]),
					);
				}
			}
		}
	});

	/** Exercises offset choices that survive deduplication, including the cancelling coefficient. */
	it("uses the same non-cancelling signed offset in response displays and signatures", () => {
		for (const [order, a1, a0] of [
			[1, 1, 1],
			[2, 3, 2],
			[2, 2, 1],
			[2, 2, 2],
		] as const) {
			const ode = solveCharacteristicEquation({ order, a2: 1, a1, a0 });
			const particular = computeParticularSolution(ode, {
				type: "constant",
				K: 0,
				latex: "0",
			});
			for (const c1 of [-1, 0, 1]) {
				const homogeneous = solveHomogeneousConstants(
					ode,
					c1,
					c1 * ode.roots.r1,
				);
				const zero = solveHomogeneousConstants(ode, 0, 0);
				const { step7Data } = buildStep7Data({
					resolvedOrder: order,
					resolvedRootType:
						ode.order === 1 ? "distinct_real" : ode.rootType,
					roots: generationRoots(ode),
					initialConditions: { y0: c1, dy0: c1 * ode.roots.r1 },
					homogeneousZI: homogeneous,
					homogeneousZS: zero,
					homogeneousComplete: homogeneous,
					particular,
					ziLatex: homogeneous.latex,
					zsLatex: "0",
					y_tr_latex: homogeneous.latex,
					y_ss_latex: "0",
					random: () => 0.5,
				});
				const offset = step7Data.transientOptions.find(
					/** Selects the fallback distractor. @param option - Response choice. */
					(option) => option.id === "tr_offset",
				);
				expect(offset).toBeDefined();
				expect(offset?.coefficients?.C1).toBe(c1 < 0 ? -2 : c1 + 1);
				expect(offset?.isCorrect).toBe(false);
				expect(offset?.latex).toContain(c1 < 0 ? ") - " : ") + ");
				expectUniqueChoices(step7Data.transientOptions);
			}
		}
	});

	/** Verifies explicit filters take precedence over incompatible random selections. */
	it("honors concrete root and forcing filters before mixed-mode choices", () => {
		for (let seed = 0; seed < 50; seed++) {
			const roots = generateOdeProblem({
				order: "random",
				rootType: "complex_conjugate",
				resonance: "random",
				seed,
			});
			expect(roots.params.order).toBe(2);
			expect(roots.params.rootType).toBe("complex_conjugate");
			const input = generateOdeProblem({
				forcingType: "constant",
				resonance: "random",
				seed,
			});
			expect(input.forcing.type).toBe("constant");
		}
	});
	/** Audits representative generated cases without trusting their answer flags for equivalence. */
	it("keeps derivative, substitution, and decomposition choices distinct across seeds", () => {
		for (const order of [1, 2] as const)
			for (const forcingType of [
				"constant",
				"exponential",
				"sinusoid",
			] as const)
				for (const resonance of ["none", "simple", "repeated"] as const)
					for (let seed = 0; seed < 20; seed++) {
						const problem = generateOdeProblem({
							order,
							forcingType,
							resonance,
							seed,
						});
						const step5 = problem.itsData.step5;
						expectUniqueChoices(step5.firstDerivativeOptions!);
						if ("secondDerivativeOptions" in step5)
							expectUniqueChoices(step5.secondDerivativeOptions!);
						expectUniqueChoices(step5.systemOptions!);
						expectUniqueChoices(
							problem.itsData.step7.transientOptions,
						);
						expectUniqueChoices(
							problem.itsData.step7.steadyStateOptions,
						);
						const unknowns: Record<string, number> = {
							K_p: step5.expectedKp ?? 0,
							A: step5.expectedA ?? 0,
							B: step5.expectedB ?? 0,
							input: 1,
						};
						const rows = new Map<string, number>();
						for (const [key, coefficient] of Object.entries(
							step5.systemOptions!.find(
								/** Finds the selected equation system. @param option - System choice. */ (
									option,
								) => option.isCorrect,
							)!.coefficients!,
						)) {
							const [harmonic, power, symbol] = key.split(":");
							const row = `${harmonic}:${power}`;
							rows.set(
								row,
								(rows.get(row) ?? 0) +
									coefficient * unknowns[symbol!]!,
							);
						}
						for (const residual of rows.values())
							expect(residual).toBeCloseTo(0, 9);
					}
	});

	/** Checks analytic scaffold derivatives against independent numerical differentiation. */
	it("derives constant, exponential, and sinusoidal resonant trials correctly", () => {
		const cases = [
			{
				ode: solveCharacteristicEquation({ order: 2, a1: 0, a0: 0 }),
				forcing: { type: "constant" as const, K: 2, latex: "2" },
			},
			{
				ode: solveCharacteristicEquation({ order: 2, a1: 4, a0: 4 }),
				forcing: {
					type: "exponential" as const,
					K: 6,
					p: -2,
					latex: "6e^{-2t}",
				},
			},
			{
				ode: solveCharacteristicEquation({ order: 2, a1: 0, a0: 4 }),
				forcing: {
					type: "sinusoid" as const,
					K: 8,
					omega: 2,
					latex: "8\\cos(2t)",
				},
			},
		];
		for (const { ode, forcing } of cases) {
			const particular = computeParticularSolution(ode, forcing);
			const data = buildStep5Data({
				resolvedOrder: 2,
				...ode,
				forcing,
				particular,
				random: /** Returns a deterministic shuffle value. */ () => 0.5,
			});
			const p = "p" in forcing ? forcing.p : 0;
			const w = "omega" in forcing ? forcing.omega : 1;
			/** Evaluates the trial independently. @param t - Evaluation time. */
			const trial = (t: number): number =>
				t ** particular.resonanceMultiplicity *
				(forcing.type === "sinusoid"
					? 2.3 * Math.cos(w * t) - 0.8 * Math.sin(w * t)
					: 1.7 * Math.exp(p * t));
			for (const t of [0.2, 0.7]) {
				const h = 1e-4;
				const first = data.firstDerivativeOptions!.find(
					/** Finds the expected derivative. @param option - Derivative choice. */ (
						option,
					) => option.isCorrect,
				)!;
				const second =
					"secondDerivativeOptions" in data
						? data.secondDerivativeOptions!.find(
								/** Finds the expected second derivative. @param option - Derivative choice. */ (
									option,
								) => option.isCorrect,
							)!
						: first;
				expect(
					evaluateSignature(first.coefficients!, t, p, w),
				).toBeCloseTo((trial(t + h) - trial(t - h)) / (2 * h), 5);
				expect(
					evaluateSignature(second.coefficients!, t, p, w),
				).toBeCloseTo(
					(trial(t + h) - 2 * trial(t) + trial(t - h)) / (h * h),
					4,
				);
			}
			const ansatz = buildStep4Data({
				forcing,
				particular,
			}).step4Options.find(
				/** Finds the trial form. @param option - Ansatz choice. */ (
					option,
				) => option.isCorrect,
			)!.latex;
			expect(ansatz).toContain(
				particular.resonanceMultiplicity === 2 ? "t^2" : "t[",
			);
		}
	});

	/** Verifies the course's distinction for all generated exponential inputs. */
	it("classifies decaying exponential responses as wholly transient", () => {
		for (const order of [1, 2] as const)
			for (const resonance of ["none", "simple", "repeated"] as const) {
				const problem = generateOdeProblem({
					order,
					forcingType: "exponential",
					resonance,
					seed: 42,
				});
				expect(problem.itsData.step7.decompositionMode).toBe(
					"homogeneous_particular",
				);
				expect(problem.solutions.y_tr_latex).toBe(
					problem.solutions.y_complete_latex,
				);
				expect(problem.solutions.y_ss_latex).toBe("0");
				expect(
					problem.itsData.step7.transientOptions.find(
						/** Finds the algebraic homogeneous response. @param option - Choice. */ (
							option,
						) => option.isCorrect,
					)!.latex,
				).toBe(`y_h(t) = ${problem.solutions.y_h_latex}`);
			}
	});
});
