/** Numerical sampling helpers for Fourier Series regression tests. */
import { Complex } from "$lib/math-engine/complex";
import { parseStrictLatex } from "$lib/math-engine/evaluator";
import type { FourierSeriesCoefficients } from "$lib/math-engine/fourier-series/index";

/** Numeric bindings used to sample the actual generated formulas. */
interface Sample {
	/** Waveform coefficient oracle. */
	coeffs: FourierSeriesCoefficients;
	/** Independent time in seconds. */
	t: number;
	/** Integer harmonic index. */
	n: number;
	/** Optional known coefficient substituted for its piecewise formula. */
	v?: Complex;
}

/**
 * Resolves a generated formula symbol against explicit numerical assignments.
 * @param symbol - Parsed symbol name.
 * @param sample - Coefficients and independent variable values.
 * @returns The assigned complex value.
 */
function evaluateSymbol(symbol: string, sample: Sample): Complex {
	const { coeffs, n, t } = sample;
	const fn = coeffs.Fn(n);
	const values: Record<string, Complex> = {
		n: new Complex(n),
		t: new Complex(t),
		T_0: new Complex(coeffs.T0),
		Pi: new Complex(Math.PI),
		e: new Complex(Math.E),
		ExponentialE: new Complex(Math.E),
		j: new Complex(0, 1),
		F_n: new Complex(fn.re, fn.im),
		c_0: new Complex(coeffs.a0),
		c_n: new Complex(
			n === 0
				? 0
				: Math.hypot(coeffs.an(Math.abs(n)), coeffs.bn(Math.abs(n))),
		),
		v: sample.v ?? new Complex(Number.NaN),
	};
	if (values[symbol]) return values[symbol];
	throw new Error(`Unsupported Fourier symbol: ${symbol}`);
}

/**
 * Samples a parsed sum over the first forty harmonics with its displayed support.
 * @param args - Summand and parsed index bounds.
 * @param sample - Coefficients and independent variable values.
 * @returns The finite complex sum.
 */
function evaluateSum(args: unknown[], sample: Sample): Complex {
	const bounds = args[1] as unknown[];
	const start = typeof bounds[2] === "number" ? bounds[2] : -40;
	const next = args[2] as unknown[] | undefined;
	const step = next && typeof next[2] === "number" ? next[2] - start : 1;
	let result = new Complex(0);
	for (let harmonic = start; harmonic <= 40; harmonic += step) {
		result = result.add(evaluate(args[0], { ...sample, n: harmonic }));
	}
	return result;
}

/**
 * Samples a displayed integral using midpoint quadrature on its actual bounds.
 * @param args - Integrand and parsed time bounds.
 * @param sample - Coefficients and independent variable values.
 * @returns The numerical complex integral.
 */
function evaluateIntegral(args: unknown[], sample: Sample): Complex {
	const bounds = args[1] as unknown[];
	const lower = evaluate(bounds[2], sample).re;
	const upper = evaluate(bounds[3], sample).re;
	const width = (upper - lower) / 256;
	let result = new Complex(0);
	for (let index = 0; index < 256; index += 1) {
		result = result.add(
			evaluate(args[0], {
				...sample,
				t: lower + (index + 0.5) * width,
			}).mul(width),
		);
	}
	return result;
}

/**
 * Numerically interprets generated expressions, including finite Fourier sums and quadrature.
 * @param node - Parsed MathJSON expression.
 * @param sample - Explicit numeric assignments.
 * @returns Complex sample value; unsupported expressions fail the test.
 */
function evaluate(node: unknown, sample: Sample): Complex {
	const { coeffs, n } = sample;
	if (typeof node === "number") return new Complex(node);
	if (node && typeof node === "object" && "num" in node)
		return new Complex(Number(node.num));
	if (typeof node === "string") return evaluateSymbol(node, sample);
	if (!Array.isArray(node))
		throw new Error(`Unsupported Fourier node: ${JSON.stringify(node)}`);
	const [operator, ...args] = node;
	if (operator === "Subscript") {
		if (args[0] === "omega" && args[1] === 0) return new Complex(coeffs.w0);
		if (args[0] === "theta")
			return new Complex(Math.atan2(-coeffs.bn(n), coeffs.an(n)));
	}
	if (operator === "Sum") return evaluateSum(args, sample);
	if (operator === "Integrate") return evaluateIntegral(args, sample);
	return evaluateOperation(
		operator,
		args.map((arg) => evaluate(arg, sample)),
	);
}

/**
 * Applies an arithmetic or trigonometric operation to already evaluated operands.
 * @param operator - MathJSON operation identifier.
 * @param values - Numerical complex operands.
 * @returns The operation result.
 */
function evaluateOperation(operator: unknown, values: Complex[]): Complex {
	const first = values[0]!;
	switch (operator) {
		case "Add":
			return values.reduce(
				(sum, value) => sum.add(value),
				new Complex(0),
			);
		case "Multiply":
		case "InvisibleOperator":
			return values.reduce(
				(product, value) => product.mul(value),
				new Complex(1),
			);
		case "Negate":
			return first.mul(-1);
		case "Subtract":
			return first.sub(values[1]!);
		case "Divide":
		case "Rational":
			return first.div(values[1]!);
		case "Delimiter":
			return first;
		case "Sin":
			return new Complex(Math.sin(first.re));
		case "Cos":
			return new Complex(Math.cos(first.re));
		case "Abs":
			return new Complex(first.abs());
		case "Power": {
			const exponent = values[1]!;
			if (exponent.im === 0) return new Complex(first.re ** exponent.re);
			const magnitude = first.re ** exponent.re;
			const phase = Math.log(first.re) * exponent.im;
			return new Complex(
				magnitude * Math.cos(phase),
				magnitude * Math.sin(phase),
			);
		}
		default:
			throw new Error(`Unsupported Fourier operation: ${operator}`);
	}
}

/**
 * Samples a displayed RHS using explicit coefficient bindings and numerical integrals.
 * @param latex - Formula RHS without coefficient definitions.
 * @param sample - Waveform, time, harmonic, and optional coefficient value.
 * @returns Its numerical complex value.
 */
export function sampleFourierExpression(
	latex: string,
	sample: Sample,
): Complex {
	const normalized = latex
		.replaceAll("\\left[", "\\left(")
		.replaceAll("\\right]", "\\right)");
	return evaluate(parseStrictLatex(normalized), sample);
}

/**
 * Evaluates actual displayed piecewise definitions without coefficient substitution.
 * @param latex - A scalar or cases expression.
 * @param sample - Independent numerical assignments.
 * @returns The first matching branch value.
 */
export function sampleFourierDefinition(
	latex: string,
	sample: Sample,
): Complex {
	if (!latex.startsWith("\\begin{cases}"))
		return sampleFourierExpression(latex, sample);
	const rows = latex
		.replace("\\begin{cases}", "")
		.replace("\\end{cases}", "")
		.split("\\\\");
	for (const row of rows) {
		const [value, condition = ""] = row.split("&");
		const n = sample.n;
		let matches = true;
		if (condition.includes("odd")) matches &&= Math.abs(n % 2) === 1;
		if (condition.includes("even")) matches &&= n % 2 === 0;
		if (condition.includes("|n|>1")) matches &&= Math.abs(n) > 1;
		const congruence = condition.match(/n\\equiv(\d)\\pmod4/);
		if (congruence) matches &&= ((n % 4) + 4) % 4 === Number(congruence[1]);
		const equal = condition.match(/n=(-?\d+)/);
		if (equal) matches &&= n === Number(equal[1]);
		const unequal = condition.match(/n\\ne(-?\d+)/);
		if (unequal) matches &&= n !== Number(unequal[1]);
		if (matches)
			return sampleFourierExpression(value!.replace(/,$/, ""), sample);
	}
	throw new Error(
		`No displayed branch matches harmonic ${sample.n}: ${latex}`,
	);
}
