/** Exact decimal-derived fractions for analytical coefficient displays. */

/**
 * Finds the greatest common divisor of two integer magnitudes.
 *
 * @param left - First integer.
 * @param right - Second integer.
 * @returns Nonnegative common divisor.
 */
function gcd(left: bigint, right: bigint): bigint {
	let a = left < 0n ? -left : left,
		b = right < 0n ? -right : right;
	while (b !== 0n) [a, b] = [b, a % b];
	return a;
}

/**
 * Rational arithmetic retaining the exact decimal component values supplied by
 * the UI.
 */
export class ExactFraction {
	/** Reduced signed numerator. */
	readonly numerator: bigint;
	/** Reduced positive denominator. */
	readonly denominator: bigint;

	/**
	 * Normalizes a rational value.
	 *
	 * @param numerator - Signed numerator.
	 * @param denominator - Nonzero denominator.
	 */
	constructor(numerator: bigint, denominator = 1n) {
		if (denominator === 0n)
			throw new Error("Exact fraction division by zero");
		const divisor = gcd(numerator, denominator);
		const sign = denominator < 0n ? -1n : 1n;
		this.numerator = (sign * numerator) / divisor;
		this.denominator = (sign * denominator) / divisor;
	}

	/**
	 * Converts the supplied finite decimal, including scientific notation,
	 * exactly.
	 *
	 * @param value - Decimal component or constant.
	 * @returns Rational representation of that decimal value.
	 */
	static fromDecimal(value: number): ExactFraction {
		if (!Number.isFinite(value))
			throw new Error("Exact fractions require finite decimal values");
		const [mantissa = "0", exponentText = "0"] = value
			.toString()
			.toLowerCase()
			.split("e");
		const decimals = mantissa.split(".")[1]?.length ?? 0;
		const shift = Number(exponentText) - decimals;
		const digits = BigInt(mantissa.replace(".", ""));
		return shift >= 0
			? new ExactFraction(digits * 10n ** BigInt(shift))
			: new ExactFraction(digits, 10n ** BigInt(-shift));
	}

	/**
	 * Preserves all digits of a boxed decimal literal before numeric conversion.
	 * @param value - Decimal or scientific-notation literal.
	 * @returns Reduced exact fraction with bounded literal expansion.
	 */
	static fromLiteral(value: string): ExactFraction {
		if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value))
			throw new Error("Invalid decimal literal");
		if (value.length > 4096)
			throw new RangeError("Decimal literal exceeds verification limits");
		const [mantissa = "0", exponentText = "0"] = value
			.toLowerCase()
			.split("e");
		const shift =
			Number(exponentText) - (mantissa.split(".")[1]?.length ?? 0);
		if (!Number.isFinite(shift) || Math.abs(shift) > 4096)
			throw new RangeError(
				"Decimal exponent exceeds verification limits",
			);
		const digits = BigInt(mantissa.replace(".", ""));
		return shift >= 0
			? new ExactFraction(digits * 10n ** BigInt(shift))
			: new ExactFraction(digits, 10n ** BigInt(-shift));
	}

	/**
	 * Multiplies two exact values.
	 *
	 * @param other - Second factor.
	 * @returns Reduced product.
	 */
	multiply(other: ExactFraction): ExactFraction {
		return new ExactFraction(
			this.numerator * other.numerator,
			this.denominator * other.denominator,
		);
	}

	/**
	 * @param other - Addend.
	 * @returns Exact reduced sum.
	 */
	add(other: ExactFraction): ExactFraction {
		return new ExactFraction(
			this.numerator * other.denominator +
				other.numerator * this.denominator,
			this.denominator * other.denominator,
		);
	}

	/** @returns Exact additive inverse. */
	negate(): ExactFraction {
		return new ExactFraction(-this.numerator, this.denominator);
	}

	/** @returns Numeric approximation for coefficient tolerance only. */
	toNumber(): number {
		return Number(this.numerator) / Number(this.denominator);
	}

	/**
	 * Divides by an exact nonzero value.
	 *
	 * @param other - Divisor.
	 * @returns Reduced quotient.
	 */
	divide(other: ExactFraction): ExactFraction {
		return new ExactFraction(
			this.numerator * other.denominator,
			this.denominator * other.numerator,
		);
	}

	/**
	 * @returns Exact reduced LaTeX, with an integer when the denominator is
	 *   one.
	 */
	toLatex(): string {
		if (this.denominator === 1n) return String(this.numerator);
		const sign = this.numerator < 0n ? "-" : "";
		const magnitude =
			this.numerator < 0n ? -this.numerator : this.numerator;
		return String.raw`${sign}\frac{${magnitude}}{${this.denominator}}`;
	}
}
