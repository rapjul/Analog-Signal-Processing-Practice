/** Shared numerical contracts for ODE calculations and teaching metadata. */
import type { ForcingFunction } from "./types";

/**
 * Rejects values that cannot represent finite analytical coefficients.
 * @param value - Input or calculated number.
 * @param label - Name used in the diagnostic.
 * @returns The validated number.
 */
export function finiteOdeValue(value: number, label: string): number {
	if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
	return value;
}

/**
 * Applies the historical solver defaults consistently, reducing constant inputs.
 * @param forcing - Public forcing descriptor.
 * @returns A descriptor with explicit rate/frequency and constant degeneracies resolved.
 */
export function normalizeOdeForcing(forcing: ForcingFunction): ForcingFunction {
	finiteOdeValue(forcing.K, "Forcing amplitude");
	if (forcing.type === "exponential") {
		const p = finiteOdeValue(forcing.p ?? -1, "Exponential rate");
		return p === 0
			? { type: "constant", K: forcing.K, latex: `${forcing.K}` }
			: { ...forcing, p };
	}
	if (forcing.type === "sinusoid") {
		const omega = finiteOdeValue(
			forcing.omega ?? 1,
			"Sinusoidal frequency",
		);
		return omega === 0
			? { type: "constant", K: forcing.K, latex: `${forcing.K}` }
			: { ...forcing, omega };
	}
	return forcing;
}

/**
 * Bounds cancellation error by the magnitude of the terms being subtracted.
 * This numerical tolerance is deliberately independent of student grading tolerance.
 * @param residual - Evaluated expression.
 * @param magnitude - Sum of absolute term magnitudes.
 * @returns Whether the residual is indistinguishable from zero at roundoff precision.
 */
export function isOdeRoundoffZero(
	residual: number,
	magnitude: number,
): boolean {
	return Math.abs(residual) <= 16 * Number.EPSILON * magnitude;
}
