#!/usr/bin/env node
// Lets you curate by deleting files: if you delete a page from
// prototype/posts/{slug}.html, running this script treats that as "I don't
// want this one" and moves the matching content/posts/*.md into
// content/_archive/ (never deletes the markdown — same non-destructive rule
// as scripts/07-exclude.js, just triggered by removing the HTML instead of
// picking a checklist number).
//
// Matches on the frontmatter `slug` field (scripts/28-assign-slugs.js), not
// prototype/tips/ — that directory now holds only frozen redirect stubs
// (scripts/29-snapshot-legacy-redirects.js) and no longer tracks 1:1 with
// live posts.
//
// Usage: node scripts/09-sync-deleted-html.js

const fs = require("fs");
const path = require("path");
const { idFromFrontMatter } = require("./lib/checklist");
const { parseFrontMatter } = require("./lib/render-tip");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const ARCHIVE_DIR = path.resolve(__dirname, "..", "content", "_archive");
const POSTS_HTML_DIR = path.resolve(__dirname, "..", "prototype", "posts");

function main() {
  const mdFiles = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const htmlFiles = new Set(fs.readdirSync(POSTS_HTML_DIR).filter((f) => f.endsWith(".html")));

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  let archived = 0;
  for (const file of mdFiles) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const id = idFromFrontMatter(raw);
    if (!id) continue;
    const { fm } = parseFrontMatter(raw);
    const slug = fm.slug || id;
    if (!htmlFiles.has(`${slug}.html`)) {
      fs.renameSync(mdPath, path.join(ARCHIVE_DIR, file));
      console.log(`archived (HTML deleted): ${file}`);
      archived++;
    }
  }

  if (archived === 0) {
    console.log("No deleted HTML pages found — nothing to sync.");
  } else {
    console.log(`\nArchived ${archived} post(s) whose HTML page was removed.`);
    console.log("Run: node scripts/06-checklist.js to refresh the checklist.");
  }
}

main();
