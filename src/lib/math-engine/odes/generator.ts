/**
 * Linear Constant-Coefficient ODE Practice Problem & ITS Generator.
 *
 * Implements backward constructive synthesis for 1st- and 2nd-order ODEs,
 * guaranteeing exact integer coefficients, clean roots, and multi-tier ITS scaffolding.
 */

import {
	formatOdeLhs,
	formatPolynomial,
	sanitizeLatexMath,
} from "../formatting";
import {
	createRandomSeed,
	createSeededPrng,
	randomChoice,
	randomInt,
} from "../random";
import {
	buildStep1Data,
	buildStep2Data,
	buildStep3Data,
	buildStep4Data,
	buildStep5Data,
	buildStep6Data,
	buildStep7Data,
} from "./its-scaffolding";
import { computeParticularSolution, solveHomogeneousConstants } from "./solver";
import type {
	FirstOrderOdeItsData,
	FirstOrderOdeItsStep2,
	FirstOrderOdeItsStep3,
	FirstOrderOdeItsStep5,
	FirstOrderOdeItsStep6,
	FirstOrderOdeItsStep7,
	FirstOrderOdeParams,
	FirstOrderOdeProblem,
	ForcingFunction,
	ForcingType,
	OdeGenerationOptions,
	OdeOrder,
	OdeParams,
	OdeProblem,
	ResonanceType,
	SecondOrderOdeItsData,
	SecondOrderOdeItsStep2,
	SecondOrderOdeItsStep3,
	SecondOrderOdeItsStep5,
	SecondOrderOdeItsStep6,
	SecondOrderOdeItsStep7,
	SecondOrderOdeParams,
	SecondOrderOdeProblem,
	SecondOrderRootType,
} from "./types";

/**
 * Backward Constructive Generator for 1st- and 2nd-order LCC ODE problems.
 * Constructs problems backwards from target roots to guarantee exact integer coefficients.
 *
 * @param {OdeGenerationOptions} [options] Problem generation parameters
 * @returns {OdeProblem} Fully formulated OdeProblem object
 */
export function generateOdeProblem(
	options: OdeGenerationOptions & { order: 1 },
): FirstOrderOdeProblem;
export function generateOdeProblem(
	options: OdeGenerationOptions & { order: 2 },
): SecondOrderOdeProblem;
export function generateOdeProblem(options?: OdeGenerationOptions): OdeProblem;
export function generateOdeProblem(
	options: OdeGenerationOptions = {},
): OdeProblem {
	const seed = Number.isFinite(options.seed)
		? Math.trunc(options.seed ?? 0) >>> 0
		: createRandomSeed();
	const random = createSeededPrng(seed);
	const requestedOrder = options.order ?? "random";
	let resolvedOrder: OdeOrder =
		requestedOrder === "random"
			? randomChoice(random, [1, 2] as const)
			: requestedOrder;

	const requestedResonance = options.resonance ?? "none";
	let resolvedResonance: ResonanceType =
		requestedResonance === true || requestedResonance === "resonant"
			? "simple"
			: requestedResonance === false ||
				  requestedResonance === "nonresonant"
				? "none"
				: requestedResonance === "random"
					? random() < 0.25
						? resolvedOrder === 2 && random() < 0.5
							? "repeated"
							: "simple"
						: "none"
					: requestedResonance;

	if (resolvedOrder === 1 && resolvedResonance === "repeated") {
		resolvedResonance = "simple";
	} else if (
		resolvedResonance === "repeated" &&
		requestedOrder === "random"
	) {
		resolvedOrder = 2;
	}
	const rootTypes: SecondOrderRootType[] = [
		"distinct_real",
		"repeated_real",
		"complex_conjugate",
	];
	let resolvedRootType: SecondOrderRootType =
		options.rootType === undefined || options.rootType === "random"
			? randomChoice(random, rootTypes)
			: options.rootType;
	if (resolvedOrder === 1 || resolvedResonance === "simple") {
		resolvedRootType = "distinct_real";
	} else if (resolvedResonance === "repeated") {
		resolvedRootType = "repeated_real";
	}

	const forcingTypes: ForcingType[] = ["constant", "exponential", "sinusoid"];
	let resolvedForcingType: ForcingType =
		options.forcingType === undefined || options.forcingType === "random"
			? randomChoice(random, forcingTypes)
			: options.forcingType;
	if (resolvedResonance !== "none") resolvedForcingType = "exponential";

	const requestedLeading = options.leadingCoefficient ?? "random";
	let leadingCoefficient: number;
	if (typeof requestedLeading === "number") {
		if (!Number.isFinite(requestedLeading) || requestedLeading === 0) {
			throw new Error(
				"leadingCoefficient must be a finite non-zero number",
			);
		}
		leadingCoefficient = requestedLeading;
	} else if (requestedLeading === "monic") {
		leadingCoefficient = 1;
	} else if (
		requestedLeading === "non_monic" ||
		requestedLeading === "non-monic"
	) {
		leadingCoefficient = randomInt(random, 2, 4);
	} else {
		leadingCoefficient = randomChoice(random, [1, randomInt(random, 2, 4)]);
	}

	const a2 = resolvedOrder === 2 ? leadingCoefficient : 0;
	let a1: number;
	let a0: number;
	let roots: { r1: number; r2?: number; im?: number };

	if (resolvedOrder === 1) {
		const r = -randomInt(random, 1, 6);
		a1 = leadingCoefficient;
		a0 = -leadingCoefficient * r;
		roots = { r1: r };
	} else {
		switch (resolvedRootType) {
			case "distinct_real": {
				const r1 = -randomInt(random, 1, 4);
				const r2 = -randomInt(random, 5, 8);
				a1 = -leadingCoefficient * (r1 + r2);
				a0 = leadingCoefficient * r1 * r2;
				roots = { r1, r2 };
				break;
			}
			case "repeated_real": {
				const r = -randomInt(random, 1, 4);
				a1 = -2 * leadingCoefficient * r;
				a0 = leadingCoefficient * r * r;
				roots = { r1: r, r2: r };
				break;
			}
			case "complex_conjugate": {
				const sigma = -randomInt(random, 1, 3);
				const omegaD = randomInt(random, 2, 5);
				a1 = -2 * leadingCoefficient * sigma;
				a0 = leadingCoefficient * (sigma * sigma + omegaD * omegaD);
				roots = { r1: sigma, im: omegaD };
				break;
			}
			default: {
				throw new Error(
					`Unhandled root type: ${String(resolvedRootType)}`,
				);
			}
		}
	}

	const odeParams: OdeParams =
		resolvedOrder === 1
			? {
					order: 1,
					a2: 0,
					a1,
					a0,
					roots: { r1: roots.r1 },
					rootType: "single_real",
				}
			: {
					order: 2,
					a2,
					a1,
					a0,
					roots: {
						r1: roots.r1,
						r2: roots.r2 ?? roots.r1,
						im: roots.im,
					},
					rootType: resolvedRootType,
				};
	const polynomialAt = (s: number) =>
		resolvedOrder === 1 ? a1 * s + a0 : a2 * s * s + a1 * s + a0;
	const derivativeAt = (s: number) =>
		resolvedOrder === 1 ? a1 : 2 * a2 * s + a1;

	let forcing: ForcingFunction;
	switch (resolvedForcingType) {
		case "constant": {
			const K = randomInt(random, 1, 6) * a0;
			forcing = { type: "constant", K, latex: `${K}` };
			break;
		}
		case "exponential": {
			const p =
				resolvedResonance === "none"
					? -randomInt(random, 9, 11)
					: roots.r1;
			const targetKp = randomInt(random, 1, 5);
			const K =
				resolvedResonance === "none"
					? targetKp * polynomialAt(p)
					: resolvedResonance === "simple"
						? targetKp * derivativeAt(p)
						: targetKp * 2 * a2;
			forcing = { type: "exponential", K, p, latex: `${K} e^{${p}t}` };
			break;
		}
		case "sinusoid": {
			const K = randomInt(random, 2, 11);
			const omega = randomInt(random, 1, 3);
			forcing = {
				type: "sinusoid",
				K,
				omega,
				latex: String.raw`${K} \cos(${omega}t)`,
			};
			break;
		}
		default: {
			throw new Error(
				`Unhandled forcing type: ${String(resolvedForcingType)}`,
			);
		}
	}

	const initialConditions: OdeProblem["initialConditions"] =
		resolvedOrder === 2
			? {
					y0: randomInt(random, -2, 3),
					dy0: randomInt(random, -4, 3),
				}
			: { y0: randomInt(random, -2, 3) };

	const particular = computeParticularSolution(odeParams, forcing);

	// Complete Response Solution (Complete y_h matches y(0+) - y_p(0+) and y'(0+) - y_p'(0+))
	const targetYh0 = initialConditions.y0 - particular.eval(0);
	const targetDYh0 = (initialConditions.dy0 ?? 0) - particular.evalDeriv(0);
	const homogeneousComplete = solveHomogeneousConstants(
		odeParams,
		targetYh0,
		targetDYh0,
	);

	// Zero-Input Response Solution (x(t) = 0, y_p = 0, driven by y(0-), y'(0-))
	const homogeneousZI = solveHomogeneousConstants(
		odeParams,
		initialConditions.y0,
		initialConditions.dy0 ?? 0,
	);

	// Zero-State Response Solution (y(0-) = 0, y'(0-) = 0, driven by x(t))
	const targetYhZS = 0 - particular.eval(0);
	const targetDYhZS = 0 - particular.evalDeriv(0);
	const homogeneousZS = solveHomogeneousConstants(
		odeParams,
		targetYhZS,
		targetDYhZS,
	);

	const odeLatex = `${formatOdeLhs(a2, a1, a0)} = ${forcing.latex}`;

	const completeLatex =
		particular.latex === "0"
			? homogeneousComplete.latex
			: `${homogeneousComplete.latex} + ${particular.latex}`;
	const ziLatex = homogeneousZI.latex;
	const zsLatex =
		particular.latex === "0"
			? homogeneousZS.latex
			: `${homogeneousZS.latex} + ${particular.latex}`;
	const y_tr_latex = homogeneousComplete.latex;
	const y_ss_latex = particular.latex;

	// Characteristic Equation LHS
	const charEqLhs = formatPolynomial(
		resolvedOrder === 1
			? [{ coeff: a1, symbol: "s" }, { coeff: a0 }]
			: [
					{ coeff: a2, symbol: "s^2" },
					{ coeff: a1, symbol: "s" },
					{ coeff: a0 },
				],
	);

	const discriminant = resolvedOrder === 1 ? 0 : a1 * a1 - 4 * a2 * a0;

	// Step Scaffolding Builders
	const step1Data = buildStep1Data({
		resolvedOrder,
		a2,
		a1,
		a0,
		charEqLhs,
	});

	const step2Data = buildStep2Data({
		resolvedOrder,
		resolvedRootType,
		leadingCoefficient,
		a2,
		a1,
		a0,
		roots,
		discriminant,
		charEqLhs,
	});

	const { step3Data } = buildStep3Data({
		resolvedOrder,
		resolvedRootType,
		roots,
	});

	const { step4Options, step4Hints } = buildStep4Data({
		forcing,
		particular,
	});

	const step5Data = buildStep5Data({
		resolvedOrder,
		a2,
		a1,
		a0,
		forcing,
		particular,
		random,
	});

	const { step6Data } = buildStep6Data({
		resolvedOrder,
		resolvedRootType,
		roots,
		initialConditions,
		targetYh0,
		targetDYh0,
		particular,
		homogeneousComplete,
	});

	const { step7Data } = buildStep7Data({
		resolvedOrder,
		resolvedRootType,
		roots,
		initialConditions,
		homogeneousZI,
		homogeneousZS,
		homogeneousComplete,
		particular,
		ziLatex,
		zsLatex,
		y_tr_latex,
		y_ss_latex,
		random,
	});

	const evalComplete = (t: number) =>
		homogeneousComplete.eval(t) + particular.eval(t);
	const evalZI = (t: number) => homogeneousZI.eval(t);
	const evalZS = (t: number) => homogeneousZS.eval(t) + particular.eval(t);

	const difficulty: "easy" | "medium" | "hard" =
		resolvedRootType === "distinct_real" &&
		resolvedForcingType === "constant"
			? "easy"
			: resolvedRootType === "complex_conjugate" ||
				  resolvedForcingType === "sinusoid"
				? "hard"
				: "medium";

	if (resolvedOrder === 1) {
		const firstOrderItsData: FirstOrderOdeItsData = {
			step1: step1Data,
			step2: step2Data as FirstOrderOdeItsStep2,
			step3: step3Data as FirstOrderOdeItsStep3,
			step4: { options: step4Options, hints: step4Hints },
			step5: step5Data as FirstOrderOdeItsStep5,
			step6: step6Data as FirstOrderOdeItsStep6,
			step7: step7Data as FirstOrderOdeItsStep7,
		};
		return {
			id: `ode_${seed}`,
			title: "Practice Problem: 1st-Order LCC ODE",
			difficulty,
			seed,
			params: odeParams as FirstOrderOdeParams,
			forcing,
			initialConditions: { y0: initialConditions.y0 },
			odeLatex,
			solutions: {
				rootType: "single_real",
				r1: roots.r1,
				y_h_latex: sanitizeLatexMath(homogeneousComplete.latex),
				y_p_latex: sanitizeLatexMath(particular.latex),
				y_complete_latex: sanitizeLatexMath(completeLatex),
				y_zi_latex: sanitizeLatexMath(ziLatex),
				y_zs_latex: sanitizeLatexMath(zsLatex),
				y_tr_latex: sanitizeLatexMath(y_tr_latex),
				y_ss_latex: sanitizeLatexMath(y_ss_latex),
			},
			evalComplete,
			evalZI,
			evalZS,
			itsData: firstOrderItsData,
		};
	}

	const secondOrderItsData: SecondOrderOdeItsData = {
		step1: step1Data,
		step2: step2Data as SecondOrderOdeItsStep2,
		step3: step3Data as SecondOrderOdeItsStep3,
		step4: { options: step4Options, hints: step4Hints },
		step5: step5Data as SecondOrderOdeItsStep5,
		step6: step6Data as SecondOrderOdeItsStep6,
		step7: step7Data as SecondOrderOdeItsStep7,
	};
	return {
		id: `ode_${seed}`,
		title: "Practice Problem: 2nd-Order LCC ODE",
		difficulty,
		seed,
		params: odeParams as SecondOrderOdeParams,
		forcing,
		initialConditions: {
			y0: initialConditions.y0,
			dy0: initialConditions.dy0 ?? 0,
		},
		odeLatex,
		solutions: {
			rootType: resolvedRootType,
			r1: roots.r1,
			r2: roots.r2 ?? roots.r1,
			r1_im: roots.im,
			r2_im: roots.im ? -roots.im : undefined,
			y_h_latex: sanitizeLatexMath(homogeneousComplete.latex),
			y_p_latex: sanitizeLatexMath(particular.latex),
			y_complete_latex: sanitizeLatexMath(completeLatex),
			y_zi_latex: sanitizeLatexMath(ziLatex),
			y_zs_latex: sanitizeLatexMath(zsLatex),
			y_tr_latex: sanitizeLatexMath(y_tr_latex),
			y_ss_latex: sanitizeLatexMath(y_ss_latex),
		},
		evalComplete,
		evalZI,
		evalZS,
		itsData: secondOrderItsData,
	};
}
