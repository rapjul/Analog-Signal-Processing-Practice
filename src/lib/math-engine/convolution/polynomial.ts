export type Polynomial = number[];
export const EPSILON = 1e-10;

export function trimPolynomial(polynomial: Polynomial): Polynomial {
	const result = polynomial.map((value) =>
		Math.abs(value) < EPSILON ? 0 : value,
	);
	while (result.length > 1 && result.at(-1) === 0) result.pop();
	return result;
}

export function addPolynomial(left: Polynomial, right: Polynomial): Polynomial {
	const length = Math.max(left.length, right.length);
	return trimPolynomial(
		Array.from(
			{ length },
			(_, index) => (left[index] ?? 0) + (right[index] ?? 0),
		),
	);
}

export function scalePolynomial(
	polynomial: Polynomial,
	scale: number,
): Polynomial {
	return trimPolynomial(polynomial.map((value) => value * scale));
}

export function multiplyPolynomial(
	left: Polynomial,
	right: Polynomial,
): Polynomial {
	const result = Array.from(
		{ length: left.length + right.length - 1 },
		() => 0,
	);
	for (const [leftIndex, leftValue] of left.entries()) {
		for (const [rightIndex, rightValue] of right.entries()) {
			const idx = leftIndex + rightIndex;
			result[idx] = (result[idx] ?? 0) + leftValue * rightValue;
		}
	}
	return trimPolynomial(result);
}

export function powerPolynomial(
	polynomial: Polynomial,
	exponent: number,
): Polynomial {
	let result: Polynomial = [1];
	for (let index = 0; index < exponent; index += 1)
		result = multiplyPolynomial(result, polynomial);
	return result;
}

export function evaluatePolynomial(polynomial: Polynomial, t: number): number {
	return polynomial.reduceRight(
		(value, coefficient) => value * t + coefficient,
		0,
	);
}
