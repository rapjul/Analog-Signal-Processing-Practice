import fs from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";

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
const WRITE_INSPECTION_ARTIFACTS =
	process.env.SIGNALLAB_VISUAL_ARTIFACTS === "1";
type VisualCaptureProfile = "full" | "dark" | "quick";
const requestedCaptureProfile = process.env.SIGNALLAB_VISUAL_PROFILE ?? "full";
if (!["full", "dark", "quick"].includes(requestedCaptureProfile)) {
	throw new Error(
		`Unknown SIGNALLAB_VISUAL_PROFILE: ${requestedCaptureProfile}`,
	);
}
const VISUAL_CAPTURE_PROFILE = requestedCaptureProfile as VisualCaptureProfile;
const CAPTURE_THEMES: readonly Theme[] =
	VISUAL_CAPTURE_PROFILE === "full" ? ["dark", "light"] : ["dark"];
const CAPTURE_ONLY_HINT_STATES = VISUAL_CAPTURE_PROFILE === "quick";
const SOLVERS_ROOT = path.resolve(
	process.cwd(),
	"tests/e2e/screenshots/solvers",
);
const CURRENT_RUN_DIR = path.join(SOLVERS_ROOT, "current");
const CURRENT_MANIFEST = path.join(CURRENT_RUN_DIR, "manifest.json");

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
	subStep?: string;
	kind: "interactive" | "hint" | "diagnostic";
}

interface VisualArtifactEntry {
	module: string;
	archetype: string;
	archetypeTitle: string;
	stateId: string;
	stateLabel: string;
	stateKind: StateKind;
	step?: number;
	subStep?: string;
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

const PROBLEM_ARCHETYPES: ProblemArchetype[] = [
	{
		module: "odes",
		slug: "odes-2nd-order-distinct-real",
		title: "2nd-Order Distinct Real ODE",
		path: "/odes?rootType=distinct_real&forcing=exponential",
		seed: 1101,
		isItsStepper: true,
	},
	{
		module: "odes",
		slug: "odes-2nd-order-repeated-real",
		title: "2nd-Order Repeated Real ODE",
		path: "/odes?rootType=repeated_real&forcing=constant",
		seed: 1102,
		isItsStepper: true,
	},
	{
		module: "odes",
		slug: "odes-2nd-order-complex-conjugate",
		title: "2nd-Order Complex Conjugate ODE",
		path: "/odes?rootType=complex_conjugate&forcing=sinusoid",
		seed: 1103,
		isItsStepper: true,
	},
	{
		module: "fourier-series",
		slug: "fourier-series-square-wave",
		title: "Fourier Series Square Wave",
		path: "/fourier-series?waveform=square",
		seed: 2101,
		isItsStepper: true,
	},
	{
		module: "fourier-series",
		slug: "fourier-series-triangle-wave",
		title: "Fourier Series Triangle Wave",
		path: "/fourier-series?waveform=triangle",
		seed: 2102,
		isItsStepper: true,
	},
	{
		module: "fourier-series",
		slug: "fourier-series-sawtooth-wave",
		title: "Fourier Series Sawtooth Wave",
		path: "/fourier-series?waveform=sawtooth",
		seed: 2103,
		isItsStepper: true,
	},
	{
		module: "convolution",
		slug: "convolution-continuous-time",
		title: "Continuous-Time Convolution",
		path: "/convolution",
		seed: 3101,
		isItsStepper: false,
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
		slug: "ctft-transform-duality",
		title: "CTFT Transform & Duality",
		path: "/fourier-transform",
		seed: 3103,
		isItsStepper: false,
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

const runArtifacts: VisualArtifactEntry[] = [];

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

async function waitForStableLayout(page: Page): Promise<void> {
	await page.evaluate(() => document.fonts.ready);
	await expect(page.locator("body")).toBeVisible();
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				requestAnimationFrame(() =>
					requestAnimationFrame(() => resolve()),
				);
			}),
	);
}

async function requireHarness(page: Page): Promise<void> {
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
}

async function getVisualStates(page: Page): Promise<HarnessVisualState[]> {
	return page.evaluate(() => window.__signalLabDev?.getVisualStates() ?? []);
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

async function goToVisualState(page: Page, stateId: string): Promise<void> {
	const prepared = await page.evaluate(
		(id) => window.__signalLabDev?.goToVisualState(id) ?? false,
		stateId,
	);
	expect(prepared, `developer harness could not prepare ${stateId}`).toBe(
		true,
	);
	await expect(page.locator(".step-card.active")).toHaveCount(1);
	await waitForStableLayout(page);
}

async function revealAllHints(page: Page): Promise<void> {
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
	await waitForStableLayout(page);
}

async function waitForCompletionVisuals(page: Page): Promise<void> {
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
	await waitForStableLayout(page);
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
	locator?: Locator;
	archetype: ProblemArchetype;
	stateId: string;
	stateLabel: string;
	stateKind: StateKind;
	step?: number;
	subStep?: string;
	theme: Theme;
	viewport: ViewportDefinition;
	captureKind: CaptureKind;
}): Promise<void> {
	if (!WRITE_INSPECTION_ARTIFACTS) return;
	const { absolute, relative } = artifactPath(
		args.archetype,
		args.stateId,
		args.theme,
		args.viewport,
	);
	if (args.locator) {
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
	await expect
		.soft(args.page)
		.toHaveScreenshot(
			snapshotName(
				args.archetype,
				args.stateId,
				args.theme,
				args.viewport,
			),
			{
				fullPage: true,
				animations: "disabled",
				caret: "hide",
				scale: "css",
			},
		);
	await recordArtifact({
		...args,
		stateKind: "milestone",
		captureKind: "milestone",
	});
}

async function assertAndRecordActiveState(args: {
	page: Page;
	archetype: ProblemArchetype;
	stateId: string;
	stateLabel: string;
	stateKind: HarnessVisualState["kind"];
	step: number;
	subStep?: string;
	theme: Theme;
	viewport: ViewportDefinition;
}): Promise<void> {
	const activeCard = args.page.locator(".step-card.active");
	await expect
		.soft(activeCard)
		.toHaveScreenshot(
			snapshotName(
				args.archetype,
				args.stateId,
				args.theme,
				args.viewport,
			),
			{
				animations: "disabled",
				caret: "hide",
				scale: "css",
			},
		);
	await recordArtifact({
		...args,
		locator: activeCard,
		captureKind: "state",
	});
}

async function prepareVisualCapturePage(page: Page): Promise<void> {
	const navbar = page.locator(".navbar");
	await expect(
		navbar,
		"visual captures require the application navbar",
	).toHaveCount(1);
	await page.addStyleTag({
		content: ".navbar { display: none !important; }",
	});
	await page.evaluate(() => window.scrollTo(0, 0));
	await waitForStableLayout(page);
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
}

test.skip(
	!VISUAL_RUN_ENABLED,
	"Run with npm run test:e2e:solvers or npm run capture:solvers.",
);

test.describe("Deterministic solver visual states", () => {
	test.describe.configure({ mode: "serial" });
	test.setTimeout(120_000);

	test.beforeAll(() => {
		if (WRITE_INSPECTION_ARTIFACTS) resetCurrentRunDirectory();
	});

	test.afterAll(() => {
		if (WRITE_INSPECTION_ARTIFACTS) writeCurrentRunManifest();
	});

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
					await page.setViewportSize({
						width: viewport.width,
						height: viewport.height,
					});
					await installDeterministicBrowserState(
						page,
						theme,
						archetype.seed,
					);
					await page.goto(archetype.path, {
						waitUntil: "networkidle",
					});
					await prepareVisualCapturePage(page);

					if (archetype.isItsStepper) await requireHarness(page);

					await assertAndRecordPageMilestone({
						page,
						archetype,
						stateId: "milestone.initial",
						stateLabel: "Initial Problem Setup",
						theme,
						viewport,
					});

					if (archetype.isItsStepper) {
						const states = await getVisualStates(page);
						expect(states.length).toBeGreaterThan(0);

						const diagnosticState = states.find(
							(state) => state.kind === "diagnostic",
						);
						expect(diagnosticState).toBeDefined();
						if (diagnosticState) {
							await goToVisualState(page, diagnosticState.id);
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
								await goToVisualState(page, state.id);
								if (state.kind === "hint") {
									await revealAllHints(page);
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
									await revealAllHints(page);
									await assertAndRecordActiveState({
										page,
										archetype,
										stateId: `${state.id}.hints`,
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

						await page.reload({ waitUntil: "networkidle" });
						await prepareVisualCapturePage(page);
						await requireHarness(page);
						await page.evaluate(() => {
							if (!window.__signalLabDev) {
								throw new Error(
									"SignalLab developer harness is unavailable",
								);
							}
							window.__signalLabDev.solveAll();
						});
						await waitForCompletionVisuals(page);
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
});
