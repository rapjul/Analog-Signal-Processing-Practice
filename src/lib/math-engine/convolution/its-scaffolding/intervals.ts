/** Step 5 and Step 6 interval metadata builders. */

import type {
	ConvolutionIntegralPathSetup,
	ConvolutionItsBuildContext,
	ConvolutionItsIntervalPart,
	ConvolutionMovingSignal,
	ConvolutionOverlapBounds,
} from "$lib/math-engine/convolution/its-types";
import type {
	ConvolutionInterval,
	ConvolutionSignalSection,
} from "$lib/math-engine/convolution/types";
import { formatConvolutionScalar, formatTranslatedEdge } from "./presentation";

/** Returns a representative interior time for active max/min bounds. */
export function representativeTime(interval: ConvolutionInterval): number {
	if (Number.isFinite(interval.min) && Number.isFinite(interval.max))
		return (interval.min + interval.max) / 2;
	if (Number.isFinite(interval.min)) return interval.min + 1;
	if (Number.isFinite(interval.max)) return interval.max - 1;
	return 0;
}

/** Sorts and deduplicates symbolic split points. */
function uniqueSplitPoints(
	points: Array<{ latex: string; value: number }>,
): Array<{ latex: string; value: number }> {
	const seen = new Set<string>();
	return points
		.sort((left, right) => left.value - right.value)
		.filter(({ latex }) => {
			if (seen.has(latex)) return false;
			seen.add(latex);
			return true;
		});
}

/** Builds one exact path-specific overlap setup from connected sections. */
function buildPathSetup(
	interval: ConvolutionInterval,
	movingSignal: ConvolutionMovingSignal,
	fixedSections: ConvolutionSignalSection[],
	movingSections: ConvolutionSignalSection[],
	fixedBreakpoints: number[],
	movingBreakpoints: number[],
): ConvolutionIntegralPathSetup {
	if (
		interval.hasGeometricOverlap === false ||
		(interval.hasGeometricOverlap === undefined &&
			interval.exprLatex === "0")
	)
		return { hasOverlap: false, overlaps: [], integralLatex: "y(t)=0" };
	const time = representativeTime(interval);
	const fixedInterior = fixedBreakpoints.slice(1, -1);
	const movingInterior = movingBreakpoints.slice(1, -1);
	const overlaps: ConvolutionOverlapBounds[] = [];
	for (const fixed of fixedSections) {
		for (const moving of movingSections) {
			const movingLeftValue = time - moving.end;
			const movingRightValue = time - moving.start;
			const lowerValue = Math.max(fixed.start, movingLeftValue);
			const upperValue = Math.min(fixed.end, movingRightValue);
			if (!(lowerValue < upperValue)) continue;
			const fixedStart = formatConvolutionScalar(fixed.start);
			const fixedEnd = formatConvolutionScalar(fixed.end);
			const movingLeft = formatTranslatedEdge(moving.end);
			const movingRight = formatTranslatedEdge(moving.start);
			const splitPoints = uniqueSplitPoints([
				...fixedInterior
					.filter((point) => point > lowerValue && point < upperValue)
					.map((point) => ({
						latex: formatConvolutionScalar(point),
						value: point,
					})),
				...movingInterior
					.map((point) => ({
						latex: formatTranslatedEdge(point),
						value: time - point,
					}))
					.filter(
						({ value }) => value > lowerValue && value < upperValue,
					),
			]);
			overlaps.push({
				id: `overlap-${overlaps.length + 1}`,
				lowerCandidatesLatex: [fixedStart, movingLeft],
				upperCandidatesLatex: [fixedEnd, movingRight],
				representativeTime: time,
				lowerCandidateValues: [fixed.start, movingLeftValue],
				upperCandidateValues: [fixed.end, movingRightValue],
				lowerLatex:
					fixed.start >= movingLeftValue ? fixedStart : movingLeft,
				upperLatex:
					fixed.end <= movingRightValue ? fixedEnd : movingRight,
				splitPointsLatex: splitPoints.map(({ latex }) => latex),
			});
		}
	}
	const fixedName = movingSignal === "h" ? "x" : "h";
	const terms = overlaps.flatMap((overlap) => {
		const boundaries = [
			overlap.lowerLatex,
			...overlap.splitPointsLatex,
			overlap.upperLatex,
		];
		return boundaries
			.slice(0, -1)
			.map(
				(lower, index) =>
					`\\int_{${lower}}^{${boundaries[index + 1]}}${fixedName}(\\tau)${movingSignal}(t-\\tau)\\,d\\tau`,
			);
	});
	return {
		hasOverlap: overlaps.length > 0,
		overlaps,
		integralLatex:
			overlaps.length > 0 ? `y(t)=${terms.join("+")}` : "y(t)=0",
	};
}

/** Builds one typed Step 5 setup part. */
export function buildSetupPart(
	interval: ConvolutionInterval,
	index: number,
	context: ConvolutionItsBuildContext,
): ConvolutionItsIntervalPart {
	const setupBySignal = {
		h: buildPathSetup(
			interval,
			"h",
			context.xSections,
			context.hSections,
			context.xBreakpoints,
			context.hBreakpoints,
		),
		x: buildPathSetup(
			interval,
			"x",
			context.hSections,
			context.xSections,
			context.hBreakpoints,
			context.xBreakpoints,
		),
	};
	/** Builds progressive hints for one moving path. */
	const hintsFor = (setup: ConvolutionIntegralPathSetup): string[] => {
		if (!setup.hasOverlap)
			return [
				`Work only in the verified interval $${interval.labelLatex}$.`,
				"Compare the fixed and transformed section edges.",
				"The sections do not overlap, so the contribution is $y(t)=0$.",
			];
		const lowerCandidates = setup.overlaps
			.map(({ lowerCandidatesLatex }) => lowerCandidatesLatex.join(","))
			.join(";\\;");
		const upperCandidates = setup.overlaps
			.map(({ upperCandidatesLatex }) => upperCandidatesLatex.join(","))
			.join(";\\;");
		const splitPoints = setup.overlaps.flatMap(
			({ splitPointsLatex }) => splitPointsLatex,
		);
		return [
			`Use the representative interior time $t=${formatConvolutionScalar(representativeTime(interval))}$ for $${interval.labelLatex}$.`,
			`Compare lower candidates $${lowerCandidates}$ and upper candidates $${upperCandidates}$.`,
			splitPoints.length > 0
				? `Split at $${splitPoints.join(",\\;")}$.`
				: `The verified setup is $${setup.integralLatex}$.`,
		];
	};
	const hintsBySignal = {
		h: hintsFor(setupBySignal.h),
		x: hintsFor(setupBySignal.x),
	};
	return {
		id: `setup-${String(index + 1).padStart(2, "0")}`,
		title: `Determine Bounds for Region ${index + 1}`,
		intervalLatex: interval.labelLatex,
		resultLatex:
			interval.integralSetupLatex ?? setupBySignal.h.integralLatex,
		options: [],
		setupBySignal,
		hints: hintsBySignal.h,
		hintsBySignal,
	};
}

/** Builds one typed Step 6 evaluation part. */
export function buildEvaluationPart(
	interval: ConvolutionInterval,
	index: number,
	setupPart?: ConvolutionItsIntervalPart,
): ConvolutionItsIntervalPart {
	const carriedZero =
		interval.exprLatex === "0" && interval.hasGeometricOverlap !== true;
	const primitiveFor = (setup: string): string => {
		if (setup.includes("e^"))
			return String.raw`\int e^{-a\tau}\,d\tau=-\frac{1}{a}e^{-a\tau}`;
		const triangleFactors =
			setup.match(/\\operatorname\{tri\}/g)?.length ?? 0;
		if (triangleFactors >= 2)
			return String.raw`\int(a\tau+b)(c\tau+d)\,d\tau=\frac{ac}{3}\tau^3+\frac{ad+bc}{2}\tau^2+bd\tau`;
		if (
			triangleFactors === 1 ||
			setup.includes(String.raw`1+\frac{\tau}{2}`) ||
			setup.includes(String.raw`1-\frac{\tau}{2}`) ||
			setup.includes(String.raw`1+\frac{t-\tau}{2}`) ||
			setup.includes(String.raw`1-\frac{t-\tau}{2}`)
		)
			return String.raw`\int(a\tau+b)\,d\tau=\frac{a}{2}\tau^2+b\tau`;
		return String.raw`F(\tau)=A_xA_h\tau`;
	};
	const primitiveBySignal = {
		h: primitiveFor(
			interval.integralSetupLatex ??
				setupPart?.setupBySignal?.h.integralLatex ??
				"",
		),
		x: primitiveFor(
			interval.flipXIntegralSetupLatex ??
				setupPart?.setupBySignal?.x.integralLatex ??
				"",
		),
	};
	return {
		id: `interval-${String(index + 1).padStart(2, "0")}`,
		title: `Evaluate Region ${index + 1}`,
		intervalLatex: interval.labelLatex,
		resultLatex: `y(t)=${interval.exprLatex},\\quad ${interval.labelLatex}`,
		options: [],
		carriedZero,
		primitiveLatex: carriedZero ? "0" : primitiveBySignal.h,
		primitiveBySignal: carriedZero ? { h: "0", x: "0" } : primitiveBySignal,
		geometryShortcut: carriedZero
			? undefined
			: "For constant rectangular pieces, the same result is amplitude product times overlap width.",
		hints: [
			`Evaluate only for $${interval.labelLatex}$.`,
			"Use the supplied antiderivative and substitute the verified bounds.",
			interval.hasGeometricOverlap && interval.exprLatex === "0"
				? "The signed contributions cancel to zero."
				: `An equivalent result is $y(t)=${interval.exprLatex}$.`,
		],
	};
}
