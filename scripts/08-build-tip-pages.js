#!/usr/bin/env node
// Renders every content/posts/*.md draft into a static HTML page under
// prototype/posts/ (keyed by the frontmatter `slug` field — stable across
// title edits, see scripts/28-assign-slugs.js), plus:
//   - a simple index page linking them all (prototype/posts-index.html)
//   - redirect stubs at every legacy prototype/tips/{old-filename}.html per
//     data/legacy-redirects.json (scripts/29-snapshot-legacy-redirects.js),
//     so links shared/indexed under the old URL scheme keep working.
//
// Usage: node scripts/08-build-tip-pages.js

const fs = require("fs");
const path = require("path");
const { renderTipPage, parseFrontMatter, SITE_HEADER, SITE_FOOTER, escapeHtml } = require("./lib/render-tip");
const { idFromFrontMatter } = require("./lib/checklist");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const OUT_DIR = path.resolve(__dirname, "..", "prototype", "posts");
const REDIRECT_DIR = path.resolve(__dirname, "..", "prototype", "tips");
const REDIRECTS_FILE = path.resolve(__dirname, "..", "data", "legacy-redirects.json");
const RETIRED_SLUGS_FILE = path.resolve(__dirname, "..", "data", "retired-slugs.json");

function buildIndexHtml(entries) {
  const rows = entries
    .map(
      (e) =>
        `      <a class="related-mini" href="posts/${e.file}" style="border-top: 0.5px solid var(--color-border); padding: 12px 0;">
        <div>
          <h5 style="font-size: 14px;">${e.title}</h5>
          <span class="cat">${e.date}</span>
        </div>
      </a>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ポスト一覧 — Merge VFX&amp;CG</title>
<link rel="icon" type="image/png" href="images/icon-nodegraph.png">
<link rel="stylesheet" href="style.css">
</head>
<body data-root="">
${SITE_HEADER(0)}
<div class="archive-head">
  <div class="container">
    <h1>ポスト一覧</h1>
    <p>Xポストの移行パイプラインから生成された下書き ${entries.length} 件（プロトタイプ表示用の簡易一覧）。</p>
  </div>
</div>
<div class="container">
  <div style="max-width: 720px; padding: 40px 0 96px;">
${rows}
  </div>
</div>

${SITE_FOOTER(0)}

<script src="nav.js" defer></script>
<script src="search.js" defer></script>
</body>
</html>
`;
}

/** Redirect stub — meta-refresh + canonical pointing `target` (already a
 *  correct relative path from the stub's own location) at its new home. */
function buildRedirectHtml(target) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">
<link rel="canonical" href="${escapeHtml(target)}">
<title>Merge VFX&amp;CG</title>
</head>
<body>
<p>このページは移動しました。<a href="${escapeHtml(target)}">新しいURLへ移動</a></p>
</body>
</html>
`;
}

/** First pass: builds a lightweight index of every post (slug/href, tags,
 *  category, etc.) so renderTipPage() can compute "same tag" related posts
 *  without re-reading the whole content/posts/ directory per page. */
function buildPostsIndex(files) {
  const { extractImages, parseFrontMatter: parseFM } = require("./lib/render-tip");
  const index = [];

  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const { fm, body } = parseFM(raw);
    const id = idFromFrontMatter(raw);
    if (!id || !fm.slug) continue;

    const { images } = extractImages(body);
    index.push({
      originalPost: fm.original_post,
      href: `${fm.slug}.html`,
      title: fm.title || "(無題)",
      category: fm.category || "tips",
      tags: fm.tags || [],
      date: fm.date || "",
      image: images[0] ? images[0].src : null,
    });
  }
  return index;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(REDIRECT_DIR, { recursive: true });
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const postsIndex = buildPostsIndex(files);

  const indexEntries = [];
  const keepPostFiles = new Set();
  let written = 0;

  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const { fm } = parseFrontMatter(raw);
    const id = idFromFrontMatter(raw);
    if (!id) {
      console.warn(`⚠ ${file}: no id found in original_post, skipping.`);
      continue;
    }
    if (!fm.slug) {
      console.warn(`⚠ ${file}: no slug field — run scripts/28-assign-slugs.js first, skipping.`);
      continue;
    }
    const title = fm.title || "(無題)";

    const html = renderTipPage(mdPath, postsIndex);
    const outFile = `${fm.slug}.html`;
    fs.writeFileSync(path.join(OUT_DIR, outFile), html, "utf8");
    keepPostFiles.add(outFile);
    written++;
    indexEntries.push({ file: outFile, title, date: fm.date || "" });
  }

  // Redirect stubs *within* prototype/posts/ for slugs retired by a post
  // consolidation (scripts/lib data/retired-slugs.json) — e.g. two posts
  // about the same announcement merged into one. Written into keepPostFiles
  // too so the cleanup pass below doesn't delete them as "stale".
  const retired = fs.existsSync(RETIRED_SLUGS_FILE) ? JSON.parse(fs.readFileSync(RETIRED_SLUGS_FILE, "utf8")) : [];
  for (const { oldSlug, newSlug } of retired) {
    const outFile = `${oldSlug}.html`;
    fs.writeFileSync(path.join(OUT_DIR, outFile), buildRedirectHtml(`${newSlug}.html`), "utf8");
    keepPostFiles.add(outFile);
  }

  // Clean up stale generated post pages (post deleted, or slug changed) —
  // prototype/posts/ is a build output, fully regenerable, so this is safe.
  let removed = 0;
  for (const existing of fs.readdirSync(OUT_DIR)) {
    if (existing.endsWith(".html") && !keepPostFiles.has(existing)) {
      fs.unlinkSync(path.join(OUT_DIR, existing));
      removed++;
    }
  }

  // Redirect stubs for every legacy tips/ URL, from the frozen manifest —
  // NOT recomputed from live titles, so Phase 3's title rewrite won't move
  // these (see scripts/29-snapshot-legacy-redirects.js header comment).
  const redirects = fs.existsSync(REDIRECTS_FILE) ? JSON.parse(fs.readFileSync(REDIRECTS_FILE, "utf8")) : [];
  const keepRedirectFiles = new Set();
  for (const { oldFile, newHref } of redirects) {
    fs.writeFileSync(path.join(REDIRECT_DIR, oldFile), buildRedirectHtml(`../${newHref}`), "utf8");
    keepRedirectFiles.add(oldFile);
  }
  let removedRedirects = 0;
  for (const existing of fs.readdirSync(REDIRECT_DIR)) {
    if (existing.endsWith(".html") && !keepRedirectFiles.has(existing)) {
      fs.unlinkSync(path.join(REDIRECT_DIR, existing));
      removedRedirects++;
    }
  }

  indexEntries.sort((a, b) => (a.date < b.date ? 1 : -1));
  fs.writeFileSync(
    path.resolve(__dirname, "..", "prototype", "posts-index.html"),
    buildIndexHtml(indexEntries),
    "utf8"
  );

  console.log(`Wrote ${written} page(s) -> ${path.relative(process.cwd(), OUT_DIR)}`);
  if (removed > 0) console.log(`Removed ${removed} stale post page(s).`);
  console.log(`Wrote ${redirects.length} redirect stub(s) -> ${path.relative(process.cwd(), REDIRECT_DIR)}`);
  if (removedRedirects > 0) console.log(`Removed ${removedRedirects} stale redirect stub(s).`);
  console.log(`Wrote index -> prototype/posts-index.html`);
}

main();
