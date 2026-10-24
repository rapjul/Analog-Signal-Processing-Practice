/** Family-specific teaching copy, independent of controller and rendering. */
import { formatCtftHalfWidth } from "./ctft-derivation";
import type {
	CtftLessonPart,
	CtftLessonStage,
	CtftPracticeMode,
	CtftStageId,
} from "./ctft-lesson";
import type { GeneratedCtftProblem } from "./fourier-transform";

/** Concept, identity, and substitution scaffold revealed progressively. */
type Hints = [string, string, string];

/**
 * Builds hints that refer only to work available in this teaching mode.
 * @param problem - Authoritative family and parameters.
 * @param mode - Derivation or pair substitution.
 * @returns Family-specific base-spectrum guidance.
 */
function baseHints(
	problem: GeneratedCtftProblem,
	mode: CtftPracticeMode,
): Hints {
	const {
		signalType: family,
		params: { T, a, w0 },
	} = problem;
	const pairHints: Record<typeof family, Hints> = {
		rect: [
			"Use the verified full width in the displayed rectangular transform pair.",
			String.raw`Normalized sinc means $\operatorname{sinc}(z)=\sin(\pi z)/(\pi z)$. Match $\pi z$ with $T\omega/2$.`,
			String.raw`Substitute $T=${T}$ in both the amplitude factor $T$ and the argument $T\omega/(2\pi)$. Apply translation in the next stage.`,
		],
		exponential: [
			"Use the verified decay parameter in the displayed exponential pair.",
			String.raw`The pair has numerator $1$ and denominator $a+j\omega$. The frequency term stays in the denominator.`,
			String.raw`Replace $a$ with ${a}; keep the positive sign before $j\omega$. Translation comes later.`,
		],
		gaussian: [
			"Substitute the verified decay parameter in both places in the Gaussian pair.",
			String.raw`The prefactor is $\sqrt{\pi/a}$ and the exponent is $-\omega^2/(4a)$.`,
			String.raw`Use $a=${a}$ in the prefactor and compute $4a$ in the exponent's denominator. Do not omit the prefactor.`,
		],
		delta: [
			"Use the constant spectrum in the displayed unshifted delta pair.",
			"The base spectrum is independent of frequency; the translation has not been applied yet.",
			"Enter the constant from the unshifted pair. The next stage introduces the signed time translation.",
		],
		cos: [
			"The cosine pair has two frequency impulses.",
			String.raw`Each impulse has weight $\pi$ under the angular-frequency convention. A delta's argument identifies its location, not its weight.`,
			String.raw`Place the rows at opposite frequencies $\pm${w0}$. Associate each weight with its own row; either row order is accepted.`,
		],
	};
	if (mode === "pairs-properties") return pairHints[family];
	const derivationHints: Record<typeof family, Hints> = {
		rect: [
			"The unshifted rectangle has a real, even spectrum. Use your sine expression and its zero-frequency value.",
			pairHints.rect[1],
			String.raw`Write the sine expression as $T\sin\theta/\theta$ with $\theta=T\omega/2$ and $T=${T}$. Then solve $\pi z=\theta$ to identify the normalized sinc argument.`,
		],
		exponential: [
			"Combine the verified endpoint contributions: upper minus lower.",
			String.raw`Use $X_0(\omega)=F(\infty)-F(0)$. Subtracting the negative lower contribution produces a positive numerator.`,
			String.raw`With $a=${a}$, assemble $0-(-1/(a+j\omega))$. Keep the imaginary frequency term in the denominator.`,
		],
		gaussian: [
			"Combine the supplied Gaussian prefactor with your verified exponent.",
			String.raw`Use $\int_{-\infty}^{\infty}e^{-at^2+bt}\,dt=\sqrt{\pi/a}\,e^{b^2/(4a)}$ with $b=-j\omega$.`,
			String.raw`Substitute $a=${a}$ into the prefactor and use your negative squared-frequency exponent. The prefactor multiplies the exponential.`,
		],
		delta: [
			"For the forward transformation, the delta samples the exponential factor at its location.",
			String.raw`Use $\int\delta(t)f(t)\,dt=f(0)$ with $f(t)=e^{-j\omega t}$.`,
			"Evaluate the exponential at zero time. The unshifted result is constant in frequency.",
		],
		cos: [
			"Euler's two exponentials each produce a frequency impulse.",
			String.raw`Use $\mathcal F\{e^{j\omega_0t}\}=2\pi\delta(\omega-\omega_0)$, then apply the Euler factor $1/2$.`,
			pairHints.cos[2],
		],
	};
	return derivationHints[family];
}

/**
 * States the requested mathematical action without supplying a future answer.
 * @param stage - Active stage identity.
 * @param task - Owned exercise.
 * @param problem - Signal family.
 * @param mode - Teaching path.
 * @returns Brief learner-facing objective.
 */
function objective(
	stage: CtftStageId,
	task: CtftLessonPart,
	problem: GeneratedCtftProblem,
	mode: CtftPracticeMode,
): string {
	const general: Record<CtftStageId, string> = {
		pair: "Recognize the unshifted shape before handling its translation.",
		parameters: String.raw`Write the signal in the form $x_0(t-t_0)$, then read the requested parameter.`,
		setup: "Choose the mathematical starting point for the unshifted signal.",
		base: "Use the preceding verified calculation to complete this part of the base transform.",
		property:
			"Determine how the signed time translation changes the base spectrum.",
		final: "Combine your verified base spectrum and phase multiplier.",
	};
	if (stage !== "base") return general[stage];
	if (mode === "pairs-properties")
		return "Substitute the verified parameters into the supplied transform pair.";
	const intermediate: Record<string, string> = {
		sine: "Convert your verified endpoint expression into an equivalent sine expression.",
		limit: "Evaluate the zero-frequency value directly from the integral, without dividing by zero.",
		kernel: "Evaluate the exponential factor at the verified sifting point to obtain the forward transformation.",
	};
	if (intermediate[task.id]) return intermediate[task.id]!;
	if (task.id !== "expression") return general.base;
	const assembly: Record<GeneratedCtftProblem["signalType"], string> = {
		rect: String.raw`Rewrite your verified sine expression using normalized sinc to obtain the unshifted spectrum $X_0(\omega)$.`,
		exponential: String.raw`Subtract the lower-endpoint contribution from the upper contribution to assemble $X_0(\omega)$.`,
		gaussian:
			"Multiply the Gaussian prefactor by the exponential containing your verified exponent.",
		delta: "Use the sampled exponential factor as the unshifted spectrum.",
		cos: "Assemble both frequency impulses from the verified Euler decomposition.",
	};
	return assembly[problem.signalType];
}

/**
 * Supplies the correct family-specific starting identity.
 * @param problem - Unshifted family and parameters.
 * @returns A third-tier setup scaffold.
 */
function setupScaffold(problem: GeneratedCtftProblem): string {
	const { T, a, w0 } = problem.params;
	const scaffolds: Record<GeneratedCtftProblem["signalType"], string> = {
		rect: String.raw`The unshifted pulse is one from $-${formatCtftHalfWidth(T)}$ to $${formatCtftHalfWidth(T)}$. For the forward transformation, multiply by $e^{-j\omega t}$ and integrate between these bounds.`,
		exponential: String.raw`The causal signal starts at zero and decays with $a=${a}>0$. Multiply its exponential by $e^{-j\omega t}$ before integrating to infinity.`,
		gaussian: String.raw`The Gaussian spans the entire real line. For the forward transformation, multiply by $e^{-j\omega t}$ and use the supplied Gaussian integration identity.`,
		delta: String.raw`For the forward transformation, evaluate $e^{-j\omega t}$ at the unshifted impulse's location using the sifting identity.`,
		cos: String.raw`Use Euler's sum of two exponentials at $\pm${w0}$, including the factor $1/2$. The individual exponential transforms are distributions.`,
	};
	return scaffolds[problem.signalType];
}

/**
 * Explains the forward transformation using only the active signal family.
 * @param problem - Unshifted family and authoritative parameters.
 * @returns Concept, applicable identity, and parameter substitution scaffold.
 */
function setupHints(problem: GeneratedCtftProblem): Hints {
	const first: Record<GeneratedCtftProblem["signalType"], [string, string]> =
		{
			rect: [
				"Find the interval where the unshifted rectangular pulse is nonzero.",
				String.raw`For the forward transformation, multiply the pulse by $e^{-j\omega t}$ and integrate over that interval.`,
			],
			exponential: [
				"The causal exponential is zero before time zero.",
				String.raw`For the forward transformation, integrate $e^{-at}e^{-j\omega t}$ from zero to infinity.`,
			],
			gaussian: [
				"The unshifted Gaussian extends over the entire real line.",
				String.raw`For the forward transformation, combine $e^{-at^2}$ with $e^{-j\omega t}$ and use the supplied Gaussian identity.`,
			],
			delta: [
				"Use the sifting identity for the unshifted impulse.",
				String.raw`The forward transformation integrates $\delta(t)e^{-j\omega t}$. Sifting evaluates the exponential factor at the impulse's location.`,
			],
			cos: [
				"Write the cosine as the sum of two complex exponentials.",
				String.raw`Use Euler's cosine identity with coefficients $1/2$, then apply the complex-exponential transformation pair to each term.`,
			],
		};
	return [...first[problem.signalType], setupScaffold(problem)];
}

/**
 * Builds three hints while preserving specific intermediate-calculation guidance.
 * @param stage - Stage identity.
 * @param task - Current exercise.
 * @param problem - Authoritative family and signed shift.
 * @param mode - Teaching path.
 * @returns Three progressive hints relevant to this task.
 */
function taskHints(
	stage: CtftStageId,
	task: CtftLessonPart,
	problem: GeneratedCtftProblem,
	mode: CtftPracticeMode,
): Hints {
	switch (stage) {
		case "base":
			if (
				task.id === "expression" ||
				task.kind === "location" ||
				task.kind === "weight"
			)
				return baseHints(problem, mode);
			return [
				task.hints[0]!,
				task.hints[1]!,
				"Substitute the relevant verified quantities shown in Results so far. Keep this intermediate calculation separate from the complete spectrum.",
			];
		case "parameters":
			return [
				task.hints[0]!,
				"Exact arithmetic such as fractions is accepted. Keep the sign of translation separate from the positive shape parameter.",
				String.raw`Compare the displayed signal with its unshifted family evaluated at $t-t_0$. If the argument contains $t+c$, the signed translation is $t_0=-c$.`,
			];
		case "setup":
			return setupHints(problem);
		case "property":
			return [
				"Time translation changes phase; it does not translate the frequency axis.",
				String.raw`For $x_0(t-t_0)$ the entire base spectrum is multiplied by $e^{-j\omega t_0}$.`,
				String.raw`Here $t_0=${problem.params.t0}$. Substitute that signed value in the phase factor; for zero translation enter $1$.`,
			];
		case "final":
			if (problem.signalType === "cos")
				return [
					"Preserve both verified carrier locations when applying a time translation.",
					String.raw`At location $\omega_k$, multiply that impulse's base weight by $e^{-j\omega_k t_0}$.`,
					"Evaluate the verified phase multiplier separately at each row's location. Retain both impulses and their base weights.",
				];
			return [
				"Use the verified base spectrum and phase multiplier from Results so far.",
				String.raw`Assemble $X(\omega)=X_0(\omega)e^{-j\omega t_0}$.`,
				"Multiply the two verified expressions, retaining the base amplitude. Put the signed translation only in the phase factor.",
			];
		case "pair":
			return [
				task.hints[0]!,
				"Compare the signal's support and exponent, or whether it contains an impulse or a cosine.",
				"Distinguish a finite pulse, one-sided decay, squared-time exponential, time impulse, and cosine. Translation does not change the base family.",
			];
		default:
			throw new Error("Unsupported CTFT teaching stage.");
	}
}

/**
 * Identifies the supplied formula relevant to the active task, without learner results.
 * @param stage - Active stage.
 * @param task - Active task.
 * @param problem - Signal family.
 * @param mode - Teaching approach.
 * @returns An available identity or no additional reference.
 */
function identity(
	stage: CtftStageId,
	task: CtftLessonPart,
	problem: GeneratedCtftProblem,
	mode: CtftPracticeMode,
): string | undefined {
	if (stage === "property" || stage === "final")
		return String.raw`x_0(t-t_0)\longleftrightarrow e^{-j\omega t_0}X_0(\omega)`;
	if (task.id === "sine")
		return String.raw`e^{-j\theta}-e^{j\theta}=-2j\sin\theta`;
	if (task.id === "expression" && problem.signalType === "rect")
		return String.raw`\operatorname{sinc}(z)=\frac{\sin(\pi z)}{\pi z},\quad\operatorname{sinc}(0)=1`;
	if (
		mode === "derivation" &&
		problem.signalType === "gaussian" &&
		(stage === "setup" || stage === "base")
	)
		return String.raw`\int_{-\infty}^{\infty}e^{-at^2+bt}\,dt=\sqrt{\pi/a}\,e^{b^2/(4a)},\quad a>0`;
	return undefined;
}

/**
 * Describes compact scalar and wider mathematical input without duplicating the heading.
 * @param task - Owned exercise.
 * @returns Input metadata independent of grading.
 */
function inputMetadata(
	task: CtftLessonPart,
): Pick<CtftLessonPart, "inputSize" | "inputLabel" | "answerForm"> {
	const compact =
		task.kind === "constant" ||
		task.kind === "location" ||
		[
			"limit",
			"upper",
			"sifting",
			"kernel",
			"euler",
			"exponential-weight",
			"scaled-weight",
		].includes(task.id);
	const labels: Record<string, string> = {
		T: "$T =$",
		a: "$a =$",
		w0: "$\\omega_0 =$",
		t0: "$t_0 =$",
		limit: "$X_0(0) =$",
	};
	let answerForm = String.raw`Enter one expression in $\omega$, using $\pi$, $j$, fractions, and exponential notation. Copyable typing examples are above the solver.`;
	if (compact)
		answerForm = String.raw`Enter an exact constant, using fractions or $\pi$ where needed.`;
	if (task.kind === "choice")
		answerForm = "Choose one option; it is checked immediately.";
	if (task.kind === "weight")
		answerForm = String.raw`Enter this row's complex weight, without a $\delta$ factor. Exact $\pi$ and complex exponentials are supported.`;
	return {
		inputSize: compact ? "scalar" : "expression",
		inputLabel:
			labels[task.id] ??
			(task.kind === "location" ? "$\\omega =$" : "Value"),
		answerForm,
	};
}

/**
 * Enriches a fresh lesson with presentation metadata without altering its mathematics.
 * @param stages - Newly constructed stages owned by this lesson.
 * @param problem - Authoritative family and signal parameters.
 * @param mode - Active teaching approach.
 */
export function guideCtftLesson(
	stages: CtftLessonStage[],
	problem: GeneratedCtftProblem,
	mode: CtftPracticeMode,
): void {
	for (const stage of stages)
		for (const task of stage.parts) {
			Object.assign(task, inputMetadata(task));
			task.objective = objective(stage.id, task, problem, mode);
			task.hints = taskHints(stage.id, task, problem, mode);
			const formula = identity(stage.id, task, problem, mode);
			if (formula) task.identityLatex = formula;
		}
}
