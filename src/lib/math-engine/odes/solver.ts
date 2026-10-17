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
import { exactProductSum } from "./exact-arithmetic";
import {
	computeScaledHarmonicResponse,
	computeScaledPolynomialResponse,
	divideByProduct,
	evaluateScaledExponential,
} from "./scaled-arithmetic";
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

/** Equation coefficients expressed in a stable working scale. */
interface NormalizedCoefficients {
	/** Signed multiplier removed from both the equation and its forcing. */
	scale: number;
	/** Working second derivative coefficient. */
	a2: number;
	/** Working first derivative coefficient. */
	a1: number;
	/** Working constant coefficient. */
	a0: number;
}

/** Quadratic discriminant and term magnitudes expressed in a safe common scale. */
interface ScaledDiscriminant {
	/** Difference between scaled squared-linear and constant terms. */
	value: number;
	/** Multiplier that restores the square root to its original scale. */
	scale: number;
}

/**
 * Computes the original exact discriminant before converting its magnitude to monic scale.
 * @param a2 - Original quadratic coefficient.
 * @param a1 - Original linear coefficient.
 * @param a0 - Original constant coefficient.
 * @returns Bounded discriminant and its square-root scale.
 */
function scaledDiscriminant(
	a2: number,
	a1: number,
	a0: number,
): ScaledDiscriminant {
	const [mantissa, originalExponent] = exactProductSum([
		[a1, a1],
		[-4, a2, a0],
	]);
	const [leading, leadingExponent] = exactProductSum([[a2]]);
	if (mantissa === 0) return { value: 0, scale: 1 };
	const quotient = mantissa / (leading * leading);
	const adjustment = Math.floor(Math.log2(Math.abs(quotient)));
	const exponent = originalExponent - 2 * leadingExponent + adjustment;
	const halfExponent = Math.floor(exponent / 2);
	return {
		value:
			(quotient / 2 ** adjustment) * 2 ** (exponent - 2 * halfExponent),
		scale: 2 ** halfExponent,
	};
}

/**
 * Removes a common equation scale before testing roots or resonance.
 * @param coefficients - Original first- or second-order equation.
 * @returns Monic coefficients and the signed scale removed from the forcing.
 */
function normalizeCoefficients(
	coefficients: CharacteristicEquationCoefficients,
): NormalizedCoefficients {
	const { order, a1, a0 } = coefficients;
	const a2 = order === 2 ? (coefficients.a2 ?? 1) : 0;
	if (![a2, a1, a0].every(Number.isFinite))
		throw new Error("ODE coefficients must be finite");
	const scale = order === 1 ? a1 : a2;
	if (scale === 0)
		throw new Error(
			order === 1
				? "First-order leading coefficient a1 must be non-zero"
				: "Second-order leading coefficient a2 must be non-zero",
		);
	const normalized = {
		scale,
		a2: order === 2 ? 1 : 0,
		a1: a1 / scale,
		a0: a0 / scale,
	};
	if (![normalized.a1, normalized.a0].every(Number.isFinite))
		throw new Error(
			"ODE coefficient ratios exceed the finite numeric range",
		);
	return normalized;
}

/**
 * Retains original coefficients for exact classification before any monic division.
 * @param ode - Original finite equation coefficients.
 * @returns Validated original coefficients with unit removed scale.
 */
function forcingCoefficients(ode: OdeParams): NormalizedCoefficients {
	normalizeCoefficients(ode);
	return {
		scale: 1,
		a2: ode.order === 2 ? ode.a2 : 0,
		a1: ode.a1,
		a0: ode.a0,
	};
}

/**
 * Solves first- or second-order characteristic equations. The two-number form
 * retains the historical monic quadratic API; the object form supports
 * first-order and non-monic equations without positional ambiguity.
 * Multiplicity uses the supplied binary64 coefficients exactly; nearby roots
 * are not collapsed by an assumed decimal-input rounding tolerance.
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
	const normalized = normalizeCoefficients(coefficients);

	if (order === 1) {
		return {
			order: 1,
			a2: 0,
			a1,
			a0,
			roots: { r1: -normalized.a0 },
			rootType: "single_real",
		};
	}

	const b = normalized.a1;
	// Factor s(a2*s + a1) directly before a subnormal square-root scale can vanish.
	if (a0 === 0 && a1 !== 0) {
		const root = -b;
		const zero = a0 / (a2 * (b >= 0 ? -1 : 1));
		return {
			order: 2,
			a2,
			a1,
			a0,
			rootType: "distinct_real",
			roots: b >= 0 ? { r1: zero, r2: root } : { r1: root, r2: zero },
		};
	}
	const { value: disc, scale: discriminantScale } = scaledDiscriminant(
		a2,
		a1,
		a0,
	);
	if (disc === 0) {
		const r = -b / 2;
		return {
			order: 2,
			a2,
			a1,
			a0,
			roots: { r1: r, r2: r },
			rootType: "repeated_real",
		};
	} else if (disc > 0) {
		const sqrtDisc = Math.sqrt(disc) * discriminantScale;
		// Recover the smaller root from the product instead of subtracting near-equal values.
		const signedRoot = b >= 0 ? sqrtDisc : -sqrtDisc;
		const sum = b + signedRoot;
		// Sum first to preserve subnormals; split only when the sum would overflow.
		const q = Number.isFinite(sum)
			? -0.5 * sum
			: -0.5 * b - 0.5 * signedRoot;
		const smaller = q === 0 ? q : divideByProduct(a0, a2, q);
		const r1 = b >= 0 ? smaller : q;
		const r2 = b >= 0 ? q : smaller;
		return {
			order: 2,
			a2,
			a1,
			a0,
			roots: { r1, r2 },
			rootType: "distinct_real",
		};
	} else {
		const sigma = -b / 2;
		const omega_d = (Math.sqrt(-disc) / 2) * discriminantScale;
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
 * Resonance requires exact cancellation of the supplied binary64 coefficients
 * and forcing exponent or frequency, rather than approximate decimal intent.
 *
 * @param {OdeParams} ode ODE parameters
 * @param {ForcingFunction} forcing Forcing function parameters
 * @returns {ParticularSolution} Particular solution object
 */
export function computeParticularSolution(
	ode: OdeParams,
	forcing: ForcingFunction,
): ParticularSolution {
	const coefficients = forcingCoefficients(ode);
	switch (forcing.type) {
		case "constant":
		case "exponential":
			return computePolynomialParticular(coefficients, forcing);
		case "sinusoid":
			return computeSinusoidalParticular(coefficients, forcing);
		default:
			throw new Error(`Unhandled forcing function type: ${forcing.type}`);
	}
}

/**
 * Solves constant and exponential forcing using its root collision multiplicity.
 * @param coefficients - Working equation and removed forcing scale.
 * @param forcing - Constant or exponential input.
 * @returns Particular solution and its analytic first derivative.
 */
function computePolynomialParticular(
	coefficients: NormalizedCoefficients,
	forcing: ForcingFunction,
): ParticularSolution {
	const { scale, a2, a1, a0 } = coefficients;
	const constant = forcing.type === "constant";
	const p = constant ? 0 : (forcing.p ?? -1);
	const { Kp, multiplicity } = computeScaledPolynomialResponse(
		forcing.K,
		scale,
		a2,
		a1,
		a0,
		p,
	);
	const suffix = ["", " t", " t^2"][multiplicity]!;
	const latex = constant
		? `${toFractionLatex(Kp)}${suffix}`
		: sanitizeLatexMath(
				formatSignedLinearTerm(
					toFractionLatex(Kp),
					`${suffix.trim()} ${formatExpTerm(p)}`.trim(),
					true,
				),
			) || "0";
	return {
		formDescription: `y_p(t) = K_p${suffix}${constant ? "" : " e^{p t}"}`,
		latex,
		/** @param t - Evaluation time. @returns The particular response. */
		eval: (t: number) => evaluateScaledExponential(Kp, p, multiplicity, t),
		/** @param t - Evaluation time. @returns The particular response derivative. */
		evalDeriv: (t: number) =>
			evaluateScaledExponential(Kp, p, multiplicity, t, true),
		coeffs: { Kp },
		resonanceMultiplicity: multiplicity,
	};
}

/**
 * Solves harmonic forcing with scaled amplitudes and exact damping detection.
 * @param coefficients - Working equation and removed forcing scale.
 * @param forcing - Sinusoidal input.
 * @returns Particular harmonic or resonant response.
 */
function computeSinusoidalParticular(
	coefficients: NormalizedCoefficients,
	forcing: ForcingFunction,
): ParticularSolution {
	const { scale, a2, a1, a0 } = coefficients;
	const w = forcing.omega ?? 1;

	// Substitute y_p(t) = A*cos(w*t) + B*sin(w*t) into y_p'' + a1*y_p' + a0*y_p = K*cos(w*t):
	//   cos(w*t) term:  (a0 - a2*w^2)*A + (a1*w)*B     = K
	//   sin(w*t) term: -(a1*w)*A        + (a0 - a2*w^2)*B = 0
	// System matrix: [ m11  m12 ] [ A ] = [ K ]
	//                [ m21  m22 ] [ B ]   [ 0 ]
	const { A, B, multiplicity } = computeScaledHarmonicResponse(
		forcing.K,
		scale,
		a2,
		a1,
		a0,
		w,
	);
	if (multiplicity === 1) {
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
			/** @param t - Evaluation time. @returns Resonant particular response. */
			eval: (t: number) => B * t * Math.sin(w * t),
			/** @param t - Evaluation time. @returns Resonant particular derivative. */
			evalDeriv: (t: number) =>
				B * (Math.sin(w * t) + w * t * Math.cos(w * t)),
			coeffs: { A: 0, B },
			resonanceMultiplicity: 1,
		};
	}
	const latexA = toFractionLatex(A);
	const latexB = toFractionLatex(B);

	let latexStr = "";
	if (Math.abs(A) > 1e-6) latexStr += `${latexA} \\cos(${w}t)`;
	if (B > 1e-6) latexStr += ` + ${latexB} \\sin(${w}t)`;
	else if (B < -1e-6)
		latexStr += ` - ${toFractionLatex(Math.abs(B))} \\sin(${w}t)`;
	if (!latexStr) latexStr = "0";

	return {
		formDescription: "y_p(t) = A \\cos(\\omega t) + B \\sin(\\omega t)",
		latex: latexStr,
		/** @param t - Evaluation time. @returns Harmonic particular response. */
		eval: (t: number) => A * Math.cos(w * t) + B * Math.sin(w * t),
		/** @param t - Evaluation time. @returns Harmonic particular derivative. */
		evalDeriv: (t: number) =>
			-A * w * Math.sin(w * t) + B * w * Math.cos(w * t),
		coeffs: { A, B },
		resonanceMultiplicity: 0,
	};
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
