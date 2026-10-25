import { createRationalExercise } from "./its-scaffolding/inverse";
import { createForwardExercise } from "./its-scaffolding/forward";
import { createOdeExercise } from "./its-scaffolding/ode";
import { createRocExercise } from "./its-scaffolding/roc";
import type { LaplaceExercise, LaplaceExerciseSpec } from "./types";

/** @param value - Untrusted scalar. @returns Whether it is a bounded literal string. */
function literal(value: unknown): boolean {
	return typeof value === "string" && value.length > 0 && value.length <= 64;
}

/** @param value - Untrusted factors. @returns Whether factor fields have the expected shape. */
function factors(value: unknown): boolean {
	return (
		Array.isArray(value) &&
		value.length <= 4 &&
		value.every(
			(entry) =>
				entry &&
				literal(entry.real) &&
				literal(entry.frequency) &&
				Number.isInteger(entry.multiplicity),
		)
	);
}

/** @param value - Untrusted terms. @returns Whether every pair has explicit scalar fields. */
function terms(value: unknown): boolean {
	return (
		Array.isArray(value) &&
		value.length > 0 &&
		value.length <= 3 &&
		value.every(
			(entry) =>
				entry &&
				[
					entry.amplitude,
					entry.rate,
					entry.frequency,
					entry.delay,
				].every(literal) &&
				Number.isInteger(entry.power),
		)
	);
}

/** @param input - Untrusted custom configuration. @returns Mathematically checked problem, or an explanatory exception. */
export function createLaplaceExercise(input: unknown): LaplaceExercise {
	if (!input || typeof input !== "object")
		throw new Error("Supply a structured Laplace configuration.");
	const spec = input as LaplaceExerciseSpec;
	if (!Number.isInteger(spec.seed) || spec.seed < 0 || spec.seed > 0xffffffff)
		throw new Error("Use an unsigned 32-bit integer seed.");
	let result: LaplaceExercise;
	switch (spec.workflow) {
		case "inverse":
		case "roc": {
			const rational = spec.rational;
			if (
				!rational ||
				!literal(rational.gain) ||
				!literal(rational.delay) ||
				!factors(rational.zeros) ||
				!factors(rational.poles) ||
				!Number.isInteger(rational.region) ||
				typeof spec.system !== "boolean"
			)
				throw new Error(
					"Specify exact gain, numerator/denominator factors, delay, and ROC region.",
				);
			result =
				spec.workflow === "inverse"
					? createRationalExercise(spec)
					: createRocExercise(spec);
			break;
		}
		case "forward":
			if (!terms(spec.terms))
				throw new Error(
					"Specify one through three complete signal terms.",
				);
			result = createForwardExercise(spec);
			break;
		case "ode":
			if (
				!literal(spec.leading) ||
				!factors(spec.roots) ||
				!Array.isArray(spec.initial) ||
				spec.initial.length !== 2 ||
				!spec.initial.every(literal) ||
				!terms(spec.terms)
			)
				throw new Error(
					"Specify the operator factors, leading coefficient, two initial-state fields, and forcing terms.",
				);
			result = createOdeExercise(spec);
			break;
		default:
			throw new Error("Choose inverse, forward, ROC, or ODE practice.");
	}
	return result;
}

/** @param spec - Accepted configuration. @returns Versioned shareable query parameters. */
export function serializeLaplaceConfiguration(
	spec: LaplaceExerciseSpec,
): URLSearchParams {
	createLaplaceExercise(spec);
	return new URLSearchParams({ v: "1", config: JSON.stringify(spec) });
}

/** @param params - URL parameters. @returns Supplied validated configuration, or null for an ordinary visit. */
export function parseLaplaceConfiguration(
	params: URLSearchParams,
): LaplaceExerciseSpec | null {
	const encoded = params.get("config");
	if (encoded === null) return null;
	if (params.get("v") !== "1" || encoded.length > 16384)
		throw new Error(
			"This shared configuration has an unsupported version or length.",
		);
	try {
		return createLaplaceExercise(JSON.parse(encoded)).spec;
	} catch (error) {
		throw new Error(
			`Cannot open this shared problem: ${error instanceof Error ? error.message : "invalid configuration"}`,
		);
	}
}
