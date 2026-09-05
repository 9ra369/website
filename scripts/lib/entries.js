// Shared "all entries" loader — combines the 3 hand-curated entry-*.html
// pages with every generated content/posts/*.md tip, in the same shape used
// by scripts/11-build-archive.js and scripts/14-build-homepage.js.
//
// Extracted so new build steps (search index, RSS feed) don't have to
// re-duplicate the CURATED list or the content/posts/ scan a third time.

const fs = require("fs");
const path = require("path");
const { parseFrontMatter, extractImages } = require("./render-tip");

const POSTS_DIR = path.resolve(__dirname, "..", "..", "content", "posts");

// Keep in sync with the CURATED list in scripts/11-build-archive.js (that
// script owns archive.html's rendering; this one is the read-only shared copy).
const CURATED = [
  {
    href: "entry-cglounge.html",
    category: "website",
    title: "CG Lounge: 映画・VFX業界のプロが教えるチュートリアル・マーケットプレイス",
    summary: "映画・VFX業界のプロがチュートリアルやアセットを直接販売するマーケットプレイス。",
    tags: ["Marketplace", "Community"],
    topics: ["industry"],
    tools: [],
    type: "brief",
    date: "2026-08-08",
    image: "images/entries/cglounge-homepage.png",
  },
  {
    href: "entry-cgworld-island.html",
    category: "article",
    title: "Houdini&Arnoldで描く大規模なフル3D自然景観「Island」制作解説",
    summary: "Spade&Co. 木川裕太氏による個人制作「Island」の技術解説記事。",
    tags: ["Houdini", "Arnold", "Environment"],
    topics: ["environment"],
    tools: ["houdini"],
    type: "explainer",
    date: "2026-08-09",
    image: "images/entries/cgworld-island-hero.jpg",
  },
  {
    href: "entry-procedural-environments.html",
    category: "tutorial",
    title: "Houdiniで学ぶプロシージャル環境制作: モデリングからレンダリングまで",
    summary: "Houdiniを用いたモデリングからレンダリングまでの背景制作ワークフローを体系的に学べるコース。",
    tags: ["Houdini", "Environment"],
    topics: ["environment"],
    tools: ["houdini"],
    type: "brief",
    date: "2026-08-08",
    image: "images/entries/houdini-procedural-environments.jpg",
  },
];

function loadTipEntries() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const entries = [];
  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const { fm, body } = parseFrontMatter(raw);
    const idMatch = raw.match(/original_post:\s*"[^"]*\/status\/(\d+)"/);
    if (!idMatch) continue;
    if (!fm.slug) continue; // not yet migrated (scripts/28-assign-slugs.js)
    const { images } = extractImages(body);
    // Link-roundup posts (source_url entries carrying their own {image})
    // have no body gallery — fall back to the first entry with an image so
    // archive/homepage/topics/tools cards still get a real thumbnail.
    let cardImage = images[0] ? images[0].src : null;
    if (!cardImage) {
      const sourceUrls = Array.isArray(fm.source_url) ? fm.source_url : fm.source_url ? [fm.source_url] : [];
      const firstWithImage = sourceUrls.find((e) => e && typeof e === "object" && e.image);
      if (firstWithImage) cardImage = firstWithImage.image;
    }
    entries.push({
      href: `posts/${fm.slug}.html`,
      category: fm.category || "tips",
      title: fm.title || "(無題)",
      summary: fm.summary || "",
      tags: fm.tags || [],
      topics: fm.topics || [],
      tools: fm.tools || [],
      type: fm.type || "brief",
      date: fm.date || "",
      image: cardImage ? `images/posts/${cardImage.replace(/^images\/posts\//, "")}` : null,
    });
  }
  entries.sort((a, b) => (a.date < b.date ? 1 : -1));
  return entries;
}

/** All 266+ entries (curated + tips), newest first. */
function loadAllEntries() {
  return [...CURATED, ...loadTipEntries()];
}

module.exports = { CURATED, loadTipEntries, loadAllEntries };
