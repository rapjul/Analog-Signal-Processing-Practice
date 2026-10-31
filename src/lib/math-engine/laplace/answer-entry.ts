import { CanonicalError } from "$lib/math-engine/canonical-algebra";
import { parseStrictLatex } from "$lib/math-engine/evaluator";
import { entryIssue, ZERO_POLYNOMIAL } from "./input-entry";
import type { LaplaceExerciseSpec, LaplaceFieldTask } from "./types";

/** @param spec - Validated workflow context. @returns Explicit learner-facing goal with mathematical labels. */
export function laplaceGoal(spec: LaplaceExerciseSpec): string {
	if (spec.workflow === "forward")
		return "Find the transform $X(s)$ and its region of convergence.";
	if (spec.workflow === "ode")
		return "Solve for $y(t)$ and verify the equation and initial conditions.";
	if (spec.workflow === "roc")
		return "Analyze the system's zeros, poles, region of convergence, causality, and BIBO stability.";
	return `Find the ${spec.system ? "impulse response $h(t)$" : "signal $x(t)$"} with the supplied support or region of convergence.`;
}

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

/** @param task - Typed equation slots. @param values - Current drafts. @returns A complete equation with explicit undefined degree and safe incomplete placeholders. */
export function renderLaplaceFieldTask(
	task: Pick<LaplaceFieldTask, "fields" | "frame">,
	values: Record<string, string>,
): string {
	const visible = Object.fromEntries(
		task.fields.map((field) => {
			const value = values[field.id] ?? "";
			if (field.entry?.kind === "degree" && value === ZERO_POLYNOMIAL)
				return [field.id, "\\mathrm{undefined}"];
			if (field.entry?.kind === "boolean")
				return [
					field.id,
					value === "1" ? "\\text{Active}" : "\\text{Inactive}",
				];
			try {
				if (entryIssue(value, field.entry ?? { kind: "exact" }))
					return [field.id, "\\square"];
				parseStrictLatex(value);
				return [field.id, value];
			} catch {
				return [field.id, "\\square"];
			}
		}),
	);
	return renderLaplaceFields(task.frame, visible);
}

/** @param id - Stable task identifier. @param kind - Expression domain. @returns Meaningful fixed assignment label. */
export function laplaceAnswerLabel(id: string, kind: "s" | "t"): string {
	const labels: Record<string, string> = {
		"forward-final": "X(s)",
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
