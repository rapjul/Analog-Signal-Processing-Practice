import fs from "node:fs";
import path from "node:path";

/**
 * Visual Inspection Gallery Generator for SignalLab Solved Problems.
 *
 * Scans `tests/e2e/screenshots/solvers/` and generates a standalone, interactive
 * `index.html` report with side-by-side theme comparison, 3-milestone progression rows,
 * high-resolution zoom lightbox, and full keyboard navigation (keys 1-6, 0, D, L, S, Esc, Arrows).
 */

const SOLVERS_DIR = path.resolve(
	process.cwd(),
	"tests/e2e/screenshots/solvers",
);
const OUTPUT_HTML = path.join(SOLVERS_DIR, "index.html");

interface ScreenshotItem {
	module: string;
	archetype: string;
	shotType: string;
	theme: "dark" | "light";
	viewport: string;
	relativePath: string;
	fileName: string;
}

interface MilestoneDefinition {
	id: string;
	title: string;
	badge: string;
	badgeClass: string;
	description: string;
}

const MILESTONES: MilestoneDefinition[] = [
	{
		id: "01_interactive_setup",
		title: "Initial Problem Setup",
		badge: "1",
		badgeClass: "setup",
		description:
			"Active problem card with initial step inputs, formula prompts, and formula drawer access.",
	},
	{
		id: "02_misconception_feedback",
		title: "Misconception Diagnostic",
		badge: "2",
		badgeClass: "misconception",
		description:
			"Stepped Intelligent Tutoring System with multi-tiered hints and diagnostic error banners.",
	},
	{
		id: "03_full_solution",
		title: "Full Solution & Response Visualizer",
		badge: "3",
		badgeClass: "full_solution",
		description:
			"Complete zero-guesswork step breakdown and deferred HTML5 canvas response curves.",
	},
];

/**
 * Scans directory recursively for generated solver screenshot PNGs.
 *
 * @param {string} dir - Directory to scan.
 * @returns {ScreenshotItem[]} List of parsed screenshot items.
 */
function scanScreenshots(dir: string): ScreenshotItem[] {
	if (!fs.existsSync(dir)) return [];
	const items: ScreenshotItem[] = [];

	const modules = fs.readdirSync(dir, { withFileTypes: true });
	for (const mod of modules) {
		if (!mod.isDirectory()) continue;
		const modPath = path.join(dir, mod.name);
		const archetypes = fs.readdirSync(modPath, { withFileTypes: true });

		for (const arch of archetypes) {
			if (!arch.isDirectory()) continue;
			const archPath = path.join(modPath, arch.name);
			const files = fs.readdirSync(archPath);

			for (const file of files) {
				if (!file.endsWith(".png")) continue;
				// Format: 01_interactive_setup__dark__desktop-1280x800.png
				const parts = file.replace(".png", "").split("__");
				if (parts.length >= 3) {
					const shotType = parts[0];
					const theme = parts[1] as "dark" | "light";
					const viewport = parts[2];
					const relativePath = `${mod.name}/${arch.name}/${file}`;

					items.push({
						module: mod.name,
						archetype: arch.name,
						shotType,
						theme,
						viewport,
						relativePath,
						fileName: file,
					});
				}
			}
		}
	}
	return items;
}

/**
 * Formats a raw slug into a human-readable title.
 *
 * @param {string} slug - Raw slug string.
 * @returns {string} Formatted title string.
 */
function formatTitle(slug: string): string {
	return slug
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

// ── Standalone Gallery Stylesheet (Prettier CSS Formatted) ──────
const GALLERY_STYLES = /* css */ `
  /* ── Core CSS Variables & Reset ────────────────────────── */
  :root {
    --bg-dark: #090d16;
    --bg-black: #000000;
    --bg-card: #131b2e;
    --bg-card-hover: #1c2742;
    --bg-row: rgba(9, 13, 22, 0.5);
    --bg-item: rgba(0, 0, 0, 0.4);
    --bg-subtle: rgba(255, 255, 255, 0.03);
    --bg-header: rgba(9, 13, 22, 0.94);

    --border-color: #1e293b;
    --border-subtle: #192238;
    --border-focus: #38bdf8;

    --text-bright: #ffffff;
    --text-main: #f1f5f9;
    --text-muted: #94a3b8;

    --accent-cyan: #06b6d4;
    --accent-cyan-hover: #0891b2;
    --accent-cyan-bg: rgba(6, 182, 212, 0.15);
    --accent-cyan-border-subtle: rgba(6, 182, 212, 0.4);
    --accent-emerald: #10b981;
    --accent-emerald-bg: rgba(16, 185, 129, 0.15);
    --accent-amber: #f59e0b;
    --accent-amber-bg: rgba(245, 158, 11, 0.15);
    --accent-rose: #f43f5e;

    --tag-dark-bg: rgba(0, 0, 0, 0.6);
    --tag-dark-text: #94a3b8;
    --tag-dark-border: #334155;
    --tag-light-bg: rgba(255, 255, 255, 0.9);
    --tag-light-text: #0f172a;
    --tag-light-border: #cbd5e1;

    --lightbox-bg: rgba(0, 0, 0, 0.96);
    --lightbox-btn-bg: rgba(19, 27, 46, 0.85);

    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --radius-pill: 999px;

    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5);

    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;

    --header-height: 80px;

    --scroll-padding-extra: 24px;

    --gallery-scroll-offset: calc(var(--header-height) + var(--scroll-padding-extra));
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background-color: var(--bg-dark);
    color: var(--text-main);
    font-family: var(--font-sans);
    line-height: 1.5;
    padding: 24px;
    min-height: 100vh;
  }

  /* ── Sticky Navigation & Control Header ───────────────── */
  header.gallery-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--bg-header);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border-color);
    padding: 16px 24px;
    margin: -24px -24px 32px -24px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .header-branding h1 {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-bright);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-branding .badge {
    background: var(--accent-cyan-bg);
    border: 1px solid var(--accent-cyan);
    color: var(--accent-cyan);
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: var(--radius-pill);
  }

  .header-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }

  .control-pill-group {
    display: flex;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    overflow: hidden;
    padding: 2px;
  }

  .btn-pill {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 6px 14px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
  }

  .btn-pill:hover {
    color: var(--text-bright);
    background: var(--bg-subtle);
  }

  .btn-pill.active {
    background: var(--accent-cyan);
    color: var(--bg-black);
    font-weight: 700;
  }

  .keyboard-hint {
    color: var(--text-muted);
    font-size: 0.8rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  kbd {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.75rem;
    color: var(--accent-cyan);
  }

  /* ── Gallery Layout & Sections ────────────────────────── */
  .module-section {
    margin-bottom: 48px;
    scroll-margin-top: var(--gallery-scroll-offset);
  }

  .btn-jump {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-family: inherit;
    transition: all 0.15s ease;
  }

  .btn-jump:hover {
    color: var(--text-bright);
    background: var(--bg-subtle);
  }

  .module-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--accent-cyan);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 8px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .archetype-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 24px;
    margin-bottom: 32px;
    box-shadow: var(--shadow-sm);
    scroll-margin-top: var(--gallery-scroll-offset);
  }

  .archetype-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: 12px;
  }

  .archetype-title {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--text-bright);
  }

  /* ── Milestone Progression Rows ───────────────────────── */
  .milestones-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .milestone-row {
    background: var(--bg-row);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 16px;
    transition: border-color 0.2s ease;
  }

  .milestone-row:hover {
    border-color: var(--accent-cyan-border-subtle);
  }

  .milestone-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .milestone-badge {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-pill);
    font-size: 0.8rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .milestone-badge.setup {
    background: var(--accent-cyan-bg);
    color: var(--accent-cyan);
    border: 1px solid var(--accent-cyan);
  }

  .milestone-badge.misconception {
    background: var(--accent-amber-bg);
    color: var(--accent-amber);
    border: 1px solid var(--accent-amber);
  }

  .milestone-badge.full_solution {
    background: var(--accent-emerald-bg);
    color: var(--accent-emerald);
    border: 1px solid var(--accent-emerald);
  }

  .milestone-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .milestone-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-bright);
  }

  .milestone-desc {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* ── Milestone Grid Layout ────────────────────────────── */
  .snapshots-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }

  .snapshot-item {
    background: var(--bg-item);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease;
  }

  .snapshot-item:hover {
    transform: translateY(-2px);
    border-color: var(--accent-cyan);
  }

  .snapshot-meta {
    padding: 8px 12px;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-subtle);
    border-bottom: 1px solid var(--border-color);
  }

  .shot-tag {
    font-weight: 600;
    color: var(--text-bright);
  }

  .theme-tag {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.65rem;
    text-transform: uppercase;
    font-weight: 700;
  }

  .theme-tag.dark {
    background: var(--tag-dark-bg);
    color: var(--tag-dark-text);
    border: 1px solid var(--tag-dark-border);
  }

  .theme-tag.light {
    background: var(--tag-light-bg);
    color: var(--tag-light-text);
    border: 1px solid var(--tag-light-border);
  }

  .snapshot-img-wrapper {
    position: relative;
    cursor: zoom-in;
    overflow: hidden;
    max-height: 420px;
    background: var(--bg-black);
  }

  .snapshot-img-wrapper img {
    width: 100%;
    height: auto;
    display: block;
    transition: opacity 0.2s ease;
  }

  .snapshot-img-wrapper:hover img {
    opacity: 0.9;
  }

  /* ── Lightbox Modal & Controls ────────────────────────── */
  .lightbox-modal {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: var(--lightbox-bg);
    backdrop-filter: blur(10px);
    padding: 24px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  .lightbox-modal.active {
    display: flex;
  }

  .lightbox-content {
    max-width: 95vw;
    max-height: 85vh;
    overflow: auto;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
  }

  .lightbox-content img {
    width: 100%;
    height: auto;
    display: block;
  }

  .lightbox-caption {
    margin-top: 14px;
    color: var(--text-muted);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 95vw;
    gap: 12px;
  }

  .lightbox-counter {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    color: var(--accent-cyan);
  }

  .lightbox-nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: var(--lightbox-btn-bg);
    border: 1px solid var(--border-color);
    color: var(--text-bright);
    font-size: 1.8rem;
    padding: 16px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    z-index: 1010;
  }

  .lightbox-nav-btn:hover {
    background: var(--accent-cyan);
    color: var(--bg-black);
    border-color: var(--accent-cyan);
  }

  .lightbox-nav-prev {
    left: 20px;
  }

  .lightbox-nav-next {
    right: 20px;
  }

  .btn-close-lightbox {
    position: absolute;
    top: 24px;
    right: 24px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-bright);
    font-size: 1.1rem;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    z-index: 1010;
  }

  .btn-close-lightbox:hover {
    background: var(--accent-rose);
    border-color: var(--accent-rose);
  }
`;

// ── Standalone Gallery Script (Prettier JavaScript Formatted) ──
const GALLERY_SCRIPT = /* javascript */ `
  // ── Dynamic Sticky Header Offset Measurement ───────────
  function updateHeaderOffset() {
    const header = document.querySelector('header.gallery-header');
    if (header) {
      const height = header.offsetHeight;
      document.documentElement.style.setProperty('--header-height', height + 'px');
    }
  }

  window.addEventListener('resize', updateHeaderOffset);
  window.addEventListener('DOMContentLoaded', updateHeaderOffset);
  if (typeof ResizeObserver !== 'undefined') {
    const header = document.querySelector('header.gallery-header');
    if (header) {
      new ResizeObserver(updateHeaderOffset).observe(header);
    }
  }
  updateHeaderOffset();

  // ── Combined Filtering State (Theme & Viewport) ─────────
  let currentTheme = 'all';
  let currentViewport = 'all';

  function applyFilters() {
    document.querySelectorAll('#theme-filters .btn-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeFilter === currentTheme);
    });
    document.querySelectorAll('#viewport-filters .btn-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viewportFilter === currentViewport);
    });

    document.querySelectorAll('.snapshot-item').forEach(item => {
      const themeMatch = (currentTheme === 'all' || item.dataset.theme === currentTheme);
      const viewportMatch = (currentViewport === 'all' || item.dataset.viewport.includes(currentViewport));
      if (themeMatch && viewportMatch) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });

    // Hide milestone rows that have no visible items
    document.querySelectorAll('.milestone-row').forEach(row => {
      const hasVisible = Array.from(row.querySelectorAll('.snapshot-item')).some(item => item.style.display !== 'none');
      row.style.display = hasVisible ? 'block' : 'none';
    });

    // Hide archetype cards that have no visible items
    document.querySelectorAll('.archetype-card').forEach(card => {
      const hasVisible = Array.from(card.querySelectorAll('.snapshot-item')).some(item => item.style.display !== 'none');
      card.style.display = hasVisible ? 'block' : 'none';
    });
  }

  function setThemeFilter(theme) {
    currentTheme = theme;
    applyFilters();
  }

  function setViewportFilter(viewport) {
    currentViewport = viewport;
    applyFilters();
  }

  document.querySelectorAll('#theme-filters .btn-pill').forEach(btn => {
    btn.addEventListener('click', () => setThemeFilter(btn.dataset.themeFilter));
  });

  document.querySelectorAll('#viewport-filters .btn-pill').forEach(btn => {
    btn.addEventListener('click', () => setViewportFilter(btn.dataset.viewportFilter));
  });

  // ── Jump to Solver Module ───────────────────────────────
  function jumpToModule(modKey) {
    if (modKey === '0') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const target = document.getElementById('module-' + modKey);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ── Lightbox State & Navigation ─────────────────────────
  let activeLightboxIndex = -1;

  function getVisibleItems() {
    return Array.from(document.querySelectorAll('.snapshot-item')).filter(
      item => item.style.display !== 'none'
    );
  }

  function openLightboxByIndex(index) {
    const visible = getVisibleItems();
    if (visible.length === 0) return;
    if (index < 0) index = visible.length - 1;
    if (index >= visible.length) index = 0;
    activeLightboxIndex = index;

    const item = visible[index];
    const img = item.querySelector('img');
    const caption = item.dataset.caption || img.alt;
    const src = img.src;

    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-caption').innerHTML =
      '<span>' + caption + '</span><span class="lightbox-counter">' + (index + 1) + ' / ' + visible.length + '</span>';
    document.getElementById('lightbox').classList.add('active');
  }

  function openLightboxFromElement(elem) {
    const visible = getVisibleItems();
    const idx = visible.indexOf(elem);
    openLightboxByIndex(idx !== -1 ? idx : 0);
  }

  function nextLightbox() {
    openLightboxByIndex(activeLightboxIndex + 1);
  }

  function prevLightbox() {
    openLightboxByIndex(activeLightboxIndex - 1);
  }

  function nextMilestoneLightbox(direction) {
    const visible = getVisibleItems();
    if (activeLightboxIndex < 0 || activeLightboxIndex >= visible.length) return;
    const currentItem = visible[activeLightboxIndex];
    const currTheme = currentItem.dataset.theme;
    const currViewport = currentItem.dataset.viewport;
    const currentCard = currentItem.closest('.archetype-card');
    const currentMilestoneRow = currentItem.closest('.milestone-row');

    if (!currentCard || !currentMilestoneRow) {
      openLightboxByIndex(activeLightboxIndex + direction);
      return;
    }

    const rows = Array.from(currentCard.querySelectorAll('.milestone-row')).filter(r => r.style.display !== 'none');
    const currRowIdx = rows.indexOf(currentMilestoneRow);
    const targetRowIdx = currRowIdx + direction;

    if (targetRowIdx >= 0 && targetRowIdx < rows.length) {
      // Move within the current card's rows
      const targetRow = rows[targetRowIdx];
      const match = Array.from(targetRow.querySelectorAll('.snapshot-item')).find(
        it => it.dataset.theme === currTheme && it.dataset.viewport === currViewport && it.style.display !== 'none'
      ) || Array.from(targetRow.querySelectorAll('.snapshot-item')).find(
        it => it.dataset.viewport === currViewport && it.style.display !== 'none'
      ) || targetRow.querySelector('.snapshot-item');

      if (match) {
        const newIdx = visible.indexOf(match);
        if (newIdx !== -1) {
          openLightboxByIndex(newIdx);
          return;
        }
      }
    } else {
      // Jump across cards/solvers while preserving the exact current viewport and theme!
      const allCards = Array.from(document.querySelectorAll('.archetype-card')).filter(c => c.style.display !== 'none');
      const currCardIdx = allCards.indexOf(currentCard);
      if (currCardIdx !== -1 && allCards.length > 1) {
        let targetCardIdx = currCardIdx + direction;
        if (targetCardIdx < 0) targetCardIdx = allCards.length - 1;
        if (targetCardIdx >= allCards.length) targetCardIdx = 0;

        const targetCard = allCards[targetCardIdx];
        const targetRows = Array.from(targetCard.querySelectorAll('.milestone-row')).filter(r => r.style.display !== 'none');
        if (targetRows.length > 0) {
          // If going down, pick the first row of the next card; if going up, pick the last row of the previous card
          const targetRow = direction > 0 ? targetRows[0] : targetRows[targetRows.length - 1];
          const match = Array.from(targetRow.querySelectorAll('.snapshot-item')).find(
            it => it.dataset.theme === currTheme && it.dataset.viewport === currViewport && it.style.display !== 'none'
          ) || Array.from(targetCard.querySelectorAll('.snapshot-item')).find(
            it => it.dataset.viewport === currViewport && it.style.display !== 'none'
          ) || targetCard.querySelector('.snapshot-item');

          if (match) {
            const newIdx = visible.indexOf(match);
            if (newIdx !== -1) {
              openLightboxByIndex(newIdx);
              return;
            }
          }
        }
      }
    }
    openLightboxByIndex(activeLightboxIndex + direction);
  }

  function closeLightbox(e) {
    if (!e || e.target.id === 'lightbox' || e.target.classList.contains('btn-close-lightbox')) {
      document.getElementById('lightbox').classList.remove('active');
    }
  }

  // ── Keyboard Navigation Shortcuts (Arrows, Numbers, Themes)
  function scrollArchetype(direction) {
    const cards = Array.from(document.querySelectorAll('.archetype-card')).filter(c => c.style.display !== 'none');
    if (cards.length === 0) return;
    const scrollPos = window.scrollY + 140;
    let targetIdx = 0;
    if (direction > 0) {
      targetIdx = cards.findIndex(c => c.offsetTop > scrollPos);
      if (targetIdx === -1) targetIdx = cards.length - 1;
    } else {
      for (let i = cards.length - 1; i >= 0; i--) {
        if (cards[i].offsetTop < scrollPos - 20) {
          targetIdx = i;
          break;
        }
      }
    }
    cards[targetIdx]?.scrollIntoView({ behavior: 'smooth' });
  }

  document.addEventListener('keydown', (e) => {
    const isLightboxActive = document.getElementById('lightbox').classList.contains('active');

    if (isLightboxActive) {
      if (e.key === 'Escape') {
        closeLightbox();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextLightbox();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevLightbox();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextMilestoneLightbox(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextMilestoneLightbox(-1);
        return;
      }
      return;
    }

    // When Lightbox is closed:
    if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
      scrollArchetype(1);
      return;
    }
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
      scrollArchetype(-1);
      return;
    }

    // Keys 1-6: Jump to solver module
    const moduleKeys = {
      '1': 'odes',
      '2': 'fourier-series',
      '3': 'convolution',
      '4': 'laplace',
      '5': 'fourier-transform',
      '6': 'circuits'
    };

    if (moduleKeys[e.key]) {
      jumpToModule(moduleKeys[e.key]);
    } else if (e.key === '0') {
      jumpToModule('0');
    } else if (e.key.toLowerCase() === 'd') {
      setThemeFilter('dark');
    } else if (e.key.toLowerCase() === 'l') {
      setThemeFilter('light');
    } else if (e.key.toLowerCase() === 's') {
      setThemeFilter('all');
    }
  });
`;

/**
 * Generates the complete HTML gallery document.
 *
 * @param {ScreenshotItem[]} items - List of scanned screenshot items.
 * @returns {string} Complete HTML document.
 */
function generateHtml(items: ScreenshotItem[]): string {
	const moduleMap: Record<string, Record<string, ScreenshotItem[]>> = {};

	for (const item of items) {
		if (!moduleMap[item.module]) {
			moduleMap[item.module] = {};
		}
		if (!moduleMap[item.module][item.archetype]) {
			moduleMap[item.module][item.archetype] = [];
		}
		moduleMap[item.module][item.archetype].push(item);
	}

	const modulesList = Object.keys(moduleMap);

	return /* html */ `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>SignalLab — Automated Solved-Problem Visual Inspection Gallery</title>
		<style>
${GALLERY_STYLES}
		</style>
	</head>
	<body>

		<!-- Sticky Gallery Header & Keyboard Nav -->
		<header class="gallery-header">
			<div class="header-branding">
				<h1>
					SignalLab Solved-Problem Visual Inspection Gallery
					<span class="badge">Retina 2x</span>
				</h1>
			</div>

			<div class="header-controls">
				<!-- Theme Filter -->
				<div class="control-pill-group" id="theme-filters">
					<button class="btn-pill active" data-theme-filter="all">All Themes (S)</button>
					<button class="btn-pill" data-theme-filter="dark">Dark (D)</button>
					<button class="btn-pill" data-theme-filter="light">Light (L)</button>
				</div>

				<!-- Viewport Filter -->
				<div class="control-pill-group" id="viewport-filters">
					<button class="btn-pill active" data-viewport-filter="all">All Devices</button>
					<button class="btn-pill" data-viewport-filter="desktop">Desktop</button>
					<button class="btn-pill" data-viewport-filter="tablet">Tablet</button>
					<button class="btn-pill" data-viewport-filter="mobile">320px Mobile</button>
				</div>

				<!-- Module Shortcuts Hint -->
				<div class="keyboard-hint">
					<span>Jump to solver:</span>
					<button class="btn-jump" onclick="jumpToModule('odes')"><kbd>1</kbd> ODEs</button>
					<button class="btn-jump" onclick="jumpToModule('fourier-series')"><kbd>2</kbd> Fourier</button>
					<button class="btn-jump" onclick="jumpToModule('convolution')"><kbd>3</kbd> Conv</button>
					<button class="btn-jump" onclick="jumpToModule('laplace')"><kbd>4</kbd> Laplace</button>
					<button class="btn-jump" onclick="jumpToModule('fourier-transform')"><kbd>5</kbd> CTFT</button>
					<button class="btn-jump" onclick="jumpToModule('circuits')"><kbd>6</kbd> Circuits</button>
					<button class="btn-jump" onclick="jumpToModule('0')"><kbd>0</kbd> All</button>
				</div>
			</div>
		</header>

		<!-- Main Content -->
		<main id="gallery-main">
			${modulesList
				.map((modName) => {
					const archetypes = moduleMap[modName];
					return `
			<section class="module-section" id="module-${modName}" data-module="${modName}">
				<h2 class="module-title">
					<span>${formatTitle(modName)} Module</span>
					<span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 400;">
						${Object.keys(archetypes).length} Archetypes
					</span>
				</h2>

				${Object.entries(archetypes)
					.map(([archName, shots]) => {
						// Group shots by milestone definition
						const milestoneMap: Record<string, ScreenshotItem[]> = {
							"01_interactive_setup": [],
							"02_misconception_feedback": [],
							"03_full_solution": [],
						};
						for (const shot of shots) {
							if (!milestoneMap[shot.shotType]) {
								milestoneMap[shot.shotType] = [];
							}
							milestoneMap[shot.shotType].push(shot);
						}

						return `
				<div class="archetype-card" data-archetype="${archName}">
					<div class="archetype-header">
						<h3 class="archetype-title">${formatTitle(archName)}</h3>
					</div>

					<div class="milestones-container">
						${MILESTONES.map((mDef) => {
							const groupShots = milestoneMap[mDef.id] || [];
							if (groupShots.length === 0) return "";

							return `
						<div class="milestone-row" data-milestone="${mDef.id}">
							<div class="milestone-header">
								<span class="milestone-badge ${mDef.badgeClass}">${mDef.badge}</span>
								<div class="milestone-info">
									<h4 class="milestone-title">${mDef.title}</h4>
									<span class="milestone-desc">${mDef.description}</span>
								</div>
							</div>

							<div class="snapshots-grid">
								${groupShots
									.map((shot) => {
										const caption = `${formatTitle(archName)} — ${mDef.title} (${shot.theme}, ${shot.viewport})`;
										return `
								<div class="snapshot-item" data-theme="${shot.theme}" data-viewport="${shot.viewport}" data-caption="${caption}">
									<div class="snapshot-meta">
										<span class="shot-tag">${shot.viewport}</span>
										<span class="theme-tag ${shot.theme}">${shot.theme}</span>
									</div>
									<div class="snapshot-img-wrapper" onclick="openLightboxFromElement(this.closest('.snapshot-item'))">
										<img src="${shot.relativePath}" alt="${shot.fileName}" loading="lazy">
									</div>
								</div>
										`;
									})
									.join("")}
							</div>
						</div>
							`;
						}).join("")}
					</div>
				</div>
						`;
					})
					.join("")}
			</section>
					`;
				})
				.join("")}
		</main>

		<!-- Lightbox Zoom Modal -->
		<div class="lightbox-modal" id="lightbox" onclick="closeLightbox(event)">
			<button class="btn-close-lightbox" onclick="closeLightbox(event)">✕ Close (Esc)</button>
			<button class="lightbox-nav-btn lightbox-nav-prev" onclick="prevLightbox()" title="Previous (←)">‹</button>
			<button class="lightbox-nav-btn lightbox-nav-next" onclick="nextLightbox()" title="Next (→)">›</button>
			<div class="lightbox-content">
				<img id="lightbox-img" src="" alt="Zoomed screenshot">
			</div>
			<div class="lightbox-caption" id="lightbox-caption"></div>
		</div>

		<script>
${GALLERY_SCRIPT}
		</script>
	</body>
</html>
`;
}

/**
 * Main execution function.
 */
function main(): void {
	console.log("🔍 Scanning solver screenshots in:", SOLVERS_DIR);
	if (!fs.existsSync(SOLVERS_DIR)) {
		fs.mkdirSync(SOLVERS_DIR, { recursive: true });
	}
	const items = scanScreenshots(SOLVERS_DIR);
	console.log(`📸 Found ${items.length} solver screenshots.`);

	const html = generateHtml(items);
	fs.writeFileSync(OUTPUT_HTML, html, "utf-8");
	console.log(
		`✅ Visual inspection gallery generated at:\n   ${OUTPUT_HTML}`,
	);
}

main();
