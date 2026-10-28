import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { fraction } from "./algebra";
import { entryIssue } from "./input-entry";
import { fractionLatex } from "./pfd";
import type {
	LaplaceConstruction,
	LaplaceConstructionTask,
	LaplaceEntryRow,
} from "./types";
import { verifyLaplaceScalar } from "./verification";

/** Field-keyed diagnostics, cleared whenever rows are edited or removed. */
export type ConstructionFeedback = Record<string, TransformValidationResult>;

/** Exact row counts and draft indices contributing copies. */
type RowGroups = Map<string, { count: number; indices: number[] }>;

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

/** @param task - Independent target. @param draft - Learner classification and gain. @returns Scalar and exceptional-case diagnostics. */
function initialFeedback(
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
		if (task.kind === "template") {
			const checked = verifyLaplaceScalar(draft.gain, target.gain);
			if (checked.status !== "correct") fields.gain = checked;
			return fields;
		}
		try {
			if (entryIssue(draft.gain, { kind: "literal" }))
				throw new Error("gain");
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
	return fields;
}

/** @param task - Independent target. @param draft - Learner rows. @returns All provable errors without revealing missing row counts. */
export function constructionFeedback(
	task: LaplaceConstructionTask,
	draft: LaplaceConstruction,
): ConstructionFeedback {
	const fields = initialFeedback(task, draft),
		target = task.construction;
	if (draft.mode !== "finite") return fields;
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
	const actual: RowGroups = new Map();
	for (const [index, row] of draft.rows.entries()) {
		if (!validateRowFields(row, index, fields)) continue;
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
		if (!expected.has(key)) diagnoseRow(task, row, index, fields);
		const group = actual.get(key) ?? { count: 0, indices: [] };
		group.count +=
			task.kind === "template"
				? 1
				: Number(fraction(row.power).numerator);
		group.indices.push(index);
		actual.set(key, group);
	}
	const allRowsComparable =
		[...actual.values()].reduce(
			(sum, group) => sum + group.indices.length,
			0,
		) === draft.rows.length;
	diagnoseMultiplicities(
		task.kind,
		expected,
		actual,
		fields,
		allRowsComparable,
	);
	return fields;
}

/** @param kind - Construction domain. @param expected - Independent counts. @param actual - Submitted grouped rows. @param fields - Diagnostics receiving count errors. @param allRowsComparable - Whether every draft row contributed a valid comparable entry. */
function diagnoseMultiplicities(
	kind: LaplaceConstructionTask["kind"],
	expected: Map<string, number>,
	actual: RowGroups,
	fields: ConstructionFeedback,
	allRowsComparable: boolean,
): void {
	for (const [key, group] of actual) {
		const count = expected.get(key);
		if (count !== undefined && group.count !== count)
			for (const index of group.indices)
				issue(
					fields,
					`row-${index}-power`,
					kind === "template"
						? "This term duplicates a denominator power; keep one term per required power."
						: "The combined multiplicity at this location does not match its factor copies.",
				);
	}
	// A wrong row may replace a required row; do not imply that adding a row fixes it.
	const expectedCopies = [...expected.values()].reduce(
		(sum, count) => sum + count,
		0,
	);
	const submittedCopies = [...actual.values()].reduce(
		(sum, group) => sum + group.count,
		0,
	);
	if (allRowsComparable && submittedCopies < expectedCopies)
		issue(
			fields,
			"rows",
			"Some required factors, roots, or copies are missing. Recheck the complete polynomial without assuming a row count.",
		);
}

/** @param row - One draft. @param index - Stable index until editing. @param fields - Diagnostics. @returns Whether all required numeric entries can be compared. */
function validateRowFields(
	row: LaplaceEntryRow,
	index: number,
	fields: ConstructionFeedback,
): boolean {
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
				if (entryIssue(value, { kind: "integer", min: 1, max: 4 }))
					throw new Error("power");
				const q = fraction(value);
				if (
					q.denominator !== 1n ||
					q.numerator < 1n ||
					q.numerator > 4n
				)
					throw new Error("power");
			} else {
				if (entryIssue(value, { kind: "literal" }))
					throw new Error("literal");
				numberKey(value);
			}
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
	return valid;
}

/** @param task - Target context. @param row - Numerically valid draft. @param index - Row identity. @param fields - Diagnostics. Reports only uniquely supported diagnoses. */
function diagnoseRow(
	task: LaplaceConstructionTask,
	row: LaplaceEntryRow,
	index: number,
	fields: ConstructionFeedback,
): void {
	const base = location(row),
		target = task.construction;
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
		return;
	}
	const reversed = {
		...row,
		first: fractionLatex(row.first).negate().toLatex(),
	};
	if (target.rows.some((entry) => location(entry) === location(reversed))) {
		issue(
			fields,
			`row-${index}-first`,
			task.kind === "roots"
				? "Check this sign: solving $s+b=0$ requires subtracting $b$."
				: task.kind === "factors"
					? `Check this factor's signed coefficient $${row.first}$. Multiply the submitted factors back out and compare the coefficients with the original polynomial; a factor coefficient is not its root.`
					: "Check the sign in this denominator factor against the verified factorization; its coefficient is not its pole location.",
		);
		return;
	}
	if (
		task.otherConstruction?.rows.some((entry) => location(entry) === base)
	) {
		issue(
			fields,
			`row-${index}-first`,
			"This location belongs to the other polynomial. Recheck numerator versus denominator.",
		);
		return;
	}
	const candidates = target.rows.filter(
		(entry) =>
			entry.kind === row.kind &&
			numberKey(entry.first) === numberKey(row.first),
	);
	if (row.kind === "quadratic" && candidates.length === 1) {
		issue(
			fields,
			`row-${index}-second`,
			"The first coefficient matches a required row; recheck this row's second coefficient or imaginary frequency.",
		);
		return;
	}
	issue(
		fields,
		`row-${index}-first`,
		"This row does not match the requested factor or root set. Check its type and coefficients.",
	);
}
