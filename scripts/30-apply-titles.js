#!/usr/bin/env node
// Phase 3 of the IA spec rollout: applies the title-convention rewrite
// (research/vfx-cg-site-spec.md §4) to all 260 posts' frontmatter `title`.
// The new titles were drafted in scratchpad review batches (proper-noun
// front-loaded, " — " separator, 【】 limited to status badges, no banned
// words/"!", half-width digits/chars — see scripts/lib/taxonomy.js sibling
// commit message for the design notes) and are read here from a mapping
// file: {sourceFilename: newTitle}.
//
// Only rewrites `title` — `slug` (scripts/28-assign-slugs.js) was already
// decoupled from the title in Phase 2, so this does not change any URL.
//
// Usage: node scripts/30-apply-titles.js <mapping.json> [--dry-run]

const fs = require("fs");
const path = require("path");
const { parseFrontMatter } = require("./lib/render-tip");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const DRY_RUN = process.argv.includes("--dry-run");
const mappingArg = process.argv.slice(2).find((a) => !a.startsWith("--"));

function main() {
  if (!mappingArg) {
    console.error("Usage: node scripts/30-apply-titles.js <mapping.json> [--dry-run]");
    process.exit(1);
  }
  const mapping = JSON.parse(fs.readFileSync(mappingArg, "utf8"));

  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const [file, newTitle] of Object.entries(mapping)) {
    const fpath = path.join(POSTS_DIR, file);
    if (!fs.existsSync(fpath)) {
      console.warn(`⚠ ${file}: not found in content/posts/, skipping.`);
      missing++;
      continue;
    }
    const raw = fs.readFileSync(fpath, "utf8");
    const { fm } = parseFrontMatter(raw);

    if (fm.title === newTitle) {
      unchanged++;
      continue;
    }

    const out = raw.replace(/^title:.*$/m, `title: ${JSON.stringify(newTitle)}`);
    if (out === raw) {
      console.warn(`⚠ ${file}: title line not matched, skipping.`);
      continue;
    }

    if (!DRY_RUN) fs.writeFileSync(fpath, out, "utf8");
    updated++;
  }

  console.log(
    `${DRY_RUN ? "[dry-run] " : ""}Updated ${updated} title(s), ${unchanged} already matched, ${missing} file(s) not found.`
  );
}

main();
