// @vitest-environment jsdom
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

/** The generated gallery must render old manifests and order dynamic branches and hint tiers using actual metadata. */
it("renders legacy scenes alongside ordered Laplace phases", () => {
	const directory = fs.mkdtempSync(path.join(tmpdir(), "solver-gallery-"));
	const root = path.join(directory, "tests/e2e/screenshots/solvers");
	fs.mkdirSync(path.join(root, "current"), { recursive: true });
	fs.writeFileSync(path.join(root, "current/frame.png"), "");
	const common = {
		module: "laplace",
		archetype: "laplace-example",
		archetypeTitle: "Laplace Example",
		theme: "dark",
		viewport: "mobile-narrow-320x568",
		captureKind: "state",
		relativePath: "current/frame.png",
		step: 2,
		subStep: "roots",
		taskId: "roots",
		stageId: "analysis",
		branchId: "matching",
		stateKind: "hint",
		phase: "hint",
	};
	const artifacts = [3, 1, 2].map((tier) => ({
		...common,
		stateId: `hint-${tier}`,
		stateLabel: `Hint ${tier}`,
		hintTier: tier,
		order: tier,
	}));
	const manifest = {
		version: 2,
		generatedAt: "2026-10-28T00:00:00Z",
		coverage: {
			stateMatrix: "Selected states",
			milestoneMatrix: "Selected milestones",
		},
		artifacts: [
			...[
				"milestone.completed",
				"milestone.initial",
				"milestone.diagnostic",
			].map((stateId) => ({
				module: "laplace",
				archetype: common.archetype,
				archetypeTitle: common.archetypeTitle,
				stateId,
				stateLabel: stateId,
				stateKind: "milestone",
				captureKind: "milestone",
				relativePath: common.relativePath,
				theme: common.theme,
				viewport: common.viewport,
			})),
			...artifacts,
			{
				...common,
				branchId: "cover-up",
				stateId: "cover-input",
				stateLabel: "Cover-up input",
				stateKind: "interactive",
				phase: "initial",
				order: 0,
			},
			{
				module: "odes",
				archetype: "legacy",
				archetypeTitle: "Legacy ODE",
				stateId: "legacy-input",
				stateLabel: "Legacy input",
				stateKind: "interactive",
				step: 1,
				theme: "dark",
				viewport: "desktop-1280x800",
				captureKind: "state",
				relativePath: "current/frame.png",
			},
		],
	};
	try {
		fs.writeFileSync(
			path.join(root, "current/manifest.json"),
			JSON.stringify(manifest),
		);
		execFileSync(
			process.execPath,
			[path.resolve("scripts/generate-solver-gallery.ts")],
			{ cwd: directory },
		);
		const parsed = new DOMParser().parseFromString(
			fs.readFileSync(path.join(root, "index.html"), "utf8"),
			"text/html",
		);
		document.documentElement.innerHTML = parsed.documentElement.innerHTML;
		window.eval(document.querySelector("script")!.textContent!);
		const identities = [...document.querySelectorAll(".state-id")].map(
			(element) => element.textContent,
		);
		expect(identities.filter((id) => id?.startsWith("hint-"))).toEqual([
			"hint-1",
			"hint-2",
			"hint-3",
		]);
		expect(identities).toContain("legacy-input");
		expect(identities.filter((id) => id !== "legacy-input")).toEqual([
			"milestone.initial",
			"cover-input",
			"hint-1",
			"hint-2",
			"hint-3",
			"milestone.diagnostic",
			"milestone.completed",
		]);
		expect(
			[...document.querySelectorAll(".step-heading h4")].map(
				(element) => element.textContent,
			),
		).toContain("matching · Step 2 · analysis");
		expect(
			[...document.querySelectorAll(".step-heading h4")].map(
				(element) => element.textContent,
			),
		).toContain("cover up · Step 2 · analysis");
	} finally {
		document.body.replaceChildren();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});
