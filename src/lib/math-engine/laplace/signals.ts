import {
	add,
	expand,
	fraction,
	type Rational,
	rationalLatex,
	scale,
} from "./algebra";
import { delayedLatex, scaledLatex, shiftedTime, sumLatex } from "./formatting";
import { factorial, fractionLatex, normalizeFactors } from "./pfd";
import type {
	LaplaceFactor,
	LaplaceResponseTerm,
	LaplaceSignalTerm,
} from "./types";

/** @param term - Standard pair. @returns Its rational part without the delay exponential. */
export function signalRational(term: LaplaceSignalTerm): Rational {
	const a = fraction(term.rate),
		w = fraction(term.frequency),
		amplitude = fractionLatex(term.amplitude);
	if (term.kind === "impulse") return { n: [amplitude], d: [fraction(1)] };
	const gain = amplitude.multiply(fraction(term.side === "left" ? -1 : 1));
	if (term.kind === "exponential")
		return {
			n: [gain.multiply(fraction(factorial(term.power)))],
			d: expand([
				{
					real: term.rate,
					frequency: "0",
					multiplicity: term.power + 1,
				},
			]),
		};
	return {
		n:
			term.kind === "cosine"
				? scale([a.negate(), fraction(1)], gain)
				: [gain.multiply(w)],
		d: expand([
			{ real: term.rate, frequency: term.frequency, multiplicity: 1 },
		]),
	};
}

/** @param term - Standard pair. @returns Its denominator factors. */
export function signalFactors(term: LaplaceSignalTerm): LaplaceFactor[] {
	return term.kind === "impulse" || !fractionLatex(term.amplitude).numerator
		? []
		: [
				{
					real: term.rate,
					frequency:
						term.kind === "exponential" ? "0" : term.frequency,
					multiplicity:
						term.kind === "exponential" ? term.power + 1 : 1,
				},
			];
}

/** @param factors - Denominator factor groups. @returns Least common denominator factors. */
export function commonFactors(factors: LaplaceFactor[][]): LaplaceFactor[] {
	const result: LaplaceFactor[] = [];
	for (const group of factors)
		for (const factor of normalizeFactors(group)) {
			const found = result.find(
				(item) =>
					fraction(item.real).add(fraction(factor.real).negate())
						.numerator === 0n &&
					fraction(item.frequency).add(
						fraction(factor.frequency).negate(),
					).numerator === 0n,
			);
			if (found)
				found.multiplicity = Math.max(
					found.multiplicity,
					factor.multiplicity,
				);
			else result.push({ ...factor });
		}
	return normalizeFactors(result);
}

/** @param term - Signal term. @returns Exact time-domain expression with explicit support. */
export function signalLatex(term: LaplaceSignalTerm): string {
	return formatSignal(term, true);
}

/** @param term - Active ordinary signal. @returns Its amplitude expression without support; impulses remain separate. */
export function signalOrdinaryLatex(term: LaplaceSignalTerm): string {
	if (term.kind === "impulse")
		throw new Error(
			"Keep impulses separate from ordinary interval values.",
		);
	return formatSignal(term, false);
}

/** @param term - Signal parameters. @param supported - Whether to include the step factor. @returns Exact signal notation. */
function formatSignal(term: LaplaceSignalTerm, supported: boolean): string {
	const delay = fraction(term.delay),
		amplitude = fractionLatex(term.amplitude);
	const time = shiftedTime(term.delay);
	if (term.kind === "impulse")
		return scaledLatex(amplitude, `\\delta(${time})`);
	const rate = fraction(term.rate),
		frequency = fraction(term.frequency);
	const polynomial =
		term.kind === "exponential" && term.power
			? `${delay.numerator ? `(${time})` : time}${term.power === 1 ? "" : `^{${term.power}}`}`
			: "";
	const exponential = rate.numerator
		? `e^{${scaledLatex(rate, time, !!delay.numerator)}}`
		: "";
	const trig =
		term.kind === "cosine" || term.kind === "sine"
			? `\\${term.kind === "cosine" ? "cos" : "sin"}(${scaledLatex(frequency, time, !!delay.numerator)})`
			: "";
	const support =
		term.side === "left"
			? `${delay.numerator ? delay.toLatex() : ""}-t`
			: time;
	return scaledLatex(
		amplitude,
		`${polynomial}${exponential}${trig}${supported ? `u(${support})` : ""}` ||
			"1",
	);
}

/** @param terms - Verified terms. @returns Supported sum, with no implicit impulse-step product. */
export function responseLatex(terms: LaplaceResponseTerm[]): string {
	return sumLatex(
		terms
			.filter((term) => fractionLatex(term.amplitude).numerator !== 0n)
			.map(signalLatex),
	);
}

/** @param term - Standard pair. @returns Forward transform including delay. */
export function signalTransform(term: LaplaceSignalTerm): string {
	return delayedLatex(rationalLatex(signalRational(term)), term.delay);
}

/** @param terms - Standard supported terms. @returns Common open convergence region. */
export function signalRoc(terms: LaplaceSignalTerm[]): [number, number] {
	let lower = -Infinity,
		upper = Infinity;
	for (const term of terms)
		if (
			term.kind !== "impulse" &&
			fractionLatex(term.amplitude).numerator
		) {
			const rate = fraction(term.rate).toNumber();
			if (term.side === "right") lower = Math.max(lower, rate);
			else upper = Math.min(upper, rate);
		}
	if (lower >= upper)
		throw new Error("The selected supports have no common ROC.");
	return [lower, upper];
}

/** @param terms - User-supplied standard terms. @returns Validated independent copies. */
export function validateTerms(terms: LaplaceSignalTerm[]): LaplaceSignalTerm[] {
	if (!Array.isArray(terms) || !terms.length || terms.length > 3)
		throw new Error("Use one through three signal terms.");
	for (const term of terms) {
		if (
			!["exponential", "cosine", "sine", "impulse"].includes(term.kind) ||
			!["left", "right"].includes(term.side)
		)
			throw new Error("Choose a supported pair and support direction.");
		for (const literal of [
			term.amplitude,
			term.rate,
			term.frequency,
			term.delay,
		])
			fraction(literal);
		if (
			fraction(term.delay).toNumber() < 0 ||
			fraction(term.frequency).toNumber() < 0 ||
			!Number.isInteger(term.power) ||
			term.power < 0 ||
			term.power > 3
		)
			throw new Error(
				"Use nonnegative delays/frequencies and polynomial powers zero through three.",
			);
		if (
			(term.kind === "sine" || term.kind === "cosine") &&
			(!fraction(term.frequency).numerator || term.power !== 0)
		)
			throw new Error(
				"Sinusoids require a positive frequency and zero polynomial power.",
			);
	}
	commonFactors(terms.map(signalFactors));
	return terms.map((term) => ({ ...term }));
}

/** @param terms - Verified terms. @param t - Time coordinate. @returns Regular response without impulse peaks. */
export function evaluateResponse(
	terms: LaplaceResponseTerm[],
	t: number,
): number {
	let value = 0;
	for (const term of terms) {
		const time = t - fraction(term.delay).toNumber();
		if (
			term.kind === "impulse" ||
			(term.side === "right" ? time < 0 : time > 0)
		)
			continue;
		value +=
			fractionLatex(term.amplitude).toNumber() *
			Math.exp(fraction(term.rate).toNumber() * time) *
			(term.kind === "exponential"
				? time ** term.power
				: term.kind === "cosine"
					? Math.cos(fraction(term.frequency).toNumber() * time)
					: Math.sin(fraction(term.frequency).toNumber() * time));
	}
	return value;
}
