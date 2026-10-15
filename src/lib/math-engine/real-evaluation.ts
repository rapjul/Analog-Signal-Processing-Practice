/** Small, strict MathJSON evaluators shared by plots and answer validation. */

/** Real assignments for the allowed independent symbols. */
type Bindings = Record<string, number>;

/** A supported AST operation, returning null when it cannot be evaluated. */
type Operation = (args: unknown[], vars: Bindings) => number | null;

/**
 * Resolves a constant or assigned symbol without inventing unknown values.
 * @param symbol - Symbol name.
 * @param vars - Explicit assignments.
 * @returns Assigned value, known constant, or null.
 */
function resolveSymbol(symbol: string, vars: Bindings): number | null {
	if (["Pi", "pi", "\\pi"].includes(symbol)) return Math.PI;
	if (["ExponentialE", "e"].includes(symbol)) return Math.E;
	return symbol in vars ? (vars[symbol] ?? null) : null;
}

/**
 * Resolves primitive numbers and plain strings, retaining legacy numeric strings.
 * @param node - Scalar AST node.
 * @param vars - Explicit assignments.
 * @returns Real value or null.
 */
function evaluatePrimitive(node: unknown, vars: Bindings): number | null {
	if (typeof node === "number") return Number.isFinite(node) ? node : null;
	if (typeof node !== "string") return null;
	const symbol = resolveSymbol(node, vars);
	if (symbol !== null) return symbol;
	const value = Number(node);
	return Number.isFinite(value) ? value : null;
}

/**
 * Unwraps boxed MathJSON values and functions without changing their semantics.
 * @param node - Boxed AST node.
 * @param vars - Explicit assignments.
 * @returns Evaluated number or null.
 */
function evaluateBoxed(node: object, vars: Bindings): number | null {
	if ("num" in node && typeof node.num === "string") {
		const value = Number(node.num);
		return Number.isFinite(value) ? value : null;
	}
	if ("sym" in node && typeof node.sym === "string")
		return resolveSymbol(node.sym, vars);
	if ("fn" in node && Array.isArray(node.fn))
		return evaluateRealExpression(node.fn, vars);
	return null;
}

/**
 * Evaluates one required operand.
 * @param args - Operation arguments.
 * @param vars - Explicit assignments.
 * @returns First operand or null if absent.
 */
function firstOperand(args: unknown[], vars: Bindings): number | null {
	return args[0] === undefined ? null : evaluateRealExpression(args[0], vars);
}

/**
 * Applies a real unary operation to its first argument.
 * @param operation - Numeric operation with its domain guards.
 * @returns AST evaluator for that operation.
 */
function unary(operation: (value: number) => number | null): Operation {
	/**
	 * Evaluates a unary AST operation.
	 * @param args - AST arguments.
	 * @param vars - Explicit assignments.
	 * @returns Unary value or null.
	 */
	return (args, vars) => {
		const value = firstOperand(args, vars);
		return value === null ? null : operation(value);
	};
}

/**
 * Applies a real binary operation after both arguments are verified.
 * @param operation - Numeric operation with its domain guards.
 * @returns AST evaluator for that operation.
 */
function binary(
	operation: (left: number, right: number) => number | null,
): Operation {
	/**
	 * Evaluates a binary AST operation.
	 * @param args - AST arguments.
	 * @param vars - Explicit assignments.
	 * @returns Binary value or null.
	 */
	return (args, vars) => {
		if (args[1] === undefined) return null;
		const left = firstOperand(args, vars),
			right = evaluateRealExpression(args[1], vars);
		return left === null || right === null ? null : operation(left, right);
	};
}

/**
 * Reduces an addition or multiplication while rejecting every unknown operand.
 * @param args - AST arguments.
 * @param vars - Explicit assignments.
 * @param multiply - Whether to multiply instead of adding.
 * @returns Reduction result or null.
 */
function reduceOperands(
	args: unknown[],
	vars: Bindings,
	multiply: boolean,
): number | null {
	let result = multiply ? 1 : 0;
	for (const arg of args) {
		const value = evaluateRealExpression(arg, vars);
		if (value === null) return null;
		result = multiply ? result * value : result + value;
	}
	return result;
}

/**
 * Handles unary negation and multi-argument subtraction.
 * @param args - AST arguments.
 * @param vars - Explicit assignments.
 * @returns Difference or null.
 */
function subtract(args: unknown[], vars: Bindings): number | null {
	const first = firstOperand(args, vars);
	if (first === null) return null;
	if (args.length === 1) return -first;
	let result = first;
	for (const arg of args.slice(1)) {
		const value = evaluateRealExpression(arg, vars);
		if (value === null) return null;
		result -= value;
	}
	return result;
}

/**
 * Checks a numerical operation result.
 * @param value - Candidate numeric result.
 * @returns Finite result or null.
 */
function finiteReal(value: number): number | null {
	return Number.isFinite(value) ? value : null;
}

/**
 * Evaluates common or explicitly based logarithms without discarding the base.
 * @param args - Argument and optional base, using ten when absent.
 * @param vars - Explicit numerical assignments.
 * @returns Finite real logarithm or null for invalid arity or domain.
 */
function logarithm(args: unknown[], vars: Bindings): number | null {
	if (args.length < 1 || args.length > 2) return null;
	const value = firstOperand(args, vars);
	const base = args.length === 1 ? 10 : evaluateRealExpression(args[1], vars);
	if (
		value === null ||
		base === null ||
		value <= 0 ||
		base <= 0 ||
		base === 1
	)
		return null;
	return finiteReal(Math.log(value) / Math.log(base));
}

/** Supported operations; dispatch keeps each domain rule independently readable. */
const operations: Record<string, Operation> = {
	/**
	 * @param args - Addends.
	 * @param vars - Explicit assignments.
	 * @returns Their sum.
	 */
	Add: (args, vars) => reduceOperands(args, vars, false),
	/**
	 * @param args - Factors.
	 * @param vars - Explicit assignments.
	 * @returns Their product.
	 */
	Multiply: (args, vars) => reduceOperands(args, vars, true),
	/**
	 * @param args - Juxtaposed factors.
	 * @param vars - Explicit assignments.
	 * @returns Their product.
	 */
	InvisibleOperator: (args, vars) => reduceOperands(args, vars, true),
	Subtract: subtract,
	/**
	 * @param a - Dividend.
	 * @param b - Divisor.
	 * @returns Quotient or null.
	 */
	Divide: binary((a, b) => (b === 0 ? null : a / b)),
	/**
	 * @param a - Numerator.
	 * @param b - Denominator.
	 * @returns Fraction or null.
	 */
	Rational: binary((a, b) => (b === 0 ? null : a / b)),
	/**
	 * @param a - Base.
	 * @param b - Exponent.
	 * @returns Finite power or null.
	 */
	Power: binary((a, b) => finiteReal(a ** b)),
	/**
	 * @param value - Radicand.
	 * @returns Real square root or null.
	 */
	Sqrt: unary((value) => (value < 0 ? null : Math.sqrt(value))),
	/**
	 * @param a - Radicand.
	 * @param b - Root index.
	 * @returns Real root or null.
	 */
	Root: binary((a, b) => (b === 0 ? null : finiteReal(a ** (1 / b)))),
	/**
	 * @param value - Operand.
	 * @returns Its negation.
	 */
	Negate: unary((value) => -value),
	/**
	 * @param value - Exponent.
	 * @returns Finite exponential or null.
	 */
	Exp: unary((value) => finiteReal(Math.exp(value))),
	Cos: unary(Math.cos),
	Sin: unary(Math.sin),
	Tan: unary(Math.tan),
	/**
	 * @param value - Logarithm argument.
	 * @returns Real logarithm or null.
	 */
	Ln: unary((value) => (value <= 0 ? null : Math.log(value))),
	Log: logarithm,
	/**
	 * @param value - Positive argument.
	 * @returns Binary logarithm or null.
	 */
	Lb: unary((value) => (value <= 0 ? null : Math.log2(value))),
	/**
	 * @param value - Positive argument.
	 * @returns Common logarithm or null.
	 */
	Lg: unary((value) => (value <= 0 ? null : Math.log10(value))),
	Abs: unary(Math.abs),
	/**
	 * @param args - Unit-step argument.
	 * @param vars - Explicit assignments.
	 * @returns Unit-step value or null.
	 */
	Heaviside: (args, vars) =>
		args.length === 1
			? unary((value) => (value >= 0 ? 1 : 0))(args, vars)
			: null,
	/**
	 * @param args - Sequence entries.
	 * @param vars - Explicit assignments.
	 * @returns Only a singleton scalar.
	 */
	Sequence: (args, vars) =>
		args.length === 1 ? firstOperand(args, vars) : null,
	Delimiter: firstOperand,
};

/**
 * Evaluates a MathJSON scalar through focused primitive, boxed, and operation handlers.
 * @param node - MathJSON AST node or primitive.
 * @param vars - Explicit independent-variable assignments.
 * @returns Real value or null for unsupported syntax.
 */
export function evaluateRealExpression(
	node: unknown,
	vars: Bindings,
): number | null {
	if (Array.isArray(node)) {
		const [head, ...args] = node;
		const operation =
			typeof head === "string" && Object.hasOwn(operations, head)
				? operations[head]
				: undefined;
		return typeof operation === "function" ? operation(args, vars) : null;
	}
	if (node !== null && typeof node === "object")
		return evaluateBoxed(node, vars);
	return evaluatePrimitive(node, vars);
}
