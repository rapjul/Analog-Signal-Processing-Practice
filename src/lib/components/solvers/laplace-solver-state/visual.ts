import type { SolverVisualStateDescriptor } from "$lib/components/solvers/base-step-solver.svelte";
import { emptyConstruction } from "$lib/math-engine/laplace/construction";
import {
	entryTarget,
	rationalLiteral,
} from "$lib/math-engine/laplace/input-entry";
import { fractionLatex } from "$lib/math-engine/laplace/pfd";
import { validateLaplaceTask } from "$lib/math-engine/laplace/task-validation";
import type {
	LaplaceConstruction,
	LaplaceExercise,
	LaplaceTask,
} from "$lib/math-engine/laplace/types";

/** Learner-owned values submitted through the ordinary task validator. */
export interface LaplaceVisualDraft {
	/** Single expression or choice. */ input: string;
	/** Independently checked field values. */ fields: Record<string, string>;
	/** Structured factor, root, or decomposition rows. */ construction: LaplaceConstruction;
}

/** A reproducible checked scene and the strategy decisions needed to reach it. */
export interface LaplaceVisualScene extends SolverVisualStateDescriptor {
	/** Required task identity. */ taskId: string;
	/** Required stage identity. */ stageId: string;
	/** Complete accepted choices for this strategy path. */ decisions: Record<
		string,
		string
	>;
	/** Values used only for a real diagnostic submission. */ draft?: LaplaceVisualDraft;
}

/** @param text - Mathematical identifier. @returns Stable filename-safe identity. */
function slug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/** @param problem - Checked exercise. @returns All reachable accepted strategy paths, including ordinary prerequisite choices. */
export function laplaceVisualPaths(
	problem: LaplaceExercise,
): Record<string, string>[] {
	let paths: Record<string, string>[] = [{}];
	for (const task of problem.stages.flatMap((stage) => stage.tasks)) {
		paths = paths.flatMap((decisions) => {
			if (
				task.kind !== "choice" ||
				(task.when &&
					!task.when.values.includes(decisions[task.when.id] ?? ""))
			)
				return [decisions];
			return (task.accepted ?? [task.answer]).map((answer) => ({
				...decisions,
				[task.id]: answer,
			}));
		});
		if (paths.length > 256)
			throw new Error(
				"The visual catalog supports at most 256 accepted strategy paths.",
			);
	}
	return paths;
}

/** @param task - Active checked task. @param answer - Optional accepted choice. @returns A fresh correct draft for prerequisite replay. */
export function laplaceCorrectDraft(
	task: LaplaceTask,
	answer = task.answer,
): LaplaceVisualDraft {
	return {
		input: answer,
		fields:
			task.kind === "fields"
				? Object.fromEntries(
						task.fields.map((field) => [
							field.id,
							entryTarget(field.target, field.entry),
						]),
					)
				: {},
		construction:
			"construction" in task
				? structuredClone(task.construction)
				: emptyConstruction(),
	};
}

/** @param draft - Correct numeric construction. @returns A changed location or gain, never a supplied correct value. */
function wrongConstruction(draft: LaplaceConstruction): LaplaceConstruction {
	const changed = structuredClone(draft);
	if (changed.mode !== "finite") changed.mode = "finite";
	else if (changed.rows[0])
		changed.rows[0].first = rationalLiteral(
			fractionLatex(changed.rows[0].first)
				.add(fractionLatex("1"))
				.toLatex(),
		);
	else
		changed.gain = rationalLiteral(
			fractionLatex(changed.gain).add(fractionLatex("1")).toLatex(),
		);
	return changed;
}

/** @param task - Checked task. @returns Labeled diagnostic candidate drafts; actual outcomes are independently validated before registration. */
function diagnosticDrafts(task: LaplaceTask): [string, LaplaceVisualDraft][] {
	if (task.kind === "choice")
		return (task.choices ?? [])
			.map((answer, index) => ({ answer, index }))
			.filter(
				({ answer }) =>
					!(task.accepted ?? [task.answer]).includes(answer),
			)
			.map(({ answer, index }) => [
				`choice-${index}-${slug(answer)}`,
				laplaceCorrectDraft(task, answer),
			]);
	const blank = { input: "", fields: {}, construction: emptyConstruction() };
	const malformed = laplaceCorrectDraft(task);
	const wrong = laplaceCorrectDraft(task);
	let canEnterMalformed = true;
	if (task.kind === "fields") {
		const first = task.fields[0]!;
		const mathematical = task.fields.find(
			(field) =>
				!field.entry ||
				["exact", "expression"].includes(field.entry.kind),
		);
		canEnterMalformed = !!mathematical;
		if (mathematical) malformed.fields[mathematical.id] = "(";
		wrong.fields[first.id] =
			first.entry?.kind === "boolean"
				? first.target === "1"
					? "0"
					: "1"
				: first.entry?.kind === "degree" ||
					  first.entry?.kind === "integer"
					? String(Math.max(0, Number(first.target) + 1))
					: `(${first.target})+1`;
	} else if ("construction" in task) {
		canEnterMalformed = false;
		malformed.construction.mode = "finite";
		if (malformed.construction.rows[0])
			malformed.construction.rows[0].first = "(";
		else malformed.construction.gain = "(";
		wrong.construction = wrongConstruction(task.construction);
	} else {
		canEnterMalformed =
			!task.entry || ["exact", "expression"].includes(task.entry.kind);
		malformed.input = "(";
		wrong.input =
			task.entry?.kind === "integer"
				? String(Number(task.answer) + 1)
				: `(${task.answer})+1`;
	}
	return [
		["blank", blank],
		...(canEnterMalformed
			? [["malformed", malformed] as [string, LaplaceVisualDraft]]
			: []),
		["mathematical-error", wrong],
	];
}

/** @param problem - Independently checked exercise. @returns Complete branch-aware input, feedback, progressive-hint, and success scenes. */
export function laplaceVisualScenes(
	problem: LaplaceExercise,
): LaplaceVisualScene[] {
	const scenes: LaplaceVisualScene[] = [];
	const branching = problem.stages
		.flatMap((stage) => stage.tasks)
		.filter(
			(task) =>
				task.kind === "choice" && (task.accepted?.length ?? 0) > 1,
		);
	for (const decisions of laplaceVisualPaths(problem)) {
		const branchId =
			branching
				.filter((task) => decisions[task.id])
				.map((task) => `${slug(task.id)}-${slug(decisions[task.id]!)}`)
				.join(".") || "default";
		let step = 0,
			order = 0;
		for (const stage of problem.stages) {
			const tasks = stage.tasks.filter(
				(task) =>
					!task.when ||
					task.when.values.includes(decisions[task.when.id] ?? ""),
			);
			if (!tasks.length) continue;
			step++;
			for (const task of tasks) {
				const base = {
					taskId: task.id,
					stageId: stage.id,
					branchId,
					decisions,
					step,
					subStep: task.id,
				};
				/** @param suffix - Unique phase name. @param details - Expected scene metadata. Registers one independently identified scene. */
				const add = (
					suffix: string,
					details: Pick<LaplaceVisualScene, "kind" | "phase"> &
						Partial<LaplaceVisualScene>,
				): void => {
					scenes.push({
						...base,
						id: `${branchId}.${stage.id}.${task.id}.${suffix}`,
						label: `${task.title} · ${suffix}`,
						order: order++,
						...details,
					});
				};
				add("initial", { kind: "interactive", phase: "initial" });
				for (const [sample, draft] of diagnosticDrafts(task)) {
					const checked = validateLaplaceTask(
						task,
						draft.input,
						draft.fields,
						problem.terms,
						draft.construction,
					).result;
					if (checked.status === "correct")
						throw new Error(
							`Diagnostic ${task.id}/${sample} unexpectedly passed.`,
						);
					add(sample, {
						kind: "diagnostic",
						phase: "diagnostic",
						draft,
						feedbackStatus: checked.status,
					});
				}
				for (let tier = 1; tier <= task.hints.length; tier++)
					add(`hint-${tier}`, {
						kind: "hint",
						phase: "hint",
						hintTier: tier,
					});
				add("success", { kind: "interactive", phase: "success" });
			}
		}
	}
	return scenes;
}
