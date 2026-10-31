import {
	add,
	divide,
	factorPoly,
	fraction,
	multiply,
	type Poly,
	polynomialLatex,
	rationalLatex,
	scale,
	zero,
} from "$lib/math-engine/laplace/algebra";
import {
	laplaceAnswerLabel,
	renderLaplaceFields,
	renderLaplaceFieldTask,
} from "$lib/math-engine/laplace/answer-entry";
import { constructionTarget } from "$lib/math-engine/laplace/construction";
import { factorProductLatex } from "$lib/math-engine/laplace/formatting";
import { entryTarget } from "$lib/math-engine/laplace/input-entry";
import type { LaplaceDecomposition } from "$lib/math-engine/laplace/pfd";
import { fractionLatex, normalizeFactors } from "$lib/math-engine/laplace/pfd";
import type {
	LaplaceAnswerField,
	LaplaceConstructionTask,
	LaplaceFactor,
	LaplaceFieldTask,
	LaplaceSingleTask,
	LaplaceStage,
	LaplaceTask,
} from "$lib/math-engine/laplace/types";
import { createSeededPrng, shuffleWithRandom } from "$lib/math-engine/random";
import { eliminationTasks } from "./elimination";
import { taskTeaching, teaching } from "./teaching";

/** @param id - Stable ID. @param title - Heading. @param prompt - Question. @param kind - Control. @param answer - Exact target. @param choices - Options. @returns Checked task. */
export function task(
	id: string,
	title: string,
	prompt: string,
	kind: LaplaceSingleTask["kind"],
	answer: string,
	choices?: string[],
): LaplaceSingleTask {
	return {
		id,
		title,
		prompt,
		kind,
		answer,
		...(kind === "scalar" ? { entry: { kind: "exact" as const } } : {}),
		...(kind === "s" || kind === "t"
			? { lhs: laplaceAnswerLabel(id, kind) }
			: {}),
		...(choices ? { choices: taskChoices(id, choices) } : {}),
		...taskTeaching(id, answer),
	};
}

/** @param key - Stable task ID with optional problem context. @param choices - Conceptual options. @returns Reproducibly shuffled unique choices, independent of teaching registration. */
export function taskChoices(key: string, choices: string[]): string[] {
	const seed = [...key].reduce(
		(hash, character) => Math.imul(hash, 31) + character.charCodeAt(0),
		73,
	);
	return shuffleWithRandom([...new Set(choices)], createSeededPrng(seed));
}

/** @param id - Stable ID. @param title - Heading. @param prompt - Context-specific instruction. @param frame - Verified rule with blank slots. @param fields - Exact coefficient targets. @returns Independently checked fields. */
export function fieldTask(
	id: string,
	title: string,
	prompt: string,
	frame: string,
	fields: LaplaceAnswerField[],
): LaplaceFieldTask {
	const typedFields = fields.map((field) => ({
		...field,
		entry: field.entry ?? {
			kind: field.interval ? ("expression" as const) : ("exact" as const),
		},
	}));
	const answer = renderLaplaceFieldTask(
		{ frame, fields: typedFields },
		Object.fromEntries(
			typedFields.map((field) => [
				field.id,
				entryTarget(field.target, field.entry),
			]),
		),
	);
	return {
		...task(id, title, prompt, "s", answer),
		kind: "fields",
		frame,
		fields: typedFields,
		hints: id.startsWith("ode-")
			? [
					"Each blank holds an exact signed coefficient, not a whole derivative expression. Subtracting a negative initial value produces addition; zero must still be entered.",
					`The supplied values for these slots are ${fields.map((field) => `${field.label}: $${field.target}$`).join("; ")}. Copy each signed value into its matching position rather than changing the sign of the rule.`,
					`Substituting this problem's first initial value gives $${renderLaplaceFields(frame, { [fields[0]!.id]: fields[0]!.target })}$. The rule subtracts the signed value $${fields[0]!.target}$; ${fractionLatex(fields[0]!.target).numerator < 0n ? "subtracting this negative value produces addition" : "retain the subtraction already present in the rule"}. Enter the supplied value itself in the slot.`,
				]
			: [],
	};
}

/** @param factors - Roots with multiplicities. @returns Explicit root list. */
export function rootList(factors: LaplaceFactor[]): string {
	return factors.length
		? factors
				.map(
					(factor) =>
						`$${factor.real}${fraction(factor.frequency).numerator !== 0n ? `\\pm j(${factor.frequency})` : ""}$ (multiplicity ${factor.multiplicity})`,
				)
				.join("; ")
		: "No finite roots";
}

/** @param title - Heading. @param id - Stable ID. @param factors - Roots. @param other - Comparison roots. @returns Contextual root-set question. */
export function rootTask(
	title: string,
	id: string,
	factors: LaplaceFactor[],
	other: LaplaceFactor[],
): LaplaceConstructionTask {
	const answer = rootList(factors);
	const first = factors[0];
	const surviving = id.startsWith("surviving-");
	const canceled = id === "canceled-factors";
	const setup = surviving
		? `Start from the verified original ${id.includes("zero") ? "numerator" : "denominator"} roots ${rootList(other)}. Subtract only matching canceled copies. The remaining copies define the reduced expression's ${id.includes("zero") ? "zeros" : "poles"}; a location can remain after partial cancellation.`
		: canceled
			? `Compare the verified numerator and denominator factors at each exact location. Remove the smaller number of copies, once from each polynomial. Original denominator roots: ${rootList(other)}.`
			: `Solve factors of the ${id.includes("zero") ? "numerator" : "denominator"}. For a linear factor $s+b$, solve $s+b=0$. The opposite polynomial has roots ${rootList(other)}; these are not the requested polynomial.`;
	return {
		id,
		title,
		prompt: "Add every root or conjugate pair and enter its multiplicity. The number of rows is yours to determine.",
		kind: "roots",
		answer,
		construction: constructionTarget(factors, true),
		...(id === "original-zeros" || id === "original-poles"
			? { otherConstruction: constructionTarget(other, true) }
			: {}),
		...teaching(
			"A root is a value that makes a polynomial zero. Multiplicity counts factor copies. The imaginary unit satisfies $j^2=-1$; conjugate roots $a+jb$ and $a-jb$ share real part $a$ and opposite imaginary parts.",
			setup,
			first
				? `For the factor $${polynomialLatex(factorPoly(first))}$, ${fraction(first.frequency).numerator ? `complete the square to obtain $(s-(${first.real}))^2+(${first.frequency})^2=0$, giving the pair $${first.real}\\pm j(${first.frequency})$` : `subtract its constant from both sides to obtain $s=${first.real}$`}. Count its copies separately from solving its location.`
				: "A nonzero constant cannot equal zero, so it has no finite roots. This differs from the zero polynomial, which vanishes at every value.",
			"Check Roots",
		),
	};
}

/** @param id - Stable ID. @param title - Task heading. @param factors - Independently known factors. @param polynomial - Expanded polynomial. @returns Coefficient-template construction rather than free-expression equivalence. */
export function factorTask(
	id: string,
	title: string,
	factors: LaplaceFactor[],
	polynomial: Poly,
): LaplaceConstructionTask {
	const target = constructionTarget(
		factors,
		false,
		polynomial.at(-1)!.toLatex(),
		zero(polynomial),
	);
	return {
		id,
		title,
		kind: "factors",
		prompt: `Factor $${polynomialLatex(polynomial)}$. Choose a factor type, then enter its signed coefficients and power. Each factor has leading coefficient one; put the remaining gain outside.`,
		answer: factorProductLatex(factors, target.gain),
		construction: target,
		...teaching(
			"Factoring rewrites a sum as a product. A linear factor has the form $s+b$; an irreducible quadratic has the form $s^2+bs+c$. The outside gain retains the original leading coefficient.",
			zero(polynomial)
				? "All coefficients are zero. Select Identically Zero; dividing by a leading coefficient of zero is undefined."
				: polynomial.length === 1
					? `The expression $${polynomialLatex(polynomial)}$ has no variable. Enter this constant as the outside gain and leave the factor rows empty.`
					: polynomial.length === 2
						? `Divide $${polynomialLatex(polynomial)}$ by its leading coefficient $${polynomial[1]!.toLatex()}$. The remaining constant is $(${polynomial[0]!.toLatex()})/(${polynomial[1]!.toLatex()})$. Put the leading coefficient outside and the divided constant in the linear row.`
						: `The highest-power coefficient of $${polynomialLatex(polynomial)}$ is $${polynomial.at(-1)!.toLatex()}$. Divide by that coefficient before finding monic factors. For a quadratic, seek constants whose sum and product match its coefficients; if real linear factors do not exist, retain a quadratic.`,
			zero(polynomial)
				? "Every coefficient is zero, so select the identically zero case and do not invent a finite factor list."
				: factors[0]
					? `Divide by the candidate factor $${polynomialLatex(factorPoly(factors[0]))}$: $${polynomialLatex(polynomial)}=(${polynomialLatex(factorPoly(factors[0]))})(${polynomialLatex(divide(polynomial, factorPoly(factors[0]))[0])})$ with zero remainder. Multiplying these pieces verifies the candidate; continue factoring the quotient if it is reducible.`
					: `This is the constant $${polynomialLatex(polynomial)}$: enter it as the gain and leave the factor rows empty.`,
			"Check Factorization",
		),
	};
}

/** @param data - Exact analysis. @param originalZeros - Numerator factors. @param originalPoles - Denominator factors. @returns Mandatory rational analysis. */
export function analysisStage(
	data: LaplaceDecomposition,
	originalZeros: LaplaceFactor[],
	originalPoles: LaplaceFactor[],
): LaplaceStage {
	originalZeros = normalizeFactors(originalZeros);
	originalPoles = normalizeFactors(originalPoles);
	const tasks: LaplaceTask[] = [
		factorTask(
			"factor-numerator",
			"Factor the numerator",
			originalZeros,
			data.originalNumerator,
		),
		zero(data.originalNumerator)
			? task(
					"original-zeros",
					"Recognize the zero numerator",
					"An identically zero expression has no discrete list of numerator roots.",
					"choice",
					"Identically zero; no discrete zero list",
					[
						"Identically zero; no discrete zero list",
						"No finite zeros",
					],
				)
			: rootTask(
					"Identify original numerator roots",
					"original-zeros",
					originalZeros,
					originalPoles,
				),
		factorTask(
			"factor-denominator",
			"Factor the denominator",
			originalPoles,
			data.originalDenominator,
		),
		rootTask(
			"Identify original denominator roots",
			"original-poles",
			originalPoles,
			originalZeros,
		),
		task(
			"cancellation",
			"Check for common factors",
			"Do numerator and denominator share an exact factor? Near-matching roots do not cancel.",
			"choice",
			data.canceled.length ? "Common factors exist" : "No common factors",
			["Common factors exist", "No common factors"],
		),
	];
	const cancellationTask = tasks.at(-1)!;
	if (!data.canceled.length && !zero(data.numerator)) {
		cancellationTask.conclusions = [
			`No matching factor copies exist. The expression remains $${rationalLatex({ n: data.numerator, d: data.denominator })}$.`,
			`The verified numerator roots remain the zeros: ${rootList(data.zeros)}.`,
			`The verified denominator roots remain the poles: ${rootList(data.poles)}.`,
		];
		cancellationTask.explanation = cancellationTask.conclusions.join(" ");
	}
	if (data.canceled.length) {
		tasks.push({
			...rootTask(
				"Identify canceled factors and copies",
				"canceled-factors",
				data.canceled,
				originalPoles,
			),
			conclusions: [
				`The checked locations and multiplicities remove ${data.canceled.reduce((sum, factor) => sum + factor.multiplicity, 0)} matching factor copies in total.`,
			],
		});
		tasks.push(
			task(
				"reduced-expression",
				"Write the reduced expression",
				"Cancel matching copies only; enter the resulting rational expression.",
				"s",
				rationalLatex({ n: data.numerator, d: data.denominator }),
			),
		);
	}
	if (zero(data.numerator))
		tasks.push(
			task(
				"zero-transform",
				"Recognize the zero transform",
				"An identically zero numerator has no discrete zero list.",
				"choice",
				"Identically zero; no finite poles",
				[
					"Identically zero; no finite poles",
					"All original denominator roots are poles",
				],
			),
		);
	else if (data.canceled.length)
		tasks.push(
			rootTask(
				"Identify surviving zeros",
				"surviving-zeros",
				data.zeros,
				originalZeros,
			),
		);
	if (!zero(data.numerator) && data.canceled.length)
		tasks.push(
			rootTask(
				"Identify genuine poles",
				"surviving-poles",
				data.poles,
				originalPoles,
			),
		);
	tasks.push({
		...fieldTask(
			"degrees-values",
			"Compare the reduced polynomial degrees",
			"Enter the highest nonzero power in each reduced polynomial. For a zero numerator, choose Zero polynomial—degree undefined.",
			"\\deg N={{numerator}},\\quad\\deg D={{denominator}}",
			[
				{
					id: "numerator",
					label: "Reduced numerator degree",
					entry: { kind: "degree", zero: true },
					target: String(
						zero(data.numerator) ? -1 : data.numerator.length - 1,
					),
				},
				{
					id: "denominator",
					label: "Reduced denominator degree",
					entry: { kind: "degree", zero: false },
					target: String(data.denominator.length - 1),
				},
			],
		),
		...teaching(
			"The degree is the highest power with a nonzero coefficient. A nonzero constant has degree zero. The zero polynomial has undefined degree; select its explicit option instead of entering a number.",
			`Find the highest powers in $${polynomialLatex(data.numerator)}$ and $${polynomialLatex(data.denominator)}$ after cancellation.`,
			`The denominator's highest power is $${data.denominator.length - 1}$. If the numerator degree is at least this large, divide before using proper-fraction pairs.`,
			"Check Polynomial Degrees",
		),
	});
	tasks.push({
		...task(
			"division",
			"Decide whether division is needed",
			"Compare your verified reduced degrees. Is the rational expression proper?",
			"choice",
			!zero(data.numerator) &&
				data.numerator.length >= data.denominator.length
				? "Divide first"
				: "No division needed",
			["Divide first", "No division needed"],
		),
		...divisionTeaching(data),
	});
	if (
		data.numerator.length >= data.denominator.length &&
		!zero(data.numerator)
	)
		tasks.push(
			task(
				"quotient",
				"Find the polynomial quotient",
				"Divide before PFD. A constant quotient becomes a Dirac impulse.",
				"scalar",
				data.quotient,
			),
		);
	return {
		id: "analysis",
		title: "Analyze Zeros, Poles, and Cancellations",
		tasks,
	};
}

/** @param data - Reduced exact rational expression. @returns Current-expression degree and division guidance. */
function divisionTeaching(data: LaplaceDecomposition) {
	const n = data.numerator.length - 1,
		d = data.denominator.length - 1;
	return teaching(
		"A polynomial's degree is its highest power with a nonzero coefficient. A rational expression is proper when its numerator degree is smaller than its denominator degree.",
		`Compare $N(s)=${polynomialLatex(data.numerator)}$ and $D(s)=${polynomialLatex(data.denominator)}$ after cancellation.`,
		zero(data.numerator)
			? "The numerator is zero, so the complete expression is zero. No polynomial division is needed."
			: `Here $\\deg N=${n}$ and $\\deg D=${d}$. Since $${n}${n < d ? "<" : "\\ge"}${d}$, ${n < d ? "the fraction is proper and no division is needed" : `divide the leading coefficients first to obtain constant quotient $${data.quotient}$`}.`,
		"Check Division Decision",
	);
}

/** @param polynomial - Exact coefficients. @param point - Substitution value. @returns Exact substituted value. */
function evaluatePolynomial(polynomial: Poly, point: string) {
	let result = fraction(0);
	for (let index = polynomial.length - 1; index >= 0; index--)
		result = result.multiply(fraction(point)).add(polynomial[index]!);
	return result;
}

/** @param data - Decomposition. @returns Checked cover-up substitutions or coefficient-matching identity. */
function coefficientTasks(data: LaplaceDecomposition): LaplaceTask[] {
	const remainder = add(
		data.numerator,
		scale(data.denominator, fractionLatex(data.quotient).negate()),
	);
	const identity = data.slots
		.map(
			(slot) =>
				`${slot.label}(${polynomialLatex(divide(data.denominator, slot.denominator)[0])})(${polynomialLatex(slot.basis)})`,
		)
		.join("+");
	const columns = data.slots.map((slot) =>
		multiply(divide(data.denominator, slot.denominator)[0], slot.basis),
	);
	const equations = Array.from({ length: data.slots.length }, (_, power) => [
		...columns.map((column) => column[power] ?? fraction(0)),
		remainder[power] ?? fraction(0),
	]);
	const result: LaplaceTask[] = [
		task(
			"matching-identity",
			"Clear denominators and set up the coefficient system",
			"Choose the identity for the proper remainder. Match each power of $s$ to solve repeated or quadratic factors.",
			"choice",
			`$${polynomialLatex(remainder)}=${identity}$`,
			[
				`$${polynomialLatex(remainder)}=${identity}$`,
				"Match the denominator coefficients directly to the residues",
				"Omit all lower powers of a repeated factor",
			],
		),
	];
	for (let power = 0; power < data.denominator.length - 1; power++) {
		const fields = data.slots.map((slot, index) => ({
			id: `column-${index}`,
			label: `Coefficient multiplying $${slot.label}$ in the $s^{${power}}$ equation`,
			target: (
				multiply(
					divide(data.denominator, slot.denominator)[0],
					slot.basis,
				)[power] ?? fraction(0)
			).toLatex(),
		}));
		result.push({
			...fieldTask(
				`matching-power-${power}-values`,
				`Match the coefficient of $s^{${power}}$`,
				`Expand each unknown's multiplier and enter its coefficient of $s^{${power}}$, including zeros.`,
				`${fields.map((field, index) => `({{${field.id}}})${data.slots[index]!.label}`).join("+")}=${(remainder[power] ?? fraction(0)).toLatex()}`,
				fields,
			),
			...teaching(
				"A polynomial identity must have equal coefficients at every power. Missing powers have coefficient zero.",
				`Expand the identity $${polynomialLatex(remainder)}=${identity}$. Collect only the coefficient of $s^{${power}}$ in each unknown's multiplier.`,
				`The known side contributes $${(remainder[power] ?? fraction(0)).toLatex()}$ at this power. For the first unknown, its multiplier contributes $${fields[0]!.target}$; the other columns are obtained from their own multiplier polynomials.`,
				"Check Coefficient Equation",
			),
		});
	}
	result.push(
		...eliminationTasks(
			equations,
			data.slots.map((slot) => slot.label),
		),
	);
	for (const slot of data.slots) {
		if (
			fraction(slot.factor.frequency).numerator === 0n &&
			slot.factor.multiplicity === 1
		) {
			result.push({
				...task(
					`coverup-numerator-${slot.label}`,
					`Evaluate ${slot.label}'s cover-up numerator`,
					`Substitute $s=${slot.factor.real}$ into the reduced numerator.`,
					"scalar",
					evaluatePolynomial(
						data.numerator,
						slot.factor.real,
					).toLatex(),
				),
				formula: `N(s)=${polynomialLatex(data.numerator)},\\quad s=${slot.factor.real}`,
				...teaching(
					"For a simple pole, cover-up evaluates the numerator at the pole location after removing its factor.",
					`In $N(s)=${polynomialLatex(data.numerator)}$, replace every $s$ by $${slot.factor.real}$, including inside powers.`,
					`This gives $N(${slot.factor.real})=${polynomialLatex(data.numerator, `(${slot.factor.real})`)}=${evaluatePolynomial(data.numerator, slot.factor.real).toLatex()}$. Carry this numerator value into the residue division.`,
					"Check Numerator Substitution",
				),
			});
			result.push({
				...task(
					`coverup-denominator-${slot.label}`,
					`Evaluate ${slot.label}'s remaining denominator`,
					"Remove the selected linear factor, then substitute its root into the remaining denominator.",
					"scalar",
					evaluatePolynomial(
						divide(data.denominator, slot.denominator)[0],
						slot.factor.real,
					).toLatex(),
				),
				formula: `D_{\\mathrm{remaining}}(s)=${polynomialLatex(divide(data.denominator, slot.denominator)[0])},\\quad s=${slot.factor.real}`,
				...teaching(
					"The remaining denominator is the original reduced denominator divided by the selected simple-pole factor.",
					`Remove $${polynomialLatex(slot.denominator)}$, then evaluate $${polynomialLatex(divide(data.denominator, slot.denominator)[0])}$ at $s=${slot.factor.real}$.`,
					`The substitution gives $${polynomialLatex(divide(data.denominator, slot.denominator)[0], `(${slot.factor.real})`)}=${evaluatePolynomial(divide(data.denominator, slot.denominator)[0], slot.factor.real).toLatex()}$. Use this as the divisor of the checked numerator value.`,
					"Check Denominator Substitution",
				),
			});
		}
		result.push({
			...task(
				`coefficient-${slot.label}`,
				`Calculate $${slot.label}$`,
				`Solve the verified identity for the coefficient of $\\frac{${polynomialLatex(slot.basis)}}{${polynomialLatex(slot.denominator)}}$.`,
				"scalar",
				slot.value,
			),
			formula: `${polynomialLatex(remainder)}=${identity}`,
			...teaching(
				"To solve coefficient equations, divide both sides by a nonzero coefficient and subtract multiples of equations to eliminate one unknown at a time.",
				`Read $${slot.label}$ from the isolated row of your checked equation system for $${identity}=${polynomialLatex(remainder)}$.`,
				`The verified row operations isolate $${slot.label}=${slot.value}$. Substitute this value into the original identity to verify the coefficient.`,
				"Check Coefficient",
			),
		});
	}
	return result;
}

/** @param data - Verified PFD. @param includeDegrees - Whether block analysis has not already checked division. @returns Setup, coefficient, and reconstruction stages. */
export function decompositionStages(
	data: LaplaceDecomposition,
	includeDegrees = false,
): LaplaceStage[] {
	if (!data.slots.length) return [];
	const simple = data.poles.every(
		(factor) =>
			fraction(factor.frequency).numerator === 0n &&
			factor.multiplicity === 1,
	);
	const direct = data.poles.length === 1;
	const needsNumeratorRewrite =
		data.slots.filter((slot) => fractionLatex(slot.value).numerator !== 0n)
			.length > 1;
	const matching = "Partial Fractions: Coefficient Matching",
		coverup = "Partial Fractions: Cover-Up",
		pair = "Direct Transform Pairs";
	const methods = [
		matching,
		...(simple ? [coverup] : []),
		...(direct ? [pair] : []),
	];
	const pfdPaths = [matching, coverup];
	const template = constructionTarget(data.poles, false, data.quotient);
	template.rows = template.rows.flatMap((row) =>
		Array.from({ length: Number(row.power) }, (_, index) => ({
			...row,
			power: String(index + 1),
		})),
	);
	const coefficients = methodCoefficientTasks(
		data,
		simple,
		matching,
		coverup,
	);
	const strategy = {
		...task(
			"method",
			"Choose an inversion method",
			"Use the verified degrees and denominator factors to choose a supported approach. More than one method can be valid.",
			"choice",
			direct ? pair : simple ? coverup : matching,
			[pair, coverup, matching],
		),
		accepted: methods,
		choicePresentation: {
			[pair]: {
				label: pair,
				description:
					"Recognize a standard pair and apply scaling, shifts, delays, and support.",
			},
			[coverup]: {
				label: coverup,
				description:
					"Cancel a simple linear pole factor and substitute its root to find a coefficient.",
			},
			[matching]: {
				label: matching,
				description:
					"Clear denominators, compare powers, and solve the coefficient equations.",
			},
		},
		...strategyTeaching(data, simple, direct),
	};
	return [
		{
			id: "setup",
			title: "Choose and Set Up a Method",
			tasks: [
				...(includeDegrees ? methodDegreeTasks(data) : []),
				strategy,
				{
					...fieldTask(
						"factor-counts-values",
						"Classify the denominator factors",
						"Count linear and irreducible quadratic factor copies in the verified reduced denominator.",
						"\\text{Linear copies}={{linear}},\\quad\\text{Quadratic copies}={{quadratic}}",
						[
							{
								id: "linear",
								label: "Total linear factor copies",
								entry: { kind: "integer", min: 0 },
								target: String(
									data.poles
										.filter(
											(factor) =>
												!fraction(factor.frequency)
													.numerator,
										)
										.reduce(
											(sum, factor) =>
												sum + factor.multiplicity,
											0,
										),
								),
							},
							{
								id: "quadratic",
								label: "Total irreducible quadratic factor copies",
								entry: { kind: "integer", min: 0 },
								target: String(
									data.poles
										.filter(
											(factor) =>
												fraction(factor.frequency)
													.numerator,
										)
										.reduce(
											(sum, factor) =>
												sum + factor.multiplicity,
											0,
										),
								),
							},
						],
					),
					when: { id: "method", values: pfdPaths },
					...teaching(
						"A real root produces a linear factor. A nonreal conjugate pair produces a real irreducible quadratic. Multiplicity counts copies, rather than distinct locations.",
						`Classify the factors of $${polynomialLatex(data.denominator)}$ from the verified roots.`,
						`The verified factors are $${factorProductLatex(data.poles)}$. Count each power as that many copies (an omitted power is one); each quadratic accounts for a conjugate pair.`,
						"Check Factor Types",
					),
				},
				{
					id: "template",
					title: "Build the partial-fraction template",
					prompt: "Add one row for each denominator power. Choose a constant or linear unknown numerator, and enter the constant quotient (zero if absent).",
					kind: "template",
					answer: data.template,
					construction: template,
					when: { id: "method", values: pfdPaths },
					...teaching(
						"A proper fraction over a linear factor needs a constant numerator. A proper fraction over an irreducible quadratic needs a general linear numerator.",
						`Use the factors of $${polynomialLatex(data.denominator)}$. For a repeated factor of power $m$, add a term for each power from one through $m$, even if a solved coefficient might be zero.`,
						`Start with $${polynomialLatex(factorPoly(data.poles[0]!))}$: include denominator powers $1$ through $${data.poles[0]!.multiplicity}$. Its degree is $${factorPoly(data.poles[0]!).length - 1}$, so choose a ${fraction(data.poles[0]!.frequency).numerator ? "linear" : "constant"} numerator. Repeat this rule for the other verified factors.`,
						"Check PFD Template",
					),
					explanation: `Your construction includes all required factors, powers, and numerator degrees. The next calculations label equivalent terms in fixed factor order as $${data.template}$. A quadratic numerator can be written $A(s-a)+B$ instead of $As+C$, because $C=B-Aa$; the shifted basis prepares it for the transform pairs.`,
				},
				...(direct && fraction(data.poles[0]!.frequency).numerator
					? [
							{
								...fieldTask(
									"square-values",
									"Rewrite the quadratic as a shifted square",
									"Complete the square in the reduced denominator and enter its signed shift and positive frequency.",
									"(s-({{rate}}))^2+({{frequency}})^2",
									[
										{
											id: "rate",
											label: "Exponential shift a",
											target: data.poles[0]!.real,
										},
										{
											id: "frequency",
											label: "Positive angular frequency",
											target: data.poles[0]!.frequency,
										},
									],
								),
								when: { id: "method", values: [pair] },
								...teaching(
									"Completing the square rewrites $s^2+bs+c$ as $(s+b/2)^2+c-(b/2)^2$.",
									`Use $${polynomialLatex(data.denominator)}$ to identify the signed shift and positive frequency.`,
									`Half the linear coefficient is $${fraction(data.poles[0]!.real).negate().toLatex()}$. The shift is its negative, $${data.poles[0]!.real}$, and the remaining square gives frequency $${data.poles[0]!.frequency}$.`,
									"Check Shifted Square",
								),
							} satisfies LaplaceTask,
						]
					: []),
				...(direct && needsNumeratorRewrite
					? [
							{
								...fieldTask(
									"direct-weights-values",
									"Rewrite the numerator in pair-ready terms",
									"Expand the displayed weighted pieces and match their coefficients to the proper remainder's numerator.",
									`${polynomialLatex(add(data.numerator, scale(data.denominator, fractionLatex(data.quotient).negate())))}=${data.slots.map((slot, index) => `({{weight-${index}}})(${polynomialLatex(multiply(divide(data.denominator, slot.denominator)[0], slot.basis))})`).join("+")}`,
									data.slots.map((slot, index) => ({
										id: `weight-${index}`,
										label: `Weight of $${polynomialLatex(multiply(divide(data.denominator, slot.denominator)[0], slot.basis))}$`,
										target: slot.value,
									})),
								),
								when: { id: "method", values: [pair] },
								...teaching(
									"Before applying a direct pair, rewrite the numerator in the same shifted basis as the denominator. This can separate cosine and sine, or lower powers of one repeated real factor.",
									`For this transform the denominator is $${polynomialLatex(data.denominator)}$. Expand your proposed weighted numerator pieces and equate their coefficients to the displayed numerator. The constant quotient $${data.quotient}$ is separate.`,
									`Expanding the pair-ready pieces gives $${polynomialLatex(data.numerator)}=(${data.quotient})(${polynomialLatex(data.denominator)})+${data.slots.map((slot) => `(${slot.value})(${polynomialLatex(multiply(divide(data.denominator, slot.denominator)[0], slot.basis))})`).join("+")}$. Match equal powers to determine each weight, keeping the quotient separate.`,
									"Check Pair-Ready Numerator",
								),
							} satisfies LaplaceTask,
						]
					: []),
			],
		},
		{
			id: "coefficients",
			title: "Calculate Intermediate Values",
			tasks: coefficients,
		},
		{
			id: "reconstruct",
			title: "Check the Intermediate Result",
			tasks: [
				{
					...task(
						"reconstruction",
						"Recombine the fractions",
						"Verify the identity using your checked template and coefficients, including the constant quotient. Enter an expression equal to the reduced transform.",
						"s",
						rationalLatex({
							n: data.numerator,
							d: data.denominator,
						}),
					),
					when: { id: "method", values: pfdPaths },
				},
			],
		},
	];
}

/** @param data - Exact reduced rational block. @returns Degree, division, and optional quotient checks for a previously unanalyzed block. */
function methodDegreeTasks(data: LaplaceDecomposition): LaplaceTask[] {
	const improper =
		!zero(data.numerator) &&
		data.numerator.length >= data.denominator.length;
	return [
		{
			...fieldTask(
				"method-degrees-values",
				"Compare reduced degrees",
				"Enter each reduced polynomial's highest nonzero power before choosing whether to divide.",
				"\\deg N={{numerator}},\\quad\\deg D={{denominator}}",
				[
					{
						id: "numerator",
						label: "Reduced numerator degree",
						entry: { kind: "degree", zero: true },
						target: String(
							zero(data.numerator)
								? -1
								: data.numerator.length - 1,
						),
					},
					{
						id: "denominator",
						label: "Reduced denominator degree",
						entry: { kind: "degree", zero: false },
						target: String(data.denominator.length - 1),
					},
				],
			),
			...teaching(
				"The degree is the highest power with a nonzero coefficient. A nonzero constant has degree zero; choose Zero polynomial for an undefined degree.",
				`Compare $${polynomialLatex(data.numerator)}$ with $${polynomialLatex(data.denominator)}$ after cancellation.`,
				`The denominator degree is $${data.denominator.length - 1}$. Divide if the numerator degree is at least this large, before matching proper-fraction pairs.`,
				"Check Polynomial Degrees",
			),
		},
		{
			...task(
				"division",
				"Decide whether division is needed",
				"Use the checked degrees to decide whether the block is proper.",
				"choice",
				improper ? "Divide first" : "No division needed",
				["Divide first", "No division needed"],
			),
			id: "method-division",
			...divisionTeaching(data),
		},
		...(improper
			? [
					{
						...task(
							"quotient",
							"Find the constant quotient",
							"Divide leading coefficients, then subtract the corresponding denominator multiple.",
							"scalar",
							data.quotient,
						),
						id: "method-quotient",
					},
				]
			: []),
	];
}

/** @param data - Exact coefficient system. @param simple - Whether all poles are simple and real. @param matching - Matching strategy label. @param coverup - Cover-up strategy label. @returns Coefficient tasks scoped to each accepted method. */
function methodCoefficientTasks(
	data: LaplaceDecomposition,
	simple: boolean,
	matching: string,
	coverup: string,
): LaplaceTask[] {
	const pfdPaths = [matching, coverup];
	return coefficientTasks(data).flatMap((part): LaplaceTask[] => {
		if (part.id.startsWith("coefficient-") && simple) {
			const slot = data.slots.find(
				(candidate) => part.id === `coefficient-${candidate.label}`,
			)!;
			const numerator = evaluatePolynomial(
				data.numerator,
				slot.factor.real,
			).toLatex();
			const denominator = evaluatePolynomial(
				divide(data.denominator, slot.denominator)[0],
				slot.factor.real,
			).toLatex();
			return [
				{
					...part,
					id: `${part.id}-matching`,
					when: { id: "method", values: [matching] },
				},
				{
					...part,
					id: `${part.id}-coverup`,
					when: { id: "method", values: [coverup] },
					...teaching(
						"A simple-pole residue is the evaluated numerator divided by the evaluated remaining denominator.",
						`Use the numerator value $${numerator}$ and remaining-denominator value $${denominator}$ checked at $s=${slot.factor.real}$. The removed pole factor must not appear in the divisor.`,
						`$${slot.label}=\\frac{${numerator}}{${denominator}}=${slot.value}$. Dividing the signed values preserves the residue's sign.`,
						"Check Coefficient",
					),
				},
			];
		}
		return [
			{
				...part,
				when: {
					id: "method",
					values: part.id.startsWith("coverup-")
						? [coverup]
						: part.id.startsWith("matching-")
							? [matching]
							: pfdPaths,
				},
			},
		];
	});
}

/** @param data - Exact reduced expression. @param simple - Distinct real poles. @param direct - One denominator family. @returns Current-expression method guidance without controlling branches. */
function strategyTeaching(
	data: LaplaceDecomposition,
	simple: boolean,
	direct: boolean,
) {
	return teaching(
		"An inversion method rewrites a transform into known pairs. Cover-up applies to distinct real linear poles; coefficient matching also handles repeated and quadratic factors.",
		`The reduced denominator is $${polynomialLatex(data.denominator)}$, with ${data.poles.length} distinct factor ${data.poles.length === 1 ? "family" : "families"}. Examine their types and powers before choosing.`,
		`For $${rationalLatex({ n: data.numerator, d: data.denominator })}$, ${direct ? "one denominator family remains, so a direct-pair rewrite is available" : "multiple denominator families remain, so separate them into a sum of pairs"}. ${simple ? "Every pole is real and simple, so both cover-up and coefficient matching apply." : "Repeated or quadratic factors require coefficient matching on the partial-fraction path."}`,
		"Check Inversion Method",
	);
}
