/**
 * Shared Type Definitions for SignalLab Math Engine & UI Components.
 */

/**
 * Solution step item for StepReveal accordion.
 */
export interface SolutionStep {
	/** Title of step */
	title: string;
	/** Main text description */
	description: string;
	/** Optional LaTeX math equation */
	latex?: string;
	/** Whether to wrap in aligned environment */
	aligned?: boolean;
	/** Whether to wrap in cases environment */
	cases?: boolean;
	/** Matrix environment type */
	matrix?: "bmatrix" | "pmatrix" | "matrix";
	/** Whether to wrap in gathered environment */
	gathered?: boolean;
	/** Whether to apply responsive wrapping */
	responsive?: boolean;
}

/**
 * Evaluation option for ITS multiple-choice steps.
 */
export interface ItsOption {
	/** Unique option identifier */
	id: string;
	/** LaTeX rendered mathematical expression */
	latex: string;
	/** Whether this option is mathematically correct */
	isCorrect: boolean;
	/** Targeted diagnostic explanation for why this distractor is incorrect */
	feedback?: string;
}

/**
 * Base metadata container for an Intelligent Tutoring System step.
 */
export interface BaseItsStep {
	/** Progressive tiered hints for this step */
	hints: string[];
	/** Diagnostic feedback for known misconceptions */
	misconceptions?: Record<string, string>;
}
