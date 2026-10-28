import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { factorPoly, fraction, polynomialLatex } from "./algebra";
import { scaledLatex, sumLatex } from "./formatting";
import { entryIssue, rationalLiteral } from "./input-entry";
import { fractionLatex } from "./pfd";
import type {
	LaplaceConstruction,
	LaplaceConstructionTask,
	LaplaceEntry,
	LaplaceEntryRow,
	LaplaceFactor,
} from "./types";
import { verifyLaplaceScalar } from "./verification";

/** @returns An empty learner draft without target-dependent row counts. */
export function emptyConstruction(): LaplaceConstruction {
	return { mode: "finite", gain: "", rows: [] };
}

/** @returns A blank row; zero coefficients must be entered explicitly. */
export function emptyRow(): LaplaceEntryRow {
	return {
		kind: "linear",
		first: "",
		second: "",
		power: "",
		numerator: "constant",
	};
}

/** @param factors - Exact factors. @param roots - Whether to represent root locations. @param gain - Polynomial leading coefficient. @param isZero - Identically zero polynomial. @returns Independently derived construction target. */
export function constructionTarget(
	factors: LaplaceFactor[],
	roots: boolean,
	gain = "1",
	isZero = false,
): LaplaceConstruction {
	return {
		mode: isZero ? "zero" : roots && !factors.length ? "none" : "finite",
		gain: rationalLiteral(gain),
		rows: isZero
			? []
			: factors.map((factor) => {
					const poly = factorPoly(factor),
						quadratic = poly.length === 3;
					return {
						kind: quadratic ? "quadratic" : "linear",
						first: rationalLiteral(
							roots
								? factor.real
								: poly[quadratic ? 1 : 0]!.toLatex(),
						),
						second: rationalLiteral(
							roots
								? factor.frequency
								: quadratic
									? poly[0]!.toLatex()
									: "0",
						),
						power: String(factor.multiplicity),
						numerator: quadratic ? "linear" : "constant",
					};
				}),
	};
}

/** @param value - Exact numeric draft. @returns Canonical rational identity. */
function canonical(value: string): string {
	const q = fractionLatex(value);
	return `${q.numerator}/${q.denominator}`;
}

/** @param draft - Numeric row drafts. @param task - Construction context. @returns Unordered exact multiset with combined copies. */
function rowSet(
	draft: LaplaceConstruction,
	task: LaplaceConstructionTask,
): Map<string, number> {
	if (draft.rows.length > 8) throw new Error("Use at most eight rows.");
	const rows = new Map<string, number>();
	for (const row of draft.rows) {
		const entries: [string, LaplaceEntry][] = [
			[row.first, { kind: "literal" }],
			[row.power, { kind: "integer", min: 1, max: 4 }],
		];
		if (row.kind === "quadratic")
			entries.push([row.second, { kind: "literal" }]);
		for (const [value, entry] of entries) {
			const issue = entryIssue(value, entry);
			if (issue) throw new Error(issue.message);
		}
		if (
			!row.first.trim() ||
			!row.power.trim() ||
			(row.kind === "quadratic" && !row.second.trim())
		)
			throw new Error(
				"Complete every coefficient and power in each row, including zero.",
			);
		const power = fraction(row.power);
		if (
			power.denominator !== 1n ||
			power.numerator < 1n ||
			power.numerator > 4n
		)
			throw new Error(
				"Enter an integer power or multiplicity from one through four.",
			);
		if (
			task.kind === "roots" &&
			row.kind === "quadratic" &&
			fraction(row.second).toNumber() <= 0
		)
			throw new Error(
				"A conjugate pair needs a positive imaginary frequency; use a real-root row for zero.",
			);
		const key = `${row.kind}:${canonical(row.first)}:${row.kind === "quadratic" ? canonical(row.second) : "0"}${task.kind === "template" ? `:${power.numerator}:${row.numerator}` : ""}`;
		rows.set(
			key,
			(rows.get(key) ?? 0) +
				(task.kind === "template" ? 1 : Number(power.numerator)),
		);
	}
	return rows;
}

/** @param task - Exact structured target. @param draft - Untrusted learner construction. @returns Exact structural comparison, never sampled equality. */
export function validateConstruction(
	task: LaplaceConstructionTask,
	draft: LaplaceConstruction,
): TransformValidationResult {
	try {
		const target = task.construction;
		if (draft.mode !== target.mode)
			return {
				status: "incorrect",
				message:
					task.kind === "roots"
						? "Distinguish a nonzero constant (no roots) from an identically zero polynomial (every value is a root). Otherwise solve each factor equation."
						: "Check whether this polynomial is identically zero before building its factors.",
			};
		if (draft.mode !== "finite") {
			if (draft.rows.length)
				return {
					status: "incorrect",
					message:
						"Remove finite rows when selecting an exceptional case.",
				};
			return {
				status: "correct",
				message: "The exceptional case is classified correctly.",
			};
		}
		const actual = rowSet(draft, task),
			expected = rowSet(target, task);
		if (task.kind !== "roots") {
			if (task.kind === "template") {
				const checked = verifyLaplaceScalar(draft.gain, target.gain);
				if (checked.status !== "correct") return checked;
			} else {
				const gainIssue = entryIssue(draft.gain, { kind: "literal" });
				if (gainIssue) throw new Error(gainIssue.message);
				if (!draft.gain.trim())
					throw new Error("Enter the outside gain, including one.");
				if (canonical(draft.gain) !== canonical(target.gain))
					return {
						status: "incorrect",
						message:
							"Check the outside gain or constant quotient. Each factor row is monic, so its highest-power coefficient is one.",
					};
			}
		}
		if (
			actual.size !== expected.size ||
			[...expected].some(([key, count]) => actual.get(key) !== count)
		)
			return {
				status: "incorrect",
				message:
					task.kind === "roots"
						? "Set each factor equal to zero: s+b=0 gives s=-b. Check signs, numerator versus denominator, conjugate pairs, and the number of copies."
						: task.kind === "template"
							? "Include one term for every denominator power. Linear factors need constant numerators; irreducible quadratics need linear numerators. Check for missing or duplicate terms."
							: "Check each factor's coefficients and power. Factor completely into real linear factors and irreducible quadratic factors; multiplying your rows must recover the original polynomial.",
			};
		return {
			status: "correct",
			message:
				"Every location, coefficient, and multiplicity is verified exactly.",
		};
	} catch (error) {
		return {
			status: "invalid",
			message:
				error instanceof Error
					? error.message
					: "Enter exact numbers in every required field.",
		};
	}
}

/** @param task - Construction context. @param draft - Current rows. @returns Rendered preview without exposing missing values. */
export function constructionPreview(
	task: LaplaceConstructionTask,
	draft: LaplaceConstruction,
): string {
	if (draft.mode !== "finite")
		return draft.mode === "zero"
			? "\\text{Identically zero}"
			: "\\text{No finite roots}";
	/** @param value - Incomplete literal. @returns Safe exact preview or an empty slot. */
	const slot = (value: string): string =>
		entryIssue(value, { kind: "literal" })
			? "\\square"
			: fraction(value).toLatex();
	const rows = draft.rows.map((row, index) => {
		const a = slot(row.first),
			b = slot(row.second),
			p = slot(row.power);
		if (task.kind === "roots")
			return `${a}${row.kind === "quadratic" ? `\\pm j${b === "1" ? "" : b}` : ""}\\quad\\text{multiplicity }${p}`;
		const complete =
			!entryIssue(row.first, { kind: "literal" }) &&
			(row.kind === "linear" ||
				!entryIssue(row.second, { kind: "literal" }));
		const factor = complete
			? polynomialLatex(
					row.kind === "linear"
						? [fraction(row.first), fraction(1)]
						: [
								fraction(row.second),
								fraction(row.first),
								fraction(1),
							],
				)
			: row.kind === "linear"
				? `s+${a}`
				: `s^2+(${a})s+${b}`;
		const power = p === "1" ? factor : `(${factor})^{${p}}`;
		if (task.kind === "template")
			return `\\frac{${row.numerator === "linear" ? `A_{${index + 1}}s+B_{${index + 1}}` : `C_{${index + 1}}`}}{${power}}`;
		return p === "1" && (draft.rows.length > 1 || draft.gain !== "1")
			? `(${factor})`
			: power;
	});
	const gain =
		task.kind === "template" &&
		verifyLaplaceScalar(draft.gain, draft.gain).status === "correct"
			? draft.gain
			: slot(draft.gain);
	return task.kind === "roots"
		? rows.join(";\\quad ") || "\\square"
		: task.kind === "template"
			? sumLatex([gain, ...rows])
			: gain === "\\square"
				? `\\square${rows.join("")}`
				: scaledLatex(fraction(draft.gain), rows.join("") || "1");
}
