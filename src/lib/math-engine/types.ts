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
