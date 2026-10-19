import { formatPolynomial } from "$lib/math-engine/formatting";
import {
	createRandomSeed,
	randomChoice,
	randomInt,
} from "$lib/math-engine/random";
import type {
	ForcingFunction,
	ForcingType,
	OdeGenerationOptions,
	OdeOrder,
	OdeParams,
	OdeProblem,
	ResonanceType,
	SecondOrderRootType,
} from "./types";

/** Resolved generation choices in their original random-draw order. */
export interface GenerationParameters {
	/** Requested or randomly selected ODE order. */
	resolvedOrder: OdeOrder;
	/** Effective exponential resonance mode. */
	resolvedResonance: ResonanceType;
	/** Natural root family for second-order scaffolding. */
	resolvedRootType: SecondOrderRootType;
	/** Effective forcing family. */
	resolvedForcingType: ForcingType;
	/** Original signed leading coefficient. */
	leadingCoefficient: number;
}

/** Seeded random source, passed through without adding draws. */
type RandomSource = () => number;

/** Natural modes used by scaffolding, with absent optional modes omitted. */
interface GenerationRoots {
	/** First real root or real component. */
	r1: number;
	/** Second real root when present. */
	r2?: number;
	/** Positive imaginary component when present. */
	im?: number;
}

/**
 * Retains the original seed coercion and random-seed fallback.
 * @param seed - Requested seed.
 * @returns Unsigned deterministic seed or a newly generated seed.
 */
export function resolveGenerationSeed(seed: number | undefined): number {
	return Number.isFinite(seed)
		? Math.trunc(seed ?? 0) >>> 0
		: createRandomSeed();
}

/**
 * Narrows natural modes to the optional-property contract used by scaffolding.
 * @param ode - Backward-constructed equation.
 * @returns Only the natural modes present in the original generation family.
 */
export function generationRoots(ode: OdeParams): GenerationRoots {
	if (ode.order === 1) return { r1: ode.roots.r1 };
	if (ode.rootType === "complex_conjugate")
		return { r1: ode.roots.r1, im: ode.roots.im! };
	return { r1: ode.roots.r1, r2: ode.roots.r2! };
}

/**
 * Draws original initial conditions after forcing selection.
 * @param order - Effective equation order.
 * @param random - Seeded random source.
 * @returns Initial state with a derivative only for second-order problems.
 */
export function generateInitialConditions(
	order: OdeOrder,
	random: RandomSource,
): OdeProblem["initialConditions"] {
	return order === 2
		? { y0: randomInt(random, -2, 3), dy0: randomInt(random, -4, 3) }
		: { y0: randomInt(random, -2, 3) };
}

/** Characteristic display data and original problem difficulty. */
interface GenerationPresentation {
	/** Characteristic polynomial rendered for the teaching steps. */
	charEqLhs: string;
	/** Original unscaled teaching discriminant. */
	discriminant: number;
	/** Existing problem difficulty classification. */
	difficulty: "easy" | "medium" | "hard";
}

/**
 * Builds teaching metadata without affecting random draws or solved responses.
 * @param ode - Original equation coefficients.
 * @param parameters - Effective root and forcing families.
 * @returns Characteristic display and difficulty data.
 */
export function generationPresentation(
	ode: OdeParams,
	parameters: GenerationParameters,
): GenerationPresentation {
	const { a2, a1, a0 } = ode;
	const charEqLhs = formatPolynomial(
		ode.order === 1
			? [{ coeff: a1, symbol: "s" }, { coeff: a0 }]
			: [
					{ coeff: a2, symbol: "s^2" },
					{ coeff: a1, symbol: "s" },
					{ coeff: a0 },
				],
	);
	const discriminant = ode.order === 1 ? 0 : a1 * a1 - 4 * a2 * a0;
	const difficulty =
		parameters.resolvedRootType === "distinct_real" &&
		parameters.resolvedForcingType === "constant"
			? "easy"
			: parameters.resolvedRootType === "complex_conjugate" ||
				  parameters.resolvedForcingType === "sinusoid"
				? "hard"
				: "medium";
	return { charEqLhs, discriminant, difficulty };
}

/**
 * Resolves legacy and random resonance requests using the original draw sequence.
 * @param options - Requested generation options.
 * @param order - Initially selected equation order.
 * @param random - Seeded random source.
 * @returns Effective resonance request.
 */
function resolveResonance(
	options: OdeGenerationOptions,
	order: OdeOrder,
	random: RandomSource,
): ResonanceType {
	const requested = options.resonance ?? "none";
	if (requested === true || requested === "resonant") return "simple";
	if (requested === false || requested === "nonresonant") return "none";
	if (requested !== "random") return requested;
	if (random() >= 0.25) return "none";
	return order === 2 && random() < 0.5 ? "repeated" : "simple";
}

/**
 * Resolves the leading coefficient while preserving nested random draws.
 * @param requested - Requested leading-coefficient mode.
 * @param random - Seeded random source.
 * @returns Finite nonzero original leading coefficient.
 */
function resolveLeading(
	requested: OdeGenerationOptions["leadingCoefficient"],
	random: RandomSource,
): number {
	if (typeof requested === "number") {
		if (!Number.isFinite(requested) || requested === 0)
			throw new Error(
				"leadingCoefficient must be a finite non-zero number",
			);
		return requested;
	}
	if (requested === "monic") return 1;
	if (requested === "non_monic" || requested === "non-monic")
		return randomInt(random, 2, 4);
	return randomChoice(random, [1, randomInt(random, 2, 4)]);
}

/**
 * Resolves order and resonance together, preserving compatibility aliases and draws.
 * @param options - Requested generation options.
 * @param random - Seeded random source.
 * @returns Effective order and resonance after applying explicit constraints.
 */
function resolveOrderAndResonance(
	options: OdeGenerationOptions,
	random: RandomSource,
): Pick<GenerationParameters, "resolvedOrder" | "resolvedResonance"> {
	const requestedOrder = options.order ?? "random";
	let resolvedOrder: OdeOrder =
		requestedOrder === "random"
			? randomChoice(random, [1, 2] as const)
			: requestedOrder;
	let resolvedResonance = resolveResonance(options, resolvedOrder, random);
	if (
		requestedOrder === "random" &&
		options.rootType !== undefined &&
		options.rootType !== "random"
	)
		resolvedOrder = 2;
	if (randomResonanceConflicts(options)) resolvedResonance = "none";
	if (resolvedResonance === "repeated" && requestedOrder === "random")
		resolvedOrder = 2;
	else if (resolvedOrder === 1 && resolvedResonance === "repeated")
		resolvedResonance = "simple";
	return { resolvedOrder, resolvedResonance };
}

/**
 * Determines when a random resonance draw must yield to explicit filters.
 * @param options - Requested generation options.
 * @returns Whether the random resonance conflicts with a concrete selection.
 */
function randomResonanceConflicts(options: OdeGenerationOptions): boolean {
	const concreteRoot =
		options.rootType !== undefined && options.rootType !== "random";
	const concreteNonExponential =
		options.forcingType !== undefined &&
		options.forcingType !== "random" &&
		options.forcingType !== "exponential";
	return (
		options.resonance === "random" &&
		(concreteRoot || concreteNonExponential)
	);
}

/**
 * Resolves generation choices while retaining seeded draw order and aliases.
 * @param options - Requested generation options.
 * @param random - Seeded random source.
 * @returns Resolved generation parameters.
 */
export function resolveGenerationParameters(
	options: OdeGenerationOptions,
	random: RandomSource,
): GenerationParameters {
	const { resolvedOrder, resolvedResonance } = resolveOrderAndResonance(
		options,
		random,
	);
	let resolvedRootType = randomRootType(options, random);
	if (resolvedOrder === 1 || resolvedResonance === "simple")
		resolvedRootType = "distinct_real";
	else if (resolvedResonance === "repeated")
		resolvedRootType = "repeated_real";
	const resolvedForcingType = randomForcingType(
		options,
		resolvedResonance,
		random,
	);
	return {
		resolvedOrder,
		resolvedResonance,
		resolvedRootType,
		resolvedForcingType,
		leadingCoefficient: resolveLeading(options.leadingCoefficient, random),
	};
}

/**
 * Draws a root family even when a later compatibility rule overrides it.
 * @param options - Requested root mode.
 * @param random - Seeded random source.
 * @returns Initially selected root family.
 */
function randomRootType(
	options: OdeGenerationOptions,
	random: RandomSource,
): SecondOrderRootType {
	return options.rootType === undefined || options.rootType === "random"
		? randomChoice(random, [
				"distinct_real",
				"repeated_real",
				"complex_conjugate",
			] as const)
		: options.rootType;
}

/**
 * Draws a forcing family before applying the resonance constraint.
 * @param options - Requested forcing mode.
 * @param resonance - Effective resonance mode.
 * @param random - Seeded random source.
 * @returns Effective forcing family.
 */
function randomForcingType(
	options: OdeGenerationOptions,
	resonance: ResonanceType,
	random: RandomSource,
): ForcingType {
	const selected =
		options.forcingType === undefined || options.forcingType === "random"
			? randomChoice(random, [
					"constant",
					"exponential",
					"sinusoid",
				] as const)
			: options.forcingType;
	return resonance === "none" ? selected : "exponential";
}

/**
 * Constructs an equation backward from natural roots with the original arithmetic order.
 * @param parameters - Resolved generation choices.
 * @param random - Seeded random source.
 * @returns Supplied coefficients and natural modes.
 */
export function generateEquation(
	parameters: GenerationParameters,
	random: RandomSource,
): OdeParams {
	const {
		resolvedOrder,
		resolvedRootType,
		leadingCoefficient: leading,
	} = parameters;
	if (resolvedOrder === 1) {
		const r = -randomInt(random, 1, 6);
		return {
			order: 1,
			a2: 0,
			a1: leading,
			a0: -leading * r,
			roots: { r1: r },
			rootType: "single_real",
		};
	}
	switch (resolvedRootType) {
		case "distinct_real": {
			const r1 = -randomInt(random, 1, 4),
				r2 = -randomInt(random, 5, 8);
			return {
				order: 2,
				a2: leading,
				a1: -leading * (r1 + r2),
				a0: leading * r1 * r2,
				roots: { r1, r2, im: undefined },
				rootType: resolvedRootType,
			};
		}
		case "repeated_real": {
			const r = -randomInt(random, 1, 4);
			return {
				order: 2,
				a2: leading,
				a1: -2 * leading * r,
				a0: leading * r * r,
				roots: { r1: r, r2: r, im: undefined },
				rootType: resolvedRootType,
			};
		}
		case "complex_conjugate": {
			const sigma = -randomInt(random, 1, 3),
				omega = randomInt(random, 2, 5);
			return {
				order: 2,
				a2: leading,
				a1: -2 * leading * sigma,
				a0: leading * (sigma * sigma + omega * omega),
				roots: { r1: sigma, r2: sigma, im: omega },
				rootType: resolvedRootType,
			};
		}
		default:
			throw new Error(`Unhandled root type: ${String(resolvedRootType)}`);
	}
}

/**
 * Selects forcing while preserving amplitude construction and random draws.
 * @param parameters - Resolved forcing and resonance choices.
 * @param ode - Backward-constructed equation.
 * @param random - Seeded random source.
 * @returns Original forcing description and numeric parameters.
 */
export function generateForcing(
	parameters: GenerationParameters,
	ode: OdeParams,
	random: RandomSource,
): ForcingFunction {
	switch (parameters.resolvedForcingType) {
		case "constant": {
			const K = randomInt(random, 1, 6) * ode.a0;
			return { type: "constant", K, latex: `${K}` };
		}
		case "exponential":
			return generateExponential(parameters, ode, random);
		case "sinusoid": {
			const K = randomInt(random, 2, 11),
				omega = randomInt(random, 1, 3);
			return {
				type: "sinusoid",
				K,
				omega,
				latex: String.raw`${K} \cos(${omega}t)`,
			};
		}
		default:
			throw new Error(
				`Unhandled forcing type: ${String(parameters.resolvedForcingType)}`,
			);
	}
}

/**
 * Constructs an exponential with its requested collision multiplicity.
 * @param parameters - Effective resonance choice.
 * @param ode - Constructed coefficients and natural roots.
 * @param random - Seeded random source.
 * @returns Exponential forcing with the original arithmetic grouping.
 */
function generateExponential(
	parameters: GenerationParameters,
	ode: OdeParams,
	random: RandomSource,
): ForcingFunction {
	const p =
		parameters.resolvedResonance === "none"
			? -randomInt(random, 9, 11)
			: ode.roots.r1;
	const target = randomInt(random, 1, 5);
	const polynomial =
		ode.order === 1
			? ode.a1 * p + ode.a0
			: ode.a2 * p * p + ode.a1 * p + ode.a0;
	const derivative = ode.order === 1 ? ode.a1 : 2 * ode.a2 * p + ode.a1;
	const K =
		parameters.resolvedResonance === "none"
			? target * polynomial
			: parameters.resolvedResonance === "simple"
				? target * derivative
				: target * 2 * ode.a2;
	return { type: "exponential", K, p, latex: `${K} e^{${p}t}` };
}
