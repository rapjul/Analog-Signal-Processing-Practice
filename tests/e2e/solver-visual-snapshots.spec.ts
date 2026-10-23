import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { expect, type Locator, type Page, test } from "@playwright/test";
import {
	type VisualTimingContext,
	type VisualTimingOperation,
	type VisualTimingPhase,
	VisualTimingRecorder,
	writeVisualTimingReportAtomically,
} from "./solver-visual-timing";

/**
 * Deterministic visual-regression and inspection-artifact suite for SignalLab.
 *
 * Coverage tiers:
 * - every named state and an all-hints variant for every step/sub-step at
 *   desktop and narrow-mobile widths in dark mode;
 * - initial, representative diagnostic, and completed full-page milestones for
 *   every configured viewport and both themes.
 */

const VISUAL_RUN_ENABLED = process.env.SIGNALLAB_VISUAL_REGRESSION === "1";
// Production builds omit the developer harness used to select later solver states.
const CAPTURE_INITIAL_ONLY = process.env.SIGNALLAB_VISUAL_INITIAL_ONLY === "1";
const WRITE_INSPECTION_ARTIFACTS =
	process.env.SIGNALLAB_VISUAL_ARTIFACTS === "1";
const COPY_ACCEPTED_SNAPSHOTS =
	process.env.SIGNALLAB_VISUAL_COPY_ACCEPTED_SNAPSHOTS === "1";
type VisualCaptureProfile = "full" | "dark" | "quick";
const requestedCaptureProfile = process.env.SIGNALLAB_VISUAL_PROFILE ?? "full";
if (!["full", "dark", "quick"].includes(requestedCaptureProfile)) {
	throw new Error(
		`Unknown SIGNALLAB_VISUAL_PROFILE: ${requestedCaptureProfile}`,
	);
}
const VISUAL_CAPTURE_PROFILE = requestedCaptureProfile as VisualCaptureProfile;
const requestedPageMode = process.env.SIGNALLAB_VISUAL_PAGE_MODE ?? "reused";
if (requestedPageMode !== "isolated" && requestedPageMode !== "reused") {
	throw new Error(`Unknown SIGNALLAB_VISUAL_PAGE_MODE: ${requestedPageMode}`);
}
const VISUAL_PAGE_MODE = requestedPageMode as "isolated" | "reused";
const CAPTURE_THEMES: readonly Theme[] =
	VISUAL_CAPTURE_PROFILE === "full" ? ["dark", "light"] : ["dark"];
const CAPTURE_ONLY_HINT_STATES = VISUAL_CAPTURE_PROFILE === "quick";
const SOLVERS_ROOT = path.resolve(
	process.cwd(),
	"tests/e2e/screenshots/solvers",
);
const CURRENT_RUN_DIR = path.join(SOLVERS_ROOT, "current");
const CURRENT_MANIFEST = path.join(CURRENT_RUN_DIR, "manifest.json");
const CURRENT_TIMINGS = path.join(CURRENT_RUN_DIR, "timings.json");
const VISUAL_CAPTURE_HIDDEN_SELECTORS = [".navbar", ".update-toast"] as const;
const VISUAL_CAPTURE_HIDDEN_CSS = `${VISUAL_CAPTURE_HIDDEN_SELECTORS.join(
	", ",
)} { display: none !important; }
/* Keep sticky controls in normal flow for static full-page captures. */
.fourier-canvas-wrapper .controls-bar { position: static !important; }`;

type Theme = "dark" | "light";
type CaptureKind = "state" | "milestone";
type StateKind = "interactive" | "hint" | "diagnostic" | "milestone";

interface ViewportDefinition {
	name: string;
	width: number;
	height: number;
}

interface ProblemArchetype {
	module: string;
	slug: string;
	title: string;
	path: string;
	seed: number;
	isItsStepper: boolean;
}

interface HarnessVisualState {
	id: string;
	label: string;
	step: number;
	subStep?: string | undefined;
	kind: "interactive" | "hint" | "diagnostic";
}

interface VisualArtifactEntry {
	module: string;
	archetype: string;
	archetypeTitle: string;
	stateId: string;
	stateLabel: string;
	stateKind: StateKind;
	step?: number | undefined;
	subStep?: string | undefined;
	theme: Theme;
	viewport: string;
	captureKind: CaptureKind;
	relativePath: string;
}

interface VisualRunManifest {
	version: 2;
	generatedAt: string;
	coverage: {
		stateMatrix: string;
		milestoneMatrix: string;
	};
	artifacts: VisualArtifactEntry[];
}

const SNAPSHOT_VIEWPORTS: ViewportDefinition[] = [
	{ name: "desktop-1280x800", width: 1280, height: 800 },
	{ name: "tablet-768x1024", width: 768, height: 1024 },
	{ name: "mobile-narrow-320x568", width: 320, height: 568 },
];
const CAPTURE_VIEWPORTS =
	VISUAL_CAPTURE_PROFILE === "quick"
		? SNAPSHOT_VIEWPORTS.filter(
				(viewport) => viewport.name !== "tablet-768x1024",
			)
		: SNAPSHOT_VIEWPORTS;

/** Viewport and theme pair used for one screenshot configuration. */
interface CaptureConfiguration {
	/** Viewport definition applied before capture. */
	viewport: ViewportDefinition;
	/** Application theme applied before capture. */
	theme: Theme;
}

const MILESTONE_CONFIGURATIONS: CaptureConfiguration[] =
	CAPTURE_VIEWPORTS.flatMap((viewport) =>
		CAPTURE_THEMES.map((theme) => ({ viewport, theme })),
	);
const STATE_CONFIGURATIONS = MILESTONE_CONFIGURATIONS.filter(
	({ viewport, theme }) =>
		theme === "dark" && viewport.name !== "tablet-768x1024",
);

const PROBLEM_ARCHETYPES: ProblemArchetype[] = [
	{
		module: "odes",
		slug: "odes-2nd-order-distinct-real",
		title: "2nd-Order Distinct Real ODE",
		path: "/odes?order=2&rootType=distinct_real&forcing=exponential&leading=monic&resonance=none&seed=210",
		seed: 1101,
		isItsStepper: true,
	},
	{
		module: "odes",
		slug: "odes-2nd-order-repeated-real",
		title: "2nd-Order Repeated Real ODE",
		path: "/odes?order=2&rootType=repeated_real&forcing=constant&leading=monic&resonance=none&seed=211",
		seed: 1102,
		isItsStepper: true,
	},
	{
		module: "odes",
		slug: "odes-2nd-order-complex-conjugate",
		title: "2nd-Order Complex Conjugate ODE",
		path: "/odes?order=2&rootType=complex_conjugate&forcing=sinusoid&leading=monic&resonance=none&seed=212",
		seed: 1103,
		isItsStepper: true,
	},
	{
		module: "odes",
		slug: "odes-1st-order-non-monic",
		title: "1st-Order Non-Monic ODE",
		path: "/odes?order=1&rootType=random&forcing=sinusoid&leading=non_monic&resonance=none&seed=213",
		seed: 1104,
		isItsStepper: true,
	},
	{
		module: "odes",
		slug: "odes-2nd-order-resonant-non-monic",
		title: "2nd-Order Resonant Non-Monic ODE",
		path: "/odes?order=2&rootType=distinct_real&forcing=exponential&leading=non_monic&resonance=simple&seed=214",
		seed: 1105,
		isItsStepper: true,
	},
	{
		module: "fourier-series",
		slug: "fourier-series-square-wave",
		title: "Fourier Series Square Wave",
		path: "/fourier-series?waveform=square&seed=2101",
		seed: 2101,
		isItsStepper: true,
	},
	{
		module: "fourier-series",
		slug: "fourier-series-triangle-wave",
		title: "Fourier Series Triangle Wave",
		path: "/fourier-series?waveform=triangle&seed=2102",
		seed: 2102,
		isItsStepper: true,
	},
	{
		module: "fourier-series",
		slug: "fourier-series-sawtooth-wave",
		title: "Fourier Series Sawtooth Wave",
		path: "/fourier-series?waveform=sawtooth&seed=2103",
		seed: 2103,
		isItsStepper: true,
	},
	{
		module: "convolution",
		slug: "convolution-continuous-time",
		title: "Continuous-Time Convolution",
		path: "/convolution?share=1&v=2&seed=3101&xType=rect&xParameter=default&xAmplitude=default&xAmplitude1=default&xAmplitude2=default&xShift=unshifted&xShiftValue=random_signed&hType=rect&hParameter=default&hAmplitude=default&hAmplitude1=default&hAmplitude2=default&hShift=unshifted&hShiftValue=random_signed",
		seed: 3101,
		isItsStepper: true,
	},
	{
		module: "laplace",
		slug: "laplace-inverse-pfd",
		title: "Inverse Laplace & PFD",
		path: "/laplace",
		seed: 3102,
		isItsStepper: false,
	},
	{
		module: "fourier-transform",
		slug: "ctft-guided-derivation",
		title: "CTFT Guided Derivation",
		path: "/fourier-transform",
		seed: 3103,
		isItsStepper: true,
	},
	{
		module: "circuits",
		slug: "circuits-frequency-response",
		title: "Circuits & Frequency Response",
		path: "/circuits",
		seed: 3104,
		isItsStepper: false,
	},
];

test.describe("CTFT representative mode spectra @dev-harness", () => {
	test.skip(
		CAPTURE_INITIAL_ONLY,
		"These captures require the development state-selection harness.",
	);
	for (const mode of ["derivation", "pairs-properties"] as const)
		for (const family of ["rect", "cos"] as const) {
			/** Captures completed regular/distribution spectra and both teaching-mode layouts. */
			test(`${mode} ${family} completion`, async ({ page }) => {
				await page.emulateMedia({ reducedMotion: "reduce" });
				await installDeterministicBrowserState(page, "dark", 3103);
				await page.addInitScript(() => {
					Math.random = () => 0.2;
				});
				await page.goto("/fourier-transform");
				await page.locator(".drill-summary").click();
				await page.locator("#ctft-mode-select").selectOption(mode);
				await page.locator("#signal-type-select").selectOption(family);
				await page.locator(".drill-summary").click();
				await expect
					.poll(() =>
						page.evaluate(() =>
							Boolean(window.__signalLabDev?.activeSolver),
						),
					)
					.toBe(true);
				await prepareVisualCapturePage(page, {
					module: "fourier-transform",
					archetype: `${mode}-${family}`,
				});
				await page.evaluate(() => window.__signalLabDev!.solveAll());
				await expect(page.locator(".completion-section")).toBeVisible();
				for (const width of [1280, 320]) {
					await page.setViewportSize({ width, height: 900 });
					await waitForCompletionVisuals(page, {
						module: "fourier-transform",
						archetype: `${mode}-${family}`,
					});
					await page.locator(".completion-section").evaluate(
						/**
						 * Aligns fractional SVG-container bounds to physical pixels for stable element crops.
						 * @param element - Completed spectrum section.
						 */
						(element) => {
							const section = element as HTMLElement;
							section.style.transform = "none";
							const bounds = section.getBoundingClientRect();
							section.style.transform = `translate(${Math.round(bounds.x) - bounds.x}px, ${Math.round(bounds.y) - bounds.y}px)`;
						},
					);
					await expect(
						page.locator(".completion-section"),
					).toHaveScreenshot(`ctft-${mode}-${family}-${width}.png`, {
						animations: "disabled",
					});
				}
			});
		}
	for (const mode of ["derivation", "pairs-properties"] as const) {
		/** Captures hint and diagnostic rendering on an actual active base-transform task. */
		test(`${mode} remediation`, async ({ page }) => {
			await page.emulateMedia({ reducedMotion: "reduce" });
			await installDeterministicBrowserState(page, "dark", 3103);
			await page.goto("/fourier-transform");
			await page.locator(".drill-summary").click();
			await page.locator("#ctft-mode-select").selectOption(mode);
			await page.locator(".drill-summary").click();
			await prepareVisualCapturePage(page, {
				module: "fourier-transform",
				archetype: `${mode}-remediation`,
			});
			for (const kind of ["hint", "diagnostic"] as const) {
				await page.evaluate(
					({ mode, kind }) =>
						window.__signalLabDev!.goToVisualState(
							`${mode}:base:expression:${kind}`,
						),
					{ mode, kind },
				);
				await expect(
					page.locator(".step-card.active"),
				).toHaveScreenshot(`ctft-${mode}-${kind}.png`, {
					animations: "disabled",
				});
			}
		});
	}
});

const runArtifacts: VisualArtifactEntry[] = [];
const runTimingRecorder = WRITE_INSPECTION_ARTIFACTS
	? new VisualTimingRecorder()
	: undefined;
const runStartedAt = performance.now();

/**
 * Prints a compact phase summary for an artifact-generating visual run.
 *
 * @param report - Completed timing report to summarize.
 */
function printVisualTimingSummary(
	report: ReturnType<VisualTimingRecorder["createReport"]>,
): void {
	console.log(
		`Solver visual timing: ${report.run.profile}/${report.run.pageMode}, ${report.run.artifactCount} artifacts, ${report.totals.suiteElapsedMs.toFixed(1)} ms total`,
	);
	console.table(
		Object.entries(report.phases).map(([phase, aggregate]) => ({
			phase,
			samples: aggregate.sampleCount,
			totalMs: aggregate.totalMs,
			percent: aggregate.percentageOfSuite,
		})),
	);
	console.log(
		`Unattributed: ${report.totals.unattributedMs.toFixed(1)} ms (${(100 - report.totals.measuredPercentage).toFixed(1)}%)`,
	);
}

/**
 * Measures an operation when inspection artifacts are enabled and otherwise
 * executes it without recording or emitting output.
 *
 * @param phase - Non-overlapping timing phase assigned to the operation.
 * @param context - Identifying metadata attached to the timing sample.
 * @param operation - Asynchronous operation to execute.
 * @returns The operation result.
 */
async function measureVisualPhase<Result>(
	phase: VisualTimingPhase,
	context: VisualTimingContext,
	operation: VisualTimingOperation<Result>,
): Promise<Result> {
	if (!runTimingRecorder) return operation();
	return runTimingRecorder.measure(phase, context, operation);
}

function safeFileSegment(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9.-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function resetCurrentRunDirectory(): void {
	if (
		path.basename(CURRENT_RUN_DIR) !== "current" ||
		path.dirname(CURRENT_RUN_DIR) !== SOLVERS_ROOT
	) {
		throw new Error(
			`Refusing to reset unexpected path: ${CURRENT_RUN_DIR}`,
		);
	}
	fs.rmSync(CURRENT_RUN_DIR, { recursive: true, force: true });
	fs.mkdirSync(CURRENT_RUN_DIR, { recursive: true });
}

function writeCurrentRunManifest(): void {
	const manifest: VisualRunManifest = {
		version: 2,
		generatedAt: new Date().toISOString(),
		coverage: {
			stateMatrix: CAPTURE_ONLY_HINT_STATES
				? "Only dark-mode captures with all available hints shown at desktop and narrow-mobile widths."
				: "All named solver states plus an all-hints variant for every step and sub-step at desktop and narrow-mobile widths in dark mode.",
			milestoneMatrix:
				VISUAL_CAPTURE_PROFILE === "full"
					? "Initial, representative diagnostic, and completed milestones across every viewport and both themes."
					: VISUAL_CAPTURE_PROFILE === "quick"
						? "Dark-mode milestones at desktop and narrow-mobile widths; the tablet viewport is omitted by the quick profile."
						: "Initial, representative diagnostic, and completed milestones across every viewport in dark mode.",
		},
		artifacts: [...runArtifacts].sort((a, b) =>
			[a.module, a.archetype, a.stateId, a.viewport, a.theme]
				.join("|")
				.localeCompare(
					[
						b.module,
						b.archetype,
						b.stateId,
						b.viewport,
						b.theme,
					].join("|"),
				),
		),
	};
	fs.writeFileSync(
		CURRENT_MANIFEST,
		`${JSON.stringify(manifest, null, 2)}\n`,
	);
}

async function installDeterministicBrowserState(
	page: Page,
	theme: Theme,
	seed: number,
): Promise<void> {
	await page.addInitScript(
		({ initialSeed, initialTheme }) => {
			let state = initialSeed >>> 0;
			Math.random = () => {
				state += 0x6d2b79f5;
				let value = state;
				value = Math.imul(value ^ (value >>> 15), value | 1);
				value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
				return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
			};
			localStorage.setItem("theme", initialTheme);
		},
		{ initialSeed: seed, initialTheme: theme },
	);
}

async function waitForStableLayout(
	page: Page,
	timingContext: VisualTimingContext,
): Promise<void> {
	await measureVisualPhase(
		"layout-stabilization",
		timingContext,
		async () => {
			await page.evaluate(() => document.fonts.ready);
			await expect(page.locator("body")).toBeVisible();
			const readyCanvases = page.locator("canvas[data-visual-ready]");
			const canvasCount = await readyCanvases.count();
			for (let index = 0; index < canvasCount; index += 1) {
				await expect(readyCanvases.nth(index)).toHaveAttribute(
					"data-visual-ready",
					"true",
					{ timeout: 10_000 },
				);
			}
			await page.evaluate(
				() =>
					new Promise<void>((resolve) => {
						requestAnimationFrame(() =>
							requestAnimationFrame(() => resolve()),
						);
					}),
			);
		},
	);
}

async function requireHarness(
	page: Page,
	timingContext: VisualTimingContext,
): Promise<void> {
	await measureVisualPhase("state-preparation", timingContext, async () => {
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						typeof window.__signalLabDev?.getVisualStates ===
							"function" &&
						typeof window.__signalLabDev?.goToVisualState ===
							"function",
				),
			)
			.toBe(true);
	});
}

async function getVisualStates(
	page: Page,
	timingContext: VisualTimingContext,
): Promise<HarnessVisualState[]> {
	return measureVisualPhase("state-preparation", timingContext, () =>
		page.evaluate(() => window.__signalLabDev?.getVisualStates() ?? []),
	);
}

/**
 * Selects one representative state for every unique parent step or sub-step.
 * Interactive states take precedence over diagnostics that exercise the same
 * sub-step. Explicit catalogued hint states retain their stable IDs and are
 * excluded from automatic expansion to avoid duplicate captures.
 */
function getAutomatedHintSourceIds(states: HarnessVisualState[]): Set<string> {
	const representativeByStep = new Map<string, HarnessVisualState>();
	for (const state of states) {
		if (state.kind === "hint") continue;
		const key = `${state.step}:${state.subStep ?? "parent"}`;
		const current = representativeByStep.get(key);
		if (
			!current ||
			(current.kind !== "interactive" && state.kind === "interactive")
		) {
			representativeByStep.set(key, state);
		}
	}

	const catalogIds = new Set(states.map((state) => state.id));
	return new Set(
		[...representativeByStep.values()]
			.filter((state) => !catalogIds.has(`${state.id}.hints`))
			.map((state) => state.id),
	);
}

async function goToVisualState(
	page: Page,
	stateId: string,
	timingContext: VisualTimingContext,
): Promise<void> {
	await measureVisualPhase(
		"state-preparation",
		{ ...timingContext, stateId },
		async () => {
			const prepared = await page.evaluate(
				(id) => window.__signalLabDev?.goToVisualState(id) ?? false,
				stateId,
			);
			expect(
				prepared,
				`developer harness could not prepare ${stateId}`,
			).toBe(true);
			await expect(page.locator(".step-card.active")).toHaveCount(1);
		},
	);
	await waitForStableLayout(page, { ...timingContext, stateId });
}

async function revealAllHints(
	page: Page,
	timingContext: VisualTimingContext,
): Promise<void> {
	await measureVisualPhase("hint-reveal", timingContext, async () => {
		await page.evaluate(() => window.__signalLabDev?.revealAllHints());
		const activeCard = page.locator(".step-card.active");
		await expect(activeCard.locator(".hints-content")).toBeVisible();
		await expect(activeCard.locator(".hint-toggle-btn")).toContainText(
			"All Hints Revealed",
		);
		const buttonLabel =
			(await activeCard.locator(".hint-toggle-btn").textContent()) ?? "";
		const countMatch = buttonLabel.match(/\((\d+)\/(\d+)\)/);
		expect(
			countMatch,
			"all-hints button should report the revealed total",
		).not.toBeNull();
		const revealedCount = Number(countMatch?.[1]);
		const totalCount = Number(countMatch?.[2]);
		expect(revealedCount).toBe(totalCount);
		expect(await activeCard.locator(".hint-line").count()).toBe(totalCount);
		expect(totalCount).toBeGreaterThan(0);
	});
	await waitForStableLayout(page, timingContext);
}

async function waitForCompletionVisuals(
	page: Page,
	timingContext: VisualTimingContext,
): Promise<void> {
	await measureVisualPhase("state-preparation", timingContext, async () => {
		await expect(page.locator(".completion-section")).toBeVisible();
		const canvases = page.locator(".completion-section canvas");
		const count = await canvases.count();
		for (let index = 0; index < count; index += 1) {
			await expect(canvases.nth(index)).toHaveAttribute(
				"data-visual-ready",
				"true",
				{ timeout: 10_000 },
			);
		}
	});
	await waitForStableLayout(page, timingContext);
}

function artifactPath(
	archetype: ProblemArchetype,
	stateId: string,
	theme: Theme,
	viewport: ViewportDefinition,
): { absolute: string; relative: string } {
	const fileName = `${safeFileSegment(stateId)}__${theme}__${viewport.name}.png`;
	const relative = path.join(
		"current",
		archetype.module,
		archetype.slug,
		fileName,
	);
	const absolute = path.join(SOLVERS_ROOT, relative);
	fs.mkdirSync(path.dirname(absolute), { recursive: true });
	return { absolute, relative };
}

async function recordArtifact(args: {
	page: Page;
	locator?: Locator | undefined;
	archetype: ProblemArchetype;
	stateId: string;
	stateLabel: string;
	stateKind: StateKind;
	step?: number | undefined;
	subStep?: string | undefined;
	theme: Theme;
	viewport: ViewportDefinition;
	captureKind: CaptureKind;
	snapshotSegments: string[];
}): Promise<void> {
	if (!WRITE_INSPECTION_ARTIFACTS) return;
	await measureVisualPhase(
		"artifact-writing",
		{
			module: args.archetype.module,
			archetype: args.archetype.slug,
			stateId: args.stateId,
			theme: args.theme,
			viewport: args.viewport.name,
			detail: args.captureKind,
		},
		async () => {
			const { absolute, relative } = artifactPath(
				args.archetype,
				args.stateId,
				args.theme,
				args.viewport,
			);
			const acceptedSnapshot = test
				.info()
				.snapshotPath(...args.snapshotSegments);
			const canCopyAcceptedSnapshot =
				COPY_ACCEPTED_SNAPSHOTS && fs.existsSync(acceptedSnapshot);
			if (canCopyAcceptedSnapshot) {
				fs.copyFileSync(acceptedSnapshot, absolute);
			} else if (args.locator) {
				await args.locator.screenshot({
					path: absolute,
					animations: "disabled",
					caret: "hide",
					scale: "css",
				});
			} else {
				await args.page.screenshot({
					path: absolute,
					fullPage: true,
					animations: "disabled",
					caret: "hide",
					scale: "css",
				});
			}

			runArtifacts.push({
				module: args.archetype.module,
				archetype: args.archetype.slug,
				archetypeTitle: args.archetype.title,
				stateId: args.stateId,
				stateLabel: args.stateLabel,
				stateKind: args.stateKind,
				step: args.step,
				subStep: args.subStep,
				theme: args.theme,
				viewport: args.viewport.name,
				captureKind: args.captureKind,
				relativePath: relative.split(path.sep).join("/"),
			});
		},
	);
}

function snapshotName(
	archetype: ProblemArchetype,
	stateId: string,
	theme: Theme,
	viewport: ViewportDefinition,
): string[] {
	return [
		archetype.module,
		archetype.slug,
		`${safeFileSegment(stateId)}__${theme}__${viewport.name}.png`,
	];
}

async function assertAndRecordPageMilestone(args: {
	page: Page;
	archetype: ProblemArchetype;
	stateId: string;
	stateLabel: string;
	theme: Theme;
	viewport: ViewportDefinition;
}): Promise<void> {
	// Solver focus updates can scroll after completion; reset sticky controls too.
	await args.page.evaluate(() =>
		window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
	);
	await waitForStableLayout(args.page, {
		module: args.archetype.module,
		archetype: args.archetype.slug,
		stateId: args.stateId,
		theme: args.theme,
		viewport: args.viewport.name,
	});
	const segments = snapshotName(
		args.archetype,
		args.stateId,
		args.theme,
		args.viewport,
	);
	await measureVisualPhase(
		"snapshot-comparison",
		{
			module: args.archetype.module,
			archetype: args.archetype.slug,
			stateId: args.stateId,
			theme: args.theme,
			viewport: args.viewport.name,
			detail: "milestone",
		},
		async () => {
			await expect.soft(args.page).toHaveScreenshot(segments, {
				fullPage: true,
				animations: "disabled",
				caret: "hide",
				scale: "css",
			});
		},
	);
	await recordArtifact({
		...args,
		stateKind: "milestone",
		captureKind: "milestone",
		snapshotSegments: segments,
	});
}

async function assertAndRecordActiveState(args: {
	page: Page;
	archetype: ProblemArchetype;
	stateId: string;
	stateLabel: string;
	stateKind: HarnessVisualState["kind"];
	step: number;
	subStep?: string | undefined;
	theme: Theme;
	viewport: ViewportDefinition;
}): Promise<void> {
	const activeCard = args.page.locator(".step-card.active");
	await expect(activeCard.locator(".step-badge")).toHaveText(
		new RegExp(`^Step\\s+${args.step}(?:\\D|$)`, "i"),
	);
	if (args.stateKind === "hint") {
		await expect(activeCard.locator(".hint-toggle-btn")).toContainText(
			"All Hints Revealed",
		);
	}
	const segments = snapshotName(
		args.archetype,
		args.stateId,
		args.theme,
		args.viewport,
	);
	await measureVisualPhase(
		"snapshot-comparison",
		{
			module: args.archetype.module,
			archetype: args.archetype.slug,
			stateId: args.stateId,
			theme: args.theme,
			viewport: args.viewport.name,
			detail: "state",
		},
		async () => {
			await expect.soft(activeCard).toHaveScreenshot(segments, {
				animations: "disabled",
				caret: "hide",
				scale: "css",
			});
		},
	);
	await recordArtifact({
		...args,
		locator: activeCard,
		captureKind: "state",
		snapshotSegments: segments,
	});
}

/**
 * Installs and verifies capture-only CSS for global chrome that must never
 * appear in solver snapshots. The injected rule remains active if the update
 * toast mounts after page preparation.
 *
 * @param page - Loaded solver page receiving the capture-only override.
 */
async function hideGlobalVisualCaptureChrome(page: Page): Promise<void> {
	const navbar = page.locator(".navbar");
	await expect(
		navbar,
		"visual captures require the application navbar",
	).toHaveCount(1);
	const style = await page.addStyleTag({
		content: VISUAL_CAPTURE_HIDDEN_CSS,
	});
	await style.evaluate((element) => {
		if (!(element instanceof HTMLStyleElement)) {
			throw new Error(
				"Expected the capture override to be a style element",
			);
		}
		element.setAttribute("data-solver-visual-hidden-chrome", "true");
	});
	const installedRule = page.locator(
		'style[data-solver-visual-hidden-chrome="true"]',
	);
	const installedRuleText = await installedRule.evaluate(
		(element) => element.textContent ?? "",
	);
	await expect(
		installedRuleText,
		"solver capture CSS must suppress the global update toast",
	).toContain(".update-toast");
	for (const selector of VISUAL_CAPTURE_HIDDEN_SELECTORS) {
		await expect(
			page.locator(selector),
			`${selector} must be hidden during solver visual captures`,
		).toBeHidden();
	}
}

/**
 * Prepares a loaded solver page for deterministic visual capture.
 *
 * @param page - Loaded solver page.
 * @param timingContext - Identifying metadata for phase timing.
 */
async function prepareVisualCapturePage(
	page: Page,
	timingContext: VisualTimingContext,
): Promise<void> {
	await measureVisualPhase("state-preparation", timingContext, async () => {
		await hideGlobalVisualCaptureChrome(page);
		await page.evaluate(() => window.scrollTo(0, 0));
	});
	await waitForStableLayout(page, timingContext);
	await measureVisualPhase("state-preparation", timingContext, async () => {
		if (WRITE_INSPECTION_ARTIFACTS) {
			const overflow = await page.evaluate(() => ({
				viewportWidth: window.innerWidth,
				documentWidth: document.documentElement.scrollWidth,
			}));
			if (overflow.documentWidth > overflow.viewportWidth) {
				console.warn(
					`Horizontal overflow captured at ${page.url()}: document ${overflow.documentWidth}px, viewport ${overflow.viewportWidth}px`,
				);
			}
			return;
		}
		await expect
			.poll(
				() =>
					page.evaluate(
						() =>
							document.documentElement.scrollWidth <=
							window.innerWidth,
					),
				{
					message:
						"solver page must not overflow the viewport horizontally",
				},
			)
			.toBe(true);
	});
}

/**
 * Applies a viewport and theme to an already loaded visual-capture page.
 * Canvas components receive the same event as the production theme control.
 *
 * @param page - Loaded solver page.
 * @param configuration - Viewport and theme to apply.
 * @param timingContext - Identifying metadata for phase timing.
 */
async function switchVisualEnvironment(
	page: Page,
	configuration: CaptureConfiguration,
	timingContext: VisualTimingContext,
): Promise<void> {
	const context = {
		...timingContext,
		theme: configuration.theme,
		viewport: configuration.viewport.name,
	};
	await measureVisualPhase("state-preparation", context, async () => {
		await page.setViewportSize({
			width: configuration.viewport.width,
			height: configuration.viewport.height,
		});
		await page.evaluate((theme: Theme) => {
			document.documentElement.setAttribute("data-theme", theme);
			localStorage.setItem("theme", theme);
			const themeColor = document.querySelector(
				'meta[name="theme-color"]',
			);
			themeColor?.setAttribute(
				"content",
				theme === "dark" ? "#0f172a" : "#f8fafc",
			);
			window.dispatchEvent(
				new CustomEvent("themechange", { detail: { theme } }),
			);
			window.scrollTo(0, 0);
		}, configuration.theme);
	});
	await waitForStableLayout(page, context);
}

/**
 * Captures one full-page milestone across the configured viewport/theme matrix.
 *
 * @param page - Reused solver page.
 * @param archetype - Solver problem represented by the page.
 * @param stateId - Stable milestone identifier.
 * @param stateLabel - Human-readable milestone label.
 * @param waitForCompletion - Whether completion canvases must be ready.
 */
async function captureReusedMilestoneMatrix(
	page: Page,
	archetype: ProblemArchetype,
	stateId: string,
	stateLabel: string,
	waitForCompletion = false,
): Promise<void> {
	for (const configuration of MILESTONE_CONFIGURATIONS) {
		const context: VisualTimingContext = {
			module: archetype.module,
			archetype: archetype.slug,
			stateId,
			theme: configuration.theme,
			viewport: configuration.viewport.name,
		};
		await test.step(`${archetype.slug} · ${stateId} · ${configuration.viewport.name} · ${configuration.theme}`, async () => {
			await switchVisualEnvironment(page, configuration, context);
			if (waitForCompletion) {
				await waitForCompletionVisuals(page, context);
			}
			await assertAndRecordPageMilestone({
				page,
				archetype,
				stateId,
				stateLabel,
				theme: configuration.theme,
				viewport: configuration.viewport,
			});
		});
	}
}

/**
 * Captures one active step state across the dark desktop/mobile matrix.
 *
 * @param page - Reused solver page.
 * @param archetype - Solver problem represented by the page.
 * @param state - Harness state metadata.
 * @param stateId - Captured identifier, including generated hint variants.
 * @param stateLabel - Captured human-readable label.
 * @param stateKind - Captured state classification.
 */
async function captureReusedStateMatrix(
	page: Page,
	archetype: ProblemArchetype,
	state: HarnessVisualState,
	stateId: string,
	stateLabel: string,
	stateKind: HarnessVisualState["kind"],
): Promise<void> {
	for (const configuration of STATE_CONFIGURATIONS) {
		await test.step(`${archetype.slug} · ${stateId} · ${configuration.viewport.name} · ${configuration.theme}`, async () => {
			const context: VisualTimingContext = {
				module: archetype.module,
				archetype: archetype.slug,
				stateId,
				theme: configuration.theme,
				viewport: configuration.viewport.name,
			};
			await switchVisualEnvironment(page, configuration, context);
			await assertAndRecordActiveState({
				page,
				archetype,
				stateId,
				stateLabel,
				stateKind,
				step: state.step,
				subStep: state.subStep,
				theme: configuration.theme,
				viewport: configuration.viewport,
			});
		});
	}
}

/**
 * Runs the complete visual matrix using one page and browser context per archetype.
 *
 * @param page - Playwright page dedicated to the archetype test.
 * @param archetype - Solver problem to capture.
 */
async function captureReusedArchetype(
	page: Page,
	archetype: ProblemArchetype,
): Promise<void> {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));
	const initialConfiguration = MILESTONE_CONFIGURATIONS[0];
	if (!initialConfiguration)
		throw new Error("Visual capture matrix is empty");
	const baseContext: VisualTimingContext = {
		module: archetype.module,
		archetype: archetype.slug,
	};
	await measureVisualPhase(
		"state-preparation",
		{ ...baseContext, detail: "browser-state" },
		async () => {
			await page.setViewportSize({
				width: initialConfiguration.viewport.width,
				height: initialConfiguration.viewport.height,
			});
			await installDeterministicBrowserState(
				page,
				initialConfiguration.theme,
				archetype.seed,
			);
		},
	);
	await measureVisualPhase(
		"navigation",
		{ ...baseContext, detail: "initial-navigation" },
		() => page.goto(archetype.path, { waitUntil: "domcontentloaded" }),
	);
	await prepareVisualCapturePage(page, {
		...baseContext,
		stateId: "milestone.initial",
	});
	if (archetype.isItsStepper && !CAPTURE_INITIAL_ONLY)
		await requireHarness(page, baseContext);
	await captureReusedMilestoneMatrix(
		page,
		archetype,
		"milestone.initial",
		"Initial Problem Setup",
	);
	if (CAPTURE_INITIAL_ONLY || !archetype.isItsStepper) {
		expect.soft(pageErrors, "uncaught browser errors").toEqual([]);
		return;
	}

	const states = await getVisualStates(page, {
		...baseContext,
		detail: "visual-state-catalog",
	});
	expect(states.length).toBeGreaterThan(0);
	const diagnosticState = states.find((state) => state.kind === "diagnostic");
	expect(diagnosticState).toBeDefined();
	if (diagnosticState) {
		await goToVisualState(page, diagnosticState.id, baseContext);
		await captureReusedMilestoneMatrix(
			page,
			archetype,
			"milestone.diagnostic",
			diagnosticState.label,
		);
	}

	const automatedHintSourceIds = getAutomatedHintSourceIds(states);
	for (const state of states) {
		await goToVisualState(page, state.id, baseContext);
		if (state.kind === "hint") {
			await revealAllHints(page, { ...baseContext, stateId: state.id });
		}
		if (!CAPTURE_ONLY_HINT_STATES || state.kind === "hint") {
			await captureReusedStateMatrix(
				page,
				archetype,
				state,
				state.id,
				state.label,
				state.kind,
			);
		}
		if (automatedHintSourceIds.has(state.id)) {
			const hintStateId = `${state.id}.hints`;
			await revealAllHints(page, {
				...baseContext,
				stateId: hintStateId,
			});
			await captureReusedStateMatrix(
				page,
				archetype,
				state,
				hintStateId,
				`${state.label} · All Hints`,
				"hint",
			);
		}
	}

	const resetState = states[0];
	if (!resetState)
		throw new Error("Cannot reset an empty visual state catalog");
	await goToVisualState(page, resetState.id, {
		...baseContext,
		stateId: "milestone.completed",
	});
	await measureVisualPhase(
		"state-preparation",
		{ ...baseContext, stateId: "milestone.completed", detail: "solve-all" },
		() =>
			page.evaluate(() => {
				if (!window.__signalLabDev) {
					throw new Error(
						"SignalLab developer harness is unavailable",
					);
				}
				window.__signalLabDev.solveAll();
			}),
	);
	await captureReusedMilestoneMatrix(
		page,
		archetype,
		"milestone.completed",
		"Completed Solution and Visualizer",
		true,
	);
	expect.soft(pageErrors, "uncaught browser errors").toEqual([]);
}

test.skip(
	!VISUAL_RUN_ENABLED,
	"Run with npm run test:e2e:solvers or npm run capture:solvers.",
);

test.describe("Deterministic solver visual states", () => {
	test.describe.configure({
		mode: CAPTURE_INITIAL_ONLY ? "default" : "serial",
	});
	test.setTimeout(VISUAL_PAGE_MODE === "reused" ? 300_000 : 120_000);

	test.beforeAll(async () => {
		if (!WRITE_INSPECTION_ARTIFACTS) return;
		await measureVisualPhase(
			"artifact-writing",
			{ detail: "reset-current-directory" },
			async () => resetCurrentRunDirectory(),
		);
	});

	test.afterAll(async () => {
		if (!WRITE_INSPECTION_ARTIFACTS || !runTimingRecorder) return;
		await measureVisualPhase(
			"artifact-writing",
			{ detail: "manifest" },
			async () => writeCurrentRunManifest(),
		);
		const report = runTimingRecorder.createReport({
			profile: VISUAL_CAPTURE_PROFILE,
			pageMode: VISUAL_PAGE_MODE,
			artifactCount: runArtifacts.length,
			suiteElapsedMs: performance.now() - runStartedAt,
		});
		writeVisualTimingReportAtomically(CURRENT_TIMINGS, report);
		printVisualTimingSummary(report);
	});

	if (VISUAL_PAGE_MODE === "isolated") {
		for (const archetype of PROBLEM_ARCHETYPES) {
			for (const viewport of CAPTURE_VIEWPORTS) {
				for (const theme of CAPTURE_THEMES) {
					test(`${archetype.slug} · ${viewport.name} · ${theme}`, async ({
						page,
					}) => {
						const pageErrors: string[] = [];
						page.on("pageerror", (error) =>
							pageErrors.push(error.message),
						);
						const timingContext: VisualTimingContext = {
							module: archetype.module,
							archetype: archetype.slug,
							theme,
							viewport: viewport.name,
						};
						await measureVisualPhase(
							"state-preparation",
							{ ...timingContext, detail: "browser-state" },
							async () => {
								await page.setViewportSize({
									width: viewport.width,
									height: viewport.height,
								});
								await installDeterministicBrowserState(
									page,
									theme,
									archetype.seed,
								);
							},
						);
						await measureVisualPhase(
							"navigation",
							{ ...timingContext, detail: "initial-navigation" },
							() =>
								page.goto(archetype.path, {
									waitUntil: "networkidle",
								}),
						);
						await prepareVisualCapturePage(page, {
							...timingContext,
							stateId: "milestone.initial",
						});

						if (archetype.isItsStepper && !CAPTURE_INITIAL_ONLY) {
							await requireHarness(page, timingContext);
						}

						await assertAndRecordPageMilestone({
							page,
							archetype,
							stateId: "milestone.initial",
							stateLabel: "Initial Problem Setup",
							theme,
							viewport,
						});

						if (archetype.isItsStepper && !CAPTURE_INITIAL_ONLY) {
							const states = await getVisualStates(page, {
								...timingContext,
								detail: "visual-state-catalog",
							});
							expect(states.length).toBeGreaterThan(0);

							const diagnosticState = states.find(
								(state) => state.kind === "diagnostic",
							);
							expect(diagnosticState).toBeDefined();
							if (diagnosticState) {
								await goToVisualState(
									page,
									diagnosticState.id,
									timingContext,
								);
								await assertAndRecordPageMilestone({
									page,
									archetype,
									stateId: "milestone.diagnostic",
									stateLabel: diagnosticState.label,
									theme,
									viewport,
								});
							}

							const capturesAllStates =
								theme === "dark" &&
								viewport.name !== "tablet-768x1024";
							if (capturesAllStates) {
								const automatedHintSourceIds =
									getAutomatedHintSourceIds(states);
								for (const state of states) {
									await goToVisualState(
										page,
										state.id,
										timingContext,
									);
									if (state.kind === "hint") {
										await revealAllHints(page, {
											...timingContext,
											stateId: state.id,
										});
									}
									if (
										!CAPTURE_ONLY_HINT_STATES ||
										state.kind === "hint"
									) {
										await assertAndRecordActiveState({
											page,
											archetype,
											stateId: state.id,
											stateLabel: state.label,
											stateKind: state.kind,
											step: state.step,
											subStep: state.subStep,
											theme,
											viewport,
										});
									}

									if (automatedHintSourceIds.has(state.id)) {
										const hintStateId = `${state.id}.hints`;
										await revealAllHints(page, {
											...timingContext,
											stateId: hintStateId,
										});
										await assertAndRecordActiveState({
											page,
											archetype,
											stateId: hintStateId,
											stateLabel: `${state.label} · All Hints`,
											stateKind: "hint",
											step: state.step,
											subStep: state.subStep,
											theme,
											viewport,
										});
									}
								}
							}

							const completedTimingContext = {
								...timingContext,
								stateId: "milestone.completed",
							};
							await measureVisualPhase(
								"navigation",
								{
									...completedTimingContext,
									detail: "completion-reload",
								},
								() => page.reload({ waitUntil: "networkidle" }),
							);
							await prepareVisualCapturePage(
								page,
								completedTimingContext,
							);
							await requireHarness(page, completedTimingContext);
							await measureVisualPhase(
								"state-preparation",
								{
									...completedTimingContext,
									detail: "solve-all",
								},
								() =>
									page.evaluate(() => {
										if (!window.__signalLabDev) {
											throw new Error(
												"SignalLab developer harness is unavailable",
											);
										}
										window.__signalLabDev.solveAll();
									}),
							);
							await waitForCompletionVisuals(
								page,
								completedTimingContext,
							);
							await assertAndRecordPageMilestone({
								page,
								archetype,
								stateId: "milestone.completed",
								stateLabel: "Completed Solution and Visualizer",
								theme,
								viewport,
							});
						}

						expect
							.soft(pageErrors, "uncaught browser errors")
							.toEqual([]);
					});
				}
			}
		}
	} else {
		for (const archetype of PROBLEM_ARCHETYPES) {
			test(`${archetype.slug} · reused page`, async ({ page }) => {
				await captureReusedArchetype(page, archetype);
			});
		}
	}
});
