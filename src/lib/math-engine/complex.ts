/**
 * Complex Number Utility Class for Calculations.
 * Handles rectangular (a + jb) and polar (r ∠ θ) representations,
 * arithmetic operations, and formatting for LaTeX rendering.
 */

export interface ComplexPolar {
	/** Magnitude r = |Z| */
	r: number;
	/** Phase angle θ in radians */
	theta: number;
	/** Phase angle θ in degrees */
	thetaDeg: number;
}

export class Complex {
	/** Real component x = Re{Z} */
	public re: number;
	/** Imaginary component y = Im{Z} */
	public im: number;

	/**
	 * Creates a Complex number instance.
	 * @param {number} re Real part
	 * @param {number} im Imaginary part (default 0)
	 */
	constructor(re: number, im: number = 0) {
		this.re = re;
		this.im = im;
	}

	/**
	 * Construct a Complex number from polar coordinates.
	 * @param {number} r Magnitude
	 * @param {number} thetaRad Phase angle in radians
	 * @returns {Complex} New Complex instance
	 */
	static fromPolar(r: number, thetaRad: number): Complex {
		return new Complex(r * Math.cos(thetaRad), r * Math.sin(thetaRad));
	}

	/**
	 * Construct a Complex number from polar coordinates with angle in degrees.
	 * @param {number} r Magnitude
	 * @param {number} thetaDeg Phase angle in degrees
	 * @returns {Complex} New Complex instance
	 */
	static fromPolarDeg(r: number, thetaDeg: number): Complex {
		const rad = (thetaDeg * Math.PI) / 180;
		return new Complex(r * Math.cos(rad), r * Math.sin(rad));
	}

	/**
	 * Calculates the magnitude (absolute value) |Z|.
	 * @returns {number} Magnitude
	 */
	public abs(): number {
		return Math.hypot(this.re, this.im);
	}

	/**
	 * Calculates the principal phase angle θ in radians (-π, π].
	 * @returns {number} Phase angle in radians
	 */
	public arg(): number {
		return Math.atan2(this.im, this.re);
	}

	/**
	 * Calculates the principal phase angle θ in degrees (-180°, 180°].
	 * @returns {number} Phase angle in degrees
	 */
	public argDeg(): number {
		return (Math.atan2(this.im, this.re) * 180) / Math.PI;
	}

	/**
	 * Returns polar representation object.
	 * @returns {ComplexPolar} Polar representation
	 */
	public toPolar(): ComplexPolar {
		return {
			r: this.abs(),
			theta: this.arg(),
			thetaDeg: this.argDeg(),
		};
	}

	/**
	 * Adds another complex number.
	 * @param {Complex} other Number to add
	 * @returns {Complex} Sum Z1 + Z2
	 */
	public add(other: Complex): Complex {
		return new Complex(this.re + other.re, this.im + other.im);
	}

	/**
	 * Subtracts another complex number.
	 * @param {Complex} other Number to subtract
	 * @returns {Complex} Difference Z1 - Z2
	 */
	public sub(other: Complex): Complex {
		return new Complex(this.re - other.re, this.im - other.im);
	}

	/**
	 * Multiplies by another complex number.
	 * @param {Complex | number} other Number or scalar multiplier
	 * @returns {Complex} Product Z1 * Z2
	 */
	public mul(other: Complex | number): Complex {
		if (typeof other === "number") {
			return new Complex(this.re * other, this.im * other);
		}
		return new Complex(
			this.re * other.re - this.im * other.im,
			this.re * other.im + this.im * other.re,
		);
	}

	/**
	 * Divides by another complex number.
	 * @param {Complex | number} other Divisor
	 * @returns {Complex} Quotient Z1 / Z2
	 */
	public div(other: Complex | number): Complex {
		if (typeof other === "number") {
			return new Complex(this.re / other, this.im / other);
		}
		const denom = other.re * other.re + other.im * other.im;
		if (denom === 0) {
			throw new Error("Complex division by zero");
		}
		return new Complex(
			(this.re * other.re + this.im * other.im) / denom,
			(this.im * other.re - this.re * other.im) / denom,
		);
	}

	/**
	 * Calculates complex conjugate Z*.
	 * @returns {Complex} Conjugate a - jb
	 */
	public conjugate(): Complex {
		return new Complex(this.re, -this.im);
	}

	/**
	 * Formats complex number as LaTeX string for rendering.
	 * @param {number} precision Decimal places (default 2)
	 * @returns {string} LaTeX string
	 */
	public toLatex(precision: number = 2): string {
		const r = Number(this.re.toFixed(precision));
		const i = Number(this.im.toFixed(precision));

		if (i === 0) return `${r}`;
		if (r === 0) {
			if (i === 1) return "j";
			if (i === -1) return "-j";
			return `${i}j`;
		}
		const sign = i > 0 ? "+" : "-";
		const absI = Math.abs(i);
		const iStr = absI === 1 ? "j" : `${absI}j`;
		return `${r} ${sign} ${iStr}`;
	}
}
