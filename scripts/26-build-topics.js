#!/usr/bin/env node
// Phase 1 of the topic/tool/type taxonomy rollout: builds prototype/topics/{topic}.html
// listing pages, one per axis-A value in scripts/lib/taxonomy.js, plus a
// prototype/topics/index.html directory of all of them. Card rendering
// pattern follows scripts/22-build-guides.js.
//
// Usage: node scripts/26-build-topics.js

const fs = require("fs");
const path = require("path");
const { loadAllEntries } = require("./lib/entries");
const { SITE_HEADER, SITE_FOOTER, CATEGORY_LABELS, CATEGORY_THUMB, escapeHtml, cardThumbHtml } = require("./lib/render-tip");
const { TOPICS } = require("./lib/taxonomy");

const OUT_DIR = path.resolve(__dirname, "..", "prototype", "topics");

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

function renderTopicPage(topic, entries) {
  const cardsHtml = entries.map(renderCard).join("\n\n");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(topic.label)} — Merge VFX&amp;CG</title>
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
      <a href="index.html">トピック</a>
      <span class="sep">/</span>
      <span class="current">${escapeHtml(topic.label)}</span>
    </nav>
    <span class="category-pill">TOPIC</span>
    <h1>${escapeHtml(topic.label)}</h1>
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
<title>トピックで探す — Merge VFX&amp;CG</title>
<link rel="icon" type="image/png" href="../images/icon-nodegraph.png">
<link rel="stylesheet" href="../style.css">
</head>
<body data-root="../">
${SITE_HEADER(1)}
<div class="archive-head">
  <div class="container">
    <h1>トピックで探す</h1>
    <p>記事の主題（領域）別の一覧です。</p>
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

  const rows = [];
  for (const topic of TOPICS) {
    const entries = all.filter((e) => (e.topics || []).includes(topic.slug));
    rows.push({ slug: topic.slug, label: topic.label, count: entries.length });
    if (entries.length === 0) {
      console.warn(`⚠ topic "${topic.slug}": 0 matching entries.`);
    }
    const html = renderTopicPage(topic, entries);
    fs.writeFileSync(path.join(OUT_DIR, `${topic.slug}.html`), html, "utf8");
    console.log(`Wrote topics/${topic.slug}.html (${entries.length} entries)`);
  }

  rows.sort((a, b) => b.count - a.count);
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), renderIndexPage(rows), "utf8");
  console.log(`Wrote topics/index.html`);
}

main();
