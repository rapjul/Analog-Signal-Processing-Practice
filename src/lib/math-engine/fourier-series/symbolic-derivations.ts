/**
 * Fourier Series Symbolic Derivations & LaTeX Templates.
 *
 * Implements analytical LaTeX representations, compact harmonic series,
 * piecewise signal equations, and intermediate integral steps for all supported
 * continuous-time Fourier series waveform archetypes.
 */

import { FOURIER_COEFFICIENT_METADATA } from "./coefficient-metadata";
import { formatFourierNumber } from "./frequency";
import type {
	FourierSeriesCoefficients,
	FourierSeriesSymbolicDerivation,
	FourierSeriesWaveformType,
} from "./types";

/**
 * Builds the standard final series LaTeX representation.
 *
 * @param {FourierSeriesCoefficients} coeffs - Calculated coefficients.
 * @param {string} w0Latex - Fundamental frequency LaTeX string.
 * @returns {string} LaTeX series expression.
 */
export function buildFinalSeriesLatex(
	coeffs: FourierSeriesCoefficients,
	w0Latex: string,
): string {
	const { waveformType } = coeffs;
	const A = formatFourierNumber(coeffs.A);
	switch (waveformType) {
		case "square":
		case "square_odd":
			return `x(t) = \\sum_{n=1,3,5,\\dots}^{\\infty} \\frac{4(${A})}{n\\pi} \\sin\\left(n ${w0Latex} t\\right)`;
		case "square_even":
			return `x(t) = \\sum_{n=1,3,5,\\dots}^{\\infty} \\frac{4(${A})}{n\\pi} \\sin\\left(\\frac{n\\pi}{2}\\right) \\cos\\left(n ${w0Latex} t\\right)`;
		case "triangle":
		case "triangle_even":
			return `x(t) = \\sum_{n=1,3,5,\\dots}^{\\infty} \\frac{8(${A})}{n^2\\pi^2} \\cos\\left(n ${w0Latex} t\\right)`;
		case "triangle_odd":
			return `x(t) = \\sum_{n=1,3,5,\\dots}^{\\infty} \\frac{8(${A})}{n^2\\pi^2} \\sin\\left(\\frac{n\\pi}{2}\\right) \\sin\\left(n ${w0Latex} t\\right)`;
		case "sawtooth":
			return `x(t) = \\sum_{n=1}^{\\infty} \\frac{2(${A})(-1)^{n+1}}{n\\pi} \\sin\\left(n ${w0Latex} t\\right)`;
		case "half_wave_sine":
			return `x(t) = \\frac{${A}}{\\pi} + \\frac{${A}}{2}\\sin\\left(${w0Latex} t\\right) + \\sum_{n=2,4,6,\\dots}^{\\infty} \\frac{2(${A})}{\\pi(1-n^2)} \\cos\\left(n ${w0Latex} t\\right)`;
		case "full_wave_sine":
			return `x(t) = \\frac{2(${A})}{\\pi} - \\sum_{n=1}^{\\infty} \\frac{4(${A})}{\\pi(4n^2-1)} \\cos\\left(n ${w0Latex} t\\right)`;
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Builds the exact compact trigonometric series (cosine with phase angle).
 *
 * @param {FourierSeriesCoefficients} coeffs - Waveform coefficients and parameters.
 * @param {string} w0Latex - Fundamental radian frequency LaTeX string.
 * @returns {string} Exact compact harmonic series LaTeX.
 */
export function buildCompactSeriesLatex(
	coeffs: FourierSeriesCoefficients,
	w0Latex: string,
): string {
	const { waveformType } = coeffs;
	const A = formatFourierNumber(coeffs.A);
	/** @param body - Harmonic definitions. @returns Complete compact series. */
	const harmonic = (body: string): string =>
		`x(t)=\\frac{c_0}{2}+\\sum_{n=1}^{\\infty}c_n\\cos(n ${w0Latex} t+\\theta_n),\\qquad ${body}`;
	switch (waveformType) {
		case "square":
		case "square_odd":
			return harmonic(
				`c_0=0,\\quad c_n=\\begin{cases}\\dfrac{4(${A})}{n\\pi},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases},\\quad \\theta_n=-\\dfrac{\\pi}{2}\\ (n\\text{ odd})`,
			);
		case "square_even":
			return harmonic(
				`c_0=0,\\quad c_n=\\begin{cases}\\dfrac{4(${A})}{n\\pi},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases},\\quad \\theta_n=\\begin{cases}0,&n\\equiv1\\pmod4\\\\\\pi,&n\\equiv3\\pmod4\\end{cases}`,
			);
		case "triangle":
		case "triangle_even":
			return harmonic(
				`c_0=0,\\quad c_n=\\begin{cases}\\dfrac{8(${A})}{n^2\\pi^2},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases},\\quad \\theta_n=0\\ (n\\text{ odd})`,
			);
		case "triangle_odd":
			return harmonic(
				`c_0=0,\\quad c_n=\\begin{cases}\\dfrac{8(${A})}{n^2\\pi^2},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases},\\quad \\theta_n=\\begin{cases}-\\dfrac{\\pi}{2},&n\\equiv1\\pmod4\\\\\\dfrac{\\pi}{2},&n\\equiv3\\pmod4\\end{cases}`,
			);
		case "sawtooth":
			return harmonic(
				`c_0=0,\\quad c_n=\\dfrac{2(${A})}{n\\pi},\\quad \\theta_n=\\dfrac{(-1)^n\\pi}{2}`,
			);
		case "half_wave_sine":
			return harmonic(
				`c_0=\\dfrac{2(${A})}{\\pi},\\quad c_1=\\dfrac{${A}}{2},\\ \\theta_1=-\\dfrac{\\pi}{2},\\quad c_{2k}=\\dfrac{2(${A})}{\\pi(4k^2-1)},\\ \\theta_{2k}=\\pi,\\quad c_n=0\\ (n>1\\text{ odd})`,
			);
		case "full_wave_sine":
			return harmonic(
				`c_0=\\dfrac{4(${A})}{\\pi},\\quad c_n=\\dfrac{4(${A})}{\\pi(4n^2-1)},\\quad \\theta_n=\\pi`,
			);
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Builds a waveform definition consistent with its coefficient convention.
 *
 * @param {FourierSeriesWaveformType} waveformType - Waveform variant.
 * @param {number} amplitude - Peak amplitude.
 * @param {number} T0 - Fundamental period.
 * @returns {string} One-period waveform LaTeX.
 */
export function buildSignalLatex(
	waveformType: FourierSeriesWaveformType,
	amplitude: number,
	T0: number,
): string {
	const A = formatFourierNumber(amplitude);
	const period = formatFourierNumber(T0);
	const halfPeriod = formatFourierNumber(T0 / 2);
	const quarterPeriod = formatFourierNumber(T0 / 4);
	switch (waveformType) {
		case "square":
		case "square_odd":
			return `x(t)=\\begin{cases}-${A}&-${halfPeriod}<t<0\\\\${A}&0<t<${halfPeriod}\\end{cases}`;
		case "square_even":
			return `x(t)=\\begin{cases}${A}&|t|<${quarterPeriod}\\\\-${A}&${quarterPeriod}<|t|<${halfPeriod}\\end{cases}`;
		case "triangle":
		case "triangle_even":
			return `x(t)=${A}\\left(1-\\frac{4|t|}{${period}}\\right),\\quad |t|<${halfPeriod}`;
		case "triangle_odd":
			return `x(t)=\\begin{cases}-2(${A})-\\frac{4(${A})}{${period}}t&-${halfPeriod}<t<-${quarterPeriod}\\\\\\frac{4(${A})}{${period}}t&-${quarterPeriod}<t<${quarterPeriod}\\\\2(${A})-\\frac{4(${A})}{${period}}t&${quarterPeriod}<t<${halfPeriod}\\end{cases}`;
		case "sawtooth":
			return `x(t)=\\frac{2(${A})}{${period}}t,\\quad -${halfPeriod}<t<${halfPeriod}`;
		case "half_wave_sine":
			return `x(t)=\\begin{cases}${A}\\sin(\\omega_0t)&0<t<${halfPeriod}\\\\0&${halfPeriod}<t<${period}\\end{cases}`;
		case "full_wave_sine":
			return `x(t)=${A}\\left|\\sin\\left(\\frac{\\pi t}{${period}}\\right)\\right|`;
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Builds the exact symbolic derivation for one supported waveform.
 *
 * @param {FourierSeriesCoefficients} coeffs - Waveform coefficients and parameters.
 * @param {string} w0Latex - Fundamental frequency LaTeX string.
 * @returns {FourierSeriesSymbolicDerivation} Symbolic derivation expressions.
 */
export function buildFourierSeriesSymbolicDerivation(
	coeffs: FourierSeriesCoefficients,
	w0Latex: string,
): FourierSeriesSymbolicDerivation {
	const { waveformType } = coeffs;
	const A = formatFourierNumber(coeffs.A);
	const amplitude = `(${A})`;
	const finalTrigLatex = buildFinalSeriesLatex(coeffs, w0Latex);
	let a0Latex: string;
	let anLatex: string;
	let bnLatex: string;
	let FnLatex: string;
	let a0IntegralLatex: string;
	let integralLatex: string;
	let expIntegralLatex: string;
	let evaluationLatex: string;

	switch (waveformType) {
		case "square":
		case "square_odd":
			a0Latex = "0";
			anLatex = "0";
			bnLatex = `\\begin{cases}\\dfrac{4${amplitude}}{n\\pi},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			FnLatex = `\\begin{cases}-j\\dfrac{2${amplitude}}{n\\pi},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			a0IntegralLatex = buildFullPeriodIntegral(coeffs, "a0");
			integralLatex = `b_n=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\sin(n\\omega_0t)\\,dt`;
			expIntegralLatex = `F_n=\\frac{1}{T_0}\\left[\\int_{-T_0/2}^{0}-${A}e^{-jn\\omega_0t}\\,dt+\\int_0^{T_0/2}${A}e^{-jn\\omega_0t}\\,dt\\right]`;
			evaluationLatex = `b_n=\\frac{4${amplitude}}{T_0}\\left[-\\frac{\\cos(n\\omega_0t)}{n\\omega_0}\\right]_0^{T_0/2}=\\frac{2${amplitude}}{n\\pi}\\left(1-(-1)^n\\right)=${bnLatex}`;
			break;
		case "square_even":
			a0Latex = "0";
			anLatex = `\\frac{4${amplitude}}{n\\pi}\\sin\\left(\\frac{n\\pi}{2}\\right)`;
			bnLatex = "0";
			FnLatex = `\\begin{cases}0,&n=0\\\\\\dfrac{2${amplitude}}{n\\pi}\\sin\\left(\\dfrac{n\\pi}{2}\\right),&n\\ne0\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\left[\\int_0^{T_0/4}${A}\\,dt-\\int_{T_0/4}^{T_0/2}${A}\\,dt\\right]`;
			integralLatex = `a_n=\\frac{4}{T_0}\\left[\\int_0^{T_0/4}${A}\\cos(n\\omega_0t)\\,dt-\\int_{T_0/4}^{T_0/2}${A}\\cos(n\\omega_0t)\\,dt\\right]`;
			expIntegralLatex = `F_n=\\frac{2}{T_0}\\left[\\int_0^{T_0/4}${A}\\cos(n\\omega_0t)\\,dt-\\int_{T_0/4}^{T_0/2}${A}\\cos(n\\omega_0t)\\,dt\\right]`;
			evaluationLatex = `a_n=\\frac{4${amplitude}}{T_0}\\left(\\left[\\frac{\\sin(n\\omega_0t)}{n\\omega_0}\\right]_0^{T_0/4}-\\left[\\frac{\\sin(n\\omega_0t)}{n\\omega_0}\\right]_{T_0/4}^{T_0/2}\\right)=\\frac{4${amplitude}}{n\\pi}\\sin\\left(\\frac{n\\pi}{2}\\right),\\qquad b_n=0`;
			break;
		case "triangle":
		case "triangle_even":
			a0Latex = "0";
			anLatex = `\\begin{cases}\\dfrac{8${amplitude}}{n^2\\pi^2},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			bnLatex = "0";
			FnLatex = `\\begin{cases}\\dfrac{4${amplitude}}{n^2\\pi^2},&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\left(1-\\frac{4t}{T_0}\\right)\\,dt`;
			integralLatex = `a_n=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\left(1-\\frac{4t}{T_0}\\right)\\cos(n\\omega_0t)\\,dt`;
			expIntegralLatex = `F_n=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\left(1-\\frac{4t}{T_0}\\right)\\cos(n\\omega_0t)\\,dt`;
			evaluationLatex = `a_n=\\frac{4${amplitude}}{T_0}\\left[\\frac{(1-4t/T_0)\\sin(n\\omega_0t)}{n\\omega_0}-\\frac{4\\cos(n\\omega_0t)}{T_0 n^2\\omega_0^2}\\right]_0^{T_0/2}=\\frac{4${amplitude}}{n^2\\pi^2}\\left(1-(-1)^n\\right)=${anLatex},\\qquad b_n=0`;
			break;
		case "triangle_odd":
			a0Latex = "0";
			anLatex = "0";
			bnLatex = `\\frac{8${amplitude}}{n^2\\pi^2}\\sin\\left(\\frac{n\\pi}{2}\\right)`;
			FnLatex = `\\begin{cases}-j\\dfrac{4${amplitude}}{n^2\\pi^2}\\sin\\left(\\dfrac{n\\pi}{2}\\right),&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			a0IntegralLatex = buildFullPeriodIntegral(coeffs, "a0");
			integralLatex = `b_n=\\frac{4}{T_0}\\left[\\int_0^{T_0/4}\\frac{4${amplitude}t}{T_0}\\sin(n\\omega_0t)\\,dt+\\int_{T_0/4}^{T_0/2}\\left(2${amplitude}-\\frac{4${amplitude}t}{T_0}\\right)\\sin(n\\omega_0t)\\,dt\\right]`;
			expIntegralLatex = `F_n=-\\frac{2j}{T_0}\\left[\\int_0^{T_0/4}\\frac{4${amplitude}t}{T_0}\\sin(n\\omega_0t)\\,dt+\\int_{T_0/4}^{T_0/2}\\left(2${amplitude}-\\frac{4${amplitude}t}{T_0}\\right)\\sin(n\\omega_0t)\\,dt\\right]`;
			evaluationLatex = `b_n=\\frac{8${amplitude}}{n^2\\pi^2}\\sin\\left(\\frac{n\\pi}{2}\\right),\\qquad a_0=a_n=0`;
			break;
		case "sawtooth":
			a0Latex = "0";
			anLatex = "0";
			bnLatex = `\\frac{2${amplitude}(-1)^{n+1}}{n\\pi}`;
			FnLatex = `\\begin{cases}0,&n=0\\\\-j\\dfrac{${A}(-1)^{n+1}}{n\\pi},&n\\ne0\\end{cases}`;
			a0IntegralLatex = buildFullPeriodIntegral(coeffs, "a0");
			integralLatex = `b_n=\\frac{4}{T_0}\\int_0^{T_0/2}\\frac{2${amplitude}t}{T_0}\\sin(n\\omega_0t)\\,dt`;
			expIntegralLatex = `F_n=-\\frac{2j}{T_0}\\int_0^{T_0/2}\\frac{2${amplitude}t}{T_0}\\sin(n\\omega_0t)\\,dt`;
			evaluationLatex = `b_n=\\frac{8${amplitude}}{T_0^2}\\left[-\\frac{t\\cos(n\\omega_0t)}{n\\omega_0}+\\frac{\\sin(n\\omega_0t)}{n^2\\omega_0^2}\\right]_0^{T_0/2}=\\frac{2${amplitude}(-1)^{n+1}}{n\\pi}`;
			break;
		case "half_wave_sine":
			a0Latex = `\\frac{2${amplitude}}{\\pi}`;
			anLatex = `\\begin{cases}\\dfrac{2${amplitude}}{\\pi(1-n^2)},&n\\text{ even}\\\\0,&n\\text{ odd}\\end{cases}`;
			bnLatex = `\\begin{cases}\\dfrac{${A}}{2},&n=1\\\\0,&n\\ne1\\end{cases}`;
			FnLatex = `\\begin{cases}\\dfrac{${A}}{\\pi},&n=0\\\\-j\\dfrac{${A}}{4},&n=1\\\\j\\dfrac{${A}}{4},&n=-1\\\\\\dfrac{${A}}{\\pi(1-n^2)},&n\\ne0\\text{ even}\\\\0,&|n|>1\\text{ odd}\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)\\,dt`;
			integralLatex = `F_n=\\frac{1}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)e^{-jn\\omega_0t}\\,dt`;
			expIntegralLatex = integralLatex;
			evaluationLatex = `a_0=\\left[-\\frac{2${amplitude}\\cos(\\omega_0t)}{T_0\\omega_0}\\right]_0^{T_0/2}=\\frac{2${amplitude}}{\\pi},\\quad a_n=${anLatex},\\quad b_n=${bnLatex}`;
			break;
		case "full_wave_sine":
			a0Latex = `\\frac{4${amplitude}}{\\pi}`;
			anLatex = `-\\frac{4${amplitude}}{\\pi(4n^2-1)}`;
			bnLatex = "0";
			FnLatex = `\\begin{cases}\\dfrac{2${amplitude}}{\\pi},&n=0\\\\-\\dfrac{2${amplitude}}{\\pi(4n^2-1)},&n\\ne0\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\sin\\left(\\frac{\\pi t}{T_0}\\right)\\,dt`;
			integralLatex = `a_n=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\sin\\left(\\frac{\\pi t}{T_0}\\right)\\cos(n\\omega_0t)\\,dt`;
			expIntegralLatex = `F_n=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin\\left(\\frac{\\pi t}{T_0}\\right)\\cos(n\\omega_0t)\\,dt`;
			evaluationLatex = `a_0=\\frac{4${amplitude}}{\\pi},\\qquad a_n=-\\frac{4${amplitude}}{\\pi(4n^2-1)},\\qquad b_n=0`;
			break;
		default: {
			const _exhaustiveCheck: never = waveformType;
			throw new Error(
				`Unsupported waveform type: ${String(_exhaustiveCheck)}`,
			);
		}
	}

	const finalExpLatex = `x(t)=\\sum_{n=-\\infty}^{\\infty}F_ne^{j n ${w0Latex} t},\\qquad F_n=${FnLatex}`;
	const anIntegralLatex =
		waveformType === "half_wave_sine"
			? `a_n=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)\\cos(n\\omega_0t)\\,dt`
			: coeffs.originParity === "even"
				? integralLatex
				: buildFullPeriodIntegral(coeffs, "an");
	const bnIntegralLatex =
		waveformType === "half_wave_sine"
			? `b_n=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)\\sin(n\\omega_0t)\\,dt`
			: coeffs.originParity === "odd"
				? integralLatex
				: buildFullPeriodIntegral(coeffs, "bn");
	return {
		a0Latex,
		anLatex,
		bnLatex,
		FnLatex,
		a0IntegralLatex,
		anIntegralLatex,
		bnIntegralLatex,
		integralLatex,
		expIntegralLatex,
		expEvaluationLatex: buildExponentialEvaluation(coeffs, FnLatex),
		evaluationLatex,
		finalTrigLatex,
		finalExpLatex,
	};
}

/**
 * Evaluates the exponential setup directly, retaining boundary and resonant terms.
 * @param coeffs - Waveform parameters and symmetry metadata.
 * @param result - Signed exponential coefficient definition.
 * @returns Evaluation valid for all integer indices, with DC handled separately.
 */
function buildExponentialEvaluation(
	coeffs: FourierSeriesCoefficients,
	result: string,
): string {
	const A = `(${formatFourierNumber(coeffs.A)})`;
	const k = "n\\omega_0";
	const sinePrimitive = `-\\frac{\\cos(n\\omega_0t)}{${k}}`;
	const cosinePrimitive = `\\frac{\\sin(n\\omega_0t)}{${k}}`;
	let evaluation: string;
	let dc = "0";
	let dcEvaluation = `\\frac{1}{2}\\left(${buildFullPeriodIntegral(coeffs, "a0").split("=")[1]}\\right)`;
	switch (coeffs.waveformType) {
		case "square":
		case "square_odd":
			evaluation = `-\\frac{2j${A}}{T_0}\\left[${sinePrimitive}\\right]_0^{T_0/2}`;
			break;
		case "square_even":
			evaluation = `\\frac{2${A}}{T_0}\\left(\\left[${cosinePrimitive}\\right]_0^{T_0/4}-\\left[${cosinePrimitive}\\right]_{T_0/4}^{T_0/2}\\right)`;
			break;
		case "triangle":
		case "triangle_even":
			evaluation = `\\frac{2${A}}{T_0}\\left[\\frac{(1-4t/T_0)\\sin(n\\omega_0t)}{${k}}-\\frac{4\\cos(n\\omega_0t)}{T_0n^2\\omega_0^2}\\right]_0^{T_0/2}`;
			break;
		case "triangle_odd":
			evaluation = `-\\frac{2j${A}}{T_0}\\left(\\left[-\\frac{4t\\cos(n\\omega_0t)}{T_0${k}}+\\frac{4\\sin(n\\omega_0t)}{T_0n^2\\omega_0^2}\\right]_0^{T_0/4}+\\left[-\\frac{(2-4t/T_0)\\cos(n\\omega_0t)}{${k}}-\\frac{4\\sin(n\\omega_0t)}{T_0n^2\\omega_0^2}\\right]_{T_0/4}^{T_0/2}\\right)`;
			break;
		case "sawtooth":
			evaluation = `-\\frac{4j${A}}{T_0^2}\\left[-\\frac{t\\cos(n\\omega_0t)}{${k}}+\\frac{\\sin(n\\omega_0t)}{n^2\\omega_0^2}\\right]_0^{T_0/2}`;
			break;
		case "half_wave_sine":
			dc = `\\frac{${A}}{\\pi}`;
			dcEvaluation = `\\frac{${A}}{T_0}\\left[-\\frac{\\cos(\\omega_0t)}{\\omega_0}\\right]_0^{T_0/2}`;
			evaluation = `\\frac{${A}}{2jT_0}\\left[\\frac{e^{-j(n-1)\\omega_0t}}{-j(n-1)\\omega_0}-\\frac{e^{-j(n+1)\\omega_0t}}{-j(n+1)\\omega_0}\\right]_0^{T_0/2}`;
			return `\\begin{gathered}F_n=${evaluation}\\quad(n\\ne0,\\pm1)\\\\F_0=${dcEvaluation}=${dc}\\\\F_1=\\frac{${A}}{2jT_0}\\left[t-\\frac{e^{-2j\\omega_0t}}{-2j\\omega_0}\\right]_0^{T_0/2}=-j\\frac{${A}}{4}\\\\F_{-1}=\\frac{${A}}{2jT_0}\\left[\\frac{e^{2j\\omega_0t}}{2j\\omega_0}-t\\right]_0^{T_0/2}=j\\frac{${A}}{4}\\\\F_n=${result}\\end{gathered}`;
		case "full_wave_sine":
			dc = `\\frac{2${A}}{\\pi}`;
			dcEvaluation = `\\frac{2${A}}{T_0}\\left[-\\frac{\\cos(\\pi t/T_0)}{\\pi/T_0}\\right]_0^{T_0/2}`;
			evaluation = `-\\frac{${A}}{T_0}\\left[\\frac{\\cos((1+2n)\\pi t/T_0)}{(1+2n)\\pi/T_0}+\\frac{\\cos((1-2n)\\pi t/T_0)}{(1-2n)\\pi/T_0}\\right]_0^{T_0/2}`;
			break;
	}
	return `\\begin{gathered}F_n=${evaluation}\\quad(n\\ne0)\\\\F_0=${dcEvaluation}=${dc}\\\\F_n=${result}\\end{gathered}`;
}

/**
 * Builds a correctly labeled full-period integral, including vanished families.
 * @param coeffs - Waveform parameters and symmetry metadata.
 * @param target - Trigonometric coefficient family.
 * @returns Piecewise integral over one centered or positive period.
 */
function buildFullPeriodIntegral(
	coeffs: FourierSeriesCoefficients,
	target: "a0" | "an" | "bn",
): string {
	const A = `(${formatFourierNumber(coeffs.A)})`;
	const kernel =
		target === "a0"
			? ""
			: target === "an"
				? "\\cos(n\\omega_0t)"
				: "\\sin(n\\omega_0t)";
	const { label } = FOURIER_COEFFICIENT_METADATA[target];
	let pieces: [string, string, string][];
	switch (coeffs.waveformType) {
		case "square":
		case "square_odd":
			pieces = [
				["-T_0/2", "0", `-${A}`],
				["0", "T_0/2", A],
			];
			break;
		case "square_even":
			pieces = [
				["-T_0/2", "-T_0/4", `-${A}`],
				["-T_0/4", "T_0/4", A],
				["T_0/4", "T_0/2", `-${A}`],
			];
			break;
		case "triangle_odd":
			pieces = [
				["-T_0/2", "-T_0/4", `-2${A}-\\frac{4${A}t}{T_0}`],
				["-T_0/4", "T_0/4", `\\frac{4${A}t}{T_0}`],
				["T_0/4", "T_0/2", `2${A}-\\frac{4${A}t}{T_0}`],
			];
			break;
		case "sawtooth":
			pieces = [["-T_0/2", "T_0/2", `\\frac{2${A}t}{T_0}`]];
			break;
		case "half_wave_sine":
			pieces = [["0", "T_0/2", `${A}\\sin(\\omega_0t)`]];
			break;
		case "full_wave_sine":
			pieces = [["0", "T_0", `${A}\\sin(\\frac{\\pi t}{T_0})`]];
			break;
		default:
			pieces = [
				["-T_0/2", "0", `${A}(1+\\frac{4t}{T_0})`],
				["0", "T_0/2", `${A}(1-\\frac{4t}{T_0})`],
			];
	}
	const integrals = pieces.map(
		/** @param piece - Interval bounds and waveform expression. @returns One integral. */
		([lower, upper, signal]): string =>
			`\\int_{${lower}}^{${upper}}\\left(${signal}\\right)${kernel}\\,dt`,
	);
	return `${label}=\\frac{2}{T_0}\\left[${integrals.join("+")}\\right]`;
}

/**
 * Resolves exponential evaluation metadata consistently for generated and legacy derivations.
 * @param derivation - Current or legacy symbolic derivation.
 * @returns Direct evaluation when supplied, otherwise the signed coefficient definition.
 */
export function getExponentialEvaluationLatex(
	derivation: FourierSeriesSymbolicDerivation,
): string {
	return derivation.expEvaluationLatex ?? `F_n=${derivation.FnLatex}`;
}

// Alias for compatibility
export const buildFourierSymbolicDerivation =
	buildFourierSeriesSymbolicDerivation;
