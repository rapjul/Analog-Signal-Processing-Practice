import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { VisualTimingReport } from "../tests/e2e/solver-visual-timing.ts";
import {
	renderTimingWaterfallHtml,
	TIMING_WATERFALL_FILENAME,
} from "./solver-visual-timing-waterfall.ts";

/** Supported capture profiles. */
type BenchmarkProfile = "quick" | "dark" | "full";
/** Supported page lifecycle implementations. */
type BenchmarkPageMode = "isolated" | "reused";
/** Benchmark phases compared in the final report. */
type BenchmarkPhase = "baseline" | "optimized";

/** Validated command-line configuration for one benchmark repetition. */
interface BenchmarkArguments {
	/** Existing benchmark session identifier. */
	sessionId: string;
	/** Before-or-after benchmark phase. */
	phase: BenchmarkPhase;
	/** Counterbalanced cycle number. */
	cycle: 1 | 2 | 3;
	/** Capture profile measured by this repetition. */
	profile: BenchmarkProfile;
	/** Page lifecycle implementation under measurement. */
	pageMode: BenchmarkPageMode;
}

/** Hash record for one durable or generated file. */
interface FileHashEntry {
	/** Path relative to the inventoried root. */
	path: string;
	/** File size in bytes. */
	bytes: number;
	/** Lowercase SHA-256 digest. */
	sha256: string;
}

/** Process result with complete captured output. */
interface CapturedProcessResult {
	/** Exit status, or one when the process could not report one. */
	exitCode: number;
	/** Combined standard output and standard error. */
	output: string;
}

/** Durable summary for one benchmark repetition. */
interface BenchmarkRunRecord {
	/** Monotonic run sequence within the session. */
	sequence: number;
	/** Directory name containing this run's raw evidence. */
	runDirectory: string;
	/** ISO-8601 time at which the repetition began. */
	startedAt: string;
	/** Validated repetition arguments. */
	configuration: Omit<BenchmarkArguments, "sessionId">;
	/** Complete Playwright-plus-gallery wall time. */
	commandWallMs: number;
	/** Playwright process wall time. */
	playwrightWallMs: number;
	/** Gallery-generation wall time. */
	galleryWallMs: number;
	/** Playwright process exit status. */
	playwrightExitCode: number;
	/** Gallery process exit status, or null when it did not run. */
	galleryExitCode: number | null;
	/** Whether the read-only baseline inventory remained unchanged. */
	baselinesUnchanged: boolean;
	/** Artifact count reported by the run manifest. */
	artifactCount: number;
	/** Relative path to the archived timing report, when produced. */
	timingReport: string | null;
	/** Relative path to the archived timing waterfall, when produced. */
	timingVisualization: string | null;
}

/** Versioned append-only history for one benchmark session. */
interface BenchmarkHistory {
	/** History schema version. */
	version: 1;
	/** Stable benchmark session identifier. */
	sessionId: string;
	/** Completed repetitions in sequence order. */
	runs: BenchmarkRunRecord[];
}

/** Aggregate command-wall statistics for comparable repetitions. */
interface BenchmarkAggregate {
	/** Group identifier. */
	key: string;
	/** Number of completed successful repetitions. */
	count: number;
	/** Arithmetic mean in milliseconds. */
	meanMs: number;
	/** Sample standard deviation in milliseconds. */
	standardDeviationMs: number;
	/** Minimum duration in milliseconds. */
	minMs: number;
	/** Maximum duration in milliseconds. */
	maxMs: number;
}

const WORKSPACE_ROOT = process.cwd();
const SOLVER_SCREENSHOTS_ROOT = path.join(
	WORKSPACE_ROOT,
	"tests/e2e/screenshots/solvers",
);
const BENCHMARKS_ROOT = path.join(SOLVER_SCREENSHOTS_ROOT, "benchmarks");
const CURRENT_ROOT = path.join(SOLVER_SCREENSHOTS_ROOT, "current");
const BASELINES_ROOT = path.join(
	WORKSPACE_ROOT,
	"tests/e2e/solver-visual-baselines",
);
const EXPECTED_ORDERS: Record<1 | 2 | 3, BenchmarkProfile[]> = {
	1: ["quick", "dark", "full"],
	2: ["dark", "full", "quick"],
	3: ["full", "quick", "dark"],
};

/**
 * Parses and validates the benchmark driver's named arguments.
 *
 * @param argumentsList - Raw process arguments excluding Node and script paths.
 * @returns Validated benchmark configuration.
 */
function parseArguments(argumentsList: string[]): BenchmarkArguments {
	const values = new Map<string, string>();
	for (let index = 0; index < argumentsList.length; index += 2) {
		const key = argumentsList[index];
		const value = argumentsList[index + 1];
		if (!key?.startsWith("--") || value === undefined) {
			throw new Error(
				`Expected named argument and value near ${key ?? "end"}`,
			);
		}
		values.set(key.slice(2), value);
	}

	const sessionId = values.get("session");
	const phase = values.get("phase");
	const cycleValue = Number(values.get("cycle"));
	const profile = values.get("profile");
	const pageMode = values.get("page-mode");
	if (!sessionId || !/^[a-zA-Z0-9._-]+$/.test(sessionId)) {
		throw new Error(
			"--session must contain only letters, numbers, dots, underscores, or hyphens",
		);
	}
	if (phase !== "baseline" && phase !== "optimized") {
		throw new Error("--phase must be baseline or optimized");
	}
	if (cycleValue !== 1 && cycleValue !== 2 && cycleValue !== 3) {
		throw new Error("--cycle must be 1, 2, or 3");
	}
	if (profile !== "quick" && profile !== "dark" && profile !== "full") {
		throw new Error("--profile must be quick, dark, or full");
	}
	if (pageMode !== "isolated" && pageMode !== "reused") {
		throw new Error("--page-mode must be isolated or reused");
	}
	return {
		sessionId,
		phase,
		cycle: cycleValue,
		profile,
		pageMode,
	};
}

/**
 * Rounds milliseconds to microsecond precision.
 *
 * @param value - Raw millisecond value.
 * @returns Rounded millisecond value.
 */
function roundMilliseconds(value: number): number {
	return Math.round(value * 1_000) / 1_000;
}

/**
 * Writes JSON through a unique sibling before atomically replacing the target.
 *
 * @param destination - Final JSON path.
 * @param value - Serializable value.
 */
function writeJsonAtomically(destination: string, value: unknown): void {
	fs.mkdirSync(path.dirname(destination), { recursive: true });
	const temporaryPath = path.join(
		path.dirname(destination),
		`.${path.basename(destination)}.${process.pid}.${randomUUID()}.tmp`,
	);
	try {
		const serialized = `${JSON.stringify(value, null, 2)}\n`;
		JSON.parse(serialized);
		fs.writeFileSync(temporaryPath, serialized, { flag: "wx" });
		fs.renameSync(temporaryPath, destination);
	} catch (error) {
		fs.rmSync(temporaryPath, { force: true });
		throw error;
	}
}

/**
 * Recursively enumerates regular files in lexical path order.
 *
 * @param root - Directory to enumerate.
 * @returns Absolute file paths.
 */
function listFiles(root: string): string[] {
	if (!fs.existsSync(root)) return [];
	const files: string[] = [];
	for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
		const absolute = path.join(root, entry.name);
		if (entry.isDirectory()) files.push(...listFiles(absolute));
		else if (entry.isFile()) files.push(absolute);
	}
	return files.sort();
}

/**
 * Builds a SHA-256 inventory for a directory tree.
 *
 * @param root - Root represented by relative inventory paths.
 * @param extension - Optional filename suffix filter.
 * @returns Deterministically ordered file records.
 */
function createHashInventory(
	root: string,
	extension?: string,
): FileHashEntry[] {
	return listFiles(root)
		.filter((file) => !extension || file.endsWith(extension))
		.map((file) => {
			const contents = fs.readFileSync(file);
			return {
				path: path.relative(root, file).split(path.sep).join("/"),
				bytes: contents.byteLength,
				sha256: createHash("sha256").update(contents).digest("hex"),
			};
		});
}

/**
 * Runs a process while streaming and retaining its combined output.
 *
 * @param command - Executable path.
 * @param argumentsList - Arguments passed to the executable.
 * @param environment - Complete child-process environment.
 * @returns Exit status and combined output.
 */
async function runCapturedProcess(
	command: string,
	argumentsList: string[],
	environment: NodeJS.ProcessEnv,
): Promise<CapturedProcessResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, argumentsList, {
			cwd: WORKSPACE_ROOT,
			env: environment,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let output = "";
		child.stdout.on("data", (chunk: Buffer) => {
			const text = chunk.toString();
			output += text;
			process.stdout.write(text);
		});
		child.stderr.on("data", (chunk: Buffer) => {
			const text = chunk.toString();
			output += text;
			process.stderr.write(text);
		});
		child.once("error", reject);
		child.once("close", (code) => resolve({ exitCode: code ?? 1, output }));
	});
}

/**
 * Returns the trimmed standard output of a short read-only command.
 *
 * @param command - Executable name.
 * @param argumentsList - Command arguments.
 * @returns Trimmed output or an unavailable marker.
 */
function readCommandVersion(command: string, argumentsList: string[]): string {
	const result = spawnSync(command, argumentsList, {
		cwd: WORKSPACE_ROOT,
		encoding: "utf8",
	});
	return result.status === 0 ? result.stdout.trim() : "unavailable";
}

/**
 * Reads an existing history or creates an empty in-memory history.
 *
 * @param historyPath - Session history path.
 * @param sessionId - Expected session identifier.
 * @returns Parsed benchmark history.
 */
function readHistory(historyPath: string, sessionId: string): BenchmarkHistory {
	if (!fs.existsSync(historyPath)) return { version: 1, sessionId, runs: [] };
	const history = JSON.parse(
		fs.readFileSync(historyPath, "utf8"),
	) as BenchmarkHistory;
	if (
		history.version !== 1 ||
		history.sessionId !== sessionId ||
		!Array.isArray(history.runs)
	) {
		throw new Error(`Invalid benchmark history: ${historyPath}`);
	}
	return history;
}

/**
 * Enforces the planned counterbalanced order for successful repetitions.
 * Failed diagnostic attempts remain archived but do not advance the sequence.
 *
 * @param history - Existing session history.
 * @param configuration - Requested next repetition.
 */
function assertCounterbalancedOrder(
	history: BenchmarkHistory,
	configuration: BenchmarkArguments,
): void {
	const successfulPhaseRuns = history.runs.filter(
		(run) =>
			run.configuration.phase === configuration.phase &&
			run.playwrightExitCode === 0 &&
			run.galleryExitCode === 0 &&
			run.baselinesUnchanged,
	);
	if (successfulPhaseRuns.length >= 9) {
		throw new Error(
			`All nine ${configuration.phase} repetitions are already complete`,
		);
	}
	const expectedCycle = (Math.floor(successfulPhaseRuns.length / 3) + 1) as
		1 | 2 | 3;
	const expectedProfile =
		EXPECTED_ORDERS[expectedCycle][successfulPhaseRuns.length % 3];
	if (
		configuration.cycle !== expectedCycle ||
		configuration.profile !== expectedProfile
	) {
		throw new Error(
			`Counterbalanced order requires cycle ${expectedCycle} profile ${expectedProfile} next`,
		);
	}
}

/**
 * Computes a sample standard deviation.
 *
 * @param values - Numeric sample.
 * @param mean - Precomputed arithmetic mean.
 * @returns Sample standard deviation, or zero for fewer than two values.
 */
function sampleStandardDeviation(values: number[], mean: number): number {
	if (values.length < 2) return 0;
	const variance =
		values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
		(values.length - 1);
	return Math.sqrt(variance);
}

/**
 * Builds successful command-wall aggregates for the session summary.
 *
 * @param runs - Completed benchmark records.
 * @returns Aggregates grouped by phase, profile, and page mode.
 */
function createAggregates(runs: BenchmarkRunRecord[]): BenchmarkAggregate[] {
	const groups = new Map<string, number[]>();
	for (const run of runs) {
		if (
			run.playwrightExitCode !== 0 ||
			run.galleryExitCode !== 0 ||
			!run.baselinesUnchanged
		)
			continue;
		const key = `${run.configuration.phase}/${run.configuration.profile}/${run.configuration.pageMode}`;
		const values = groups.get(key) ?? [];
		values.push(run.commandWallMs);
		groups.set(key, values);
	}
	return [...groups.entries()].sort().map(([key, values]) => {
		const mean =
			values.reduce((sum, value) => sum + value, 0) / values.length;
		return {
			key,
			count: values.length,
			meanMs: roundMilliseconds(mean),
			standardDeviationMs: roundMilliseconds(
				sampleStandardDeviation(values, mean),
			),
			minMs: roundMilliseconds(Math.min(...values)),
			maxMs: roundMilliseconds(Math.max(...values)),
		};
	});
}

/**
 * Copies a file when it exists.
 *
 * @param source - Candidate source path.
 * @param destination - Archive destination path.
 * @returns Whether a file was copied.
 */
function copyFileIfPresent(source: string, destination: string): boolean {
	if (!fs.existsSync(source)) return false;
	fs.copyFileSync(source, destination);
	return true;
}

/**
 * Returns a file digest without changing or consuming the source.
 *
 * @param source - Candidate file to fingerprint.
 * @returns SHA-256 digest, or null when the file does not exist.
 */
function readFileDigestIfPresent(source: string): string | null {
	if (!fs.existsSync(source)) return null;
	return createHash("sha256").update(fs.readFileSync(source)).digest("hex");
}

/**
 * Main benchmark-driver entry point.
 */
async function main(): Promise<void> {
	const configuration = parseArguments(process.argv.slice(2));
	const expectedProfiles = EXPECTED_ORDERS[configuration.cycle];
	if (!expectedProfiles.includes(configuration.profile)) {
		throw new Error(
			"Profile is not part of the selected counterbalanced cycle",
		);
	}
	const sessionRoot = path.join(BENCHMARKS_ROOT, configuration.sessionId);
	if (!fs.existsSync(sessionRoot)) {
		throw new Error(
			`Benchmark session must already exist with preserved inputs: ${sessionRoot}`,
		);
	}
	const preservedCurrent = path.join(sessionRoot, "original-current.sha256");
	const preservedBaselines = path.join(
		sessionRoot,
		"original-baselines.sha256",
	);
	if (
		!fs.existsSync(preservedCurrent) ||
		!fs.existsSync(preservedBaselines)
	) {
		throw new Error(
			"Benchmark session is missing its preserved-input checksum manifests",
		);
	}

	const historyPath = path.join(sessionRoot, "benchmark-history.json");
	const history = readHistory(historyPath, configuration.sessionId);
	assertCounterbalancedOrder(history, configuration);
	const sequence = history.runs.length + 1;
	const runName = `${String(sequence).padStart(3, "0")}-${configuration.phase}-cycle${configuration.cycle}-${configuration.profile}-${configuration.pageMode}`;
	const runRoot = path.join(sessionRoot, "runs", runName);
	if (fs.existsSync(runRoot))
		throw new Error(`Refusing to overwrite prior run: ${runRoot}`);
	fs.mkdirSync(runRoot, { recursive: true });

	const baselineInventoryBefore = createHashInventory(BASELINES_ROOT, ".png");
	if (baselineInventoryBefore.length === 0) {
		throw new Error(
			"No solver visual baselines exist; benchmarks never create or update them",
		);
	}
	writeJsonAtomically(
		path.join(runRoot, "baseline-inventory-before.json"),
		baselineInventoryBefore,
	);
	writeJsonAtomically(path.join(runRoot, "environment.json"), {
		startedAt: new Date().toISOString(),
		commit: readCommandVersion("git", ["rev-parse", "HEAD"]),
		platform: `${os.platform()} ${os.release()} ${os.arch()}`,
		cpu: os.cpus()[0]?.model ?? "unavailable",
		logicalCpuCount: os.cpus().length,
		memoryBytes: os.totalmem(),
		node: process.version,
		npm: readCommandVersion("npm", ["--version"]),
		playwright: readCommandVersion(
			path.join(WORKSPACE_ROOT, "node_modules/.bin/playwright"),
			["--version"],
		),
		serverReuse: process.env.CI
			? "disabled by Playwright configuration"
			: "enabled when an existing server answers the configured URL",
		configuration,
	});

	const startedAt = new Date().toISOString();
	const timingSource = path.join(CURRENT_ROOT, "timings.json");
	const timingDigestBefore = readFileDigestIfPresent(timingSource);
	const commandStartedAt = performance.now();
	const playwrightStartedAt = performance.now();
	const playwrightResult = await runCapturedProcess(
		path.join(WORKSPACE_ROOT, "node_modules/.bin/playwright"),
		["test", "tests/e2e/solver-visual-snapshots.spec.ts"],
		{
			...process.env,
			SIGNALLAB_VISUAL_REGRESSION: "1",
			SIGNALLAB_VISUAL_ARTIFACTS: "1",
			SIGNALLAB_VISUAL_PROFILE: configuration.profile,
			SIGNALLAB_VISUAL_PAGE_MODE: configuration.pageMode,
		},
	);
	const playwrightWallMs = performance.now() - playwrightStartedAt;
	fs.writeFileSync(
		path.join(runRoot, "playwright-output.log"),
		playwrightResult.output,
	);

	let galleryResult: CapturedProcessResult | undefined;
	let galleryWallMs = 0;
	if (playwrightResult.exitCode === 0) {
		const galleryStartedAt = performance.now();
		galleryResult = await runCapturedProcess(
			process.execPath,
			["scripts/generate-solver-gallery.ts"],
			process.env,
		);
		galleryWallMs = performance.now() - galleryStartedAt;
		fs.writeFileSync(
			path.join(runRoot, "gallery-output.log"),
			galleryResult.output,
		);
	}

	const commandWallMs = performance.now() - commandStartedAt;
	const baselineInventoryAfter = createHashInventory(BASELINES_ROOT, ".png");
	writeJsonAtomically(
		path.join(runRoot, "baseline-inventory-after.json"),
		baselineInventoryAfter,
	);
	const baselinesUnchanged =
		JSON.stringify(baselineInventoryBefore) ===
		JSON.stringify(baselineInventoryAfter);
	const currentInventory = createHashInventory(CURRENT_ROOT, ".png");
	writeJsonAtomically(
		path.join(runRoot, "current-png-inventory.json"),
		currentInventory,
	);

	const manifestSource = path.join(CURRENT_ROOT, "manifest.json");
	const timingDestination = path.join(runRoot, "timings.json");
	const timingDigestAfter = readFileDigestIfPresent(timingSource);
	const timingIsFresh =
		timingDigestAfter !== null && timingDigestAfter !== timingDigestBefore;
	const timingCopied =
		timingIsFresh && copyFileIfPresent(timingSource, timingDestination);
	let timingVisualization: string | null = null;
	if (timingCopied) {
		const timingReport = JSON.parse(
			fs.readFileSync(timingDestination, "utf8"),
		) as VisualTimingReport;
		fs.writeFileSync(
			path.join(runRoot, TIMING_WATERFALL_FILENAME),
			renderTimingWaterfallHtml(timingReport),
		);
		timingVisualization = `runs/${runName}/${TIMING_WATERFALL_FILENAME}`;
	}
	copyFileIfPresent(manifestSource, path.join(runRoot, "manifest.json"));
	if (galleryResult?.exitCode === 0) {
		copyFileIfPresent(
			path.join(
				WORKSPACE_ROOT,
				"tests/e2e/screenshots/solvers/index.html",
			),
			path.join(runRoot, "gallery.html"),
		);
	}
	if (
		playwrightResult.exitCode !== 0 ||
		galleryResult?.exitCode !== 0 ||
		!baselinesUnchanged
	) {
		for (const directoryName of ["test-results", "playwright-report"]) {
			const source = path.join(WORKSPACE_ROOT, directoryName);
			if (fs.existsSync(source)) {
				fs.cpSync(source, path.join(runRoot, directoryName), {
					recursive: true,
				});
			}
		}
	}

	let artifactCount = 0;
	if (fs.existsSync(manifestSource)) {
		const manifest = JSON.parse(
			fs.readFileSync(manifestSource, "utf8"),
		) as { artifacts?: unknown[] };
		artifactCount = manifest.artifacts?.length ?? 0;
	}
	const record: BenchmarkRunRecord = {
		sequence,
		runDirectory: `runs/${runName}`,
		startedAt,
		configuration: {
			phase: configuration.phase,
			cycle: configuration.cycle,
			profile: configuration.profile,
			pageMode: configuration.pageMode,
		},
		commandWallMs: roundMilliseconds(commandWallMs),
		playwrightWallMs: roundMilliseconds(playwrightWallMs),
		galleryWallMs: roundMilliseconds(galleryWallMs),
		playwrightExitCode: playwrightResult.exitCode,
		galleryExitCode: galleryResult?.exitCode ?? null,
		baselinesUnchanged,
		artifactCount,
		timingReport: timingCopied ? `runs/${runName}/timings.json` : null,
		timingVisualization,
	};
	history.runs.push(record);
	writeJsonAtomically(historyPath, history);
	writeJsonAtomically(path.join(sessionRoot, "summary.json"), {
		version: 1,
		sessionId: configuration.sessionId,
		updatedAt: new Date().toISOString(),
		aggregates: createAggregates(history.runs),
	});
	writeJsonAtomically(path.join(runRoot, "run.json"), record);

	if (!baselinesUnchanged)
		throw new Error(
			"Read-only baseline inventory changed during benchmark",
		);
	if (!timingCopied)
		throw new Error("Visual suite did not produce timings.json");
	if (playwrightResult.exitCode !== 0)
		process.exitCode = playwrightResult.exitCode;
	else if (galleryResult?.exitCode !== 0)
		process.exitCode = galleryResult?.exitCode ?? 1;
}

await main();
