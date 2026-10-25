import {
	type Poly,
	add,
	divide,
	expand,
	factorPoly,
	fraction,
	multiply,
	polynomialLatex,
	rationalLatex,
	scale,
	solveLinear,
	zero,
} from "./algebra";
import type { LaplaceFactor, LaplaceResponseTerm, RationalSpec } from "./types";

/** Exact reduction and decomposition of a bounded factored rational expression. */
export interface LaplaceDecomposition {
	/** Original expanded numerator. */ originalNumerator: Poly;
	/** Original expanded denominator. */ originalDenominator: Poly;
	/** Reduced numerator. */ numerator: Poly;
	/** Reduced denominator. */ denominator: Poly;
	/** Remaining zeros. */ zeros: LaplaceFactor[];
	/** Remaining poles. */ poles: LaplaceFactor[];
	/** Common factors actually removed. */ canceled: LaplaceFactor[];
	/** Exact constant quotient. */ quotient: string;
	/** PFD slots in canonical factor order. */ slots: PfdSlot[];
	/** Reconstructed exact PFD expression. */ expansion: string;
	/** Unsolved template. */ template: string;
}

/** A single independently checked unknown in the PFD identity. */
export interface PfdSlot {
	/** Stable coefficient label. */ label: string;
	/** Exact value as LaTeX. */ value: string;
	/** Polynomial numerator basis. */ basis: Poly;
	/** Slot denominator. */ denominator: Poly;
	/** Pole factor. */ factor: LaplaceFactor;
	/** Denominator power. */ power: number;
	/** Whether the numerator is s minus the real part. */ cosine: boolean;
}

/** @param factors - Factor list. @returns Combined, validated factor list. */
export function normalizeFactors(factors: LaplaceFactor[]): LaplaceFactor[] {
	if (!Array.isArray(factors) || factors.length > 4)
		throw new Error("Use at most four factors.");
	const result: LaplaceFactor[] = [];
	for (const factor of factors) {
		const real = fraction(factor.real),
			frequency = fraction(factor.frequency);
		if (
			frequency.toNumber() < 0 ||
			!Number.isInteger(factor.multiplicity) ||
			factor.multiplicity < 1 ||
			factor.multiplicity > 4
		)
			throw new Error(
				"Use positive multiplicities through four and nonnegative frequencies.",
			);
		const existing = result.find(
			(entry) =>
				fraction(entry.real).add(real.negate()).numerator === 0n &&
				fraction(entry.frequency).add(frequency.negate()).numerator ===
					0n,
		);
		if (existing) existing.multiplicity += factor.multiplicity;
		else result.push({ ...factor });
	}
	if (
		result.some(
			(factor) =>
				fraction(factor.frequency).numerator !== 0n &&
				factor.multiplicity !== 1,
		) ||
		expand(result).length > 5
	)
		throw new Error(
			"Use degree at most four and nonrepeated complex-conjugate factors.",
		);
	return result;
}

/** @param spec - Exact factored input. @returns Reduced expression and verified coefficient identity. */
export function decompose(spec: RationalSpec): LaplaceDecomposition {
	const originalZeros = normalizeFactors(spec.zeros),
		originalPoles = normalizeFactors(spec.poles);
	const originalNumerator = scale(expand(originalZeros), fraction(spec.gain));
	const originalDenominator = expand(originalPoles);
	let numerator = originalNumerator;
	const poles: LaplaceFactor[] = [],
		canceled: LaplaceFactor[] = [];
	for (const factor of originalPoles) {
		let count = 0;
		for (let i = 0; i < factor.multiplicity; i++) {
			const [quotient, remainder] = divide(numerator, factorPoly(factor));
			if (!zero(remainder)) break;
			numerator = quotient;
			count++;
		}
		if (count) canceled.push({ ...factor, multiplicity: count });
		if (count < factor.multiplicity)
			poles.push({
				...factor,
				multiplicity: factor.multiplicity - count,
			});
	}
	const zeros = zero(numerator)
		? []
		: originalZeros.flatMap((factor) => {
				const removed =
					canceled.find((item) =>
						zero(
							add(
								factorPoly(item),
								scale(factorPoly(factor), fraction(-1)),
							),
						),
					)?.multiplicity ?? 0;
				return factor.multiplicity > removed
					? [
							{
								...factor,
								multiplicity: factor.multiplicity - removed,
							},
						]
					: [];
			});
	const denominator = expand(poles);
	const [quotient, remainder] = divide(numerator, denominator);
	if (quotient.length > 1)
		throw new Error(
			"Polynomial quotients requiring impulse derivatives are deferred. Use numerator degree at most denominator degree.",
		);
	const slots: PfdSlot[] = [];
	for (const factor of poles) {
		let divisor = [fraction(1)];
		for (let power = 1; power <= factor.multiplicity; power++) {
			divisor = multiply(divisor, factorPoly(factor));
			const bases =
				fraction(factor.frequency).numerator === 0n
					? [[fraction(1)]]
					: [
							[fraction(factor.real).negate(), fraction(1)],
							[fraction(1)],
						];
			for (const [index, basis] of bases.entries())
				slots.push({
					label: `C_{${slots.length + 1}}`,
					value: "",
					basis,
					denominator: divisor,
					factor,
					power,
					cosine: bases.length === 2 && index === 0,
				});
		}
	}
	const columns = slots.map((slot) =>
		multiply(divide(denominator, slot.denominator)[0], slot.basis),
	);
	const values = slots.length
		? solveLinear(
				slots.map((_, index) => [
					...columns.map((column) => column[index] ?? fraction(0)),
					remainder[index] ?? fraction(0),
				]),
			)
		: [];
	slots.forEach((slot, index) => {
		slot.value = values[index]!.toLatex();
	});
	let reconstructed = scale(denominator, quotient[0]!);
	for (let i = 0; i < slots.length; i++)
		reconstructed = add(reconstructed, scale(columns[i]!, values[i]!));
	if (!zero(add(reconstructed, scale(numerator, fraction(-1)))))
		throw new Error("PFD reconstruction failed.");
	/** @param solved - Whether to insert verified coefficients. @returns PFD expression. */
	const display = (solved: boolean): string =>
		[
			quotient[0]!.numerator ? quotient[0]!.toLatex() : "",
			...slots.map(
				(slot) =>
					`\\frac{(${solved ? slot.value : slot.label})(${polynomialLatex(slot.basis)})}{${polynomialLatex(slot.denominator)}}`,
			),
		]
			.filter(Boolean)
			.join("+") || "0";
	return {
		originalNumerator,
		originalDenominator,
		numerator,
		denominator,
		zeros,
		poles,
		canceled,
		quotient: quotient[0]!.toLatex(),
		slots,
		expansion: display(true),
		template: display(false),
	};
}

/** @param factors - Genuine poles. @param region - Ordered region index; -1 means rightmost. @returns Valid open ROC bounds. */
export function rocBounds(
	factors: LaplaceFactor[],
	region: number,
): [number, number] {
	const reals = [
		...new Set(factors.map((factor) => fraction(factor.real).toNumber())),
	].sort((a, b) => a - b);
	const index = region === -1 ? reals.length : region;
	if (!Number.isInteger(index) || index < 0 || index > reals.length)
		throw new Error(
			"Select an ROC between adjacent distinct pole real parts.",
		);
	return [reals[index - 1] ?? -Infinity, reals[index] ?? Infinity];
}

/** @param bounds - Convergence bounds. @returns Region LaTeX. */
export function formatRoc(bounds: [number, number]): string {
	const [lower, upper] = bounds;
	return lower === -Infinity
		? upper === Infinity
			? "s\\in\\mathbb C"
			: `\\operatorname{Re}(s)<${upper}`
		: upper === Infinity
			? `\\operatorname{Re}(s)>${lower}`
			: `${lower}<\\operatorname{Re}(s)<${upper}`;
}

/** @param value - Nonnegative integer. @returns Exact small factorial. */
export function factorial(value: number): number {
	let result = 1;
	for (let k = 2; k <= value; k++) result *= k;
	return result;
}

/** @param data - Verified PFD. @param spec - Delay and ROC selection. @returns Structured inverse terms. */
export function inverseTerms(
	data: LaplaceDecomposition,
	spec: RationalSpec,
): LaplaceResponseTerm[] {
	const bounds = rocBounds(data.poles, spec.region);
	const terms: LaplaceResponseTerm[] = [];
	if (fractionLatex(data.quotient).numerator !== 0n)
		terms.push({
			kind: "impulse",
			amplitude: data.quotient,
			rate: "0",
			frequency: "0",
			power: 0,
			delay: spec.delay,
			side: "right",
		});
	for (const slot of data.slots) {
		const value = fractionLatex(slot.value);
		if (!value.numerator) continue;
		const right = fraction(slot.factor.real).toNumber() <= bounds[0];
		const frequency = fraction(slot.factor.frequency);
		const amplitude = value
			.divide(
				frequency.numerator
					? slot.cosine
						? fraction(1)
						: frequency
					: fraction(factorial(slot.power - 1)),
			)
			.multiply(fraction(right ? 1 : -1));
		terms.push({
			kind: frequency.numerator
				? slot.cosine
					? "cosine"
					: "sine"
				: "exponential",
			amplitude: amplitude.toLatex(),
			rate: slot.factor.real,
			frequency: slot.factor.frequency,
			power: frequency.numerator ? 0 : slot.power - 1,
			delay: spec.delay,
			side: right ? "right" : "left",
		});
	}
	return terms;
}

/** @param value - Internal exact coefficient LaTeX or rational literal. @returns Exact fraction. */
export function fractionLatex(value: string) {
	const match = value.match(/^(-?)\\frac\{(\d+)\}\{(\d+)\}$/);
	return fraction(match ? `${match[1]}${match[2]}/${match[3]}` : value);
}

/** @param data - Decomposition. @returns Exact original transform. */
export function originalTransform(data: LaplaceDecomposition): string {
	return rationalLatex({
		n: data.originalNumerator,
		d: data.originalDenominator,
	});
}
