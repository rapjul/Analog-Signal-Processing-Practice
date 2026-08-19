import fs from "node:fs";
import path from "node:path";

/**
 * Builds a standalone inspection gallery exclusively from the current capture
 * manifest. Files left behind by older runs are intentionally invisible.
 */

const SOLVERS_DIR = path.resolve(
	process.cwd(),
	"tests/e2e/screenshots/solvers",
);
const MANIFEST_PATH = path.join(SOLVERS_DIR, "current", "manifest.json");
const OUTPUT_HTML = path.join(SOLVERS_DIR, "index.html");
// The collapsible hierarchy currently replaces these two redundant selectors.
// Toggle this flag to restore them without rebuilding their behavior.
const SHOW_HIERARCHY_FILTERS = false;

type Theme = "dark" | "light";
type CaptureKind = "state" | "milestone";
type StateKind = "interactive" | "hint" | "diagnostic" | "milestone";

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
	version: number;
	generatedAt: string;
	coverage: {
		stateMatrix: string;
		milestoneMatrix: string;
	};
	artifacts: VisualArtifactEntry[];
}

function readManifest(): VisualRunManifest {
	if (!fs.existsSync(MANIFEST_PATH)) {
		throw new Error(
			`No current visual manifest found at ${MANIFEST_PATH}. Run npm run capture:solvers first.`,
		);
	}

	const parsed = JSON.parse(
		fs.readFileSync(MANIFEST_PATH, "utf8"),
	) as VisualRunManifest;
	if (parsed.version !== 2 || !Array.isArray(parsed.artifacts)) {
		throw new Error(
			`Unsupported visual manifest format in ${MANIFEST_PATH}. Expected version 2.`,
		);
	}

	for (const artifact of parsed.artifacts) {
		const absolutePath = path.resolve(SOLVERS_DIR, artifact.relativePath);
		const relativeToRoot = path.relative(SOLVERS_DIR, absolutePath);
		if (
			relativeToRoot.startsWith("..") ||
			path.isAbsolute(relativeToRoot) ||
			!fs.existsSync(absolutePath)
		) {
			throw new Error(
				`Manifest references a missing or invalid artifact: ${artifact.relativePath}`,
			);
		}
	}

	return parsed;
}

function serializeForInlineScript(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}

const manifest = readManifest();
const pageData = serializeForInlineScript(manifest);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SignalLab Solver Visual States</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #090d16;
      --panel: #111827;
      --panel-2: #172033;
      --border: #26334a;
      --text: #f8fafc;
      --muted: #94a3b8;
      --cyan: #22d3ee;
      --amber: #f59e0b;
      --rose: #fb7185;
      --green: #34d399;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    button, select { font: inherit; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
    .skip-link {
      position: fixed; top: 8px; left: 8px; z-index: 200; transform: translateY(-150%);
      border-radius: 8px; background: var(--cyan); color: #04131a; padding: 8px 12px;
      font-weight: 700;
    }
    .skip-link:focus { transform: translateY(0); }
    .header {
      position: sticky; top: 0; z-index: 20; padding: 18px 24px;
      background: color-mix(in srgb, var(--bg) 92%, transparent);
      border-bottom: 1px solid var(--border); backdrop-filter: blur(16px);
    }
    .header.collapsed { padding-bottom: 10px; }
    .header.collapsed .header-details { display: none; }
    .header-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .header-actions { display: flex; align-items: center; justify-content: end; gap: 12px; }
    h1 { margin: 0; font-size: clamp(1.2rem, 2vw, 1.65rem); }
    .subtitle, .coverage { margin: 5px 0 0; color: var(--muted); font-size: .85rem; }
    .count { color: var(--cyan); font-weight: 700; white-space: nowrap; }
    .header-toggle {
      inline-size: 8.5rem;
      border: 1px solid var(--border); border-radius: 8px; background: var(--panel-2);
      color: var(--text); padding: 7px 10px; cursor: pointer; white-space: nowrap;
    }
    .header-toggle:hover { border-color: var(--cyan); }
    .header-toggle:focus-visible { outline: 3px solid var(--cyan); outline-offset: 2px; }
    .filters {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px; min-inline-size: 0; margin: 16px 0 0; padding: 0; border: 0;
    }
    label { display: grid; gap: 5px; color: var(--muted); font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    select {
      width: 100%; border: 1px solid var(--border); border-radius: 8px;
      background: var(--panel); color: var(--text); padding: 8px 10px;
    }
    select optgroup { color: var(--cyan); font-weight: 700; }
    select option { color: var(--text); font-weight: 500; }
    .filter-actions { display: flex; align-items: end; }
    .reset-button {
      width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--panel-2);
      color: var(--text); padding: 8px 12px; cursor: pointer;
    }
    .reset-button:hover:not(:disabled) { border-color: var(--cyan); }
    .reset-button:focus-visible { outline: 3px solid var(--cyan); outline-offset: 2px; }
    .reset-button:disabled { opacity: .5; cursor: default; }
    main { padding: 24px; }
    .empty { padding: 48px 20px; color: var(--muted); text-align: center; }
    .module-group { margin-bottom: 42px; scroll-margin-top: 190px; }
    .module-header, .archetype-header, .step-heading, .state-header {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      position: relative; border: 1px solid var(--border); background: var(--panel);
      cursor: pointer;
    }
    .module-header { padding: 13px 15px; border-radius: 12px; }
    .archetype { margin: 14px 0 26px 16px; padding-left: 16px; border-left: 2px solid var(--border); }
    .archetype-header {
      padding: 14px 16px; border-radius: 12px;
      border-color: color-mix(in srgb, var(--cyan) 52%, var(--border));
      background: linear-gradient(90deg, color-mix(in srgb, var(--cyan) 13%, var(--panel)), var(--panel));
      box-shadow: inset 4px 0 0 color-mix(in srgb, var(--cyan) 78%, transparent);
    }
    .group-heading {
      min-width: 0; display: flex; align-items: baseline; gap: 10px;
      padding-right: 8.5rem; pointer-events: none;
    }
    .module-header h2, .archetype-header h3, .step-heading h4, .state-header h5 { margin: 0; }
    .module-header h2 { font-size: 1.15rem; }
    .archetype-header h3 { color: var(--text); font-size: 1.05rem; }
    .hierarchy-label {
      flex: none; border: 1px solid color-mix(in srgb, var(--cyan) 50%, var(--border));
      border-radius: 999px; padding: 2px 7px; color: var(--cyan);
      font-size: .58rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
    }
    .group-count, .step-count { color: var(--muted); font-size: .72rem; white-space: nowrap; }
    .module-content, .archetype-content, .step-content { padding-top: 2px; }
    .group-content[hidden] { display: none; }
    .group-toggle {
      position: absolute; inset: 0; z-index: 1; width: 100%;
      border: 0; border-radius: inherit; background: transparent; color: var(--text);
      padding: 0; cursor: pointer;
    }
    .toggle-label {
      position: absolute; top: 50%; right: 10px; transform: translateY(-50%);
      border: 0; border-radius: 8px; background: var(--panel-2);
      padding: 6px 10px; pointer-events: none;
    }
    .module-header:has(.group-toggle:hover), .archetype-header:has(.group-toggle:hover),
    .step-heading:has(.group-toggle:hover), .state-header:has(.group-toggle:hover) {
      border-color: var(--cyan);
    }
    .group-toggle:focus-visible { outline: 3px solid var(--cyan); outline-offset: -3px; }
    .step-group { margin: 16px 0 24px; }
    .step-heading {
      margin: 0 0 10px; padding: 9px 10px; border-radius: 9px;
      background: color-mix(in srgb, var(--panel) 78%, var(--bg));
    }
    .step-heading h4 { color: var(--text); font-size: .92rem; }
    .state-group { margin: 10px 0 18px 12px; padding-left: 12px; border-left: 1px solid var(--border); }
    .state-header { margin-bottom: 10px; padding: 8px 10px; border-radius: 8px; }
    .state-header h5 { font-size: .84rem; }
    .step-direct-grid { margin: 10px 0 18px 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 370px), 1fr)); gap: 14px; }
    .card { min-width: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 14px; background: var(--panel); }
    .card-header { display: flex; justify-content: space-between; gap: 12px; padding: 11px 12px; border-bottom: 1px solid var(--border); }
    .state-label { min-width: 0; font-size: .88rem; font-weight: 700; }
    .state-id { margin-top: 3px; overflow: hidden; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .67rem; text-overflow: ellipsis; white-space: nowrap; }
    .tags { display: flex; flex-wrap: wrap; justify-content: end; align-content: start; gap: 5px; }
    .tag { border: 1px solid var(--border); border-radius: 999px; padding: 2px 7px; color: var(--muted); font-size: .64rem; white-space: nowrap; }
    .tag.diagnostic { border-color: color-mix(in srgb, var(--rose) 55%, var(--border)); color: var(--rose); }
    .tag.hint { border-color: color-mix(in srgb, var(--amber) 55%, var(--border)); color: var(--amber); }
    .tag.milestone { border-color: color-mix(in srgb, var(--green) 55%, var(--border)); color: var(--green); }
    .image-button {
      display: block; width: 100%; padding: 0 3px 4px;
      border: 0; border-radius: 0 0 13px 13px; background: var(--panel); cursor: zoom-in;
    }
    .image-button:focus-visible { outline: 3px solid var(--cyan); outline-offset: -3px; }
    .image-button img {
      display: block; width: 100%; max-height: 620px; border-radius: 0 0 10px 10px;
      object-fit: contain; object-position: top; background: #020617;
    }
    .card.desktop-edge-screenshot .image-button img { border-radius: 0; }
    .lightbox { position: fixed; inset: 0; z-index: 100; display: none; background: rgba(0, 0, 0, .94); }
    .lightbox.open { display: grid; grid-template-rows: auto 1fr; gap: 6px; }
    .lightbox-bar {
      display: grid; grid-template-columns: minmax(0, 1fr); align-items: center;
      gap: 16px; padding: 12px 16px; background: #020617; border-bottom: 1px solid var(--border);
    }
    .lightbox-heading { min-width: 0; display: grid; gap: 4px; text-align: center; }
    .lightbox-descriptor-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .lightbox-descriptor {
      min-width: 0; overflow: hidden; padding-inline: 12px;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .lightbox-descriptor:first-child { text-align: right; }
    .lightbox-descriptor:last-child { text-align: left; }
    .lightbox-descriptor + .lightbox-descriptor { border-left: 1px solid var(--border); }
    .lightbox-meta { color: var(--muted); font-size: .78rem; }
    .lightbox-actions {
      display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px;
    }
    .lightbox-action-group { display: flex; align-items: center; gap: 8px; }
    .lightbox-navigation { justify-self: start; }
    .lightbox-zoom {
      justify-self: center; padding-inline: 16px;
      border-inline: 1px solid var(--border);
    }
    .lightbox-close { justify-self: end; }
    .icon-button { border: 1px solid var(--border); border-radius: 8px; background: var(--panel-2); color: var(--text); padding: 7px 11px; cursor: pointer; }
    .icon-button:hover:not(:disabled) { border-color: var(--cyan); }
    .icon-button:focus-visible { outline: 3px solid var(--cyan); outline-offset: 2px; }
    .icon-button:disabled { opacity: .45; cursor: default; }
    .zoom-level { min-width: 4.4rem; color: var(--muted); text-align: center; font-variant-numeric: tabular-nums; }
    .lightbox-stage { min-height: 0; overflow: auto; padding: 10px 20px 20px; }
    .lightbox-canvas {
      display: flex; width: max-content; min-width: 100%; height: max-content;
      min-height: 100%; align-items: flex-start; justify-content: center;
    }
    .lightbox-stage img {
      display: block; flex: none; max-width: none; max-height: none; height: auto;
      border: 1px solid var(--border); border-radius: 8px; background: #020617;
    }
    @media (max-width: 900px) {
      .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .lightbox-bar { gap: 8px; }
    }
    @media (max-width: 520px) {
      .header, main { padding-left: 12px; padding-right: 12px; }
      .header-row { align-items: center; flex-wrap: wrap; }
      .header-actions { width: 100%; justify-content: space-between; gap: 8px; }
      .header-toggle { padding: 6px 8px; }
      .filters { grid-template-columns: 1fr; }
      .coverage { display: none; }
      .archetype { margin-left: 6px; padding-left: 8px; }
      .state-group { margin-left: 4px; padding-left: 6px; }
      .module-header, .archetype-header, .step-heading, .state-header { align-items: flex-start; }
      .group-heading { display: grid; gap: 3px; }
      .group-heading { padding-right: 7.25rem; }
      .hierarchy-label { width: max-content; }
      .lightbox-actions { grid-template-columns: 1fr auto; }
      .lightbox-zoom {
        grid-column: 1 / -1; grid-row: 2; justify-self: center;
        border-inline: 0; border-top: 1px solid var(--border); padding: 8px 0 0;
      }
      .lightbox-stage { padding: 8px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#gallery">Skip to gallery</a>
  <header class="header">
    <div class="header-row">
      <h1>SignalLab Solver Visual States</h1>
      <div class="header-actions">
        <div class="count" id="count" aria-live="polite"></div>
        <button class="header-toggle" id="header-toggle" type="button" aria-expanded="true" aria-controls="header-details">Hide filters ↑</button>
      </div>
    </div>
    <div class="header-details" id="header-details">
      <div>
        <p class="subtitle">Manifest generated <span id="generated-at"></span></p>
        <p class="coverage" id="coverage"></p>
      </div>
      <fieldset class="filters">
        <legend class="sr-only">Gallery filters</legend>
        <label${SHOW_HIERARCHY_FILTERS ? "" : " hidden"}>Module<select id="module-filter"></select></label>
        <label${SHOW_HIERARCHY_FILTERS ? "" : " hidden"}>Archetype<select id="archetype-filter"></select></label>
        <label>State<select id="state-filter"></select></label>
        <label>Viewport<select id="viewport-filter"></select></label>
        <label>Theme<select id="theme-filter"></select></label>
        <div class="filter-actions">
          <button class="reset-button" id="reset-filters" type="button">Reset filters</button>
        </div>
      </fieldset>
    </div>
  </header>
  <main id="gallery" tabindex="-1"></main>
  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-caption" aria-describedby="lightbox-help">
    <div class="lightbox-bar">
      <div class="lightbox-heading">
        <div class="lightbox-descriptor-row lightbox-caption" id="lightbox-caption">
          <div class="lightbox-descriptor" id="lightbox-archetype"></div>
          <div class="lightbox-descriptor" id="lightbox-state"></div>
        </div>
        <div class="lightbox-descriptor-row lightbox-meta">
          <div class="lightbox-descriptor" id="lightbox-viewport"></div>
          <div class="lightbox-descriptor" id="lightbox-theme"></div>
        </div>
      </div>
      <p class="sr-only" id="lightbox-help">Use the arrow buttons to move between screenshots. Use plus and minus to zoom, Fit Page to show the whole image, or Fit Width to fill the available width. Press Escape to close.</p>
      <div class="lightbox-actions">
        <div class="lightbox-action-group lightbox-navigation" aria-label="Screenshot navigation">
          <button class="icon-button" id="previous" type="button" aria-label="Previous screenshot">←</button>
          <button class="icon-button" id="next" type="button" aria-label="Next screenshot">→</button>
        </div>
        <div class="lightbox-action-group lightbox-zoom" aria-label="Screenshot zoom">
          <button class="icon-button" id="zoom-out" type="button" aria-label="Zoom out">−</button>
          <span class="zoom-level" id="zoom-level" aria-live="polite">Fit page</span>
          <button class="icon-button" id="zoom-in" type="button" aria-label="Zoom in">+</button>
          <button class="icon-button" id="zoom-fit" type="button">Fit Page</button>
          <button class="icon-button" id="zoom-fit-width" type="button">Fit Width</button>
        </div>
        <div class="lightbox-action-group lightbox-close">
          <button class="icon-button" id="close" type="button">Close</button>
        </div>
      </div>
    </div>
    <div class="lightbox-stage" id="lightbox-stage">
      <div class="lightbox-canvas" id="lightbox-canvas"><img id="lightbox-image" alt=""></div>
    </div>
  </div>
  <script>
    const manifest = ${pageData};
    const artifacts = manifest.artifacts;
    const controls = {
      module: document.getElementById('module-filter'),
      archetype: document.getElementById('archetype-filter'),
      state: document.getElementById('state-filter'),
      viewport: document.getElementById('viewport-filter'),
      theme: document.getElementById('theme-filter')
    };
    const filterFields = {
      module: 'module',
      archetype: 'archetype',
      state: 'stateId',
      viewport: 'viewport',
      theme: 'theme'
    };
    const filterLabels = {
      module: 'All modules',
      archetype: 'All archetypes',
      state: 'All states',
      viewport: 'All viewports',
      theme: 'Both themes'
    };
    const defaultFilterValues = {
      module: '',
      archetype: '',
      state: '',
      viewport: '',
      theme: 'dark'
    };
    const filterKeys = Object.keys(controls);
    const resetFilters = document.getElementById('reset-filters');
    const skipLink = document.querySelector('.skip-link');
    const header = document.querySelector('.header');
    const headerToggle = document.getElementById('header-toggle');
    const gallery = document.getElementById('gallery');
    const count = document.getElementById('count');
    const lightbox = document.getElementById('lightbox');
    const lightboxStage = document.getElementById('lightbox-stage');
    const lightboxCanvas = document.getElementById('lightbox-canvas');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxArchetype = document.getElementById('lightbox-archetype');
    const lightboxState = document.getElementById('lightbox-state');
    const lightboxViewport = document.getElementById('lightbox-viewport');
    const lightboxTheme = document.getElementById('lightbox-theme');
    const zoomLevel = document.getElementById('zoom-level');
    const zoomOut = document.getElementById('zoom-out');
    const zoomIn = document.getElementById('zoom-in');
    let visibleArtifacts = [];
    let lightboxIndex = -1;
    let lightboxTrigger = null;
    let lightboxFitWidth = 0;
    let lightboxFitHeight = 0;
    let lightboxZoom = 1;
    let lightboxFitMode = 'contain';
    const collapsedModules = new Set();
    const collapsedArchetypes = new Set();
    const collapsedSteps = new Set();
    const collapsedStates = new Set();

    document.getElementById('generated-at').textContent = new Date(manifest.generatedAt).toLocaleString();
    document.getElementById('coverage').textContent = manifest.coverage.stateMatrix + ' ' + manifest.coverage.milestoneMatrix;

    function filterItemLabel(key, item) {
      if (key === 'state') return milestoneLabels.get(item.stateId) ?? item.stateLabel;
      if (key === 'viewport') return viewportLabels.get(item.viewport) ?? item.viewport;
      if (key === 'theme') return themeLabels.get(item.theme) ?? item.theme;
      if (key === 'module') return moduleLabels.get(item.module) ?? item.module;
      if (key === 'archetype') return item.archetypeTitle;
      return item[filterFields[key]];
    }

    function stateFilterGroup(item) {
      if (item.stateId.startsWith('milestone.')) {
        return { label: 'Milestones', order: -1 };
      }
      const number = stepNumber(item);
      if (number < Number.MAX_SAFE_INTEGER - 1) {
        return { label: 'Step ' + number, order: number };
      }
      return { label: 'Other states', order: Number.MAX_SAFE_INTEGER };
    }

    function compareFilterItems(key, a, b) {
      if (key === 'state') {
        const aGroup = stateFilterGroup(a);
        const bGroup = stateFilterGroup(b);
        const milestoneOrder = new Map([
          ['milestone.initial', 0],
          ['milestone.diagnostic', 1],
          ['milestone.completed', 2]
        ]);
        return aGroup.order - bGroup.order
          || (milestoneOrder.get(a.stateId) ?? 99) - (milestoneOrder.get(b.stateId) ?? 99)
          || compareArtifacts(a, b);
      }
      if (key === 'viewport') {
        return (viewportOrder.get(a.viewport) ?? 99) - (viewportOrder.get(b.viewport) ?? 99);
      }
      if (key === 'theme') return a.theme === b.theme ? 0 : a.theme === 'dark' ? -1 : 1;
      return naturalCollator.compare(filterItemLabel(key, a), filterItemLabel(key, b));
    }

    function uniqueFilterItems(key, items) {
      const sortedItems = [...items].sort((a, b) => compareFilterItems(key, a, b));
      const itemByValue = new Map();
      for (const item of sortedItems) {
        const value = item[filterFields[key]];
        if (!itemByValue.has(value)) itemByValue.set(value, item);
      }
      return [...itemByValue.values()];
    }

    function appendFilterOption(parent, key, item) {
      const option = document.createElement('option');
      option.value = item[filterFields[key]];
      option.textContent = filterItemLabel(key, item);
      parent.append(option);
    }

    function fillSelect(key, items, selectedValue = '') {
      const select = controls[key];
      const uniqueItems = uniqueFilterItems(key, items);
      select.replaceChildren();
      const all = document.createElement('option');
      all.value = '';
      all.textContent = filterLabels[key];
      select.append(all);

      if (key === 'state') {
        const groups = new Map();
        for (const item of uniqueItems) {
          const group = stateFilterGroup(item);
          if (!groups.has(group.label)) groups.set(group.label, []);
          groups.get(group.label).push(item);
        }
        for (const [label, groupItems] of groups) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = label;
          for (const item of groupItems) appendFilterOption(optgroup, key, item);
          select.append(optgroup);
        }
      } else {
        for (const item of uniqueItems) appendFilterOption(select, key, item);
      }

      const values = uniqueItems.map(item => item[filterFields[key]]);
      select.value = values.includes(selectedValue) ? selectedValue : '';
    }

    function itemMatchesSelection(item, key) {
      const selectedValue = controls[key].value;
      return !selectedValue || item[filterFields[key]] === selectedValue;
    }

    function normalizeSelections(preferredKey) {
      const orderedKeys = [preferredKey, ...filterKeys.filter(key => key !== preferredKey)];
      let compatibleArtifacts = artifacts;

      for (const key of orderedKeys) {
        const selectedValue = controls[key].value;
        if (!selectedValue) continue;
        const narrowedArtifacts = compatibleArtifacts.filter(item => itemMatchesSelection(item, key));
        if (narrowedArtifacts.length) compatibleArtifacts = narrowedArtifacts;
        else controls[key].value = '';
      }
    }

    function refreshFilterOptions() {
      const optionsByKey = new Map(filterKeys.map(key => {
        const matchingArtifacts = artifacts.filter(item => filterKeys.every(otherKey =>
          otherKey === key || itemMatchesSelection(item, otherKey)
        ));
        return [key, matchingArtifacts];
      }));

      for (const key of filterKeys) {
        fillSelect(key, optionsByKey.get(key), controls[key].value);
      }
    }

    function matches(item) {
      return filterKeys.every(key => itemMatchesSelection(item, key));
    }

    function filtersMatchDefaults() {
      return filterKeys.every(key => controls[key].value === defaultFilterValues[key]);
    }

    function applyDefaultFilters() {
      for (const key of filterKeys) controls[key].value = defaultFilterValues[key];
    }

    const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const subStepOrder = new Map([
      ['strategy_gate', 0],
      ['factoring_inputs', 1],
      ['quad_classification', 2],
      ['remedial_discriminant', 3],
      ['quad_root_inputs', 4],
      ['first_deriv', 0],
      ['second_deriv', 1],
      ['system_setup', 2],
      ['solve', 3],
      ['target_values', 0],
      ['solve_constants', 1],
      ['zi_zs', 0],
      ['tr_ss', 1],
      ['concept', 2]
    ]);
    const viewportOrder = new Map([
      ['desktop-1280x800', 0],
      ['tablet-768x1024', 1],
      ['mobile-narrow-320x568', 2]
    ]);
    const viewportLabels = new Map([
      ['desktop-1280x800', 'Desktop · 1280 × 800'],
      ['tablet-768x1024', 'Tablet · 768 × 1024'],
      ['mobile-narrow-320x568', 'Mobile · 320 × 568']
    ]);
    const themeLabels = new Map([
      ['dark', 'Dark mode'],
      ['light', 'Light mode']
    ]);
    const milestoneLabels = new Map([
      ['milestone.initial', 'Initial problem setup'],
      ['milestone.diagnostic', 'Representative diagnostic'],
      ['milestone.completed', 'Completed solution and visualizer']
    ]);
    const stateKindOrder = new Map([
      ['interactive', 0],
      ['hint', 1],
      ['diagnostic', 2],
      ['milestone', 3]
    ]);
    const moduleLabels = new Map([
      ['odes', 'ODE'],
      ['fourier-series', 'Fourier Series'],
      ['fourier-transform', 'Fourier Transform'],
      ['convolution', 'Convolution'],
      ['laplace', 'Laplace'],
      ['circuits', 'Circuits']
    ]);

    function stepNumber(item) {
      if (item.stateId === 'milestone.initial') return -1;
      if (item.stateId === 'milestone.completed') return Number.MAX_SAFE_INTEGER;
      if (Number.isFinite(item.step)) return item.step;
      const match = item.stateLabel.match(/\\bStep\\s+(\\d+)/i);
      return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER - 1;
    }

    function compareArtifacts(a, b) {
      return naturalCollator.compare(a.module, b.module)
        || naturalCollator.compare(a.archetypeTitle, b.archetypeTitle)
        || stepNumber(a) - stepNumber(b)
        || (subStepOrder.get(a.subStep) ?? (a.captureKind === 'milestone' ? 90 : 0))
          - (subStepOrder.get(b.subStep) ?? (b.captureKind === 'milestone' ? 90 : 0))
        || (stateKindOrder.get(a.stateKind) ?? 99) - (stateKindOrder.get(b.stateKind) ?? 99)
        || naturalCollator.compare(a.stateLabel, b.stateLabel)
        || naturalCollator.compare(a.stateId, b.stateId)
        || (viewportOrder.get(a.viewport) ?? 99) - (viewportOrder.get(b.viewport) ?? 99)
        || naturalCollator.compare(a.theme, b.theme);
    }

    function captureCountLabel(value) {
      return value + ' screenshot' + (value === 1 ? '' : 's');
    }

    function stepGroupInfo(item) {
      if (item.stateId === 'milestone.initial') {
        return { key: 'initial', label: 'Initial state' };
      }
      if (item.stateId === 'milestone.completed') {
        return { key: 'completed', label: 'Completed solution' };
      }
      const number = stepNumber(item);
      if (number < Number.MAX_SAFE_INTEGER - 1) {
        return { key: 'step-' + number, label: 'Step ' + number };
      }
      return { key: 'other', label: 'Other states' };
    }

    function initializeCollapsedGroups() {
      for (const item of artifacts) {
        collapsedModules.add(item.module);
        collapsedArchetypes.add(item.archetype);
        collapsedSteps.add(item.archetype + '::' + stepGroupInfo(item).key);
        collapsedStates.add(item.archetype + '::' + item.stateId);
      }
    }

    function makeGroupToggle(label, content, collapsedKeys, key) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'group-toggle';
      button.setAttribute('aria-controls', content.id);
      const visualLabel = document.createElement('span');
      visualLabel.className = 'toggle-label';
      button.append(visualLabel);

      function sync() {
        const collapsed = collapsedKeys.has(key);
        content.hidden = collapsed;
        button.setAttribute('aria-expanded', String(!collapsed));
        button.setAttribute('aria-label', (collapsed ? 'Expand ' : 'Collapse ') + label);
        visualLabel.textContent = collapsed ? 'Expand ↓' : 'Collapse ↑';
      }

      button.addEventListener('click', () => {
        if (collapsedKeys.has(key)) collapsedKeys.delete(key);
        else collapsedKeys.add(key);
        sync();
      });
      button.addEventListener('focus', () => {
        requestAnimationFrame(() => {
          const headerBottom = header.getBoundingClientRect().bottom;
          const buttonTop = button.getBoundingClientRect().top;
          if (buttonTop < headerBottom + 12) {
            window.scrollBy({ top: buttonTop - headerBottom - 12, behavior: 'instant' });
          }
        });
      });
      sync();
      return button;
    }

    function makeTag(text, className) {
      const tag = document.createElement('span');
      tag.className = 'tag' + (className ? ' ' + className : '');
      tag.textContent = text;
      return tag;
    }

    function makeCard(item, index) {
      const card = document.createElement('article');
      card.className = 'card';
      if (item.viewport === 'desktop-1280x800' && item.captureKind === 'state') {
        card.classList.add('desktop-edge-screenshot');
      }
      const cardHeader = document.createElement('div');
      cardHeader.className = 'card-header';
      const labelBox = document.createElement('div');
      labelBox.className = 'state-label';
      labelBox.textContent = item.stateLabel;
      const stateId = document.createElement('div');
      stateId.className = 'state-id';
      stateId.textContent = item.stateId;
      labelBox.append(stateId);
      const tags = document.createElement('div');
      tags.className = 'tags';
      tags.append(
        makeTag(viewportLabels.get(item.viewport) ?? item.viewport),
        makeTag(themeLabels.get(item.theme) ?? item.theme),
        makeTag(item.stateKind, item.stateKind)
      );
      cardHeader.append(labelBox, tags);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'image-button';
      button.setAttribute('aria-label', 'Open ' + item.stateLabel);
      button.addEventListener('click', () => openLightbox(index, button));
      const image = document.createElement('img');
      image.src = item.relativePath;
      image.alt = item.stateLabel + ' (' + item.theme + ', ' + item.viewport + ')';
      image.loading = 'lazy';
      button.append(image);
      card.append(cardHeader, button);
      return card;
    }

    function applyLightboxZoom() {
      if (!lightboxFitWidth || !lightboxFitHeight) return;
      lightboxImage.style.width = Math.round(lightboxFitWidth * lightboxZoom) + 'px';
      lightboxImage.style.height = Math.round(lightboxFitHeight * lightboxZoom) + 'px';
      zoomLevel.textContent = lightboxZoom === 1
        ? (lightboxFitMode === 'width' ? 'Fit width' : 'Fit page')
        : Math.round(lightboxZoom * 100) + '%';
      zoomOut.disabled = lightboxZoom <= 0.5;
      zoomIn.disabled = lightboxZoom >= 4;
    }

    function sizeLightboxImage(mode, preserveZoom = false) {
      if (!lightboxImage.naturalWidth || !lightboxImage.naturalHeight) return;
      const stageStyle = getComputedStyle(lightboxStage);
      const availableWidth = lightboxStage.clientWidth
        - parseFloat(stageStyle.paddingLeft) - parseFloat(stageStyle.paddingRight);
      const availableHeight = lightboxStage.clientHeight
        - parseFloat(stageStyle.paddingTop) - parseFloat(stageStyle.paddingBottom);
      const widthScale = availableWidth / lightboxImage.naturalWidth;
      const fitScale = mode === 'width'
        ? widthScale
        : Math.min(widthScale, availableHeight / lightboxImage.naturalHeight);
      lightboxFitMode = mode;
      lightboxFitWidth = lightboxImage.naturalWidth * fitScale;
      lightboxFitHeight = lightboxImage.naturalHeight * fitScale;
      if (!preserveZoom) lightboxZoom = 1;
      applyLightboxZoom();
      if (!preserveZoom) lightboxStage.scrollTo({ top: 0, left: 0 });
    }

    function fitLightboxImage(preserveZoom = false) {
      sizeLightboxImage('contain', preserveZoom);
    }

    function fitLightboxWidth(preserveZoom = false) {
      sizeLightboxImage('width', preserveZoom);
    }

    function changeLightboxZoom(delta) {
      const previousWidth = lightboxStage.scrollWidth;
      const previousHeight = lightboxStage.scrollHeight;
      const centerX = (lightboxStage.scrollLeft + lightboxStage.clientWidth / 2) / previousWidth;
      const centerY = (lightboxStage.scrollTop + lightboxStage.clientHeight / 2) / previousHeight;
      lightboxZoom = Math.min(4, Math.max(0.5, Math.round((lightboxZoom + delta) * 4) / 4));
      applyLightboxZoom();
      requestAnimationFrame(() => {
        lightboxStage.scrollTo({
          left: centerX * lightboxStage.scrollWidth - lightboxStage.clientWidth / 2,
          top: centerY * lightboxStage.scrollHeight - lightboxStage.clientHeight / 2
        });
      });
    }

    function openLightbox(index, trigger = null) {
      lightboxIndex = index;
      const item = visibleArtifacts[index];
      if (!item) return;
      if (trigger) lightboxTrigger = trigger;
      lightboxZoom = 1;
      lightboxFitMode = 'contain';
      lightboxFitWidth = 0;
      lightboxFitHeight = 0;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      skipLink.inert = true;
      header.inert = true;
      gallery.inert = true;
      lightboxImage.src = item.relativePath;
      lightboxImage.alt = item.stateLabel;
      lightboxArchetype.textContent = item.archetypeTitle;
      lightboxArchetype.title = item.archetypeTitle;
      lightboxState.textContent = item.stateLabel;
      lightboxState.title = item.stateLabel;
      lightboxViewport.textContent = viewportLabels.get(item.viewport) ?? item.viewport;
      lightboxViewport.title = lightboxViewport.textContent;
      lightboxTheme.textContent = themeLabels.get(item.theme) ?? item.theme;
      lightboxTheme.title = lightboxTheme.textContent;
      if (lightboxImage.complete) requestAnimationFrame(() => fitLightboxImage());
      document.getElementById('close').focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
      skipLink.inert = false;
      header.inert = false;
      gallery.inert = false;
      lightboxImage.src = '';
      lightboxImage.style.width = '';
      lightboxImage.style.height = '';
      if (lightboxTrigger?.isConnected) lightboxTrigger.focus();
      lightboxTrigger = null;
    }

    function moveLightbox(delta) {
      if (!visibleArtifacts.length) return;
      openLightbox((lightboxIndex + delta + visibleArtifacts.length) % visibleArtifacts.length);
    }

    function render() {
      visibleArtifacts = artifacts.filter(matches).sort(compareArtifacts);
      resetFilters.disabled = filtersMatchDefaults();
      gallery.replaceChildren();
      count.textContent = visibleArtifacts.length + ' capture' + (visibleArtifacts.length === 1 ? '' : 's');
      if (!visibleArtifacts.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No captures match these filters.';
        gallery.append(empty);
        return;
      }

      const modules = new Map();
      visibleArtifacts.forEach((item, index) => {
        if (!modules.has(item.module)) {
          modules.set(item.module, { entries: [], archetypes: new Map() });
        }
        const moduleGroup = modules.get(item.module);
        moduleGroup.entries.push({ item, index });
        if (!moduleGroup.archetypes.has(item.archetype)) {
          moduleGroup.archetypes.set(item.archetype, []);
        }
        moduleGroup.archetypes.get(item.archetype).push({ item, index });
      });

      let moduleIndex = 0;
      let archetypeIndex = 0;
      let stepIndex = 0;
      let stateIndex = 0;
      for (const [moduleKey, moduleGroup] of modules) {
        const moduleSection = document.createElement('section');
        moduleSection.className = 'module-group';
        const moduleHeader = document.createElement('div');
        moduleHeader.className = 'module-header';
        const moduleHeading = document.createElement('div');
        moduleHeading.className = 'group-heading';
        const moduleTitle = document.createElement('h2');
        moduleTitle.textContent = moduleLabels.get(moduleKey) ?? moduleKey;
        const moduleCount = document.createElement('span');
        moduleCount.className = 'group-count';
        moduleCount.textContent = captureCountLabel(moduleGroup.entries.length);
        moduleHeading.append(moduleTitle, moduleCount);
        const moduleContent = document.createElement('div');
        moduleContent.className = 'module-content group-content';
        moduleContent.id = 'module-content-' + moduleIndex;
        moduleHeader.append(
          moduleHeading,
          makeGroupToggle(
            moduleTitle.textContent,
            moduleContent,
            collapsedModules,
            moduleKey
          )
        );

        for (const [archetypeKey, entries] of moduleGroup.archetypes) {
          const first = entries[0].item;
          const archetypeSection = document.createElement('section');
          archetypeSection.className = 'archetype';
          const archetypeHeader = document.createElement('div');
          archetypeHeader.className = 'archetype-header';
          const archetypeHeading = document.createElement('div');
          archetypeHeading.className = 'group-heading';
          const archetypeLabel = document.createElement('span');
          archetypeLabel.className = 'hierarchy-label';
          archetypeLabel.textContent = 'Problem archetype';
          const archetypeTitle = document.createElement('h3');
          archetypeTitle.textContent = first.archetypeTitle;
          const archetypeCount = document.createElement('span');
          archetypeCount.className = 'group-count';
          archetypeCount.textContent = captureCountLabel(entries.length);
          archetypeHeading.append(archetypeLabel, archetypeTitle, archetypeCount);
          const archetypeContent = document.createElement('div');
          archetypeContent.className = 'archetype-content group-content';
          archetypeContent.id = 'archetype-content-' + archetypeIndex;
          archetypeHeader.append(
            archetypeHeading,
            makeGroupToggle(
              archetypeTitle.textContent,
              archetypeContent,
              collapsedArchetypes,
              archetypeKey
            )
          );

          const steps = new Map();
          for (const entry of entries) {
            const info = stepGroupInfo(entry.item);
            if (!steps.has(info.key)) steps.set(info.key, { label: info.label, entries: [] });
            steps.get(info.key).entries.push(entry);
          }

          for (const [stepKey, stepGroup] of steps) {
            const stepSection = document.createElement('section');
            stepSection.className = 'step-group';
            const stepHeading = document.createElement('div');
            stepHeading.className = 'step-heading';
            const stepHeadingText = document.createElement('div');
            stepHeadingText.className = 'group-heading';
            const stepTitle = document.createElement('h4');
            stepTitle.textContent = stepGroup.label;
            const stepCount = document.createElement('span');
            stepCount.className = 'step-count';
            stepCount.textContent = captureCountLabel(stepGroup.entries.length);
            stepHeadingText.append(stepTitle, stepCount);
            const stepContent = document.createElement('div');
            stepContent.className = 'step-content group-content';
            stepContent.id = 'step-content-' + stepIndex;
            const stepCollapseKey = archetypeKey + '::' + stepKey;
            stepHeading.append(
              stepHeadingText,
              makeGroupToggle(
                archetypeTitle.textContent + ', ' + stepTitle.textContent,
                stepContent,
                collapsedSteps,
                stepCollapseKey
              )
            );

            const states = new Map();
            for (const entry of stepGroup.entries) {
              if (!states.has(entry.item.stateId)) states.set(entry.item.stateId, []);
              states.get(entry.item.stateId).push(entry);
            }

            const stateGroups = [...states.entries()];
            if (stateGroups.length === 1) {
              const grid = document.createElement('div');
              grid.className = 'grid step-direct-grid';
              for (const { item, index } of stateGroups[0][1]) grid.append(makeCard(item, index));
              stepContent.append(grid);
            } else {
              for (const [stateIdValue, stateEntries] of stateGroups) {
                const stateSection = document.createElement('section');
                stateSection.className = 'state-group';
                const stateHeader = document.createElement('div');
                stateHeader.className = 'state-header';
                const stateHeading = document.createElement('div');
                stateHeading.className = 'group-heading';
                const stateTitle = document.createElement('h5');
                stateTitle.textContent = stateEntries[0].item.stateLabel;
                const stateCount = document.createElement('span');
                stateCount.className = 'group-count';
                stateCount.textContent = captureCountLabel(stateEntries.length);
                stateHeading.append(stateTitle, stateCount);
                const stateContent = document.createElement('div');
                stateContent.className = 'state-content group-content';
                stateContent.id = 'state-content-' + stateIndex;
                const stateCollapseKey = archetypeKey + '::' + stateIdValue;
                stateHeader.append(
                  stateHeading,
                  makeGroupToggle(
                    archetypeTitle.textContent + ', ' + stepTitle.textContent + ', ' + stateTitle.textContent,
                    stateContent,
                    collapsedStates,
                    stateCollapseKey
                  )
                );
                const grid = document.createElement('div');
                grid.className = 'grid';
                for (const { item, index } of stateEntries) grid.append(makeCard(item, index));
                stateContent.append(grid);
                stateSection.append(stateHeader, stateContent);
                stepContent.append(stateSection);
                stateIndex += 1;
              }
            }

            stepSection.append(stepHeading, stepContent);
            archetypeContent.append(stepSection);
            stepIndex += 1;
          }

          archetypeSection.append(archetypeHeader, archetypeContent);
          moduleContent.append(archetypeSection);
          archetypeIndex += 1;
        }

        moduleSection.append(moduleHeader, moduleContent);
        gallery.append(moduleSection);
        moduleIndex += 1;
      }
    }

    for (const [key, control] of Object.entries(controls)) {
      control.addEventListener('change', () => {
        normalizeSelections(key);
        refreshFilterOptions();
        render();
      });
    }
    resetFilters.addEventListener('click', () => {
      applyDefaultFilters();
      refreshFilterOptions();
      render();
    });
    headerToggle.addEventListener('click', () => {
      const collapsed = header.classList.toggle('collapsed');
      headerToggle.setAttribute('aria-expanded', String(!collapsed));
      headerToggle.textContent = collapsed ? 'Show filters ↓' : 'Hide filters ↑';
    });
    document.getElementById('close').addEventListener('click', closeLightbox);
    document.getElementById('previous').addEventListener('click', () => moveLightbox(-1));
    document.getElementById('next').addEventListener('click', () => moveLightbox(1));
    document.getElementById('zoom-out').addEventListener('click', () => changeLightboxZoom(-0.25));
    document.getElementById('zoom-in').addEventListener('click', () => changeLightboxZoom(0.25));
    document.getElementById('zoom-fit').addEventListener('click', () => fitLightboxImage());
    document.getElementById('zoom-fit-width').addEventListener('click', () => fitLightboxWidth());
    lightboxImage.addEventListener('load', () => fitLightboxImage());
    lightboxStage.addEventListener('click', event => {
      if (event.target === lightboxStage || event.target === lightboxCanvas) closeLightbox();
    });
    lightboxStage.addEventListener('wheel', event => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      changeLightboxZoom(event.deltaY < 0 ? 0.25 : -0.25);
    }, { passive: false });
    window.addEventListener('resize', () => {
      if (lightbox.classList.contains('open')) sizeLightboxImage(lightboxFitMode, true);
    });
    function trapLightboxFocus(event) {
      const focusable = [...lightbox.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !lightbox.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', event => {
      if (!lightbox.classList.contains('open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (event.key === 'Tab') {
        trapLightboxFocus(event);
        return;
      }
      if (event.key === 'ArrowLeft') moveLightbox(-1);
      else if (event.key === 'ArrowRight') moveLightbox(1);
      else if (event.key === '+' || event.key === '=') changeLightboxZoom(0.25);
      else if (event.key === '-') changeLightboxZoom(-0.25);
      else if (event.key === '0') fitLightboxImage();
      else if (event.key.toLowerCase() === 'w') fitLightboxWidth();
      else return;
      event.preventDefault();
    });
    initializeCollapsedGroups();
    refreshFilterOptions();
    applyDefaultFilters();
    refreshFilterOptions();
    render();
  </script>
</body>
</html>`;

fs.mkdirSync(SOLVERS_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_HTML, html);
console.log(
	`Generated manifest-backed solver gallery with ${manifest.artifacts.length} artifacts: ${OUTPUT_HTML}`,
);
