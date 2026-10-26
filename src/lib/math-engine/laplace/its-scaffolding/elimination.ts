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
	/** @param row - Affected equation. @param instruction - Exact operation. @param calculate - Equality-preserving operation. Records a task before changing the working system. */
	function record(
		row: number,
		instruction: string,
		calculate: () => Poly,
	): void {
		const before = systemLatex(rows, labels),
			previous = rows[row]!,
			next = calculate();
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
				`The first coefficient changes from $${previous[0]!.toLatex()}$ to $${next[0]!.toLatex()}$ under this operation. Apply the same arithmetic to the remaining entries; the displayed unknown names stay unchanged.`,
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
			record(
				column,
				`Divide equation ${column + 1} by $${divisor.toLatex()}$.`,
				() => rows[column]!.map((value) => value.divide(divisor)),
			);
		for (let row = 0; row < rows.length; row++) {
			if (row === column) continue;
			const multiplier = rows[row]![column]!;
			if (!multiplier.numerator) continue;
			record(
				row,
				`Subtract $${multiplier.toLatex()}$ times equation ${column + 1} from equation ${row + 1}.`,
				() =>
					rows[row]!.map((value, index) =>
						value.add(
							rows[column]![index]!.multiply(multiplier).negate(),
						),
					),
			);
		}
	}
	return tasks;
}
