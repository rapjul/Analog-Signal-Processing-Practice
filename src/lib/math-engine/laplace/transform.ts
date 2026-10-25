import {
	add,
	divide,
	expand,
	fraction,
	multiply,
	type Poly,
	polynomialLatex,
} from "./algebra";
import {
	decompose,
	inverseTerms,
	type LaplaceDecomposition,
	rocBounds,
} from "./pfd";
import {
	commonFactors,
	signalFactors,
	signalRational,
	signalRoc,
} from "./signals";
import type {
	LaplaceFactor,
	LaplaceResponseTerm,
	LaplaceSignalTerm,
	RationalSpec,
} from "./types";

/** One exact rational block, all sharing a delay. */
export interface TransformBlock {
	/** Source factor and delay metadata. */ spec: RationalSpec;
	/** Exact reduction and PFD. */ data: LaplaceDecomposition;
	/** Supported inverse response. */ terms: LaplaceResponseTerm[];
}

/** @param terms - Input signal terms. @returns Exact collection of identical terms. */
export function collectTerms(terms: LaplaceSignalTerm[]): LaplaceSignalTerm[] {
	const result: LaplaceSignalTerm[] = [];
	for (const term of terms) {
		const key = [
			term.kind,
			term.side,
			term.power,
			fraction(term.rate).toLatex(),
			fraction(term.frequency).toLatex(),
			fraction(term.delay).toLatex(),
		].join(":");
		const previous = result.find(
			(item) =>
				[
					item.kind,
					item.side,
					item.power,
					fraction(item.rate).toLatex(),
					fraction(item.frequency).toLatex(),
					fraction(item.delay).toLatex(),
				].join(":") === key,
		);
		if (previous)
			previous.amplitude = fraction(previous.amplitude)
				.add(fraction(term.amplitude))
				.toLatex()
				.replace(/^(-?)\\frac\{(\d+)\}\{(\d+)\}$/, "$1$2/$3");
		else result.push({ ...term });
	}
	return result.filter((term) => fraction(term.amplitude).numerator !== 0n);
}

/** @param factors - Known denominator factors. @param numerator - Exact polynomial. @param delay - Shift. @param lower - Required ROC lower boundary. @returns Solved rational block. */
export function solveBlock(
	factors: LaplaceFactor[],
	numerator: Poly,
	delay: string,
	lower = Infinity,
): TransformBlock {
	const spec: RationalSpec = {
		gain: "1",
		zeros: [],
		poles: factors,
		delay,
		region: -1,
	};
	const data = decompose(spec, numerator);
	if (lower !== Infinity) {
		const reals = [
			...new Set(
				data.poles.map((factor) => fraction(factor.real).toNumber()),
			),
		].sort((a, b) => a - b);
		spec.region = reals.filter((real) => real <= lower).length;
	}
	return { spec, data, terms: inverseTerms(data, spec) };
}

/** @param terms - Collected signal terms. @returns Exact blocks grouped by common delay. */
export function transformBlocks(terms: LaplaceSignalTerm[]): TransformBlock[] {
	const delays = [
		...new Set(terms.map((term) => fraction(term.delay).toLatex())),
	];
	return delays.map((delay) => {
		const group = terms.filter(
			(term) => fraction(term.delay).toLatex() === delay,
		);
		const factors = commonFactors(group.map(signalFactors)),
			denominator = expand(factors);
		let numerator: Poly = [fraction(0)];
		for (const term of group) {
			const value = signalRational(term);
			numerator = add(
				numerator,
				multiply(value.n, divide(denominator, value.d)[0]),
			);
		}
		return solveBlock(
			factors,
			numerator,
			group[0]!.delay,
			signalRoc(group)[0],
		);
	});
}

/** @param numerator - Reduced polynomial. @returns Exact finite-zero characterization. */
export function zeroDescription(numerator: Poly): string {
	if (numerator.length === 1)
		return numerator[0]!.numerator
			? "No finite zeros"
			: "Identically zero; no discrete zero list";
	if (numerator.length === 2)
		return `$s=${numerator[0]!.negate().divide(numerator[1]!).toLatex()}$`;
	if (numerator.length === 3) {
		const [c, b, a] = numerator;
		const discriminant = b!
			.multiply(b!)
			.add(a!.multiply(c!).multiply(fraction(-4)));
		return `$s=\\frac{-(${b!.toLatex()})\\pm\\sqrt{${discriminant.toLatex()}}}{${a!.multiply(fraction(2)).toLatex()}}$`;
	}
	return `The finite solutions of $${polynomialLatex(numerator)}=0$`;
}
