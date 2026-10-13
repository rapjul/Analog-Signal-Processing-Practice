/** Strict scalar, complex-spectrum, and distribution answer validation. */
import { Complex } from "$lib/math-engine/complex";
import {
	evaluateMathJsonStrict,
	parseStrictLatex,
} from "$lib/math-engine/evaluator";

/** Outcome of checking a transform expression. */
export interface TransformValidationResult {
	/** Only correct results may complete practice. */
	status: "correct" | "incorrect" | "invalid" | "unsupported";
	/** Accessible diagnostic message. */
	message: string;
}

/** Weighted Dirac impulse, represented independently of plot samples. */
export interface SpectrumImpulse {
	/** Frequency location in radians per second. */
	location: number;
	/** Complex distribution weight. */
	weight: Complex;
}

/** Independent reference supplied by a problem's structured parameters. */
export interface TransformReference {
	/** Allowed independent variable. */
	variable: "t" | "omega";
	/** Deterministic, problem-scaled samples of the regular part. */
	samples: number[];
	/** Characteristic domain scale for off-grid probes and removable limits. */
	sampleScale?: number;
	/** Finite regular component, excluding impulses. */
	evaluate: (value: number) => Complex;
	/** Exact locations and weights of all expected impulses. */
	impulses?: SpectrumImpulse[];
}

/** Internal regular/distribution decomposition. */
interface Spectrum {
	/** Evaluator of the regular component. */
	evaluate: (value: number) => Complex;
	/** Weighted impulses. */
	impulses: SpectrumImpulse[];
}

/** Typed parse/evaluation failure with a student-facing distinction. */
class AnswerError extends Error {
	/**
	 * Creates a student-facing failure.
	 * @param status - Diagnostic category.
	 * @param message - Explanation shown to the student.
	 */
	constructor(
		public status: "invalid" | "unsupported",
		message: string,
	) {
		super(message);
	}
}

/** Identifies a sample singularity separately from unsupported or malformed syntax. */
class ZeroDivisionError extends AnswerError {
	/** Creates a zero-denominator diagnostic eligible for two-sided limit checking. */
	constructor() {
		super("invalid", "The answer divides by zero.");
	}
}

/**
 * Checks complex finiteness.
 * @param value - Evaluated value.
 * @returns Finite value or a diagnostic failure.
 */
function finite(value: Complex): Complex {
	if (!Number.isFinite(value.re) || !Number.isFinite(value.im))
		throw new AnswerError(
			"invalid",
			"The answer contains an undefined or nonfinite value.",
		);
	return value;
}

/**
 * Evaluates supported MathJSON with explicit variable bindings.
 * @param node - Strictly parsed AST.
 * @param variable - Allowed independent symbol.
 * @param value - Sample value of the independent variable.
 * @returns Complex result; unsupported syntax throws instead of becoming zero.
 */
function evaluate(node: unknown, variable: string, value: number): Complex {
	// Treat electrical-engineering j and mathematical i as the same imaginary unit.
	if (node === "j" || node === "i" || node === "ImaginaryUnit")
		return new Complex(0, 1);
	if (!Array.isArray(node)) {
		// Unknown symbols remain failures, including when multiplied by zero.
		const real = evaluateMathJsonStrict(node, { [variable]: value });
		if (real === null)
			throw new AnswerError(
				"unsupported",
				"Use only the problem variable and supported mathematical functions.",
			);
		return finite(new Complex(real));
	}
	const [op, ...args] = node;
	if (op === "Error")
		throw new AnswerError(
			"invalid",
			"Check the answer's syntax and matching brackets.",
		);
	/**
	 * Evaluates a child expression.
	 * @param index - Required argument index.
	 * @returns Complex value of the child.
	 */
	const child = (index: number): Complex => {
		if (args[index] === undefined)
			throw new AnswerError(
				"invalid",
				"A mathematical argument is missing.",
			);
		return evaluate(args[index], variable, value);
	};
	let result: Complex;
	switch (op) {
		case "Add": {
			result = args.reduce<Complex>(
				(sum, arg) => sum.add(evaluate(arg, variable, value)),
				new Complex(0),
			);
			break;
		}
		case "Multiply":
		case "InvisibleOperator": {
			result = args.reduce<Complex>(
				(product, arg) => product.mul(evaluate(arg, variable, value)),
				new Complex(1),
			);
			break;
		}
		case "Subtract": {
			result =
				args.length === 1 ? child(0).mul(-1) : child(0).sub(child(1));
			break;
		}
		case "Negate": {
			result = child(0).mul(-1);
			break;
		}
		case "Divide":
		case "Rational": {
			const divisor = child(1);
			if (divisor.abs() === 0) throw new ZeroDivisionError();
			result = child(0).div(divisor);
			break;
		}
		case "Power": {
			const base = child(0),
				exponent = child(1);
			if (base.abs() === 0) {
				// The logarithmic power formula is undefined at zero; only positive real powers have a finite limit.
				if (exponent.im !== 0 || exponent.re <= 0)
					throw new AnswerError(
						"invalid",
						"An undefined power appears in the answer.",
					);
				result = new Complex(0);
				break;
			}
			const power = new Complex(Math.log(base.abs()), base.arg()).mul(
				exponent,
			);
			result = Complex.fromPolar(Math.exp(power.re), power.im);
			break;
		}
		case "Exp": {
			const z = child(0);
			result = Complex.fromPolar(Math.exp(z.re), z.im);
			break;
		}
		case "Sqrt": {
			const z = child(0);
			result = Complex.fromPolar(Math.sqrt(z.abs()), z.arg() / 2);
			break;
		}
		case "Sin": {
			const z = child(0);
			result = new Complex(
				Math.sin(z.re) * Math.cosh(z.im),
				Math.cos(z.re) * Math.sinh(z.im),
			);
			break;
		}
		case "Cos": {
			const z = child(0);
			result = new Complex(
				Math.cos(z.re) * Math.cosh(z.im),
				-Math.sin(z.re) * Math.sinh(z.im),
			);
			break;
		}
		case "Sinc": {
			const z = child(0).mul(Math.PI);
			result =
				z.abs() === 0
					? new Complex(1)
					: new Complex(
							Math.sin(z.re) * Math.cosh(z.im),
							Math.cos(z.re) * Math.sinh(z.im),
						).div(z);
			break;
		}
		case "Delimiter":
		case "Sequence": {
			// A list must not pass merely because its first entry matches the answer.
			if (args.length !== 1)
				throw new AnswerError(
					"invalid",
					"Enter one expression, not a list of answers.",
				);
			result = child(0);
			break;
		}
		default: {
			const real = evaluateMathJsonStrict(node, { [variable]: value });
			if (real === null)
				throw new AnswerError(
					"unsupported",
					"This mathematical operation is not supported. Use the standard transform form.",
				);
			result = new Complex(real);
		}
	}
	return finite(result);
}

/**
 * Recognizes an exactly affine impulse argument, without sampling guesses.
 * @param node - Argument AST.
 * @param variable - Frequency variable.
 * @returns Slope and intercept; nonlinear arguments are rejected.
 */
function affine(node: unknown, variable: string): [number, number] {
	if (node === variable) return [1, 0];
	if (!Array.isArray(node)) return affineConstant(node, variable);
	const [op, ...args] = node;
	switch (op) {
		case "Delimiter": {
			if (args.length === 1) return affine(args[0], variable);
			throw affineError();
		}
		case "Negate": {
			const [a, b] = affine(args[0], variable);
			return [-a, -b];
		}
		case "Add": {
			return affineSum(args, variable, false);
		}
		case "Subtract": {
			return affineSum(args, variable, true);
		}
		case "Multiply":
		case "InvisibleOperator": {
			return affineProduct(args, variable);
		}
		case "Divide":
		case "Rational": {
			return affineQuotient(args, variable);
		}
		default: {
			throw affineError();
		}
	}
}

/** @returns Diagnostic for a nonlinear or undefined impulse argument. */
function affineError(): AnswerError {
	return new AnswerError(
		"unsupported",
		"Use affine arguments for Dirac impulses.",
	);
}

/**
 * Resolves a real scalar coefficient of an affine argument.
 * @param node - Scalar AST node.
 * @param variable - Allowed independent variable.
 * @returns Zero slope and the scalar intercept.
 */
function affineConstant(node: unknown, variable: string): [number, number] {
	const z = evaluate(node, variable, 0);
	if (z.im !== 0)
		throw new AnswerError("unsupported", "Impulse locations must be real.");
	return [0, z.re];
}

/**
 * Adds affine terms without concealing nonlinear arguments.
 * @param args - Argument terms.
 * @param variable - Independent variable.
 * @param subtract - Whether terms after the first are subtracted.
 * @returns Combined slope and intercept.
 */
function affineSum(
	args: unknown[],
	variable: string,
	subtract: boolean,
): [number, number] {
	let slope = 0,
		intercept = 0;
	for (const [index, arg] of args.entries()) {
		const [a, b] = affine(arg, variable);
		const sign = subtract && index > 0 ? -1 : 1;
		slope += sign * a;
		intercept += sign * b;
	}
	return [slope, intercept];
}

/**
 * Multiplies affine factors only when at most one factor has nonzero slope.
 * @param args - Product factors.
 * @param variable - Independent variable.
 * @returns Product slope and intercept.
 */
function affineProduct(args: unknown[], variable: string): [number, number] {
	let slope = 0,
		intercept = 1;
	for (const arg of args) {
		const [a, b] = affine(arg, variable);
		if (slope !== 0 && a !== 0) throw affineError();
		slope = slope * b + intercept * a;
		intercept *= b;
	}
	return [slope, intercept];
}

/**
 * Divides an affine expression by a nonzero scalar.
 * @param args - Numerator and denominator.
 * @param variable - Independent variable.
 * @returns Quotient slope and intercept.
 */
function affineQuotient(args: unknown[], variable: string): [number, number] {
	const [a, b] = affine(args[0], variable),
		[c, d] = affine(args[1], variable);
	if (c !== 0 || d === 0) throw affineError();
	return [a / d, b / d];
}

/**
 * Multiplies distributions only by regular factors.
 * @param left - First spectrum.
 * @param right - Second spectrum.
 * @returns Product spectrum.
 */
function multiply(left: Spectrum, right: Spectrum): Spectrum {
	if (left.impulses.length && right.impulses.length)
		throw new AnswerError(
			"unsupported",
			"Products of Dirac impulses are not defined here.",
		);
	return {
		evaluate: (x) => finite(left.evaluate(x).mul(right.evaluate(x))),
		impulses: [
			...left.impulses.map((term) => ({
				...term,
				weight: finite(term.weight.mul(right.evaluate(term.location))),
			})),
			...right.impulses.map((term) => ({
				...term,
				weight: finite(term.weight.mul(left.evaluate(term.location))),
			})),
		],
	};
}

/**
 * Decomposes supported impulse sums while retaining every regular term.
 * @param node - Expression AST.
 * @param variable - Independent variable.
 * @returns Ordinary spectrum and impulse terms.
 */
function spectrum(node: unknown, variable: string): Spectrum {
	if (!Array.isArray(node)) return regularSpectrum(node, variable);
	const [op, ...args] = node;
	switch (op) {
		case "InvisibleOperator":
		case "Multiply": {
			return productSpectrum(args, variable);
		}
		case "Add":
		case "Subtract":
		case "Negate": {
			return sumSpectrum(args, variable, op);
		}
		case "Delimiter": {
			return args.length === 1
				? spectrum(args[0], variable)
				: regularSpectrum(node, variable);
		}
		case "Divide":
		case "Rational": {
			return quotientSpectrum(args, variable);
		}
		default: {
			return regularSpectrum(node, variable);
		}
	}
}

/**
 * Wraps an ordinary expression without inventing impulse terms.
 * @param node - AST expression.
 * @param variable - Independent variable.
 * @returns Ordinary spectrum evaluator.
 */
function regularSpectrum(node: unknown, variable: string): Spectrum {
	return {
		/**
		 * @param x - Sample point.
		 * @returns Ordinary expression value.
		 */
		evaluate: (x) => evaluate(node, variable, x),
		impulses: [],
	};
}

/**
 * Creates the Dirac distribution of a validated affine argument.
 * @param node - Delimited impulse argument.
 * @param variable - Independent variable.
 * @returns A structurally weighted impulse with no ordinary peak value.
 */
function impulseSpectrum(node: unknown, variable: string): Spectrum {
	if (!Array.isArray(node) || node[0] !== "Delimiter" || node.length !== 2)
		throw new AnswerError(
			"invalid",
			"Supply one argument to each Dirac impulse.",
		);
	const [a, b] = affine(node[1], variable);
	if (a === 0)
		throw new AnswerError(
			"unsupported",
			"An impulse argument must depend on frequency.",
		);
	return {
		/** @returns Zero regular component of the distribution. */
		evaluate: () => new Complex(0),
		impulses: [{ location: -b / a, weight: new Complex(1 / Math.abs(a)) }],
	};
}

/**
 * Collects ordinary factors and paired Dirac symbols/arguments before multiplication.
 * @param args - Product factors.
 * @param variable - Independent variable.
 * @returns Decomposed product spectrum.
 */
function productSpectrum(args: unknown[], variable: string): Spectrum {
	let result = regularSpectrum(1, variable);
	for (let index = 0; index < args.length; index++) {
		const factor =
			args[index] === "DiracDelta"
				? impulseSpectrum(args[++index], variable)
				: spectrum(args[index], variable);
		result = multiply(result, factor);
	}
	return result;
}

/**
 * Accumulates signed ordinary values and impulse terms.
 * @param args - Sum or difference arguments.
 * @param variable - Independent variable.
 * @param op - Addition, subtraction, or unary negation.
 * @returns Decomposed signed sum.
 */
function sumSpectrum(args: unknown[], variable: string, op: string): Spectrum {
	const terms = args.map(
		/**
		 * @param arg - Term AST.
		 * @param index - Term position.
		 * @returns Signed spectrum.
		 */
		(arg, index) =>
			multiply(
				spectrum(arg, variable),
				regularSpectrum(
					op === "Negate" || (op === "Subtract" && index > 0)
						? -1
						: 1,
					variable,
				),
			),
	);
	return {
		/**
		 * @param x - Sample point.
		 * @returns Sum of ordinary term values.
		 */
		evaluate: (x) =>
			terms.reduce(
				/**
				 * @param sum - Accumulated value.
				 * @param term - Next spectrum.
				 * @returns Updated sum.
				 */
				(sum, term) => sum.add(term.evaluate(x)),
				new Complex(0),
			),
		impulses: terms.flatMap(
			/**
			 * @param term - Signed spectrum.
			 * @returns Its impulse terms.
			 */
			(term) => term.impulses,
		),
	};
}

/**
 * Divides only by an ordinary, nonzero expression.
 * @param args - Numerator and denominator.
 * @param variable - Independent variable.
 * @returns Quotient spectrum with correctly scaled impulses.
 */
function quotientSpectrum(args: unknown[], variable: string): Spectrum {
	const denominator = spectrum(args[1], variable);
	if (denominator.impulses.length)
		throw new AnswerError(
			"unsupported",
			"Division by a Dirac impulse is undefined.",
		);
	return multiply(spectrum(args[0], variable), {
		/**
		 * @param x - Sample point.
		 * @returns Reciprocal ordinary denominator.
		 */
		evaluate: (x) => {
			const z = denominator.evaluate(x);
			if (z.abs() === 0) throw new ZeroDivisionError();
			return finite(new Complex(1).div(z));
		},
		impulses: [],
	});
}

/**
 * Combines duplicate impulse locations and removes cancelled weights.
 * @param terms - Impulse terms.
 * @returns Canonical sorted impulse list.
 */
function combine(terms: SpectrumImpulse[]): SpectrumImpulse[] {
	const combined: SpectrumImpulse[] = [];
	for (const term of terms) {
		const existing = combined.find(
			(item) => Math.abs(item.location - term.location) < 1e-10,
		);
		if (existing) existing.weight = existing.weight.add(term.weight);
		else combined.push({ ...term });
	}
	return combined
		.filter((item) => item.weight.abs() > 1e-12)
		.sort((a, b) => a.location - b.location);
}

/**
 * Compares complex values with absolute and relative tolerance.
 * @param actual - Submitted value.
 * @param expected - Reference value.
 * @returns Whether values agree.
 */
function close(actual: Complex, expected: Complex): boolean {
	return actual.sub(expected).abs() <= 1e-8 + 1e-8 * expected.abs();
}

/**
 * Normalizes standard equation prefixes, tight imaginary-unit notation, and grouping.
 * @param answer - Submitted mathematical expression.
 * @param variable - Expected independent variable.
 * @returns Equivalent parser-ready expression.
 */
function normalizeTransformAnswer(answer: string, variable: string): string {
	const prefix =
		variable === "t"
			? /^x\s*\(\s*t\s*\)\s*=\s*/
			: /^X\s*\(\s*(?:[ij]\s*)?(?:\\omega|omega|w)\s*\)\s*=\s*/;
	return answer
		.trim()
		.replace(/\\left\[/g, "(")
		.replace(/\\right\]/g, ")")
		.replace(/(?<!\\)\[/g, "(")
		.replace(/(?<!\\)\]/g, ")")
		.replace(prefix, "")
		.replace(/\\delta\b/g, "\\operatorname{DiracDelta}")
		.replace(/(^|[^a-zA-Z\\])sinc(?=\s*\()/g, "$1\\operatorname{sinc}")
		.replace(/(^|[^a-zA-Z\\])([ij])(?:omega|w)\b/g, "$1$2\\omega")
		.replace(/(^|[^a-zA-Z\\])omega\b/g, "$1\\omega")
		.replace(/(^|[^a-zA-Z\\])w\b/g, "$1\\omega");
}

/**
 * Adds irrational and varying probes so decimal-grid zeros cannot bypass grading.
 * @param reference - Domain samples and characteristic scale.
 * @returns Mandatory points followed by off-grid probes.
 */
function validationSamples(reference: TransformReference): number[] {
	const scale = reference.sampleScale ?? 1;
	const probes = [Math.SQRT2 / 3, -Math.sqrt(3) / 5, Math.PI / 7];
	for (let index = 0; index < 8; index++)
		probes.push((index % 2 === 0 ? -1 : 1) * (0.01 + 2 * Math.random()));
	return [
		...reference.samples,
		...probes.map(
			/**
			 * @param point - Dimensionless probe.
			 * @returns Scaled domain point.
			 */
			(point) => point * scale,
		),
	];
}

/**
 * Checks a finite two-sided limit with progressively smaller offsets.
 * @param submitted - Ordinary submitted spectrum.
 * @param x - Singular sample point.
 * @param scale - Characteristic domain scale.
 * @returns Verified finite limit or null when convergence cannot be established.
 */
function removableLimit(
	submitted: Spectrum,
	x: number,
	scale: number,
): Complex | null {
	let previous: Complex | null = null;
	try {
		for (const factor of [1e-4, 1e-5, 1e-6, 1e-7, 1e-8, 1e-9, 1e-10]) {
			const h = scale * factor;
			const left = finite(submitted.evaluate(x - h)),
				right = finite(submitted.evaluate(x + h));
			const midpoint = left.add(right).mul(0.5);
			if (previous && close(left, right) && close(midpoint, previous))
				return midpoint;
			previous = midpoint;
		}
	} catch {
		return null;
	}
	return null;
}

/**
 * Evaluates every required sample, retaining singular points through limit checks.
 * @param submitted - Decomposed submitted expression.
 * @param x - Required sample point.
 * @param scale - Characteristic domain scale.
 * @returns Finite sample/limit or null if the sample remains unverifiable.
 */
function submittedSample(
	submitted: Spectrum,
	x: number,
	scale: number,
): Complex | null {
	try {
		return finite(submitted.evaluate(x));
	} catch (error) {
		if (error instanceof ZeroDivisionError)
			return removableLimit(submitted, x, scale);
		throw error;
	}
}

/**
 * Compares ordinary spectrum values at mandatory and off-grid points.
 * @param submitted - Decomposed submitted spectrum.
 * @param reference - Parameter-based reference.
 * @returns Whether every required comparison is verified.
 */
function regularMatches(
	submitted: Spectrum,
	reference: TransformReference,
): boolean {
	let matches = true;
	for (const x of validationSamples(reference)) {
		const actual = submittedSample(
			submitted,
			x,
			reference.sampleScale ?? 1,
		);
		const expected = finite(reference.evaluate(x));
		if (actual === null || !close(actual, expected)) matches = false;
	}
	return matches;
}

/**
 * Compares canonical impulse locations and complex weights independently of samples.
 * @param submitted - Submitted distribution terms.
 * @param expected - Expected distribution terms.
 * @returns Whether all impulses agree.
 */
function impulsesMatch(
	submitted: SpectrumImpulse[],
	expected: SpectrumImpulse[],
): boolean {
	const actualTerms = combine(submitted),
		expectedTerms = combine(expected);
	if (actualTerms.length !== expectedTerms.length) return false;
	return expectedTerms.every(
		/**
		 * @param term - Expected impulse.
		 * @param index - Sorted position.
		 * @returns Matching location and weight.
		 */
		(term, index) => {
			const actual = actualTerms[index];
			return Boolean(
				actual &&
				Math.abs(actual.location - term.location) <= 1e-8 &&
				close(actual.weight, term.weight),
			);
		},
	);
}

/**
 * Grades a supported transform against an independent parameter-based reference.
 * @param answer - Student expression.
 * @param reference - Expected regular and distribution components.
 * @returns Typed correctness or diagnostic result.
 */
export function validateTransformAnswer(
	answer: string,
	reference: TransformReference,
): TransformValidationResult {
	if (!answer.trim())
		return {
			status: "invalid",
			message: "Please enter an answer before submitting.",
		};
	try {
		const expression = normalizeTransformAnswer(answer, reference.variable);
		const submitted = spectrum(
			parseStrictLatex(expression),
			reference.variable,
		);
		if (reference.samples.length === 0)
			throw new AnswerError(
				"invalid",
				"This problem has no validation samples.",
			);
		const ordinaryMatches = regularMatches(submitted, reference);
		const matches =
			impulsesMatch(submitted.impulses, reference.impulses ?? []) &&
			ordinaryMatches;
		return matches
			? {
					status: "correct",
					message: "Correct! Your answer matches the problem.",
				}
			: {
					status: "incorrect",
					message:
						"Not yet verified. Check coefficients, signs, shifts, signal support, and any undefined sample points.",
				};
	} catch (error) {
		return error instanceof AnswerError
			? { status: error.status, message: error.message }
			: {
					status: "invalid",
					message: "Check the answer's syntax and matching brackets.",
				};
	}
}
