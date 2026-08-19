/**
 * Compares numeric answers with an absolute floor and a relative tolerance.
 * The floor keeps values near zero practical while the relative term scales for
 * large generated coefficients.
 */
export function approximatelyEqual(actual: number, expected: number): boolean {
	if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
	const tolerance = Math.max(5e-4, 1e-4 * Math.abs(expected));
	return Math.abs(actual - expected) <= tolerance;
}
