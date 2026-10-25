import {
	type Poly,
	add,
	expand,
	fraction,
	polynomialLatex,
	rationalLatex,
	scale,
} from "./algebra";
import { formatRoc, normalizeFactors } from "./pfd";
import {
	responseLatex,
	signalFactors,
	signalRational,
	signalTransform,
	validateTerms,
} from "./signals";
import { solveBlock, type TransformBlock } from "./transform";
import type { LaplaceResponseTerm, OdeExercise } from "./types";

/** Exact unilateral solution with independent initial-state and input contributions. */
export interface LaplaceOdeSolution {
	/** Expanded differential operator, ascending order. */ operator: Poly;
	/** Polynomial initial-state contribution before division. */ initialNumerator: Poly;
	/** Unshifted zero-input block followed by forcing blocks. */ blocks: TransformBlock[];
	/** Zero-input response. */ zi: LaplaceResponseTerm[];
	/** Zero-state response. */ zs: LaplaceResponseTerm[];
	/** Exact zero-input transform. */ ziTransform: string;
	/** Exact zero-state transform. */ zsTransform: string;
	/** Exact total transform. */ transform: string;
	/** Response after combining the two contributions. */ response: string;
}

/** @param spec - Bounded initial-value problem. @returns Exact unilateral response. */
export function solveLaplaceOde(spec: OdeExercise): LaplaceOdeSolution {
	const roots = normalizeFactors(spec.roots),
		leading = fraction(spec.leading),
		monic = expand(roots);
	if (!leading.numerator || monic.length < 2 || monic.length > 3)
		throw new Error(
			"Use a nonzero leading coefficient and a first- or second-order operator.",
		);
	const terms = validateTerms(spec.terms);
	if (terms.some((term) => term.side !== "right"))
		throw new Error(
			"Unilateral forcing terms must have right-sided support.",
		);
	const y0 = fraction(spec.initial[0]),
		dy0 = fraction(spec.initial[1]);
	const operator = scale(monic, leading);
	const initialNumerator =
		monic.length === 2
			? [operator[1]!.multiply(y0)]
			: [
					operator[2]!.multiply(dy0).add(operator[1]!.multiply(y0)),
					operator[2]!.multiply(y0),
				];
	const ziBlock = solveBlock(
		roots,
		scale(initialNumerator, fraction(1).divide(leading)),
		"0",
	);
	const forced = terms.map((term) => {
		const value = signalRational(term);
		const factors = normalizeFactors([...roots, ...signalFactors(term)]);
		return solveBlock(
			factors,
			scale(value.n, fraction(1).divide(leading)),
			term.delay,
		);
	});
	const zi = ziBlock.terms,
		zs = forced.flatMap((block) => block.terms);
	const ziTransform = rationalLatex({ n: initialNumerator, d: operator });
	const zsTransform =
		terms
			.map(
				(term) =>
					`(${signalTransform(term)})/(${polynomialLatex(operator)})`,
			)
			.join("+") || "0";
	return {
		operator,
		initialNumerator,
		blocks: [ziBlock, ...forced],
		zi,
		zs,
		ziTransform,
		zsTransform,
		transform: `(${ziTransform})+(${zsTransform})`,
		response: responseLatex([...zi, ...zs]),
	};
}
