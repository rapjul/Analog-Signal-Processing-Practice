/**
 * Step 5 Undetermined Coefficients ITS Scaffolding Builder.
 *
 * Formulates first and second derivative multiple-choice options, harmonic linear system setups,
 * and solved coefficient evaluations ($K_p$, $A$, $B$).
 */

import { toFractionLatex } from "../../fraction";
import { shuffleWithRandom } from "../../random";
import type {
	FirstOrderOdeItsStep5,
	ForcingFunction,
	OdeItsOption,
	OdeItsStep5,
	OdeOrder,
	ParticularSolution,
	SecondOrderOdeItsStep5,
} from "../types";

/**
 * Parameters required to build Step 5 ITS data.
 */
export interface BuildStep5Params {
	/** Differential equation order (1 or 2) */
	resolvedOrder: OdeOrder;
	/** Second-derivative coefficient $a_2$ */
	a2: number;
	/** First-derivative coefficient $a_1$ */
	a1: number;
	/** Zero-derivative coefficient $a_0$ */
	a0: number;
	/** Forcing function descriptor */
	forcing: ForcingFunction;
	/** Particular solution computation results */
	particular: ParticularSolution;
	/** Seeded random number generator */
	random: () => number;
}

/**
 * Builds the Step 5 (Undetermined Coefficients) ITS metadata.
 *
 * @param {BuildStep5Params} params Configuration parameters for Step 5
 * @returns {OdeItsStep5} First- or second-order Step 5 problem data, derivative choices, and hints
 */
export function buildStep5Data(params: BuildStep5Params): OdeItsStep5 {
	const { resolvedOrder, a2, a1, a0, forcing, particular, random } = params;

	const polynomialAt = (s: number) =>
		resolvedOrder === 1 ? a1 * s + a0 : a2 * s * s + a1 * s + a0;
	const derivativeAt = (s: number) =>
		resolvedOrder === 1 ? a1 : 2 * a2 * s + a1;

	let step5FirstDerivLatex = "";
	let step5SecondDerivLatex = "";
	let step5DerivLatex = "";
	let step5SysLatex = "";
	let step5FirstDerivOptions: OdeItsOption[] = [];
	let step5SecondDerivOptions: OdeItsOption[] = [];
	let step5DerivativeOptions: OdeItsOption[] = [];
	let step5SystemOptions: OdeItsOption[] = [];

	if (forcing.type === "sinusoid") {
		const w = forcing.omega ?? 1;
		const w2 = w * w;
		const m11 = a0 - a2 * w2;
		const m12 = a1 * w;
		const m21 = -a1 * w;
		const m22 = a0 - a2 * w2;

		step5FirstDerivLatex = String.raw`y_p'(t) = -${w}A \sin(${w}t) + ${w}B \cos(${w}t)`;
		step5SecondDerivLatex = String.raw`y_p''(t) = -${w2}A \cos(${w}t) - ${w2}B \sin(${w}t)`;
		step5DerivLatex = String.raw`${step5FirstDerivLatex}, \quad ${step5SecondDerivLatex}`;
		step5SysLatex = String.raw`\begin{cases} (${m11})A + (${m12})B = ${forcing.K} \\ (${m21})A + (${m22})B = 0 \end{cases}`;

		step5FirstDerivOptions = [
			{
				id: "d1_correct",
				latex: step5FirstDerivLatex,
				isCorrect: true,
			},
			{
				id: "d1_sign_cos",
				latex: String.raw`y_p'(t) = ${w}A \sin(${w}t) + ${w}B \cos(${w}t)`,
				isCorrect: false,
				feedback: String.raw`Trig Sign Error: $\frac{d}{dt}\cos(${w}t) = -${w}\sin(${w}t)$, which introduces a negative sign on the sine term.`,
			},
			{
				id: "d1_sign_sin",
				latex: String.raw`y_p'(t) = -${w}A \sin(${w}t) - ${w}B \cos(${w}t)`,
				isCorrect: false,
				feedback: String.raw`Trig Sign Error: $\frac{d}{dt}\sin(${w}t) = +${w}\cos(${w}t)$, maintaining a positive sign on the cosine term.`,
			},
			{
				id: "d1_missing_factor",
				latex: String.raw`y_p'(t) = -A \sin(${w}t) + B \cos(${w}t)`,
				isCorrect: false,
				feedback: String.raw`Chain Rule Error: Differentiating $\cos(${w}t)$ and $\sin(${w}t)$ pulls out the inner factor of $${w}$.`,
			},
		];

		step5SecondDerivOptions = [
			{
				id: "d2_correct",
				latex: step5SecondDerivLatex,
				isCorrect: true,
			},
			{
				id: "d2_positive_signs",
				latex: String.raw`y_p''(t) = ${w2}A \cos(${w}t) + ${w2}B \sin(${w}t)`,
				isCorrect: false,
				feedback: String.raw`Sign Error: Differentiating $\sin(${w}t)$ yields $+${w}\cos(${w}t)$ (preserving the preceding negative sign), and differentiating $\cos(${w}t)$ introduces another negative sign.`,
			},
			{
				id: "d2_missing_square",
				latex: String.raw`y_p''(t) = -${w}A \cos(${w}t) - ${w}B \sin(${w}t)`,
				isCorrect: false,
				feedback: `Chain Rule Error: Differentiating twice accumulates an inner factor of $(${w})^2 = ${w2}$.`,
			},
			{
				id: "d2_sign_sin_term",
				latex: String.raw`y_p''(t) = -${w2}A \cos(${w}t) + ${w2}B \sin(${w}t)`,
				isCorrect: false,
				feedback: String.raw`Sign Error: The second derivative of $B\sin(${w}t)$ is $-${w2}B\sin(${w}t)$.`,
			},
		];

		step5DerivativeOptions = [
			{
				id: "deriv_correct",
				latex: step5DerivLatex,
				isCorrect: true,
			},
			{
				id: "deriv_sign_err",
				latex: String.raw`y_p'(t) = ${w}A \sin(${w}t) - ${w}B \cos(${w}t), \quad y_p''(t) = ${w2}A \cos(${w}t) + ${w2}B \sin(${w}t)`,
				isCorrect: false,
				feedback: String.raw`Sign Error in Derivatives: $\frac{d}{dt}\cos(${w}t) = -${w}\sin(${w}t)$ and $\frac{d}{dt}\sin(${w}t) = ${w}\cos(${w}t)$.`,
			},
			{
				id: "deriv_missing_omega",
				latex: String.raw`y_p'(t) = -A \sin(${w}t) + B \cos(${w}t), \quad y_p''(t) = -A \cos(${w}t) - B \sin(${w}t)`,
				isCorrect: false,
				feedback: String.raw`Chain Rule Error: Differentiating $\cos(${w}t)$ and $\sin(${w}t)$ pulls out an inner factor of $${w}$.`,
			},
		];

		step5SystemOptions = [
			{
				id: "sys_correct",
				latex: step5SysLatex,
				isCorrect: true,
			},
			{
				id: "sys_sign_err",
				latex: String.raw`\begin{cases} (${m11})A - (${m12})B = ${forcing.K} \\ (${m12})A + (${m22})B = 0 \end{cases}`,
				isCorrect: false,
				feedback: `Sign Error: Substituting $y_p', y_p''$ into $${a2}y'' + ${a1}y' + ${a0}y$ yields $(${m21})A + (${m22})B = 0$ for the sine equation.`,
			},
			{
				id: "sys_missing_factor",
				latex: String.raw`\begin{cases} (${m11})A + (${a1})B = ${forcing.K} \\ (-${a1})A + (${m22})B = 0 \end{cases}`,
				isCorrect: false,
				feedback: String.raw`Missing Inner Factor: The first derivative term contributes $a_1 \cdot ${w} = ${m12}$, not just $a_1$.`,
			},
			{
				id: "sys_uncoupled",
				latex: String.raw`\begin{cases} (${a0})A = ${forcing.K} \\ (${a0})B = 0 \end{cases}`,
				isCorrect: false,
				feedback: String.raw`Missing Derivatives: You must include contributions from $y_p''$ ($-${w2}$) and $y_p'$ ($a_1 \cdot ${w} = ${m12}$) in the grouped harmonic terms.`,
			},
			{
				id: "sys_wrong_target",
				latex: String.raw`\begin{cases} (${m11})A + (${m12})B = 0 \\ (${m21})A + (${m22})B = ${forcing.K} \end{cases}`,
				isCorrect: false,
				feedback: String.raw`Target Forcing Error: The input $x(t) = ${forcing.K}\cos(${w}t)$ is pure cosine, so the cosine sum equates to $${forcing.K}$ and the sine sum equates to $0$.`,
			},
		];
	} else if (forcing.type === "constant") {
		step5FirstDerivLatex = "y_p'(t) = 0";
		step5SecondDerivLatex = "y_p''(t) = 0";
		step5DerivLatex = String.raw`y_p'(t) = 0, \quad y_p''(t) = 0`;
		step5SysLatex = `${a0} K_p = ${forcing.K}`;

		step5FirstDerivOptions = [
			{ id: "d1_const_correct", latex: "y_p'(t) = 0", isCorrect: true },
			{
				id: "d1_const_err",
				latex: "y_p'(t) = K_p",
				isCorrect: false,
				feedback:
					"The derivative of a constant $K_p$ with respect to time $t$ is strictly 0.",
			},
			{
				id: "d1_const_t",
				latex: "y_p'(t) = t K_p",
				isCorrect: false,
				feedback: "A constant $K_p$ does not depend on time.",
			},
		];
		step5SecondDerivOptions = [
			{ id: "d2_const_correct", latex: "y_p''(t) = 0", isCorrect: true },
			{
				id: "d2_const_err",
				latex: "y_p''(t) = K_p",
				isCorrect: false,
				feedback:
					"The second derivative of a constant $K_p$ with respect to time $t$ is strictly 0.",
			},
			{
				id: "d2_const_t",
				latex: "y_p''(t) = t^2 K_p",
				isCorrect: false,
				feedback: "A constant $K_p$ does not depend on time.",
			},
		];
		step5DerivativeOptions = [
			{
				id: "deriv_correct",
				latex: step5DerivLatex,
				isCorrect: true,
			},
			{
				id: "deriv_nonzero",
				latex: String.raw`y_p'(t) = K_p, \quad y_p''(t) = K_p`,
				isCorrect: false,
				feedback:
					"Derivative of a constant: The derivative of any constant $K_p$ with respect to time is strictly zero.",
			},
		];
		step5SystemOptions = [
			{
				id: "sys_correct",
				latex: step5SysLatex,
				isCorrect: true,
			},
			{
				id: "sys_nonzero_deriv",
				latex: `(1 + ${a1} + ${a0}) K_p = ${forcing.K}`,
				isCorrect: false,
				feedback:
					"Derivatives of the constant $y_p(t) = K_p$ vanish: $y_p' = 0$ and $y_p'' = 0$.",
			},
			{
				id: "sys_missing_a0",
				latex: `K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `You must multiply $y_p(t) = K_p$ by the coefficient $a_0 = ${a0}$ in the ODE.`,
			},
			{
				id: "sys_sign_err",
				latex: `-${a0} K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `Sign Error: Maintain the positive coefficient $a_0 = ${a0}$.`,
			},
		];
	} else {
		const p = forcing.p ?? 0;
		const multiplicity = particular.resonanceMultiplicity;
		const polyAtP = polynomialAt(p);
		const systemCoefficient =
			multiplicity === 0
				? polyAtP
				: multiplicity === 1
					? derivativeAt(p)
					: 2 * a2;
		step5FirstDerivLatex =
			multiplicity === 0
				? `y_p'(t) = ${p} K_p e^{${p}t}`
				: multiplicity === 1
					? `y_p'(t) = K_p(1 + ${p}t)e^{${p}t}`
					: `y_p'(t) = K_p(2t + ${p}t^2)e^{${p}t}`;
		step5SecondDerivLatex =
			multiplicity === 0
				? `y_p''(t) = ${p * p} K_p e^{${p}t}`
				: multiplicity === 1
					? `y_p''(t) = K_p(${2 * p} + ${p * p}t)e^{${p}t}`
					: `y_p''(t) = K_p(2 + ${4 * p}t + ${p * p}t^2)e^{${p}t}`;
		step5DerivLatex = String.raw`${step5FirstDerivLatex}, \quad ${step5SecondDerivLatex}`;
		step5SysLatex = `${systemCoefficient} K_p = ${forcing.K}`;

		step5FirstDerivOptions = [
			{
				id: "d1_exp_correct",
				latex: step5FirstDerivLatex,
				isCorrect: true,
			},
			{
				id: "d1_exp_sign",
				latex: `y_p'(t) = ${-p} K_p e^{${p}t}`,
				isCorrect: false,
				feedback: `Chain Rule Sign: Differentiating $e^{${p}t}$ brings down $+${p}$, not $${-p}$.`,
			},
			{
				id: "d1_exp_nofactor",
				latex: `y_p'(t) = K_p e^{${p}t}`,
				isCorrect: false,
				feedback: `Chain Rule Error: Differentiating $e^{${p}t}$ pulls down an inner factor of $p = ${p}$.`,
			},
		];
		step5SecondDerivOptions = [
			{
				id: "d2_exp_correct",
				latex: step5SecondDerivLatex,
				isCorrect: true,
			},
			{
				id: "d2_exp_linear",
				latex: `y_p''(t) = ${p} K_p e^{${p}t}`,
				isCorrect: false,
				feedback: `Chain Rule Error: Differentiating twice squares the factor: $(${p})^2 = ${p * p}$.`,
			},
			{
				id: "d2_exp_neg",
				latex: `y_p''(t) = -${p * p} K_p e^{${p}t}`,
				isCorrect: false,
				feedback: `Sign Error: Squaring $(${p})^2$ is strictly positive ($${p * p}$).`,
			},
		];
		step5DerivativeOptions = [
			{
				id: "deriv_correct",
				latex: step5DerivLatex,
				isCorrect: true,
			},
			{
				id: "deriv_missing_p",
				latex: String.raw`y_p'(t) = K_p e^{${p}t}, \quad y_p''(t) = K_p e^{${p}t}`,
				isCorrect: false,
				feedback: String.raw`Chain Rule Error: $\frac{d}{dt} e^{${p}t} = ${p} e^{${p}t}$ and $\frac{d^2}{dt^2} e^{${p}t} = ${p * p} e^{${p}t}$.`,
			},
		];
		step5SystemOptions = [
			{
				id: "sys_correct",
				latex: step5SysLatex,
				isCorrect: true,
			},
			{
				id: "sys_sign_lin",
				latex: `${p * p - a1 * p + a0} K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `Sign Error: The linear term $+${a1} y'$ contributes $+${a1}(${p}) = +${a1 * p}$, not $-${a1 * p}$.`,
			},
			{
				id: "sys_no_chain",
				latex: `${1 + a1 + a0} K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `Missing Chain Rule Factors: $y_p''$ produces $(${p})^2 = ${p * p}$ and $y_p'$ produces $${p}$.`,
			},
			{
				id: "sys_missing_second_power",
				latex: `${p + a1 * p + a0} K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `Power Error: The second derivative contributes $p^2 = ${p * p}$, not $p = ${p}$.`,
			},
			{
				id: "sys_missing_a0",
				latex: `${p * p + a1 * p + 1} K_p = ${forcing.K}`,
				isCorrect: false,
				feedback: `Coefficient Error: The zero-derivative term is $a_0 y = ${a0} y$, contributing $+${a0}$.`,
			},
		];
	}

	if (resolvedOrder === 1) {
		const step5FirstOrder: FirstOrderOdeItsStep5 = {
			expectedKp: particular.coeffs.Kp,
			expectedA: particular.coeffs.A,
			expectedB: particular.coeffs.B,
			derivativeOptions: shuffleWithRandom(
				step5DerivativeOptions,
				random,
			),
			firstDerivativeOptions: shuffleWithRandom(
				step5FirstDerivOptions,
				random,
			),
			systemOptions: shuffleWithRandom(step5SystemOptions, random),
			derivativesLatex: step5DerivLatex,
			firstDerivLatex: step5FirstDerivLatex,
			systemLatex: step5SysLatex,
			hints: [
				"Find $y_p'(t)$ and substitute $y_p$, $y_p'$ into the ODE.",
				"Collect like terms and equate coefficients with the right-hand side forcing input $x(t)$.",
				forcing.type === "constant"
					? `Solve $${step5SysLatex}$ to get $K_p=${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`
					: forcing.type === "exponential"
						? `After substitution, solve $${step5SysLatex}$ to get $K_p=${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`
						: String.raw`Set up the $2\times 2$ system for $A$ and $B$ and solve.`,
			],
			subStepHints: {
				first_deriv: [
					"Apply differentiation rules to your trial ansatz $y_p(t)$.",
					forcing.type === "sinusoid"
						? String.raw`For $y_p(t) = A\cos(${forcing.omega}t) + B\sin(${forcing.omega}t)$, apply $\frac{d}{dt}\cos(${forcing.omega}t) = -${forcing.omega}\sin(${forcing.omega}t)$ and $\frac{d}{dt}\sin(${forcing.omega}t) = +${forcing.omega}\cos(${forcing.omega}t)$.`
						: forcing.type === "exponential"
							? particular.resonanceMultiplicity === 0
								? `For $y_p(t)=K_pe^{${forcing.p}t}$, bring down $p=${forcing.p}$.`
								: "Apply the product rule to the resonance multiplier and the exponential."
							: "The derivative of a constant is strictly zero.",
					`$${step5FirstDerivLatex}$`,
				],
				system_setup: [
					`Substitute $y_p$ and $y_p'$ into $${a1}y' + ${a0}y=x(t)$.`,
					"Collect like functional terms on the left-hand side and equate their coefficients to the right-hand side forcing input.",
					`Linear system: $${step5SysLatex}$`,
				],
				solve: [
					forcing.type === "sinusoid"
						? String.raw`Solve the $2\times 2$ linear system for coefficients $A$ and $B$.`
						: "Solve the linear algebraic equation for the undetermined scale factor $K_p$.",
					forcing.type === "sinusoid"
						? `From the system, substitute or eliminate to obtain $A$ (cos term) and $B$ (sin term).`
						: `Divide the forcing amplitude by the evaluated polynomial value.`,
					forcing.type === "sinusoid"
						? String.raw`Coefficients: $A = ${toFractionLatex(particular.coeffs.A ?? 0)}, \quad B = ${toFractionLatex(particular.coeffs.B ?? 0)}$.`
						: `Coefficient: $K_p = ${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`,
				],
			},
		};
		return step5FirstOrder;
	}

	const step5SecondOrder: SecondOrderOdeItsStep5 = {
		expectedKp: particular.coeffs.Kp,
		expectedA: particular.coeffs.A,
		expectedB: particular.coeffs.B,
		derivativeOptions: shuffleWithRandom(step5DerivativeOptions, random),
		firstDerivativeOptions: shuffleWithRandom(
			step5FirstDerivOptions,
			random,
		),
		secondDerivativeOptions: shuffleWithRandom(
			step5SecondDerivOptions,
			random,
		),
		systemOptions: shuffleWithRandom(step5SystemOptions, random),
		derivativesLatex: step5DerivLatex,
		firstDerivLatex: step5FirstDerivLatex,
		secondDerivLatex: step5SecondDerivLatex,
		systemLatex: step5SysLatex,
		hints: [
			"Find $y_p'(t)$ and $y_p''(t)$ and substitute them into the ODE.",
			"Collect like terms and equate coefficients with the right-hand side forcing input $x(t)$.",
			forcing.type === "constant"
				? `Solve $${step5SysLatex}$ to get $K_p=${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`
				: forcing.type === "exponential"
					? `After substitution, solve $${step5SysLatex}$ to get $K_p=${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`
					: String.raw`Set up the $2\times 2$ system for $A$ and $B$ and solve.`,
		],
		subStepHints: {
			first_deriv: [
				"Apply differentiation rules to your trial ansatz $y_p(t)$.",
				forcing.type === "sinusoid"
					? String.raw`For $y_p(t) = A\cos(${forcing.omega}t) + B\sin(${forcing.omega}t)$, apply $\frac{d}{dt}\cos(${forcing.omega}t) = -${forcing.omega}\sin(${forcing.omega}t)$ and $\frac{d}{dt}\sin(${forcing.omega}t) = +${forcing.omega}\cos(${forcing.omega}t)$.`
					: forcing.type === "exponential"
						? particular.resonanceMultiplicity === 0
							? `For $y_p(t)=K_pe^{${forcing.p}t}$, bring down $p=${forcing.p}$.`
							: "Apply the product rule to the resonance multiplier and the exponential."
						: "The derivative of a constant is strictly zero.",
				`$${step5FirstDerivLatex}$`,
			],
			second_deriv: [
				"Differentiate the first derivative $y_p'(t)$ one more time.",
				forcing.type === "sinusoid"
					? `Differentiating again multiplies each term by an additional factor of ${forcing.omega}, resulting in $(${forcing.omega})^2 = ${(forcing.omega ?? 1) ** 2}$.`
					: forcing.type === "exponential"
						? particular.resonanceMultiplicity === 0
							? `Differentiating again produces $p^2=${(forcing.p ?? 0) ** 2}$.`
							: "Apply the product rule again, retaining every polynomial-in-$t$ term."
						: "The second derivative of a constant is strictly zero.",
				`$${step5SecondDerivLatex}$`,
			],
			system_setup: [
				`Substitute $y_p$, $y_p'$, and $y_p''$ into $${a2}y'' + ${a1}y' + ${a0}y=x(t)$.`,
				"Collect like functional terms on the left-hand side and equate their coefficients to the right-hand side forcing input.",
				`Linear system: $${step5SysLatex}$`,
			],
			solve: [
				forcing.type === "sinusoid"
					? String.raw`Solve the $2\times 2$ linear system for coefficients $A$ and $B$.`
					: "Solve the linear algebraic equation for the undetermined scale factor $K_p$.",
				forcing.type === "sinusoid"
					? `From the system, substitute or eliminate to obtain $A$ (cos term) and $B$ (sin term).`
					: `Divide the forcing amplitude by the evaluated polynomial value.`,
				forcing.type === "sinusoid"
					? String.raw`Coefficients: $A = ${toFractionLatex(particular.coeffs.A ?? 0)}, \quad B = ${toFractionLatex(particular.coeffs.B ?? 0)}$.`
					: `Coefficient: $K_p = ${toFractionLatex(particular.coeffs.Kp ?? 0)}$.`,
			],
		},
	};
	return step5SecondOrder;
}
