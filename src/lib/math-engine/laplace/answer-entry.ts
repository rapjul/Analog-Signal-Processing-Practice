import { CanonicalError } from "$lib/math-engine/canonical-algebra";

/** @param answer - Raw submission. @param variable - Verification variable. @param lhs - Optional task-specific equation label. @returns Only the right-hand expression, refusing other assignments. */
export function laplaceExpression(
	answer: string,
	variable: "s" | "t",
	lhs?: string,
): string {
	const parts = answer.split("=");
	if (parts.length === 1) return answer;
	if (parts.length !== 2)
		throw new CanonicalError(
			"invalid",
			"Enter one expression or one supported equation, without chained assignments.",
		);
	/** @param label - Assignment notation. @returns Comparable whitespace-free notation. */
	const compact = (label: string) =>
		label
			.replace(/\\(?:left|right)\b/g, "")
			.replace(/\\(?:[,;:!]|quad\b|qquad\b)/g, "")
			.replace(/\s/g, "");
	const labels =
		variable === "t" ? ["x(t)", "y(t)"] : ["X(s)", "Y(s)", "H(s)"];
	if (lhs) labels.push(lhs);
	if (!labels.some((label) => compact(label) === compact(parts[0]!)))
		throw new CanonicalError(
			"invalid",
			"Use the displayed equation label, or enter only its right-hand expression.",
		);
	if (!parts[1]!.trim())
		throw new CanonicalError(
			"invalid",
			"Enter the right-hand expression after the equals sign.",
		);
	return parts[1]!;
}

/** @param frame - Equation containing named slots. @param values - Draft or verified coefficients. @returns One equation, with empty slots kept visibly blank. */
export function renderLaplaceFields(
	frame: string,
	values: Record<string, string>,
): string {
	return frame.replace(
		/\{\{([a-z0-9-]+)\}\}/g,
		(_match, id: string) => values[id]?.trim() || "\\square",
	);
}

/** @param id - Stable task identifier. @param kind - Expression domain. @returns Meaningful fixed assignment label. */
export function laplaceAnswerLabel(id: string, kind: "s" | "t"): string {
	const labels: Record<string, string> = {
		"factor-numerator": "N(s)",
		"factor-denominator": "D(s)",
		"ode-zi": "Y_{\\mathrm{ZI}}(s)",
		"ode-zs": "Y_{\\mathrm{ZS}}(s)",
		"ode-total": "Y(s)",
		"ode-response": "y(t)",
		"ode-check-zi": "y_{\\mathrm{ZI}}(t)",
		"ode-check-zs": "y_{\\mathrm{ZS}}(t)",
	};
	return labels[id] ?? (kind === "t" ? "x(t)" : "F(s)");
}
