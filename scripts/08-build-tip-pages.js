#!/usr/bin/env node
// Renders every content/posts/*.md draft into a static HTML page under
// prototype/tips/, plus a simple index page linking them all.
//
// Usage: node scripts/08-build-tip-pages.js

const fs = require("fs");
const path = require("path");
const { renderTipPage, parseFrontMatter, slugifyTitle } = require("./lib/render-tip");
const { idFromFrontMatter } = require("./lib/checklist");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const OUT_DIR = path.resolve(__dirname, "..", "prototype", "tips");

function buildIndexHtml(entries) {
  const rows = entries
    .map(
      (e) =>
        `      <a class="related-mini" href="tips/${e.file}" style="border-top: 0.5px solid var(--color-border); padding: 12px 0;">
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
<title>Tips 一覧 — Merge VFX&amp;CG</title>
<link rel="icon" type="image/png" href="images/icon-nodegraph.png">
<link rel="stylesheet" href="style.css">
</head>
<body data-root="">
<header class="site-header">
  <div class="container">
    <a href="index.html" class="logo">
      <span class="logo-mark"><img src="images/icon-nodegraph.png" alt="Merge VFX&amp;CG"></span>
      <span>Merge VFX&amp;CG<span class="logo-sub">CG / VFX KNOWLEDGE BASE</span></span>
    </a>
    <nav class="main-nav">
      <div class="search-trigger">
        <svg viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/><path d="M17 17L13.5 13.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        <span>記事・リンクを検索</span>
      </div>
      <a href="index.html">トップ</a>
      <a href="archive.html" class="is-active">ポスト</a>
      <a href="about.html">About</a>
    </nav>
    <div class="header-actions">
      <div class="search-trigger">
        <svg viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/><path d="M17 17L13.5 13.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        <span>記事・リンクを検索</span>
        <kbd>⌘K</kbd>
      </div>
      <button class="nav-toggle" aria-label="メニュー">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 5H16M2 9H16M2 13H16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>
  </div>
</header>
<div class="archive-head">
  <div class="container">
    <h1>Tips 一覧</h1>
    <p>Xポストの移行パイプラインから生成された下書き ${entries.length} 件（プロトタイプ表示用の簡易一覧）。</p>
  </div>
</div>
<div class="container">
  <div style="max-width: 720px; padding: 40px 0 96px;">
${rows}
  </div>
</div>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="index.html" class="logo">
          <span class="logo-mark"><img src="images/icon-nodegraph.png" alt="Merge VFX&amp;CG"></span>
          <span>Merge VFX&amp;CG</span>
        </a>
        <p>CG・VFXに関する知識、参考リンク、作品を体系的に整理するウェブサイト。</p>
      </div>
      <div class="footer-col">
        <h4>Browse</h4>
        <ul>
          <li><a href="archive.html">ポスト一覧</a></li>
          <li><a href="archive.html">カテゴリで探す</a></li>
          <li><a href="archive.html">タグで探す</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>About</h4>
        <ul>
          <li><a href="about.html">このサイトについて</a></li>
          <li><a href="privacy.html">プライバシーポリシー</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Connect</h4>
        <ul>
          <li><a href="contact.html">お問い合わせ</a></li>
          <li><a href="https://x.com/kuramaKageya" target="_blank" rel="noopener">X (Twitter)</a></li>
          <li><a href="https://github.com/9ra369" target="_blank" rel="noopener">GitHub</a></li>
          <li><a href="https://www.artstation.com/kurama_kageya" target="_blank" rel="noopener">ArtStation</a></li>
          <li><a href="https://www.linkedin.com/in/kurama-kageya-3324621bb/" target="_blank" rel="noopener">LinkedIn</a></li>
          <li><a href="https://vsco.co/kurakura3939/gallery" target="_blank" rel="noopener">VSCO</a></li>
          <li><a href="https://website-kuramakageya.netlify.app/" target="_blank" rel="noopener">Portfolio</a></li>
          <li><a href="rss.xml">RSS Feed</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Merge VFX&amp;CG. All rights reserved.</span>
      <span>Design prototype — content is placeholder</span>
    </div>
  </div>
</footer>

<script src="nav.js" defer></script>
<script src="search.js" defer></script>
</body>
</html>
`;
}

/** First pass: builds a lightweight index of every post (slug/href, tags,
 *  category, etc.) so renderTipPage() can compute "same tag" related posts
 *  without re-reading the whole content/posts/ directory per page. */
function buildPostsIndex(files) {
  const { extractImages, parseFrontMatter: parseFM } = require("./lib/render-tip");
  const usedSlugs = new Set();
  const index = [];

  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const { fm, body } = parseFM(raw);
    const id = idFromFrontMatter(raw);
    if (!id) continue;
    const title = fm.title || "(無題)";
    let slug = slugifyTitle(title) || id;
    if (usedSlugs.has(slug)) slug = `${slug}_${id}`;
    usedSlugs.add(slug);

    const { images } = extractImages(body);
    index.push({
      originalPost: fm.original_post,
      href: `${slug}.html`,
      title,
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
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const postsIndex = buildPostsIndex(files);

  const indexEntries = [];
  const usedSlugs = new Set();
  const keepFiles = new Set(); // filenames this run produces — anything else gets cleaned up below
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
    const title = fm.title || "(無題)";
    let slug = slugifyTitle(title) || id; // fallback if a title strips to nothing
    if (usedSlugs.has(slug)) {
      // Extremely unlikely (verified 0 collisions across all posts at
      // implementation time) but keep filenames unique if titles ever collide.
      slug = `${slug}_${id}`;
    }
    usedSlugs.add(slug);

    const html = renderTipPage(mdPath, postsIndex);
    const outFile = `${slug}.html`;
    fs.writeFileSync(path.join(OUT_DIR, outFile), html, "utf8");
    keepFiles.add(outFile);
    written++;
    indexEntries.push({ file: outFile, title, date: fm.date || "" });
  }

  // Clean up stale generated pages (old filenames from a previous naming
  // scheme, or pages for posts that no longer exist) — prototype/tips/ is a
  // build output, fully regenerable from content/posts/, so this is safe.
  let removed = 0;
  for (const existing of fs.readdirSync(OUT_DIR)) {
    if (existing.endsWith(".html") && !keepFiles.has(existing)) {
      fs.unlinkSync(path.join(OUT_DIR, existing));
      removed++;
    }
  }

  indexEntries.sort((a, b) => (a.date < b.date ? 1 : -1));
  fs.writeFileSync(
    path.resolve(__dirname, "..", "prototype", "tips-index.html"),
    buildIndexHtml(indexEntries),
    "utf8"
  );

  console.log(`Wrote ${written} page(s) -> ${path.relative(process.cwd(), OUT_DIR)}`);
  if (removed > 0) console.log(`Removed ${removed} stale page(s) no longer produced.`);
  console.log(`Wrote index -> prototype/tips-index.html`);
}

main();
