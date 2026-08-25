// Step 5b: renders a content/posts/*.md draft into a static HTML page using
// the same template shape as the site's hand-built entry-*.html pages
// (per user direction: tips pages should look like the other entries, not a
// separate minimal "card" style).

const fs = require("fs");
const path = require("path");

const { categories } = require("../../data/categories.json");
const CATEGORY_LABELS = Object.fromEntries(categories.map((c) => [c.slug, c.label]));
const CATEGORY_THUMB = Object.fromEntries(categories.map((c) => [c.slug, c.thumbClass]));
// Japanese label for the meta-bar "形式" field specifically — the
// category-pill/breadcrumb elsewhere intentionally keep the English label
// (matches the site's existing badge style, e.g. "BEGINNER"/"TUTORIAL").
const FORMAT_LABEL_JA = {
  tutorial: "チュートリアル",
  pipeline: "プラグイン・ツール",
  article: "記事",
  showreel: "デモリール",
  website: "ウェブサイト",
  tips: "Tips",
  "daily-analysis": "毎日作品分析",
};

/** Converts a post title into a filesystem-safe HTML filename stem: spaces
 *  (incl. full-width 　) become "_", and characters illegal in Windows
 *  filenames (\ / : * ? " < > |) are stripped outright. */
function slugifyTitle(title) {
  return title
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

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
  return { images, text: stripHashtags(text) };
}

/** Removes hashtag tokens (e.g. "#houdini") from displayed body text — the
 *  same information now lives in the structured tags sidebar (after
 *  scripts/10-merge-hashtags.js), so repeating the raw "#foo #bar" line in
 *  the prose is redundant. Cleans up the blank line/trailing space left
 *  behind. */
function stripHashtags(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/(^|\s)#[^\s#]+/g, "").replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

/** Ranks other posts by number of shared tags (desc, ties broken by newest
 *  first), excluding the current post itself. Returns up to `limit`. */
function computeRelated(currentPost, allPosts, limit = 12) {
  const currentTags = new Set((currentPost.tags || []).map((t) => t.toLowerCase()));
  if (currentTags.size === 0) return [];

  const scored = [];
  for (const other of allPosts) {
    if (other.originalPost === currentPost.originalPost) continue;
    const shared = (other.tags || []).filter((t) => currentTags.has(t.toLowerCase())).length;
    if (shared > 0) scored.push({ ...other, shared });
  }
  scored.sort((a, b) => b.shared - a.shared || (a.date < b.date ? 1 : -1));
  return scored.slice(0, limit);
}

function renderRelatedHtml(related, p) {
  if (related.length === 0) return "";
  const cards = related
    .map((r, i) => {
      const thumbClass = CATEGORY_THUMB[r.category] || "thumb-tips";
      const thumbInner = r.image ? `<img src="${p}${escapeHtml(r.image)}" alt="">` : "";
      const hiddenClass = i >= 4 ? " is-more-hidden" : "";
      const cardTagsHtml = (r.tags || [])
        .slice(0, 3)
        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
        .join("\n              ");
      return `        <a class="entry-card${hiddenClass}" href="${escapeHtml(r.href)}">
          <div class="entry-thumb ${thumbClass}">
            ${thumbInner}
          </div>
          <div class="entry-body">
            <div class="entry-meta-row">
              <span class="entry-category">${escapeHtml(CATEGORY_LABELS[r.category] || r.category)}</span>
            </div>
            <h3>${escapeHtml(r.title)}</h3>
            <div class="entry-tags">
              ${cardTagsHtml}
            </div>
            <div class="entry-footer"><span>${escapeHtml(r.date || "")}</span></div>
          </div>
        </a>`;
    })
    .join("\n\n");

  const moreBtn =
    related.length > 4 ? `<button class="related-posts-more" type="button">さらに見る</button>` : "";

  return `
<div class="container">
  <div class="related-posts-section">
    <h2>関連ポスト</h2>
    <p class="related-posts-lead">同じタグを持つポストです。</p>
    <div class="entry-grid related-posts-grid">
${cards}
    </div>
    ${moreBtn}
  </div>
</div>
`;
}

function renderTipPage(mdPath, allPosts = []) {
  const raw = fs.readFileSync(mdPath, "utf8");
  const { fm, body } = parseFrontMatter(raw);
  const { images, text } = extractImages(body);
  const p = "../"; // pages live under prototype/tips/

  const title = fm.title || "(無題)";
  const categoryLabel = CATEGORY_LABELS[fm.category] || "Tips";
  const heroImage = images[0];
  const sourceUrl = fm.source_url || "";
  const primaryUrl = sourceUrl || fm.original_post;
  const primaryLabel = sourceUrl ? "URL" : "元ポスト";
  const primaryBtnLabel = sourceUrl ? "サイトを見る" : "ポストを見る";

  const tagsHtml = (fm.tags || [])
    .map(
      (t) =>
        `<a class="tag" href="${p}archive.html?tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`
    )
    .join("\n          ");

  const related = computeRelated(
    { originalPost: fm.original_post, tags: fm.tags || [] },
    allPosts
  );
  const relatedHtml = renderRelatedHtml(related, p);

  // 案C: when a post has more than one image, show a main viewer plus a
  // clickable thumbnail row that swaps the main image (see tip-gallery.js).
  const heroThumbHtml = heroImage
    ? `<div class="entry-hero-thumb">
        <img id="gallery-main-img" src="${p}${escapeHtml(heroImage.src)}" alt="${escapeHtml(heroImage.alt || title)}">
      </div>`
    : `<div class="entry-hero-thumb ${CATEGORY_THUMB[fm.category] || "thumb-tips"}"></div>`;

  const galleryThumbsHtml =
    images.length > 1
      ? `<div class="gallery-thumbs">
        ${images
          .map(
            (img, i) =>
              `<a href="#" data-src="${p}${escapeHtml(img.src)}" data-alt="${escapeHtml(img.alt || title)}" class="${i === 0 ? "is-active" : ""}"><img src="${p}${escapeHtml(img.src)}" alt=""></a>`
          )
          .join("\n        ")}
      </div>`
      : "";

  const mentionsHtml =
    (fm.mentions || []).length > 0
      ? `
      <div class="sidebar-box">
        <h4>Xアカウント</h4>
        <div class="entry-tags">
          ${fm.mentions
            .map(
              (sn) =>
                `<a class="tag" href="https://x.com/${escapeHtml(sn)}" target="_blank" rel="noopener">@${escapeHtml(sn)}</a>`
            )
            .join("\n          ")}
        </div>
      </div>`
      : "";

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
      <a href="${p}archive.html">${escapeHtml(categoryLabel)}</a>
      <span class="sep">/</span>
      <span class="current">${escapeHtml(title)}</span>
    </nav>

    <span class="category-pill">${escapeHtml(categoryLabel.toUpperCase())}</span>
    <h1>${escapeHtml(title)}</h1>

    <div class="entry-meta-bar">
      <span class="meta-item">${escapeHtml(fm.date || "")}</span>
      <span class="meta-item">言語: ${escapeHtml(fm.language || "日本語")}</span>
      <span class="meta-item">形式: ${escapeHtml(FORMAT_LABEL_JA[fm.category] || "Tips")}</span>
    </div>
  </div>
</div>

<div class="container">
  <div class="entry-detail-layout">

    <main>
      ${heroThumbHtml}
      ${galleryThumbsHtml}

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
      </div>
    </main>

    <aside>
      <div class="sidebar-box">
        <h4>タグ</h4>
        <div class="entry-tags">
          ${tagsHtml || '<span class="tag">Tips</span>'}
        </div>
      </div>
      ${mentionsHtml}
    </aside>

  </div>
</div>
${relatedHtml}
${SITE_FOOTER(1)}

${images.length > 1 ? `<script src="${p}tip-gallery.js" defer></script>\n` : ""}<script src="${p}lightbox.js" defer></script>
${related.length > 0 ? `<script src="${p}related-posts.js" defer></script>\n` : ""}</body>
</html>
`;
}

module.exports = { renderTipPage, parseFrontMatter, extractImages, slugifyTitle };
