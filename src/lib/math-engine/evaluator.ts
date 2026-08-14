/**
 * LaTeX & Expression Mathematical Evaluator Engine.
 * Combines CortexJS ComputeEngine AST parsing with multi-point numerical sampling
 * to verify equivalence between student-submitted LaTeX and reference solutions.
 */

import { ComputeEngine } from "@cortex-js/compute-engine";

const ce = new ComputeEngine();

export interface ValidationResult {
	/** Whether the answer is mathematically correct */
	isCorrect: boolean;
	/** Optional error message or hint */
	message?: string;
	/** Score percentage (0 to 100) */
	score: number;
	/** Calculated maximum difference across sample points */
	maxDifference?: number;
}

/**
 * Parses LaTeX string and evaluates at numerical point t.
 * Fallback to JS evaluation if ComputeEngine encounters custom functions.
 * @param {string} latex Student LaTeX or reference LaTeX
 * @param {number} t Time sample point
 * @returns {number} Evaluated numerical value
 */
export function evaluateLatexAt(latex: string, t: number): number {
	try {
		// Clean common LaTeX notation for ComputeEngine
		const cleaned = latex
			.replace(/\\left/g, "")
			.replace(/\\right/g, "")
			.replace(/u\(t\)/g, "1") // step function assumed positive t > 0
			.replace(/u\(t-[^)]+\)/g, "1");

		// Parse and evaluate expression with variable t or s
		ce.assign("t", t);
		ce.assign("s", t);
		const expr = ce.parse(cleaned);
		const result = expr.N().valueOf();

		if (typeof result === "number" && !Number.isNaN(result)) {
			return result;
		}

		// Fallback: evaluate using JS Function for basic expressions
		const jsExpr = cleaned
			.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "(($1)/($2))")
			.replace(/\\cos/g, "Math.cos")
			.replace(/\\sin/g, "Math.sin")
			.replace(/\\exp/g, "Math.exp")
			.replace(/e\^\{([^}]+)\}/g, "Math.exp($1)")
			.replace(/\bt\b/g, `(${t})`)
			.replace(/\bs\b/g, `(${t})`);

		/* eslint-disable-next-line no-new-func */
		const evalFn = new Function(`return ${jsExpr};`);
		const val = Number(evalFn());
		return Number.isNaN(val) ? 0 : val;
	} catch {
		return 0;
	}
}

/**
 * Validates a student LaTeX answer against a reference numerical evaluation function.
 * Evaluates across 10 sample points t in [0.1, 5.0].
 * @param {string} studentLatex Student LaTeX input string
 * @param {(t: number) => number} refEval Reference evaluation function
 * @param {number} tolerance Numerical difference tolerance (default 1e-3)
 * @returns {ValidationResult} Validation result
 */
export function validateLatexAnswer(
	studentLatex: string,
	refEval: (t: number) => number,
	tolerance: number = 1e-3,
): ValidationResult {
	if (!studentLatex || studentLatex.trim() === "") {
		return {
			isCorrect: false,
			score: 0,
			message: "Please enter an answer before submitting.",
		};
	}

	const samplePoints = [0.1, 0.3, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
	let maxDiff = 0;
	let validCount = 0;

	for (const t of samplePoints) {
		const studentVal = evaluateLatexAt(studentLatex, t);
		const refVal = refEval(t);

		const diff = Math.abs(studentVal - refVal);
		if (!Number.isNaN(diff)) {
			maxDiff = Math.max(maxDiff, diff);
			validCount++;
		}
	}

	if (validCount === 0 || maxDiff > tolerance * 10) {
		return {
			isCorrect: false,
			score: 0,
			maxDifference: maxDiff,
			message:
				"Incorrect. Check your roots, coefficients, or particular solution terms.",
		};
	}

	return {
		isCorrect: true,
		score: 100,
		maxDifference: maxDiff,
		message: "Correct! Excellent work.",
	};
}
