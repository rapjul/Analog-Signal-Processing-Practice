/**
 * Step 6 Initial Conditions ITS Scaffolding Builder.
 *
 * Formulates the target homogeneous initial value offsets ($y_h(0^+) = y(0^+) - y_p(0^+)$)
 * and the algebraic linear system to solve for arbitrary constants ($C_1, C_2$).
 */

import { formatSignedLinearTerm } from "../../formatting";
import { toFractionLatex } from "../../fraction";
import type {
	FirstOrderOdeItsStep6,
	HomogeneousSolution,
	OdeItsStep6,
	OdeOrder,
	OdeProblem,
	ParticularSolution,
	SecondOrderOdeItsStep6,
	SecondOrderRootType,
} from "../types";

/**
 * Parameters required to build Step 6 ITS data.
 */
export interface BuildStep6Params {
	/** Differential equation order (1 or 2) */
	resolvedOrder: OdeOrder;
	/** Root classification type */
	resolvedRootType: SecondOrderRootType;
	/** Characteristic roots */
	roots: { r1: number; r2?: number; im?: number };
	/** Problem initial conditions */
	initialConditions: OdeProblem["initialConditions"];
	/** Target initial homogeneous value $y_h(0^+)$ */
	targetYh0: number;
	/** Target initial homogeneous derivative value $y_h'(0^+)$ */
	targetDYh0: number;
	/** Particular solution computation results */
	particular: ParticularSolution;
	/** Complete response homogeneous solution */
	homogeneousComplete: HomogeneousSolution;
}

/**
 * Result structure of Step 6 scaffolding generation.
 */
export interface Step6ScaffoldingResult {
	/** Initial conditions linear system LaTeX */
	icSystemLatex: string;
	/** Step 6 ITS metadata */
	step6Data: OdeItsStep6;
}

/**
 * Builds the Step 6 (Initial Conditions System) ITS metadata.
 *
 * @param {BuildStep6Params} params Configuration parameters for Step 6
 * @returns {Step6ScaffoldingResult} Initial condition system LaTeX and Step 6 ITS metadata
 */
export function buildStep6Data(
	params: BuildStep6Params,
): Step6ScaffoldingResult {
	const {
		resolvedOrder,
		resolvedRootType,
		roots,
		initialConditions,
		targetYh0,
		targetDYh0,
		particular,
		homogeneousComplete,
	} = params;

	let icSystemLatex = "";
	if (resolvedOrder === 1) {
		icSystemLatex = `C_1 = ${toFractionLatex(targetYh0)}`;
	} else if (resolvedRootType === "distinct_real") {
		const r1 = roots.r1;
		const r2 = roots.r2 ?? 0;
		const eq1 = `C_1 + C_2 = ${toFractionLatex(targetYh0)}`;
		const term1 = formatSignedLinearTerm(r1, "C_1", true);
		const term2 = formatSignedLinearTerm(r2, "C_2", false);
		const eq2 = `${term1} ${term2} = ${toFractionLatex(targetDYh0)}`;
		icSystemLatex = String.raw`\begin{cases} ${eq1} \\ ${eq2} \end{cases}`;
	} else if (resolvedRootType === "repeated_real") {
		const r = roots.r1;
		const eq1 = `C_1 = ${toFractionLatex(targetYh0)}`;
		const term1 = formatSignedLinearTerm(r, "C_1", true);
		const eq2 = `${term1} + C_2 = ${toFractionLatex(targetDYh0)}`;
		icSystemLatex = String.raw`\begin{cases} ${eq1} \\ ${eq2} \end{cases}`;
	} else {
		const sig = roots.r1;
		const wd = roots.im ?? 1;
		const eq1 = `C_1 = ${toFractionLatex(targetYh0)}`;
		const term1 = formatSignedLinearTerm(sig, "C_1", true);
		const term2 = formatSignedLinearTerm(wd, "C_2", false);
		const eq2 = `${term1} ${term2} = ${toFractionLatex(targetDYh0)}`;
		icSystemLatex = String.raw`\begin{cases} ${eq1} \\ ${eq2} \end{cases}`;
	}

	let step6Data: OdeItsStep6;
	if (resolvedOrder === 1) {
		const step6FirstOrder: FirstOrderOdeItsStep6 = {
			expectedC1: homogeneousComplete.C1,
			yp0: particular.eval(0),
			targetYh0,
			icSystemLatex,
			hints: [
				"Initial conditions apply to $y(t)=y_h(t)+y_p(t)$. Find $y_p(0^+)$ first.",
				`Calculate $y_h(0^+)=${initialConditions.y0}-(${toFractionLatex(particular.eval(0))})=${toFractionLatex(targetYh0)}$.`,
				`Solve $C_1=${toFractionLatex(homogeneousComplete.C1)}$.`,
			],
			subStepHints: {
				target_values: [
					"Evaluate $y_p(0^+)$ at $t=0$.",
					"Use $y_h(0^+)=y(0^+)-y_p(0^+)$.",
					`Target: $y_h(0^+)=${toFractionLatex(targetYh0)}$.`,
				],
				solve_constants: [
					"Match $y_h(0^+)$ to the target value.",
					`Solve the linear system: $${icSystemLatex}$.`,
					`Constant: $C_1=${toFractionLatex(homogeneousComplete.C1)}$.`,
				],
			},
		};
		step6Data = step6FirstOrder;
	} else {
		const step6SecondOrder: SecondOrderOdeItsStep6 = {
			expectedC1: homogeneousComplete.C1,
			expectedC2: homogeneousComplete.C2 ?? 0,
			yp0: particular.eval(0),
			dyp0: particular.evalDeriv(0),
			targetYh0,
			targetDYh0,
			icSystemLatex,
			hints: [
				"Initial conditions apply to $y(t)=y_h(t)+y_p(t)$. Find $y_p(0^+)$ and $y_p'(0^+)$ first.",
				`Calculate $y_h(0^+)=${toFractionLatex(targetYh0)}$ and $y_h'(0^+)=${toFractionLatex(targetDYh0)}$.`,
				`Solve $C_1=${toFractionLatex(homogeneousComplete.C1)}$ and $C_2=${toFractionLatex(homogeneousComplete.C2 ?? 0)}$.`,
			],
			subStepHints: {
				target_values: [
					"Evaluate $y_p(0^+)$ and $y_p'(0^+)$ at $t=0$.",
					"Subtract both particular-solution offsets from the total initial conditions.",
					`Targets: $y_h(0^+)=${toFractionLatex(targetYh0)}$, $y_h'(0^+)=${toFractionLatex(targetDYh0)}$.`,
				],
				solve_constants: [
					"Match $y_h(0^+)$ and $y_h'(0^+)$ to the target values.",
					`Solve the linear system: $${icSystemLatex}$.`,
					`Constants: $C_1=${toFractionLatex(homogeneousComplete.C1)}$, $C_2=${toFractionLatex(homogeneousComplete.C2 ?? 0)}$.`,
				],
			},
		};
		step6Data = step6SecondOrder;
	}

	return { icSystemLatex, step6Data };
}
