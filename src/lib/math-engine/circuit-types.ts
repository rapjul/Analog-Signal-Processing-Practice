import type { ExactFraction } from "$lib/math-engine/exact-fraction";

/** Positive circuit component values shared by analysis and exact formatting. */
export interface CircuitComponents {
	/** Resistance in ohms. */
	R: number;
	/** Inductance in henries; ignored for topologies without an inductor. */
	L: number;
	/** Capacitance in farads; ignored for topologies without a capacitor. */
	C: number;
}

/** A coefficient retaining its numerical evaluation and independent exact formula. */
export interface CircuitCoefficient {
	/** Floating-point value used by Bode evaluation. */
	numeric: number;
	/** Exact decimal-derived value used by analytical displays. */
	exact: ExactFraction;
}

/** Descending polynomial coefficients with positional exact representations. */
export interface CircuitPolynomials {
	/** Numerator in descending powers. */
	numerator: CircuitCoefficient[];
	/** Denominator in descending powers. */
	denominator: CircuitCoefficient[];
}
