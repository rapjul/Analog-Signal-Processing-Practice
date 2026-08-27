/**
 * Fourier Series Symbolic Derivations & LaTeX Templates.
 *
 * Implements analytical LaTeX representations, compact harmonic series,
 * piecewise signal equations, and intermediate integral steps for all supported
 * continuous-time Fourier series waveform archetypes.
 */

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
	const { A, waveformType } = coeffs;
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
			return `x(t) = \\frac{2(${A})}{\\pi} - \\sum_{n=1}^{\\infty} \\frac{4(${A})}{\\pi(4n^2-1)} \\cos\\left(2n ${w0Latex} t\\right)`;
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
	const { A, waveformType } = coeffs;
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
 * @param {number} A - Peak amplitude.
 * @param {number} T0 - Fundamental period.
 * @returns {string} One-period waveform LaTeX.
 */
export function buildSignalLatex(
	waveformType: FourierSeriesWaveformType,
	A: number,
	T0: number,
): string {
	switch (waveformType) {
		case "square":
		case "square_odd":
			return `x(t)=\\begin{cases}-${A}&-${T0 / 2}<t<0\\\\${A}&0<t<${T0 / 2}\\end{cases}`;
		case "square_even":
			return `x(t)=\\begin{cases}${A}&|t|<${T0 / 4}\\\\-${A}&${T0 / 4}<|t|<${T0 / 2}\\end{cases}`;
		case "triangle":
		case "triangle_even":
			return `x(t)=${A}\\left(1-\\frac{4|t|}{${T0}}\\right),\\quad |t|<${T0 / 2}`;
		case "triangle_odd":
			return `x(t)=\\begin{cases}-2(${A})-\\frac{4(${A})}{${T0}}t&-${T0 / 2}<t<-${T0 / 4}\\\\\\frac{4(${A})}{${T0}}t&-${T0 / 4}<t<${T0 / 4}\\\\2(${A})-\\frac{4(${A})}{${T0}}t&${T0 / 4}<t<${T0 / 2}\\end{cases}`;
		case "sawtooth":
			return `x(t)=\\frac{2(${A})}{${T0}}t,\\quad -${T0 / 2}<t<${T0 / 2}`;
		case "half_wave_sine":
			return `x(t)=\\begin{cases}${A}\\sin(\\omega_0t)&0<t<${T0 / 2}\\\\0&${T0 / 2}<t<${T0}\\end{cases}`;
		case "full_wave_sine":
			return `x(t)=${A}\\left|\\sin\\left(\\frac{\\pi t}{${T0}}\\right)\\right|`;
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
	const { A, waveformType } = coeffs;
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
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\,dt`;
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
			evaluationLatex = `a_n=\\frac{4${amplitude}}{n\\pi}\\sin\\left(\\frac{n\\pi}{2}\\right),\\qquad b_n=0`;
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
			evaluationLatex = `a_n=\\frac{4${amplitude}}{n^2\\pi^2}\\left(1-(-1)^n\\right)=${anLatex},\\qquad b_n=0`;
			break;
		case "triangle_odd":
			a0Latex = "0";
			anLatex = "0";
			bnLatex = `\\frac{8${amplitude}}{n^2\\pi^2}\\sin\\left(\\frac{n\\pi}{2}\\right)`;
			FnLatex = `\\begin{cases}-j\\dfrac{4${amplitude}}{n^2\\pi^2}\\sin\\left(\\dfrac{n\\pi}{2}\\right),&n\\text{ odd}\\\\0,&n\\text{ even}\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\int_0^{T_0/2}${A}\\left(1-\\frac{4t}{T_0}\\right)\\,dt`;
			integralLatex = `b_n=\\frac{4}{T_0}\\left[\\int_0^{T_0/4}\\frac{4${amplitude}t}{T_0}\\sin(n\\omega_0t)\\,dt+\\int_{T_0/4}^{T_0/2}\\left(2${amplitude}-\\frac{4${amplitude}t}{T_0}\\right)\\sin(n\\omega_0t)\\,dt\\right]`;
			expIntegralLatex = `F_n=-\\frac{2j}{T_0}\\left[\\int_0^{T_0/4}\\frac{4${amplitude}t}{T_0}\\sin(n\\omega_0t)\\,dt+\\int_{T_0/4}^{T_0/2}\\left(2${amplitude}-\\frac{4${amplitude}t}{T_0}\\right)\\sin(n\\omega_0t)\\,dt\\right]`;
			evaluationLatex = `b_n=\\frac{8${amplitude}}{n^2\\pi^2}\\sin\\left(\\frac{n\\pi}{2}\\right),\\qquad a_0=a_n=0`;
			break;
		case "sawtooth":
			a0Latex = "0";
			anLatex = "0";
			bnLatex = `\\frac{2${amplitude}(-1)^{n+1}}{n\\pi}`;
			FnLatex = `\\begin{cases}0,&n=0\\\\-j\\dfrac{${A}(-1)^{n+1}}{n\\pi},&n\\ne0\\end{cases}`;
			a0IntegralLatex = `a_0=\\frac{4}{T_0}\\int_0^{T_0/2}\\frac{2${amplitude}t}{T_0}\\,dt`;
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
			evaluationLatex = `a_0=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)\\,dt=\\frac{2${amplitude}}{\\pi},\\quad b_1=\\frac{${A}}{2},\\quad a_n=${anLatex}`;
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
			: integralLatex;
	const bnIntegralLatex =
		waveformType === "half_wave_sine"
			? `b_n=\\frac{2}{T_0}\\int_0^{T_0/2}${A}\\sin(\\omega_0t)\\sin(n\\omega_0t)\\,dt`
			: integralLatex;
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
		evaluationLatex,
		finalTrigLatex,
		finalExpLatex,
	};
}

// Alias for compatibility
export const buildFourierSymbolicDerivation =
	buildFourierSeriesSymbolicDerivation;
