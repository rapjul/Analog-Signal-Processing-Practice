/**
 * Pure ODE practice filter parsing, normalization, and URL serialization.
 *
 * Implements deterministic domain precedence rules for combining order, characteristic
 * root classification, forcing function shape, leading coefficient, and resonance modes.
 */

import type { ReadonlyURLSearchParams } from "$app/state";
import type {
	ForcingType,
	LeadingCoefficientType,
	OdeOrder,
	ResonanceType,
	SecondOrderRootType,
} from "../math-engine/odes/index";
import { createRandomSeed } from "../math-engine/random";
import type { WithRandom } from "../math-engine/types";
import { parseEnumParam, parseSafeSeedParam } from "./url-params";

/**
 * Filter selections determining problem generation criteria.
 */
export interface OdeFilterSelections {
	/** ODE differential order constraint (1st order, 2nd order, or random) */
	order: WithRandom<OdeOrder>;
	/** Second-order root classification constraint (distinct, repeated, complex, or random) */
	rootType: WithRandom<SecondOrderRootType>;
	/** Forcing function type constraint (constant, exponential, sinusoid, or random) */
	forcingType: WithRandom<ForcingType>;
	/** Leading coefficient type constraint (monic, non-monic, or random) */
	leadingCoefficient: WithRandom<LeadingCoefficientType>;
	/** Resonance mode constraint (none, simple, repeated, or random) */
	resonance: WithRandom<ResonanceType>;
	/** Unsigned 32-bit integer seed for deterministic problem reproducibility */
	seed: number;
}

/**
 * Identifier of the specific UI control that triggered a filter change.
 */
export type OdeFilterChangeSource =
	| "ode-order-select"
	| "root-type-select"
	| "forcing-type-select"
	| "leading-coeff-select"
	| "leading-coefficient-select"
	| "resonance-select";

/** Allowed URL and UI selection values for ODE differential order */
export const ALLOWED_ODE_ORDERS = ["1", "2", "random"] as const;

/** Allowed URL and UI selection values for characteristic root classification */
export const ALLOWED_ODE_ROOT_TYPES = [
	"random",
	"distinct_real",
	"repeated_real",
	"complex_conjugate",
] as const;

/** Allowed URL and UI selection values for forcing function shape */
export const ALLOWED_ODE_FORCING_TYPES = [
	"random",
	"constant",
	"exponential",
	"sinusoid",
] as const;

/** Allowed URL and UI selection values for leading coefficient normalization */
export const ALLOWED_ODE_LEADING_TYPES = [
	"random",
	"monic",
	"non_monic",
] as const;

/** Allowed URL and UI selection values for system resonance modes */
export const ALLOWED_ODE_RESONANCE_TYPES = [
	"random",
	"none",
	"simple",
	"repeated",
] as const;

/**
 * Normalizes filter selections according to domain precedence rules.
 *
 * When `changeSource` is **supplied** (interactive UI edits), the user's latest selection
 * takes precedence and cascades adjustments to dependent filters.
 *
 * When `changeSource` is **undefined** (URL parsing or batch initialization), fixed
 * deterministic precedence resolves conflicts.
 *
 * @param filters - Raw or partially normalized filter selections
 * @param changeSource - Optional control identifier that initiated the change
 * @returns Fully normalized and canonical OdeFilterSelections
 */
export function normalizeOdeFilters(
	filters: OdeFilterSelections,
	changeSource?: OdeFilterChangeSource,
): OdeFilterSelections {
	const next: OdeFilterSelections = {
		order: filters.order,
		rootType: filters.rootType,
		forcingType: filters.forcingType,
		leadingCoefficient: filters.leadingCoefficient,
		resonance: filters.resonance,
		seed: filters.seed >>> 0,
	};

	if (changeSource !== undefined) {
		switch (changeSource) {
			case "ode-order-select": {
				if (next.order === "random") {
					next.rootType = "random";
				} else if (next.order === 1) {
					next.rootType = "random";
					if (next.resonance === "repeated") {
						next.resonance = "simple";
					}
				}
				break;
			}
			case "root-type-select": {
				if (next.rootType !== "random") {
					next.resonance = "none";
					if (next.order === "random") {
						next.order = 2;
					}
				}
				break;
			}
			case "forcing-type-select": {
				if (next.forcingType !== "exponential") {
					next.resonance = "none";
				}
				break;
			}
			case "leading-coeff-select":
			case "leading-coefficient-select": {
				// Leading coefficient is completely orthogonal; no side effects
				break;
			}
			case "resonance-select": {
				if (next.resonance === "simple") {
					next.forcingType = "exponential";
					next.rootType =
						next.order === 2 ? "distinct_real" : "random";
				} else if (next.resonance === "repeated") {
					next.order = 2;
					next.rootType = "repeated_real";
					next.forcingType = "exponential";
				}
				break;
			}
			default: {
				throw new Error(
					`Unhandled ODE filter change source: ${changeSource}`,
				);
			}
		}
	} else {
		// Fixed precedence for URL parsing and headless restoration:
		// 1. First-order constraint
		if (next.order === 1) {
			next.rootType = "random";
			if (next.resonance === "repeated") {
				next.resonance = "simple";
			}
		}

		// 2. Explicit resonance constraints
		if (next.resonance === "repeated") {
			next.order = 2;
			next.rootType = "repeated_real";
			next.forcingType = "exponential";
		} else if (next.resonance === "simple") {
			next.forcingType = "exponential";
			if (next.order === 2 && next.rootType === "random") {
				next.rootType = "distinct_real";
			}
		} else if (next.resonance === "none" || next.resonance === "random") {
			if (
				next.forcingType !== "exponential" &&
				next.forcingType !== "random"
			) {
				next.resonance = "none";
			}
			if (next.rootType !== "random") {
				next.order = 2;
				next.resonance = "none";
			}
		}
	}

	// Invariant safety clamp across all modes
	if (next.order === 1) {
		next.rootType = "random";
		if (next.resonance === "repeated") {
			next.resonance = "simple";
		}
	}
	if (next.forcingType !== "exponential" && next.forcingType !== "random") {
		next.resonance = "none";
	}
	if (next.rootType === "complex_conjugate") {
		next.resonance = "none";
	}
	if (next.rootType !== "random" && next.order === "random") {
		next.order = 2;
	}

	return next;
}

/**
 * Parses query parameters from a URL and converts them into normalized ODE filter selections.
 *
 * Defends against invalid, missing, or malicious query strings by validating each field
 * and resolving conflicting parameters to safe canonical defaults.
 *
 * @param searchParams - URLSearchParams extracted from location or page store
 * @param fallbackSeed - Optional seed to use if none is present in query parameters
 * @returns Fully normalized OdeFilterSelections ready for generation
 */
export function parseOdeFilters(
	searchParams: ReadonlyURLSearchParams,
	fallbackSeed?: number,
): OdeFilterSelections {
	const parsedOrderRaw = parseEnumParam(searchParams, {
		key: "order",
		allowedValues: ALLOWED_ODE_ORDERS,
		fallback: "random",
	}).value;

	const order: WithRandom<OdeOrder> =
		parsedOrderRaw === "random"
			? "random"
			: (Number(parsedOrderRaw) as OdeOrder);

	const rootType = parseEnumParam(searchParams, {
		key: "rootType",
		allowedValues: ALLOWED_ODE_ROOT_TYPES,
		fallback: "random",
	}).value;

	const forcingType = parseEnumParam(searchParams, {
		key: "forcing",
		allowedValues: ALLOWED_ODE_FORCING_TYPES,
		fallback: "random",
	}).value;

	const leadingCoefficient = parseEnumParam(searchParams, {
		key: "leading",
		allowedValues: ALLOWED_ODE_LEADING_TYPES,
		fallback: "random",
	}).value;

	const resonance = parseEnumParam(searchParams, {
		key: "resonance",
		allowedValues: ALLOWED_ODE_RESONANCE_TYPES,
		fallback: "random",
	}).value;

	const seed = parseSafeSeedParam(searchParams, {
		key: "seed",
		fallbackGenerator:
			fallbackSeed !== undefined ? () => fallbackSeed : createRandomSeed,
	}).value;

	const rawSelections: OdeFilterSelections = {
		order,
		rootType,
		forcingType,
		leadingCoefficient,
		resonance,
		seed,
	};

	return normalizeOdeFilters(rawSelections);
}

/**
 * Serializes ODE filter selections into canonical URLSearchParams.
 *
 * @param filters - Active ODE filter selections
 * @returns Canonical URLSearchParams instance
 */
export function serializeOdeFilters(
	filters: OdeFilterSelections,
): URLSearchParams {
	const params = new URLSearchParams();
	params.set("order", String(filters.order));
	params.set("rootType", filters.rootType);
	params.set("forcing", filters.forcingType);
	params.set("leading", filters.leadingCoefficient);
	params.set("resonance", filters.resonance);
	params.set("seed", String(filters.seed >>> 0));
	return params;
}
