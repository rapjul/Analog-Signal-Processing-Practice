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
function evaluateMathJsonStrict(
	node: unknown,
	vars: Record<string, number>,
): number | null {
	if (typeof node === "number") {
		return Number.isFinite(node) ? node : null;
	}

	if (typeof node === "string") {
		if (node === "Pi" || node === "pi" || node === "\\pi") {
			return Math.PI;
		}
		if (node === "ExponentialE" || node === "e") {
			return Math.E;
		}
		if (node in vars) {
			return vars[node] ?? null;
		}
		const parsedNum = Number(node);
		return Number.isFinite(parsedNum) ? parsedNum : null;
	}

	if (node !== null && typeof node === "object") {
		if (
			"num" in node &&
			typeof (node as { num: unknown }).num === "string"
		) {
			const parsed = Number((node as { num: string }).num);
			return Number.isFinite(parsed) ? parsed : null;
		}
		if (
			"sym" in node &&
			typeof (node as { sym: unknown }).sym === "string"
		) {
			const sym = (node as { sym: string }).sym;
			if (sym === "Pi" || sym === "pi" || sym === "\\pi") return Math.PI;
			if (sym === "ExponentialE" || sym === "e") return Math.E;
			if (sym in vars) return vars[sym] ?? null;
			return null;
		}
		if ("fn" in node && Array.isArray((node as { fn: unknown }).fn)) {
			return evaluateMathJsonStrict((node as { fn: unknown[] }).fn, vars);
		}
	}

	if (!Array.isArray(node) || node.length === 0) {
		return null;
	}

	const [head, ...args] = node;
	const op = typeof head === "string" ? head : "";

	switch (op) {
		case "Add": {
			let result = 0;
			for (const arg of args) {
				const value = evaluateMathJsonStrict(arg, vars);
				if (value === null) return null;
				result += value;
			}
			return result;
		}
		case "Subtract": {
			if (args.length === 0 || args[0] === undefined) return null;
			const first = evaluateMathJsonStrict(args[0], vars);
			if (first === null) return null;
			if (args.length === 1) return -first;
			let result = first;
			for (const arg of args.slice(1)) {
				const value = evaluateMathJsonStrict(arg, vars);
				if (value === null) return null;
				result -= value;
			}
			return result;
		}
		case "InvisibleOperator":
		case "Multiply": {
			let result = 1;
			for (const arg of args) {
				const value = evaluateMathJsonStrict(arg, vars);
				if (value === null) return null;
				result *= value;
			}
			return result;
		}
		case "Divide":
		case "Rational": {
			if (
				args.length < 2 ||
				args[0] === undefined ||
				args[1] === undefined
			)
				return null;
			const num = evaluateMathJsonStrict(args[0], vars);
			const den = evaluateMathJsonStrict(args[1], vars);
			if (num === null || den === null || den === 0) return null;
			return num / den;
		}
		case "Power": {
			if (
				args.length < 2 ||
				args[0] === undefined ||
				args[1] === undefined
			)
				return null;
			const base = evaluateMathJsonStrict(args[0], vars);
			const exp = evaluateMathJsonStrict(args[1], vars);
			if (base === null || exp === null) return null;
			const result = base ** exp;
			return Number.isFinite(result) ? result : null;
		}
		case "Sqrt": {
			if (args.length === 0 || args[0] === undefined) return null;
			const value = evaluateMathJsonStrict(args[0], vars);
			if (value === null || value < 0) return null;
			return Math.sqrt(value);
		}
		case "Root": {
			if (
				args.length < 2 ||
				args[0] === undefined ||
				args[1] === undefined
			)
				return null;
			const radicand = evaluateMathJsonStrict(args[0], vars);
			const index = evaluateMathJsonStrict(args[1], vars);
			if (radicand === null || index === null || index === 0) return null;
			const result = radicand ** (1 / index);
			return Number.isFinite(result) ? result : null;
		}
		case "Negate": {
			if (args.length === 0 || args[0] === undefined) return null;
			const value = evaluateMathJsonStrict(args[0], vars);
			return value === null ? null : -value;
		}
		case "Exp": {
			if (args.length === 0 || args[0] === undefined) return null;
			const value = evaluateMathJsonStrict(args[0], vars);
			if (value === null) return null;
			const result = Math.exp(value);
			return Number.isFinite(result) ? result : null;
		}
		case "Cos":
		case "Sin":
		case "Tan": {
			if (args.length === 0 || args[0] === undefined) return null;
			const value = evaluateMathJsonStrict(args[0], vars);
			if (value === null) return null;
			return op === "Cos"
				? Math.cos(value)
				: op === "Sin"
					? Math.sin(value)
					: Math.tan(value);
		}
		case "Ln":
		case "Log": {
			if (args.length === 0 || args[0] === undefined) return null;
			const value = evaluateMathJsonStrict(args[0], vars);
			if (value === null || value <= 0) return null;
			return Math.log(value);
		}
		case "Abs": {
			if (args.length === 0 || args[0] === undefined) return null;
			const value = evaluateMathJsonStrict(args[0], vars);
			return value === null ? null : Math.abs(value);
		}
		case "Heaviside": {
			if (args.length !== 1) return null;
			const value = evaluateMathJsonStrict(args[0], vars);
			return value === null ? null : value >= 0 ? 1 : 0;
		}
		case "Sequence": {
			// A list is not a scalar answer, even when its first entry matches.
			return args.length === 1
				? evaluateMathJsonStrict(args[0], vars)
				: null;
		}
		case "Delimiter": {
			if (args.length === 0 || args[0] === undefined) return null;
			return evaluateMathJsonStrict(args[0], vars);
		}
		default: {
			return null;
		}
	}
}

/**
 * Strictly parses and evaluates a LaTeX expression at one value of `t`.
 *
 * Unlike `evaluateLatexAt`, this function reports malformed or unsupported
 * expressions as `null`, so an invalid answer can never be accepted as zero.
 *
 * @param latex - Student LaTeX or mathematical input.
 * @param t - Time value assigned to the expression variable.
 * @returns Finite evaluated value, or `null` when parsing/evaluation fails.
 */
export function tryEvaluateLatexAt(latex: string, t: number): number | null {
	if (!latex.trim()) return null;
	try {
		// Preserve unit-step support before legacy normalization assumes positive time.
		const expression = latex
			.trim()
			.replace(/^y\s*\(\s*t\s*\)\s*=\s*/, "")
			.replace(/\\left|\\right/g, "")
			.replace(
				/\\(?:operatorname|text|mathrm)\s*\{[^{}]*\}|\\[a-zA-Z]+|(?<![a-zA-Z])[ts]?u\s*(?=\()/g,
				/**
				 * Rewrites time-variable step shorthand while preserving named/text commands.
				 * @param token - Command or bare unit-step token.
				 * @returns Original command or explicit Heaviside operator.
				 */
				(token: string): string =>
					token.startsWith("\\")
						? token
						: token.replace(/u\s*$/, "\\operatorname{Heaviside}"),
			);
		const mathJson = parse(normalizeMathLatex(expression, false));
		const result = evaluateMathJsonStrict(mathJson, { t, s: t });
		return result !== null && Number.isFinite(result) ? result : null;
	} catch {
		return null;
	}
}

/**
 * Normalizes student or system LaTeX strings for robust MathJSON parsing.
 * Converts bare function names (cos, sin, exp) to LaTeX syntax (\cos, \sin, \exp)
 * and resolves common constant tokenizations such as 'pi' and 'pit' -> '\pi t'.
 * @param {string} latex Raw input LaTeX or mathematical string
 * @param {boolean} assumePositiveUnitSteps Whether to retain legacy positive-time step flattening; strict grading disables it.
 * @returns {string} Normalized LaTeX string
 */
export function normalizeMathLatex(
	latex: string,
	assumePositiveUnitSteps = true,
): string {
	if (!latex) return "";
	let normalized = latex
		.replace(/\\left/g, "")
		.replace(/\\right/g, "")
		.replace(/\\cdot/g, " * ")
		.replace(/\\times/g, " * ");
	if (assumePositiveUnitSteps) {
		normalized = normalized
			.replace(/u\(t\)/g, "1")
			.replace(/u\(t-[^)]+\)/g, "1");
	}

	return (
		normalized
			// Convert bare 'pi' followed by a variable (e.g. 100pit -> 100\pi t, pit -> \pi t)
			.replace(/(^|[^a-zA-Z\\])pi([a-zA-Z])(?=[^a-zA-Z]|$)/g, "$1\\pi $2")
			// Convert standalone bare 'pi' (e.g. 100pi t -> 100\pi t, 2*pi -> 2*\pi)
			.replace(/(^|[^a-zA-Z\\])pi(?=[^a-zA-Z]|$)/g, "$1\\pi")
			// Convert bare functions without leading backslash (e.g. cos, sin, tan, exp, sqrt, ln, log)
			.replace(
				/(^|[^a-zA-Z\\])(cos|sin|tan|exp|sqrt|ln|log)(?=[^a-zA-Z]|$)/g,
				"$1\\$2",
			)
	);
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
		// Clean and normalize LaTeX notation
		const cleaned = normalizeMathLatex(latex);

		// Parse into MathJSON AST via standalone LaTeX syntax subpath
		const mathJson = parse(cleaned);
		const result = evaluateMathJsonStrict(mathJson, { t, s: t });

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

	for (const t of samplePoints) {
		const studentVal = tryEvaluateLatexAt(studentLatex, t);
		const refVal = refEval(t);
		// Unevaluable input must not inherit the legacy plotting fallback of zero.
		if (studentVal === null || !Number.isFinite(refVal)) {
			return {
				isCorrect: false,
				score: 0,
				message:
					"The answer could not be evaluated at every sample point.",
			};
		}

		const diff = Math.abs(studentVal - refVal);
		maxDiff = Math.max(maxDiff, diff);
	}

	if (maxDiff > tolerance * 10) {
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
		.replace(/\\leq/g, "<=")
		.replace(/\\geq/g, ">=")
		.replace(/\\le/g, "<=")
		.replace(/\\ge/g, ">=")
		.replace(/\\lt/g, "<")
		.replace(/\\gt/g, ">")
		.replace(/\\text\{for\}/g, "")
		.replace(/\\quad/g, "")
		.trim();

	// Match between: a <= t <= b or a <= t < b or a < t < b
	const betweenMatch = cleaned.match(
		/^(-?\d+(?:\.\d+)?)\s*(<=|<)\s*t\s*(<=|<)\s*(-?\d+(?:\.\d+)?)$/,
	);
	if (
		betweenMatch &&
		betweenMatch[1] &&
		betweenMatch[2] &&
		betweenMatch[3] &&
		betweenMatch[4]
	) {
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
	if (tLessMatch && tLessMatch[1] && tLessMatch[2]) {
		const op = tLessMatch[1];
		const val = Number.parseFloat(tLessMatch[2]);
		return op === "<=" ? t <= val : t < val;
	}

	// Match t > a or t >= a
	const tGreaterMatch = cleaned.match(/^t\s*(>=|>)\s*(-?\d+(?:\.\d+)?)$/);
	if (tGreaterMatch && tGreaterMatch[1] && tGreaterMatch[2]) {
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
	if (!match || !match[1]) {
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
			exprPart = (parts[0] ?? "").trim().replace(/[,;]$/, "").trim();
			condPart = parts.slice(1).join("&").trim();
		} else if (row.includes("\\text{for}")) {
			const parts = row.split("\\text{for}");
			exprPart = (parts[0] ?? "")
				.trim()
				.replace(/\\quad$/, "")
				.replace(/[,;]$/, "")
				.trim();
			condPart = (parts[1] ?? "").trim();
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
	tolerance = 0.05,
): boolean {
	if (!studentLatex?.trim()) {
		return false;
	}

	const [tMin = -2, tMax = 6] = timeRange;
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
