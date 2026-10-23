/** Read-only display helpers; these never establish mathematical correctness. */
import { factorAt, scalar } from "./canonical-algebra";
import { normalizeCanonicalTransform } from "./canonical-transform";
import type {
	CtftLessonPart,
	CtftLessonStage,
	CtftStageId,
} from "./ctft-lesson";
import { validateCtftConstant } from "./ctft-tutor-validation";
import { normalizeMathLatex, parseStrictLatex } from "./evaluator";
import type { GeneratedCtftProblem } from "./fourier-transform";
import { normalizeTransformNotation } from "./transform-notation";

/**
 * Selects compact stage results while detailed derivations remain completion-gated.
 * @param stage - Completed lesson stage.
 * @returns Stage-owned tasks whose accepted responses summarize the work.
 */
export function completedCtftParts(stage: CtftLessonStage): CtftLessonPart[] {
	if (stage.id !== "base" && stage.id !== "property") return stage.parts;
	return stage.parts.filter(
		/** @param task - Owned exercise. @returns Whether it supplies the stage's resulting expression. */
		(task) =>
			["expression", "kernel", "phase"].includes(task.id) ||
			task.kind === "location" ||
			task.kind === "weight",
	);
}

/**
 * Names the actual typed task using the established solver action convention.
 * @param task - Active lesson-owned task.
 * @param stageId - Distinguishes base and final spectrum entry.
 * @returns Plain-text action with a progression arrow.
 */
export function ctftCheckLabel(
	task: CtftLessonPart,
	stageId: CtftStageId,
): string {
	if (task.kind === "location") return "Check impulse location →";
	if (task.kind === "weight") return "Check impulse weight →";
	if (task.kind === "spectrum")
		return stageId === "base"
			? "Check base spectrum →"
			: "Check final spectrum →";
	const subjects: Record<string, string> = {
		T: "width",
		a: "decay parameter",
		w0: "carrier frequency",
		t0: "translation",
		primitive: "antiderivative",
		endpoints: "endpoints",
		upper: "infinite endpoint",
		lower: "lower endpoint",
		sine: "sine form",
		limit: "zero-frequency value",
		phase: "phase multiplier",
		linear: "linear coefficient",
		square: "squared coefficient",
		remainder: "exponent",
		sifting: "sifting point",
		kernel: "sampled factor",
		euler: "Euler coefficient",
		"exponential-weight": "impulse weight",
		"scaled-weight": "scaled weight",
	};
	return `Check ${subjects[task.id] ?? "calculation"} →`;
}

/**
 * Presents an authoritative exact solution, separately from accepted attempt text.
 * @param task - Lesson-owned completed task and exact target.
 * @param problem - Authoritative signal parameters.
 * @param stageId - Determines whether translation has been applied.
 * @param verifiedLocation - Accepted coordinate for this impulse row, if applicable.
 * @returns Exact mathematical target or the lesson-owned choice label.
 */
export function exactCtftSolution(
	task: CtftLessonPart,
	problem: GeneratedCtftProblem,
	stageId: CtftStageId,
	verifiedLocation?: string,
): string {
	let target = task.expected;
	if (task.kind === "location" || task.kind === "weight") {
		const location = [problem.params.w0, -problem.params.w0].find(
			/** @param coordinate - Exact carrier candidate. @returns Whether the verified row uses it. */
			(coordinate) =>
				validateCtftConstant(
					verifiedLocation ?? "",
					String(coordinate),
					true,
				).status === "correct",
		);
		if (location === undefined)
			throw new Error(
				"Exact solution requires a verified carrier coordinate.",
			);
		const shift = stageId === "base" ? 0 : problem.params.t0;
		target =
			task.kind === "location"
				? String(location)
				: shift === 0
					? "\\pi"
					: `\\pi e^{-j(${location})(${shift})}`;
	}
	return summarizeCtftInput(task, target);
}

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
