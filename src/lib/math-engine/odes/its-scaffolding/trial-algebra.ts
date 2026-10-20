/** Structured polynomial/exponential/trigonometric algebra for teaching choices. */
import {
	formatExpTerm,
	formatSignedLinearTerm,
	sanitizeLatexMath,
} from "$lib/math-engine/formatting";
import { toFractionLatex } from "$lib/math-engine/fraction";
import { isOdeRoundoffZero } from "$lib/math-engine/odes/numerics";
import type { OdeItsOption } from "$lib/math-engine/odes/types";

/** One coefficient of an undetermined-constant trial function. */
export interface TrialTerm {
	/** Numeric multiplier of the symbolic coefficient. */
	coefficient: number;
	/** Undetermined coefficient, or the known forcing amplitude. */
	symbol: "K_p" | "A" | "B" | "input";
	/** Polynomial power of time. */
	power: number;
	/** Trigonometric factor; plain terms share the exponential rate. */
	harmonic: "plain" | "cos" | "sin";
}

/**
 * Combines equal basis terms and removes only roundoff-sized cancellations.
 * @param terms - Terms in one shared exponential/frequency basis.
 * @returns Canonical terms in deterministic order.
 */
export function combineTrialTerms(terms: TrialTerm[]): TrialTerm[] {
	const groups = new Map<string, { term: TrialTerm; magnitude: number }>();
	for (const term of terms) {
		const key = `${term.harmonic}:${term.power}:${term.symbol}`;
		const group = groups.get(key) ?? {
			term: { ...term, coefficient: 0 },
			magnitude: 0,
		};
		group.term.coefficient += term.coefficient;
		group.magnitude += Math.abs(term.coefficient);
		groups.set(key, group);
	}
	return [...groups.entries()]
		.sort(
			/** Orders basis keys. @param a - First entry. @param b - Second entry. */ (
				a,
				b,
			) => a[0].localeCompare(b[0]),
		)
		.filter(
			/** Removes numerical zeros. @param entry - Accumulated coefficient. */ ([
				,
				entry,
			]) => !isOdeRoundoffZero(entry.term.coefficient, entry.magnitude),
		)
		.map(
			/** Extracts a term. @param entry - Canonical group. */ ([
				,
				entry,
			]) => entry.term,
		);
}

/**
 * Differentiates a structured trial, including product and chain rules.
 * @param terms - Terms to differentiate.
 * @param rate - Shared exponential rate.
 * @param frequency - Shared angular frequency.
 * @returns Differentiated terms.
 */
export function differentiateTrial(
	terms: TrialTerm[],
	rate: number,
	frequency: number,
): TrialTerm[] {
	const result: TrialTerm[] = [];
	for (const term of terms) {
		if (term.power > 0)
			result.push({
				...term,
				power: term.power - 1,
				coefficient: term.coefficient * term.power,
			});
		if (term.harmonic === "plain")
			result.push({ ...term, coefficient: term.coefficient * rate });
		else
			result.push({
				...term,
				harmonic: term.harmonic === "cos" ? "sin" : "cos",
				coefficient:
					term.coefficient *
					frequency *
					(term.harmonic === "cos" ? -1 : 1),
			});
	}
	return combineTrialTerms(result);
}

/**
 * Formats trial terms using the same coefficients used for equivalence checks.
 * @param terms - Structured expression.
 * @param rate - Exponential rate.
 * @param frequency - Angular frequency.
 * @returns Simplified LaTeX expression.
 */
export function formatTrial(
	terms: TrialTerm[],
	rate = 0,
	frequency = 1,
): string {
	const fragments: string[] = [];
	for (const term of combineTrialTerms(terms)) {
		const time =
			term.power === 0
				? ""
				: term.power === 1
					? "t"
					: `t^{${term.power}}`;
		const basis =
			term.harmonic === "plain"
				? rate === 0
					? ""
					: formatExpTerm(rate)
				: `\\${term.harmonic}(${toFractionLatex(frequency)}t)`;
		const symbol = term.symbol === "input" ? "" : term.symbol;
		fragments.push(
			formatSignedLinearTerm(
				toFractionLatex(term.coefficient),
				`${symbol} ${time} ${basis}`.trim(),
				fragments.length === 0,
			),
		);
	}
	return sanitizeLatexMath(fragments.join(" ")) || "0";
}

/**
 * Describes a function by its independent basis coefficients.
 * @param terms - Terms in a common basis.
 * @param equations - Whether to normalize each coefficient-matching equation.
 * @returns A coefficient signature, independent of display strings.
 */
export function trialSignature(
	terms: TrialTerm[],
	equations = false,
): Record<string, number> {
	const canonical = combineTrialTerms(terms);
	const scales = new Map<string, number>();
	const result: Record<string, number> = {};
	for (const term of canonical) {
		const row = `${term.harmonic}:${term.power}`;
		if (!scales.has(row)) scales.set(row, equations ? term.coefficient : 1);
		result[`${row}:${term.symbol}`] =
			term.coefficient / (scales.get(row) ?? 1);
	}
	return result;
}

/**
 * Removes equivalent choices, preferring the correct choice on collisions.
 * @param options - Choices with structural coefficient signatures.
 * @returns Mathematically distinct choices with their original identifiers.
 */
export function uniqueOdeOptions(options: OdeItsOption[]): OdeItsOption[] {
	const result: OdeItsOption[] = [];
	for (const option of [...options].sort(
		/** Considers the correct answer first. @param a - First choice. @param b - Second choice. */ (
			a,
			b,
		) => Number(b.isCorrect) - Number(a.isCorrect),
	)) {
		const signature = option.coefficients;
		if (!signature)
			throw new Error("ODE choice requires mathematical coefficients");
		const duplicate = result.some(
			/** Compares coefficients in a common basis. @param other - Existing choice. */ (
				other,
			) => {
				const keys = new Set([
					...Object.keys(signature),
					...Object.keys(other.coefficients ?? {}),
				]);
				return [...keys].every(
					/** Compares a basis coefficient at roundoff precision. @param key - Basis identifier. */ (
						key,
					) => {
						const a = signature[key] ?? 0;
						const b = other.coefficients?.[key] ?? 0;
						return isOdeRoundoffZero(
							a - b,
							Math.abs(a) + Math.abs(b),
						);
					},
				);
			},
		);
		if (!duplicate) result.push(option);
	}
	return result;
}
