/**
 * LaTeX & Expression Mathematical Evaluator Engine.
 *
 * Combines CortexJS ComputeEngine AST parsing with multi-point numerical sampling
 * to verify equivalence between student-submitted LaTeX and reference solutions.
 */

import { parse } from "@cortex-js/compute-engine/latex-syntax";

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
 * Evaluates a MathJSON AST node numerically with given variable assignments.
 * @param {unknown} node MathJSON AST node or primitive
 * @param {Record<string, number>} vars Dictionary of variable values (e.g. { t: 1.5, s: 1.5 })
 * @returns {number} Evaluated numerical value
 */
function evaluateMathJson(node: unknown, vars: Record<string, number>): number {
	if (typeof node === "number") {
		return node;
	}

	if (typeof node === "string") {
		if (node === "Pi" || node === "pi" || node === "\\pi") {
			return Math.PI;
		}
		if (node === "ExponentialE" || node === "e") {
			return Math.E;
		}
		if (node in vars) {
			return vars[node];
		}
		const parsedNum = Number.parseFloat(node);
		return Number.isNaN(parsedNum) ? 0 : parsedNum;
	}

	if (node !== null && typeof node === "object") {
		if (
			"num" in node &&
			typeof (node as { num: unknown }).num === "string"
		) {
			const n = Number.parseFloat((node as { num: string }).num);
			return Number.isNaN(n) ? 0 : n;
		}
		if (
			"sym" in node &&
			typeof (node as { sym: unknown }).sym === "string"
		) {
			return evaluateMathJson((node as { sym: string }).sym, vars);
		}
		if ("fn" in node && Array.isArray((node as { fn: unknown }).fn)) {
			return evaluateMathJson((node as { fn: unknown[] }).fn, vars);
		}
	}

	if (!Array.isArray(node) || node.length === 0) {
		return 0;
	}

	const [head, ...args] = node;
	const op = typeof head === "string" ? head : "";

	switch (op) {
		case "Add": {
			return args.reduce<number>(
				(sum, arg) => sum + evaluateMathJson(arg, vars),
				0,
			);
		}
		case "Subtract": {
			if (args.length === 0) return 0;
			if (args.length === 1) return -evaluateMathJson(args[0], vars);
			const first = evaluateMathJson(args[0], vars);
			const rest = args
				.slice(1)
				.reduce<number>(
					(acc, arg) => acc + evaluateMathJson(arg, vars),
					0,
				);
			return first - rest;
		}
		case "InvisibleOperator":
		case "Multiply": {
			return args.reduce<number>(
				(prod, arg) => prod * evaluateMathJson(arg, vars),
				1,
			);
		}
		case "Divide":
		case "Rational": {
			if (args.length < 2) return 0;
			const num = evaluateMathJson(args[0], vars);
			const den = evaluateMathJson(args[1], vars);
			return den === 0 ? 0 : num / den;
		}
		case "Power": {
			if (args.length < 2) return 0;
			const base = evaluateMathJson(args[0], vars);
			const exp = evaluateMathJson(args[1], vars);
			return base ** exp;
		}
		case "Sqrt": {
			if (args.length === 0) return 0;
			return Math.sqrt(evaluateMathJson(args[0], vars));
		}
		case "Root": {
			if (args.length < 2) return 0;
			const radicand = evaluateMathJson(args[0], vars);
			const index = evaluateMathJson(args[1], vars);
			return index === 0 ? 0 : radicand ** (1 / index);
		}
		case "Negate": {
			if (args.length === 0) return 0;
			return -evaluateMathJson(args[0], vars);
		}
		case "Exp": {
			if (args.length === 0) return 0;
			return Math.exp(evaluateMathJson(args[0], vars));
		}
		case "Cos": {
			if (args.length === 0) return 0;
			return Math.cos(evaluateMathJson(args[0], vars));
		}
		case "Sin": {
			if (args.length === 0) return 0;
			return Math.sin(evaluateMathJson(args[0], vars));
		}
		case "Tan": {
			if (args.length === 0) return 0;
			return Math.tan(evaluateMathJson(args[0], vars));
		}
		case "Ln":
		case "Log": {
			if (args.length === 0) return 0;
			return Math.log(evaluateMathJson(args[0], vars));
		}
		case "Abs": {
			if (args.length === 0) return 0;
			return Math.abs(evaluateMathJson(args[0], vars));
		}
		case "Delimiter":
		case "Sequence": {
			if (args.length === 0) return 0;
			return evaluateMathJson(args[0], vars);
		}
		default: {
			return 0;
		}
	}
}

/**
 * Parses LaTeX string and evaluates at numerical point t.
 *
 * Evaluates via MathJSON AST parsed from the standalone LaTeX syntax subpath.
 * @param {string} latex Student LaTeX or reference LaTeX
 * @param {number} t Time sample point
 * @returns {number} Evaluated numerical value
 */
export function evaluateLatexAt(latex: string, t: number): number {
	try {
		// Clean common LaTeX notation
		const cleaned = latex
			.replace(/\\left/g, "")
			.replace(/\\right/g, "")
			.replace(/u\(t\)/g, "1") // step function assumed positive t > 0
			.replace(/u\(t-[^)]+\)/g, "1");

		// Parse into MathJSON AST via standalone LaTeX syntax subpath
		const mathJson = parse(cleaned);
		const result = evaluateMathJson(mathJson, { t, s: t });

		if (
			typeof result === "number" &&
			!Number.isNaN(result) &&
			Number.isFinite(result)
		) {
			return result;
		}

		return 0;
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
