import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const engineRoot = join(projectRoot, "src/lib/math-engine/convolution");
const solverRoot = join(projectRoot, "src/lib/components/solvers");

/** Recursively lists source files below one package root. */
function sourceFiles(root: string): string[] {
	return readdirSync(root).flatMap((name) => {
		const path = join(root, name);
		return statSync(path).isDirectory() ? sourceFiles(path) : [path];
	});
}

describe("Convolution ADR conformance", () => {
	it("uses an explicit package index and bounded math-engine modules", () => {
		expect(
			existsSync(join(projectRoot, "src/lib/math-engine/convolution.ts")),
		).toBe(false);
		expect(existsSync(join(engineRoot, "index.ts"))).toBe(true);
		for (const file of sourceFiles(engineRoot).filter((path) =>
			path.endsWith(".ts"),
		)) {
			const lineCount = readFileSync(file, "utf8").split("\n").length;
			expect(lineCount, file).toBeLessThanOrEqual(400);
		}
	});

	it("keeps convolution imports, terminology, math labels, and typography ADR-safe", () => {
		const files = [
			...sourceFiles(engineRoot),
			...sourceFiles(join(solverRoot, "convolution-steps")),
			...sourceFiles(join(solverRoot, "convolution-solver-state")),
			join(solverRoot, "ConvolutionStepSolver.svelte"),
			join(
				projectRoot,
				"src/lib/components/canvas/ConvolutionCanvas.svelte",
			),
			join(projectRoot, "src/lib/components/ui/StepReveal.svelte"),
			join(projectRoot, "src/routes/convolution/+page.svelte"),
		];
		const source = files
			.map((file) => readFileSync(file, "utf8"))
			.join("\n");
		expect(source).not.toMatch(/from\s+["']\.\.\//);
		expect(source).not.toMatch(/\btyped phases?\b/i);
		expect(source).not.toMatch(
			/font-size:\s*(?:0\.68rem|0\.85rem|0\.88rem|0\.95rem|1rem)/,
		);
		expect(source).not.toMatch(/import\s+MathInline/);
	});

	it("uses the shared random-selection generic and a small public controller boundary", () => {
		const configuration = readFileSync(
			join(engineRoot, "configuration.ts"),
			"utf8",
		);
		expect(configuration).toContain("WithRandom<");
		const controllerIndex = readFileSync(
			join(solverRoot, "convolution-step-solver.svelte.ts"),
			"utf8",
		);
		expect(controllerIndex.split("\n").length).toBeLessThanOrEqual(40);
		expect(controllerIndex).toContain(
			"convolution-solver-state/controller.svelte",
		);
	});
});
