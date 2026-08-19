import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

/** Ordered timing phases emitted by the solver visual suite. */
export const VISUAL_TIMING_PHASES = [
	"navigation",
	"state-preparation",
	"hint-reveal",
	"layout-stabilization",
	"snapshot-comparison",
	"artifact-writing",
] as const;

/** A non-overlapping operation category measured by the solver visual suite. */
export type VisualTimingPhase = (typeof VISUAL_TIMING_PHASES)[number];

/** Identifying metadata attached to one measured visual-suite operation. */
export interface VisualTimingContext {
	/** Solver module containing the measured operation. */
	module?: string;
	/** Stable solver archetype slug containing the measured operation. */
	archetype?: string;
	/** Stable visual state or milestone identifier. */
	stateId?: string;
	/** Active visual theme. */
	theme?: string;
	/** Active viewport profile name. */
	viewport?: string;
	/** Optional detail distinguishing repeated operations for the same state. */
	detail?: string;
}

/** One completed timing measurement. */
export interface VisualTimingSample extends VisualTimingContext {
	/** Zero-based sequence number preserving measurement order. */
	sequence: number;
	/** Phase measured by this sample. */
	phase: VisualTimingPhase;
	/** Elapsed wall-clock duration in milliseconds. */
	durationMs: number;
}

/** Aggregated duration statistics for one timing phase. */
export interface VisualTimingAggregate {
	/** Number of samples included in the aggregate. */
	sampleCount: number;
	/** Sum of sample durations in milliseconds. */
	totalMs: number;
	/** Arithmetic mean sample duration in milliseconds. */
	averageMs: number;
	/** Shortest sample duration in milliseconds. */
	minMs: number;
	/** Longest sample duration in milliseconds. */
	maxMs: number;
	/** Percentage of complete suite wall time attributed to this phase. */
	percentageOfSuite: number;
}

/** Metadata identifying the capture configuration for one timing report. */
export interface VisualTimingRunMetadata {
	/** Requested capture profile. */
	profile: "quick" | "dark" | "full";
	/** Page lifecycle implementation used for the run. */
	pageMode: "isolated" | "reused";
	/** Number of inspection artifacts recorded in the manifest. */
	artifactCount: number;
	/** Complete suite wall time measured with a monotonic clock. */
	suiteElapsedMs: number;
}

/** Complete serializable timing report for one solver visual-suite run. */
export interface VisualTimingReport {
	/** Timing report schema version. */
	version: 2;
	/** ISO-8601 timestamp generated after the visual suite completes. */
	generatedAt: string;
	/** Capture configuration for this run. */
	run: Omit<VisualTimingRunMetadata, "suiteElapsedMs">;
	/** Totals across every measured phase and the complete suite. */
	totals: {
		/** Number of completed timing samples. */
		sampleCount: number;
		/** Complete suite wall time in milliseconds. */
		suiteElapsedMs: number;
		/** Sum of all explicitly measured durations in milliseconds. */
		measuredMs: number;
		/** Suite time outside explicitly measured phases. */
		unattributedMs: number;
		/** Percentage of suite wall time covered by measured phases. */
		measuredPercentage: number;
	};
	/** Per-phase aggregates in the canonical phase order. */
	phases: Record<VisualTimingPhase, VisualTimingAggregate>;
	/** Individual measurements in execution order. */
	samples: VisualTimingSample[];
}

/** Monotonic clock function returning milliseconds. */
export type VisualTimingClock = () => number;

/** Asynchronous operation measured by the timing recorder. */
export type VisualTimingOperation<Result> = () => Promise<Result>;

/**
 * Rounds a duration to microsecond precision while keeping millisecond units.
 *
 * @param durationMs - Raw duration in milliseconds.
 * @returns Duration rounded to three decimal places.
 */
function roundDuration(durationMs: number): number {
	return Math.round(durationMs * 1_000) / 1_000;
}

/**
 * Creates a zero-valued phase aggregate.
 *
 * @returns Empty aggregate suitable for a phase without samples.
 */
function createEmptyAggregate(): VisualTimingAggregate {
	return {
		sampleCount: 0,
		totalMs: 0,
		averageMs: 0,
		minMs: 0,
		maxMs: 0,
		percentageOfSuite: 0,
	};
}

/**
 * Validates a measured duration before it enters an aggregate.
 *
 * @param durationMs - Duration to validate in milliseconds.
 * @throws {Error} When the duration is negative or not finite.
 */
function assertValidDuration(durationMs: number): void {
	if (!Number.isFinite(durationMs) || durationMs < 0) {
		throw new Error(
			`Visual timing duration must be finite and non-negative: ${durationMs}`,
		);
	}
}

/**
 * Aggregates timing samples into deterministic per-phase statistics.
 * Phases without samples remain present with zero-valued statistics.
 *
 * @param samples - Completed timing samples to aggregate.
 * @returns Per-phase timing statistics in canonical phase order.
 */
export function aggregateVisualTimingSamples(
	samples: readonly VisualTimingSample[],
	suiteElapsedMs = 0,
): Record<VisualTimingPhase, VisualTimingAggregate> {
	const durationsByPhase = new Map<VisualTimingPhase, number[]>(
		VISUAL_TIMING_PHASES.map((phase) => [phase, []]),
	);
	for (const sample of samples) {
		assertValidDuration(sample.durationMs);
		durationsByPhase.get(sample.phase)?.push(sample.durationMs);
	}

	return Object.fromEntries(
		VISUAL_TIMING_PHASES.map((phase) => {
			const durations = durationsByPhase.get(phase) ?? [];
			if (durations.length === 0) return [phase, createEmptyAggregate()];
			const totalMs = durations.reduce(
				(total, durationMs) => total + durationMs,
				0,
			);
			return [
				phase,
				{
					sampleCount: durations.length,
					totalMs: roundDuration(totalMs),
					averageMs: roundDuration(totalMs / durations.length),
					minMs: roundDuration(Math.min(...durations)),
					maxMs: roundDuration(Math.max(...durations)),
					percentageOfSuite:
						suiteElapsedMs > 0
							? roundDuration((totalMs / suiteElapsedMs) * 100)
							: 0,
				},
			];
		}),
	) as Record<VisualTimingPhase, VisualTimingAggregate>;
}

/** Records sequential, non-overlapping visual-suite timing samples. */
export class VisualTimingRecorder {
	/** Monotonic time source used by measurements. */
	readonly #clock: VisualTimingClock;
	/** Completed measurements in execution order. */
	readonly #samples: VisualTimingSample[] = [];
	/** Phase currently being measured, if any. */
	#activePhase: VisualTimingPhase | undefined;

	/**
	 * Creates a visual timing recorder.
	 *
	 * @param clock - Injectable monotonic clock used for deterministic tests.
	 */
	constructor(clock: VisualTimingClock = () => performance.now()) {
		this.#clock = clock;
	}

	/**
	 * Measures one asynchronous operation and records it even when it throws.
	 * A second measurement cannot begin until the active operation settles.
	 *
	 * @param phase - Phase assigned to the operation.
	 * @param context - Identifying metadata for the measurement.
	 * @param operation - Asynchronous operation to execute and measure.
	 * @returns The operation result.
	 * @throws {Error} When another timing phase is already active.
	 */
	async measure<Result>(
		phase: VisualTimingPhase,
		context: VisualTimingContext,
		operation: VisualTimingOperation<Result>,
	): Promise<Result> {
		if (this.#activePhase) {
			throw new Error(
				`Visual timing phases cannot overlap: ${phase} started during ${this.#activePhase}`,
			);
		}

		this.#activePhase = phase;
		const startedAt = this.#clock();
		try {
			return await operation();
		} finally {
			const durationMs = Math.max(0, this.#clock() - startedAt);
			this.#samples.push({
				...context,
				sequence: this.#samples.length,
				phase,
				durationMs: roundDuration(durationMs),
			});
			this.#activePhase = undefined;
		}
	}

	/**
	 * Builds an immutable-by-copy report from completed measurements.
	 *
	 * @param metadata - Capture configuration and complete suite wall time.
	 * @param generatedAt - Report generation time.
	 * @returns Serializable timing report.
	 */
	createReport(
		metadata: VisualTimingRunMetadata,
		generatedAt: Date = new Date(),
	): VisualTimingReport {
		const samples = this.#samples.map((sample) => ({ ...sample }));
		assertValidDuration(metadata.suiteElapsedMs);
		const measuredMs = samples.reduce(
			(total, sample) => total + sample.durationMs,
			0,
		);
		const suiteElapsedMs = roundDuration(metadata.suiteElapsedMs);
		const unattributedMs = roundDuration(
			Math.max(0, suiteElapsedMs - measuredMs),
		);
		return {
			version: 2,
			generatedAt: generatedAt.toISOString(),
			run: {
				profile: metadata.profile,
				pageMode: metadata.pageMode,
				artifactCount: metadata.artifactCount,
			},
			totals: {
				sampleCount: samples.length,
				suiteElapsedMs,
				measuredMs: roundDuration(measuredMs),
				unattributedMs,
				measuredPercentage:
					suiteElapsedMs > 0
						? roundDuration((measuredMs / suiteElapsedMs) * 100)
						: 0,
			},
			phases: aggregateVisualTimingSamples(samples, suiteElapsedMs),
			samples,
		};
	}
}

/**
 * Serializes a timing report as stable, human-readable JSON.
 *
 * @param report - Timing report to serialize.
 * @returns Indented JSON ending with one newline.
 */
export function serializeVisualTimingReport(
	report: VisualTimingReport,
): string {
	return `${JSON.stringify(report, null, 2)}\n`;
}

/**
 * Atomically writes a timing report by renaming a temporary sibling file.
 *
 * @param destination - Final timing report path.
 * @param report - Timing report to write.
 * @throws {Error} When the temporary write or atomic rename fails.
 */
export function writeVisualTimingReportAtomically(
	destination: string,
	report: VisualTimingReport,
): void {
	const directory = path.dirname(destination);
	const temporaryPath = path.join(
		directory,
		`.${path.basename(destination)}.${process.pid}.${randomUUID()}.tmp`,
	);
	fs.mkdirSync(directory, { recursive: true });
	try {
		fs.writeFileSync(temporaryPath, serializeVisualTimingReport(report), {
			encoding: "utf8",
			flag: "wx",
		});
		fs.renameSync(temporaryPath, destination);
	} catch (error) {
		fs.rmSync(temporaryPath, { force: true });
		throw error;
	}
}
