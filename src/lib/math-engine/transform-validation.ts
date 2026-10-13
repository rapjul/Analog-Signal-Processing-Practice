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
			if (divisor.abs() === 0)
				throw new AnswerError("invalid", "The answer divides by zero.");
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
	if (!Array.isArray(node)) {
		const z = evaluate(node, variable, 0);
		if (z.im !== 0)
			throw new AnswerError(
				"unsupported",
				"Impulse locations must be real.",
			);
		return [0, z.re];
	}
	const [op, ...args] = node;
	if (op === "Delimiter" && args.length === 1)
		return affine(args[0], variable);
	if (op === "Negate") {
		const [a, b] = affine(args[0], variable);
		return [-a, -b];
	}
	if (op === "Add" || op === "Subtract") {
		return args.reduce<[number, number]>(
			(sum, arg, index) => {
				const [a, b] = affine(arg, variable);
				const sign = op === "Subtract" && index > 0 ? -1 : 1;
				return [sum[0] + sign * a, sum[1] + sign * b];
			},
			[0, 0],
		);
	}
	if (op === "Multiply" || op === "InvisibleOperator") {
		return args.reduce<[number, number]>(
			(product, arg) => {
				const [a, b] = affine(arg, variable);
				if (product[0] !== 0 && a !== 0)
					throw new AnswerError(
						"unsupported",
						"Use affine arguments for Dirac impulses.",
					);
				return [product[0] * b + product[1] * a, product[1] * b];
			},
			[0, 1],
		);
	}
	if (op === "Divide" || op === "Rational") {
		const [a, b] = affine(args[0], variable),
			[c, d] = affine(args[1], variable);
		if (c !== 0 || d === 0)
			throw new AnswerError(
				"unsupported",
				"Use affine arguments for Dirac impulses.",
			);
		return [a / d, b / d];
	}
	throw new AnswerError(
		"unsupported",
		"Use affine arguments for Dirac impulses.",
	);
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
	if (Array.isArray(node)) {
		const [op, ...args] = node;
		if (op === "InvisibleOperator" || op === "Multiply") {
			const factors: Spectrum[] = [];
			for (let index = 0; index < args.length; index++) {
				if (args[index] === "DiracDelta") {
					const next = args[++index];
					if (
						!Array.isArray(next) ||
						next[0] !== "Delimiter" ||
						next.length !== 2
					)
						throw new AnswerError(
							"invalid",
							"Supply one argument to each Dirac impulse.",
						);
					const [a, b] = affine(next[1], variable);
					if (a === 0)
						throw new AnswerError(
							"unsupported",
							"An impulse argument must depend on frequency.",
						);
					factors.push({
						evaluate: () => new Complex(0),
						impulses: [
							{
								location: -b / a,
								weight: new Complex(1 / Math.abs(a)),
							},
						],
					});
				} else factors.push(spectrum(args[index], variable));
			}
			return factors.reduce(multiply, {
				evaluate: () => new Complex(1),
				impulses: [],
			});
		}
		if (op === "Add" || op === "Subtract" || op === "Negate") {
			const terms = args.map((arg, index) => {
				const term = spectrum(arg, variable),
					sign =
						op === "Negate" || (op === "Subtract" && index > 0)
							? -1
							: 1;
				return multiply(term, {
					evaluate: () => new Complex(sign),
					impulses: [],
				});
			});
			return {
				evaluate: (x) =>
					terms.reduce(
						(sum, term) => sum.add(term.evaluate(x)),
						new Complex(0),
					),
				impulses: terms.flatMap((term) => term.impulses),
			};
		}
		if (op === "Delimiter" && args.length === 1)
			return spectrum(args[0], variable);
		if (op === "Divide" || op === "Rational") {
			const denominator = spectrum(args[1], variable);
			if (denominator.impulses.length)
				throw new AnswerError(
					"unsupported",
					"Division by a Dirac impulse is undefined.",
				);
			return multiply(spectrum(args[0], variable), {
				evaluate: (x) => {
					const z = denominator.evaluate(x);
					if (z.abs() === 0)
						throw new AnswerError(
							"invalid",
							"The answer divides by zero.",
						);
					return finite(new Complex(1).div(z));
				},
				impulses: [],
			});
		}
	}
	return { evaluate: (x) => evaluate(node, variable, x), impulses: [] };
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
		const prefix =
			reference.variable === "t"
				? /^x\s*\(\s*t\s*\)\s*=\s*/
				: /^X\s*\(\s*(?:\\omega|omega|w)\s*\)\s*=\s*/;
		const expression = answer
			.trim()
			.replace(prefix, "")
			.replace(/\\delta\b/g, "\\operatorname{DiracDelta}")
			.replace(/(^|[^a-zA-Z\\])sinc(?=\s*\()/g, "$1\\operatorname{sinc}")
			.replace(/(^|[^a-zA-Z\\])omega\b/g, "$1\\omega")
			.replace(/(^|[^a-zA-Z\\])w\b/g, "$1\\omega");
		const submitted = spectrum(
			parseStrictLatex(expression),
			reference.variable,
		);
		if (reference.samples.length === 0)
			throw new AnswerError(
				"invalid",
				"This problem has no validation samples.",
			);
		let matches = true;
		for (const x of reference.samples)
			if (
				!close(
					finite(submitted.evaluate(x)),
					finite(reference.evaluate(x)),
				)
			)
				matches = false;
		const actual = combine(submitted.impulses),
			expected = combine(reference.impulses ?? []);
		if (actual.length !== expected.length) matches = false;
		for (let index = 0; index < expected.length; index++) {
			const a = actual[index],
				b = expected[index];
			if (
				!a ||
				!b ||
				Math.abs(a.location - b.location) > 1e-8 ||
				!close(a.weight, b.weight)
			)
				matches = false;
		}
		return matches
			? {
					status: "correct",
					message: "Correct! Your answer matches the problem.",
				}
			: {
					status: "incorrect",
					message:
						"Not yet correct. Check coefficients, signs, shifts, and signal support.",
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
