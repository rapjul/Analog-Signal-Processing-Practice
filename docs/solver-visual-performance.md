# Solver visual capture performance

## Current decision

The solver visual suite now suppresses global PWA chrome during capture and uses one reused page and browser context per archetype by default. Set `SIGNALLAB_VISUAL_PAGE_MODE=isolated` only when a fresh page per viewport and theme is specifically required.

The asynchronous PWA `Offline ready` toast was the blocker to evaluating reuse. Capture-only CSS now hides both `.navbar` and `.update-toast`, remains active if the toast mounts late, and is asserted before capture. The deliberately refreshed isolated baseline changed 73 of 408 PNGs, all in the first ODE archetype where the toast had appeared. The pre-change baseline and gallery remain preserved with verified SHA-256 inventories.

## Data preservation

Benchmark session `20260818-0b09116` contains the original current gallery, the original baseline PNG tree, and SHA-256 inventories under `tests/e2e/screenshots/solvers/benchmarks/20260818-0b09116/`. The session is intentionally ignored by Git and must not be deleted automatically.

Every benchmark repetition receives a unique `runs/<sequence>-<phase>-<cycle>-<profile>-<page-mode>/` directory. It contains environment metadata, baseline inventories from before and after the run, current PNG hashes, console output, timing and manifest JSON, a self-contained `timing-waterfall.html` generated from a fresh `timings.json`, and failure actual/diff images when applicable. The driver fingerprints the timing report before launch so a startup failure cannot archive the preceding run's report as new evidence. `benchmark-history.json` and `summary.json` are replaced atomically only after the completed run is archived.

The benchmark driver never passes `--update-snapshots` and verifies that the baseline hash inventory is unchanged. Successful repeated PNGs are represented by manifests and hashes rather than duplicated in every run.

## Instrumentation

Artifact-generating runs write the latest report to `tests/e2e/screenshots/solvers/current/timings.json` and print one compact table. Reports include:

- navigation;
- state preparation;
- hint revelation;
- font, canvas, and layout stabilization;
- Playwright screenshot comparison;
- inspection-artifact writing;
- complete suite wall time and an unattributed bucket.

Each sample includes available archetype, state, viewport, and theme metadata. Normal `npm run test:e2e:solvers` comparisons remain quiet because timings are enabled only with inspection artifacts.

The HTML visualization is a sequential wall-time waterfall rather than a sampled CPU flame graph. That representation matches this workload: most time is spent awaiting browser navigation, layout, screenshot comparison, and PNG writing instead of executing one CPU-heavy JavaScript stack. A true Chromium trace or Node CPU profile is best reserved for a phase that the waterfall identifies as CPU-bound.

Run one read-only repetition with:

```sh
npm run benchmark:solvers -- \
  --session 20260818-0b09116 \
  --phase baseline \
  --cycle 1 \
  --profile quick \
  --page-mode isolated
```

The intended counterbalanced profile orders remain:

1. `quick`, `dark`, `full`;
2. `dark`, `full`, `quick`;
3. `full`, `quick`, `dark`.

## Implemented performance changes

Reused mode creates one Playwright page and browser context per archetype. It navigates once with `domcontentloaded`, switches viewport and theme in the loaded page, updates stored theme and theme-color metadata, dispatches `themechange` for canvas redraws, resets scroll, and waits for fonts, canvases, and responsive layout. Harness states and generated hint variants are prepared once before their desktop/mobile captures. Completion resets through the harness and solves once without a reload. Captures use fully qualified Playwright steps.

Snapshot-update capture commands set `SIGNALLAB_VISUAL_COPY_ACCEPTED_SNAPSHOTS=1`. After Playwright accepts or updates a snapshot, its baseline PNG is copied to the inspection gallery rather than taking a second screenshot. Read-only comparison and benchmark runs retain the independent screenshot fallback.

## Counterbalanced benchmark results

Three successful cycles used the profile orders `quick/dark/full`, `dark/full/quick`, and `full/quick/dark` independently for isolated and reused modes. All 18 planned runs preserved the baseline inventory and produced the expected artifact counts. One additional isolated dark diagnostic attempt encountered a transient 131-pixel math-font rasterization difference; its immediate repeat and every planned run passed without changing comparison thresholds.

| Profile | Artifacts | Isolated suite mean ± SD | Reused suite mean ± SD | Mean saving |
| ------- | --------: | -----------------------: | ---------------------: | ----------: |
| Quick   |       176 |         59.045 ± 0.786 s |       37.605 ± 0.355 s |       36.3% |
| Dark    |       342 |         90.613 ± 0.243 s |       60.948 ± 0.353 s |       32.7% |
| Full    |       408 |        142.395 ± 1.447 s |       75.957 ± 0.134 s |       46.7% |

Command-wall savings, including gallery generation, were 34.3% quick, 31.6% dark, and 45.7% full. The savings exceed the measured three-run variance by a wide margin and the reused runs retained complete screenshot coverage, so reuse satisfies the adoption thresholds.

For the full reused profile, the remaining mean costs are screenshot comparison at 35.557 seconds, artifact writing at 20.472 seconds, and layout stabilization at 12.244 seconds. Navigation is only 0.131 seconds after reuse, down from 61.139 seconds in isolated mode. The next substantial optimization candidate is a carefully validated single-capture path that compares and archives the same PNG instead of taking a second inspection-artifact screenshot; a CPU flame graph is unlikely to help until the browser and PNG work has been reduced.
