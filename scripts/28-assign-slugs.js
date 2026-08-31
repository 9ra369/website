#!/usr/bin/env node
// Phase 2 step 1 of the URL restructuring (see
// C:\Users\kuram\.claude\plans\modular-discovering-kahan.md): adds a stable
// `slug` frontmatter field to every content/posts/*.md, decoupling the
// post's URL from its title (currently tips/{slug}.html derives its slug
// from slugifyTitle(title) — any title edit renames the file, per
// scripts/lib/render-tip.js:28). Once `slug` exists, scripts/08 switches to
// reading it directly, so the Phase 3 title rewrite pass won't move URLs.
//
// Slug is derived from ASCII (English/proper-noun) tokens already present in
// the title — most titles already lead with a tool/person/company name in
// its original script, so this needs no romanization. Falls back to
// `post-{last 8 digits of the X status id}` for the rare title with no ASCII
// token at all. Collisions get the same id-suffix appended.
//
// Usage: node scripts/28-assign-slugs.js [--dry-run]

const fs = require("fs");
const path = require("path");
const { parseFrontMatter } = require("./lib/render-tip");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const DRY_RUN = process.argv.includes("--dry-run");

function extractSlug(title, id) {
  const tokens = (title.match(/[A-Za-z0-9]+(?:[.'_][A-Za-z0-9]+)*/g) || [])
    .map((t) => t.toLowerCase().replace(/[._']/g, "-"))
    .filter((t) => t.length > 1 && !/^\d+$/.test(t));
  let slug = tokens.slice(0, 6).join("-");
  if (!slug) slug = `post-${id.slice(-8)}`;
  return slug.slice(0, 60).replace(/-+$/, "");
}

function main() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const usedSlugs = new Set();
  let assigned = 0;
  let skipped = 0;

  for (const file of files) {
    const fpath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(fpath, "utf8");
    const { fm } = parseFrontMatter(raw);

    if (fm.slug) {
      usedSlugs.add(fm.slug);
      skipped++;
      continue; // already assigned
    }

    const idMatch = raw.match(/original_post:\s*"[^"]*\/status\/(\d+)"/);
    const id = idMatch ? idMatch[1] : file;
    let slug = extractSlug(fm.title || "", id);
    if (usedSlugs.has(slug)) slug = `${slug}-${id.slice(-6)}`;
    if (usedSlugs.has(slug)) slug = `${slug}-${id}`; // extremely unlikely 2nd collision
    usedSlugs.add(slug);

    const slugLine = `slug: ${JSON.stringify(slug)}`;
    const out = raw.replace(/^(title:.*)$/m, `$1\n${slugLine}`);
    if (out === raw) {
      console.warn(`⚠ ${file}: title line not matched, skipping.`);
      continue;
    }

    if (!DRY_RUN) fs.writeFileSync(fpath, out, "utf8");
    assigned++;
  }

  console.log(`${DRY_RUN ? "[dry-run] " : ""}Assigned ${assigned} slug(s), skipped ${skipped} (already had one).`);
}

main();
