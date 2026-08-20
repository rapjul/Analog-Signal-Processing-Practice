/**
 * Linear Constant-Coefficient ODE Analytical Solver.
 *
 * Implements:
 * - Characteristic polynomial solving (1st- and 2nd-order, distinct real, repeated real, complex conjugate)
 * - Particular solution computation (constant, exponential, sinusoidal forcing with resonance multiplicity)
 * - Homogeneous solution constants solver matching arbitrary target initial conditions
 */

import {
	formatExpTerm,
	formatLinearCombination,
	formatSignedLinearTerm,
	sanitizeLatexMath,
} from "../formatting";
import { toFractionLatex } from "../fraction";
import type {
	CharacteristicEquationCoefficients,
	FirstOrderCharacteristicCoefficients,
	FirstOrderOdeParams,
	ForcingFunction,
	HomogeneousSolution,
	OdeParams,
	ParticularSolution,
	SecondOrderCharacteristicCoefficients,
	SecondOrderOdeParams,
} from "./types";

/**
 * Solves first- or second-order characteristic equations. The two-number form
 * retains the historical monic quadratic API; the object form supports
 * first-order and non-monic equations without positional ambiguity.
 *
 * @param {number | CharacteristicEquationCoefficients} a1OrCoefficients Linear coefficient a1 or coefficient configuration object
 * @param {number} [a0Argument] Constant coefficient a0 (when using numeric overload)
 * @returns {OdeParams} Solved ODE parameters containing root classification and numerical values
 */
export function solveCharacteristicEquation(
	a1: number,
	a0: number,
): SecondOrderOdeParams;
export function solveCharacteristicEquation(
	coefficients: FirstOrderCharacteristicCoefficients,
): FirstOrderOdeParams;
export function solveCharacteristicEquation(
	coefficients: SecondOrderCharacteristicCoefficients,
): SecondOrderOdeParams;
export function solveCharacteristicEquation(
	coefficients: CharacteristicEquationCoefficients,
): OdeParams;
export function solveCharacteristicEquation(
	a1OrCoefficients: number | CharacteristicEquationCoefficients,
	a0Argument?: number,
): OdeParams {
	const coefficients =
		typeof a1OrCoefficients === "number"
			? {
					order: 2 as const,
					a2: 1,
					a1: a1OrCoefficients,
					a0: a0Argument ?? 0,
				}
			: a1OrCoefficients;
	const { order, a1, a0 } = coefficients;
	const a2 = order === 2 ? (coefficients.a2 ?? 1) : 0;

	if (order === 1) {
		if (Math.abs(a1) < 1e-12) {
			throw new Error(
				"First-order leading coefficient a1 must be non-zero",
			);
		}
		return {
			order: 1,
			a2: 0,
			a1,
			a0,
			roots: { r1: -a0 / a1 },
			rootType: "single_real",
		};
	}

	if (Math.abs(a2) < 1e-12) {
		throw new Error("Second-order leading coefficient a2 must be non-zero");
	}

	const disc = a1 * a1 - 4 * a2 * a0;
	if (Math.abs(disc) < 1e-9) {
		const r = -a1 / (2 * a2);
		return {
			order: 2,
			a2,
			a1,
			a0,
			roots: { r1: r, r2: r },
			rootType: "repeated_real",
		};
	} else if (disc > 0) {
		const sqrtDisc = Math.sqrt(disc);
		const r1 = (-a1 + sqrtDisc) / (2 * a2);
		const r2 = (-a1 - sqrtDisc) / (2 * a2);
		return {
			order: 2,
			a2,
			a1,
			a0,
			roots: { r1, r2 },
			rootType: "distinct_real",
		};
	} else {
		const sigma = -a1 / (2 * a2);
		const omega_d = Math.sqrt(-disc) / (2 * Math.abs(a2));
		return {
			order: 2,
			a2,
			a1,
			a0,
			roots: { r1: sigma, im: omega_d },
			rootType: "complex_conjugate",
		};
	}
}

/**
 * Computes the particular solution y_p(t) for an ODE: a2*y'' + a1*y' + a0*y = x(t).
 *
 * @param {OdeParams} ode ODE parameters
 * @param {ForcingFunction} forcing Forcing function parameters
 * @returns {ParticularSolution} Particular solution object
 */
export function computeParticularSolution(
	ode: OdeParams,
	forcing: ForcingFunction,
): ParticularSolution {
	const { order, a2, a1, a0 } = ode;
	const polynomialAt = (s: number) =>
		order === 1 ? a1 * s + a0 : a2 * s * s + a1 * s + a0;
	const polynomialDerivativeAt = (s: number) =>
		order === 1 ? a1 : 2 * a2 * s + a1;
	const rootMultiplicityAt = (s: number): 0 | 1 | 2 => {
		if (Math.abs(polynomialAt(s)) >= 1e-8) return 0;
		if (order === 2 && Math.abs(polynomialDerivativeAt(s)) < 1e-8) return 2;
		return 1;
	};

	switch (forcing.type) {
		case "constant": {
			const K = forcing.K;
			const multiplicity = rootMultiplicityAt(0);
			const Kp =
				multiplicity === 0
					? K / a0
					: multiplicity === 1
						? K / polynomialDerivativeAt(0)
						: K / (2 * a2);
			const power = multiplicity;
			return {
				formDescription:
					power === 0
						? "y_p(t) = K_p"
						: power === 1
							? "y_p(t) = K_p t"
							: "y_p(t) = K_p t^2",
				latex:
					power === 0
						? `${toFractionLatex(Kp)}`
						: power === 1
							? `${toFractionLatex(Kp)} t`
							: `${toFractionLatex(Kp)} t^2`,
				eval: (t: number) => Kp * t ** power,
				evalDeriv: (t: number) =>
					power === 0 ? 0 : power * Kp * t ** (power - 1),
				coeffs: { Kp },
				resonanceMultiplicity: multiplicity,
			};
		}
		case "exponential": {
			const K = forcing.K;
			const p = forcing.p ?? -1;
			const multiplicity = rootMultiplicityAt(p);

			if (multiplicity === 0) {
				const denom = polynomialAt(p);
				const Kp = K / denom;
				return {
					formDescription: "y_p(t) = K_p e^{p t}",
					latex:
						sanitizeLatexMath(
							formatSignedLinearTerm(
								toFractionLatex(Kp),
								formatExpTerm(p),
								true,
							),
						) || "0",
					eval: (t: number) => Kp * Math.exp(p * t),
					evalDeriv: (t: number) => Kp * p * Math.exp(p * t),
					coeffs: { Kp },
					resonanceMultiplicity: 0,
				};
			}

			if (multiplicity === 1) {
				const denom = polynomialDerivativeAt(p);
				const Kp = K / denom;
				return {
					formDescription: "y_p(t) = K_p t e^{p t}",
					latex:
						sanitizeLatexMath(
							formatSignedLinearTerm(
								toFractionLatex(Kp),
								`t ${formatExpTerm(p)}`,
								true,
							),
						) || "0",
					eval: (t: number) => Kp * t * Math.exp(p * t),
					evalDeriv: (t: number) =>
						Kp * (1 + p * t) * Math.exp(p * t),
					coeffs: { Kp },
					resonanceMultiplicity: 1,
				};
			}

			const Kp = K / (2 * a2);
			return {
				formDescription: "y_p(t) = K_p t^2 e^{p t}",
				latex:
					sanitizeLatexMath(
						formatSignedLinearTerm(
							toFractionLatex(Kp),
							`t^2 ${formatExpTerm(p)}`,
							true,
						),
					) || "0",
				eval: (t: number) => Kp * t * t * Math.exp(p * t),
				evalDeriv: (t: number) =>
					Kp * (2 * t + p * t * t) * Math.exp(p * t),
				coeffs: { Kp },
				resonanceMultiplicity: 2,
			};
		}
		case "sinusoid": {
			const K = forcing.K;
			const w = forcing.omega ?? 1;

			// Substitute y_p(t) = A*cos(w*t) + B*sin(w*t) into y_p'' + a1*y_p' + a0*y_p = K*cos(w*t):
			//   cos(w*t) term:  (a0 - a2*w^2)*A + (a1*w)*B     = K
			//   sin(w*t) term: -(a1*w)*A        + (a0 - a2*w^2)*B = 0
			// System matrix: [ m11  m12 ] [ A ] = [ K ]
			//                [ m21  m22 ] [ B ]   [ 0 ]
			const m11 = a0 - a2 * w * w;
			const m12 = a1 * w;
			const m21 = -a1 * w;
			const m22 = a0 - a2 * w * w;

			const det = m11 * m22 - m12 * m21;
			if (Math.abs(det) < 1e-9) {
				if (
					order !== 2 ||
					Math.abs(a1) >= 1e-9 ||
					Math.abs(a2) < 1e-9
				) {
					throw new Error(
						"Unsupported degenerate sinusoidal resonance",
					);
				}
				const B = K / (2 * a2 * w);
				return {
					formDescription:
						"y_p(t) = t[A \\cos(\\omega t) + B \\sin(\\omega t)]",
					latex:
						sanitizeLatexMath(
							formatSignedLinearTerm(
								toFractionLatex(B),
								`t \\sin(${w}t)`,
								true,
							),
						) || "0",
					eval: (t: number) => B * t * Math.sin(w * t),
					evalDeriv: (t: number) =>
						B * (Math.sin(w * t) + w * t * Math.cos(w * t)),
					coeffs: { A: 0, B },
					resonanceMultiplicity: 1,
				};
			}
			const A = (K * m22) / det;
			const B = (-K * m21) / det;

			const latexA = toFractionLatex(A);
			const latexB = toFractionLatex(B);

			let latexStr = "";
			if (Math.abs(A) > 1e-6) latexStr += `${latexA} \\cos(${w}t)`;
			if (B > 1e-6) latexStr += ` + ${latexB} \\sin(${w}t)`;
			else if (B < -1e-6)
				latexStr += ` - ${toFractionLatex(Math.abs(B))} \\sin(${w}t)`;
			if (!latexStr) latexStr = "0";

			return {
				formDescription:
					"y_p(t) = A \\cos(\\omega t) + B \\sin(\\omega t)",
				latex: latexStr,
				eval: (t: number) => A * Math.cos(w * t) + B * Math.sin(w * t),
				evalDeriv: (t: number) =>
					-A * w * Math.sin(w * t) + B * w * Math.cos(w * t),
				coeffs: { A, B },
				resonanceMultiplicity: 0,
			};
		}
		default: {
			throw new Error(`Unhandled forcing function type: ${forcing.type}`);
		}
	}
}

/**
 * Solves for constants C1 and C2 of the homogeneous solution given target initial conditions.
 *
 * @param {OdeParams} ode ODE parameters
 * @param {number} targetY0 Target y_h(0+)
 * @param {number} targetDY0 Target y_h'(0+)
 * @returns {HomogeneousSolution} Homogeneous solution object
 */
export function solveHomogeneousConstants(
	ode: OdeParams,
	targetY0: number,
	targetDY0: number,
): HomogeneousSolution {
	const { rootType, roots } = ode;

	if (ode.order === 1) {
		const C1 = targetY0;
		const expTerm = formatExpTerm(roots.r1);
		return {
			latex:
				sanitizeLatexMath(
					formatSignedLinearTerm(toFractionLatex(C1), expTerm, true),
				) || "0",
			C1,
			eval: (t: number) => C1 * Math.exp(roots.r1 * t),
		};
	}

	switch (rootType) {
		case "distinct_real": {
			const r1 = roots.r1;
			const r2 = roots.r2 ?? 0;
			// Solve initial condition system for y_h(t) = C1*e^(r1*t) + C2*e^(r2*t):
			//   y_h(0)  = C1 + C2 = targetY0
			//   y_h'(0) = r1*C1 + r2*C2 = targetDY0
			//           => C2 = (targetDY0 - r1 * targetY0) / (r2 - r1)
			const C2 = (targetDY0 - r1 * targetY0) / (r2 - r1);
			const C1 = targetY0 - C2;

			const c1Str = toFractionLatex(C1);
			const c2Str = toFractionLatex(C2);

			const term1 = formatSignedLinearTerm(
				c1Str,
				formatExpTerm(r1),
				true,
			);
			const term2 = formatSignedLinearTerm(
				c2Str,
				formatExpTerm(r2),
				false,
			);
			const latex = sanitizeLatexMath(`${term1} ${term2}`) || "0";

			return {
				latex,
				C1,
				C2,
				eval: (t: number) =>
					C1 * Math.exp(r1 * t) + C2 * Math.exp(r2 * t),
			};
		}
		case "repeated_real": {
			const r = roots.r1;
			// Solve initial condition system for y_h(t) = (C1 + C2*t)*e^(r*t):
			//   y_h(0)  = C1 = targetY0
			//  y_h'(0)  = r*C1 + C2 = targetDY0 => C2 = targetDY0 - r*C1
			const C1 = targetY0;
			const C2 = targetDY0 - r * C1;

			const c1Str = toFractionLatex(C1);
			const c2Str = toFractionLatex(C2);

			const inner = formatLinearCombination(c1Str, c2Str);
			const expTerm = formatExpTerm(r);
			const latex = sanitizeLatexMath(
				inner !== "0" ? `(${inner}) ${expTerm}` : "0",
			);

			return {
				latex,
				C1,
				C2,
				eval: (t: number) => (C1 + C2 * t) * Math.exp(r * t),
			};
		}
		// Complex conjugate: r1 = sigma + j*omega_d
		case "complex_conjugate": {
			const sigma = roots.r1;
			const omega_d = roots.im ?? 0;

			// Solve initial condition system for y_h(t) = e^(sigma*t)*(C1*cos(omega_d*t) + C2*sin(omega_d*t)):
			//   y_h(0)  = C1 = targetY0
			//  y_h'(0)  = sigma*C1 + omega_d*C2 = targetDY0 => C2 = (targetDY0 - sigma*C1) / omega_d
			const C1 = targetY0;
			const C2 = (targetDY0 - sigma * C1) / omega_d;

			const c1Str = toFractionLatex(C1);
			const c2Str = toFractionLatex(C2);

			const cosTerm = formatSignedLinearTerm(
				c1Str,
				`\\cos(${toFractionLatex(omega_d)}t)`,
				true,
			);
			const sinTerm = formatSignedLinearTerm(
				c2Str,
				`\\sin(${toFractionLatex(omega_d)}t)`,
				false,
			);
			const inner = `${cosTerm} ${sinTerm}`.trim();
			const expTerm = sigma !== 0 ? formatExpTerm(sigma) : "";
			const latex = sanitizeLatexMath(
				inner ? (expTerm ? `${expTerm} [${inner}]` : inner) : "0",
			);

			return {
				latex,
				C1,
				C2,
				eval: (t: number) =>
					Math.exp(sigma * t) *
					(C1 * Math.cos(omega_d * t) + C2 * Math.sin(omega_d * t)),
			};
		}
		default: {
			throw new Error(`Unhandled root type: ${rootType}`);
		}
	}
}
