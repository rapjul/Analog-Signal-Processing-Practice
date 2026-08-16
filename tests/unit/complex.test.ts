import { describe, expect, it } from "vitest";
import { Complex } from "$lib/math-engine/complex";

describe("Complex Number Math Engine (complex.ts)", () => {
	describe("Constructors and Static Factories", () => {
		it("creates a complex number with real and imaginary parts", () => {
			const z = new Complex(3, 4);
			expect(z.re).toBe(3);
			expect(z.im).toBe(4);
		});

		it("defaults imaginary part to zero if omitted", () => {
			const z = new Complex(5);
			expect(z.re).toBe(5);
			expect(z.im).toBe(0);
		});

		it("creates a complex number from polar coordinates in radians", () => {
			const z = Complex.fromPolar(2, Math.PI / 2);
			expect(z.re).toBeCloseTo(0, 5);
			expect(z.im).toBeCloseTo(2, 5);
		});

		it("creates a complex number from polar coordinates in degrees", () => {
			const z = Complex.fromPolarDeg(10, 180);
			expect(z.re).toBeCloseTo(-10, 5);
			expect(z.im).toBeCloseTo(0, 5);

			const z45 = Complex.fromPolarDeg(Math.SQRT2, 45);
			expect(z45.re).toBeCloseTo(1, 5);
			expect(z45.im).toBeCloseTo(1, 5);
		});
	});

	describe("Magnitude and Phase Angle Properties", () => {
		it("computes magnitude (abs) correctly", () => {
			const z = new Complex(3, 4);
			expect(z.abs()).toBe(5);

			const zZero = new Complex(0, 0);
			expect(zZero.abs()).toBe(0);
		});

		it("computes principal phase angle in radians (arg)", () => {
			const zPosReal = new Complex(5, 0);
			expect(zPosReal.arg()).toBeCloseTo(0, 5);

			const zPosImag = new Complex(0, 2);
			expect(zPosImag.arg()).toBeCloseTo(Math.PI / 2, 5);

			const zNegReal = new Complex(-4, 0);
			expect(zNegReal.arg()).toBeCloseTo(Math.PI, 5);

			const zNegImag = new Complex(0, -3);
			expect(zNegImag.arg()).toBeCloseTo(-Math.PI / 2, 5);
		});

		it("computes principal phase angle in degrees (argDeg)", () => {
			const z = new Complex(1, 1);
			expect(z.argDeg()).toBeCloseTo(45, 5);

			const z4 = new Complex(1, -Math.sqrt(3));
			expect(z4.argDeg()).toBeCloseTo(-60, 5);
		});

		it("returns full polar representation object (toPolar)", () => {
			const z = new Complex(0, 5);
			const polar = z.toPolar();
			expect(polar.r).toBeCloseTo(5, 5);
			expect(polar.theta).toBeCloseTo(Math.PI / 2, 5);
			expect(polar.thetaDeg).toBeCloseTo(90, 5);
		});
	});

	describe("Arithmetic Operations", () => {
		it("adds two complex numbers (add)", () => {
			const z1 = new Complex(1, 2);
			const z2 = new Complex(3, -5);
			const sum = z1.add(z2);
			expect(sum.re).toBe(4);
			expect(sum.im).toBe(-3);
		});

		it("subtracts two complex numbers (sub)", () => {
			const z1 = new Complex(5, 7);
			const z2 = new Complex(2, 3);
			const diff = z1.sub(z2);
			expect(diff.re).toBe(3);
			expect(diff.im).toBe(4);
		});

		it("multiplies by another complex number (mul with Complex)", () => {
			// (1 + 2j)(3 + 4j) = 3 + 4j + 6j - 8 = -5 + 10j
			const z1 = new Complex(1, 2);
			const z2 = new Complex(3, 4);
			const prod = z1.mul(z2);
			expect(prod.re).toBe(-5);
			expect(prod.im).toBe(10);
		});

		it("multiplies by a scalar number (mul with number)", () => {
			const z = new Complex(2, -3);
			const scaled = z.mul(4);
			expect(scaled.re).toBe(8);
			expect(scaled.im).toBe(-12);
		});

		it("divides by another complex number (div with Complex)", () => {
			// (1 + 2j) / (3 - 4j) = (1 + 2j)(3 + 4j) / 25 = (-5 + 10j) / 25 = -0.2 + 0.4j
			const z1 = new Complex(1, 2);
			const z2 = new Complex(3, -4);
			const quot = z1.div(z2);
			expect(quot.re).toBeCloseTo(-0.2, 5);
			expect(quot.im).toBeCloseTo(0.4, 5);
		});

		it("divides by a scalar number (div with number)", () => {
			const z = new Complex(6, -9);
			const quot = z.div(3);
			expect(quot.re).toBe(2);
			expect(quot.im).toBe(-3);
		});

		it("throws an error when dividing by complex zero", () => {
			const z1 = new Complex(4, 5);
			const zZero = new Complex(0, 0);
			expect(() => z1.div(zZero)).toThrow("Complex division by zero");
		});

		it("computes the complex conjugate (conjugate)", () => {
			const z = new Complex(3, -4);
			const conj = z.conjugate();
			expect(conj.re).toBe(3);
			expect(conj.im).toBe(4);

			const zReal = new Complex(5, 0);
			expect(zReal.conjugate().im).toBe(-0);
		});
	});

	describe("LaTeX String Formatting (toLatex)", () => {
		it("formats pure real numbers", () => {
			expect(new Complex(5, 0).toLatex()).toBe("5");
			expect(new Complex(-3.25, 0).toLatex()).toBe("-3.25");
			expect(new Complex(0, 0).toLatex()).toBe("0");
		});

		it("formats pure imaginary numbers (unit and scaled)", () => {
			expect(new Complex(0, 1).toLatex()).toBe("j");
			expect(new Complex(0, -1).toLatex()).toBe("-j");
			expect(new Complex(0, 4).toLatex()).toBe("4j");
			expect(new Complex(0, -2.5).toLatex()).toBe("-2.5j");
		});

		it("formats mixed complex numbers with positive and negative imaginary parts", () => {
			expect(new Complex(3, 4).toLatex()).toBe("3 + 4j");
			expect(new Complex(3, -4).toLatex()).toBe("3 - 4j");
			expect(new Complex(-2, 1).toLatex()).toBe("-2 + j");
			expect(new Complex(-2, -1).toLatex()).toBe("-2 - j");
		});

		it("respects custom precision argument", () => {
			const z = new Complex(1 / 3, 2 / 3);
			expect(z.toLatex(2)).toBe("0.33 + 0.67j");
			expect(z.toLatex(4)).toBe("0.3333 + 0.6667j");
		});
	});
});
