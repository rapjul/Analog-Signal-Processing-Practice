import type { ExactFraction } from "$lib/math-engine/exact-fraction";
import { factorPoly, fraction, polynomialLatex } from "./algebra";
import type { LaplaceFactor } from "./types";

/** @param parts - Signed additive terms. @returns A sum without zero terms or plus-minus joins. */
export function sumLatex(parts: string[]): string {
	return (
		parts
			.filter((part) => part && part !== "0")
			.map(
				(part, index) =>
					`${index && !part.startsWith("-") ? "+" : ""}${part}`,
			)
			.join("") || "0"
	);
}

/** @param coefficient - Exact multiplier. @param body - Multiplicative expression, or one. @param group - Whether the body is an additive expression. @returns A signed product without redundant unit coefficients. */
export function scaledLatex(
	coefficient: ExactFraction,
	body: string,
	group = false,
): string {
	if (!coefficient.numerator) return "0";
	if (!body || body === "1") return coefficient.toLatex();
	const magnitude =
		coefficient.numerator < 0n ? coefficient.negate() : coefficient;
	const unit = magnitude.numerator === magnitude.denominator;
	return `${coefficient.numerator < 0n ? "-" : ""}${unit ? "" : magnitude.toLatex()}${group && (!unit || coefficient.numerator < 0n) ? `(${body})` : body}`;
}

/** @param delay - Exact shift. @param variable - Time symbol. @returns The additive time argument without outer parentheses. */
export function shiftedTime(delay: string, variable = "t"): string {
	return polynomialLatex([fraction(delay).negate(), fraction(1)], variable);
}

/** @param delay - Exact nonnegative shift. @returns The nontrivial transform multiplier, or an empty product. */
export function delayLatex(delay: string): string {
	const d = fraction(delay);
	return d.numerator ? `e^{${scaledLatex(d.negate(), "s")}}` : "";
}

/** @param body - One constant or rational fraction. @param delay - Exact nonnegative shift. @returns A signed delay product without redundant unit factors. */
export function delayedLatex(body: string, delay: string): string {
	const multiplier = delayLatex(delay);
	if (!multiplier || body === "0") return body;
	const negative = body.startsWith("-");
	const magnitude = negative ? body.slice(1) : body;
	return `${negative ? "-" : ""}${multiplier}${magnitude === "1" ? "" : magnitude}`;
}

/** @param factor - Exact root factor. @returns Its power with grouping only where exponentiation requires it. */
export function factorLatex(factor: LaplaceFactor): string {
	const base = polynomialLatex(factorPoly(factor));
	return factor.multiplicity === 1
		? base
		: `(${base})^{${factor.multiplicity}}`;
}

/** @param factors - Monic factors. @param gain - Exact outside coefficient. @returns A readable product retaining necessary additive grouping. */
export function factorProductLatex(
	factors: LaplaceFactor[],
	gain = "1",
): string {
	const q = fraction(gain);
	if (!q.numerator) return "0";
	const bodies = factors.map((factor) => {
		const body = factorLatex(factor);
		return factor.multiplicity === 1 &&
			(factors.length > 1 || q.numerator !== q.denominator)
			? `(${body})`
			: body;
	});
	return scaledLatex(q, bodies.join("") || "1");
}
