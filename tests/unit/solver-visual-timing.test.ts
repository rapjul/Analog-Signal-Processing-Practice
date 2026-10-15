import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	aggregateVisualTimingSamples,
	serializeVisualTimingReport,
	VisualTimingRecorder,
	type VisualTimingSample,
	writeVisualTimingReportAtomically,
} from "../e2e/solver-visual-timing";

describe("solver visual timing aggregation", () => {
	it("aggregates every phase and retains empty phase entries", () => {
		const samples: VisualTimingSample[] = [
			{
				sequence: 0,
				phase: "navigation",
				durationMs: 10,
				archetype: "odes-distinct",
			},
			{
				sequence: 1,
				phase: "navigation",
				durationMs: 20,
				archetype: "odes-distinct",
			},
			{
				sequence: 2,
				phase: "layout-stabilization",
				durationMs: 7.1254,
				archetype: "odes-distinct",
			},
		];

		const aggregate = aggregateVisualTimingSamples(samples);

		expect(aggregate.navigation).toEqual({
			sampleCount: 2,
			totalMs: 30,
			averageMs: 15,
			minMs: 10,
			maxMs: 20,
			percentageOfSuite: 0,
		});
		expect(aggregate["layout-stabilization"]).toEqual({
			sampleCount: 1,
			totalMs: 7.125,
			averageMs: 7.125,
			minMs: 7.125,
			maxMs: 7.125,
			percentageOfSuite: 0,
		});
		expect(aggregate["artifact-writing"]).toEqual({
			sampleCount: 0,
			totalMs: 0,
			averageMs: 0,
			minMs: 0,
			maxMs: 0,
			percentageOfSuite: 0,
		});
	});

	it("records sequential samples and rejects overlapping phases", async () => {
		const clockValues = [100, 112.5];
		const recorder = new VisualTimingRecorder(
			() => clockValues.shift() ?? 112.5,
		);
		let releaseOperation: (() => void) | undefined;
		const activeMeasurement = recorder.measure(
			"navigation",
			{ stateId: "milestone.initial" },
			() =>
				new Promise<void>((resolve) => {
					releaseOperation = resolve;
				}),
		);

		await expect(
			recorder.measure("state-preparation", {}, async () => undefined),
		).rejects.toThrow(
			"Visual timing phases cannot overlap: state-preparation started during navigation",
		);
		releaseOperation?.();
		await activeMeasurement;

		const report = recorder.createReport(
			{
				profile: "quick",
				pageMode: "isolated",
				artifactCount: 1,
				suiteElapsedMs: 20,
			},
			new Date("2026-08-18T12:00:00.000Z"),
		);
		expect(report.totals).toEqual({
			sampleCount: 1,
			suiteElapsedMs: 20,
			measuredMs: 12.5,
			unattributedMs: 7.5,
			measuredPercentage: 62.5,
		});
		expect(report.samples).toEqual([
			{
				sequence: 0,
				phase: "navigation",
				durationMs: 12.5,
				stateId: "milestone.initial",
			},
		]);
	});
});

describe("solver visual timing serialization", () => {
	it("serializes a deterministic, newline-terminated JSON report", async () => {
		const clockValues = [20, 24.25];
		const recorder = new VisualTimingRecorder(
			() => clockValues.shift() ?? 24.25,
		);
		await recorder.measure(
			"snapshot-comparison",
			{
				module: "odes",
				archetype: "odes-distinct",
				stateId: "step-1",
				theme: "dark",
				viewport: "desktop-1280x800",
			},
			async () => "captured",
		);
		const report = recorder.createReport(
			{
				profile: "full",
				pageMode: "reused",
				artifactCount: 408,
				suiteElapsedMs: 10,
			},
			new Date("2026-08-18T12:00:00.000Z"),
		);

		const serialized = serializeVisualTimingReport(report);

		expect(serialized).toBe(`${JSON.stringify(report, null, 2)}\n`);
		expect(serialized.endsWith("\n")).toBe(true);
		expect(JSON.parse(serialized)).toEqual(report);
		expect(Object.keys(JSON.parse(serialized).phases)).toEqual([
			"navigation",
			"state-preparation",
			"hint-reveal",
			"layout-stabilization",
			"snapshot-comparison",
			"artifact-writing",
		]);
	});

	/** File I/O latency is environmental; atomic contents and cleanup are the behavior under test. */
	it("atomically replaces the latest report without leaving temporary files", () => {
		const temporaryDirectory = fs.mkdtempSync(
			path.join(os.tmpdir(), "solver-visual-timing-"),
		);
		try {
			const destination = path.join(temporaryDirectory, "timings.json");
			const recorder = new VisualTimingRecorder(() => 0);
			const report = recorder.createReport(
				{
					profile: "dark",
					pageMode: "isolated",
					artifactCount: 342,
					suiteElapsedMs: 100,
				},
				new Date("2026-08-18T12:00:00.000Z"),
			);

			writeVisualTimingReportAtomically(destination, report);
			writeVisualTimingReportAtomically(destination, report);

			expect(JSON.parse(fs.readFileSync(destination, "utf8"))).toEqual(
				report,
			);
			expect(fs.readdirSync(temporaryDirectory)).toEqual([
				"timings.json",
			]);
		} finally {
			fs.rmSync(temporaryDirectory, { recursive: true, force: true });
		}
	}, 30000);
});
