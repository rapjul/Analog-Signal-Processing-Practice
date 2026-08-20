/**
 * @file Unit test suite verifying mathematical invariants, superposition,
 * and state integrity across all linear constant-coefficient ODE configurations.
 */

import { describe, expect, it } from "vitest";
import {
	type ForcingFunction,
	type ForcingType,
	generateOdeProblem,
	type LeadingCoefficientType,
	type OdeOrder,
	type OdeProblem,
	type ResonanceType,
	type SecondOrderRootType,
} from "../../src/lib/math-engine/odes/index";

/**
 * Computes exact input forcing value x(t) at time t.
 *
 * @param {ForcingFunction} forcing Forcing function configuration
 * @param {number} t Time instant in seconds
 * @returns {number} Evaluated forcing value x(t)
 */
function evaluateForcing(forcing: ForcingFunction, t: number): number {
	switch (forcing.type) {
		case "constant":
			return forcing.K;
		case "exponential": {
			const p = forcing.p ?? 0;
			return forcing.K * Math.exp(p * t);
		}
		case "sinusoid": {
			const omega = forcing.omega ?? 0;
			return forcing.K * Math.cos(omega * t);
		}
		default:
			throw new Error(
				`Unhandled forcing type: ${(forcing as ForcingFunction).type}`,
			);
	}
}

/**
 * Evaluates first numerical derivative using centered finite difference:
 * f'(t) \approx [f(t + h) - f(t - h)] / (2h).
 *
 * @param {(t: number) => number} fn Target scalar function
 * @param {number} t Time point
 * @param {number} [h=1e-5] Perturbation step size
 * @returns {number} Approximate first derivative value
 */
function centeredFirstDerivative(
	fn: (t: number) => number,
	t: number,
	h = 1e-5,
): number {
	return (fn(t + h) - fn(t - h)) / (2 * h);
}

/**
 * Evaluates second numerical derivative using centered finite difference:
 * f''(t) \approx [f(t + h) - 2f(t) + f(t - h)] / h^2.
 *
 * @param {(t: number) => number} fn Target scalar function
 * @param {number} t Time point
 * @param {number} [h=1e-3] Perturbation step size
 * @returns {number} Approximate second derivative value
 */
function centeredSecondDerivative(
	fn: (t: number) => number,
	t: number,
	h = 1e-3,
): number {
	return (fn(t + h) - 2 * fn(t) + fn(t - h)) / (h * h);
}

describe("LCC ODE Mathematical & Structural Invariants", () => {
	const orders: OdeOrder[] = [1, 2];
	const rootTypes: SecondOrderRootType[] = [
		"distinct_real",
		"repeated_real",
		"complex_conjugate",
	];
	const forcingTypes: ForcingType[] = ["constant", "exponential", "sinusoid"];
	const leadingCoeffs: LeadingCoefficientType[] = ["monic", "non_monic"];
	const resonanceTypes: ResonanceType[] = ["none", "simple", "repeated"];
	const testTimePoints = [0, 0.1, 0.35, 0.7, 1.2];

	describe("Superposition, Initial Conditions, and Differential Equation Satisfaction", () => {
		for (const order of orders) {
			for (const forcingType of forcingTypes) {
				for (const leadingCoefficient of leadingCoeffs) {
					for (const resonance of resonanceTypes) {
						if (order === 1 && resonance === "repeated") {
							continue; // 1st-order characteristic equations cannot have repeated resonance (multiplicity 2)
						}

						const rootSubset =
							order === 1
								? (["distinct_real"] as const) // generator normalizes 1st-order to single_real
								: rootTypes;

						for (const rootType of rootSubset) {
							const testTitle = `Order ${order} | ${order === 1 ? "single_real" : rootType} | ${forcingType} | ${leadingCoefficient} | res:${resonance}`;

							it(testTitle, () => {
								const problem: OdeProblem = generateOdeProblem({
									order,
									rootType,
									forcingType,
									leadingCoefficient,
									resonance,
									seed: 42 + order * 10,
								});

								// 1. Structural Parameter Validations
								expect(problem.params.order).toBe(order);
								if (order === 1) {
									expect(problem.params.a2).toBe(0);
									expect(problem.params.rootType).toBe(
										"single_real",
									);
									expect(
										problem.initialConditions.dy0,
									).toBeUndefined();
									expect(
										problem.itsData.step6.expectedC2,
									).toBeUndefined();
								} else {
									expect(problem.params.a2).not.toBe(0);
									const expectedRootType =
										resonance === "simple"
											? "distinct_real"
											: resonance === "repeated"
												? "repeated_real"
												: rootType;
									expect(problem.params.rootType).toBe(
										expectedRootType,
									);
									expect(
										typeof problem.initialConditions.dy0,
									).toBe("number");
									expect(
										typeof problem.itsData.step6.expectedC2,
									).toBe("number");
								}

								// 2. Initial Condition Satisfaction for Complete Response
								const y0Actual = problem.evalComplete(0);
								expect(y0Actual).toBeCloseTo(
									problem.initialConditions.y0,
									4,
								);

								if (
									order === 2 &&
									problem.initialConditions.dy0 !== undefined
								) {
									const dy0Actual = centeredFirstDerivative(
										problem.evalComplete,
										0,
										1e-5,
									);
									expect(dy0Actual).toBeCloseTo(
										problem.initialConditions.dy0,
										2,
									);
								}

								// 3. Zero-State Initial Conditions: y_zs(0) = 0, y'_zs(0) = 0
								expect(problem.evalZS(0)).toBeCloseTo(0, 4);
								if (order === 2) {
									const dyZs0 = centeredFirstDerivative(
										problem.evalZS,
										0,
										1e-5,
									);
									expect(dyZs0).toBeCloseTo(0, 2);
								}

								// 4. Zero-Input Initial Conditions: y_zi(0) = y(0)
								expect(problem.evalZI(0)).toBeCloseTo(
									problem.initialConditions.y0,
									4,
								);
								if (
									order === 2 &&
									problem.initialConditions.dy0 !== undefined
								) {
									const dyZi0 = centeredFirstDerivative(
										problem.evalZI,
										0,
										1e-5,
									);
									expect(dyZi0).toBeCloseTo(
										problem.initialConditions.dy0,
										2,
									);
								}

								// 5. Invariants across multiple evaluation time points
								for (const t of testTimePoints) {
									const yTotal = problem.evalComplete(t);
									const yZI = problem.evalZI(t);
									const yZS = problem.evalZS(t);

									// 5a. Numerical finiteness
									expect(Number.isFinite(yTotal)).toBe(true);
									expect(Number.isFinite(yZI)).toBe(true);
									expect(Number.isFinite(yZS)).toBe(true);

									// 5b. Exact Superposition Principle: y(t) = y_zi(t) + y_zs(t)
									expect(yTotal).toBeCloseTo(yZI + yZS, 6);

									// 5c. Homogeneous Equation Satisfaction for Zero-Input Response:
									// a2 * y_zi''(t) + a1 * y_zi'(t) + a0 * y_zi(t) = 0
									if (t > 0) {
										const a1 = problem.params.a1;
										const a0 = problem.params.a0;
										const dyZI = centeredFirstDerivative(
											problem.evalZI,
											t,
											1e-5,
										);

										if (order === 1) {
											const ziResidual =
												a1 * dyZI + a0 * yZI;
											const tolZI = Math.max(
												1e-3,
												1e-3 * Math.abs(yZI),
											);
											expect(
												Math.abs(ziResidual),
											).toBeLessThan(tolZI);
										} else {
											const a2 = problem.params.a2;
											const d2yZI =
												centeredSecondDerivative(
													problem.evalZI,
													t,
													1e-3,
												);
											const ziResidual =
												a2 * d2yZI +
												a1 * dyZI +
												a0 * yZI;
											const tolZI = Math.max(
												2e-2,
												2e-2 * Math.abs(yZI),
											);
											expect(
												Math.abs(ziResidual),
											).toBeLessThan(tolZI);
										}

										// 5d. Forced Differential Equation Satisfaction for Complete Response:
										// a2 * y''(t) + a1 * y'(t) + a0 * y(t) = x(t)
										const xt = evaluateForcing(
											problem.forcing,
											t,
										);
										const dyTotal = centeredFirstDerivative(
											problem.evalComplete,
											t,
											1e-5,
										);

										if (order === 1) {
											const totalResidual =
												a1 * dyTotal + a0 * yTotal - xt;
											const tolTotal = Math.max(
												2e-3,
												2e-3 * Math.abs(xt),
											);
											expect(
												Math.abs(totalResidual),
											).toBeLessThan(tolTotal);
										} else {
											const a2 = problem.params.a2;
											const d2yTotal =
												centeredSecondDerivative(
													problem.evalComplete,
													t,
													1e-3,
												);
											const totalResidual =
												a2 * d2yTotal +
												a1 * dyTotal +
												a0 * yTotal -
												xt;
											const tolTotal = Math.max(
												5e-2,
												5e-2 * Math.abs(xt),
											);
											expect(
												Math.abs(totalResidual),
											).toBeLessThan(tolTotal);
										}
									}
								}
							});
						}
					}
				}
			}
		}
	});

	describe("ITS Step Data Alignment & State Preservation", () => {
		it("ensures Step 5 undetermined coefficient sub-step counts match expected structure", () => {
			// 1st-order constant: 2 parts (first_deriv, solve)
			const p1Const = generateOdeProblem({
				order: 1,
				forcingType: "constant",
				seed: 100,
			});
			expect(
				p1Const.itsData.step5.secondDerivativeOptions,
			).toBeUndefined();
			expect(p1Const.itsData.step5.firstDerivativeOptions).toBeDefined();

			// 1st-order sinusoid: 3 parts (first_deriv, system_setup, solve)
			const p1Sin = generateOdeProblem({
				order: 1,
				forcingType: "sinusoid",
				seed: 101,
			});
			expect(p1Sin.itsData.step5.secondDerivativeOptions).toBeUndefined();
			expect(p1Sin.itsData.step5.systemOptions).toBeDefined();

			// 2nd-order sinusoid: 4 parts (first_deriv, second_deriv, system_setup, solve)
			const p2Sin = generateOdeProblem({
				order: 2,
				rootType: "distinct_real",
				forcingType: "sinusoid",
				seed: 102,
			});
			expect(p2Sin.itsData.step5.firstDerivativeOptions).toBeDefined();
			expect(p2Sin.itsData.step5.secondDerivativeOptions).toBeDefined();
			expect(p2Sin.itsData.step5.systemOptions).toBeDefined();
		});

		it("ensures Step 4 resonance distractor feedback is pedagogically distinct", () => {
			const pSimple = generateOdeProblem({
				order: 2,
				rootType: "distinct_real",
				forcingType: "exponential",
				resonance: "simple",
				seed: 200,
			});

			const distractorOver = pSimple.itsData.step4.options.find(
				(opt) => !opt.isCorrect && opt.id === "d2",
			);
			expect(distractorOver?.feedback).toContain(
				"Simple resonance (multiplicity 1) requires exactly one factor of $t$",
			);
		});
	});
});
