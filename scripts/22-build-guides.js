#!/usr/bin/env node
// Builds the "hub"/guide pages under prototype/guides/ — hand-picked or
// rule-derived roundups of existing entries, per scripts/lib/guides-data.js.
// These are what the header nav's 4 curated links (and the homepage's
// "Start here" section) point to, replacing a generic archive/category-tree
// link per the site's nav redesign (2026-08-30).
//
// Usage: node scripts/22-build-guides.js

const fs = require("fs");
const path = require("path");
const { loadAllEntries } = require("./lib/entries");
const { SITE_HEADER, SITE_FOOTER, CATEGORY_LABELS, CATEGORY_THUMB, escapeHtml } = require("./lib/render-tip");
const { GUIDES } = require("./lib/guides-data");

const OUT_DIR = path.resolve(__dirname, "..", "prototype", "guides");
const TODAY = "2026-08-28"; // "最終更新" — bump when guides-data.js curation changes

function renderCard(e) {
  const thumbClass = CATEGORY_THUMB[e.category] || "thumb-tips";
  const catLabel = CATEGORY_LABELS[e.category] || e.category;
  const thumbInner = e.image ? `<img src="../${escapeHtml(e.image)}" alt="">` : "";
  const tagsHtml = e.tags
    .slice(0, 3)
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("\n              ");

  return `        <a class="entry-card" href="../${e.href}">
          <div class="entry-thumb ${thumbClass}">
            ${thumbInner}
          </div>
          <div class="entry-body">
            <div class="entry-meta-row">
              <span class="entry-category">${escapeHtml(catLabel)}</span>
            </div>
            <h3>${escapeHtml(e.title)}</h3>
            <p class="entry-summary">${escapeHtml(e.summary)}</p>
            <div class="entry-tags">
              ${tagsHtml}
            </div>
            <div class="entry-footer"><span>${escapeHtml(e.date)}</span></div>
          </div>
        </a>`;
}

function renderGuidePage(guide, entries) {
  const cardsHtml = entries.map(renderCard).join("\n\n");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(guide.title)} — Merge VFX&amp;CG</title>
<link rel="icon" type="image/png" href="../images/icon-nodegraph.png">
<link rel="stylesheet" href="../style.css">
</head>
<body data-root="../">

${SITE_HEADER(1)}

<div class="entry-hero" style="padding-bottom: 32px;">
  <div class="container">
    <nav class="breadcrumb">
      <a href="../index.html">トップ</a>
      <span class="sep">/</span>
      <span class="current">${escapeHtml(guide.title)}</span>
    </nav>
    <span class="category-pill">GUIDE</span>
    <h1>${escapeHtml(guide.title)}</h1>
    <p style="font-size: 15px; color: var(--color-text-muted); max-width: 720px; margin: 0 0 8px;">${escapeHtml(guide.description)}</p>
  </div>
</div>

<div class="container">
  <div style="padding: 24px 0 80px;">
    <p class="result-count" style="margin-bottom: 24px;"><strong>${entries.length}</strong> 件のポストを収録　·　最終更新: ${TODAY}</p>
    <div class="entry-grid">
${cardsHtml}
    </div>
  </div>
</div>

${SITE_FOOTER(1)}

<script src="../nav.js" defer></script>
<script src="../search.js" defer></script>
</body>
</html>
`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const all = loadAllEntries(); // already date-desc sorted

  for (const guide of GUIDES) {
    const entries = guide.hrefs
      ? guide.hrefs.map((href) => {
          const e = all.find((x) => x.href === href);
          if (!e) throw new Error(`guides-data.js: "${guide.slug}" references missing href "${href}"`);
          return e;
        })
      : all.filter(guide.filter);

    if (entries.length === 0) {
      console.warn(`⚠ ${guide.slug}: 0 matching entries — check the filter/hrefs in guides-data.js`);
    }

    const html = renderGuidePage(guide, entries);
    fs.writeFileSync(path.join(OUT_DIR, `${guide.slug}.html`), html, "utf8");
    console.log(`Wrote guides/${guide.slug}.html (${entries.length} entries)`);
  }
}

main();
