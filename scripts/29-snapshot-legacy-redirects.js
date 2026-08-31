#!/usr/bin/env node
// Phase 2 step 2: freezes the current tips/{old-filename}.html -> posts/{slug}.html
// mapping into data/legacy-redirects.json, BEFORE the Phase 3 title rewrite
// changes any titles. Old filenames are reproduced with the exact same
// slugifyTitle()+dedup logic scripts/08-build-tip-pages.js used to generate
// them, so this snapshot matches what's actually live/possibly-indexed on
// GitHub Pages right now. scripts/08 reads this manifest (not live
// frontmatter) to regenerate redirect stubs on every future build, so the
// stubs stay correct even after titles change.
//
// Usage: node scripts/29-snapshot-legacy-redirects.js

const fs = require("fs");
const path = require("path");
const { parseFrontMatter, slugifyTitle } = require("./lib/render-tip");
const { idFromFrontMatter } = require("./lib/checklist");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const OUT_FILE = path.resolve(__dirname, "..", "data", "legacy-redirects.json");

function main() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const usedSlugs = new Set();
  const redirects = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { fm } = parseFrontMatter(raw);
    const id = idFromFrontMatter(raw);
    if (!id) continue;

    const title = fm.title || "(無題)";
    let oldSlug = slugifyTitle(title) || id;
    if (usedSlugs.has(oldSlug)) oldSlug = `${oldSlug}_${id}`;
    usedSlugs.add(oldSlug);

    if (!fm.slug) {
      console.warn(`⚠ ${file}: no slug field yet — run scripts/28-assign-slugs.js first.`);
      continue;
    }

    redirects.push({ oldFile: `${oldSlug}.html`, newHref: `posts/${fm.slug}.html` });
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(redirects, null, 2) + "\n", "utf8");
  console.log(`Wrote ${redirects.length} redirect(s) -> ${path.relative(process.cwd(), OUT_FILE)}`);
}

main();
