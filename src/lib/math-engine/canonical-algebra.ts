/** Exact polynomial fields used to verify supported transform identities. */
import { Complex } from "$lib/math-engine/complex";
import { ExactFraction } from "$lib/math-engine/exact-fraction";

/** Typed failure shared by canonical normalization and grading. */
export class CanonicalError extends Error {
	/**
	 * @param status - Failure category.
	 * @param message - Accessible explanation.
	 */
	constructor(
		public status: "invalid" | "unsupported",
		message: string,
	) {
		super(message);
	}
}

/** @returns A resource-limit diagnostic without accepting partial results. */
export function limitError(): CanonicalError {
	return new CanonicalError(
		"unsupported",
		"This expression exceeds the supported verification limits. Use the standard transform form.",
	);
}

/** Exact complex rational coefficient. */
export class RationalComplex {
	/**
	 * @param re - Real fraction.
	 * @param im - Imaginary fraction.
	 */
	constructor(
		public readonly re = new ExactFraction(0n),
		public readonly im = new ExactFraction(0n),
	) {
		// Bound exact coefficient growth as well as AST and polynomial expansion.
		for (const part of [
			re.numerator,
			re.denominator,
			im.numerator,
			im.denominator,
		]) {
			if (part.toString().length > 4096) throw limitError();
		}
	}
	/**
	 * @param re - Real decimal.
	 * @param im - Imaginary decimal.
	 * @returns Exact decimal coefficient.
	 */
	static decimal(re: number, im = 0): RationalComplex {
		return new RationalComplex(
			ExactFraction.fromDecimal(re),
			ExactFraction.fromDecimal(im),
		);
	}
	/**
	 * @param other - Addend.
	 * @returns Exact sum.
	 */
	add(other: RationalComplex): RationalComplex {
		return new RationalComplex(
			this.re.add(other.re),
			this.im.add(other.im),
		);
	}
	/** @returns Exact additive inverse. */
	negate(): RationalComplex {
		return new RationalComplex(this.re.negate(), this.im.negate());
	}
	/**
	 * @param other - Factor.
	 * @returns Exact product.
	 */
	multiply(other: RationalComplex): RationalComplex {
		return new RationalComplex(
			this.re.multiply(other.re).add(this.im.multiply(other.im).negate()),
			this.re.multiply(other.im).add(this.im.multiply(other.re)),
		);
	}
	/**
	 * @param other - Nonzero divisor.
	 * @returns Exact quotient.
	 */
	divide(other: RationalComplex): RationalComplex {
		if (other.isZero())
			throw new CanonicalError("invalid", "The answer divides by zero.");
		const norm = other.re
			.multiply(other.re)
			.add(other.im.multiply(other.im));
		return this.multiply(
			new RationalComplex(other.re, other.im.negate()),
		).scale(norm);
	}
	/**
	 * @param divisor - Positive norm.
	 * @returns Coefficient divided by the norm.
	 */
	private scale(divisor: ExactFraction): RationalComplex {
		return new RationalComplex(
			this.re.divide(divisor),
			this.im.divide(divisor),
		);
	}
	/** @returns Whether both components vanish exactly. */
	isZero(): boolean {
		return this.re.numerator === 0n && this.im.numerator === 0n;
	}
	/** @returns Stable exact coefficient key. */
	key(): string {
		return `${this.re.numerator}/${this.re.denominator},${this.im.numerator}/${this.im.denominator}`;
	}
	/** @returns Numeric approximation for matched coefficient slots. */
	numeric(): Complex {
		const re = this.re.toNumber(),
			im = this.im.toNumber();
		if (
			(re === 0 && this.re.numerator !== 0n) ||
			(im === 0 && this.im.numerator !== 0n)
		)
			throw new CanonicalError(
				"unsupported",
				"This nonzero constant is outside the finite coefficient range.",
			);
		return new Complex(re, im);
	}
}

/** Arithmetic required by exact univariate polynomial algorithms. */
export interface Field<T> {
	/** Additive identity. */ zero: T;
	/** Multiplicative identity. */ one: T;
	/** Exact sum. */ add: (a: T, b: T) => T;
	/** Exact additive inverse. */ negate: (a: T) => T;
	/** Exact product. */ multiply: (a: T, b: T) => T;
	/** Exact quotient. */ divide: (a: T, b: T) => T;
	/** Exact zero test. */ isZero: (a: T) => boolean;
	/** Stable structural key. */ key: (a: T) => string;
}

/** Dense polynomial, coefficients ordered from constant to highest power. */
export type Polynomial<T> = T[];

/**
 * @param coefficients - Dense coefficients.
 * @param field - Exact scalar arithmetic.
 * @returns Trimmed polynomial with bounded degree.
 */
export function polynomial<T>(
	coefficients: T[],
	field: Field<T>,
): Polynomial<T> {
	const result = [...coefficients];
	while (result.length && field.isZero(result[result.length - 1]!))
		result.pop();
	if (result.length > 17) throw limitError();
	return result;
}

/**
 * @param a - First polynomial.
 * @param b - Second polynomial.
 * @param field - Scalar arithmetic.
 * @returns Exact sum.
 */
export function polynomialAdd<T>(
	a: Polynomial<T>,
	b: Polynomial<T>,
	field: Field<T>,
): Polynomial<T> {
	const result: T[] = [];
	for (let index = 0; index < Math.max(a.length, b.length); index++)
		result.push(field.add(a[index] ?? field.zero, b[index] ?? field.zero));
	return polynomial(result, field);
}

/**
 * @param a - Polynomial.
 * @param factor - Scalar factor.
 * @param field - Scalar arithmetic.
 * @returns Scaled polynomial.
 */
export function polynomialScale<T>(
	a: Polynomial<T>,
	factor: T,
	field: Field<T>,
): Polynomial<T> {
	const result: T[] = [];
	for (const value of a) result.push(field.multiply(value, factor));
	return polynomial(result, field);
}

/**
 * @param a - First polynomial.
 * @param b - Second polynomial.
 * @param field - Scalar arithmetic.
 * @returns Exact product.
 */
export function polynomialMultiply<T>(
	a: Polynomial<T>,
	b: Polynomial<T>,
	field: Field<T>,
): Polynomial<T> {
	if (!a.length || !b.length) return [];
	if (a.length + b.length - 1 > 17) throw limitError();
	const result = Array<T>(a.length + b.length - 1).fill(field.zero);
	for (let i = 0; i < a.length; i++)
		for (let j = 0; j < b.length; j++)
			result[i + j] = field.add(
				result[i + j]!,
				field.multiply(a[i]!, b[j]!),
			);
	return polynomial(result, field);
}

/**
 * @param a - Dividend.
 * @param b - Nonzero divisor.
 * @param field - Scalar arithmetic.
 * @returns Exact quotient and remainder.
 */
function polynomialDivide<T>(
	a: Polynomial<T>,
	b: Polynomial<T>,
	field: Field<T>,
): [Polynomial<T>, Polynomial<T>] {
	if (!b.length)
		throw new CanonicalError("invalid", "The answer divides by zero.");
	let remainder = [...a];
	const quotient = Array<T>(Math.max(0, a.length - b.length + 1)).fill(
		field.zero,
	);
	while (remainder.length >= b.length) {
		const offset = remainder.length - b.length;
		const factor = field.divide(
			remainder[remainder.length - 1]!,
			b[b.length - 1]!,
		);
		quotient[offset] = factor;
		const shifted = [
			...Array<T>(offset).fill(field.zero),
			...polynomialScale(b, field.negate(factor), field),
		];
		remainder = polynomialAdd(remainder, shifted, field);
	}
	return [polynomial(quotient, field), remainder];
}

/**
 * @param a - First polynomial.
 * @param b - Second polynomial.
 * @param field - Scalar arithmetic.
 * @returns Monic exact greatest common divisor.
 */
function polynomialGcd<T>(
	a: Polynomial<T>,
	b: Polynomial<T>,
	field: Field<T>,
): Polynomial<T> {
	let left = a,
		right = b;
	while (right.length)
		[left, right] = [right, polynomialDivide(left, right, field)[1]];
	return left.length
		? polynomialScale(
				left,
				field.divide(field.one, left[left.length - 1]!),
				field,
			)
		: [];
}

/** Reduced rational function over an exact scalar field. */
export class RationalFunction<T> {
	/** Reduced numerator. */ readonly numerator: Polynomial<T>;
	/** Monic reduced denominator. */ readonly denominator: Polynomial<T>;
	/**
	 * @param numerator - Numerator polynomial.
	 * @param denominator - Denominator polynomial.
	 * @param field - Exact coefficient field.
	 */
	constructor(
		numerator: Polynomial<T>,
		denominator: Polynomial<T>,
		public readonly field: Field<T>,
	) {
		const n = polynomial(numerator, field),
			d = polynomial(denominator, field);
		if (!d.length)
			throw new CanonicalError("invalid", "The answer divides by zero.");
		if (!n.length) {
			this.numerator = [];
			this.denominator = [field.one];
			return;
		}
		const divisor = polynomialGcd(n, d, field);
		const reducedN = polynomialDivide(n, divisor, field)[0],
			reducedD = polynomialDivide(d, divisor, field)[0];
		const scale = field.divide(field.one, reducedD[reducedD.length - 1]!);
		this.numerator = polynomialScale(reducedN, scale, field);
		this.denominator = polynomialScale(reducedD, scale, field);
	}
	/**
	 * @param other - Addend.
	 * @returns Reduced exact sum.
	 */
	add(other: RationalFunction<T>): RationalFunction<T> {
		return new RationalFunction(
			polynomialAdd(
				polynomialMultiply(
					this.numerator,
					other.denominator,
					this.field,
				),
				polynomialMultiply(
					other.numerator,
					this.denominator,
					this.field,
				),
				this.field,
			),
			polynomialMultiply(this.denominator, other.denominator, this.field),
			this.field,
		);
	}
	/** @returns Additive inverse. */
	negate(): RationalFunction<T> {
		return new RationalFunction(
			polynomialScale(
				this.numerator,
				this.field.negate(this.field.one),
				this.field,
			),
			this.denominator,
			this.field,
		);
	}
	/**
	 * @param other - Factor.
	 * @returns Reduced exact product.
	 */
	multiply(other: RationalFunction<T>): RationalFunction<T> {
		return new RationalFunction(
			polynomialMultiply(this.numerator, other.numerator, this.field),
			polynomialMultiply(this.denominator, other.denominator, this.field),
			this.field,
		);
	}
	/**
	 * @param other - Nonzero divisor.
	 * @returns Reduced exact quotient.
	 */
	divide(other: RationalFunction<T>): RationalFunction<T> {
		return new RationalFunction(
			polynomialMultiply(this.numerator, other.denominator, this.field),
			polynomialMultiply(this.denominator, other.numerator, this.field),
			this.field,
		);
	}
	/** @returns Stable structural key. */
	key(): string {
		return `${this.numerator.map(this.field.key).join(";")}/${this.denominator.map(this.field.key).join(";")}`;
	}
}

/** Exact complex rational field. */
export const complexField: Field<RationalComplex> = {
	zero: RationalComplex.decimal(0),
	one: RationalComplex.decimal(1),
	/**
	 * @param a - First value.
	 * @param b - Second value.
	 * @returns Sum.
	 */
	add: (a, b) => a.add(b),
	/**
	 * @param a - Value.
	 * @returns Additive inverse.
	 */
	negate: (a) => a.negate(),
	/**
	 * @param a - First value.
	 * @param b - Second value.
	 * @returns Product.
	 */
	multiply: (a, b) => a.multiply(b),
	/**
	 * @param a - Dividend.
	 * @param b - Divisor.
	 * @returns Quotient.
	 */
	divide: (a, b) => a.divide(b),
	/**
	 * @param a - Value.
	 * @returns Exact zero test.
	 */
	isZero: (a) => a.isZero(),
	/**
	 * @param a - Value.
	 * @returns Exact key.
	 */
	key: (a) => a.key(),
};

/** Formal constant atom with a numerical value used only for coefficient diagnostics. */
interface ConstantAtom {
	/** Stable expression identity. */ key: string;
	/** Constant family. */ kind:
		"pi" | "root" | "log" | "exp" | "power" | "abs";
	/** Finite diagnostic approximation. */ value: Complex;
	/** Whether the defining constant function establishes a real value. */ real?: boolean;
	/** Proven real sign, independent of the diagnostic approximation. */ sign?: RealSign;
	/** Whether the defining function proves that this atom cannot vanish. */ nonzero?: boolean;
	/** Radicand or logarithm argument for exact identities. */ argument?: Scalar;
	/** Positive integer root order for bounded monomial reduction. */ index?:
		number | undefined;
}

/** Sparse monomial in formal constant atoms. */
type Powers = Array<[string, number]>;
/** Sparse exact complex polynomial in formal constants. */
type ConstantPolynomial = Map<string, RationalComplex>;

/** Proven real sign; unknown never authorizes a structural branch. */
export type RealSign = -1 | 0 | 1 | "unknown";
/** Exact zero knowledge, including nonreal constants. */
export type NonzeroProof = "zero" | "nonzero" | "unknown";

/** @returns A diagnostic for a required constant fact that cannot be proved. */
function uncertainConstant(): CanonicalError {
	return new CanonicalError(
		"unsupported",
		"This constant's sign or domain cannot be established exactly. Use the standard transform form.",
	);
}

/**
 * @param value - Exact integer numerator.
 * @returns Its exact sign, without conversion to a floating-point number.
 */
function bigintSign(value: bigint): -1 | 0 | 1 {
	return value === 0n ? 0 : value < 0n ? -1 : 1;
}

/**
 * @param atom - Validated formal constant.
 * @param power - Integer monomial exponent.
 * @returns Proven real sign of this factor.
 */
function atomPowerSign(
	atom: ConstantAtom | undefined,
	power: number,
): RealSign {
	if (!atom?.real) return "unknown";
	if (power % 2 === 0 && atom.nonzero) return 1;
	return atom.sign ?? "unknown";
}

/**
 * @param key - Monomial powers.
 * @param coefficient - Exact complex prefactor.
 * @param atoms - Known constant facts.
 * @returns Proven real sign of one monomial.
 */
function constantTermSign(
	key: string,
	coefficient: RationalComplex,
	atoms: Map<string, ConstantAtom>,
): RealSign {
	if (coefficient.im.numerator !== 0n) return "unknown";
	let sign: RealSign = bigintSign(coefficient.re.numerator);
	for (const [name, power] of JSON.parse(key) as Powers) {
		const next = atomPowerSign(atoms.get(name), power);
		if (next === "unknown") return "unknown";
		sign = (sign * next) as -1 | 0 | 1;
	}
	return sign;
}

/**
 * @param polynomial - Collected formal polynomial.
 * @param atoms - Known constant facts.
 * @returns Sign of a same-sign sum, or unknown for unresolved cancellation.
 */
function constantPolynomialSign(
	polynomial: ConstantPolynomial,
	atoms: Map<string, ConstantAtom>,
): RealSign {
	let result: RealSign = 0;
	for (const [key, coefficient] of polynomial) {
		const sign = constantTermSign(key, coefficient, atoms);
		if (sign === "unknown" || (result !== 0 && sign !== result))
			return "unknown";
		result = sign;
	}
	return result;
}

/**
 * @param polynomial - Collected constant expression.
 * @param atoms - Established atom facts.
 * @returns Zero knowledge without treating formal independence as a proof.
 */
function constantNonzero(
	polynomial: ConstantPolynomial,
	atoms: Map<string, ConstantAtom>,
): NonzeroProof {
	if (!polynomial.size) return "zero";
	const sign = constantPolynomialSign(polynomial, atoms);
	if (sign !== "unknown" && sign !== 0) return "nonzero";
	if (polynomial.size !== 1) return "unknown";
	const [key] = polynomial.keys();
	for (const [name] of JSON.parse(key!) as Powers)
		if (!atoms.get(name)?.nonzero) return "unknown";
	return "nonzero";
}

/**
 * @param proof - Established zero knowledge.
 * @returns Nothing when division is known to be defined.
 */
function requireNonzeroProof(proof: NonzeroProof): void {
	if (proof === "zero")
		throw new CanonicalError("invalid", "The answer divides by zero.");
	if (proof === "unknown") throw uncertainConstant();
}

/**
 * @param powers - Atom powers.
 * @returns Stable bounded monomial key.
 */
function monomial(powers: Powers): string {
	const sorted: Powers = [];
	let degree = 0;
	for (const pair of powers)
		if (pair[1] !== 0) {
			sorted.push(pair);
			degree += Math.abs(pair[1]);
		}
	sorted.sort(compareConstantNames);
	if (degree > 16) throw limitError();
	const result = JSON.stringify(sorted);
	if (result.length > 8192) throw limitError();
	return result;
}

/**
 * Orders constant monomials deterministically without numerical comparison.
 * @param a - First named tuple.
 * @param b - Second named tuple.
 * @returns Lexical ordering of formal names.
 */
function compareConstantNames(
	a: [string, unknown],
	b: [string, unknown],
): number {
	return a[0].localeCompare(b[0]);
}

/**
 * @param target - Mutable result polynomial.
 * @param key - Monomial.
 * @param coefficient - Exact contribution.
 * @returns Nothing after exact collection.
 */
function collectConstant(
	target: ConstantPolynomial,
	key: string,
	coefficient: RationalComplex,
): void {
	const value = (target.get(key) ?? complexField.zero).add(coefficient);
	if (value.isZero()) target.delete(key);
	else target.set(key, value);
	if (target.size > 64) throw limitError();
}

/**
 * @param a - First polynomial.
 * @param b - Second polynomial.
 * @returns Exact collected sum.
 */
function constantAdd(
	a: ConstantPolynomial,
	b: ConstantPolynomial,
): ConstantPolynomial {
	const result = new Map(a);
	for (const [key, value] of b) collectConstant(result, key, value);
	return result;
}

/**
 * @param polynomial - Polynomial.
 * @param factor - Complex scale.
 * @returns Exact scaled polynomial.
 */
function constantScale(
	polynomial: ConstantPolynomial,
	factor: RationalComplex,
): ConstantPolynomial {
	const result: ConstantPolynomial = new Map();
	for (const [key, value] of polynomial)
		collectConstant(result, key, value.multiply(factor));
	return result;
}

/**
 * @param key - Monomial.
 * @param atoms - Available formal atoms.
 * @returns Root-reduced monomial and coefficient.
 */
function reduceMonomial(
	key: string,
	atoms: Map<string, ConstantAtom>,
): [string, RationalComplex] {
	const originalPowers = JSON.parse(key) as Powers;
	const powers = new Map<string, number>(originalPowers);
	let coefficient = complexField.one;
	for (const [name, power] of originalPowers) {
		const atom = atoms.get(name);
		if (
			!atom?.index ||
			!atom.argument ||
			power < atom.index ||
			!atom.argument.isMonomial()
		)
			continue;
		const count = Math.floor(power / atom.index);
		powers.set(name, power % atom.index);
		const [radicandPowers, value] = atom.argument.monomialValue();
		for (let i = 0; i < count; i++)
			coefficient = coefficient.multiply(value);
		for (const [radicand, exponent] of radicandPowers)
			powers.set(
				radicand,
				(powers.get(radicand) ?? 0) + exponent * count,
			);
	}
	return [monomial([...powers]), coefficient];
}

/**
 * @param a - First polynomial.
 * @param b - Second polynomial.
 * @param atoms - Known root identities.
 * @returns Exact symbolic product.
 */
function constantMultiply(
	a: ConstantPolynomial,
	b: ConstantPolynomial,
	atoms: Map<string, ConstantAtom>,
): ConstantPolynomial {
	if (a.size * b.size > 64) throw limitError();
	const result: ConstantPolynomial = new Map();
	for (const [ka, va] of a)
		for (const [kb, vb] of b) {
			const powers = new Map<string, number>(JSON.parse(ka) as Powers);
			for (const [name, exponent] of JSON.parse(kb) as Powers)
				powers.set(name, (powers.get(name) ?? 0) + exponent);
			const [key, factor] = reduceMonomial(monomial([...powers]), atoms);
			collectConstant(result, key, va.multiply(vb).multiply(factor));
		}
	return result;
}

/**
 * @param polynomial - Nonzero polynomial.
 * @returns Minimum power of each atom across all terms.
 */
function commonPowers(polynomial: ConstantPolynomial): Map<string, number> {
	let result: Map<string, number> | null = null;
	for (const key of polynomial.keys()) {
		const powers = new Map<string, number>(JSON.parse(key) as Powers);
		if (!result) result = powers;
		else {
			for (const name of new Set([...result.keys(), ...powers.keys()]))
				result.set(
					name,
					Math.min(result.get(name) ?? 0, powers.get(name) ?? 0),
				);
		}
	}
	return result ?? new Map();
}

/**
 * @param polynomial - Polynomial.
 * @param powers - Common divisor powers.
 * @returns Monomial-canceled polynomial.
 */
function removePowers(
	polynomial: ConstantPolynomial,
	powers: Map<string, number>,
): ConstantPolynomial {
	const result: ConstantPolynomial = new Map();
	for (const [key, value] of polynomial) {
		const current = new Map<string, number>(JSON.parse(key) as Powers);
		for (const [name, exponent] of powers)
			current.set(name, (current.get(name) ?? 0) - exponent);
		collectConstant(result, monomial([...current]), value);
	}
	return result;
}

/** Exact rational expressions in pi and named roots/logarithms, never rounded structural constants. */
export class Scalar {
	/** Reduced sparse numerator. */ readonly numerator: ConstantPolynomial;
	/** Reduced sparse denominator. */ readonly denominator: ConstantPolynomial;
	/**
	 * @param numerator - Exact numerator.
	 * @param denominator - Nonzero exact denominator.
	 * @param atoms - Formal identities and diagnostic values.
	 */
	constructor(
		numerator: ConstantPolynomial,
		denominator: ConstantPolynomial,
		public readonly atoms = new Map<string, ConstantAtom>(),
	) {
		requireNonzeroProof(constantNonzero(denominator, atoms));
		if (!numerator.size) {
			this.numerator = new Map();
			this.denominator = new Map([["[]", complexField.one]]);
			return;
		}
		const a = commonPowers(numerator),
			b = commonPowers(denominator),
			common = new Map<string, number>();
		for (const name of new Set([...a.keys(), ...b.keys()]))
			common.set(name, Math.min(a.get(name) ?? 0, b.get(name) ?? 0));
		const n = removePowers(numerator, common),
			d = removePowers(denominator, common);
		const lead = [...d.entries()].sort(compareConstantNames)[0]![1];
		const factor = complexField.one.divide(lead);
		this.numerator = constantScale(n, factor);
		this.denominator = constantScale(d, factor);
	}
	/**
	 * @param other - Addend.
	 * @returns Exact formal sum.
	 */
	add(other: Scalar): Scalar {
		const atoms = new Map([...this.atoms, ...other.atoms]);
		return new Scalar(
			constantAdd(
				constantMultiply(this.numerator, other.denominator, atoms),
				constantMultiply(other.numerator, this.denominator, atoms),
			),
			constantMultiply(this.denominator, other.denominator, atoms),
			atoms,
		);
	}
	/** @returns Exact additive inverse. */
	negate(): Scalar {
		return new Scalar(
			constantScale(this.numerator, complexField.one.negate()),
			this.denominator,
			this.atoms,
		);
	}
	/**
	 * @param other - Factor.
	 * @returns Exact formal product with known root relations.
	 */
	multiply(other: Scalar): Scalar {
		const atoms = new Map([...this.atoms, ...other.atoms]);
		return new Scalar(
			constantMultiply(this.numerator, other.numerator, atoms),
			constantMultiply(this.denominator, other.denominator, atoms),
			atoms,
		);
	}
	/**
	 * @param other - Nonzero divisor.
	 * @returns Exact formal quotient, refusing unresolved constant zeros.
	 */
	divide(other: Scalar): Scalar {
		other.requireNonzero();
		const atoms = new Map([...this.atoms, ...other.atoms]);
		return new Scalar(
			constantMultiply(this.numerator, other.denominator, atoms),
			constantMultiply(this.denominator, other.numerator, atoms),
			atoms,
		);
	}
	/**
	 * @param other - Other scalar.
	 * @returns Exact identity through formal subtraction.
	 */
	equals(other: Scalar): boolean {
		return this.add(other.negate()).isZero();
	}
	/** @returns Whether the numerator vanishes exactly. */
	isZero(): boolean {
		return this.numerator.size === 0;
	}
	/** @returns Exact real sign or an explicit unknown result. */
	realSign(): RealSign {
		if (!this.isReal()) return "unknown";
		const n = constantPolynomialSign(this.numerator, this.atoms);
		const d = constantPolynomialSign(this.denominator, this.atoms);
		return n === "unknown" || d === "unknown"
			? "unknown"
			: ((n * d) as -1 | 0 | 1);
	}
	/** @returns Proven numerator zero knowledge; the denominator was validated before reduction. */
	nonzeroProof(): NonzeroProof {
		return constantNonzero(this.numerator, this.atoms);
	}
	/** @returns Nothing after proving that this constant is a valid divisor. */
	requireNonzero(): void {
		requireNonzeroProof(this.nonzeroProof());
	}
	/** @returns A proven real sign, refusing uncertain or nonreal decisions. */
	requireRealSign(): -1 | 0 | 1 {
		const sign = this.realSign();
		if (sign === "unknown") throw uncertainConstant();
		return sign;
	}
	/** @returns Stable diagnostic signature, not a substitute for exact equality. */
	key(): string {
		return JSON.stringify([
			constantPolynomialKey(this.numerator),
			constantPolynomialKey(this.denominator),
		]);
	}
	/** @returns Whether this is a pure exact complex rational. */
	rational(): RationalComplex | null {
		if (this.isZero()) return complexField.zero;
		if (
			this.numerator.size !== 1 ||
			!this.numerator.has("[]") ||
			this.denominator.size !== 1 ||
			!this.denominator.has("[]")
		)
			return null;
		return this.numerator.get("[]")!.divide(this.denominator.get("[]")!);
	}
	/** @returns Whether the scalar is a single nonzero Laurent monomial. */
	isMonomial(): boolean {
		return this.numerator.size === 1 && this.denominator.size === 1;
	}
	/** @returns Laurent powers and exact complex coefficient. */
	monomialValue(): [Powers, RationalComplex] {
		const [n, a] = [...this.numerator][0]!,
			[d, b] = [...this.denominator][0]!;
		const powers = new Map<string, number>(JSON.parse(n) as Powers);
		for (const [key, value] of JSON.parse(d) as Powers)
			powers.set(key, (powers.get(key) ?? 0) - value);
		const result: Powers = [];
		for (const pair of powers) if (pair[1] !== 0) result.push(pair);
		return [result, a.divide(b)];
	}
	/**
	 * @param kind - Expected atom family.
	 * @returns Single atom and its exact prefactor, or null.
	 */
	singleAtom(
		kind: ConstantAtom["kind"],
	): [ConstantAtom, RationalComplex] | null {
		if (!this.isMonomial()) return null;
		const [powers, value] = this.monomialValue();
		if (powers.length !== 1 || powers[0]![1] !== 1) return null;
		const atom = this.atoms.get(powers[0]![0]);
		return atom?.kind === kind ? [atom, value] : null;
	}
	/** @returns Whether unresolved non-pi atoms occur in the actual expression. */
	hasComputedAtoms(): boolean {
		for (const key of [
			...this.numerator.keys(),
			...this.denominator.keys(),
		])
			for (const [name] of JSON.parse(key) as Powers)
				if (this.atoms.get(name)?.kind !== "pi") return true;
		return false;
	}
	/**
	 * Establishes real-valuedness from exact coefficients and atom definitions.
	 * @returns Whether every numerator and denominator monomial is real.
	 */
	isReal(): boolean {
		for (const polynomial of [this.numerator, this.denominator])
			for (const [key, value] of polynomial) {
				if (value.im.numerator !== 0n) return false;
				for (const [name] of JSON.parse(key) as Powers)
					if (!this.atoms.get(name)?.real) return false;
			}
		return true;
	}
	/** @returns Finite diagnostic value, refusing unresolved near-zero constant expressions. */
	numeric(): Complex {
		const [n, magnitude] = evaluateConstants(this.numerator, this.atoms),
			[d, denominatorMagnitude] = evaluateConstants(
				this.denominator,
				this.atoms,
			);
		if (
			!this.rational() &&
			((n.abs() <= 1e-10 * magnitude && !this.isZero()) ||
				d.abs() <= 1e-10 * denominatorMagnitude)
		)
			throw new CanonicalError(
				"unsupported",
				"This constant identity cannot be established exactly. Use the standard transform form.",
			);
		const result = n.div(d);
		if (!Number.isFinite(result.re) || !Number.isFinite(result.im))
			throw new CanonicalError(
				"invalid",
				"The answer contains a nonfinite constant.",
			);
		if (result.abs() === 0 && !this.isZero())
			throw new CanonicalError(
				"unsupported",
				"This nonzero constant is outside the finite coefficient range.",
			);
		return result;
	}
}

/**
 * Serializes formal coefficients without rounding them into structural identities.
 * @param polynomial - Sparse constant polynomial.
 * @returns Deterministic exact tuple sequence.
 */
function constantPolynomialKey(
	polynomial: ConstantPolynomial,
): Array<[string, string]> {
	const result: Array<[string, string]> = [];
	for (const [key, value] of polynomial) result.push([key, value.key()]);
	return result.sort(compareConstantNames);
}

/**
 * @param polynomial - Constant polynomial.
 * @param atoms - Diagnostic values.
 * @returns Approximation and cancellation scale.
 */
function evaluateConstants(
	polynomial: ConstantPolynomial,
	atoms: Map<string, ConstantAtom>,
): [Complex, number] {
	let result = new Complex(0),
		magnitude = 0;
	for (const [key, coefficient] of polynomial) {
		let value = coefficient.numeric();
		for (const [name, power] of JSON.parse(key) as Powers) {
			const atom = atoms.get(name)!.value;
			if (power === 1) value = value.mul(atom);
			else {
				const z = new Complex(Math.log(atom.abs()), atom.arg()).mul(
					power,
				);
				value = value.mul(Complex.fromPolar(Math.exp(z.re), z.im));
			}
		}
		result = result.add(value);
		magnitude += value.abs();
	}
	return [result, magnitude];
}

/**
 * @param coefficient - Exact constant coefficient.
 * @returns Pure rational scalar.
 */
function rationalScalar(coefficient: RationalComplex): Scalar {
	return new Scalar(
		coefficient.isZero() ? new Map() : new Map([["[]", coefficient]]),
		new Map([["[]", complexField.one]]),
	);
}

/**
 * @param atom - Named formal function value.
 * @returns Exact atom with a finite diagnostic approximation.
 */
function atomScalar(atom: ConstantAtom): Scalar {
	if (
		atom.key.length > 4096 ||
		!Number.isFinite(atom.value.re) ||
		!Number.isFinite(atom.value.im)
	)
		throw limitError();
	if (atom.value.abs() === 0)
		throw new CanonicalError(
			"unsupported",
			"This nonzero constant cannot be represented without underflow.",
		);
	return new Scalar(
		new Map([[monomial([[atom.key, 1]]), complexField.one]]),
		new Map([["[]", complexField.one]]),
		new Map([[atom.key, atom], ...(atom.argument?.atoms ?? [])]),
	);
}

/**
 * @param re - Real decimal.
 * @param im - Imaginary decimal.
 * @returns Exact constant scalar.
 */
export function scalar(re: number, im = 0): Scalar {
	return rationalScalar(RationalComplex.decimal(re, im));
}

/**
 * Keeps boxed decimal precision exact, including coefficients below floating-point range.
 * @param literal - Validated numeric literal.
 * @returns Exact constant scalar or resource diagnostic.
 */
export function literalScalar(literal: string): Scalar {
	try {
		return rationalScalar(
			new RationalComplex(ExactFraction.fromLiteral(literal)),
		);
	} catch (error) {
		if (error instanceof RangeError) throw limitError();
		throw error;
	}
}

/** Formal pi, kept symbolic through sinc scaling and coefficient cancellation. */
export const symbolicPi: Scalar = atomScalar({
	key: "Pi",
	kind: "pi",
	value: new Complex(Math.PI),
	real: true,
	sign: 1,
	nonzero: true,
});

/** Symbolic coefficient field for polynomials in the problem variable. */
export const scalarField: Field<Scalar> = {
	zero: scalar(0),
	one: scalar(1),
	/**
	 * @param a - First value.
	 * @param b - Second value.
	 * @returns Sum.
	 */
	add: (a, b) => a.add(b),
	/**
	 * @param a - Value.
	 * @returns Additive inverse.
	 */
	negate: (a) => a.negate(),
	/**
	 * @param a - First value.
	 * @param b - Second value.
	 * @returns Product.
	 */
	multiply: (a, b) => a.multiply(b),
	/**
	 * @param a - Dividend.
	 * @param b - Divisor.
	 * @returns Quotient.
	 */
	divide: (a, b) => a.divide(b),
	/**
	 * @param a - Value.
	 * @returns Exact zero test.
	 */
	isZero: (a) => a.isZero(),
	/**
	 * @param a - Value.
	 * @returns Exact key.
	 */
	key: (a) => a.key(),
};

/**
 * @param value - Symbolic scalar.
 * @returns Finite numeric value for a coefficient slot.
 */
export function scalarNumeric(value: Scalar): Complex {
	return value.numeric();
}

/**
 * @param value - Base scalar.
 * @param count - Bounded integer.
 * @returns Exact symbolic power.
 */
function scalarPower(value: Scalar, count: number): Scalar {
	if (Math.abs(count) > 4096) throw limitError();
	if (count === 0 && value.isZero())
		throw new CanonicalError(
			"invalid",
			"An undefined power appears in the answer.",
		);
	let factor = count < 0 ? scalar(1).divide(value) : value,
		remaining = Math.abs(count),
		result = scalar(1);
	while (remaining > 0) {
		if (remaining % 2 === 1) result = result.multiply(factor);
		remaining = Math.floor(remaining / 2);
		if (remaining) factor = factor.multiply(factor);
	}
	return result;
}

/**
 * @param argument - Constant radicand.
 * @param index - Constant root index.
 * @returns Formal principal root with exact elementary identities.
 */
export function scalarRoot(argument: Scalar, index: Scalar): Scalar {
	const indexSign = index.requireRealSign();
	const b = rootIndexValue(index);
	if (index.equals(scalar(1))) return argument;
	if (argument.isZero()) {
		if (indexSign > 0) return scalar(0);
		throw new CanonicalError(
			"invalid",
			"A negative root of zero is undefined.",
		);
	}
	argument.requireNonzero();
	if (!argument.isReal() && !argument.rational()) throw uncertainConstant();
	const sign = argument.isReal() ? argument.requireRealSign() : "unknown";
	const a = scalarNumeric(argument);
	const value = principalRoot(a, b.re, sign, index.equals(scalar(2))),
		count = exactRootOrder(index);
	const candidate = rootCandidate(value, count, argument);
	if (candidate) return candidate;
	return atomScalar({
		key: `Root(${argument.key()},${index.key()})`,
		kind: "root",
		value,
		argument,
		real: sign === 1,
		sign: sign === 1 ? 1 : "unknown",
		nonzero: true,
		index: count,
	});
}

/**
 * Validates a genuinely real, nonzero index before root evaluation.
 * @param index - Formal index expression.
 * @returns Finite real index value.
 */
function rootIndexValue(index: Scalar): Complex {
	if (!index.isReal())
		throw new CanonicalError(
			"unsupported",
			"Use a real constant root index.",
		);
	const value = scalarNumeric(index);
	if (index.requireRealSign() === 0)
		throw new CanonicalError(
			"invalid",
			"The root index must be a nonzero real constant.",
		);
	return value;
}

/**
 * Evaluates a principal constant root without a spurious imaginary-unit residual.
 * @param value - Finite radicand.
 * @param index - Validated real index approximation.
 * @param sign - Proven real radicand sign, or unknown for a nonreal radicand.
 * @param square - Whether the index is exactly positive two.
 * @returns Constant root approximation for coefficient diagnostics.
 */
function principalRoot(
	value: Complex,
	index: number,
	sign: RealSign,
	square: boolean,
): Complex {
	if (sign === -1 && square)
		return new Complex(0, value.abs() ** (1 / index));
	return Complex.fromPolar(value.abs() ** (1 / index), value.arg() / index);
}

/**
 * Determines a bounded root relation from exact arithmetic, never rounded equality.
 * @param index - Formal index expression.
 * @returns Positive integer relation order or undefined.
 */
function exactRootOrder(index: Scalar): number | undefined {
	const value = realRationalExponent(index);
	if (
		!value ||
		value.denominator !== 1n ||
		value.numerator < 1n ||
		value.numerator > 16n
	)
		return undefined;
	return Number(value.numerator);
}

/**
 * Accepts a rational root only when exponentiation proves its identity exactly.
 * @param value - Numerical candidate.
 * @param count - Exact relation order.
 * @param argument - Independent radicand.
 * @returns Proved rational root or null.
 */
function rootCandidate(
	value: Complex,
	count: number | undefined,
	argument: Scalar,
): Scalar | null {
	if (!count) return null;
	const candidate = scalar(value.re, value.im);
	// A rounded candidate must also satisfy the principal branch, not just its power identity.
	if (!principalCandidate(candidate, argument, count)) return null;
	return scalarPower(candidate, count).equals(argument) ? candidate : null;
}

/**
 * @param candidate - Exact rational root candidate.
 * @param argument - Validated radicand.
 * @param count - Exact positive root order.
 * @returns Whether elementary principal-branch facts establish this candidate.
 */
function principalCandidate(
	candidate: Scalar,
	argument: Scalar,
	count: number,
): boolean {
	const value = candidate.rational()!;
	if (!argument.isReal()) return count === 2 && value.re.numerator > 0n;
	if (argument.requireRealSign() === 1) return candidate.realSign() === 1;
	return count === 2 && value.re.numerator === 0n && value.im.numerator > 0n;
}

/**
 * @param argument - Positive real constant.
 * @returns Formal logarithm, with log(1) exact.
 */
export function scalarLog(argument: Scalar): Scalar {
	if (argument.equals(scalar(1))) return scalar(0);
	if (!argument.isReal())
		throw new CanonicalError(
			"unsupported",
			"Use a positive real logarithm constant.",
		);
	const exponential = argument.singleAtom("exp");
	if (
		exponential &&
		exponential[1].key() === complexField.one.key() &&
		exponential[0].argument?.isReal()
	)
		return exponential[0].argument;
	const value = scalarNumeric(argument);
	if (argument.requireRealSign() <= 0)
		throw new CanonicalError(
			"invalid",
			"The logarithm requires a positive real constant.",
		);
	return atomScalar({
		key: `Log(${argument.key()})`,
		kind: "log",
		value: new Complex(Math.log(value.re)),
		argument,
		real: true,
		sign: argument.add(scalar(-1)).realSign(),
		nonzero: argument.add(scalar(-1)).nonzeroProof() === "nonzero",
	});
}

/**
 * @param argument - Constant exponent.
 * @returns Formal exponential with exact integer log compositions.
 */
export function scalarExp(argument: Scalar): Scalar {
	if (argument.isZero()) return scalar(1);
	const logarithm = argument.singleAtom("log");
	if (
		logarithm &&
		logarithm[1].im.numerator === 0n &&
		logarithm[1].re.denominator === 1n
	)
		return scalarPower(
			logarithm[0].argument!,
			Number(logarithm[1].re.numerator),
		);
	const value = scalarNumeric(argument);
	return atomScalar({
		key: `Exp(${argument.key()})`,
		kind: "exp",
		value: Complex.fromPolar(Math.exp(value.re), value.im),
		argument,
		real: argument.isReal(),
		sign: argument.isReal() ? 1 : "unknown",
		nonzero: true,
	});
}

/**
 * @param argument - Constant base.
 * @param exponent - Constant exponent.
 * @returns Formal power, recognizing rational root aliases.
 */
export function scalarConstantPower(
	argument: Scalar,
	exponent: Scalar,
): Scalar {
	const rational = realRationalExponent(exponent);
	if (rational?.denominator === 1n)
		return scalarPower(argument, Number(rational.numerator));
	if (rational && boundedRootExponent(rational))
		return scalarPower(
			scalarRoot(
				argument,
				literalScalar(rational.denominator.toString()),
			),
			Number(rational.numerator),
		);
	const a = scalarNumeric(argument),
		b = scalarNumeric(exponent);
	argument.requireNonzero();
	if (!argument.isReal() && !argument.rational()) throw uncertainConstant();
	const positive = argument.isReal() && argument.requireRealSign() === 1;
	const z = new Complex(Math.log(a.abs()), a.arg()).mul(b);
	return atomScalar({
		key: `Power(${argument.key()},${exponent.key()})`,
		kind: "power",
		value: Complex.fromPolar(Math.exp(z.re), z.im),
		argument,
		real: positive && exponent.isReal(),
		sign: positive && exponent.isReal() ? 1 : "unknown",
		nonzero: true,
	});
}

/**
 * Extracts an exact real rational without any numerical rounding.
 * @param value - Formal constant expression.
 * @returns Exact exponent fraction or null.
 */
function realRationalExponent(value: Scalar): ExactFraction | null {
	const result = value.rational();
	return result && result.im.numerator === 0n ? result.re : null;
}

/**
 * Bounds root aliases before symbolic expansion.
 * @param exponent - Exact real rational exponent.
 * @returns Whether a bounded elementary root identity is supported.
 */
function boundedRootExponent(exponent: ExactFraction): boolean {
	return (
		exponent.denominator > 1n &&
		exponent.denominator <= 16n &&
		exponent.numerator >= -16n &&
		exponent.numerator <= 16n
	);
}

/**
 * Preserves exact real absolute values and formal complex magnitudes.
 * @param value - Constant scalar.
 * @returns Exact magnitude identity or a formal constant coefficient.
 */
export function scalarAbs(value: Scalar): Scalar {
	const exact = value.rational();
	if (exact)
		return scalarRoot(
			rationalScalar(
				new RationalComplex(
					exact.re
						.multiply(exact.re)
						.add(exact.im.multiply(exact.im)),
				),
			),
			scalar(2),
		);
	if (value.isReal())
		return value.requireRealSign() < 0 ? value.negate() : value;
	const numeric = scalarNumeric(value);
	const root = value.singleAtom("root");
	if (root?.[0].index)
		return scalarRoot(
			scalarAbs(root[0].argument!),
			scalar(root[0].index),
		).multiply(scalarAbs(rationalScalar(root[1])));
	const exponential = value.singleAtom("exp");
	if (exponential?.[0].argument?.rational()?.re.numerator === 0n)
		return scalarAbs(rationalScalar(exponential[1]));
	return atomScalar({
		key: `Abs(${value.key()})`,
		kind: "abs",
		value: new Complex(numeric.abs()),
		argument: value,
		real: true,
		sign: value.nonzeroProof() === "nonzero" ? 1 : "unknown",
		nonzero: value.nonzeroProof() === "nonzero",
	});
}

/** Mathematical e remains formal when used as a coefficient rather than an operator. */
export const symbolicE: Scalar = scalarExp(scalar(1));

/** Rational factor in the independent variable with symbolic coefficients. */
export type Factor = RationalFunction<Scalar>;

/**
 * @param value - Constant coefficient.
 * @returns Constant rational factor.
 */
export function constantFactor(value: Scalar): Factor {
	return new RationalFunction([value], [scalarField.one], scalarField);
}

/**
 * @param value - Rational factor.
 * @param point - Exact variable assignment.
 * @returns Symbolic evaluated scalar.
 */
export function factorAt(value: Factor, point: Scalar): Scalar {
	/**
	 * @param coefficients - Variable polynomial.
	 * @returns Exact assigned value.
	 */
	const evaluate = (coefficients: Polynomial<Scalar>): Scalar => {
		let result = scalar(0);
		for (let index = coefficients.length - 1; index >= 0; index--)
			result = result.multiply(point).add(coefficients[index]!);
		return result;
	};
	return evaluate(value.numerator).divide(evaluate(value.denominator));
}

/**
 * @param actual - Submitted polynomial.
 * @param expected - Target polynomial.
 * @param field - Scalar arithmetic.
 * @returns Exact structural equality.
 */
export function polynomialEqual<T>(
	actual: Polynomial<T>,
	expected: Polynomial<T>,
	field: Field<T>,
): boolean {
	return (
		actual.length === expected.length &&
		actual.every(
			/**
			 * @param value - Submitted coefficient.
			 * @param index - Coefficient slot.
			 * @returns Exact equality.
			 */
			(value, index) =>
				field.isZero(field.add(value, field.negate(expected[index]!))),
		)
	);
}

/**
 * @param actual - Submitted scalar.
 * @param expected - Matched target scalar.
 * @returns Controlled nonzero coefficient agreement.
 */
export function coefficientMatches(actual: Scalar, expected: Scalar): boolean {
	if (actual.equals(expected)) return true;
	if (scalarField.isZero(expected)) return scalarField.isZero(actual);
	if (scalarField.isZero(actual)) return false;
	const a = scalarNumeric(actual),
		b = scalarNumeric(expected);
	return a.sub(b).abs() <= 1e-8 + 1e-8 * b.abs();
}

/**
 * @param actual - Submitted factor.
 * @param expected - Target factor.
 * @returns Same poles and controlled coefficients after exact cancellation.
 */
export function factorMatches(actual: Factor, expected: Factor): boolean {
	if (!polynomialEqual(actual.denominator, expected.denominator, scalarField))
		return false;
	for (
		let index = 0;
		index < Math.max(actual.numerator.length, expected.numerator.length);
		index++
	) {
		if (
			!coefficientMatches(
				actual.numerator[index] ?? scalarField.zero,
				expected.numerator[index] ?? scalarField.zero,
			)
		)
			return false;
	}
	return true;
}
