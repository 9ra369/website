#!/usr/bin/env node
// Phase 1 of the topic/tool/type taxonomy rollout: builds prototype/tools/{tool}.html
// listing pages. Unlike topics (a fixed list), tools are an open vocabulary
// (scripts/lib/taxonomy.js TAG_TO_TOOLS) — this script derives the page set
// from whatever tool slugs actually appear across loadAllEntries(), so a new
// tool tag automatically gets a page next run. Card pattern follows
// scripts/22-build-guides.js / scripts/26-build-topics.js.
//
// Usage: node scripts/27-build-tools.js

const fs = require("fs");
const path = require("path");
const { loadAllEntries } = require("./lib/entries");
const { SITE_HEADER, SITE_FOOTER, CATEGORY_LABELS, CATEGORY_THUMB, escapeHtml, cardThumbHtml } = require("./lib/render-tip");
const { TOOL_LABELS } = require("./lib/taxonomy");

const OUT_DIR = path.resolve(__dirname, "..", "prototype", "tools");

function toolLabel(slug) {
  return TOOL_LABELS[slug] || slug;
}

function renderCard(e) {
  const thumbClass = CATEGORY_THUMB[e.category] || "thumb-tips";
  const catLabel = CATEGORY_LABELS[e.category] || e.category;
  const thumbInner = cardThumbHtml(e.image, "../");

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
            <div class="entry-footer"><span>${escapeHtml(e.date)}</span></div>
          </div>
        </a>`;
}

function renderToolPage(slug, entries) {
  const label = toolLabel(slug);
  const cardsHtml = entries.map(renderCard).join("\n\n");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(label)} — Merge VFX&amp;CG</title>
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
      <a href="index.html">ツール</a>
      <span class="sep">/</span>
      <span class="current">${escapeHtml(label)}</span>
    </nav>
    <span class="category-pill">TOOL</span>
    <h1>${escapeHtml(label)}</h1>
  </div>
</div>

<div class="container">
  <div style="padding: 24px 0 80px;">
    <p class="result-count" style="margin-bottom: 24px;"><strong>${entries.length}</strong> 件のポスト</p>
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

function renderIndexPage(rows) {
  const rowsHtml = rows
    .map(
      (r) =>
        `      <a class="related-mini" href="${r.slug}.html" style="border-top: 0.5px solid var(--color-border); padding: 12px 0;">
        <div>
          <h5 style="font-size: 14px;">${escapeHtml(r.label)}</h5>
          <span class="cat">${r.count} 件</span>
        </div>
      </a>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ツールで探す — Merge VFX&amp;CG</title>
<link rel="icon" type="image/png" href="../images/icon-nodegraph.png">
<link rel="stylesheet" href="../style.css">
</head>
<body data-root="../">
${SITE_HEADER(1)}
<div class="archive-head">
  <div class="container">
    <h1>ツールで探す</h1>
    <p>記事に登場するソフトウェア・技術別の一覧です。</p>
  </div>
</div>
<div class="container">
  <div style="max-width: 720px; padding: 40px 0 96px;">
${rowsHtml}
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
  const all = loadAllEntries();

  const slugs = new Set();
  for (const e of all) for (const t of e.tools || []) slugs.add(t);

  const rows = [];
  for (const slug of Array.from(slugs).sort()) {
    const entries = all.filter((e) => (e.tools || []).includes(slug));
    rows.push({ slug, label: toolLabel(slug), count: entries.length });
    const html = renderToolPage(slug, entries);
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), html, "utf8");
    console.log(`Wrote tools/${slug}.html (${entries.length} entries)`);
  }

  rows.sort((a, b) => b.count - a.count);
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), renderIndexPage(rows), "utf8");
  console.log(`Wrote tools/index.html`);
}

main();
