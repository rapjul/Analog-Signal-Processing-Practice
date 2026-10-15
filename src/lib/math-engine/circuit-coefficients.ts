import type {
	CircuitCoefficient,
	CircuitComponents,
} from "$lib/math-engine/circuit-types";
import { ExactFraction } from "$lib/math-engine/exact-fraction";

/**
 * Computes each supported coefficient's numeric and exact forms together.
 * @param components - Positive values, with unused components sanitized by the caller.
 * @returns Named coefficient slots; rounded-equal values never share identity.
 */
export function circuitCoefficients(
	components: CircuitComponents,
): Record<
	| "zero"
	| "one"
	| "rl"
	| "lc"
	| "wc"
	| "twiceWc"
	| "fourWc"
	| "wcSquared"
	| "rc",
	CircuitCoefficient
> {
	const { R, L, C } = components;
	const r = ExactFraction.fromDecimal(R),
		l = ExactFraction.fromDecimal(L),
		c = ExactFraction.fromDecimal(C);
	const one = new ExactFraction(1n),
		wc = one.divide(r.multiply(c));
	const numericWc = 1 / (R * C);
	return {
		zero: { numeric: 0, exact: new ExactFraction(0n) },
		one: { numeric: 1, exact: one },
		rl: { numeric: R / L, exact: r.divide(l) },
		lc: { numeric: 1 / (L * C), exact: one.divide(l.multiply(c)) },
		wc: { numeric: numericWc, exact: wc },
		twiceWc: {
			numeric: 2 * numericWc,
			exact: new ExactFraction(2n).multiply(wc),
		},
		fourWc: {
			numeric: 4 * numericWc,
			exact: new ExactFraction(4n).multiply(wc),
		},
		wcSquared: { numeric: numericWc * numericWc, exact: wc.multiply(wc) },
		rc: { numeric: 1 / numericWc, exact: r.multiply(c) },
	};
}

/**
 * Negates both representations without reconstructing one from the other.
 * @param coefficient - Original coefficient.
 * @returns Coefficient with reversed sign.
 */
export function negateCircuitCoefficient(
	coefficient: CircuitCoefficient,
): CircuitCoefficient {
	return { numeric: -coefficient.numeric, exact: coefficient.exact.negate() };
}
