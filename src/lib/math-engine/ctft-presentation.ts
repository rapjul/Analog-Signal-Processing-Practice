/** Read-only display helpers; these never establish mathematical correctness. */
import { factorAt, scalar } from "./canonical-algebra";
import { normalizeCanonicalTransform } from "./canonical-transform";
import type { CtftLessonPart } from "./ctft-lesson";
import { normalizeMathLatex, parseStrictLatex } from "./evaluator";
import { normalizeTransformNotation } from "./transform-notation";

/**
 * Formats accepted shorthand consistently with the real notation normalizer.
 * @param input - Original response.
 * @returns Display math, preserving incomplete input without repairing it.
 */
export function displayCtftInput(input: string): string {
	try {
		return normalizeMathLatex(
			normalizeTransformNotation(input, "omega"),
			false,
		).replace(/\\operatorname\{DiracDelta\}/g, "\\delta");
	} catch {
		return input;
	}
}

/**
 * Condenses verified rational arithmetic without rounding symbolic expressions.
 * @param task - Verified lesson task.
 * @param input - Accepted learner response.
 * @returns Exact reduced real rational where available, otherwise the entered math.
 */
export function summarizeCtftInput(
	task: CtftLessonPart,
	input: string,
): string {
	if (task.kind === "choice")
		return (
			task.choices?.find(
				/** @param choice - Owned option. @returns Selection equality. */ (
					choice,
				) => choice.id === input,
			)?.label ?? ""
		);
	const display = displayCtftInput(input);
	if (!["constant", "location", "calculation"].includes(task.kind))
		return display;
	try {
		const value = normalizeCanonicalTransform(
			parseStrictLatex(normalizeTransformNotation(input, "omega")),
			"omega",
		).right;
		if (value.impulses.length || value.terms.length > 1) return display;
		const term = value.terms[0];
		if (!term) return "0";
		if (
			term.exponent.length ||
			term.factor.numerator.length > 1 ||
			term.factor.denominator.length !== 1
		)
			return display;
		const rational = factorAt(term.factor, scalar(0)).rational();
		return rational && rational.im.numerator === 0n
			? rational.re.toLatex()
			: display;
	} catch {
		return display;
	}
}
