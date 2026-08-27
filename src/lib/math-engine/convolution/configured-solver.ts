import type {
	ConvolutionPolynomialPiece,
	ResolvedConvolutionSelection,
	ResolvedConvolutionSignal,
} from "./configuration";
import type { ConvolutionInterval, ConvolutionResult } from "./types";

type Polynomial = number[];
type AffineBound = [number, number];

const EPSILON = 1e-10;

function trimPolynomial(polynomial: Polynomial): Polynomial {
	const result = polynomial.map((value) =>
		Math.abs(value) < EPSILON ? 0 : value,
	);
	while (result.length > 1 && result.at(-1) === 0) result.pop();
	return result;
}

function addPolynomial(left: Polynomial, right: Polynomial): Polynomial {
	const length = Math.max(left.length, right.length);
	return trimPolynomial(
		Array.from(
			{ length },
			(_, index) => (left[index] ?? 0) + (right[index] ?? 0),
		),
	);
}

function scalePolynomial(polynomial: Polynomial, scale: number): Polynomial {
	return trimPolynomial(polynomial.map((value) => value * scale));
}

function multiplyPolynomial(left: Polynomial, right: Polynomial): Polynomial {
	const result = Array.from(
		{ length: left.length + right.length - 1 },
		() => 0,
	);
	for (const [leftIndex, leftValue] of left.entries()) {
		for (const [rightIndex, rightValue] of right.entries()) {
			const idx = leftIndex + rightIndex;
			result[idx] = (result[idx] ?? 0) + leftValue * rightValue;
		}
	}
	return trimPolynomial(result);
}

function powerPolynomial(polynomial: Polynomial, exponent: number): Polynomial {
	let result: Polynomial = [1];
	for (let index = 0; index < exponent; index += 1)
		result = multiplyPolynomial(result, polynomial);
	return result;
}

function evaluatePolynomial(polynomial: Polynomial, t: number): number {
	return polynomial.reduceRight(
		(value, coefficient) => value * t + coefficient,
		0,
	);
}

function greatestCommonDivisor(left: number, right: number): number {
	let a = Math.abs(left);
	let b = Math.abs(right);
	while (b !== 0) [a, b] = [b, a % b];
	return a;
}

function rationalParts(value: number): [number, number] {
	if (Math.abs(value) < EPSILON) return [0, 1];
	for (let denominator = 1; denominator <= 96; denominator += 1) {
		const numerator = Math.round(value * denominator);
		if (Math.abs(value - numerator / denominator) < 1e-9) {
			const divisor = greatestCommonDivisor(numerator, denominator);
			return [numerator / divisor, denominator / divisor];
		}
	}
	return [Number(value.toFixed(8)), 1];
}

function scalarLatex(value: number, absolute = false): string {
	const [rawNumerator = 0, denominator = 1] = rationalParts(value);
	const numerator = absolute ? Math.abs(rawNumerator) : rawNumerator;
	return denominator === 1
		? String(numerator)
		: `\\frac{${numerator}}{${denominator}}`;
}

function polynomialLatex(polynomial: Polynomial): string {
	const terms: string[] = [];
	for (let power = polynomial.length - 1; power >= 0; power -= 1) {
		const coefficient = polynomial[power] ?? 0;
		if (Math.abs(coefficient) < EPSILON) continue;
		const magnitude = Math.abs(coefficient);
		const variable = power === 0 ? "" : power === 1 ? "t" : `t^{${power}}`;
		const magnitudeLatex =
			variable && Math.abs(magnitude - 1) < EPSILON
				? ""
				: scalarLatex(magnitude, true);
		const body = `${magnitudeLatex}${variable}` || "0";
		terms.push(
			terms.length === 0
				? coefficient < 0
					? `-${body}`
					: body
				: `${coefficient < 0 ? "-" : "+"}${body}`,
		);
	}
	return terms.join("") || "0";
}

function formatShiftedTime(t: number): string {
	if (t === 0) return "t";
	return t > 0 ? `t-${scalarLatex(t)}` : `t+${scalarLatex(-t)}`;
}

function uniqueSorted(values: number[]): number[] {
	return [...values]
		.sort((left, right) => left - right)
		.filter(
			(value, index, sorted) =>
				index === 0 ||
				Math.abs(value - (sorted[index - 1] ?? 0)) > EPSILON,
		);
}

function intervalLabel(min: number, max: number): string {
	if (!Number.isFinite(min)) return `t < ${scalarLatex(max)}`;
	if (!Number.isFinite(max)) return `t \\ge ${scalarLatex(min)}`;
	return `${scalarLatex(min)} \\le t < ${scalarLatex(max)}`;
}

function intervalRanges(boundaries: number[]): Array<[number, number]> {
	if (boundaries.length === 0)
		return [[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]];
	return [
		[Number.NEGATIVE_INFINITY, boundaries[0] ?? 0],
		...boundaries
			.slice(0, -1)
			.map(
				(boundary, index) =>
					[boundary, boundaries[index + 1] ?? boundary] as [
						number,
						number,
					],
			),
		[boundaries.at(-1) ?? 0, Number.POSITIVE_INFINITY],
	];
}

function representativeTime(min: number, max: number): number {
	if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2;
	if (Number.isFinite(min)) return min + 1;
	if (Number.isFinite(max)) return max - 1;
	return 0;
}

function finitePairContribution(
	left: ConvolutionPolynomialPiece,
	right: ConvolutionPolynomialPiece,
	time: number,
): { polynomial: Polynomial; overlaps: boolean } {
	const movingLeft = time - right.end;
	const movingRight = time - right.start;
	const lowerValue = Math.max(left.start, movingLeft);
	const upperValue = Math.min(left.end, movingRight);
	if (!(lowerValue < upperValue)) return { polynomial: [0], overlaps: false };
	const lower: AffineBound =
		left.start >= movingLeft ? [left.start, 0] : [-right.end, 1];
	const upper: AffineBound =
		left.end <= movingRight ? [left.end, 0] : [-right.start, 1];
	const [a0, a1] = left.coefficients;
	const [b0, b1] = right.coefficients;
	const tauCoefficients: Polynomial[] = [
		[a0 * b0, a0 * b1],
		[a1 * b0 - a0 * b1, a1 * b1],
		[-a1 * b1],
	];
	let result: Polynomial = [0];
	for (const [power, coefficient] of tauCoefficients.entries()) {
		const boundDifference = addPolynomial(
			powerPolynomial(upper, power + 1),
			scalePolynomial(powerPolynomial(lower, power + 1), -1),
		);
		result = addPolynomial(
			result,
			scalePolynomial(
				multiplyPolynomial(coefficient, boundDifference),
				1 / (power + 1),
			),
		);
	}
	return { polynomial: result, overlaps: true };
}

function solveFiniteSignals(
	x: ResolvedConvolutionSignal,
	h: ResolvedConvolutionSignal,
): ConvolutionResult {
	const boundaries = uniqueSorted(
		x.breakpoints.flatMap((left) =>
			h.breakpoints.map((right) => left + right),
		),
	);
	const ranges = intervalRanges(boundaries);
	const intervals = ranges.map(([min, max]) => {
		const time = representativeTime(min, max);
		let polynomial: Polynomial = [0];
		let hasGeometricOverlap = false;
		for (const left of x.pieces) {
			for (const right of h.pieces) {
				const contribution = finitePairContribution(left, right, time);
				polynomial = addPolynomial(polynomial, contribution.polynomial);
				hasGeometricOverlap ||= contribution.overlaps;
			}
		}
		polynomial = trimPolynomial(polynomial);
		return {
			labelLatex: intervalLabel(min, max),
			min,
			max,
			exprLatex: polynomialLatex(polynomial),
			hasGeometricOverlap,
			eval: (t: number) => evaluatePolynomial(polynomial, t),
		};
	});
	const evalFn = (t: number): number => {
		const interval = intervals.find(
			(candidate) => t >= candidate.min && t < candidate.max,
		);
		return interval?.eval(t) ?? 0;
	};
	return {
		pairType: `${x.kind}_${h.kind}`,
		intervals,
		eval: evalFn,
		evalX: x.eval,
		evalH: h.eval,
	};
}

interface ExponentialTerm {
	coefficient: number;
	origin: number;
}

function formatExponentialExpression(
	polynomial: Polynomial,
	terms: ExponentialTerm[],
	decayRate: number,
): string {
	const pieces: string[] = [];
	const polynomialText = polynomialLatex(polynomial);
	if (polynomialText !== "0") pieces.push(polynomialText);
	for (const { coefficient, origin } of terms) {
		if (Math.abs(coefficient) < EPSILON) continue;
		const magnitude = Math.abs(coefficient);
		const coefficientText =
			Math.abs(magnitude - 1) < EPSILON
				? ""
				: scalarLatex(magnitude, true);
		const exponent = `e^{-${decayRate}(${formatShiftedTime(origin)})}`;
		const body = `${coefficientText}${exponent}`;
		if (pieces.length === 0)
			pieces.push(coefficient < 0 ? `-${body}` : body);
		else pieces.push(`${coefficient < 0 ? "-" : "+"}${body}`);
	}
	return pieces.join("") || "0";
}

function solveFiniteExponential(
	finite: ResolvedConvolutionSignal,
	exponential: ResolvedConvolutionSignal,
	x: ResolvedConvolutionSignal,
	h: ResolvedConvolutionSignal,
): ConvolutionResult {
	const a = exponential.parameter;
	const exponentialAmplitude = exponential.amplitude;
	const boundaries = uniqueSorted(
		finite.breakpoints.map((point) => point + exponential.shift),
	);
	const ranges = intervalRanges(boundaries);
	const intervals = ranges.map(([min, max]) => {
		const time = representativeTime(min, max);
		const cutoff = time - exponential.shift;
		let polynomial: Polynomial = [0];
		const terms = new Map<number, number>();
		let hasGeometricOverlap = false;
		const addTerm = (origin: number, coefficient: number) =>
			terms.set(origin, (terms.get(origin) ?? 0) + coefficient);
		for (const piece of finite.pieces) {
			if (cutoff <= piece.start) continue;
			hasGeometricOverlap = true;
			const [p0, p1] = piece.coefficients;
			const b1 = p1 / a;
			const b0 = p0 / a - p1 / (a * a);
			const at = (point: number) => b0 + b1 * point;
			if (cutoff < piece.end) {
				polynomial = addPolynomial(polynomial, [
					exponentialAmplitude * (b0 - b1 * exponential.shift),
					exponentialAmplitude * b1,
				]);
				addTerm(
					exponential.shift + piece.start,
					-exponentialAmplitude * at(piece.start),
				);
			} else {
				addTerm(
					exponential.shift + piece.end,
					exponentialAmplitude * at(piece.end),
				);
				addTerm(
					exponential.shift + piece.start,
					-exponentialAmplitude * at(piece.start),
				);
			}
		}
		const exponentialTerms = [...terms.entries()].map(
			([origin, coefficient]) => ({ origin, coefficient }),
		);
		const evalFn = (t: number): number =>
			evaluatePolynomial(polynomial, t) +
			exponentialTerms.reduce(
				(sum, term) =>
					sum + term.coefficient * Math.exp(-a * (t - term.origin)),
				0,
			);
		return {
			labelLatex: intervalLabel(min, max),
			min,
			max,
			exprLatex: formatExponentialExpression(
				polynomial,
				exponentialTerms,
				a,
			),
			hasGeometricOverlap,
			eval: evalFn,
		};
	});
	const evalFn = (t: number): number =>
		intervals
			.find((candidate) => t >= candidate.min && t < candidate.max)
			?.eval(t) ?? 0;
	return {
		pairType: `${x.kind}_${h.kind}`,
		intervals,
		eval: evalFn,
		evalX: x.eval,
		evalH: h.eval,
	};
}

function solveExponentials(
	x: ResolvedConvolutionSignal,
	h: ResolvedConvolutionSignal,
): ConvolutionResult {
	const onset = x.shift + h.shift;
	const coefficient = x.amplitude * h.amplitude;
	const equalRates = Math.abs(x.parameter - h.parameter) < EPSILON;
	const activeExpression = equalRates
		? `${scalarLatex(coefficient)}(${formatShiftedTime(onset)})e^{-${x.parameter}(${formatShiftedTime(onset)})}`
		: `\\frac{${scalarLatex(coefficient)}}{${scalarLatex(h.parameter - x.parameter)}}\\left(e^{-${x.parameter}(${formatShiftedTime(onset)})}-e^{-${h.parameter}(${formatShiftedTime(onset)})}\\right)`;
	const activeEval = (t: number): number => {
		if (t < onset) return 0;
		const elapsed = t - onset;
		return equalRates
			? coefficient * elapsed * Math.exp(-x.parameter * elapsed)
			: (coefficient / (h.parameter - x.parameter)) *
					(Math.exp(-x.parameter * elapsed) -
						Math.exp(-h.parameter * elapsed));
	};
	return {
		pairType: `${x.kind}_${h.kind}`,
		intervals: [
			{
				labelLatex: intervalLabel(Number.NEGATIVE_INFINITY, onset),
				min: Number.NEGATIVE_INFINITY,
				max: onset,
				exprLatex: "0",
				hasGeometricOverlap: false,
				eval: () => 0,
			},
			{
				labelLatex: intervalLabel(onset, Number.POSITIVE_INFINITY),
				min: onset,
				max: Number.POSITIVE_INFINITY,
				exprLatex: activeExpression,
				hasGeometricOverlap: true,
				eval: activeEval,
			},
		],
		eval: activeEval,
		evalX: x.eval,
		evalH: h.eval,
	};
}

export function solveConfiguredConvolution(
	selection: ResolvedConvolutionSelection,
): ConvolutionResult {
	const { x, h } = selection;
	if (x.kind === "exponential" && h.kind === "exponential")
		return solveExponentials(x, h);
	if (x.kind === "exponential") return solveFiniteExponential(h, x, x, h);
	if (h.kind === "exponential") return solveFiniteExponential(x, h, x, h);
	return solveFiniteSignals(x, h);
}
