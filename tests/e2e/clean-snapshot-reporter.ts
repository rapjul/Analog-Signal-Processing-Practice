import path from "node:path";
import type {
	FullConfig,
	FullResult,
	Reporter,
	Suite,
	TestCase,
	TestResult,
} from "@playwright/test/reporter";

/**
 * Parsed details from a single Playwright snapshot stdout message.
 */
export interface ParsedSnapshotEntry {
	/** Action taken on the snapshot (NEW or UPDATED). */
	action: "NEW" | "UPDATED";
	/** Module category (e.g., fourier-series, odes). */
	module: string;
	/** Problem archetype slug (e.g., fourier-series-sawtooth-wave). */
	archetype: string;
	/** Human-readable formatted step/milestone label. */
	stepLabel: string;
	/** Raw step identifier slug before formatting. */
	rawState: string;
	/** Theme identifier (dark or light). */
	theme: string;
	/** Human-readable formatted viewport name with dimensions. */
	viewportLabel: string;
	/** Raw viewport slug before formatting. */
	rawViewport: string;
	/** Relative path from solver-visual-baselines or repo root. */
	relativePath: string;
}

/** ANSI styling escape sequences for terminal formatting. */
const ANSI = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32;1m",
	cyan: "\x1b[36;1m",
	yellow: "\x1b[33;1m",
	magenta: "\x1b[35;1m",
	blue: "\x1b[34;1m",
	gray: "\x1b[90m",
} as const;

/**
 * Regular expressions matching Playwright's built-in snapshot matcher stdout lines.
 */
const SNAPSHOT_PATTERNS = [
	{
		regex: /A snapshot doesn't exist at (.+?), writing actual\.?/i,
		action: "NEW" as const,
	},
	{
		regex: /(.+?) is re-generated, writing actual\.?/i,
		action: "UPDATED" as const,
	},
	{
		regex: /(.+?) is not the same, writing actual\.?/i,
		action: "UPDATED" as const,
	},
	{
		regex: /(.+?) does not match, writing actual\.?/i,
		action: "UPDATED" as const,
	},
	{
		regex: /(.+?) running with --update-snapshots, writing actual\.?/i,
		action: "UPDATED" as const,
	},
] as const;

/**
 * Converts a raw state or milestone string into a human-friendly label.
 *
 * @param rawState - Raw state identifier (e.g. `fourier.step-02.symmetry.misconception.hints`).
 * @returns Human-readable label (e.g. `Step 02: Symmetry Misconception (hints)`).
 */
export function formatStateName(rawState: string): string {
	// Handle milestone captures
	if (rawState.startsWith("milestone.")) {
		const milestoneType = rawState.replace("milestone.", "");
		const capitalized =
			milestoneType.charAt(0).toUpperCase() + milestoneType.slice(1);
		return `Milestone: ${capitalized}`;
	}

	// Handle step-based captures
	const stepMatch = rawState.match(/(?:^|[._-])step-(\d+)(?:\.(.+))?$/i);
	if (stepMatch) {
		const stepNum = stepMatch[1];
		const subState = stepMatch[2] ?? "";

		if (!subState) {
			return `Step ${stepNum}`;
		}

		let isHints = false;
		let cleanSubState = subState;
		if (
			cleanSubState.endsWith(".hints") ||
			cleanSubState.endsWith("-hints")
		) {
			isHints = true;
			cleanSubState = cleanSubState.replace(/[.-]hints$/, "");
		}

		// Convert dot/kebab separators to words and capitalize
		const titleWords = cleanSubState
			.split(/[.-]/)
			.filter((word) => word.length > 0)
			.map((word) => {
				const lower = word.toLowerCase();
				switch (lower) {
					case "ode":
					case "odes":
						return "ODE";
					case "ctft":
						return "CTFT";
					case "rlc":
						return "RLC";
					case "pfd":
						return "PFD";
					default:
						return word.charAt(0).toUpperCase() + word.slice(1);
				}
			});

		let title = titleWords.join(" ");
		// Polish common phrases
		title = title
			.replace(/Zero Input State/i, "Zero-Input State")
			.replace(/Zero State/i, "Zero-State")
			.replace(/Transient Steady State/i, "Transient & Steady-State")
			.replace(/Strategy Gate/i, "Strategy Gate");

		return `Step ${stepNum}: ${title}${isHints ? " (hints)" : ""}`;
	}

	// Fallback general cleanup
	return rawState
		.split(/[._-]/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

/**
 * Converts a raw viewport slug into a human-friendly label with dimensions.
 *
 * @param rawViewport - Raw viewport string (e.g. `desktop-1280x800`).
 * @returns Human-readable viewport label (e.g. `Desktop (1280×800)`).
 */
export function formatViewport(rawViewport: string): string {
	const vpMatch = rawViewport.match(/^([a-zA-Z-]+)-(\d+)x(\d+)$/);
	if (!vpMatch) {
		return rawViewport;
	}

	const [, namePart, width, height] = vpMatch;
	const formattedName = namePart
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");

	return `${formattedName} (${width}×${height})`;
}

/**
 * Attempts to parse a Playwright snapshot stdout line into structured metadata.
 *
 * @param line - Single stdout line from Playwright test execution.
 * @returns Parsed snapshot entry or null if the line is not a snapshot message.
 */
export function parseSnapshotMessage(line: string): ParsedSnapshotEntry | null {
	const trimmed = line.trim();
	if (!trimmed) {
		return null;
	}

	for (const pattern of SNAPSHOT_PATTERNS) {
		const match = trimmed.match(pattern.regex);
		if (match) {
			const fullPath = match[1].trim();

			// Extract path relative to solver-visual-baselines
			const marker = "solver-visual-baselines/";
			const markerIndex = fullPath.indexOf(marker);
			let relPath =
				markerIndex !== -1
					? fullPath.slice(markerIndex + marker.length)
					: path.basename(fullPath);

			const parts = relPath.split("/").filter((p) => p.length > 0);
			let module = "solver";
			let archetype = "archetype";
			let filename = parts[parts.length - 1] ?? "";

			if (parts.length >= 3) {
				module = parts[parts.length - 3];
				archetype = parts[parts.length - 2];
				filename = parts[parts.length - 1];
			} else if (parts.length === 2) {
				archetype = parts[0];
				filename = parts[1];
			}

			// Remove .png extension
			const nameWithoutExt = filename.replace(/\.png$/i, "");
			const splitChunks = nameWithoutExt.split("__");

			const rawState = splitChunks[0] ?? nameWithoutExt;
			const theme = splitChunks[1] ?? "dark";
			const rawViewport = splitChunks[2] ?? "default";

			return {
				action: pattern.action,
				module,
				archetype,
				stepLabel: formatStateName(rawState),
				rawState,
				theme,
				viewportLabel: formatViewport(rawViewport),
				rawViewport,
				relativePath: relPath,
			};
		}
	}

	return null;
}

/**
 * Custom Playwright Reporter for SignalLab that formats snapshot operations
 * into a hierarchical tree display with human-readable labels and ANSI colors.
 */
export default class CleanSnapshotReporter implements Reporter {
	private addedCount = 0;
	private updatedCount = 0;
	private lastArchetypeKey: string | null = null;
	private lastStepKey: string | null = null;
	private stdoutBuffer = "";

	/**
	 * Called once before running tests.
	 *
	 * @param _config - Resolved full configuration.
	 * @param _suite - The root test suite.
	 */
	onBegin(_config: FullConfig, _suite: Suite): void {
		this.addedCount = 0;
		this.updatedCount = 0;
		this.lastArchetypeKey = null;
		this.lastStepKey = null;
		this.stdoutBuffer = "";
	}

	/**
	 * Intercepts stdout chunks and formats snapshot matcher lines into a clean tree view.
	 *
	 * @param chunk - Raw stdout stream chunk.
	 * @param _test - Associated test case if applicable.
	 * @param _result - Current test result if applicable.
	 */
	onStdOut(
		chunk: string | Buffer,
		_test?: TestCase,
		_result?: TestResult,
	): void {
		const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
		this.stdoutBuffer += text;

		const lines = this.stdoutBuffer.split("\n");
		// Retain trailing partial line in buffer
		this.stdoutBuffer = lines.pop() ?? "";

		for (const line of lines) {
			this.processLine(line);
		}
	}

	/**
	 * Passes through standard error messages unchanged.
	 *
	 * @param chunk - Raw stderr stream chunk.
	 * @param _test - Associated test case if applicable.
	 * @param _result - Current test result if applicable.
	 */
	onStdErr(
		chunk: string | Buffer,
		_test?: TestCase,
		_result?: TestResult,
	): void {
		const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
		process.stderr.write(text);
	}

	/**
	 * Processes a single stdout line, either formatting snapshot activity or streaming as-is.
	 *
	 * @param line - Single text line from stdout.
	 */
	private processLine(line: string): void {
		const parsed = parseSnapshotMessage(line);
		if (!parsed) {
			// Normal stdout - print transparently if non-empty
			if (line.trim().length > 0) {
				process.stdout.write(`${line}\n`);
			}
			return;
		}

		if (parsed.action === "NEW") {
			this.addedCount++;
		} else {
			this.updatedCount++;
		}

		const currentArchetypeKey = `${parsed.module}/${parsed.archetype}`;
		const currentStepKey = `${currentArchetypeKey}/${parsed.stepLabel}`;

		// Print archetype header if changed
		if (this.lastArchetypeKey !== currentArchetypeKey) {
			this.lastArchetypeKey = currentArchetypeKey;
			this.lastStepKey = null;
			process.stdout.write(
				`\n📁 ${ANSI.cyan}${parsed.module}${ANSI.reset} › ${ANSI.bold}${parsed.archetype}${ANSI.reset}\n`,
			);
		}

		// Print step branch header if changed
		if (this.lastStepKey !== currentStepKey) {
			this.lastStepKey = currentStepKey;
			process.stdout.write(
				`   ├─ ${ANSI.bold}${parsed.stepLabel}${ANSI.reset}\n`,
			);
		}

		// Print snapshot entry line
		const badge =
			parsed.action === "NEW"
				? `${ANSI.green}[NEW]    ${ANSI.reset}`
				: `${ANSI.cyan}[UPDATED]${ANSI.reset}`;

		process.stdout.write(
			`   │  ├─ ${badge} ${parsed.theme} ${ANSI.gray}│${ANSI.reset} ${ANSI.gray}${parsed.viewportLabel}${ANSI.reset}\n`,
		);
	}

	/**
	 * Called after each test completes. Logs any unexpected failures or errors.
	 *
	 * @param test - Completed test case.
	 * @param result - Test execution result.
	 */
	onTestEnd(test: TestCase, result: TestResult): void {
		if (result.status === "failed" || result.status === "timedOut") {
			process.stderr.write(`\n\x1b[31;1m✖ [FAIL] ${test.title}\x1b[0m\n`);
			if (result.error?.message) {
				process.stderr.write(
					`  \x1b[31m${result.error.message}\x1b[0m\n`,
				);
			}
			if (result.error?.stack) {
				process.stderr.write(
					`  \x1b[90m${result.error.stack}\x1b[0m\n`,
				);
			}
		}
	}

	/**
	 * Called after all tests have completed to render a summary banner.
	 *
	 * @param _result - Full test run result.
	 */
	onEnd(_result: FullResult): void {
		// Flush any remaining buffered line
		if (this.stdoutBuffer.trim().length > 0) {
			this.processLine(this.stdoutBuffer);
			this.stdoutBuffer = "";
		}

		const total = this.addedCount + this.updatedCount;
		if (total > 0) {
			process.stdout.write(
				`\n${ANSI.gray}─────────────────────────────────────────────────────────────${ANSI.reset}\n`,
			);
			process.stdout.write(
				`📸 ${ANSI.bold}Snapshot Activity:${ANSI.reset} ${ANSI.green}${this.addedCount} added${ANSI.reset}, ${ANSI.cyan}${this.updatedCount} updated${ANSI.reset} ${ANSI.gray}(${total} total captures)${ANSI.reset}\n`,
			);
			process.stdout.write(
				`${ANSI.gray}─────────────────────────────────────────────────────────────${ANSI.reset}\n\n`,
			);
		}
	}
}
