import { fraction } from "./algebra";
import { normalizeFactors, rocBounds } from "./pfd";
import { commonFactors, signalFactors } from "./signals";
import type { LaplaceFactor, LaplaceResponseTerm } from "./types";
import { laplaceTailOrder } from "./verification";

/** Exact surviving modes and the maximal open convergence region of a signal sum. */
export interface SignalRoc {
	/** Infinite or finite open convergence boundaries. */ bounds: [
		number,
		number,
	];
	/** Poles remaining after same-mode cancellation across delays. */ poles: LaplaceFactor[];
}

/** @param original - Original denominator groups before any block reduction. @param surviving - Poles of the complete response. @returns Only copies removed from the combined response's least common denominator. */
export function totalCanceledFactors(
	original: LaplaceFactor[][],
	surviving: LaplaceFactor[],
): LaplaceFactor[] {
	/** @param factor - Exact root factor. @returns Canonical factor identity independent of literal spelling. */
	const key = (factor: LaplaceFactor) =>
		`${fraction(factor.real).toLatex()}:${fraction(factor.frequency).toLatex()}`;
	const remaining = new Map(
		surviving.map((factor) => [key(factor), factor.multiplicity]),
	);
	const candidates = new Map<string, LaplaceFactor>();
	// Metadata may span more original factors than the reduced fourth-order response.
	for (const group of original)
		for (const factor of normalizeFactors(group)) {
			const previous = candidates.get(key(factor));
			if (!previous || previous.multiplicity < factor.multiplicity)
				candidates.set(key(factor), { ...factor });
		}
	return [...candidates.values()].flatMap((factor) => {
		const removed = factor.multiplicity - (remaining.get(key(factor)) ?? 0);
		return removed > 0 ? [{ ...factor, multiplicity: removed }] : [];
	});
}

/** @param terms - Structured supported response. @returns ROC proved from the two infinite tails, including finite-duration cancellation. */
export function analyzeSignalRoc(terms: LaplaceResponseTerm[]): SignalRoc {
	const groups = new Map<string, LaplaceResponseTerm[]>();
	for (const term of terms) {
		if (term.kind === "impulse") continue;
		const factor = signalFactors(term)[0];
		if (!factor) continue;
		const key = [
			term.side,
			fraction(factor.real).toLatex(),
			fraction(factor.frequency).toLatex(),
		].join(":");
		groups.set(key, [...(groups.get(key) ?? []), term]);
	}
	let lower = -Infinity,
		upper = Infinity;
	const factors: LaplaceFactor[][] = [];
	for (const group of groups.values()) {
		const multiplicity = laplaceTailOrder(group);
		if (!multiplicity) continue;
		const factor = signalFactors(group[0]!)[0]!;
		factors.push([{ ...factor, multiplicity }]);
		const rate = fraction(factor.real).toNumber();
		if (group[0]!.side === "right") lower = Math.max(lower, rate);
		else upper = Math.min(upper, rate);
	}
	if (lower >= upper)
		throw new Error("The signal sum has no common open ROC.");
	const poles = commonFactors(factors);
	rocBounds(poles, -1);
	return { bounds: [lower, upper], poles };
}
