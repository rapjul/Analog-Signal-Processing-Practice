import { fraction, polynomialLatex } from "$lib/math-engine/laplace/algebra";
import { factorial } from "$lib/math-engine/laplace/pfd";
import { signalLatex, signalTransform } from "$lib/math-engine/laplace/signals";
import type {
	LaplaceFactor,
	LaplaceSignalTerm,
	LaplaceSingleTask,
	LaplaceTask,
} from "$lib/math-engine/laplace/types";

/** Explicit teaching contract; missing task families fail during exercise construction. */
interface Teaching {
	/** First-use prerequisite explanation. */ lesson: string;
	/** Concept, setup, and worked intermediate. */ hints: [
		string,
		string,
		string,
	];
	/** Successful-check explanation. */ explanation: string;
	/** Contextual submission label. */ action: string;
}

/** @param lesson - First-use concept. @param setup - Current-task setup. @param worked - Explained intermediate. @param action - Submission label. @returns Complete teaching data. */
export function teaching(
	lesson: string,
	setup: string,
	worked: string,
	action: string,
): Teaching {
	return {
		lesson,
		hints: [lesson, setup, worked],
		explanation:
			"Your result passes the exact check for this task. The verified result is now available for the next calculation.",
		action,
	};
}

/** @param id - Stable task family. @param answer - Independently generated target. @returns Explicitly authored curriculum for ordinary tasks. */
export function taskTeaching(id: string, answer: string): Teaching {
	const authored =
		setupTeaching(id, answer) ??
		initialStateTeaching(id, answer) ??
		pairTeaching(id, answer) ??
		decompositionTeaching(id, answer) ??
		algebraTeaching(id) ??
		regionTeaching(id) ??
		expressionTeaching(id);
	if (authored) return authored;
	throw new Error(`Missing Laplace teaching for task family: ${id}`);
}

/** @param id - Task family. @param answer - Exact target. @returns Convention and strategy teaching, when applicable. */
function setupTeaching(id: string, answer: string): Teaching | undefined {
	if (id === "method")
		return teaching(
			"A method is a route from the reduced transform to known transform pairs. Several routes can be valid for the same expression.",
			"A single known denominator family may match a pair directly. Simple real factors permit cover-up. Coefficient matching also works for repeated and quadratic factors.",
			"For $1/((s+3)(s+5))$, a sum of two linear pairs is needed; both cover-up and coefficient matching can find its weights. For $1/(s+3)$, a direct pair avoids unnecessary decomposition.",
			"Check Inversion Method",
		);
	if (id === "division")
		return teaching(
			"A rational expression is proper when the numerator degree is smaller than the denominator degree.",
			"Use the degrees you just verified after cancellation. Equal degrees also require division; a zero numerator needs no division.",
			"For $(2s+12)/(s^2+8s+15)$, the degrees are one and two, so the fraction is already proper. Equal degrees would produce a constant quotient first.",
			"Check Division Decision",
		);
	if (id.includes("convention"))
		return teaching(
			"A Laplace transform rewrites a time signal using the complex variable $s$, which describes exponential growth and oscillation. Its integral accumulates the signal over time. Bilateral uses all time; unilateral from zero minus retains the pre-input initial state.",
			id.startsWith("ode")
				? "This equation supplies values at $0^-$. A derivative transform must retain those values as initial-condition terms."
				: "This signal supplies support or a region of convergence (ROC). Keep that support when choosing a bilateral transform pair.",
			id.startsWith("ode")
				? "For example, transforming $y'$ gives $sY(s)-y(0^-)$. The subtraction records the initial output; omitting it changes an initial-value problem."
				: "For example, $e^{-3t}u(t)$ uses the right-hand time interval; the same exponential on negative time has a different transform and ROC.",
			"Check Convention",
		);
	if (id === "ode-y0")
		return teaching(
			"An initial value is the output just before the input starts. The minus in $0^-$ describes time, not a negative output.",
			"Read the supplied $y(0^-)$ value. Preserve its sign; do not calculate a post-impulse value instead.",
			`Here the supplied pre-input value is $y(0^-)=${answer}$. A later impulse can change a state, but it does not rewrite this given value.`,
			"Check Initial Output",
		);
	return undefined;
}

/** @param id - Task family. @param answer - Exact initial-state target. @returns Initial-state teaching, when applicable. */
function initialStateTeaching(
	id: string,
	answer: string,
): Teaching | undefined {
	if (
		id === "ode-derivative" ||
		id === "ode-second" ||
		id.endsWith("-values")
	)
		return teaching(
			"Differentiation in time becomes multiplication by $s$, with subtracted initial-state terms in the unilateral transform.",
			id.includes("second")
				? "Apply the first-derivative rule twice: the second application also subtracts $y'(0^-)$, while the initial output acquires a factor of $s$."
				: "Use $\\mathcal L_+\\{y'\\}=sY(s)-y(0^-)$. Substitute a signed initial value inside the subtraction; enter zero explicitly.",
			"For example, if $y(0^-)=-2$, the first-derivative transform is $sY(s)-(-2)=sY(s)+2$. The rule subtracts the value, not its magnitude.",
			"Check Initial-Condition Substitution",
		);
	if (id === "ode-initial-numerator")
		return teaching(
			"Move the subtracted initial-state terms to the other side of the transformed equation before dividing by the differential operator.",
			"Multiply each derivative's initial term by its ODE coefficient, then collect the constant and $s$ terms separately.",
			"For $ay''+by'+cy=f$, the initial numerator is $a(sy(0^-)+y'(0^-))+by(0^-)$. Distribute $a$ before combining equal powers.",
			"Check Initial Contribution",
		);
	if (["ode-zi", "ode-zs", "ode-total"].includes(id))
		return teaching(
			"A linear response is the sum of a zero-input response (initial state only) and a zero-state response (input only).",
			id === "ode-zi"
				? "Divide the verified initial-condition numerator by the differential-operator polynomial; omit the forcing."
				: id === "ode-zs"
					? "Divide the forcing transform by the differential-operator polynomial; set the initial-condition contribution to zero."
					: "Add your verified component transforms. Only combine fractions that share the same delay factor.",
			"Writing the transformed equation as $D(s)Y(s)=I(s)+F(s)$ gives $Y_{ZI}=I/D$ and $Y_{ZS}=F/D$. The same denominator acts on both components.",
			"Check Response Transform",
		);
	if (id.startsWith("jump-"))
		return teaching(
			"An impulse has finite area over an arbitrarily short interval. Integrating the ODE across that instant gives the state jump.",
			"Add coincident impulse weights and divide by the leading derivative coefficient. A first-order equation jumps in $y$; a second-order equation jumps in $y'$.",
			`For this impulse group, the jump is $${answer}$. This follows from leading coefficient times jump equals total impulse area, rather than from a sampled peak.`,
			"Check Impulse Jump",
		);
	return undefined;
}

/** @param id - Task family. @param answer - Exact pair parameter. @returns Pair and property teaching, when applicable. */
function pairTeaching(id: string, answer: string): Teaching | undefined {
	if (id.includes("family") || /^pair-/.test(id))
		return teaching(
			"A transform pair links a recognizable time shape to a rational factor: exponential, sine, cosine, or impulse.",
			"Look for a linear denominator, a squared-frequency quadratic, or a constant. A polynomial in time increases the power of a linear denominator.",
			"For example, $1/(s+3)$ corresponds to an exponential rate of $-3$; a numerator proportional to frequency over $(s-a)^2+w^2$ identifies a sine pair.",
			"Check Transform Family",
		);
	if (id.includes("delay"))
		return teaching(
			"A nonnegative time delay $d$ shifts the whole signal and introduces $e^{-ds}$ in its transform.",
			"Read the shift in $t-d$, or the coefficient of $-s$ in the delay exponential. Do not confuse it with the exponential decay rate.",
			`The delay in this term is $d=${answer}$. Its support begins or ends at that time, and the transform multiplier is $e^{-(${answer})s}$.`,
			"Check Delay",
		);
	if (id.startsWith("rate-"))
		return teaching(
			"The exponential rate is the signed pole location. Write the factor as $s-a$ to identify $a$.",
			"Compare the denominator's constant sign with $s-a$. A positive constant in $s+b$ means a negative rate.",
			`Here write the factor as $s-(${answer})$. Its inverse contains $e^{(${answer})t}$ before any delay is applied.`,
			"Check Exponential Rate",
		);
	if (id.startsWith("parameter-"))
		return teaching(
			"A repeated linear pole of power $m$ produces a time polynomial of degree $m-1$. A conjugate quadratic supplies an angular frequency.",
			"For a linear power, subtract one from the denominator exponent. For a quadratic, complete the square and take the positive frequency.",
			`This term's parameter is $${answer}$. For example, a cubic linear denominator produces $t^2$, while $(s-a)^2+9$ has frequency $3$.`,
			"Check Pair Parameter",
		);
	if (id.startsWith("weight-"))
		return teaching(
			"A transform pair's amplitude may require a factorial, frequency division, or left-sided minus sign.",
			"Compare your numerator with the standard pair: $t^n e^{at}u(t)$ transforms to $n!/(s-a)^{n+1}$, and sine has numerator $w$.",
			`The checked weight is $${answer}$. For example, $6/(s-a)^4$ has time weight $6/3!=1$, while $2/((s-a)^2+9)$ has sine weight $2/3$.`,
			"Check Term Weight",
		);
	return undefined;
}

/** @param id - Task family. @param answer - Exact coefficient or quotient. @returns Decomposition teaching, when applicable. */
function decompositionTeaching(
	id: string,
	answer: string,
): Teaching | undefined {
	if (id.startsWith("coverup-numerator"))
		return teaching(
			"At a simple real pole, multiplying by its factor removes that denominator and lets you substitute the pole location.",
			"Evaluate the reduced numerator at the pole, term by term. Keep the pole's sign inside every power.",
			`The numerator evaluation here is $${answer}$. For example, evaluating $2s+12$ at $s=-3$ gives $2(-3)+12=6$; this is only the numerator of the residue.`,
			"Check Numerator Substitution",
		);
	if (id.startsWith("coverup-denominator"))
		return teaching(
			"The cover-up denominator contains every other factor after removing the selected simple factor.",
			"Substitute the same pole location into each remaining factor and multiply their values. Do not substitute into the removed zero factor.",
			`The remaining-denominator value here is $${answer}$. Dividing the separately checked numerator by this value gives the residue.`,
			"Check Denominator Substitution",
		);
	if (id.startsWith("coefficient-"))
		return teaching(
			"A partial-fraction coefficient is an unknown weight. Clear denominators to turn rational equality into a polynomial identity.",
			"With cover-up, divide the checked numerator value by the checked remaining denominator. With coefficient matching, equate each power of $s$ and solve the resulting linear equations.",
			`For this coefficient the solution is $${answer}$. Substitute it back into the identity to check that its contribution has the required sign and scale.`,
			"Check Coefficient",
		);
	if (id === "matching-identity")
		return teaching(
			"Multiplying every term by the same common denominator preserves equality and produces a polynomial identity.",
			"For each fraction, divide the common denominator by that fraction's denominator. Multiply the remaining polynomial by its unknown numerator.",
			"For example, $N=A/(s+3)+B/(s+5)$ is not a common-denominator identity. For $N/((s+3)(s+5))$, clearing denominators gives $N=A(s+5)+B(s+3)$.",
			"Check Coefficient Identity",
		);
	if (id === "reconstruction")
		return teaching(
			"Correct residues must reproduce the entire reduced transform, including a constant quotient if division was needed.",
			"Place the partial fractions over the common denominator, multiply out their numerators, and add like powers of $s$.",
			"For example, $3/(s+3)-1/(s+5)$ has numerator $3(s+5)-(s+3)=2s+12$. Matching only one pole would not verify that numerator.",
			"Check Recombined Transform",
		);
	if (id === "quotient")
		return teaching(
			"Polynomial division separates an improper rational expression into a quotient plus a proper remainder.",
			"Divide the leading numerator coefficient by the leading denominator coefficient. Subtract that multiple of the denominator to find the remainder.",
			`The constant quotient is $${answer}$. This constant transforms back to an impulse of the same weight; the remaining rational part is inverted separately.`,
			"Check Polynomial Quotient",
		);
	return undefined;
}

/** @param id - Task family. @returns Algebra and cancellation teaching, when applicable. */
function algebraTeaching(id: string): Teaching | undefined {
	if (id === "zero-transform" || id === "original-zeros")
		return teaching(
			"The zero polynomial is zero at every value, so it does not have a finite discrete root list.",
			"First distinguish an identically zero numerator from a nonzero constant. A nonzero constant never vanishes; zero always vanishes.",
			"For example, $0/(s+3)$ is identically zero wherever written and reduces to zero. Its apparent denominator root is not a genuine pole of the zero transform.",
			"Check Zero Expression",
		);
	if (id.includes("cancellation"))
		return teaching(
			"Cancellation removes identical factors, not individual added terms. Matching root locations must be exact.",
			"Compare the factored numerator with the factored denominator. At each shared factor remove only the smaller number of copies.",
			"For example, $(s+1)^2/((s+1)(s+4))$ loses one copy of $s+1$ and retains a zero at $-1$. Factors $s+1$ and $s+1.01$ do not cancel.",
			"Check Common Factors",
		);
	if (id.includes("numerator"))
		return teaching(
			"A numerator is the polynomial above the fraction bar. When combining fractions, multiply each numerator by the factors missing from its denominator.",
			"Use the common denominator to build the numerator before reducing factors. Keep different delay exponentials in separate rational blocks.",
			"For example, $1/(s+3)+1/(s+5)$ has numerator $(s+5)+(s+3)=2s+8$. Adding only the original numerator values would be incorrect.",
			"Check Combined Numerator",
		);
	return undefined;
}

/** @param id - Task family. @returns ROC and system interpretation teaching, when applicable. */
function regionTeaching(id: string): Teaching | undefined {
	if (id.includes("roc") || id === "all-regions")
		return teaching(
			"The ROC is the open set of complex values where the transform converges. Poles are excluded; zeros do not set its boundaries.",
			"Sort the distinct real parts of surviving poles. Right-sided modes require a region to their right; left-sided modes require one to their left. Intersect these requirements.",
			"For poles at $-5$ and $-3$, candidate regions are $\\Re(s)<-5$, $-5<\\Re(s)<-3$, and $\\Re(s)>-3$. Finite-duration sums require checking cancellation of their infinite tails.",
			"Check Region of Convergence",
		);
	if (["axis", "bibo", "stability"].includes(id))
		return teaching(
			"BIBO stability concerns bounded inputs producing bounded outputs. For this system-analysis family, check whether the entire imaginary axis lies in the ROC.",
			"The imaginary axis has real part zero. Substitute zero into the strict ROC inequalities; a boundary at zero does not count as inside.",
			"For example, $\\Re(s)>-3$ contains the imaginary axis, but $\\Re(s)>0$ excludes it. This establishes input-output stability, not hidden internal stability.",
			"Check System Stability",
		);
	if (id === "side" || id === "causality")
		return teaching(
			"Sidedness describes time support. Causality specifically requires an impulse response to vanish at every negative time.",
			"A left half-plane corresponds to left-sided modes, a right half-plane to right-sided modes, and an interior strip to mixed sidedness. Apply any supplied time shift afterward.",
			"For example, $e^{-t}u(t-2)$ starts at time two and is causal. A left-sided exponential with nonnegative endpoint still extends into negative time.",
			"Check Support",
		);
	return undefined;
}

/** @param id - Task family. @returns Expression assembly teaching, when applicable. */
function expressionTeaching(id: string): Teaching | undefined {
	if (
		id.startsWith("inverse-") ||
		id.includes("response") ||
		id.includes("check-zi") ||
		id.includes("check-zs") ||
		id.includes("final") ||
		id.startsWith("forward-pair") ||
		id.startsWith("ode-force") ||
		id.includes("reduced")
	)
		return teaching(
			id.includes("reduced")
				? "A reduced expression retains all factors except exact common copies."
				: "Linearity lets you transform or invert separate terms and then add them. Support and delays belong to each term.",
			id.includes("check-zi")
				? "Use only initial-state terms: the forcing must be zero and the supplied pre-input state must be retained."
				: id.includes("check-zs")
					? "Use only forcing terms: the pre-input state must be zero, while later impulse jumps remain."
					: "Use the checked pairs and coefficients. Shift both the ordinary expression and its support together, and keep impulse contributions separate.",
			"For example, delaying $e^{-3t}u(t)$ by two gives $e^{-3(t-2)}u(t-2)$ and multiplier $e^{-2s}$. Shifting only the step would change its amplitude.",
			id.includes("reduced")
				? "Check Reduced Expression"
				: "Check Transform Expression",
		);
	return undefined;
}

/** @param task - Transform-related question. @param term - Actual signal metadata. @returns Problem-specific pair and property guidance. */
export function teachSignal(
	task: LaplaceSingleTask,
	term: LaplaceSignalTerm,
): LaplaceSingleTask {
	const inverse = task.kind === "t" || task.id.startsWith("pair-");
	const pair =
		term.kind === "impulse"
			? "An impulse at zero transforms to one."
			: term.kind === "exponential"
				? `$t^{${term.power}}e^{(${term.rate})t}$ uses the denominator power $${term.power + 1}$ and factorial $${term.power}!$.`
				: `A damped ${term.kind} uses $(s-(${term.rate}))^2+(${term.frequency})^2$; cosine has numerator $s-(${term.rate})$, while sine has numerator $${term.frequency}$.`;
	return {
		...task,
		...teaching(
			pair,
			inverse
				? `For $X(s)=${signalTransform(term)}$, separate the delay exponential from the rational pair. Compare its denominator power or completed square and its numerator with the pair above; retain ${term.side}-sided support.`
				: `For $${signalLatex(term)}$, separate weight $${term.amplitude}$, delay $${term.delay}$, and ${term.side}-sided support before applying the pair.`,
			inverse
				? inversePairWork(term)
				: `The pair with these parameters gives $${signalTransform(term)}$. The delay multiplier is $e^{-(${term.delay})s}$; ${term.side === "left" ? "left-sided support also changes the pair's sign and ROC" : "right-sided support selects convergence to the right of the pole"}.`,
			task.action ?? "Check Transform Pair",
		),
	};
}

/** @param term - Exact supported inverse term. @returns Explained time-domain pair, normalization, and shift without repeating the question. */
function inversePairWork(term: LaplaceSignalTerm): string {
	const shape = signalLatex({ ...term, amplitude: "1", delay: "0" });
	const sign = term.side === "left" ? " and reverse the left-sided sign" : "";
	let normalization = `Apply the checked weight $${term.amplitude}$ to this pair.`;
	if (term.kind === "exponential")
		normalization = `The pole power $${term.power + 1}$ gives time power $${term.power + 1}-1=${term.power}$. Divide the signed numerator coefficient by $${factorial(term.power)}$${sign}, giving the checked weight $${term.amplitude}$.`;
	if (term.kind === "sine")
		normalization = `Divide the signed numerator by frequency $${term.frequency}$${sign}, giving the checked sine weight $${term.amplitude}$.`;
	return `Before applying weight and delay, the time shape is $${shape}$. ${normalization} Finally replace $t$ by $t-(${term.delay})$ in the shape and its support; an impulse shifts directly without multiplication by a step.`;
}

/** @param task - Region, support, or stability question. @param poles - Genuine surviving poles. @param bounds - Exact engine's convergence bounds. @param rocLatex - Formatted open region. @param conditions - Supplied support information. @returns Teaching tied to this problem's boundaries and support. */
export function teachRoc<T extends LaplaceTask>(
	task: T,
	poles: LaplaceFactor[],
	bounds: [number, number],
	rocLatex: string,
	conditions: string,
): T {
	const locations = poles.length
		? poles
				.map(
					(pole) =>
						`$${pole.real}${fraction(pole.frequency).numerator ? `\\pm j(${pole.frequency})` : ""}$`,
				)
				.join(", ")
		: "none";
	const boundary = [...poles].sort(
		(a, b) => fraction(a.real).toNumber() - fraction(b.real).toNumber(),
	)[0];
	const stability = ["axis", "bibo", "stability"].includes(task.id);
	const support = task.id === "side" || task.id === "causality";
	return {
		...task,
		hints: [
			task.hints[0]!,
			stability
				? `For this system the ROC is $${rocLatex}$. Test whether real part zero satisfies its strict inequalities; an excluded boundary does not count.`
				: support
					? `Use this problem's region $${rocLatex}$ together with the supplied support: ${conditions}`
					: `The surviving poles are ${locations}. Sort their distinct real parts and use the supplied constraint: ${conditions}`,
			stability
				? `Testing zero against $${rocLatex}$ ${bounds[0] < 0 && bounds[1] > 0 ? "places the imaginary axis strictly inside the region" : "fails to place the entire imaginary axis inside the region"}. This tests input-output stability only.`
				: support
					? `Here the selected region has ${bounds[0] === -Infinity && bounds[1] === Infinity ? "no pole boundary, so ordinary left/right exponential classification alone is insufficient" : bounds[0] === -Infinity ? "an upper boundary, requiring left-sided ordinary modes" : bounds[1] === Infinity ? "a lower boundary, requiring right-sided ordinary modes" : "two boundaries, requiring a mixture of left- and right-sided modes"}. A causal response must additionally vanish at every negative time.`
					: boundary
						? `One boundary is $\\Re(s)=${boundary.real}$. The leftmost candidate region lies strictly to its left. Adjacent distinct real parts create interior strips; repeated poles or equal real parts do not create extra strips.`
						: "There are no surviving poles. For a zero or impulse-only response, the entire finite complex plane is available; do not introduce boundaries from canceled factors.",
		],
		explanation: `${stability ? "The imaginary-axis check establishes the input-output stability conclusion." : support ? "The supplied region and time support establish this classification." : "The selected region is open, excludes poles, and respects the supplied support."} ${task.answer}`,
	};
}
