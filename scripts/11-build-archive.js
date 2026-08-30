#!/usr/bin/env node
// Wires the real content (273 generated Tips pages + the 4 hand-curated
// entry-*.html pages) into prototype/archive.html's card grid, replacing
// the placeholder demo cards. First pass ("一旦"): everything on one page,
// no real pagination yet.
//
// Usage: node scripts/11-build-archive.js

const fs = require("fs");
const path = require("path");
const { parseFrontMatter, extractImages, slugifyTitle } = require("./lib/render-tip");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const ARCHIVE_FILE = path.resolve(__dirname, "..", "prototype", "archive.html");

const CATEGORY_LABELS = {
  tutorial: "Tutorial",
  pipeline: "Pipeline/Plugin/Tool",
  article: "Article",
  showreel: "Showreel/Demoreel",
  website: "Website",
  tips: "Tips",
  "daily-analysis": "毎日作品分析",
};
const CATEGORY_THUMB = {
  tutorial: "thumb-tutorial",
  pipeline: "thumb-pipeline",
  article: "thumb-article",
  showreel: "thumb-reel",
  website: "thumb-website",
  tips: "thumb-tips",
  "daily-analysis": "thumb-daily-analysis",
};

// The 4 hand-curated entries aren't part of the content/posts/ pipeline
// (they predate it), so their metadata is listed here directly.
const CURATED = [
  {
    href: "entry-cglounge.html",
    category: "website",
    title: "CG Lounge: 映画・VFX業界のプロが教えるチュートリアル・マーケットプレイス",
    summary: "映画・VFX業界のプロがチュートリアルやアセットを直接販売するマーケットプレイス。",
    tags: ["Marketplace", "Community"],
    date: "2026-08-08",
  },
  {
    href: "entry-cgworld-island.html",
    category: "article",
    title: "Houdini&Arnoldで描く大規模なフル3D自然景観「Island」制作解説",
    summary: "Spade&Co. 木川裕太氏による個人制作「Island」の技術解説記事。",
    tags: ["Houdini", "Arnold", "Environment"],
    date: "2026-08-09",
  },
  {
    href: "entry-procedural-environments.html",
    category: "tutorial",
    title: "Houdiniで学ぶプロシージャル環境制作: モデリングからレンダリングまで",
    summary: "Houdiniを用いたモデリングからレンダリングまでの背景制作ワークフローを体系的に学べるコース。",
    tags: ["Houdini", "Environment"],
    date: "2026-08-08",
  },
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadTipEntries() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const entries = [];
  const usedSlugs = new Set();
  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const { fm, body } = parseFrontMatter(raw);
    const idMatch = raw.match(/original_post:\s*"[^"]*\/status\/(\d+)"/);
    if (!idMatch) continue;
    const { images } = extractImages(body);
    let slug = slugifyTitle(fm.title || "") || idMatch[1];
    if (usedSlugs.has(slug)) slug = `${slug}_${idMatch[1]}`;
    usedSlugs.add(slug);
    entries.push({
      href: `tips/${slug}.html`,
      category: fm.category || "tips",
      title: fm.title || "(無題)",
      summary: fm.summary || "",
      tags: fm.tags || [],
      date: fm.date || "",
      image: images[0] ? `images/posts/${images[0].src.replace(/^images\/posts\//, "")}` : null,
    });
  }
  entries.sort((a, b) => (a.date < b.date ? 1 : -1));
  return entries;
}

function renderCard(e) {
  const thumbClass = CATEGORY_THUMB[e.category] || "thumb-tips";
  const catLabel = CATEGORY_LABELS[e.category] || e.category;
  const thumbInner = e.image
    ? `<img src="${escapeHtml(e.image)}" alt="">`
    : "";
  const tagsHtml = e.tags
    .slice(0, 3)
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("\n              ");
  // data-tags carries the FULL tag list (not just the 3 shown) so filtering
  // matches tags that aren't visibly printed on the card.
  const dataTags = e.tags.join("|");

  return `        <a class="entry-card" href="${e.href}" data-category="${e.category}" data-tags="${escapeHtml(dataTags)}" data-date="${escapeHtml(e.date)}" data-title="${escapeHtml(e.title)}">
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

/** Top N tags by frequency across all entries, for the sidebar tag-chip filter. */
function topTags(all, n) {
  const freq = new Map();
  for (const e of all) {
    for (const t of e.tags) freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag]) => tag);
}

function main() {
  const tips = loadTipEntries();
  const all = [...CURATED, ...tips];

  const counts = {};
  for (const e of all) counts[e.category] = (counts[e.category] || 0) + 1;

  const categoryFilterHtml = Object.keys(CATEGORY_LABELS)
    .map(
      (slug) =>
        `        <a class="filter-option" data-category="${slug}">${CATEGORY_LABELS[slug]} <span class="n">${counts[slug] || 0}</span></a>`
    )
    .join("\n");

  const tagChipsHtml = topTags(all, 24)
    .map((t) => `          <span class="chip" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`)
    .join("\n");

  const cardsHtml = all.map(renderCard).join("\n\n");

  // Normalize to LF first: if a prior git checkout/commit round-trip left this
  // file CRLF (core.autocrlf on Windows), every regex below that expects a
  // literal "\n" silently fails to match and this whole function becomes a
  // no-op — happened for real once, so guard against it rather than trust
  // the working tree's line endings.
  let html = fs.readFileSync(ARCHIVE_FILE, "utf8").replace(/\r\n/g, "\n");

  // 1) category filter counts
  html = html.replace(
    /(<div class="filter-group">\s*<h4>カテゴリ<\/h4>\n)[\s\S]*?(\n      <\/div>)/,
    `$1${categoryFilterHtml}$2`
  );

  // 2) tag chips (real, frequency-ranked)
  html = html.replace(
    /(<div class="filter-chips">\n)[\s\S]*?(\n        <\/div>)/,
    `$1${tagChipsHtml}$2`
  );

  // 3) result count (idempotent: matches both the old placeholder text and
  // this script's own previous output)
  html = html.replace(
    /<p class="result-count">.*?<\/p>/,
    `<p class="result-count"><strong>${all.length}</strong> 件のポスト</p>`
  );

  // 4) entry grid
  html = html.replace(
    /(<div class="entry-grid">\n)[\s\S]*?(\n      <\/div>)/,
    `$1\n${cardsHtml}\n$2`
  );

  // Pagination is fully client-side now (see archive.js): the static markup
  // is just the empty `.pagination-wrap` shell, populated on load regardless
  // of `all.length`, so there's nothing to inject here at build time.

  fs.writeFileSync(ARCHIVE_FILE, html, "utf8");
  console.log(`Wrote ${all.length} cards (${CURATED.length} curated + ${tips.length} tips) into archive.html`);
  console.log("Category counts:", counts);
}

main();
