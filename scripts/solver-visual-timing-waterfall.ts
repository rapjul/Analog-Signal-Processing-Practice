import {
	VISUAL_TIMING_PHASES,
	type VisualTimingPhase,
	type VisualTimingReport,
	type VisualTimingSample,
} from "../tests/e2e/solver-visual-timing.ts";

/** Display properties for one measured timing phase. */
interface PhasePresentation {
	/** Human-readable phase name. */
	label: string;
	/** High-contrast chart color. */
	color: string;
}

/** One sample positioned on the cumulative measured-time axis. */
interface PositionedTimingSample {
	/** Original timing sample. */
	sample: VisualTimingSample;
	/** Cumulative measured time before the sample begins. */
	startMs: number;
	/** Cumulative measured time when the sample ends. */
	endMs: number;
}

/** Stable output filename archived beside each run's timings JSON. */
export const TIMING_WATERFALL_FILENAME = "timing-waterfall.html";

/** Canonical label and color for every visual timing phase. */
const PHASE_PRESENTATION: Record<VisualTimingPhase, PhasePresentation> = {
	navigation: { label: "Navigation", color: "#38bdf8" },
	"state-preparation": { label: "State preparation", color: "#a78bfa" },
	"hint-reveal": { label: "Hint reveal", color: "#f472b6" },
	"layout-stabilization": {
		label: "Layout stabilization",
		color: "#34d399",
	},
	"snapshot-comparison": {
		label: "Snapshot comparison",
		color: "#fbbf24",
	},
	"artifact-writing": { label: "Artifact writing", color: "#fb7185" },
};

/** HTML character replacements used for text and attribute values. */
const HTML_REPLACEMENTS: Readonly<Record<string, string>> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

/**
 * Escapes untrusted text for inclusion in HTML text or quoted attributes.
 *
 * @param value - Text to escape.
 * @returns HTML-safe text.
 */
export function escapeTimingWaterfallHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(character) => HTML_REPLACEMENTS[character] ?? "",
	);
}

/**
 * Formats a millisecond duration for human-readable report output.
 *
 * @param durationMs - Duration in milliseconds.
 * @returns Locale-independent duration label.
 */
function formatDuration(durationMs: number): string {
	const fractionDigits = durationMs >= 1_000 ? 1 : 3;
	return `${durationMs.toFixed(fractionDigits)} ms`;
}

/**
 * Formats a percentage for human-readable report output.
 *
 * @param percentage - Percentage value.
 * @returns Percentage label with one fractional digit.
 */
function formatPercentage(percentage: number): string {
	return `${percentage.toFixed(1)}%`;
}

/**
 * Constrains a percentage to a valid CSS width.
 *
 * @param percentage - Candidate percentage.
 * @returns Finite value from zero through one hundred.
 */
function clampPercentage(percentage: number): number {
	if (!Number.isFinite(percentage)) return 0;
	return Math.min(100, Math.max(0, percentage));
}

/**
 * Sorts samples by sequence and assigns cumulative measured-time positions.
 * The source report contains durations rather than absolute timestamps, so no
 * unmeasured gaps are invented between samples.
 *
 * @param samples - Sequential, non-overlapping timing samples.
 * @returns Samples positioned on the measured-time axis.
 */
function positionSamples(
	samples: readonly VisualTimingSample[],
): PositionedTimingSample[] {
	let elapsedMs = 0;
	return [...samples]
		.sort((left, right) => left.sequence - right.sequence)
		.map((sample) => {
			const startMs = elapsedMs;
			elapsedMs += sample.durationMs;
			return { sample, startMs, endMs: elapsedMs };
		});
}

/**
 * Creates the metadata shown by a sample's native hover/focus tooltip.
 *
 * @param positioned - Sample and cumulative measured-time position.
 * @returns Multi-line tooltip text.
 */
function createSampleTooltip(positioned: PositionedTimingSample): string {
	const { sample, startMs, endMs } = positioned;
	const presentation = PHASE_PRESENTATION[sample.phase];
	const lines = [
		`Sample ${sample.sequence}`,
		`Phase: ${presentation.label}`,
		`Duration: ${formatDuration(sample.durationMs)}`,
		`Measured range: ${formatDuration(startMs)} - ${formatDuration(endMs)}`,
	];
	const metadata: Array<[string, string | undefined]> = [
		["Module", sample.module],
		["Archetype", sample.archetype],
		["State", sample.stateId],
		["Theme", sample.theme],
		["Viewport", sample.viewport],
		["Detail", sample.detail],
	];
	for (const [label, value] of metadata) {
		if (value !== undefined) lines.push(`${label}: ${value}`);
	}
	return lines.join("\n");
}

/**
 * Renders the sequential sample strip or a clear empty-data state.
 *
 * @param report - Complete visual timing report.
 * @returns HTML for the sample chart.
 */
function renderSampleChart(report: VisualTimingReport): string {
	const positionedSamples = positionSamples(report.samples);
	if (positionedSamples.length === 0) {
		return '<div class="empty-state">No sequential timing samples were recorded for this run.</div>';
	}

	const measuredMs = Math.max(
		1,
		positionedSamples.at(-1)?.endMs ?? report.totals.measuredMs,
	);
	const bars = positionedSamples
		.map((positioned) => {
			const { sample, startMs } = positioned;
			const presentation = PHASE_PRESENTATION[sample.phase];
			const widthPercentage = (sample.durationMs / measuredMs) * 100;
			const tooltip = escapeTimingWaterfallHtml(
				createSampleTooltip(positioned),
			);
			return `<span class="sample" tabindex="0" data-sequence="${sample.sequence}" data-start-ms="${startMs.toFixed(3)}" data-duration-ms="${sample.durationMs.toFixed(3)}" style="--sample-color: ${presentation.color}; --sample-width: ${widthPercentage.toFixed(6)}%;" title="${tooltip}" aria-label="${tooltip}"></span>`;
		})
		.join("\n");
	return `<div class="sample-chart" aria-label="Sequential measured timing samples">${bars}</div>`;
}

/**
 * Renders the phase legend and aggregate statistics table.
 *
 * @param report - Complete visual timing report.
 * @returns HTML for aggregate phase totals.
 */
function renderPhaseAggregates(report: VisualTimingReport): string {
	const rows = VISUAL_TIMING_PHASES.map((phase) => {
		const aggregate = report.phases[phase];
		const presentation = PHASE_PRESENTATION[phase];
		return `<tr>
		<td><span class="swatch" style="--phase-color: ${presentation.color}"></span>${escapeTimingWaterfallHtml(presentation.label)}</td>
		<td>${aggregate.sampleCount}</td>
		<td>${escapeTimingWaterfallHtml(formatDuration(aggregate.totalMs))}</td>
		<td>${escapeTimingWaterfallHtml(formatDuration(aggregate.averageMs))}</td>
		<td>${escapeTimingWaterfallHtml(formatDuration(aggregate.minMs))}</td>
		<td>${escapeTimingWaterfallHtml(formatDuration(aggregate.maxMs))}</td>
		<td>${escapeTimingWaterfallHtml(formatPercentage(aggregate.percentageOfSuite))}</td>
	</tr>`;
	}).join("\n");
	return `<div class="table-wrap">
	<table>
		<thead><tr><th>Phase</th><th>Samples</th><th>Total</th><th>Average</th><th>Minimum</th><th>Maximum</th><th>Suite</th></tr></thead>
		<tbody>${rows}</tbody>
	</table>
</div>`;
}

/**
 * Produces a self-contained per-run timing waterfall document.
 *
 * @param report - Parsed contents of one archived timings JSON report.
 * @returns Complete standalone HTML document.
 */
export function renderTimingWaterfallHtml(report: VisualTimingReport): string {
	const measuredPercentage = clampPercentage(
		report.totals.measuredPercentage,
	);
	const unattributedPercentage = clampPercentage(100 - measuredPercentage);
	const profile = escapeTimingWaterfallHtml(report.run.profile);
	const pageMode = escapeTimingWaterfallHtml(report.run.pageMode);
	const generatedAt = escapeTimingWaterfallHtml(report.generatedAt);
	const sampleChart = renderSampleChart(report);
	const aggregateTable = renderPhaseAggregates(report);

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Solver visual timing waterfall</title>
	<style>
		:root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #07111f; color: #e5edf7; }
		* { box-sizing: border-box; }
		body { margin: 0; padding: 2rem; background: #07111f; }
		main { max-width: 1200px; margin: 0 auto; }
		h1, h2 { margin: 0; color: #f8fafc; }
		h1 { font-size: clamp(1.6rem, 4vw, 2.4rem); }
		h2 { margin-bottom: 1rem; font-size: 1.15rem; }
		p { line-height: 1.6; color: #aebed1; }
		.meta { margin: .4rem 0 1.5rem; }
		.panel { margin-top: 1.25rem; padding: 1.25rem; border: 1px solid #24364b; border-radius: .8rem; background: #0d1a2b; box-shadow: 0 16px 40px rgba(0, 0, 0, .2); }
		.metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .75rem; }
		.metric { padding: .9rem; border: 1px solid #24364b; border-radius: .6rem; background: #111f32; }
		.metric-label { display: block; color: #8fa3b9; font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; }
		.metric-value { display: block; margin-top: .35rem; color: #f8fafc; font-size: 1.15rem; font-variant-numeric: tabular-nums; }
		.composition, .sample-chart { display: flex; width: 100%; overflow: hidden; border-radius: .4rem; background: #1d2b3d; }
		.composition { height: 1.25rem; margin-top: 1rem; }
		.measured { width: var(--measured-width); background: #22c55e; }
		.unattributed { width: var(--unattributed-width); background: #64748b; }
		.composition-labels { display: flex; justify-content: space-between; gap: 1rem; margin-top: .5rem; color: #aebed1; font-size: .85rem; }
		.sample-chart { min-width: 42rem; height: 5rem; align-items: stretch; }
		.chart-scroll { overflow-x: auto; padding-bottom: .4rem; }
		.sample { flex: 0 0 var(--sample-width); min-width: 2px; background: var(--sample-color); border-right: 1px solid rgba(7, 17, 31, .35); outline-offset: -3px; }
		.sample:hover, .sample:focus-visible { filter: brightness(1.35); outline: 2px solid #f8fafc; z-index: 1; }
		.empty-state { padding: 2rem; border: 1px dashed #41546b; border-radius: .6rem; color: #aebed1; text-align: center; }
		.note { margin: 0 0 1rem; font-size: .9rem; }
		.table-wrap { overflow-x: auto; }
		table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
		th, td { padding: .7rem .8rem; border-bottom: 1px solid #24364b; text-align: right; white-space: nowrap; }
		th { color: #8fa3b9; font-size: .75rem; letter-spacing: .04em; text-transform: uppercase; }
		th:first-child, td:first-child { text-align: left; }
		.swatch { display: inline-block; width: .75rem; height: .75rem; margin-right: .55rem; border-radius: .2rem; background: var(--phase-color); vertical-align: -.05rem; }
		@media (max-width: 600px) { body { padding: 1rem; } .panel { padding: 1rem; } .composition-labels { flex-direction: column; gap: .2rem; } }
	</style>
</head>
<body>
	<main>
		<h1>Solver visual timing waterfall</h1>
		<p class="meta">Profile: ${profile} | Page mode: ${pageMode} | Generated: ${generatedAt}</p>
		<section class="panel" aria-labelledby="totals-heading">
			<h2 id="totals-heading">Run totals</h2>
			<div class="metrics">
				<div class="metric"><span class="metric-label">Suite elapsed</span><span class="metric-value">${escapeTimingWaterfallHtml(formatDuration(report.totals.suiteElapsedMs))}</span></div>
				<div class="metric"><span class="metric-label">Measured phases</span><span class="metric-value">${escapeTimingWaterfallHtml(formatDuration(report.totals.measuredMs))}</span></div>
				<div class="metric"><span class="metric-label">Unattributed</span><span class="metric-value">${escapeTimingWaterfallHtml(formatDuration(report.totals.unattributedMs))}</span></div>
				<div class="metric"><span class="metric-label">Samples</span><span class="metric-value">${report.totals.sampleCount}</span></div>
				<div class="metric"><span class="metric-label">Artifacts</span><span class="metric-value">${report.run.artifactCount}</span></div>
			</div>
			<div class="composition" aria-label="Suite attribution: ${formatPercentage(measuredPercentage)} measured and ${formatPercentage(unattributedPercentage)} unattributed">
				<span class="measured" style="--measured-width: ${measuredPercentage.toFixed(3)}%"></span>
				<span class="unattributed" style="--unattributed-width: ${unattributedPercentage.toFixed(3)}%"></span>
			</div>
			<div class="composition-labels"><span>Measured ${formatPercentage(measuredPercentage)}</span><span>Suite/unattributed ${formatPercentage(unattributedPercentage)}</span></div>
		</section>
		<section class="panel" aria-labelledby="waterfall-heading">
			<h2 id="waterfall-heading">Sequential measured operations</h2>
			<p class="note">This is a sequential wall-time waterfall, not a CPU stack flame graph. Samples are ordered by sequence and laid end-to-end because timings.json records durations, not absolute gaps. Hover or focus a colored sample for its metadata.</p>
			<div class="chart-scroll">${sampleChart}</div>
		</section>
		<section class="panel" aria-labelledby="phases-heading">
			<h2 id="phases-heading">Phase aggregates</h2>
			${aggregateTable}
		</section>
	</main>
</body>
</html>
`;
}
