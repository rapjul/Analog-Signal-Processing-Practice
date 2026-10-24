/** Independent numerical data for regular spectra and weighted distributions. */
import { Complex } from "$lib/math-engine/complex";
import type { SpectrumImpulse } from "$lib/math-engine/transform-validation";
import { evaluateCtftSpectrum, type GeneratedCtftProblem } from "./engine";

/** One plot ordinate, with undefined phase explicitly masked. */
export interface CtftPlotPoint {
	/** Angular frequency in radians per second. */ omega: number;
	/** Ordinary spectrum magnitude. */ magnitude: number;
	/** Principal phase, or null at a numerical zero. */ phase: number | null;
}
/** Separate regular and distribution plot representations. */
export interface CtftSpectrumData {
	/** Meaningful frequency window. */ extent: number;
	/** Ordinary samples, empty for a distribution. */ points: CtftPlotPoint[];
	/** Weighted impulses, empty for an ordinary spectrum. */ impulses: SpectrumImpulse[];
}

/**
 * Selects ordered accessible observations without sampling only rectangular zeros.
 * @param points - Existing regular plot grid; distributions supply no points.
 * @param family - Signal family controlling the observation stride.
 * @returns Existing samples, including masked zeros and intervening rectangular lobes.
 */
export function selectCtftSpectrumSamples(
	points: CtftPlotPoint[],
	family: GeneratedCtftProblem["signalType"],
): CtftPlotPoint[] {
	const stride = family === "rect" ? 25 : 50;
	return points.filter(
		/** @param point - Existing ordinate. @param index - Grid position. @returns Whether it is representative or a numerical zero. */
		(point, index) => index % stride === 0 || point.phase === null,
	);
}

/**
 * Computes an ordinary complex CTFT directly from signal parameters.
 * @param problem - Generated signal, including translation.
 * @param omega - Angular frequency.
 * @returns Complex ordinary spectrum; distributions are rejected by the engine.
 */
export function evaluateCtftRegular(
	problem: GeneratedCtftProblem,
	omega: number,
): Complex {
	const point = evaluateCtftSpectrum(
		problem.signalType,
		problem.params,
		omega,
	);
	return Complex.fromPolar(
		point.magnitude,
		point.phase - omega * problem.params.t0,
	);
}

/**
 * Samples a completed signal without treating Dirac weights as peak heights.
 * @param problem - Authoritative generated signal.
 * @returns Accessible plot data from independent numerical formulas.
 */
export function buildCtftSpectrum(
	problem: GeneratedCtftProblem,
): CtftSpectrumData {
	const { signalType: type, params } = problem;
	if (type === "cos")
		return {
			extent: 1.5 * params.w0,
			points: [],
			impulses: [-params.w0, params.w0].map(
				/** @param location - Exact carrier coordinate. @returns Its complex distribution weight. */
				(location) => ({
					location,
					weight: Complex.fromPolar(Math.PI, -location * params.t0),
				}),
			),
		};
	const extent =
		type === "rect"
			? (8 * Math.PI) / params.T
			: type === "exponential"
				? 5 * params.a
				: type === "gaussian"
					? 5 * Math.sqrt(params.a)
					: 5;
	const peak = evaluateCtftRegular(problem, 0).abs();
	const points: CtftPlotPoint[] = [];
	for (let index = 0; index <= 400; index++) {
		const omega = extent * (index / 200 - 1);
		const value = evaluateCtftRegular(problem, omega);
		const magnitude = value.abs();
		points.push({
			omega,
			magnitude,
			phase: magnitude <= peak * 1e-10 ? null : value.arg(),
		});
	}
	return { extent, points, impulses: [] };
}
