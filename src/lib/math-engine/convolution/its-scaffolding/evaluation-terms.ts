/** Concrete Step 6 integral-evaluation metadata builders. */

import type {
	ConvolutionPolynomialPiece,
	ResolvedConvolutionSignal,
} from "$lib/math-engine/convolution/configuration";
import type {
	ConvolutionEvaluationTerm,
	ConvolutionIntegralPathSetup,
	ConvolutionItsBuildContext,
	ConvolutionMovingSignal,
} from "$lib/math-engine/convolution/its-types";
import type { ConvolutionInterval } from "$lib/math-engine/convolution/types";
import { tryEvaluateLatexAt } from "$lib/math-engine/evaluator";
import { sanitizeLatexMath } from "$lib/math-engine/formatting";
import { toFractionLatex } from "$lib/math-engine/fraction";
import { formatConvolutionScalar } from "./presentation";

/** Returns a representative interior time for active max/min bounds. */
export function representativeTime(interval: ConvolutionInterval): number {
	if (Number.isFinite(interval.min) && Number.isFinite(interval.max))
		return (interval.min + interval.max) / 2;
	if (Number.isFinite(interval.min)) return interval.min + 1;
	if (Number.isFinite(interval.max)) return interval.max - 1;
	return 0;
}

/** Formats one concrete linear polynomial in the requested variable. */
function linearPieceLatex(
	coefficients: [number, number],
	variable: string,
): string {
	const [constant, slope] = coefficients;
	const terms = [
		constant === 0 ? "" : formatConvolutionScalar(constant),
		slope === 0 ? "" : `${formatConvolutionScalar(slope)}${variable}`,
	].filter(Boolean);
	return sanitizeLatexMath(terms.join("+") || "0");
}

/** Builds a concrete polynomial antiderivative and all required substitutions. */
function polynomialEvaluationTerm(
	id: string,
	fixedCoefficients: [number, number],
	movingCoefficients: [number, number],
	lowerLatex: string,
	upperLatex: string,
): ConvolutionEvaluationTerm {
	const [a0, a1] = fixedCoefficients;
	const [b0, b1] = movingCoefficients;
	const fixedPieceLatex = linearPieceLatex(
		fixedCoefficients,
		String.raw`\tau`,
	);
	const movingPieceLatex = sanitizeLatexMath(
		`${formatConvolutionScalar(b0)}+${formatConvolutionScalar(b1)}(t-\\tau)`,
	);
	const p0 = `(${formatConvolutionScalar(a0)})(${formatConvolutionScalar(b0)}+${formatConvolutionScalar(b1)}t)`;
	const p1 = `(${formatConvolutionScalar(a1)})(${formatConvolutionScalar(b0)}+${formatConvolutionScalar(b1)}t)-${formatConvolutionScalar(a0 * b1)}`;
	const p2 = formatConvolutionScalar(-a1 * b1);
	const integrandLatex = sanitizeLatexMath(
		`${p0}+(${p1})\\tau+(${p2})\\tau^2`,
	);
	const primitiveLatex = sanitizeLatexMath(
		`F(\\tau,t)=(${p0})\\tau+\\frac{(${p1})\\tau^2}{2}+\\frac{(${p2})\\tau^3}{3}`,
	);
	const substitute = (bound: string): string =>
		sanitizeLatexMath(
			`(${p0})(${bound})+\\frac{(${p1})(${bound})^2}{2}+\\frac{(${p2})(${bound})^3}{3}`,
		);
	const upperSubstitutionLatex = substitute(upperLatex);
	const lowerSubstitutionLatex = substitute(lowerLatex);
	const differenceLatex = sanitizeLatexMath(
		`(${upperSubstitutionLatex})-(${lowerSubstitutionLatex})`,
	);
	const constantProduct = a1 === 0 && b1 === 0;
	return {
		id,
		fixedPieceLatex,
		movingPieceLatex,
		integrandLatex,
		primitiveLatex,
		lowerLatex,
		upperLatex,
		upperSubstitutionLatex,
		lowerSubstitutionLatex,
		differenceLatex,
		geometry: constantProduct
			? {
					amplitudeProductLatex: formatConvolutionScalar(a0 * b0),
					overlapWidthLatex: sanitizeLatexMath(
						`(${upperLatex})-(${lowerLatex})`,
					),
				}
			: undefined,
	};
}

/**
 * Formats an affine time factor with small rational coefficients.
 * @param coefficients - Constant and time coefficient.
 * @returns Compact polynomial without zero terms.
 */
function timeFactor(coefficients: [number, number]): string {
	return sanitizeLatexMath(
		[
			coefficients[0] === 0 ? "" : toFractionLatex(coefficients[0]),
			coefficients[1] === 0 ? "" : `${toFractionLatex(coefficients[1])}t`,
		]
			.filter(Boolean)
			.join("+") || "0",
	);
}

/**
 * Formats an exponential signal at a specified argument, or its unit prefactor.
 * @param signal - Resolved finite or exponential signal.
 * @param argument - Argument before applying the signal's own translation.
 * @returns Exact exponential factor, or one for a finite signal.
 */
function exponentialFactor(
	signal: ResolvedConvolutionSignal,
	argument: string,
): string {
	if (signal.kind !== "exponential") return "1";
	const amplitude = formatConvolutionScalar(signal.amplitude);
	if (signal.shift === 0 && argument === "0") return amplitude;
	const translated =
		signal.shift === 0
			? argument
			: `${argument}-${formatConvolutionScalar(signal.shift)}`;
	return sanitizeLatexMath(
		`${amplitude}e^{-${formatConvolutionScalar(signal.parameter)}(${translated})}`,
	);
}

/**
 * Formats the actual active signal piece at the specified argument.
 * @param signal - Resolved signal.
 * @param coefficients - Active finite polynomial coefficients.
 * @param argument - Fixed or transformed integration argument.
 * @returns Complete active piece, preserving integration-variable dependence.
 */
function activePieceLatex(
	signal: ResolvedConvolutionSignal,
	coefficients: [number, number],
	argument: string,
): string {
	return signal.kind === "exponential"
		? exponentialFactor(signal, argument)
		: linearPieceLatex(coefficients, `(${argument})`);
}

/**
 * Integrates an affine polynomial times an exponential without expanding zeros.
 * @param prefactor - Exact factor independent of the integration variable.
 * @param coefficients - Constant and output-time terms of the integrand.
 * @param slope - Coefficient of the integration variable.
 * @param rate - Integration-variable exponential rate.
 * @returns Compact antiderivative body.
 */
function exponentialPrimitive(
	prefactor: string,
	coefficients: [number, number],
	slope: number,
	rate: number,
): string {
	if (Math.abs(rate) < 1e-12)
		return `${prefactor}((${timeFactor(coefficients)})\\tau${slope === 0 ? "" : `+(${toFractionLatex(slope / 2)})\\tau^2`})`;
	const q0 = timeFactor([
		coefficients[0] / rate - slope / (rate * rate),
		coefficients[1] / rate,
	]);
	const q1 = slope / rate;
	return `${prefactor}e^{${formatConvolutionScalar(rate)}\\tau}((${q0})${q1 === 0 ? "" : `+(${toFractionLatex(q1)})\\tau`})`;
}

/**
 * Builds compact, symbolic polynomial/exponential work when either signal decays.
 * @param id - Stable integral-term identifier.
 * @param fixed - Signal evaluated at the integration variable.
 * @param moving - Reflected and translated signal.
 * @param fixedPiece - Active finite polynomial piece, when present.
 * @param movingPiece - Active finite moving piece, when present.
 * @param lowerLatex - Verified lower integration limit.
 * @param upperLatex - Verified upper integration limit.
 * @returns Exact displayed factors, primitive, and bound substitutions.
 */
function exponentialEvaluationTerm(
	id: string,
	fixed: ResolvedConvolutionSignal,
	moving: ResolvedConvolutionSignal,
	fixedPiece: ConvolutionPolynomialPiece | undefined,
	movingPiece: ConvolutionPolynomialPiece | undefined,
	lowerLatex: string,
	upperLatex: string,
): ConvolutionEvaluationTerm {
	const fixedRate = fixed.kind === "exponential" ? -fixed.parameter : 0;
	const movingRate = moving.kind === "exponential" ? moving.parameter : 0;
	const exponentRate = fixedRate + movingRate;
	const fixedCoefficients: [number, number] = fixedPiece?.coefficients ?? [
		1, 0,
	];
	const movingCoefficients: [number, number] = movingPiece?.coefficients ?? [
		1, 0,
	];
	const [a0, a1] = fixedCoefficients;
	const [b0, b1] = movingCoefficients;
	const movingFactor = exponentialFactor(moving, "t");
	const fixedFactor = exponentialFactor(fixed, "0");
	const prefactor = `(${fixedFactor})(${movingFactor})`;
	const constantCoefficients: [number, number] =
		moving.kind === "exponential" ? [a0, 0] : [b0, b1];
	const slope = moving.kind === "exponential" ? a1 : -b1;
	const constant = timeFactor(constantCoefficients);
	const fixedPieceLatex = activePieceLatex(
		fixed,
		fixedCoefficients,
		String.raw`\tau`,
	);
	const movingPieceLatex = activePieceLatex(
		moving,
		movingCoefficients,
		String.raw`t-\tau`,
	);
	const exponential =
		Math.abs(exponentRate) < 1e-12
			? ""
			: `e^{${formatConvolutionScalar(exponentRate)}\\tau}`;
	const integrandLatex = sanitizeLatexMath(
		`${prefactor}((${constant})${slope === 0 ? "" : `+(${toFractionLatex(slope)})\\tau`})${exponential}`,
	);
	const primitiveBody = exponentialPrimitive(
		prefactor,
		constantCoefficients,
		slope,
		exponentRate,
	);
	const primitiveLatex = sanitizeLatexMath(`F(\\tau,t)=${primitiveBody}`);
	/** @param bound - Verified limit. @returns Primitive evaluated at that limit. */
	const substitute = (bound: string): string =>
		sanitizeLatexMath(
			primitiveBody.replaceAll(String.raw`\tau`, `(${bound})`),
		);
	const upperSubstitutionLatex = substitute(upperLatex);
	const lowerSubstitutionLatex = substitute(lowerLatex);
	return {
		id,
		fixedPieceLatex,
		movingPieceLatex,
		integrandLatex,
		primitiveLatex,
		lowerLatex,
		upperLatex,
		upperSubstitutionLatex,
		lowerSubstitutionLatex,
		differenceLatex: sanitizeLatexMath(
			`(${upperSubstitutionLatex})-(${lowerSubstitutionLatex})`,
		),
	};
}

/**
 * Finds the finite signal piece active at an interior sample coordinate.
 * @param signal - Resolved signal whose pieces are searched.
 * @param point - Integration or transformed coordinate.
 * @returns Active polynomial piece, if the signal has one.
 */
function activePolynomialPiece(
	signal: ResolvedConvolutionSignal,
	point: number,
): ConvolutionPolynomialPiece | undefined {
	return signal.pieces.find(
		/** @param piece - Candidate finite section. */ (piece) =>
			point > piece.start - 1e-9 && point < piece.end + 1e-9,
	);
}

/**
 * Builds work for one connected integration interval.
 * @param id - Stable term identifier.
 * @param fixed - Fixed signal.
 * @param moving - Reflected and translated signal.
 * @param time - Interior output-time sample.
 * @param lowerLatex - Lower integration limit.
 * @param upperLatex - Upper integration limit.
 * @returns Concrete evaluation work; incomplete metadata throws during construction.
 */
function buildConnectedTerm(
	id: string,
	fixed: ResolvedConvolutionSignal,
	moving: ResolvedConvolutionSignal,
	time: number,
	lowerLatex: string,
	upperLatex: string,
): ConvolutionEvaluationTerm {
	if (typeof lowerLatex !== "string" || typeof upperLatex !== "string")
		throw new Error(
			"Configured convolution requires explicit integration limits.",
		);
	const lower = tryEvaluateLatexAt(lowerLatex, time);
	const upper = tryEvaluateLatexAt(upperLatex, time);
	if (
		lower === null ||
		upper === null ||
		!Number.isFinite(lower) ||
		!Number.isFinite(upper) ||
		lower >= upper
	)
		throw new Error(
			"Configured convolution requires finite ordered integration limits.",
		);
	const tau = (lower + upper) / 2;
	const fixedPiece = activePolynomialPiece(fixed, tau);
	const movingPiece = activePolynomialPiece(moving, time - tau);
	if (
		(fixed.kind !== "exponential" && !fixedPiece) ||
		(moving.kind !== "exponential" && !movingPiece)
	)
		throw new Error(
			"Configured convolution requires an active polynomial piece.",
		);
	if (fixed.kind === "exponential" || moving.kind === "exponential")
		return exponentialEvaluationTerm(
			id,
			fixed,
			moving,
			fixedPiece,
			movingPiece,
			lowerLatex,
			upperLatex,
		);
	return polynomialEvaluationTerm(
		id,
		fixedPiece!.coefficients,
		movingPiece!.coefficients,
		lowerLatex,
		upperLatex,
	);
}

/**
 * Builds exact configured work for every connected integral term.
 * @param interval - Active output interval.
 * @param setup - Verified connected overlap bounds.
 * @param context - Resolved signal and tutoring metadata.
 * @param movingSignal - Learner-selected reflected signal.
 * @returns Concrete per-term evaluation work for the selected path.
 */
export function buildEvaluationTerms(
	interval: ConvolutionInterval,
	setup: ConvolutionIntegralPathSetup | undefined,
	context: ConvolutionItsBuildContext,
	movingSignal: ConvolutionMovingSignal,
): ConvolutionEvaluationTerm[] {
	const resolved = context.resolvedSignals;
	if (!setup)
		throw new Error("Configured convolution requires an overlap setup.");
	if (!setup.hasOverlap) return [];
	const fixed = resolved[movingSignal === "h" ? "x" : "h"];
	const moving = resolved[movingSignal];
	const time = representativeTime(interval);
	const terms: ConvolutionEvaluationTerm[] = [];
	for (const overlap of setup.overlaps) {
		const boundaries = [
			overlap.lowerLatex,
			...overlap.splitPointsLatex,
			overlap.upperLatex,
		];
		for (let index = 0; index < boundaries.length - 1; index += 1) {
			const lowerLatex = boundaries[index]!;
			const upperLatex = boundaries[index + 1]!;
			const term = buildConnectedTerm(
				`term-${terms.length + 1}`,
				fixed,
				moving,
				time,
				lowerLatex,
				upperLatex,
			);
			terms.push(term);
		}
	}
	return terms;
}
