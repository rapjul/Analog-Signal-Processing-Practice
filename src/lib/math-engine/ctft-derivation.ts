/** Family-specific algebra between integral setup and the base transform. */
import type { CtftLessonPart } from "./ctft-lesson";
import type { GeneratedCtftProblem } from "./fourier-transform";

/** Independently graded intermediate tasks and their completed algebra. */
interface CtftDerivation {
	/** Ordered derivation exercises. */ parts: CtftLessonPart[];
	/** Parameter-owned complete equation chain. */ latex: string;
}

/**
 * Creates a typed intermediate calculation with task-specific progressive hints.
 * @param id - Stable substep identity.
 * @param label - Accessible prompt.
 * @param expected - Parameter-derived canonical target.
 * @param contextLatex - Equation containing the requested intermediate value.
 * @param hint - First conceptual hint.
 * @param detail - More specific mathematical guidance.
 * @returns A fresh bounded calculation task.
 */
function calculation(
	id: string,
	label: string,
	expected: string,
	contextLatex: string,
	hint: string,
	detail: string,
): CtftLessonPart {
	return {
		id,
		label,
		kind: "calculation",
		expected,
		contextLatex,
		hints: [hint, detail],
	};
}

/**
 * Constructs integral evaluation, sifting, or distribution-identity exercises.
 * @param problem - Unit-amplitude unshifted signal with authoritative parameters.
 * @returns Intermediate work and an explicit worked derivation.
 */
export function buildCtftDerivation(
	problem: GeneratedCtftProblem,
): CtftDerivation {
	const { T, a, w0 } = problem.params;
	switch (problem.signalType) {
		case "rect":
			return {
				parts: [
					calculation(
						"primitive",
						"Kernel antiderivative coefficient",
						String.raw`\frac{1}{-j\omega}`,
						String.raw`\int e^{-j\omega t}\,dt=C(\omega)e^{-j\omega t}`,
						"Differentiate the proposed primitive with respect to time.",
						String.raw`The chain rule multiplies by $-j\omega$, so choose its reciprocal.`,
					),
					calculation(
						"endpoints",
						"Upper minus lower endpoint expression",
						String.raw`\frac{e^{-j\omega ${T}/2}-e^{j\omega ${T}/2}}{-j\omega}`,
						String.raw`X_0(\omega)=\left[\frac{e^{-j\omega t}}{-j\omega}\right]_{-${T}/2}^{${T}/2}`,
						"Substitute the upper endpoint first, then subtract the lower endpoint.",
						String.raw`The lower endpoint reverses the exponential sign. Keep the common divisor $-j\omega$.`,
					),
					calculation(
						"limit",
						"Zero-frequency limit",
						String(T),
						String.raw`X_0(0)=\int_{-${T}/2}^{${T}/2}1\,dt`,
						"At zero frequency the kernel equals one.",
						"The integral equals the full pulse width.",
					),
				],
				latex: String.raw`\begin{aligned}X_0(\omega)&=\int_{-${T}/2}^{${T}/2}e^{-j\omega t}\,dt\\&=\left[\frac{e^{-j\omega t}}{-j\omega}\right]_{-${T}/2}^{${T}/2}\\&=\frac{e^{-j\omega ${T}/2}-e^{j\omega ${T}/2}}{-j\omega}\\&=\frac{-2j\sin(${T}\omega/2)}{-j\omega}=\frac{2\sin(${T}\omega/2)}{\omega}\\&=${T}\frac{\sin(${T}\omega/2)}{${T}\omega/2}=${T}\operatorname{sinc}\left(\frac{${T}\omega}{2\pi}\right),\quad X_0(0)=${T}.\end{aligned}`,
			};
		case "exponential":
			return {
				parts: [
					calculation(
						"primitive",
						"Exponential antiderivative coefficient",
						String.raw`-\frac{1}{${a}+j\omega}`,
						String.raw`\int e^{-(${a}+j\omega)t}\,dt=C(\omega)e^{-(${a}+j\omega)t}`,
						"Divide by the coefficient of time in the exponent.",
						"The coefficient has a leading minus sign; retain it in the reciprocal.",
					),
					calculation(
						"upper",
						"Infinite-endpoint contribution",
						"0",
						String.raw`\lim_{t\to\infty}\frac{-e^{-(${a}+j\omega)t}}{${a}+j\omega}`,
						"The real decay parameter is positive.",
						"The exponential magnitude tends to zero at the upper endpoint.",
					),
					calculation(
						"lower",
						"Lower-endpoint contribution before subtraction",
						String.raw`-\frac{1}{${a}+j\omega}`,
						String.raw`\left.\frac{-e^{-(${a}+j\omega)t}}{${a}+j\omega}\right|_{t=0}`,
						"The exponential equals one at zero.",
						"Retain the negative sign of the primitive; the final integral subtracts this lower value.",
					),
				],
				latex: String.raw`\begin{aligned}X_0(\omega)&=\int_0^\infty e^{-${a}t}e^{-j\omega t}\,dt=\int_0^\infty e^{-(${a}+j\omega)t}\,dt\\&=\left[\frac{-e^{-(${a}+j\omega)t}}{${a}+j\omega}\right]_0^\infty\\&=0-\left(\frac{-1}{${a}+j\omega}\right)=\frac1{${a}+j\omega}.\end{aligned}`,
			};
		case "gaussian":
			return {
				parts: [
					calculation(
						"linear",
						"Gaussian identity linear coefficient",
						String.raw`-j\omega`,
						String.raw`-${a}t^2-j\omega t=-at^2+bt,\quad a=${a}`,
						"Match the coefficient multiplying time with the supplied identity.",
						"The forward-transform kernel supplies the negative imaginary linear coefficient.",
					),
					calculation(
						"square",
						"Squared linear coefficient",
						String.raw`-\omega^2`,
						String.raw`b^2=(-j\omega)^2`,
						"Square both the imaginary unit and the frequency.",
						String.raw`Use $j^2=-1$; the square of the leading minus sign is positive.`,
					),
					calculation(
						"remainder",
						"Gaussian identity exponent",
						String.raw`-\frac{\omega^2}{${4 * a}}`,
						String.raw`X_0(\omega)=\sqrt{\pi/${a}}e^{b^2/(4\cdot${a})}`,
						"Substitute the verified squared coefficient and divide by four times the decay parameter.",
						"Keep the negative sign from the squared imaginary unit.",
					),
				],
				latex: String.raw`\begin{aligned}X_0(\omega)&=\int_{-\infty}^\infty e^{-${a}t^2-j\omega t}\,dt\\a&=${a},\quad b=-j\omega,\quad b^2=(-j)^2\omega^2=-\omega^2\\X_0(\omega)&=\sqrt{\pi/a}\,e^{b^2/(4a)}=\sqrt{\pi/${a}}\,e^{-\omega^2/${4 * a}}.\end{aligned}`,
			};
		case "delta":
			return {
				parts: [
					calculation(
						"sifting",
						"Sifting evaluation point",
						"0",
						String.raw`\int_{-\infty}^{\infty}\delta(t)f(t)\,dt=f(t_*)`,
						"The delta samples its test function at the impulse location.",
						"This base impulse is unshifted and lies at the time origin.",
					),
					calculation(
						"kernel",
						"Sampled forward kernel",
						"1",
						String.raw`f(t)=e^{-j\omega t},\quad f(0)=?`,
						"Substitute the verified evaluation point into the forward kernel.",
						"An exponential with zero exponent equals one.",
					),
				],
				latex: String.raw`X_0(\omega)=\int_{-\infty}^{\infty}\delta(t)e^{-j\omega t}\,dt=\left.e^{-j\omega t}\right|_{t=0}=e^0=1.`,
			};
		case "cos":
			return {
				parts: [
					calculation(
						"euler",
						"Euler decomposition coefficient",
						"1/2",
						String.raw`\cos(${w0}t)=c\left(e^{j${w0}t}+e^{-j${w0}t}\right)`,
						"Euler's two exponentials add to twice the cosine.",
						"Divide the sum by two.",
					),
					calculation(
						"exponential-weight",
						"Complex exponential impulse weight",
						String.raw`2\pi`,
						String.raw`\mathcal F\{e^{\pm j${w0}t}\}=c\,\delta(\omega\mp${w0})`,
						"Use the angular-frequency exponential distribution identity.",
						String.raw`The forward transform has no normalization factor; the inverse has $1/(2\pi)$.`,
					),
					calculation(
						"scaled-weight",
						"Cosine impulse weight after Euler scaling",
						String.raw`\pi`,
						String.raw`c_{\rm cosine}=\tfrac12 c_{\rm exponential}`,
						"Multiply the exponential impulse weight by the verified Euler coefficient.",
						"Apply this scaling to each of the two impulses before entering their locations and weights.",
					),
				],
				latex: String.raw`\begin{aligned}\cos(${w0}t)&=\tfrac12e^{j${w0}t}+\tfrac12e^{-j${w0}t}\\\mathcal F\{e^{j${w0}t}\}&=2\pi\delta(\omega-${w0}),\quad\mathcal F\{e^{-j${w0}t}\}=2\pi\delta(\omega+${w0})\\X_0(\omega)&=\tfrac12(2\pi\delta(\omega-${w0}))+\tfrac12(2\pi\delta(\omega+${w0}))\\&=\pi\delta(\omega-${w0})+\pi\delta(\omega+${w0}).\end{aligned}`,
			};
		default:
			throw new Error("Unsupported CTFT derivation family.");
	}
}
