#!/usr/bin/env node
// Renders every content/posts/*.md draft into a static HTML page under
// prototype/tips/, plus a simple index page linking them all.
//
// Usage: node scripts/08-build-tip-pages.js

const fs = require("fs");
const path = require("path");
const { renderTipPage, parseFrontMatter } = require("./lib/render-tip");
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
<body>
<header class="site-header">
  <div class="container">
    <a href="index.html" class="logo">
      <span class="logo-mark"><img src="images/icon-nodegraph.png" alt="Merge VFX&amp;CG"></span>
      <span>Merge VFX&amp;CG<span class="logo-sub">CG / VFX KNOWLEDGE BASE</span></span>
    </a>
    <nav class="main-nav">
      <a href="index.html">トップ</a>
      <a href="archive.html" class="is-active">アーカイブ</a>
      <a href="archive.html">カテゴリ</a>
      <a href="about.html">About</a>
    </nav>
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
</body>
</html>
`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  const indexEntries = [];
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
    const html = renderTipPage(mdPath);
    const outFile = `${id}.html`;
    fs.writeFileSync(path.join(OUT_DIR, outFile), html, "utf8");
    written++;
    indexEntries.push({ file: outFile, title: fm.title || "(無題)", date: fm.date || "" });
  }

  indexEntries.sort((a, b) => (a.date < b.date ? 1 : -1));
  fs.writeFileSync(
    path.resolve(__dirname, "..", "prototype", "tips-index.html"),
    buildIndexHtml(indexEntries),
    "utf8"
  );

  console.log(`Wrote ${written} page(s) -> ${path.relative(process.cwd(), OUT_DIR)}`);
  console.log(`Wrote index -> prototype/tips-index.html`);
}

main();
