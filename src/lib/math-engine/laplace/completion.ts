import { fraction, type Poly } from "./algebra";
import { decompose } from "./pfd";
import { collectTerms, transformBlocks, zeroDescription } from "./transform";
import type { LaplaceExercise, LaplaceFactor } from "./types";

/** Exact zero characterization for the complete response, independent of block-only zeros. */
export interface CompletionZeros {
	/** Whether locations are known, implicit, identically zero, or depend on different delays. */ kind:
		"finite" | "implicit" | "zero" | "delayed";
	/** Exactly representable factor locations and their multiplicities. */ factors: LaplaceFactor[];
	/** Mathematical description and any limitation of the markers. */ description: string;
}

/** @param value - Nonnegative integer. @returns Exact square root only for a perfect square. */
function integerRoot(value: bigint): bigint | null {
	if (value < 0n) return null;
	if (value < 2n) return value;
	let current = value,
		next = (current + 1n) / 2n;
	while (next < current) {
		current = next;
		next = (current + value / current) / 2n;
	}
	return current * current === value ? current : null;
}

/** @param numerator - Reduced exact polynomial. @returns Supported exact locations, or null when an implicit polynomial is required. */
function rationalLocations(numerator: Poly): LaplaceFactor[] | null {
	if (numerator.length === 1) return [];
	/** @param real - Real coordinate. @param frequency - Conjugate magnitude. @param multiplicity - Copies. @returns Exact rational factor metadata. */
	const factor = (
		real: Poly[number],
		frequency = fraction(0),
		multiplicity = 1,
	): LaplaceFactor => ({
		real: `${real.numerator}/${real.denominator}`,
		frequency: `${frequency.numerator}/${frequency.denominator}`,
		multiplicity,
	});
	if (numerator.length === 2)
		return [factor(numerator[0]!.negate().divide(numerator[1]!))];
	if (numerator.length !== 3) return null;
	const [c, b, a] = numerator;
	const discriminant = b!
		.multiply(b!)
		.add(a!.multiply(c!).multiply(fraction(-4)));
	const n = integerRoot(
		discriminant.numerator < 0n
			? -discriminant.numerator
			: discriminant.numerator,
	);
	const d = integerRoot(discriminant.denominator);
	if (n === null || d === null) return null;
	const center = b!.negate().divide(a!.multiply(fraction(2)));
	const offset = fraction(`${n}/${d}`).divide(a!.multiply(fraction(2)));
	if (!offset.numerator) return [factor(center, fraction(0), 2)];
	if (discriminant.numerator < 0n)
		return [
			factor(center, offset.numerator < 0n ? offset.negate() : offset),
		];
	return [factor(center.add(offset)), factor(center.add(offset.negate()))];
}

/** @param problem - Mathematically verified exercise. @returns Honest complete-response zero information for completion diagrams. */
export function completionZeros(problem: LaplaceExercise): CompletionZeros {
	if (
		problem.spec.workflow === "inverse" ||
		problem.spec.workflow === "roc"
	) {
		const data = decompose(problem.spec.rational);
		return {
			kind: data.numerator.every((value) => !value.numerator)
				? "zero"
				: "finite",
			factors: data.zeros,
			description: zeroDescription(data.numerator),
		};
	}
	const terms = collectTerms(problem.terms);
	if (!terms.length)
		return {
			kind: "zero",
			factors: [],
			description: "Identically zero; no discrete zero list.",
		};
	const blocks = transformBlocks(terms).filter((block) =>
		block.data.numerator.some((value) => value.numerator !== 0n),
	);
	if (blocks.length > 1)
		return {
			kind: "delayed",
			factors: [],
			description:
				"The complete response contains different delay factors. Its zeros are not a finite polynomial-root list; zero locations are not plotted. An empty marker list does not mean there are no zeros.",
		};
	if (!blocks.length)
		return {
			kind: "zero",
			factors: [],
			description: "Identically zero; no discrete zero list.",
		};
	const numerator = blocks[0]!.data.numerator;
	const factors = rationalLocations(numerator);
	return {
		kind: factors === null ? "implicit" : "finite",
		factors: factors ?? [],
		description:
			factors === null
				? `${zeroDescription(numerator)}. This exact polynomial or formula defines the zeros; their locations are not plotted.`
				: `${zeroDescription(numerator)}. Markers show the zeros of the combined rational response, with multiplicities.`,
	};
}
