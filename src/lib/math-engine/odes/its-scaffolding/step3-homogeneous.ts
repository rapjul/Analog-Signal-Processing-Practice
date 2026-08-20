/**
 * Step 3 Homogeneous Form Template ITS Scaffolding Builder.
 *
 * Formulates the appropriate algebraic structure of the natural homogeneous solution $y_h(t)$
 * based on characteristic roots (distinct real, repeated real, or complex conjugate).
 */

import type {
	FirstOrderOdeItsStep3,
	OdeItsStep3,
	OdeOrder,
	SecondOrderOdeItsStep3,
	SecondOrderRootType,
} from "../types";

/**
 * Parameters required to build Step 3 ITS data.
 */
export interface BuildStep3Params {
	/** Differential equation order (1 or 2) */
	resolvedOrder: OdeOrder;
	/** Root classification type */
	resolvedRootType: SecondOrderRootType;
	/** Characteristic roots */
	roots: { r1: number; r2?: number; im?: number };
}

/**
 * Result structure of Step 3 scaffolding generation.
 */
export interface Step3ScaffoldingResult {
	/** Homogeneous equation LaTeX representation */
	step3Latex: string;
	/** Full Step 3 ITS metadata */
	step3Data: OdeItsStep3;
}

/**
 * Builds the Step 3 (Homogeneous Solution Form) ITS metadata.
 *
 * @param {BuildStep3Params} params Configuration parameters for Step 3
 * @returns {Step3ScaffoldingResult} Homogeneous form LaTeX and Step 3 ITS metadata
 */
export function buildStep3Data(
	params: BuildStep3Params,
): Step3ScaffoldingResult {
	const { resolvedOrder, resolvedRootType, roots } = params;

	let step3Latex: string;
	if (resolvedOrder === 1) {
		step3Latex = `y_h(t) = C_1 e^{${roots.r1}t}`;
	} else {
		switch (resolvedRootType) {
			case "distinct_real": {
				step3Latex = `y_h(t) = C_1 e^{${roots.r1}t} + C_2 e^{${roots.r2}t}`;
				break;
			}
			case "repeated_real": {
				step3Latex = `y_h(t) = (C_1 + C_2 t) e^{${roots.r1}t}`;
				break;
			}
			case "complex_conjugate": {
				step3Latex = String.raw`y_h(t) = e^{${roots.r1}t} [C_1 \cos(${roots.im}t) + C_2 \sin(${roots.im}t)]`;
				break;
			}
			default: {
				throw new Error(
					`Unhandled target root type: ${String(resolvedRootType)}`,
				);
			}
		}
	}

	let step3Data: OdeItsStep3;
	if (resolvedOrder === 1) {
		const step3FirstOrder: FirstOrderOdeItsStep3 = {
			correctTemplate: "single_real",
			formLatex: step3Latex,
			hints: [
				"A first-order equation has one characteristic root and one natural mode.",
				"$y_h(t)=C_1e^{rt}$ for a single real root.",
				`Substitute $r=${roots.r1}$.`,
			],
			misconceptions: {
				single_real:
					"A first-order equation has one exponential mode $C_1e^{rt}$.",
				distinct_real:
					"A first-order equation has only one characteristic root $s = r$, yielding a single exponential mode $C_1 e^{rt}$, not two separate modes.",
				repeated_real:
					"Repeated root forms $(C_1 + C_2 t)e^{rt}$ require a second-order characteristic polynomial with multiplicity 2.",
				complex_conjugate: String.raw`Complex conjugate oscillatory modes require at least a second-order differential equation with $\Delta < 0$.`,
			},
		};
		step3Data = step3FirstOrder;
	} else {
		const step3SecondOrder: SecondOrderOdeItsStep3 = {
			correctTemplate: resolvedRootType,
			formLatex: step3Latex,
			hints: [
				"Classify the two roots found in Step 2.",
				"Use the distinct, repeated, or complex-conjugate template.",
				`The roots are ${resolvedRootType.replace("_", " ")}.`,
			],
			misconceptions: {
				single_real:
					"A second-order equation has two characteristic roots and two independent modes, requiring two arbitrary constants.",
				distinct_real:
					"Distinct real roots produce two separate exponential modes $C_1e^{r_1t}+C_2e^{r_2t}$.",
				repeated_real:
					"Repeated roots require the $(C_1 + C_2 t)$ multiplier to maintain two linearly independent basis solutions.",
				complex_conjugate: String.raw`Complex conjugate roots $\sigma \pm j\omega_d$ generate oscillatory sines/cosines damped by an exponential envelope.`,
			},
		};
		step3Data = step3SecondOrder;
	}

	return { step3Latex, step3Data };
}
