#!/usr/bin/env node
// Copies content/images/* (the site's own image storage, kept in git) into
// prototype/images/* (what the static prototype pages actually reference at
// runtime). Without this step, newly added photos/GIFs/og-thumbs exist in
// content/ but never show up on the actual site — only copies files that are
// new or changed (by size), so it's cheap to re-run.
//
// Two subdirectories are synced:
//   posts/ — the full-size images, loaded by a post's own page
//   cards/ — the 400px stills built by scripts/24-build-card-thumbs.js and
//            used by every entry-card in a listing
//
// Usage: node scripts/17-sync-images.js

const fs = require("fs");
const path = require("path");

const CONTENT_IMAGES = path.resolve(__dirname, "..", "content", "images");
const PROTOTYPE_IMAGES = path.resolve(__dirname, "..", "prototype", "images");
const SUBDIRS = ["posts", "cards"];

function syncDir(name) {
  const srcDir = path.join(CONTENT_IMAGES, name);
  const destDir = path.join(PROTOTYPE_IMAGES, name);
  if (!fs.existsSync(srcDir)) return null;
  fs.mkdirSync(destDir, { recursive: true });

  const files = fs.readdirSync(srcDir);
  let copied = 0;
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    const srcStat = fs.statSync(srcPath);
    if (!srcStat.isFile()) continue;

    const destExists = fs.existsSync(destPath);
    const needsCopy = !destExists || fs.statSync(destPath).size !== srcStat.size;
    if (needsCopy) {
      fs.copyFileSync(srcPath, destPath);
      copied++;
    }
  }
  return { copied, total: files.length, destDir };
}

function main() {
  for (const name of SUBDIRS) {
    const r = syncDir(name);
    if (!r) {
      console.log(`Skipped ${name}/ (content/images/${name} does not exist yet)`);
      continue;
    }
    console.log(`Synced ${r.copied} new/changed file(s) -> ${path.relative(process.cwd(), r.destDir)}`);
    console.log(`  (${r.total} total in content/images/${name}/)`);
  }
}

main();
