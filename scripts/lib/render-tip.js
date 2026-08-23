// Step 5b: renders a content/posts/*.md draft into a static HTML page using
// the same template shape as the site's hand-built entry-*.html pages
// (per user direction: tips pages should look like the other entries, not a
// separate minimal "card" style).

const fs = require("fs");
const path = require("path");

/** Minimal frontmatter parser. Values were written by lib/markdown.js as
 *  JSON scalars/arrays (via JSON.stringify), so JSON.parse handles them;
 *  `date` and `status` are bare unquoted tokens. */
function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("No frontmatter found");
  const [, fmBlock, body] = match;

  const fm = {};
  for (const line of fmBlock.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1).trim();
    if (rawValue.startsWith('"') || rawValue.startsWith("[")) {
      fm[key] = JSON.parse(rawValue);
    } else {
      fm[key] = rawValue;
    }
  }
  return { fm, body: body.trim() };
}

/** Extracts markdown image refs (`![alt](path)`) from the body, returning
 *  {images, text} with the image lines removed from the remaining text. */
function extractImages(body) {
  const images = [];
  const lines = body.split("\n");
  const textLines = [];
  for (const line of lines) {
    const m = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (m) {
      images.push({ alt: m[1], src: m[2] });
    } else {
      textLines.push(line);
    }
  }
  const text = textLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { images, text };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Body text -> paragraphs, preserving single line breaks within a paragraph. */
function textToHtml(text) {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("\n        ");
}

const SITE_HEADER = (depth) => {
  const p = depth === 0 ? "" : "../";
  return `<header class="site-header">
  <div class="container">
    <a href="${p}index.html" class="logo">
      <span class="logo-mark"><img src="${p}images/icon-nodegraph.png" alt="Merge VFX&amp;CG"></span>
      <span>Merge VFX&amp;CG<span class="logo-sub">CG / VFX KNOWLEDGE BASE</span></span>
    </a>
    <nav class="main-nav">
      <a href="${p}index.html">トップ</a>
      <a href="${p}archive.html" class="is-active">アーカイブ</a>
      <a href="${p}archive.html">カテゴリ</a>
      <a href="${p}about.html">About</a>
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
</header>`;
};

const SITE_FOOTER = (depth) => {
  const p = depth === 0 ? "" : "../";
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="${p}index.html" class="logo">
          <span class="logo-mark"><img src="${p}images/icon-nodegraph.png" alt="Merge VFX&amp;CG"></span>
          <span>Merge VFX&amp;CG</span>
        </a>
        <p>CG・VFXに関する知識、参考リンク、作品を体系的に整理するウェブサイト。</p>
      </div>
      <div class="footer-col">
        <h4>Browse</h4>
        <ul>
          <li><a href="${p}archive.html">アーカイブ</a></li>
          <li><a href="${p}archive.html">カテゴリ一覧</a></li>
          <li><a href="${p}archive.html">タグ一覧</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>About</h4>
        <ul>
          <li><a href="${p}about.html">このサイトについて</a></li>
          <li><a href="${p}privacy.html">プライバシーポリシー</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Connect</h4>
        <ul>
          <li><a href="${p}contact.html">お問い合わせ</a></li>
          <li><a href="https://x.com/kuramaKageya" target="_blank" rel="noopener">X (Twitter)</a></li>
          <li><a href="https://github.com/9ra369" target="_blank" rel="noopener">GitHub</a></li>
          <li><a href="https://www.artstation.com/kurama_kageya" target="_blank" rel="noopener">ArtStation</a></li>
          <li><a href="https://www.linkedin.com/in/kurama-kageya-3324621bb/" target="_blank" rel="noopener">LinkedIn</a></li>
          <li><a href="https://vsco.co/kurakura3939/gallery" target="_blank" rel="noopener">VSCO</a></li>
          <li><a href="https://website-kuramakageya.netlify.app/" target="_blank" rel="noopener">Portfolio</a></li>
          <li><a href="#">RSS Feed</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Merge VFX&amp;CG. All rights reserved.</span>
      <span>Design prototype — content is placeholder</span>
    </div>
  </div>
</footer>`;
};

function renderTipPage(mdPath) {
  const raw = fs.readFileSync(mdPath, "utf8");
  const { fm, body } = parseFrontMatter(raw);
  const { images, text } = extractImages(body);
  const p = "../"; // pages live under prototype/tips/

  const title = fm.title || "(無題)";
  const heroImage = images[0];
  const sourceUrl = fm.source_url || "";
  const primaryUrl = sourceUrl || fm.original_post;
  const primaryLabel = sourceUrl ? "URL" : "元ポスト";
  const primaryBtnLabel = sourceUrl ? "サイトを見る" : "ポストを見る";

  const tagsHtml = (fm.tags || [])
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("\n          ");

  const heroThumbHtml = heroImage
    ? `<div class="entry-hero-thumb">
        <img src="${p}${escapeHtml(heroImage.src)}" alt="${escapeHtml(heroImage.alt || title)}">
      </div>`
    : `<div class="entry-hero-thumb thumb-tips"></div>`;

  const extraSourceBox =
    sourceUrl && fm.original_post
      ? `
        <div class="source-link-box">
          <div>
            <div class="label">元ポスト</div>
            <div class="url">${escapeHtml(fm.original_post)}</div>
          </div>
          <a href="${escapeHtml(fm.original_post)}" class="btn btn-outline" target="_blank" rel="noopener">ポストを見る
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3H11V9M11 3L3 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>`
      : "";

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} — Merge VFX&amp;CG</title>
<link rel="icon" type="image/png" href="${p}images/icon-nodegraph.png">
<link rel="stylesheet" href="${p}style.css">
</head>
<body>

${SITE_HEADER(1)}

<div class="entry-hero">
  <div class="container">
    <nav class="breadcrumb">
      <a href="${p}index.html">トップ</a>
      <span class="sep">/</span>
      <a href="${p}archive.html">Tips</a>
      <span class="sep">/</span>
      <span class="current">${escapeHtml(title)}</span>
    </nav>

    <span class="category-pill">TIPS</span>
    <h1>${escapeHtml(title)}</h1>

    <div class="entry-meta-bar">
      <span class="meta-item">${escapeHtml(fm.date || "")}</span>
      <span class="meta-item">形式: Xポスト</span>
    </div>
  </div>
</div>

<div class="container">
  <div class="entry-detail-layout">

    <main>
      ${heroThumbHtml}

      <div class="prose">
        <p class="lead-summary">${escapeHtml(fm.summary || "")}</p>

        <div class="source-link-box">
          <div>
            <div class="label">${primaryLabel}</div>
            <div class="url">${escapeHtml(primaryUrl)}</div>
          </div>
          <a href="${escapeHtml(primaryUrl)}" class="btn btn-outline" target="_blank" rel="noopener">${primaryBtnLabel}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3H11V9M11 3L3 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
        ${extraSourceBox}

        <h2>概要</h2>
        ${textToHtml(text)}
      </div>
    </main>

    <aside>
      <div class="sidebar-box">
        <h4>タグ</h4>
        <div class="entry-tags">
          ${tagsHtml || '<span class="tag">Tips</span>'}
        </div>
      </div>
    </aside>

  </div>
</div>

${SITE_FOOTER(1)}

</body>
</html>
`;
}

module.exports = { renderTipPage, parseFrontMatter, extractImages };
