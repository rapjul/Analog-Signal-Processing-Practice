/**
 * Linear Constant-Coefficient ODE Practice Problem & ITS Generator.
 *
 * Implements backward constructive synthesis for 1st- and 2nd-order ODEs,
 * guaranteeing exact integer coefficients, clean roots, and multi-tier ITS scaffolding.
 */

import { formatOdeLhs, sanitizeLatexMath } from "$lib/math-engine/formatting";
import {
	buildStep1Data,
	buildStep2Data,
	buildStep3Data,
	buildStep4Data,
	buildStep5Data,
	buildStep6Data,
	buildStep7Data,
} from "$lib/math-engine/odes/its-scaffolding";
import { createSeededPrng } from "$lib/math-engine/random";
import {
	generateEquation,
	generateForcing,
	generateInitialConditions,
	generationPresentation,
	generationRoots,
	resolveGenerationParameters,
	resolveGenerationSeed,
} from "./generation-parameters";
import { classifyResponseDecomposition } from "./response-decomposition";
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
	OdeGenerationOptions,
	OdeProblem,
	SecondOrderOdeItsData,
	SecondOrderOdeItsStep2,
	SecondOrderOdeItsStep3,
	SecondOrderOdeItsStep5,
	SecondOrderOdeItsStep6,
	SecondOrderOdeItsStep7,
	SecondOrderOdeParams,
	SecondOrderOdeProblem,
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
	const seed = resolveGenerationSeed(options.seed);
	const random = createSeededPrng(seed);
	const parameters = resolveGenerationParameters(options, random);
	const { resolvedOrder, resolvedRootType, leadingCoefficient } = parameters;
	const odeParams = generateEquation(parameters, random);
	const { a2, a1, a0 } = odeParams;
	const roots = generationRoots(odeParams);
	const forcing = generateForcing(parameters, odeParams, random);

	const initialConditions = generateInitialConditions(resolvedOrder, random);

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

	const completeLatex = sanitizeLatexMath(
		particular.latex === "0"
			? homogeneousComplete.latex
			: `${homogeneousComplete.latex} + ${particular.latex}`,
	);
	const ziLatex = homogeneousZI.latex;
	const zsLatex =
		particular.latex === "0"
			? homogeneousZS.latex
			: `${homogeneousZS.latex} + ${particular.latex}`;
	const { particularDecays, y_tr_latex, y_ss_latex } =
		classifyResponseDecomposition(
			forcing,
			homogeneousComplete,
			particular,
			completeLatex,
		);

	const { charEqLhs, discriminant, difficulty } = generationPresentation(
		odeParams,
		parameters,
	);

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
		decompositionMode:
			forcing.type === "exponential"
				? "homogeneous_particular"
				: "transient_steady_state",
		resolvedOrder,
		resolvedRootType,
		roots,
		initialConditions,
		homogeneousZI,
		homogeneousZS,
		homogeneousComplete,
		particular,
		particularDecays,
		ziLatex,
		zsLatex,
		y_tr_latex,
		y_ss_latex,
		random,
	});

	/** @param t - Sampling time. @returns Complete response. */
	const evalComplete = (t: number) =>
		homogeneousComplete.eval(t) + particular.eval(t);
	/** @param t - Sampling time. @returns Zero-input response. */
	const evalZI = (t: number) => homogeneousZI.eval(t);
	/** @param t - Sampling time. @returns Zero-state response. */
	const evalZS = (t: number) => homogeneousZS.eval(t) + particular.eval(t);

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
