import { fraction } from "$lib/math-engine/laplace/algebra";
import {
	responseLatex,
	signalLatex,
	signalOrdinaryLatex,
} from "$lib/math-engine/laplace/signals";
import type {
	LaplaceAnswerField,
	LaplaceSignalTerm,
	LaplaceTask,
} from "$lib/math-engine/laplace/types";
import { fieldTask, taskChoices } from "./shared";
import { teaching } from "./teaching";

/** @param original - Given signal terms. @param combined - Independently verified transformable representation. @returns Checked activity and ordinary expressions on all open support intervals. */
export function supportTasks(
	original: LaplaceSignalTerm[],
	combined: LaplaceSignalTerm[],
): LaplaceTask[] {
	const ordinary = original
		.map((term, index) => ({ term, index }))
		.filter(({ term }) => term.kind !== "impulse");
	if (!ordinary.length)
		throw new Error(
			"Support rewriting requires at least one ordinary term.",
		);
	const boundaries = [
		...new Map(
			ordinary.map(({ term }) => {
				const q = fraction(term.delay);
				return [`${q.numerator}/${q.denominator}`, q] as const;
			}),
		).values(),
	].sort((a, b) => {
		const difference = a.add(b.negate()).numerator;
		return difference < 0n ? -1 : difference > 0n ? 1 : 0;
	});
	const ends = [null, ...boundaries, null];
	const intervals: string[] = [];
	const tasks = ends.slice(1).map((max, index) => {
		const min = ends[index]!;
		const active = ordinary.map(({ term }) =>
			term.side === "right"
				? min !== null &&
					min.add(fraction(term.delay).negate()).numerator >= 0n
				: max !== null &&
					max.add(fraction(term.delay).negate()).numerator <= 0n,
		);
		const target =
			ordinary
				.filter((_entry, i) => active[i])
				.map(({ term }) => signalOrdinaryLatex(term))
				.join("+") || "0";
		const interval = {
			min: min === null ? null : `${min.numerator}/${min.denominator}`,
			max: max === null ? null : `${max.numerator}/${max.denominator}`,
		};
		const range = `${min?.toLatex() ?? "-\\infty"}<t<${max?.toLatex() ?? "\\infty"}`;
		intervals.push(`${target}&${range}`);
		const fields: LaplaceAnswerField[] = [
			...ordinary.map(({ index: termIndex }, i) => ({
				id: `active-${termIndex}`,
				label: `Term ${termIndex + 1} active on this interval (1 yes, 0 no)`,
				target: active[i] ? "1" : "0",
				incorrectMessage: `Compare term ${termIndex + 1}'s ${original[termIndex]!.side === "right" ? "right-sided" : "left-sided"} support boundary $t=${fraction(original[termIndex]!.delay).toLatex()}$ with the current interval $${range}$. Mark 1 only when the step is active throughout this interval.`,
			})),
			{
				id: "combined",
				label: "Combined ordinary expression on this interval (use $t$; no step or impulse functions)",
				target,
				interval,
			},
		];
		return {
			...fieldTask(
				`forward-support-interval-${index}-values`,
				`Combine the interval $${range}$`,
				`x(t)={{combined}},\\quad ${ordinary.map(({ index: termIndex }) => `m_{${termIndex + 1}}={{active-${termIndex}}}`).join(",\\quad ")}`,
				fields,
			),
			prompt: `On $${range}$, check each term's support, then add only its ordinary active expression. Mark activity with 1 or 0. Impulses are separate distributions, not interval values.`,
			formula: `x(t)=${original.map(signalLatex).join("+")}`,
			...teaching(
				"The unit step $u(t-d)$ is one after $d$ and zero before $d$; $u(d-t)$ is one before $d$. Between support boundaries, evaluate these steps before adding the remaining ordinary expressions.",
				`On $${range}$, compare every supplied delay with this interval. Write zero for an inactive term; remove the step factor from an active term.`,
				`Term ${ordinary[0]!.index + 1} is ${active[0] ? "active" : "inactive"} here, contributing $${active[0] ? signalOrdinaryLatex(ordinary[0]!.term) : "0"}$. Add the other active contributions using their signed coefficients. This explains the first activity field without substituting the complete sum for you.`,
				"Check Support Interval",
			),
			explanation: `The checked active terms give $x(t)=${target}$ on $${range}$. Values at isolated endpoints do not change the ordinary transform; retain any impulses separately.`,
		};
	});
	return [
		...tasks,
		{
			id: "forward-support",
			title: "Assemble the verified supported signal",
			kind: "choice",
			answer: "Use the verified interval assembly before termwise pairs",
			choices: taskChoices(`forward-support:${responseLatex(original)}`, [
				"Use the verified interval assembly before termwise pairs",
				"Transform the original terms without checking a common ROC",
			]),
			prompt: "Your checked intervals assemble the ordinary signal below. The independently verified supported representation has a common ROC; carry it into the transform pairs.",
			formula: `x_{\\mathrm{regular}}(t)=\\begin{cases}${intervals.join("\\\\")}\\end{cases}`,
			...teaching(
				"Linearity permits adding individual Laplace transforms where those transforms have a common region of convergence. Combining canceled tails first can expose that region.",
				`Use your checked interval sums, preserving these separate impulse terms: $${responseLatex(original.filter((term) => term.kind === "impulse"))}$.`,
				`The verified interval assembly is equivalent to $${responseLatex(combined)}$. Its terms share a convergence region, so their pairs can now be added.`,
				"Check Supported Assembly",
			),
		},
	];
}
