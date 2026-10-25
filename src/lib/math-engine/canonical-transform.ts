/**
 * Bounded canonical transform algebra; numerical samples cannot certify
 * identity.
 */
import {
	CanonicalError,
	coefficientMatches,
	constantFactor,
	type Factor,
	factorAt,
	factorMatches,
	limitError,
	literalScalar,
	type Polynomial,
	polynomial,
	polynomialAdd,
	polynomialEqual,
	polynomialScale,
	RationalFunction,
	type Scalar,
	scalar,
	scalarAbs,
	scalarConstantPower,
	scalarExp,
	scalarField,
	scalarLog,
	scalarNumeric,
	scalarRoot,
	symbolicE,
	symbolicPi,
} from "$lib/math-engine/canonical-algebra";
import { Complex } from "$lib/math-engine/complex";

/** Shared default unsupported-form diagnostic for domain-specific guidance. */
export const UNSUPPORTED_FORM_MESSAGE =
	"This expression is outside the supported answer forms. Use the standard transform form.";

/** Rational coefficient multiplying an exponential of a polynomial. */
export interface CanonicalTerm {
	/** Reduced rational factor. */ factor: Factor;
	/** Polynomial exponent, with its constant extracted into the factor. */ exponent: Polynomial<Scalar>;
}

/** Exact impulse location and symbolic complex weight. */
export interface CanonicalImpulse {
	/** Exact frequency coordinate. */ location: Scalar;
	/** Distribution coefficient. */ weight: Scalar;
}

/** Canonical regular terms and independently represented distributions. */
export interface CanonicalSpectrum {
	/** Rational-exponential basis terms. */ terms: CanonicalTerm[];
	/** Weighted impulses; no sampled peaks. */ impulses: CanonicalImpulse[];
}

/** Required independent target and submitted expression representation. */
export interface CanonicalTransform {
	/** Allowed independent symbol. */ variable: "t" | "omega" | "s";
	/** Expression on the negative half-line. */ left: CanonicalSpectrum;
	/** Expression on the positive half-line. */ right: CanonicalSpectrum;
}

/** Explicit variable and half-line for support normalization. */
interface Context {
	/** Allowed variable. */ variable: "t" | "omega" | "s";
	/** Enables time-domain distributions only for the explicit Laplace verifier. */ laplace?: boolean;
	/** Negative or positive open half-line. */ side: -1 | 1;
	/** Optional open interval used only by convolution verification. */ interval?: CanonicalInterval;
}

/** Exact finite endpoints or infinite limits of an open verification interval. */
export interface CanonicalInterval {
	/** Lower time limit. */ min: number;
	/** Upper time limit. */ max: number;
	/** Exact lower endpoint when its numeric projection is rounded. */ minExact?:
		Scalar | undefined;
	/** Exact upper endpoint when its numeric projection is rounded. */ maxExact?:
		Scalar | undefined;
}

/** @returns Empty regular/distribution sum. */
function empty(): CanonicalSpectrum {
	return { terms: [], impulses: [] };
}

/** @returns Accessible failure for operations outside the verification language. */
function unsupported(): CanonicalError {
	return new CanonicalError("unsupported", UNSUPPORTED_FORM_MESSAGE);
}

/**
 * @param value - Exact coefficient.
 * @returns Constant spectrum, retaining exact nonzero values.
 */
function constant(value: Scalar): CanonicalSpectrum {
	return scalarField.isZero(value)
		? empty()
		: {
				terms: [{ factor: constantFactor(value), exponent: [] }],
				impulses: [],
			};
}

/**
 * @param left - First spectrum.
 * @param right - Second spectrum.
 * @returns Exactly collected sum.
 */
function add(
	left: CanonicalSpectrum,
	right: CanonicalSpectrum,
): CanonicalSpectrum {
	if (
		left.terms.length + right.terms.length > 64 ||
		left.impulses.length + right.impulses.length > 64
	)
		throw limitError();
	const terms: CanonicalTerm[] = [];
	for (const term of [...left.terms, ...right.terms]) {
		const previous = terms.find(
			/**
			 * @param candidate - Previously collected basis term.
			 * @returns Exact exponent identity.
			 */
			(candidate) =>
				polynomialEqual(candidate.exponent, term.exponent, scalarField),
		);
		if (previous) previous.factor = previous.factor.add(term.factor);
		else terms.push({ ...term });
	}
	const impulses: CanonicalImpulse[] = [];
	for (const term of [...left.impulses, ...right.impulses]) {
		const previous = impulses.find(
			/**
			 * @param candidate - Previously collected impulse.
			 * @returns Exact coordinate identity.
			 */
			(candidate) => candidate.location.equals(term.location),
		);
		if (previous) previous.weight = previous.weight.add(term.weight);
		else impulses.push({ ...term });
	}
	return {
		terms: terms.filter(
			/**
			 * @param term - Collected basis term.
			 * @returns Exact nonzero test.
			 */
			(term) => term.factor.numerator.length !== 0,
		),
		impulses: impulses.filter(
			/**
			 * @param term - Collected impulse.
			 * @returns Exact nonzero test.
			 */
			(term) => !scalarField.isZero(term.weight),
		),
	};
}

/**
 * @param exponent - Polynomial with a possible constant.
 * @param factor - Rational prefactor.
 * @returns Normalized term.
 */
function term(exponent: Polynomial<Scalar>, factor: Factor): CanonicalTerm {
	const value = exponent[0] ?? scalar(0);
	if (!scalarField.isZero(value)) {
		factor = factor.multiply(constantFactor(constantExponential(value)));
	}
	const result = [...exponent];
	if (result.length) result[0] = scalar(0);
	return { factor, exponent: polynomial(result, scalarField) };
}

/**
 * Recognizes exact quarter-turn phases without introducing floating-point residue.
 * @param value - Symbolic exponential argument.
 * @returns Exact unit rotation or null for other constant arguments.
 */
function exactRotation(value: Scalar): Scalar | null {
	const single = value.singleAtom("pi");
	if (!single) return null;
	const coefficient = single[1];
	if (coefficient.re.numerator !== 0n) return null;
	const n = coefficient.im.numerator * 2n,
		d = coefficient.im.denominator;
	if (n % d !== 0n) return null;
	const index = Number((((n / d) % 4n) + 4n) % 4n);
	return [scalar(1), scalar(0, 1), scalar(-1), scalar(0, -1)][index]!;
}

/**
 * Extracts finite constant exponential coefficients without erasing underflowed terms.
 * @param value - Constant exponent.
 * @returns Exact quarter turn or finite computed coefficient.
 */
function constantExponential(value: Scalar): Scalar {
	const rotation = exactRotation(value);
	if (rotation) return rotation;
	return scalarExp(value);
}

/**
 * @param coefficients - Variable polynomial.
 * @param point - Exact assignment.
 * @returns Exact polynomial value.
 */
function polynomialAt(coefficients: Polynomial<Scalar>, point: Scalar): Scalar {
	let result = scalar(0);
	for (let index = coefficients.length - 1; index >= 0; index--)
		result = result.multiply(point).add(coefficients[index]!);
	return result;
}

/**
 * @param spectrum - Smooth expression.
 * @param point - Impulse coordinate.
 * @returns Distribution multiplier at that coordinate.
 */
function at(spectrum: CanonicalSpectrum, point: Scalar): Scalar {
	if (spectrum.impulses.length) throw unsupported();
	let result = scalar(0);
	for (const item of spectrum.terms) {
		let coefficient = finiteFactorAt(item.factor, point);
		const phase = polynomialAt(item.exponent, point);
		if (!scalarField.isZero(phase)) {
			coefficient = coefficient.multiply(constantExponential(phase));
		}
		result = result.add(coefficient);
	}
	return result;
}

/**
 * Refuses point assignments requiring a limit across distinct exponential terms.
 * @param factor - Reduced rational multiplier.
 * @param point - Exact assignment, including an impulse location.
 * @returns Finite symbolic value or an honest unsupported-limit diagnostic.
 */
function finiteFactorAt(factor: Factor, point: Scalar): Scalar {
	try {
		return factorAt(factor, point);
	} catch (error) {
		if (error instanceof CanonicalError && error.status === "invalid")
			throw unsupported();
		throw error;
	}
}

/**
 * @param left - First spectrum.
 * @param right - Second spectrum.
 * @returns Expanded exact product.
 */
function multiply(
	left: CanonicalSpectrum,
	right: CanonicalSpectrum,
): CanonicalSpectrum {
	if (left.impulses.length && right.impulses.length) throw unsupported();
	if (left.terms.length * right.terms.length > 64) throw limitError();
	let result = empty();
	for (const a of left.terms)
		for (const b of right.terms)
			result = add(result, {
				terms: [
					term(
						polynomialAdd(a.exponent, b.exponent, scalarField),
						a.factor.multiply(b.factor),
					),
				],
				impulses: [],
			});
	for (const impulse of left.impulses)
		result = add(result, {
			terms: [],
			impulses: [
				{
					...impulse,
					weight: impulse.weight.multiply(
						at(right, impulse.location),
					),
				},
			],
		});
	for (const impulse of right.impulses)
		result = add(result, {
			terms: [],
			impulses: [
				{
					...impulse,
					weight: impulse.weight.multiply(at(left, impulse.location)),
				},
			],
		});
	return result;
}

/**
 * @param value - Denominator.
 * @returns Reciprocal of a single rational-exponential term.
 */
function reciprocal(value: CanonicalSpectrum): CanonicalSpectrum {
	if (value.impulses.length || value.terms.length > 1) throw unsupported();
	const item = value.terms[0];
	if (!item)
		throw new CanonicalError("invalid", "The answer divides by zero.");
	return {
		terms: [
			term(
				polynomialScale(item.exponent, scalar(-1), scalarField),
				constantFactor(scalar(1)).divide(item.factor),
			),
		],
		impulses: [],
	};
}

/**
 * @param value - Canonical value.
 * @returns Variable-independent scalar or unsupported diagnostic.
 */
function asConstant(value: CanonicalSpectrum): Scalar {
	if (!value.terms.length && !value.impulses.length) return scalar(0);
	if (value.impulses.length || value.terms.length !== 1) throw unsupported();
	const item = value.terms[0]!;
	if (
		item.exponent.length ||
		item.factor.numerator.length > 1 ||
		item.factor.denominator.length !== 1
	)
		throw unsupported();
	return item.factor.numerator[0] ?? scalar(0);
}

/**
 * @param value - Canonical expression.
 * @param maximumDegree - Permitted polynomial degree.
 * @returns Exact variable polynomial.
 */
function asPolynomial(
	value: CanonicalSpectrum,
	maximumDegree: number,
): Polynomial<Scalar> {
	if (!value.terms.length && !value.impulses.length) return [];
	if (value.impulses.length || value.terms.length !== 1) throw unsupported();
	const item = value.terms[0]!;
	if (
		item.exponent.length ||
		item.factor.denominator.length !== 1 ||
		item.factor.numerator.length > maximumDegree + 1
	)
		throw unsupported();
	return item.factor.numerator;
}

/**
 * @param node - Scalar AST operand.
 * @param context - Explicit domain.
 * @returns Constant scalar after full operand validation.
 */
function constantNode(node: unknown, context: Context): Scalar {
	return asConstant(normalize(node, context));
}

/**
 * Preserves the parser's distinction between natural, common, and based logarithms.
 * @param args - Constant argument and optional explicit base.
 * @param context - Allowed variable and half-line.
 * @param op - Parsed logarithm name.
 * @returns Constant logarithm with every domain checked before cancellation.
 */
function logarithm(
	args: unknown[],
	context: Context,
	op: string,
): CanonicalSpectrum {
	const value = constantNode(args[0], context);
	if (op === "Ln") return constant(scalarLog(value));
	const base =
		op === "Log" && args.length === 2
			? constantNode(args[1], context)
			: scalar(op === "Lb" ? 2 : 10);
	return constant(scalarLog(value).divide(scalarLog(base)));
}

/**
 * @param exponent - Constant exponent.
 * @returns Bounded exact integer, or null for noninteger forms.
 */
function integer(exponent: Scalar): number | null {
	const value = exponent.rational();
	if (!value) return null;
	if (value.im.numerator !== 0n || value.re.denominator !== 1n) return null;
	if (value.re.numerator > 4096n || value.re.numerator < -4096n)
		throw limitError();
	return Number(value.re.numerator);
}

/**
 * @param base - Fully validated base.
 * @param exponent - Bounded integer.
 * @returns Expanded exact power.
 */
function integerPower(
	base: CanonicalSpectrum,
	exponent: number,
): CanonicalSpectrum {
	if (Math.abs(exponent) > 16) throw limitError();
	if (base.impulses.length) throw unsupported();
	if (exponent === 0 && !base.terms.length)
		throw new CanonicalError(
			"invalid",
			"An undefined power appears in the answer.",
		);
	let result = constant(scalar(1)),
		factor = exponent < 0 ? reciprocal(base) : base;
	for (let count = 0; count < Math.abs(exponent); count++)
		result = multiply(result, factor);
	return result;
}

/**
 * @param exponent - Polynomial exponent.
 * @returns Bounded exponential basis term.
 */
function exponential(exponent: Polynomial<Scalar>): CanonicalSpectrum {
	return { terms: [term(exponent, constantFactor(scalar(1)))], impulses: [] };
}

/**
 * @param args - Base and exponent.
 * @param context - Explicit domain.
 * @returns Supported exact power or exponential form.
 */
function power(args: unknown[], context: Context): CanonicalSpectrum {
	const base = normalize(args[0], context),
		exponent = normalize(args[1], context);
	const baseSymbol = unbox(args[0]);
	if (baseSymbol === "ExponentialE" || baseSymbol === "e")
		return exponential(asPolynomial(exponent, 2));
	let exponentConstant: Scalar | null = null;
	try {
		exponentConstant = asConstant(exponent);
	} catch (error) {
		if (
			!(error instanceof CanonicalError) ||
			error.status !== "unsupported"
		)
			throw error;
	}
	if (exponentConstant) return constantExponentPower(base, exponentConstant);
	if (asConstant(base).requireRealSign() !== 1) throw unsupported();
	return exponential(
		polynomialScale(
			asPolynomial(exponent, 2),
			scalarLog(asConstant(base)),
			scalarField,
		),
	);
}

/**
 * Evaluates constant-exponent powers without expanding unbounded variable powers.
 * @param base - Fully validated base.
 * @param exponent - Exact constant exponent.
 * @returns Supported integer expansion or finite constant result.
 */
function constantExponentPower(
	base: CanonicalSpectrum,
	exponent: Scalar,
): CanonicalSpectrum {
	const count = integer(exponent);
	if (count !== null && Math.abs(count) <= 16)
		return integerPower(base, count);
	return constant(scalarConstantPower(asConstant(base), exponent));
}

/**
 * @param args - Function arguments.
 * @param op - Trigonometric operation.
 * @param context - Domain.
 * @returns Euler-normalized affine sine or cosine.
 */
function trigonometric(
	args: unknown[],
	op: "Sin" | "Cos",
	context: Context,
): CanonicalSpectrum {
	const argument = asPolynomial(normalize(args[0], context), 1);
	const positive = exponential(
		polynomialScale(argument, scalar(0, 1), scalarField),
	);
	const negative = exponential(
		polynomialScale(argument, scalar(0, -1), scalarField),
	);
	return multiply(
		constant(op === "Cos" ? scalar(0.5) : scalar(0, -0.5)),
		add(
			positive,
			multiply(constant(op === "Cos" ? scalar(1) : scalar(-1)), negative),
		),
	);
}

/**
 * @param args - Normalized-sinc argument.
 * @param context - Domain.
 * @returns Euler/rational sinc identity with its removable origin.
 */
function sinc(args: unknown[], context: Context): CanonicalSpectrum {
	const argument = normalize(args[0], context);
	const p = asPolynomial(argument, 1);
	if (!p.length) return constant(scalar(1));
	const scaled = polynomialScale(p, symbolicPi, scalarField);
	const denominator: CanonicalSpectrum = {
		terms: [
			{
				factor: new RationalFunction(scaled, [scalar(1)], scalarField),
				exponent: [],
			},
		],
		impulses: [],
	};
	const positive = exponential(
		polynomialScale(scaled, scalar(0, 1), scalarField),
	);
	const negative = exponential(
		polynomialScale(scaled, scalar(0, -1), scalarField),
	);
	return multiply(
		multiply(
			constant(scalar(0, -0.5)),
			add(positive, multiply(constant(scalar(-1)), negative)),
		),
		reciprocal(denominator),
	);
}

/**
 * @param args - Unit-step argument.
 * @param context - Domain and half-line.
 * @returns Exact support indicator.
 */
function step(args: unknown[], context: Context): CanonicalSpectrum {
	if (context.variable !== "t") throw unsupported();
	const p = asPolynomial(normalize(args[0], context), 1),
		slope = p[1];
	if (context.interval) return intervalStep(p, context.interval);
	if (!slope || !scalarField.isZero(p[0] ?? scalar(0))) throw unsupported();
	const sign = slope.requireRealSign();
	if (sign === 0) throw unsupported();
	return constant(scalar(sign * context.side > 0 ? 1 : 0));
}

/**
 * Folds affine support only after proving its sign throughout an open interval.
 * @param p - Affine step argument.
 * @param interval - Open verification domain.
 * @returns Constant support or an unsupported diagnostic.
 */
function intervalStep(
	p: Polynomial<Scalar>,
	interval: CanonicalInterval,
): CanonicalSpectrum {
	const slope = p[1];
	const intercept = p[0] ?? scalar(0);
	const coefficient = slope ?? scalar(0);
	const direction = coefficient.requireRealSign();
	if (direction === 0) {
		const sign = intercept.requireRealSign();
		if (sign === 0) throw unsupported();
		return constant(scalar(sign > 0 ? 1 : 0));
	}
	/**
	 * Proves the affine sign at a finite endpoint or infinite limit.
	 * @param endpoint - Finite boundary or infinite domain limit.
	 * @param exact - Exact finite coordinate when the display value is rounded.
	 * @returns Exact sign of the affine boundary value or limit.
	 */
	const endpointSign = (endpoint: number, exact?: Scalar): -1 | 0 | 1 =>
		Number.isFinite(endpoint)
			? intercept
					.add(coefficient.multiply(exact ?? scalar(endpoint)))
					.requireRealSign()
			: ((Math.sign(endpoint) * direction) as -1 | 1);
	const lower = endpointSign(interval.min, interval.minExact);
	const upper = endpointSign(interval.max, interval.maxExact);
	if (lower >= 0 && upper >= 0) return constant(scalar(1));
	if (lower <= 0 && upper <= 0) return constant(scalar(0));
	throw unsupported();
}

/**
 * @param args - Delimited argument paired with a Dirac symbol.
 * @param context - Domain.
 * @returns Exact affine impulse.
 */
function impulse(args: unknown, context: Context): CanonicalSpectrum {
	const node = unbox(args);
	if (
		(context.variable !== "omega" && !context.laplace) ||
		!Array.isArray(node) ||
		node[0] !== "Delimiter" ||
		node.length !== 2
	)
		throw unsupported();
	const p = asPolynomial(normalize(node[1], context), 1),
		slope = p[1];
	if (!slope || scalarField.isZero(slope)) throw unsupported();
	const sign = slope.requireRealSign();
	if (sign === 0 || !(p[0] ?? scalar(0)).isReal()) throw unsupported();
	return {
		terms: [],
		impulses: [
			{
				location: (p[0] ?? scalar(0)).negate().divide(slope),
				weight: scalar(sign).divide(slope),
			},
		],
	};
}

/**
 * @param args - Factors.
 * @param context - Domain.
 * @returns Validated product with paired distribution arguments.
 */
function product(args: unknown[], context: Context): CanonicalSpectrum {
	let result = constant(scalar(1));
	for (let index = 0; index < args.length; index++) {
		const item = unbox(args[index]);
		const next =
			item === "DiracDelta"
				? impulse(args[++index], context)
				: normalize(args[index], context);
		result = multiply(result, next);
	}
	return result;
}

/**
 * @param op - Sum operator.
 * @param args - Operands.
 * @param context - Domain.
 * @returns Exact signed sum.
 */
function sum(op: string, args: unknown[], context: Context): CanonicalSpectrum {
	let result = empty();
	for (let index = 0; index < args.length; index++) {
		const negative =
			op === "Negate" ||
			(op === "Subtract" && (index > 0 || args.length === 1));
		const value = normalize(args[index], context);
		result = add(
			result,
			negative ? multiply(constant(scalar(-1)), value) : value,
		);
	}
	return result;
}

/**
 * @param op - Constant-only operation.
 * @param args - Operands.
 * @param context - Domain.
 * @returns Validated finite constant value.
 */
function constantOperation(
	op: string,
	args: unknown[],
	context: Context,
): CanonicalSpectrum {
	const value = constantNode(args[0], context);
	switch (op) {
		case "Abs": {
			return constant(scalarAbs(value));
		}
		case "Sqrt":
		case "Root": {
			return constant(
				scalarRoot(
					value,
					op === "Root" ? constantNode(args[1], context) : scalar(2),
				),
			);
		}
		default: {
			throw unsupported();
		}
	}
}

/**
 * @param node - Boxed or ordinary node.
 * @returns Unwrapped MathJSON without changing semantics.
 */
function unbox(node: unknown): unknown {
	if (!node || typeof node !== "object" || Array.isArray(node)) return node;
	if ("fn" in node) return node.fn;
	if ("sym" in node) return node.sym;
	if ("num" in node) return node.num;
	throw unsupported();
}

/**
 * @param node - Primitive scalar/symbol.
 * @param context - Allowed domain.
 * @returns Exact primitive value.
 */
function primitive(node: unknown, context: Context): CanonicalSpectrum {
	if (node === context.variable)
		return {
			terms: [
				{
					factor: new RationalFunction(
						[scalar(0), scalar(1)],
						[scalar(1)],
						scalarField,
					),
					exponent: [],
				},
			],
			impulses: [],
		};
	if (typeof node === "string" && Object.hasOwn(namedConstants, node))
		return constant(namedConstants[node]!);
	if (typeof node === "number") return constant(scalar(node));
	if (
		typeof node === "string" &&
		/^[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?$/i.test(node)
	) {
		return constant(literalScalar(node));
	}
	throw unsupported();
}

/** Explicit constant names, separate from unknown symbols and inherited object keys. */
const namedConstants: Record<string, Scalar> = {
	Pi: symbolicPi,
	pi: symbolicPi,
	i: scalar(0, 1),
	j: scalar(0, 1),
	ImaginaryUnit: scalar(0, 1),
	ExponentialE: symbolicE,
	e: symbolicE,
};

/**
 * @param op - Operation name.
 * @param args - Operands.
 * @returns Nothing for valid arity, otherwise a syntax diagnostic.
 */
function arity(op: unknown, args: unknown[]): void {
	if (op === "Error")
		throw new CanonicalError(
			"invalid",
			"Check the answer's syntax and matching brackets.",
		);
	if (op === "Log" && (args.length === 1 || args.length === 2)) return;
	const binary = ["Divide", "Rational", "Power", "Root"];
	const variadic = ["Add", "Multiply", "InvisibleOperator", "Subtract"];
	if (
		binary.includes(String(op))
			? args.length !== 2
			: variadic.includes(String(op))
				? args.length === 0
				: args.length !== 1
	)
		throw new CanonicalError(
			"invalid",
			"A mathematical argument is missing or an answer contains multiple values.",
		);
}

/**
 * @param node - Fully budgeted AST node.
 * @param context - Explicit domain.
 * @returns Supported canonical expression.
 */
function normalize(node: unknown, context: Context): CanonicalSpectrum {
	const value = unbox(node);
	if (!Array.isArray(value)) return primitive(value, context);
	const [op, ...args] = value;
	arity(op, args);
	const operation =
		typeof op === "string" && Object.hasOwn(operations, op)
			? operations[op]
			: undefined;
	if (!operation) throw unsupported();
	return operation(args, context, String(op));
}

/** A bounded operation with explicit operands, context, and parsed name. */
type Operation = (
	args: unknown[],
	context: Context,
	op: string,
) => CanonicalSpectrum;

/**
 * Unwraps a singleton delimiter or sequence.
 * @param args - Singleton operand.
 * @param context - Domain.
 * @returns Normalized operand.
 */
const grouped: Operation = (args, context) => normalize(args[0], context);

/**
 * Collects an explicitly signed sum.
 * @param args - Sum operands.
 * @param context - Domain.
 * @param op - Sum operation.
 * @returns Collected expression.
 */
const signed: Operation = (args, context, op) => sum(op, args, context);

/**
 * Forms an exact quotient after validating both operands.
 * @param args - Numerator and denominator.
 * @param context - Domain.
 * @returns Canonical quotient.
 */
const quotient: Operation = (args, context) =>
	multiply(
		normalize(args[0], context),
		reciprocal(normalize(args[1], context)),
	);

/**
 * Forms a polynomial exponential.
 * @param args - Exponent operand.
 * @param context - Domain.
 * @returns Exponential basis.
 */
const expOperation: Operation = (args, context) =>
	exponential(asPolynomial(normalize(args[0], context), 2));

/**
 * Selects an affine Euler identity.
 * @param args - Trigonometric argument.
 * @param context - Domain.
 * @param op - Sin or Cos.
 * @returns Euler-normalized expression.
 */
const trigOperation: Operation = (args, context, op) =>
	trigonometric(args, op as "Sin" | "Cos", context);

/**
 * Evaluates an explicitly allowed constant function.
 * @param args - Constant operands.
 * @param context - Domain.
 * @param op - Constant operation.
 * @returns Constant expression.
 */
const constantHandler: Operation = (args, context, op) =>
	constantOperation(op, args, context);

/** Explicit verification language; there is no plotting-evaluator fallback. */
const operations: Record<string, Operation> = {
	Delimiter: grouped,
	Sequence: grouped,
	Add: signed,
	Subtract: signed,
	Negate: signed,
	Multiply: product,
	InvisibleOperator: product,
	Divide: quotient,
	Rational: quotient,
	Power: power,
	Exp: expOperation,
	Sin: trigOperation,
	Cos: trigOperation,
	Sinc: sinc,
	Heaviside: step,
	Abs: constantHandler,
	Sqrt: constantHandler,
	Root: constantHandler,
	Ln: logarithm,
	Log: logarithm,
	Lb: logarithm,
	Lg: logarithm,
};

/**
 * Checks resources and distribution participation before algebra can discard operands.
 * @param node - Raw AST.
 * @param depth - Current depth.
 * @param budget - Shared node count.
 * @returns Whether this syntax contains a distribution, including nested zero masks.
 */
function checkStructure(
	node: unknown,
	depth: number,
	budget: { nodes: number },
): boolean {
	if (++budget.nodes > 512 || depth > 32) throw limitError();
	const value = unbox(node);
	if (!Array.isArray(value)) return value === "DiracDelta";
	const participation = value.slice(1).map(
		/**
		 * @param child - Nested operand with its own resource and domain checks.
		 * @returns Distribution participation before any simplification.
		 */
		(child) => checkStructure(child, depth + 1, budget),
	);
	return distributionSyntax(value[0], participation);
}

/**
 * Enforces the distribution operation contract independently of normalized weights.
 * @param op - Parsed operation.
 * @param participation - Recursive operand distribution flags.
 * @returns Whether distribution syntax must remain visible to parent operations.
 */
function distributionSyntax(op: unknown, participation: boolean[]): boolean {
	const count = participation.filter(Boolean).length;
	if ((op === "Multiply" || op === "InvisibleOperator") && count > 1)
		throw unsupported();
	if (op === "Power" && count > 0) throw unsupported();
	return op === "DiracDelta" || count > 0;
}

/**
 * @param ast - Submitted or independently constructed AST.
 * @param variable - Problem symbol.
 * @returns Canonical transform on both half-lines.
 */
export function normalizeCanonicalTransform(
	ast: unknown,
	variable: "t" | "omega" | "s",
): CanonicalTransform {
	checkStructure(ast, 0, { nodes: 0 });
	const right = normalize(ast, { variable, side: 1 });
	const result: CanonicalTransform = {
		variable,
		right,
		left: variable === "t" ? normalize(ast, { variable, side: -1 }) : right,
	};
	checkConstantDomains(result);
	return result;
}

/**
 * Normalizes an expression on one open interval without changing transform grading.
 * @param ast - Parsed expression, subject to the shared structure limits.
 * @param interval - Open domain on which affine support factors must be constant.
 * @returns A regular canonical form with identical left and right representations.
 */
export function normalizeCanonicalInterval(
	ast: unknown,
	interval: CanonicalInterval,
): CanonicalTransform {
	if (!(interval.min < interval.max)) throw unsupported();
	checkStructure(ast, 0, { nodes: 0 });
	const spectrum = normalize(ast, { variable: "t", side: 1, interval });
	if (spectrum.impulses.length) throw unsupported();
	const result: CanonicalTransform = {
		variable: "t",
		left: spectrum,
		right: spectrum,
	};
	checkConstantDomains(result);
	return result;
}

/**
 * Normalizes Laplace responses on an open interval, retaining global impulse data.
 * Existing CTFT, convolution, and causal-drill contracts remain unchanged.
 * @param ast - Bounded response AST.
 * @param interval - One interval between all expected support boundaries.
 * @returns Regular terms and exact distributions for independent comparison.
 */
export function normalizeLaplaceInterval(
	ast: unknown,
	interval: CanonicalInterval,
): CanonicalTransform {
	if (!(interval.min < interval.max)) throw unsupported();
	checkStructure(ast, 0, { nodes: 0 });
	/** @param node - Subtree. @param symbol - Operation/symbol. @returns Whether present. */
	const contains = (node: unknown, symbol: string): boolean =>
		node === symbol ||
		(Array.isArray(node) && node.some((child) => contains(child, symbol)));
	/** @param node - Subtree. @returns Nothing after refusing ambiguous step/distribution products. */
	const guard = (node: unknown): void => {
		if (!Array.isArray(node)) return;
		const children = node.slice(1);
		if (
			(node[0] === "Multiply" || node[0] === "InvisibleOperator") &&
			children.some(
				(child, index) =>
					contains(child, "DiracDelta") &&
					children.some(
						(other, otherIndex) =>
							otherIndex !== index &&
							contains(other, "Heaviside"),
					),
			)
		)
			throw unsupported();
		children.forEach(guard);
	};
	guard(ast);
	const spectrum = normalize(ast, {
		variable: "t",
		side: 1,
		interval,
		laplace: true,
	});
	const result: CanonicalTransform = {
		variable: "t",
		left: spectrum,
		right: spectrum,
	};
	checkConstantDomains(result);
	return result;
}

/**
 * Rejects unresolved constant zeros without using approximation to certify structure.
 * @param value - Already normalized transform.
 * @returns Nothing after validating formal coefficient ranges.
 */
function checkConstantDomains(value: CanonicalTransform): void {
	for (const branch of [value.left, value.right]) {
		for (const term of branch.terms) {
			for (const coefficient of [
				...term.factor.numerator,
				...term.factor.denominator,
				...term.exponent,
			])
				if (coefficient.hasComputedAtoms()) scalarNumeric(coefficient);
		}
		for (const impulse of branch.impulses) {
			if (impulse.location.hasComputedAtoms())
				scalarNumeric(impulse.location);
			if (impulse.weight.hasComputedAtoms())
				scalarNumeric(impulse.weight);
		}
	}
}

/**
 * @param actual - Submitted canonical spectrum.
 * @param expected - Independent target spectrum.
 * @returns Structural and matched-coefficient agreement.
 */
function spectrumMatches(
	actual: CanonicalSpectrum,
	expected: CanonicalSpectrum,
): boolean {
	if (
		actual.terms.length !== expected.terms.length ||
		actual.impulses.length !== expected.impulses.length
	)
		return false;
	for (const target of expected.terms) {
		const candidate = actual.terms.find(
			/**
			 * @param item - Submitted basis term.
			 * @returns Exact exponent match.
			 */
			(item) =>
				polynomialEqual(item.exponent, target.exponent, scalarField),
		);
		if (!candidate || !factorMatches(candidate.factor, target.factor))
			return false;
	}
	for (const target of expected.impulses) {
		const candidate = actual.impulses.find(
			/**
			 * @param item - Submitted impulse.
			 * @returns Exact coordinate match.
			 */
			(item) => item.location.equals(target.location),
		);
		if (!candidate || !coefficientMatches(candidate.weight, target.weight))
			return false;
	}
	return true;
}

/**
 * @param actual - Submitted canonical transform.
 * @param expected - Parameter-derived target.
 * @returns Verified supported global equivalence with controlled coefficient tolerance.
 */
export function canonicalTransformsMatch(
	actual: CanonicalTransform,
	expected: CanonicalTransform,
): boolean {
	return (
		actual.variable === expected.variable &&
		spectrumMatches(actual.left, expected.left) &&
		spectrumMatches(actual.right, expected.right)
	);
}

/**
 * Evaluates an already verified regular expression for secondary diagnostics only.
 * @param value - Canonical transform.
 * @param point - Numeric domain sample.
 * @returns Finite sampled regular value; singular samples may be inconclusive.
 */
export function evaluateCanonicalRegular(
	value: CanonicalTransform,
	point: number,
): Complex {
	const branch =
		value.variable === "t" && point < 0 ? value.left : value.right;
	return scalarNumeric(at({ ...branch, impulses: [] }, scalar(point)));
}
