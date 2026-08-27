#!/usr/bin/env node
// Builds prototype/rss.xml (RSS 2.0) from the same entry set as the search
// index and archive/homepage grids. Feeds the site's two "RSSを購読する" /
// "RSS Feed" links, which previously pointed at href="#".
//
// SITE_URL points at the current live deploy (GitHub Pages, as of
// 2026-08-27). The custom domain candidate (merge-vfx-cg.com, per
// docs/03_spec.md §11 "未決事項") isn't registered yet — update this
// constant again once the site moves there. RSS readers need absolute links.
//
// Usage: node scripts/21-build-rss.js

const fs = require("fs");
const path = require("path");
const { loadAllEntries } = require("./lib/entries");

const OUT_FILE = path.resolve(__dirname, "..", "prototype", "rss.xml");
const SITE_URL = "https://9ra369.github.io/website";
const SITE_TITLE = "Merge VFX&CG";
const SITE_DESCRIPTION = "CG・VFXに関する知識、参考リンク、作品を体系的に整理するウェブサイト。";
const MAX_ITEMS = 50;

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** "2026-08-09" -> RFC-822 ("Sun, 09 Aug 2026 00:00:00 GMT"). Falls back to
 *  the build time for entries with a missing/unparseable date. */
function toRfc822(dateStr) {
  const d = dateStr ? new Date(`${dateStr}T00:00:00Z`) : null;
  return d && !isNaN(d) ? d.toUTCString() : new Date().toUTCString();
}

function renderItem(e) {
  // Percent-encode each path segment (Japanese titles, full-width
  // parens/brackets, etc.) so the feed carries valid URIs — the DOM hrefs
  // elsewhere leave paths as literal Unicode since browsers encode those
  // automatically, but RSS parsers are stricter about well-formed URIs.
  const encodedPath = e.href.split("/").map(encodeURIComponent).join("/");
  const link = `${SITE_URL}/${encodedPath}`;
  return `    <item>
      <title>${escapeXml(e.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc822(e.date)}</pubDate>
      <category>${escapeXml(e.category)}</category>
      <description>${escapeXml(e.summary || "")}</description>
    </item>`;
}

function main() {
  const all = loadAllEntries()
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_ITEMS);

  const itemsXml = all.map(renderItem).join("\n");
  const buildDate = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ja</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
${itemsXml}
  </channel>
</rss>
`;

  fs.writeFileSync(OUT_FILE, xml, "utf8");
  console.log(`Wrote ${all.length} item(s) -> ${path.relative(process.cwd(), OUT_FILE)}`);
}

main();
