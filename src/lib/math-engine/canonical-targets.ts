/** Independent canonical targets constructed exclusively from problem parameters. */
import { CanonicalError } from "$lib/math-engine/canonical-algebra";
import {
	type CanonicalTransform,
	normalizeCanonicalTransform,
} from "$lib/math-engine/canonical-transform";
import type {
	CtftParameters,
	CtftSignalType,
} from "$lib/math-engine/fourier-transform";

/**
 * Constructs the expected CTFT using signal parameters, never displayed answer text.
 * @param type - Generated signal family.
 * @param params - Signal parameters and time shift.
 * @returns Independently specified canonical spectrum.
 */
export function createCtftCanonicalTarget(
	type: CtftSignalType,
	params: CtftParameters,
): CanonicalTransform {
	const { a, T, w0, t0 } = params;
	const phase = ["Exp", ["Multiply", "ImaginaryUnit", -t0, "omega"]];
	let base: unknown;
	switch (type) {
		case "delta":
			base = 1;
			break;
		case "exponential":
			base = [
				"Divide",
				1,
				["Add", a, ["Multiply", "ImaginaryUnit", "omega"]],
			];
			break;
		case "gaussian":
			base = [
				"Multiply",
				["Sqrt", ["Divide", "Pi", a]],
				["Exp", ["Divide", ["Negate", ["Power", "omega", 2]], 4 * a]],
			];
			break;
		case "rect":
			base = [
				"Multiply",
				T,
				[
					"Sinc",
					["Divide", ["Multiply", T, "omega"], ["Multiply", 2, "Pi"]],
				],
			];
			break;
		case "cos":
			base = [
				"Multiply",
				"Pi",
				[
					"Add",
					[
						"Multiply",
						"DiracDelta",
						["Delimiter", ["Subtract", "omega", w0]],
					],
					[
						"Multiply",
						"DiracDelta",
						["Delimiter", ["Add", "omega", w0]],
					],
				],
			];
			break;
		default:
			throw new CanonicalError(
				"unsupported",
				"This signal family has no supported verification target.",
			);
	}
	return normalizeCanonicalTransform(["Multiply", base, phase], "omega");
}

/**
 * Reconstructs exact causal PFD residues from original numerator and denominator roots.
 * @param numerator - Numerator coefficients in descending order.
 * @param roots - Original distinct denominator roots, including canceled factors.
 * @returns Independent target with both half-line support expressions.
 */
export function createLaplaceCanonicalTarget(
	numerator: [number, number],
	roots: [number, number],
): CanonicalTransform {
	const terms: unknown[] = [];
	for (let index = 0; index < roots.length; index++) {
		const pole = roots[index]!,
			other = roots[1 - index]!;
		const residue = [
			"Divide",
			["Add", ["Multiply", numerator[0], pole], numerator[1]],
			["Subtract", pole, other],
		];
		terms.push(["Multiply", residue, ["Exp", ["Multiply", pole, "t"]]]);
	}
	return normalizeCanonicalTransform(
		["Multiply", ["Add", ...terms], ["Heaviside", "t"]],
		"t",
	);
}
