import { ExactFraction as Q } from "$lib/math-engine/exact-fraction";
import type { LaplaceFactor } from "./types";

/** Dense ascending exact polynomial. */
export type Poly = Q[];
/** Exact rational expression. */
export interface Rational {
	/** Ascending numerator. */ n: Poly;
	/** Ascending denominator. */ d: Poly;
}

/** @param input - Decimal or rational literal. @returns Bounded exact value. */
export function fraction(input: string | number): Q {
	const text = String(input).trim();
	if (text.length > 64)
		throw new Error("Use rational literals of at most 64 characters.");
	const parts = text.split("/");
	if (parts.length > 2)
		throw new Error("Use an integer, decimal, or fraction such as -2/3.");
	const result = Q.fromLiteral(parts[0]!).divide(
		Q.fromLiteral(parts[1] ?? "1"),
	);
	if (
		!Number.isFinite(result.toNumber()) ||
		Math.abs(result.toNumber()) > 1e6
	)
		throw new Error(
			"Use finite coefficients with magnitude at most 1,000,000.",
		);
	return result;
}

/** @param p - Polynomial. @returns Copy without trailing exact zeros. */
export function trim(p: Poly): Poly {
	const result = [...p];
	while (result.length > 1 && result.at(-1)!.numerator === 0n) result.pop();
	return result.length ? result : [fraction(0)];
}

/** @param a - Polynomial. @param b - Addend. @returns Exact sum. */
export function add(a: Poly, b: Poly): Poly {
	return trim(
		Array.from(
			{ length: Math.max(a.length, b.length) },
			/** @param _ - Unused entry. @param i - Power. @returns Coefficient. */
			(_, i) => (a[i] ?? fraction(0)).add(b[i] ?? fraction(0)),
		),
	);
}

/** @param a - Polynomial. @param value - Scale. @returns Scaled polynomial. */
export function scale(a: Poly, value: Q): Poly {
	return trim(
		a.map(
			/** @param c - Coefficient. @returns Scaled coefficient. */
			(c) => c.multiply(value),
		),
	);
}

/** @param a - Polynomial. @param b - Factor. @returns Exact product. */
export function multiply(a: Poly, b: Poly): Poly {
	const result = Array.from({ length: a.length + b.length - 1 }, () =>
		fraction(0),
	);
	for (let i = 0; i < a.length; i++)
		for (let j = 0; j < b.length; j++)
			result[i + j] = result[i + j]!.add(a[i]!.multiply(b[j]!));
	return trim(result);
}

/** @param a - Dividend. @param b - Nonzero divisor. @returns Quotient and remainder. */
export function divide(a: Poly, b: Poly): [Poly, Poly] {
	const divisor = trim(b);
	if (divisor.at(-1)!.numerator === 0n)
		throw new Error("Zero polynomial denominator.");
	let remainder = trim(a);
	const quotient: Poly = Array.from(
		{ length: Math.max(1, a.length - divisor.length + 1) },
		() => fraction(0),
	);
	while (
		remainder.at(-1)!.numerator !== 0n &&
		remainder.length >= divisor.length
	) {
		const power = remainder.length - divisor.length;
		const coefficient = remainder.at(-1)!.divide(divisor.at(-1)!);
		quotient[power] = coefficient;
		remainder = add(remainder, [
			...Array.from({ length: power }, () => fraction(0)),
			...scale(divisor, coefficient.negate()),
		]);
	}
	return [trim(quotient), remainder];
}

/** @param p - Polynomial. @returns Whether every coefficient is exactly zero. */
export function zero(p: Poly): boolean {
	return p.every((c) => c.numerator === 0n);
}

/** @param factor - Linear or conjugate factor. @returns One copy as a monic polynomial. */
export function factorPoly(factor: LaplaceFactor): Poly {
	const a = fraction(factor.real),
		w = fraction(factor.frequency);
	return w.numerator === 0n
		? [a.negate(), fraction(1)]
		: [
				a.multiply(a).add(w.multiply(w)),
				a.multiply(fraction(-2)),
				fraction(1),
			];
}

/** @param factors - Factored polynomial. @returns Expanded monic polynomial. */
export function expand(factors: LaplaceFactor[]): Poly {
	let result = [fraction(1)];
	for (const factor of factors)
		for (let k = 0; k < factor.multiplicity; k++)
			result = multiply(result, factorPoly(factor));
	return result;
}

/** @param a - Rational expression. @param b - Addend. @returns Exact unreduced sum. */
export function rationalAdd(a: Rational, b: Rational): Rational {
	return {
		n: add(multiply(a.n, b.d), multiply(b.n, a.d)),
		d: multiply(a.d, b.d),
	};
}

/** @param p - Polynomial. @param variable - Display symbol. @returns Exact polynomial LaTeX. */
export function polynomialLatex(p: Poly, variable = "s"): string {
	const terms: string[] = [];
	for (let i = p.length - 1; i >= 0; i--) {
		const c = p[i]!;
		if (!c.numerator) continue;
		const negative = c.numerator < 0n;
		const magnitude = negative ? c.negate() : c;
		const value =
			i > 0 && magnitude.numerator === magnitude.denominator
				? ""
				: magnitude.toLatex();
		terms.push(
			`${negative ? "-" : terms.length ? "+" : ""}${value}${i ? `${variable}${i > 1 ? `^{${i}}` : ""}` : ""}`,
		);
	}
	return terms.join("") || "0";
}

/** @param value - Rational expression. @returns Fraction with explicit polynomial coefficients. */
export function rationalLatex(value: Rational): string {
	if (zero(value.n)) return "0";
	if (
		value.d.length === 1 &&
		value.d[0]!.numerator === value.d[0]!.denominator
	)
		return polynomialLatex(value.n);
	const negative = value.n.at(-1)!.numerator < 0n;
	return `${negative ? "-" : ""}\\frac{${polynomialLatex(negative ? scale(value.n, fraction(-1)) : value.n)}}{${polynomialLatex(value.d)}}`;
}

/** @param rows - Square augmented matrix. @returns Exact unique solution. */
export function solveLinear(rows: Q[][]): Q[] {
	const matrix = rows.map((row) => [...row]);
	for (let col = 0; col < matrix.length; col++) {
		const pivot = matrix.findIndex(
			(row, index) => index >= col && row[col]!.numerator !== 0n,
		);
		if (pivot < 0)
			throw new Error(
				"The decomposition must have an independent coefficient system.",
			);
		[matrix[col], matrix[pivot]] = [matrix[pivot]!, matrix[col]!];
		const divisor = matrix[col]![col]!;
		matrix[col] = matrix[col]!.map((value) => value.divide(divisor));
		for (let row = 0; row < matrix.length; row++)
			if (row !== col) {
				const multiplier = matrix[row]![col]!;
				matrix[row] = matrix[row]!.map((value, index) =>
					value.add(
						matrix[col]![index]!.multiply(multiplier).negate(),
					),
				);
			}
	}
	return matrix.map((row) => row.at(-1)!);
}
