import type { ReadonlyURLSearchParams } from "$app/state";
import { createForwardExercise } from "$lib/math-engine/laplace/its-scaffolding/forward";
import { createRationalExercise } from "$lib/math-engine/laplace/its-scaffolding/inverse";
import { createOdeExercise } from "$lib/math-engine/laplace/its-scaffolding/ode";
import { createRocExercise } from "$lib/math-engine/laplace/its-scaffolding/roc";
import { fraction } from "./algebra";
import { entryTarget } from "./input-entry";
import { validateLaplaceTask } from "./task-validation";
import type {
	LaplaceExercise,
	LaplaceExerciseSpec,
	LaplaceFactor,
	OdeExercise,
	RationalExercise,
} from "./types";

/** @param roots - Editable operator factors, possibly incomplete. @returns Exact draft order, or null until all locations are valid literals. */
export function laplaceDraftOrder(roots: LaplaceFactor[]): number | null {
	try {
		return roots.reduce(
			(sum, factor) =>
				sum +
				factor.multiplicity *
					(fraction(factor.frequency).numerator === 0n ? 1 : 2),
			0,
		);
	} catch {
		return null;
	}
}

/** @param input - Editor draft. @returns A copied configuration with neutral values for hidden, mathematically unused parameters. */
export function normalizeLaplaceConfigurationDraft(
	input: LaplaceExerciseSpec,
): LaplaceExerciseSpec {
	const spec = structuredClone(input);
	if (spec.workflow === "forward" || spec.workflow === "ode") {
		for (const term of spec.terms) {
			if (term.kind === "impulse") {
				term.rate = "0";
				term.frequency = "0";
				term.power = 0;
				term.side = "right";
			} else if (term.kind === "exponential") term.frequency = "0";
			else term.power = 0;
			if (spec.workflow === "ode") term.side = "right";
		}
	}
	if (spec.workflow === "ode" && laplaceDraftOrder(spec.roots) === 1)
		spec.initial[1] = "0";
	return spec;
}

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

/** @param spec - Untrusted rational fields. @returns Whether required rational fields are present. */
function rationalFields(spec: RationalExercise): boolean {
	const rational = spec.rational;
	return Boolean(
		rational &&
		literal(rational.gain) &&
		literal(rational.delay) &&
		factors(rational.zeros) &&
		factors(rational.poles) &&
		Number.isInteger(rational.region) &&
		typeof spec.system === "boolean",
	);
}

/** @param spec - Untrusted initial-value fields. @returns Whether required ODE fields are present. */
function odeFields(spec: OdeExercise): boolean {
	return (
		literal(spec.leading) &&
		factors(spec.roots) &&
		Array.isArray(spec.initial) &&
		spec.initial.length === 2 &&
		spec.initial.every(literal) &&
		terms(spec.terms)
	);
}

/** @param input - Untrusted configuration. @returns Shape-checked generated workflow. */
function buildWorkflow(input: unknown): LaplaceExercise {
	if (!input || typeof input !== "object")
		throw new Error("Supply a structured Laplace configuration.");
	const spec = input as LaplaceExerciseSpec;
	if (!Number.isInteger(spec.seed) || spec.seed < 0 || spec.seed > 0xffffffff)
		throw new Error("Use an unsigned 32-bit integer seed.");
	switch (spec.workflow) {
		case "inverse":
		case "roc": {
			if (!rationalFields(spec))
				throw new Error(
					"Specify exact gain, numerator/denominator factors, delay, and ROC region.",
				);
			return spec.workflow === "inverse"
				? createRationalExercise(spec)
				: createRocExercise(spec);
		}
		case "forward":
			if (!terms(spec.terms))
				throw new Error(
					"Specify one through three complete signal terms.",
				);
			return createForwardExercise(spec);
		case "ode":
			if (!odeFields(spec))
				throw new Error(
					"Specify the operator factors, leading coefficient, two initial-state fields, and forcing terms.",
				);
			return createOdeExercise(spec);
		default:
			throw new Error("Choose inverse, forward, ROC, or ODE practice.");
	}
}

/** @param input - Untrusted custom configuration. @returns Mathematically checked problem, or an explanatory exception. */
export function createLaplaceExercise(input: unknown): LaplaceExercise {
	const result = buildWorkflow(input);
	for (const task of result.stages.flatMap((stage) => stage.tasks)) {
		if (
			!task.prompt.trim() ||
			task.hints.length !== 3 ||
			task.hints.some((hint) => !hint.trim())
		)
			throw new Error(`Missing contextual teaching for task ${task.id}.`);
		const values =
			task.kind === "fields"
				? Object.fromEntries(
						task.fields.map((field) => [
							field.id,
							entryTarget(field.target, field.entry),
						]),
					)
				: {};
		const valid =
			(task.kind !== "choice" || task.choices?.includes(task.answer)) &&
			validateLaplaceTask(
				task,
				task.answer,
				values,
				result.terms,
				"construction" in task ? task.construction : undefined,
			).result.status === "correct";
		if (!valid)
			throw new Error(
				"This configuration exceeds the tutor's exact answer language. Simplify its factors or signal terms before starting.",
			);
	}
	return result;
}

/** @param spec - Accepted configuration. @returns Versioned shareable query parameters. */
export function serializeLaplaceConfiguration(
	spec: LaplaceExerciseSpec,
): URLSearchParams {
	return serializeLaplaceExercise(createLaplaceExercise(spec));
}

/** @param exercise - Already checked exercise from a workflow factory; never an unvalidated draft. @returns Reproducible parameters without rebuilding its task plan. */
export function serializeLaplaceExercise(
	exercise: LaplaceExercise,
): URLSearchParams {
	const spec = exercise.spec;
	return new URLSearchParams({
		v: "1",
		seed: String(spec.seed),
		config: JSON.stringify(spec),
	});
}

/** @param params - URL parameters. @returns Supplied validated configuration, or null for an ordinary visit. */
export function parseLaplaceConfiguration(
	params: ReadonlyURLSearchParams,
): LaplaceExerciseSpec | null {
	return parseLaplaceExercise(params)?.spec ?? null;
}

/** @param params - Untrusted URL parameters. @returns The complete preflight-validated exercise, or null for an ordinary visit. */
export function parseLaplaceExercise(
	params: ReadonlyURLSearchParams,
): LaplaceExercise | null {
	const encoded = params.get("config");
	if (encoded === null) return null;
	if (params.get("v") !== "1" || encoded.length > 16384)
		throw new Error(
			"This shared configuration has an unsupported version or length.",
		);
	try {
		return createLaplaceExercise(JSON.parse(encoded));
	} catch (error) {
		throw new Error(
			`Cannot open this shared problem: ${error instanceof Error ? error.message : "invalid configuration"}`,
		);
	}
}
