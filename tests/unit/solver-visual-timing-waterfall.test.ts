import { describe, expect, it } from "vitest";
import {
	escapeTimingWaterfallHtml,
	renderTimingWaterfallHtml,
} from "../../scripts/solver-visual-timing-waterfall";
import {
	aggregateVisualTimingSamples,
	type VisualTimingReport,
	type VisualTimingSample,
} from "../e2e/solver-visual-timing";

/**
 * Creates a complete timing report fixture from a focused sample list.
 *
 * @param samples - Sequential samples included in the fixture.
 * @param suiteElapsedMs - Complete suite duration.
 * @returns Rendering-ready timing report.
 */
function createReport(
	samples: VisualTimingSample[],
	suiteElapsedMs: number,
): VisualTimingReport {
	const measuredMs = samples.reduce(
		(total, sample) => total + sample.durationMs,
		0,
	);
	const unattributedMs = Math.max(0, suiteElapsedMs - measuredMs);
	return {
		version: 2,
		generatedAt: "2026-08-18T12:00:00.000Z",
		run: { profile: "quick", pageMode: "reused", artifactCount: 2 },
		totals: {
			sampleCount: samples.length,
			suiteElapsedMs,
			measuredMs,
			unattributedMs,
			measuredPercentage:
				suiteElapsedMs > 0 ? (measuredMs / suiteElapsedMs) * 100 : 0,
		},
		phases: aggregateVisualTimingSamples(samples, suiteElapsedMs),
		samples,
	};
}

describe("solver visual timing waterfall rendering", () => {
	it("renders ordered samples, phase colors, metadata, and run totals", () => {
		const report = createReport(
			[
				{
					sequence: 1,
					phase: "snapshot-comparison",
					durationMs: 7.5,
					stateId: "step-2",
					detail: "state",
				},
				{
					sequence: 0,
					phase: "navigation",
					durationMs: 12.5,
					module: "odes",
					archetype: "odes-distinct",
					stateId: "milestone.initial",
					theme: "dark",
					viewport: "desktop-1280x800",
				},
			],
			25,
		);

		const html = renderTimingWaterfallHtml(report);

		expect(html).toContain(
			"This is a sequential wall-time waterfall, not a CPU stack flame graph.",
		);
		expect(html).toContain(
			'data-sequence="0" data-start-ms="0.000" data-duration-ms="12.500"',
		);
		expect(html).toContain(
			'data-sequence="1" data-start-ms="12.500" data-duration-ms="7.500"',
		);
		expect(html).toContain("--sample-color: #38bdf8");
		expect(html).toContain("--sample-color: #fbbf24");
		expect(html).toContain("Archetype: odes-distinct");
		expect(html).toContain("Suite/unattributed 20.0%");
		expect(html).toContain("25.000 ms");
		expect(html).toContain("Phase aggregates");
	});

	it("escapes report metadata in text and tooltip attributes", () => {
		const unsafe = "<script>alert(\"timing\")</script> & 'metadata'";
		const report = createReport(
			[
				{
					sequence: 0,
					phase: "state-preparation",
					durationMs: 1,
					archetype: unsafe,
					detail: unsafe,
				},
			],
			2,
		);

		const html = renderTimingWaterfallHtml(report);

		expect(escapeTimingWaterfallHtml(unsafe)).toBe(
			"&lt;script&gt;alert(&quot;timing&quot;)&lt;/script&gt; &amp; &#39;metadata&#39;",
		);
		expect(html).not.toContain("<script>alert");
		expect(html).toContain(
			"Archetype: &lt;script&gt;alert(&quot;timing&quot;)&lt;/script&gt; &amp; &#39;metadata&#39;",
		);
	});

	it("renders an explicit empty state without invalid numeric output", () => {
		const html = renderTimingWaterfallHtml(createReport([], 0));

		expect(html).toContain(
			"No sequential timing samples were recorded for this run.",
		);
		expect(html).not.toContain('class="sample"');
		expect(html).not.toMatch(/NaN|Infinity/);
		expect(html).toContain("Suite/unattributed 100.0%");
		expect(html).toContain("Artifact writing");
	});
});
