#!/usr/bin/env node
// Wires real content into prototype/index.html:
//   1) the "カテゴリからたどる" category-grid (real counts, real 7-category list)
//   2) the "新着エントリー" entry-grid (6 most recent real entries, replacing
//      the old entry.html-linked mock cards)
//
// Usage: node scripts/14-build-homepage.js

const fs = require("fs");
const path = require("path");
const { parseFrontMatter, extractImages, slugifyTitle } = require("./lib/render-tip");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const CATEGORIES_FILE = path.resolve(__dirname, "..", "data", "categories.json");
const INDEX_FILE = path.resolve(__dirname, "..", "prototype", "index.html");

const CATEGORY_ICONS = {
  tutorial:
    '<path d="M4 19.5V4.5C4 3.4 4.9 2.5 6 2.5H18C19.1 2.5 20 3.4 20 4.5V19.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 2.5C4.9 2.5 4 3.4 4 4.5V19.5C4 20.6 4.9 21.5 6 21.5H20V19.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  pipeline:
    '<path d="M8 4L3 12L8 20M16 4L21 12L16 20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  article:
    '<rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 8H16M8 12H16M8 16H12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  showreel:
    '<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M10 9.5L15 12L10 14.5V9.5Z" fill="currentColor"/>',
  website:
    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M3 12H21M12 3C14.5 5.5 15.8 8.6 15.8 12C15.8 15.4 14.5 18.5 12 21C9.5 18.5 8.2 15.4 8.2 12C8.2 8.6 9.5 5.5 12 3Z" stroke="currentColor" stroke-width="1.7"/>',
  tips: '<path d="M4 15L4 5C4 3.9 4.9 3 6 3H14C15.1 3 16 3.9 16 5V15L10 12L4 15Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  "daily-analysis":
    '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12L15 14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
};

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

function renderCard(e, thumbClassMap) {
  const thumbClass = thumbClassMap[e.category] || "thumb-tips";
  const thumbInner = e.image ? `<img src="${escapeHtml(e.image)}" alt="">` : "";
  const tagsHtml = e.tags
    .slice(0, 3)
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("\n            ");

  return `      <a class="entry-card" href="${e.href}" data-category="${e.category}">
        <div class="entry-thumb ${thumbClass}">
          ${thumbInner}
        </div>
        <div class="entry-body">
          <div class="entry-meta-row">
            <span class="entry-category">${escapeHtml(e.catLabel)}</span>
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

function main() {
  const { categories } = JSON.parse(fs.readFileSync(CATEGORIES_FILE, "utf8"));
  const catLabelMap = Object.fromEntries(categories.map((c) => [c.slug, c.label]));
  const catThumbMap = Object.fromEntries(categories.map((c) => [c.slug, c.thumbClass]));

  const tips = loadTipEntries();

  // Curated entries (see scripts/11-build-archive.js) also count toward totals.
  const CURATED_CATEGORIES = ["website", "article", "tutorial"];
  const counts = {};
  for (const e of tips) counts[e.category] = (counts[e.category] || 0) + 1;
  for (const c of CURATED_CATEGORIES) counts[c] = (counts[c] || 0) + 1;

  // 1) category grid
  const categoryCardsHtml = categories
    .map((c) => {
      const href = c.slug === "tips" ? "tips-index.html" : "archive.html";
      const icon = CATEGORY_ICONS[c.slug] || CATEGORY_ICONS.tips;
      return `      <a class="category-card" href="${href}">
        <div class="category-icon"><svg viewBox="0 0 24 24" fill="none">${icon}</svg></div>
        <h3>${escapeHtml(c.label)}</h3>
        <span class="count">${counts[c.slug] || 0} entries</span>
      </a>`;
    })
    .join("\n");

  // 2) recently-added grid: top 6 most recent real tip entries
  const recentHtml = tips
    .slice(0, 6)
    .map((e) => renderCard({ ...e, catLabel: catLabelMap[e.category] || e.category }, catThumbMap))
    .join("\n\n");

  let html = fs.readFileSync(INDEX_FILE, "utf8");

  // hero stats: real numbers, not the original mockup's hardcoded placeholders
  const totalEntries = tips.length + CURATED_CATEGORIES.length;
  const tagSet = new Set();
  for (const e of tips) for (const t of e.tags) tagSet.add(t);
  const lastUpdated = tips[0] && tips[0].date ? tips[0].date.replace(/-/g, ".").slice(0, 7) : "";

  const heroStatsHtml = `      <div class="hero-stat"><span class="num">${totalEntries}</span><span class="label">収録エントリー</span></div>
      <div class="hero-stat"><span class="num">${categories.length}</span><span class="label">カテゴリ</span></div>
      <div class="hero-stat"><span class="num">${tagSet.size}</span><span class="label">使用タグ数</span></div>
      <div class="hero-stat"><span class="num">${escapeHtml(lastUpdated)}</span><span class="label">最終更新</span></div>`;

  html = html.replace(
    /<div class="hero-stats">\n[\s\S]*?\n    <\/div>/,
    `<div class="hero-stats">\n${heroStatsHtml}\n    </div>`
  );

  // category-grid: keep the grid-template-columns count in sync with category count
  html = html.replace(
    /<div class="category-grid" style="grid-template-columns: repeat\(\d+, 1fr\);">\n[\s\S]*?\n    <\/div>/,
    `<div class="category-grid" style="grid-template-columns: repeat(${categories.length}, 1fr);">\n${categoryCardsHtml}\n    </div>`
  );

  // intro paragraph listing category names
  html = html.replace(
    /<p>[^<]*カテゴリで整理しています。<\/p>/,
    `<p>${categories.map((c) => c.label).join(" / ")}の${categories.length}カテゴリで整理しています。</p>`
  );

  // recently-added entry-grid
  html = html.replace(
    /(<div class="entry-grid">\n)[\s\S]*?(\n    <\/div>\n  <\/div>\n<\/section>\n\n<section class="section">)/,
    `$1\n${recentHtml}\n\n$2`
  );

  fs.writeFileSync(INDEX_FILE, html, "utf8");
  console.log(`Updated index.html: ${categories.length} category cards, ${Math.min(6, tips.length)} recent entries.`);
  console.log("Category counts:", counts);
}

main();
