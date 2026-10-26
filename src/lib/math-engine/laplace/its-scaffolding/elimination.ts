import type { Poly } from "$lib/math-engine/laplace/algebra";
import { renderLaplaceFields } from "$lib/math-engine/laplace/answer-entry";
import type { LaplaceFieldTask } from "$lib/math-engine/laplace/types";
import { teaching } from "./teaching";

/** @param rows - Exact augmented rows. @param labels - Consistent unknown names. @returns Current equations for an elimination task. */
function systemLatex(rows: Poly[], labels: string[]): string {
	return `\\begin{aligned}${rows.map((row) => `${labels.map((label, index) => `(${row[index]!.toLatex()})${label}`).join("+")}&=${row.at(-1)!.toLatex()}`).join("\\\\")}\\end{aligned}`;
}

/** @param initial - Independently derived augmented system. @param labels - Canonical coefficient names. @returns Checked rows for every nonidentity Gauss-Jordan operation. */
export function eliminationTasks(
	initial: Poly[],
	labels: string[],
): LaplaceFieldTask[] {
	const rows = initial.map((row) => [...row]),
		tasks: LaplaceFieldTask[] = [];
	let exchanges = "";
	/** @param row - Affected equation. @param source - Source equation for subtraction, or null for division. @param factor - Exact multiplier or divisor. @param column - Current pivot column. Records structured evidence before changing the system. */
	function record(
		row: number,
		source: number | null,
		factor: Poly[number],
		column: number,
	): void {
		const before = systemLatex(rows, labels),
			previous = rows[row]!,
			next = previous.map((value, index) =>
				source === null
					? value.divide(factor)
					: value.add(
							rows[source]![index]!.multiply(factor).negate(),
						),
			);
		const instruction =
			source === null
				? `Divide equation ${row + 1} by $${factor.toLatex()}$.`
				: `Subtract $${factor.toLatex()}$ times equation ${source + 1} from equation ${row + 1}.`;
		const candidates = [
			...Array.from(
				{ length: labels.length - column },
				(_entry, index) => column + 1 + index,
			),
			column,
		];
		const focus =
			candidates.find(
				(index) =>
					next[index]!.add(previous[index]!.negate()).numerator !==
					0n,
			) ?? column;
		const focusLabel =
			focus === labels.length
				? "right-hand constant"
				: `coefficient of $${labels[focus]}$`;
		const calculation =
			source === null
				? `\\frac{${previous[focus]!.toLatex()}}{${factor.toLatex()}}`
				: `(${previous[focus]!.toLatex()})-(${factor.toLatex()})(${rows[source]![focus]!.toLatex()})`;
		const fields = next.map((value, index) => ({
			id: `entry-${index}`,
			label:
				index === labels.length
					? "Right-hand constant"
					: `Coefficient of $${labels[index]}$`,
			target: value.toLatex(),
		}));
		const frame = `${labels.map((label, index) => `({{entry-${index}}})${label}`).join("+")}={{entry-${labels.length}}}`;
		tasks.push({
			id: `matching-operation-${tasks.length}-values`,
			title: `Update equation ${row + 1}`,
			kind: "fields",
			operation: {
				kind: source === null ? "divide" : "subtract",
				row,
				column,
				source,
				factor: factor.toLatex(),
				before: previous.map((value) => value.toLatex()),
				after: next.map((value) => value.toLatex()),
			},
			fields,
			frame,
			answer: renderLaplaceFields(
				frame,
				Object.fromEntries(
					fields.map((field) => [field.id, field.target]),
				),
			),
			prompt: `${exchanges}${instruction} Enter every resulting coefficient and the right-hand constant, including zeros.`,
			formula: before,
			...teaching(
				"An equation stays equivalent when both sides are divided by the same nonzero number, or when a multiple of another equation is subtracted from both sides. Apply the operation to every entry, including the right-hand constant.",
				`${exchanges}${instruction} Work across equation ${row + 1} from its first coefficient through its constant.`,
				`For the ${focusLabel}, $${calculation}=${next[focus]!.toLatex()}$. This entry changes under the current operation. Apply the same arithmetic to every remaining entry, including the right-hand constant.`,
				"Check Equation Row",
			),
			explanation: `${exchanges}${instruction} The checked equation is $${renderLaplaceFields(frame, Object.fromEntries(fields.map((field) => [field.id, field.target])))}$. This replaces equation ${row + 1} while preserving the system's solution.`,
		});
		exchanges = "";
		rows[row] = next;
	}
	for (let column = 0; column < labels.length; column++) {
		const pivot = rows.findIndex(
			(row, index) => index >= column && row[column]!.numerator !== 0n,
		);
		if (pivot < 0)
			throw new Error(
				"The exact coefficient system must have a nonzero pivot.",
			);
		if (pivot !== column) {
			[rows[pivot], rows[column]] = [rows[column]!, rows[pivot]!];
			exchanges += `Exchange equations ${pivot + 1} and ${column + 1} to place a nonzero coefficient in the working position. `;
		}
		const divisor = rows[column]![column]!;
		if (divisor.numerator !== divisor.denominator)
			record(column, null, divisor, column);
		for (let row = 0; row < rows.length; row++) {
			if (row === column) continue;
			const multiplier = rows[row]![column]!;
			if (!multiplier.numerator) continue;
			record(row, column, multiplier, column);
		}
	}
	return tasks;
}
