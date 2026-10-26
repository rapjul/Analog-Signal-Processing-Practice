import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { fraction } from "./algebra";
import { fractionLatex } from "./pfd";
import type {
	LaplaceConstruction,
	LaplaceConstructionTask,
	LaplaceEntryRow,
} from "./types";

/** Field-keyed diagnostics, cleared whenever rows are edited or removed. */
export type ConstructionFeedback = Record<string, TransformValidationResult>;

/** @param value - Exact draft value. @returns Canonical rational identity. */
function numberKey(value: string): string {
	const q = fractionLatex(value);
	return `${q.numerator}/${q.denominator}`;
}

/** @param row - Factor or root row. @returns Identity independent of multiplicity. */
function location(row: LaplaceEntryRow): string {
	return `${row.kind}:${numberKey(row.first)}:${row.kind === "quadratic" ? numberKey(row.second) : "0"}`;
}

/** @param fields - Diagnostics. @param key - Field identifier. @param message - Issue without an answer. @param invalid - Whether syntax is incomplete. */
function issue(
	fields: ConstructionFeedback,
	key: string,
	message: string,
	invalid = false,
): void {
	fields[key] = { status: invalid ? "invalid" : "incorrect", message };
}

/** @param task - Independent target. @param draft - Learner rows. @returns All provable errors without revealing missing row counts. */
export function constructionFeedback(
	task: LaplaceConstructionTask,
	draft: LaplaceConstruction,
): ConstructionFeedback {
	const fields: ConstructionFeedback = {},
		target = task.construction;
	if (draft.mode !== target.mode)
		issue(
			fields,
			"mode",
			"Check whether the polynomial is zero, a nonzero constant, or has a finite root set.",
		);
	if (draft.mode !== "finite") {
		if (draft.rows.length)
			issue(
				fields,
				"rows",
				"Remove finite rows for this exceptional case.",
			);
		return fields;
	}
	if (task.kind !== "roots") {
		try {
			if (numberKey(draft.gain) !== numberKey(target.gain))
				issue(
					fields,
					"gain",
					"Check the outside gain or constant quotient; every factor row is monic.",
				);
		} catch {
			issue(
				fields,
				"gain",
				"Enter a complete exact gain or quotient, including zero.",
				true,
			);
		}
	}
	const expected = new Map<string, number>();
	for (const row of target.rows) {
		const key =
			location(row) +
			(task.kind === "template" ? `:${row.power}:${row.numerator}` : "");
		expected.set(
			key,
			(expected.get(key) ?? 0) +
				(task.kind === "template" ? 1 : Number(row.power)),
		);
	}
	const actual = new Map<string, { count: number; indices: number[] }>();
	for (const [index, row] of draft.rows.entries()) {
		let valid = true;
		const names: ("first" | "second" | "power")[] =
			row.kind === "quadratic"
				? ["first", "second", "power"]
				: ["first", "power"];
		for (const name of names) {
			try {
				const value = row[name];
				if (!value.trim()) throw new Error("blank");
				if (name === "power") {
					const q = fraction(value);
					if (
						q.denominator !== 1n ||
						q.numerator < 1n ||
						q.numerator > 4n
					)
						throw new Error("power");
				} else numberKey(value);
			} catch {
				valid = false;
				issue(
					fields,
					`row-${index}-${name}`,
					name === "power"
						? "Enter an integer power or multiplicity from one through four."
						: "Enter a complete exact coefficient, including zero.",
					true,
				);
			}
		}
		if (!valid) continue;
		if (
			task.kind === "roots" &&
			row.kind === "quadratic" &&
			fractionLatex(row.second).numerator <= 0n
		) {
			issue(
				fields,
				`row-${index}-second`,
				"A conjugate pair needs a positive imaginary frequency; use a real-root row for zero.",
			);
			continue;
		}
		const base = location(row),
			key =
				base +
				(task.kind === "template"
					? `:${fraction(row.power).numerator}:${row.numerator}`
					: "");
		if (!expected.has(key)) {
			const same = target.rows.find((entry) => location(entry) === base);
			if (same && task.kind === "template") {
				if (
					!target.rows.some(
						(entry) =>
							location(entry) === base &&
							fraction(entry.power).numerator ===
								fraction(row.power).numerator,
					)
				)
					issue(
						fields,
						`row-${index}-power`,
						"This denominator power is not required by the verified factorization.",
					);
				if (same.numerator !== row.numerator)
					issue(
						fields,
						`row-${index}-numerator`,
						"Use a numerator degree below the base factor's degree.",
					);
			} else {
				const reversed = {
					...row,
					first: fractionLatex(row.first).negate().toLatex(),
				};
				const wrongSource = task.otherConstruction?.rows.some(
					(entry) => location(entry) === base,
				);
				issue(
					fields,
					`row-${index}-first`,
					target.rows.some(
						(entry) => location(entry) === location(reversed),
					)
						? "Check this sign: solving s+b=0 requires subtracting b."
						: wrongSource
							? "This location belongs to the other polynomial. Recheck numerator versus denominator."
							: "This row does not match the requested factor or root set. Check its type and coefficients.",
				);
			}
		}
		const group = actual.get(key) ?? { count: 0, indices: [] };
		group.count +=
			task.kind === "template"
				? 1
				: Number(fraction(row.power).numerator);
		group.indices.push(index);
		actual.set(key, group);
	}
	for (const [key, group] of actual) {
		const count = expected.get(key);
		if (count !== undefined && group.count !== count)
			for (const index of group.indices)
				issue(
					fields,
					`row-${index}-power`,
					task.kind === "template"
						? "This term duplicates a denominator power; keep one term per required power."
						: "The combined multiplicity at this location does not match its factor copies.",
				);
	}
	if (
		[...expected].some(
			([key, count]) => (actual.get(key)?.count ?? 0) < count,
		)
	)
		issue(
			fields,
			"rows",
			"Some required factors, roots, or copies are missing. Recheck the complete polynomial without assuming a row count.",
		);
	return fields;
}
