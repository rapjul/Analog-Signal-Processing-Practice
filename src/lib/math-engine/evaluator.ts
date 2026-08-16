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

/**
 * Evaluates a LaTeX condition string for variable t.
 * Supports intervals like "0 \le t < 2", "t < 0", "t \ge 2", etc.
 * @param {string} cond LaTeX condition string
 * @param {number} t Time sample point
 * @returns {boolean} True if the condition is met
 */
function evaluateCondition(cond: string, t: number): boolean {
	const cleaned = cond
		.replace(/\\le/g, "<=")
		.replace(/\\ge/g, ">=")
		.replace(/\\leq/g, "<=")
		.replace(/\\geq/g, ">=")
		.replace(/\\lt/g, "<")
		.replace(/\\gt/g, ">")
		.replace(/\\text\{for\}/g, "")
		.replace(/\\quad/g, "")
		.trim();

	// Match between: a <= t <= b or a <= t < b or a < t < b
	const betweenMatch = cleaned.match(
		/^(-?\d+(?:\.\d+)?)\s*(<=|<)\s*t\s*(<=|<)\s*(-?\d+(?:\.\d+)?)$/,
	);
	if (betweenMatch) {
		const lower = Number.parseFloat(betweenMatch[1]);
		const op1 = betweenMatch[2];
		const op2 = betweenMatch[3];
		const upper = Number.parseFloat(betweenMatch[4]);

		const lowPass = op1 === "<=" ? t >= lower : t > lower;
		const highPass = op2 === "<=" ? t <= upper : t < upper;
		return lowPass && highPass;
	}

	// Match t < a or t <= a
	const tLessMatch = cleaned.match(/^t\s*(<=|<)\s*(-?\d+(?:\.\d+)?)$/);
	if (tLessMatch) {
		const op = tLessMatch[1];
		const val = Number.parseFloat(tLessMatch[2]);
		return op === "<=" ? t <= val : t < val;
	}

	// Match t > a or t >= a
	const tGreaterMatch = cleaned.match(/^t\s*(>=|>)\s*(-?\d+(?:\.\d+)?)$/);
	if (tGreaterMatch) {
		const op = tGreaterMatch[1];
		const val = Number.parseFloat(tGreaterMatch[2]);
		return op === ">=" ? t >= val : t > val;
	}

	return false;
}

/**
 * Parses and evaluates a piecewise LaTeX expression at numerical point t.
 * @param {string} latex Student or reference piecewise LaTeX expression
 * @param {number} t Time sample point
 * @returns {number} Evaluated numerical value
 */
export function evaluatePiecewiseLatexAt(latex: string, t: number): number {
	const trimmed = latex.trim();
	if (!trimmed.includes("cases")) {
		return evaluateLatexAt(trimmed, t);
	}

	const match = trimmed.match(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/);
	if (!match) {
		return evaluateLatexAt(trimmed, t);
	}

	const body = match[1];
	const rows = body
		.split("\\\\")
		.map((r) => r.trim())
		.filter(Boolean);

	for (const row of rows) {
		let exprPart = row;
		let condPart = "";

		if (row.includes("&")) {
			const parts = row.split("&");
			exprPart = parts[0].trim().replace(/[,;]$/, "").trim();
			condPart = parts.slice(1).join("&").trim();
		} else if (row.includes("\\text{for}")) {
			const parts = row.split("\\text{for}");
			exprPart = parts[0]
				.trim()
				.replace(/\\quad$/, "")
				.replace(/[,;]$/, "")
				.trim();
			condPart = parts[1].trim();
		}

		if (condPart) {
			if (evaluateCondition(condPart, t)) {
				return evaluateLatexAt(exprPart, t);
			}
		}
	}

	return 0;
}

/**
 * Validates a student convolution response against a reference evaluation function across a time domain range.
 * @param {string} studentLatex Student LaTeX input string (piecewise or closed-form)
 * @param {(t: number) => number} refEval Reference numerical evaluation function
 * @param {[number, number]} [timeRange=[-2, 6]] Min and max bounds for sampling
 * @param {number} [tolerance=0.05] Difference threshold
 * @returns {boolean} True if the response is numerically verified
 */
export function validateConvolutionResponse(
	studentLatex: string,
	refEval: (t: number) => number,
	timeRange: [number, number] = [-2, 6],
	tolerance: number = 0.05,
): boolean {
	if (!studentLatex?.trim()) {
		return false;
	}

	const [tMin, tMax] = timeRange;
	const count = 20;
	const step = (tMax - tMin) / count;
	let validMatches = 0;

	for (let i = 0; i < count; i++) {
		const t = tMin + (i + 0.5) * step;
		const studentVal = studentLatex.includes("cases")
			? evaluatePiecewiseLatexAt(studentLatex, t)
			: evaluateLatexAt(studentLatex, t);
		const refVal = refEval(t);

		const diff = Math.abs(studentVal - refVal);
		if (Number.isNaN(diff) || diff > tolerance) {
			return false;
		}
		validMatches++;
	}

	return validMatches > 0;
}
