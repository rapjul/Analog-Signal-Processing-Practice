/**
 * Generic URL parameter parsing and security sanitization utilities for problem modules.
 *
 * Provides pure, hardened functions for extracting enums, seeds, integers, and boolean flags
 * from URLSearchParams while defending against XSS/script injection, malformed strings,
 * overflow/underflow, and corrupted query inputs.
 */

import type { ReadonlyURLSearchParams } from "$app/state";
import { createRandomSeed } from "../math-engine/random";

/**
 * Result envelope for safe URL parameter parsing with fallback and audit metadata.
 */
export interface SafeParsedParam<T> {
	/** Sanitized, validated value ready for domain consumption */
	value: T;
	/** Flag indicating whether the parsed value was substituted with a default fallback */
	isFallback: boolean;
	/** Raw string extracted from the query parameters prior to normalization, or null if absent */
	rawValue: string | null;
}

/**
 * Configuration options for parsing an enumerated string parameter.
 */
export interface EnumParamOptions<T extends string> {
	/** Query parameter key name */
	key: string;
	/** List or array of permissible enum string values */
	allowedValues: readonly T[];
	/** Fallback default value if parameter is missing, invalid, or malformed */
	fallback: T;
}

/**
 * Configuration options for parsing an unsigned 32-bit integer seed parameter.
 */
export interface SeedParamOptions {
	/** Query parameter key name (defaults to "seed") */
	key?: string;
	/** Optional custom fallback generator function producing an unsigned 32-bit integer */
	fallbackGenerator?: () => number;
}

/**
 * Configuration options for parsing a bounded integer parameter.
 */
export interface IntegerParamOptions {
	/** Query parameter key name */
	key: string;
	/** Minimum permissible integer (inclusive) */
	min?: number;
	/** Maximum permissible integer (inclusive) */
	max?: number;
	/** Fallback default integer value */
	fallback: number;
}

/**
 * Configuration options for parsing a boolean flag parameter.
 */
export interface BooleanParamOptions {
	/** Query parameter key name */
	key: string;
	/** Fallback default boolean value */
	fallback: boolean;
}

/**
 * Pattern matching ASCII and Unicode C0/C1 control characters (category Cc / Control).
 *
 * This is the most comprehensive pattern for control characters across all Unicode versions.
 */
const CONTROL_CHAR_REGEX = /\p{Control}/gu;

/**
 * Sanitizes a raw parameter string by stripping control characters and excessive whitespace.
 *
 * @param raw - Raw string extracted from URLSearchParams or null
 * @returns Trimmed and sanitized string, or empty string if input was null/undefined
 */
export function sanitizeParamString(raw: string | null | undefined): string {
	if (raw === null || raw === undefined) {
		return "";
	}
	// Strip ASCII and Unicode control characters while preserving normal text
	return raw.replace(CONTROL_CHAR_REGEX, "").trim();
}

/**
 * Parses and validates an enumerated parameter against an allowed set of string values.
 *
 * If the query parameter is missing, invalid, contains injection payloads, or does not
 * match one of the allowedValues, the fallback value is returned.
 *
 * @param params - URLSearchParams collection
 * @param options - Enum configuration schema with allowed values and fallback
 * @returns SafeParsedParam containing the validated enum value
 */
export function parseEnumParam<T extends string>(
	params: ReadonlyURLSearchParams,
	options: EnumParamOptions<T>,
): SafeParsedParam<T> {
	const raw = params.get(options.key);
	if (raw === null) {
		return {
			value: options.fallback,
			isFallback: true,
			rawValue: null,
		};
	}

	const sanitized = sanitizeParamString(raw);
	const matched = options.allowedValues.find(
		(allowed) => allowed === sanitized,
	);

	if (matched !== undefined) {
		return {
			value: matched,
			isFallback: false,
			rawValue: raw,
		};
	}

	return {
		value: options.fallback,
		isFallback: true,
		rawValue: raw,
	};
}

/**
 * Parses and validates an unsigned 32-bit integer seed parameter (`0 <= seed <= 0xFFFFFFFF`).
 *
 * Rejects floating point numbers, negative values, non-numeric injection payloads,
 * numbers exceeding 32-bit unsigned boundaries (`4294967295`), and malformed strings.
 *
 * @param params - URLSearchParams collection
 * @param options - Optional seed configuration schema
 * @returns SafeParsedParam containing a valid unsigned 32-bit seed
 */
export function parseSafeSeedParam(
	params: ReadonlyURLSearchParams,
	options?: SeedParamOptions,
): SafeParsedParam<number> {
	const key = options?.key ?? "seed";
	const raw = params.get(key);
	const generateFallback = options?.fallbackGenerator ?? createRandomSeed;

	if (raw === null) {
		return {
			value: generateFallback() >>> 0,
			isFallback: true,
			rawValue: null,
		};
	}

	const sanitized = sanitizeParamString(raw);

	// Validate that the string consists exclusively of 1 to 10 decimal digits (no signs, exponents, or floats)
	if (!/^\d{1,10}$/.test(sanitized)) {
		return {
			value: generateFallback() >>> 0,
			isFallback: true,
			rawValue: raw,
		};
	}

	const parsed = Number(sanitized);

	// Ensure numeric validity within unsigned 32-bit integer limits (0 to 4294967295)
	if (
		!Number.isSafeInteger(parsed) ||
		parsed < 0 ||
		parsed > 0xffff_ffff ||
		!Number.isInteger(parsed)
	) {
		return {
			value: generateFallback() >>> 0,
			isFallback: true,
			rawValue: raw,
		};
	}

	return {
		value: parsed >>> 0,
		isFallback: false,
		rawValue: raw,
	};
}

/**
 * Parses and validates a bounded integer parameter.
 *
 * @param params - URLSearchParams collection
 * @param options - Integer configuration schema with bounds and fallback
 * @returns SafeParsedParam containing the bounded integer
 */
export function parseIntegerParam(
	params: URLSearchParams,
	options: IntegerParamOptions,
): SafeParsedParam<number> {
	const raw = params.get(options.key);
	if (raw === null) {
		return {
			value: options.fallback,
			isFallback: true,
			rawValue: null,
		};
	}

	const sanitized = sanitizeParamString(raw);

	// Validate integer pattern (optional leading minus sign followed by digits)
	if (!/^-?\d+$/.test(sanitized)) {
		return {
			value: options.fallback,
			isFallback: true,
			rawValue: raw,
		};
	}

	const parsed = Number(sanitized);

	if (!Number.isSafeInteger(parsed)) {
		return {
			value: options.fallback,
			isFallback: true,
			rawValue: raw,
		};
	}

	let bounded = parsed;
	if (options.min !== undefined && bounded < options.min) {
		bounded = options.min;
	}
	if (options.max !== undefined && bounded > options.max) {
		bounded = options.max;
	}

	return {
		value: bounded,
		isFallback: bounded !== parsed,
		rawValue: raw,
	};
}

/**
 * Parses and validates a boolean flag parameter ("true" / "false" / "1" / "0").
 *
 * @param params - URLSearchParams collection
 * @param options - Boolean configuration schema with fallback
 * @returns SafeParsedParam containing the parsed boolean
 */
export function parseBooleanParam(
	params: URLSearchParams,
	options: BooleanParamOptions,
): SafeParsedParam<boolean> {
	const raw = params.get(options.key);
	if (raw === null) {
		return {
			value: options.fallback,
			isFallback: true,
			rawValue: null,
		};
	}

	const sanitized = sanitizeParamString(raw).toLowerCase();

	switch (sanitized) {
		case "true":
		case "1":
		case "yes":
		case "on": {
			return {
				value: true,
				isFallback: false,
				rawValue: raw,
			};
		}
		case "false":
		case "0":
		case "no":
		case "off": {
			return {
				value: false,
				isFallback: false,
				rawValue: raw,
			};
		}
		default: {
			return {
				value: options.fallback,
				isFallback: true,
				rawValue: raw,
			};
		}
	}
}
