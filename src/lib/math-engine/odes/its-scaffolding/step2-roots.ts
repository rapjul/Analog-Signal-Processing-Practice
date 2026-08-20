/**
 * Step 2 Characteristic Roots & Strategy ITS Scaffolding Builder.
 *
 * Provides factored form representations, quadratic formula classification,
 * discriminant remediation, and root solving hints.
 */

import { formatRootFactor } from "../../formatting";
import { toFractionLatex } from "../../fraction";
import type {
	FirstOrderOdeItsStep2,
	OdeItsStep2,
	OdeOrder,
	SecondOrderOdeItsStep2,
	SecondOrderRootType,
} from "../types";

/**
 * Parameters required to build Step 2 ITS data.
 */
export interface BuildStep2Params {
	/** Differential equation order (1 or 2) */
	resolvedOrder: OdeOrder;
	/** Target root classification */
	resolvedRootType: SecondOrderRootType;
	/** Leading polynomial coefficient ($a_2$ or $a_1$) */
	leadingCoefficient: number;
	/** Second-derivative coefficient $a_2$ */
	a2: number;
	/** First-derivative coefficient $a_1$ */
	a1: number;
	/** Zero-derivative coefficient $a_0$ */
	a0: number;
	/** Calculated roots */
	roots: { r1: number; r2?: number; im?: number };
	/** Calculated polynomial discriminant $\Delta = b^2 - 4ac$ */
	discriminant: number;
	/** Formatted characteristic equation LHS */
	charEqLhs: string;
}

/**
 * Builds the Step 2 (Characteristic Roots) ITS metadata.
 *
 * @param {BuildStep2Params} params Configuration parameters for Step 2
 * @returns {OdeItsStep2} Step 2 problem data, strategy gate hints, and misconceptions
 */
export function buildStep2Data(params: BuildStep2Params): OdeItsStep2 {
	const {
		resolvedOrder,
		resolvedRootType,
		leadingCoefficient,
		a2,
		a1,
		a0,
		roots,
		discriminant,
		charEqLhs,
	} = params;

	const factoredLeadingCoefficient =
		leadingCoefficient === 1
			? ""
			: `${toFractionLatex(leadingCoefficient)}`;

	if (resolvedOrder === 1) {
		const step2FirstOrder: FirstOrderOdeItsStep2 = {
			rootType: "single_real",
			symbolicRootsLatex: `r = ${roots.r1}`,
			factoredFormLatex: `${factoredLeadingCoefficient}${formatRootFactor(roots.r1, "s")} = 0`,
			r1: roots.r1,
			hints: [
				`Solve $${charEqLhs}=0$ by isolating $s$.`,
				`Use $s=-a_0/a_1=-(${a0})/(${a1})$.`,
				`The single real root is $r=${roots.r1}$.`,
			],
			subStepHints: {
				factoring_inputs: [
					`Isolate $s$ in $${a1}s+${a0}=0$.`,
					`Express the polynomial as $${factoredLeadingCoefficient}(s-r)=0$.`,
					`The root is $r = ${roots.r1}$.`,
				],
			},
			misconceptions: {},
		};
		return step2FirstOrder;
	}

	const step2SecondOrder: SecondOrderOdeItsStep2 = {
		rootType: resolvedRootType,
		isFactorable:
			resolvedRootType === "distinct_real" ||
			resolvedRootType === "repeated_real",
		discriminant,
		quadSetup: {
			a: a2,
			b: a1,
			c: a0,
			negB: -a1,
			disc: discriminant,
			twoA: 2 * a2,
		},
		symbolicRootsLatex:
			resolvedRootType === "distinct_real"
				? String.raw`r_1 = ${roots.r1}, \quad r_2 = ${roots.r2}`
				: resolvedRootType === "repeated_real"
					? `r_1 = r_2 = ${roots.r1}`
					: String.raw`s = ${roots.r1} \pm j${roots.im}`,
		factoredFormLatex:
			resolvedRootType === "distinct_real"
				? `${factoredLeadingCoefficient}${formatRootFactor(roots.r1, "s")}${formatRootFactor(roots.r2 ?? 0, "s")} = 0`
				: resolvedRootType === "repeated_real"
					? `${factoredLeadingCoefficient}${formatRootFactor(roots.r1, "s")}^2 = 0`
					: undefined,
		r1: roots.r1,
		r2: roots.r2 ?? roots.r1,
		im: roots.im,
		hints: [
			String.raw`Inspect whether $${charEqLhs}=0$ factors cleanly, or calculate $\Delta=${discriminant}$.`,
			String.raw`Use $s=\frac{-b\pm\sqrt{b^2-4ac}}{2a}$ with $a=${a2}$, $b=${a1}$, and $c=${a0}$.`,
			resolvedRootType === "distinct_real"
				? String.raw`The discriminant $\Delta=${discriminant}>0$ yields $r_1=${roots.r1}$ and $r_2=${roots.r2}$.`
				: resolvedRootType === "repeated_real"
					? String.raw`The discriminant $\Delta = 0$ yields a single repeated real root: $r = ${roots.r1}$.`
					: String.raw`The discriminant $\Delta=${discriminant}<0$ yields $s=${roots.r1}\pm j${roots.im ?? 0}$.`,
		],
		subStepHints: {
			strategy_gate: [
				`After dividing by $a_2=${a2}$, inspect whether two numbers multiply to $a_0/a_2=${toFractionLatex(a0 / a2)}$ and sum to $-a_1/a_2=${toFractionLatex(-a1 / a2)}$.`,
				"If integer factoring is not readily apparent, check whether the discriminant $b^2 - 4ac$ is positive, zero, or negative.",
				"Select Factoring for clean integer roots or Quadratic Formula for guaranteed solution.",
			],
			factoring_inputs: [
				`Find roots whose product is $a_0/a_2=${toFractionLatex(a0 / a2)}$ and whose sum is $-a_1/a_2=${toFractionLatex(-a1 / a2)}$.`,
				`Express it as $${factoredLeadingCoefficient}(s-r_1)(s-r_2)=0$.`,
				`The roots are $r_1 = ${roots.r1}$ and $r_2 = ${roots.r2 ?? roots.r1}$.`,
			],
			quad_classification: [
				String.raw`Compute the discriminant $\Delta = b^2 - 4ac = (${a1})^2 - 4(${a2})(${a0}) = ${discriminant}$.`,
				String.raw`If $\Delta > 0$, roots are distinct real. If $\Delta = 0$, roots are repeated real. If $\Delta < 0$, roots are complex conjugate.`,
				String.raw`Since $\Delta = ${discriminant}$, classify as ${resolvedRootType.replace("_", " ")}.`,
			],
			remedial_discriminant: [
				String.raw`Substitute into $\Delta=b^2-4ac$ with $a=${a2}$, $b=${a1}$, and $c=${a0}$.`,
				`Calculate $(${a1})^2 - 4(${a2})(${a0})$.`,
				`The discriminant value is exactly $${discriminant}$.`,
			],
			quad_root_inputs: [
				String.raw`Apply $s = \frac{-b \pm \sqrt{\Delta}}{2a}$.`,
				String.raw`Evaluate $\frac{${-a1} \pm \sqrt{${discriminant}}}{${2 * a2}}$.`,
				resolvedRootType === "complex_conjugate"
					? String.raw`Real part $\sigma = ${roots.r1}$, imaginary frequency $\omega_d = ${roots.im}$.`
					: `The roots are $r_1 = ${roots.r1}$ and $r_2 = ${roots.r2 ?? roots.r1}$.`,
			],
		},
		misconceptions: {
			unfactorable_complex: String.raw`The polynomial $${charEqLhs}=0$ has $\Delta=${discriminant}<0$, so use the quadratic formula.`,
			unfactorable_general: String.raw`The discriminant is $\Delta=${discriminant}$. Use the quadratic formula when integer factoring is not clean.`,
		},
	};
	return step2SecondOrder;
}
