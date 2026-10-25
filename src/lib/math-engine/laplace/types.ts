/** Exact structured factor; frequency zero denotes a real linear factor. */
export interface LaplaceFactor {
	/** Pole or zero real part as a rational literal. */ real: string;
	/** Positive conjugate frequency, or zero for a linear factor. */ frequency: string;
	/** Number of copies of this factor. */ multiplicity: number;
}

/** Rational transform with known exact factorization and a possible delay. */
export interface RationalSpec {
	/** Exact numerator gain. */ gain: string;
	/** Original numerator factors. */ zeros: LaplaceFactor[];
	/** Original denominator factors. */ poles: LaplaceFactor[];
	/** Nonnegative time delay. */ delay: string;
	/** Index of the ROC among sorted distinct pole real parts. */ region: number;
}

/** One ordinary supported term or weighted Dirac impulse. */
export interface LaplaceSignalTerm {
	/** Standard transform pair. */ kind:
		"exponential" | "cosine" | "sine" | "impulse";
	/** Exact weight. */ amplitude: string;
	/** Exponential rate. */ rate: string;
	/** Nonnegative angular frequency. */ frequency: string;
	/** Polynomial power for exponential terms, from zero through three. */ power: number;
	/** Nonnegative shift. */ delay: string;
	/** Support direction for ordinary terms. */ side: "right" | "left";
}

/** Common reproducibility metadata. */
interface SpecBase {
	/** Seed identifying the generated or customized exercise. */ seed: number;
}

/** Inverse or system-analysis exercise. */
export interface RationalExercise extends SpecBase {
	/** Workflow discriminator. */ workflow: "inverse" | "roc";
	/** Structured rational expression. */ rational: RationalSpec;
	/** Whether BIBO stability is meaningful for this problem. */ system: boolean;
}

/** Forward-transform exercise. */
export interface ForwardExercise extends SpecBase {
	/** Workflow discriminator. */ workflow: "forward";
	/** At most three standard signal terms. */ terms: LaplaceSignalTerm[];
}

/** Unilateral first- or second-order initial-value exercise. */
export interface OdeExercise extends SpecBase {
	/** Workflow discriminator. */ workflow: "ode";
	/** Nonzero leading differential-operator coefficient. */ leading: string;
	/** First- or second-order operator factors. */ roots: LaplaceFactor[];
	/** Values at zero minus: y and its first derivative. */ initial: [
		string,
		string,
	];
	/** Supported right-sided forcing terms. */ terms: LaplaceSignalTerm[];
}

/** All accepted problem configurations. */
export type LaplaceExerciseSpec =
	RationalExercise | ForwardExercise | OdeExercise;

/** Ordinary term after exact PFD and pairing. */
export interface LaplaceResponseTerm extends LaplaceSignalTerm {}

/** One checked numeric, expression, or conceptual task. */
interface LaplaceTaskBase {
	/** Stable identifier independent of display numbering. */ id: string;
	/** Human-readable heading. */ title: string;
	/** Question and mathematical context. */ prompt: string;
	/** Exact expected answer or conceptual option value. */ answer: string;
	/** Available conceptual choices. */ choices?: string[];
	/** Three progressive hints. */ hints: string[];
	/** Relevant formula without task-specific answers. */ formula?: string;
	/** Independent response parameters for a time-domain substep. */ terms?: LaplaceResponseTerm[];
	/** Displayed assignment label, accepted optionally on submitted expressions. */ lhs?: string;
}

/** Existing single-answer task controls. */
export interface LaplaceSingleTask extends LaplaceTaskBase {
	/** Input control and verification domain. */ kind:
		"choice" | "scalar" | "s" | "t";
}

/** One independently graded exact coefficient. */
export interface LaplaceAnswerField {
	/** Stable input identifier within this task. */ id: string;
	/** Accessible label with optional mathematical notation. */ label: string;
	/** Exact target built from structured initial conditions. */ target: string;
}

/** A verified rule with blank coefficient slots. */
export interface LaplaceFieldTask extends LaplaceTaskBase {
	/** Structured input discriminator. */ kind: "fields";
	/** Equation containing named slots such as {{y0}}. */ frame: string;
	/** Ordered independently checked coefficients. */ fields: LaplaceAnswerField[];
}

/** All supported guided tasks. */
export type LaplaceTask = LaplaceSingleTask | LaplaceFieldTask;

/** Parent stage containing independently checked tasks. */
export interface LaplaceStage {
	/** Stable workflow stage identifier. */ id: string;
	/** Parent heading. */ title: string;
	/** Ordered substeps. */ tasks: LaplaceTask[];
}

/** Solved data shared by scaffolding, verification, and completion views. */
export interface LaplaceExercise {
	/** Immutable validated input configuration. */ spec: LaplaceExerciseSpec;
	/** Visible initial statement without derived answers. */ prompt: string;
	/** Supplied transform convention and support constraint. */ conditions: string;
	/** Exact transform expression. */ transform: string;
	/** Supported time response. */ response: string;
	/** Independent structured response terms. */ terms: LaplaceResponseTerm[];
	/** Exact reduced pole metadata. */ poles: LaplaceFactor[];
	/** Factor copies removed from the complete response, excluding block-only reductions. */ canceled: LaplaceFactor[];
	/** ROC bounds, which may be infinite. */ roc: [number, number];
	/** Formatted convergence region. */ rocLatex: string;
	/** Whether a system's impulse response defines a BIBO-stable map. */ stable: boolean;
	/** Validated guided workflow. */ stages: LaplaceStage[];
}
