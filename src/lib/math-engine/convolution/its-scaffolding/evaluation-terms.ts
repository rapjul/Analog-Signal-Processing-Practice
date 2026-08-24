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

/** Builds a concrete polynomial/exponential term when either signal decays. */
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
	const movingFactor =
		moving.kind === "exponential"
			? `${formatConvolutionScalar(moving.amplitude)}e^{-${formatConvolutionScalar(moving.parameter)}(t-${formatConvolutionScalar(moving.shift)})}`
			: "1";
	const fixedFactor =
		fixed.kind === "exponential"
			? formatConvolutionScalar(
					fixed.amplitude * Math.exp(fixed.parameter * fixed.shift),
				)
			: "1";
	const p0 =
		moving.kind === "exponential"
			? `(${fixedFactor})(${movingFactor})(${formatConvolutionScalar(a0)})`
			: `(${fixedFactor})(${formatConvolutionScalar(a0)})(${formatConvolutionScalar(b0)}+${formatConvolutionScalar(b1)}t)`;
	const p1 =
		moving.kind === "exponential"
			? `(${fixedFactor})(${movingFactor})(${formatConvolutionScalar(a1)})`
			: `(${fixedFactor})((${formatConvolutionScalar(a1)})(${formatConvolutionScalar(b0)}+${formatConvolutionScalar(b1)}t)-${formatConvolutionScalar(a0 * b1)})`;
	const p2 =
		moving.kind === "exponential"
			? "0"
			: `(${fixedFactor})(${formatConvolutionScalar(-a1 * b1)})`;
	const fixedPieceLatex =
		fixed.kind === "exponential"
			? sanitizeLatexMath(
					`${formatConvolutionScalar(fixed.amplitude)}e^{-${formatConvolutionScalar(fixed.parameter)}(\\tau-${formatConvolutionScalar(fixed.shift)})}`,
				)
			: linearPieceLatex(fixedCoefficients, String.raw`\tau`);
	const movingPieceLatex =
		moving.kind === "exponential"
			? sanitizeLatexMath(movingFactor)
			: sanitizeLatexMath(
					`${formatConvolutionScalar(b0)}+${formatConvolutionScalar(b1)}(t-\\tau)`,
				);
	const exponential =
		Math.abs(exponentRate) < 1e-12
			? ""
			: `e^{${formatConvolutionScalar(exponentRate)}\\tau}`;
	const integrandLatex = sanitizeLatexMath(
		`(${p0}+(${p1})\\tau+(${p2})\\tau^2)${exponential}`,
	);
	let primitiveBody: string;
	if (Math.abs(exponentRate) < 1e-12) {
		primitiveBody = `(${p0})\\tau+\\frac{(${p1})\\tau^2}{2}+\\frac{(${p2})\\tau^3}{3}`;
	} else {
		const rate = formatConvolutionScalar(exponentRate);
		const q2 = `((${p2})/${rate})`;
		const q1 = `((${p1})-2${q2})/${rate}`;
		const q0 = `((${p0})-${q1})/${rate}`;
		primitiveBody = `e^{${rate}\\tau}(${q0}+(${q1})\\tau+(${q2})\\tau^2)`;
	}
	const primitiveLatex = sanitizeLatexMath(`F(\\tau,t)=${primitiveBody}`);
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

/** Builds exact configured polynomial work for every connected integral term. */
export function buildEvaluationTerms(
	interval: ConvolutionInterval,
	setup: ConvolutionIntegralPathSetup | undefined,
	context: ConvolutionItsBuildContext,
	movingSignal: ConvolutionMovingSignal,
): ConvolutionEvaluationTerm[] {
	const resolved = context.resolvedSignals;
	if (!resolved || !setup?.hasOverlap) return [];
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
			const lowerLatex = boundaries[index] ?? "0";
			const upperLatex = boundaries[index + 1] ?? "0";
			const lower = tryEvaluateLatexAt(lowerLatex, time);
			const upper = tryEvaluateLatexAt(upperLatex, time);
			if (lower === null || upper === null) continue;
			const tau = (lower + upper) / 2;
			const fixedPiece = fixed.pieces.find(
				(piece) => tau > piece.start - 1e-9 && tau < piece.end + 1e-9,
			);
			const movingPoint = time - tau;
			const movingPiece = moving.pieces.find(
				(piece) =>
					movingPoint > piece.start - 1e-9 &&
					movingPoint < piece.end + 1e-9,
			);
			if (fixed.kind !== "exponential" && !fixedPiece) continue;
			if (moving.kind !== "exponential" && !movingPiece) continue;
			terms.push(
				fixed.kind === "exponential" || moving.kind === "exponential"
					? exponentialEvaluationTerm(
							`term-${terms.length + 1}`,
							fixed,
							moving,
							fixedPiece,
							movingPiece,
							lowerLatex,
							upperLatex,
						)
					: polynomialEvaluationTerm(
							`term-${terms.length + 1}`,
							fixedPiece?.coefficients ?? [0, 0],
							movingPiece?.coefficients ?? [0, 0],
							lowerLatex,
							upperLatex,
						),
			);
		}
	}
	return terms;
}
