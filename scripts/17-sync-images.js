#!/usr/bin/env node
// Copies content/images/posts/* (the site's own image storage, kept in git)
// into prototype/images/posts/* (what the static prototype pages actually
// reference at runtime). Without this step, newly added photos/GIFs/og-thumbs
// exist in content/ but never show up on the actual site — only copies
// files that are new or changed (by size), so it's cheap to re-run.
//
// Usage: node scripts/17-sync-images.js

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(__dirname, "..", "content", "images", "posts");
const DEST_DIR = path.resolve(__dirname, "..", "prototype", "images", "posts");

function main() {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  const files = fs.readdirSync(SRC_DIR);

  let copied = 0;
  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(DEST_DIR, file);
    const srcStat = fs.statSync(srcPath);
    if (!srcStat.isFile()) continue;

    const destExists = fs.existsSync(destPath);
    const needsCopy = !destExists || fs.statSync(destPath).size !== srcStat.size;
    if (needsCopy) {
      fs.copyFileSync(srcPath, destPath);
      copied++;
    }
  }

  console.log(`Synced ${copied} new/changed file(s) -> ${path.relative(process.cwd(), DEST_DIR)}`);
  console.log(`(${files.length} total in content/images/posts/)`);
}

main();
