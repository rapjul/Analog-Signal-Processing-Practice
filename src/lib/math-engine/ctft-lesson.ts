/** Parameter-owned teaching paths for continuous-time Fourier transforms. */

import { buildCtftDerivation } from "./ctft-derivation";
import {
	type CtftSignalType,
	createCtftProblem,
	type GeneratedCtftProblem,
	getCtftPairLatex,
} from "./fourier-transform";

/** Supported guided teaching approaches. */
export type CtftPracticeMode = "derivation" | "pairs-properties";
/** Stable mathematical stage identities, independent of displayed numbering. */
export type CtftStageId =
	"pair" | "parameters" | "setup" | "base" | "property" | "final";
/** Supported typed-answer and recognition controls. */
export type CtftPartKind =
	| "choice"
	| "constant"
	| "calculation"
	| "spectrum"
	| "phase"
	| "location"
	| "weight";
/** One recognition option owned by its lesson. */
export interface CtftChoice {
	/** Stable selection token. */ id: string;
	/** Visible mathematical or descriptive label. */ label: string;
	/** Spoken description for a mathematical recognition option. */ accessibleLabel?: string;
}
/** One independently checked learning task. */
export interface CtftLessonPart {
	/** Stable task identity. */ id: string;
	/** Accessible field or task label. */ label: string;
	/** Mathematical presentation of the label while retaining its stable accessible field name. */ labelMath?: string;
	/** Input and grading strategy. */ kind: CtftPartKind;
	/** Correct choice token or parameter-owned intermediate target and development fixture. */ expected: string;
	/** Owned options for recognition tasks. */ choices?: CtftChoice[];
	/** Render choice labels with the shared math component. */ mathChoices?: boolean;
	/** Current equation supplying context without supplying the requested answer. */ contextLatex?: string;
	/** Progressive conceptual guidance. */ hints: string[];
}
/** Sequential group of independently checked tasks. */
export interface CtftLessonStage {
	/** Stable mathematical identity. */ id: CtftStageId;
	/** Visible heading. */ title: string;
	/** Ordered tasks. */ parts: CtftLessonPart[];
	/** Parameter-derived algebra unlocked with the completed solution. */ derivationLatex?: string;
}
/** Complete mode-specific lesson and parameter-derived presentation. */
export interface CtftLesson {
	/** Selected teaching path. */ mode: CtftPracticeMode;
	/** Active sequence, with no placeholder steps. */ stages: CtftLessonStage[];
	/** Parameter-owned unshifted problem used for base verification. */ baseProblem: GeneratedCtftProblem;
	/** Standard symbolic pair shown in pair-based practice. */ standardPair: string;
	/** Parameter-derived final expression for completed summaries. */ finalLatex: string;
}

/** Names shared by signal recognition and the route selector. */
export const CTFT_FAMILIES: CtftChoice[] = [
	{ id: "rect", label: "Rectangular pulse" },
	{ id: "exponential", label: "Causal exponential" },
	{ id: "gaussian", label: "Gaussian" },
	{ id: "delta", label: "Dirac delta" },
	{ id: "cos", label: "Cosine" },
];

/** Symbolic standard pairs with the normalized sinc convention. */
const STANDARD_PAIRS: Record<CtftSignalType, string> = {
	rect: String.raw`\operatorname{rect}(t/T)\longleftrightarrow T\operatorname{sinc}(T\omega/(2\pi))`,
	exponential: String.raw`e^{-at}u(t)\longleftrightarrow\frac{1}{a+j\omega},\quad a>0`,
	gaussian: String.raw`e^{-at^2}\longleftrightarrow\sqrt{\pi/a}e^{-\omega^2/(4a)},\quad a>0`,
	delta: String.raw`\delta(t)\longleftrightarrow 1`,
	cos: String.raw`\cos(\omega_0t)\longleftrightarrow\pi\delta(\omega-\omega_0)+\pi\delta(\omega+\omega_0)`,
};

/**
 * Creates a scalar or expression task with progressively specific guidance.
 * @param id - Stable task identity.
 * @param label - Accessible prompt.
 * @param kind - Input strategy.
 * @param expected - Independent parameter-derived fixture value.
 * @param hint - Mathematical guidance.
 * @returns A fresh lesson task.
 */
function part(
	id: string,
	label: string,
	kind: CtftPartKind,
	expected: string,
	hint: string,
): CtftLessonPart {
	return {
		id,
		label,
		kind,
		expected,
		hints: [
			hint,
			kind === "choice"
				? "Compare the available options with the signal family, forward kernel, and applicable property."
				: "Check the transform convention, amplitude factors, and signs. Use exact constants such as pi and fractions.",
		],
	};
}

/**
 * Builds the setup recognition exercise for a family.
 * @param problem - Parameter-owned unshifted signal.
 * @returns Correct and misconception setup options.
 */
function setupChoices(problem: GeneratedCtftProblem): CtftChoice[] {
	const { signalType, params } = problem;
	if (signalType === "delta")
		return [
			{
				id: "correct",
				accessibleLabel:
					"Sift the kernel at time zero, giving the exponential of zero",
				label: String.raw`\int_{-\infty}^{\infty}\delta(t)e^{-j\omega t}\,dt=e^0`,
			},
			{
				id: "wrong",
				accessibleLabel:
					"Set the integral of the impulse times the kernel to zero",
				label: String.raw`\int_{-\infty}^{\infty}\delta(t)e^{-j\omega t}\,dt=0`,
			},
		];
	if (signalType === "cos")
		return [
			{
				id: "correct",
				accessibleLabel:
					"Cosine equals half the sum of the positive and negative complex exponentials",
				label: String.raw`\cos(${params.w0}t)=\tfrac12(e^{j${params.w0}t}+e^{-j${params.w0}t})`,
			},
			{
				id: "wrong",
				accessibleLabel:
					"Cosine equals the unscaled sum of the positive and negative complex exponentials",
				label: String.raw`\cos(${params.w0}t)=e^{j${params.w0}t}+e^{-j${params.w0}t}`,
			},
		];
	const signal = getCtftPairLatex(signalType, params).timeLatex;
	const bounds =
		signalType === "rect"
			? [`-${params.T}/2`, `${params.T}/2`]
			: signalType === "exponential"
				? ["0", String.raw`\infty`]
				: [String.raw`-\infty`, String.raw`\infty`];
	const integrand =
		signalType === "rect"
			? "1"
			: signalType === "exponential"
				? `e^{-${params.a}t}`
				: signal;
	return [
		{
			id: "correct",
			accessibleLabel:
				"Integrate over the signal support with the negative imaginary forward-kernel exponent",
			label: String.raw`\int_{${bounds[0]}}^{${bounds[1]}}${integrand}e^{-j\omega t}\,dt`,
		},
		{
			id: "wrong",
			accessibleLabel:
				"Integrate over the signal support with a positive imaginary kernel exponent",
			label: String.raw`\int_{${bounds[0]}}^{${bounds[1]}}${integrand}e^{+j\omega t}\,dt`,
		},
	];
}

/**
 * Builds only the parameter fields relevant to the active signal family.
 * @param problem - Active generated signal.
 * @returns Parameter-owned fields with mathematical display labels.
 */
function parameterTasks(problem: GeneratedCtftProblem): CtftLessonPart[] {
	const { signalType: type, params } = problem;
	const parameters: CtftLessonPart[] = [];
	if (type === "rect")
		parameters.push(
			part(
				"T",
				"Pulse width T",
				"constant",
				String(params.T),
				"T is the full width, not the half-width.",
			),
		);
	if (type === "exponential" || type === "gaussian")
		parameters.push(
			part(
				"a",
				"Decay parameter a",
				"constant",
				String(params.a),
				"Read the positive coefficient multiplying time or time squared in the exponent.",
			),
		);
	if (type === "cos")
		parameters.push(
			part(
				"w0",
				"Carrier angular frequency",
				"constant",
				String(params.w0),
				"Read the angular frequency in radians per second.",
			),
		);
	parameters.push(
		part(
			"t0",
			"Signed time translation",
			"constant",
			String(params.t0),
			String.raw`Write the signal as $x_0(t-t_0)$. A plus sign inside the argument means a negative translation.`,
		),
	);
	for (const parameter of parameters) {
		if (parameter.id === "T") parameter.labelMath = "Pulse width $T$";
		if (parameter.id === "a") parameter.labelMath = "Decay parameter $a$";
	}
	return parameters;
}

/**
 * Constructs mode-specific tasks from signal parameters, never displayed answers.
 * @param problem - Active generated signal.
 * @param mode - Teaching approach.
 * @returns Complete ordered lesson.
 */
export function buildCtftLesson(
	problem: GeneratedCtftProblem,
	mode: CtftPracticeMode,
): CtftLesson {
	const { signalType: type, params } = problem;
	const baseProblem = createCtftProblem(type, { ...params, t0: 0 });
	const canonicalProblem = createCtftProblem(type, params);
	const pairTask = part(
		"family",
		"Choose the base signal family",
		"choice",
		type,
		"Identify the signal before applying its translation.",
	);
	pairTask.choices = CTFT_FAMILIES.map(
		/** @param choice - Shared family label. @returns A lesson-owned option. */
		(choice) => ({ ...choice }),
	);
	const parameters = parameterTasks(problem);
	const setup = part(
		"definition",
		"Choose the forward-transform setup",
		"choice",
		"correct",
		String.raw`The forward kernel is $e^{-j\omega t}$. Respect the signal support, sifting, or the factor $1/2$ in Euler's cosine identity.`,
	);
	setup.choices = setupChoices(baseProblem);
	setup.mathChoices = true;
	const derivation =
		mode === "derivation" ? buildCtftDerivation(baseProblem) : null;
	const phase = params.t0 === 0 ? "1" : `e^{${-params.t0}j\\omega}`;
	const property = part(
		"operation",
		"Choose the operational property",
		"choice",
		params.t0 === 0 ? "identity" : "translation",
		"Time translation changes spectral phase, not impulse locations or spectral magnitude.",
	);
	property.choices = [
		{ id: "translation", label: "Time translation" },
		{ id: "identity", label: "Identity (no translation)" },
		{ id: "modulation", label: "Frequency translation (modulation)" },
	];
	/** @param shift - Applied translation. @returns Separately checked impulse location and weight fields. */
	const impulseParts = (shift: number): CtftLessonPart[] =>
		[0, 1].flatMap(
			/** @param row - Distribution row index. @returns Its location and complex-weight tasks. */
			(row) => [
				part(
					`location-${row}`,
					`Impulse ${row + 1} location`,
					"location",
					String(row === 0 ? -params.w0 : params.w0),
					String.raw`The cosine has one impulse at each of $\pm\omega_0$. Either row order is accepted.`,
				),
				part(
					`weight-${row}`,
					`Impulse ${row + 1} complex weight`,
					"weight",
					"\\pi",
					shift === 0
						? String.raw`Each base cosine impulse has weight $\pi$, not $1/2$ or $2\pi$.`
						: String.raw`Evaluate $\pi e^{-j\omega t_0}$ at this row's verified impulse location.`,
				),
			],
		);
	const stages: CtftLessonStage[] = [
		{
			id: "pair",
			title: "Identify the Base Transform Pair",
			parts: [pairTask],
		},
		{
			id: "parameters",
			title: "Extract Signal Parameters",
			parts: parameters,
		},
		...(mode === "derivation"
			? [
					{
						id: "setup" as const,
						title: "Set Up the Derivation",
						parts: [setup],
					},
				]
			: []),
		{
			id: "base",
			title:
				mode === "derivation"
					? "Derive the Base Transform"
					: "Substitute into the Transform Pair",
			...(derivation ? { derivationLatex: derivation.latex } : {}),
			parts: [
				...(derivation?.parts ?? []),
				...(type === "cos"
					? impulseParts(0)
					: [
							part(
								"expression",
								"Base spectrum",
								"spectrum",
								baseProblem.referenceAnswerLatex,
								"Use the unshifted signal parameters. Preserve the normalized sinc scale and Gaussian amplitude.",
							),
						]),
			],
		},
		{
			id: "property",
			title: "Apply the Operational Property",
			parts: [
				property,
				part(
					"phase",
					"Phase multiplier",
					"phase",
					phase,
					String.raw`For $x_0(t-t_0)$, multiply the entire base spectrum by $e^{-j\omega t_0}$. With $t_0=0$, enter $1$.`,
				),
			],
		},
		{
			id: "final",
			title: "Assemble the Final Spectrum",
			parts:
				type === "cos"
					? impulseParts(params.t0)
					: [
							part(
								"expression",
								"Final spectrum",
								"spectrum",
								canonicalProblem.referenceAnswerLatex,
								"Combine the verified base spectrum and phase multiplier, retaining every amplitude factor.",
							),
						],
		},
	];
	return {
		mode,
		stages,
		baseProblem,
		standardPair: STANDARD_PAIRS[type],
		finalLatex: canonicalProblem.referenceAnswerLatex,
	};
}
