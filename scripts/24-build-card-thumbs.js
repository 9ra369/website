#!/usr/bin/env node
// Generates the small still image each entry-card in a listing uses, so that
// listings stop serving full-size assets through a ~300px-wide card slot.
//
// The problem this solves: every card renderer used images[0] of the post
// directly. On prototype/archive.html that meant 250 <img> tags pointing at
// the originals — including all 27 GIFs — for 288MB of transfer on a single
// page load, even though only 24 cards are visible at a time (archive.js
// paginates by toggling display:none, which does not stop the fetch).
//
// For every image that is the FIRST image of some post (i.e. the one that
// becomes that post's thumbnail), this writes a 400px-wide JPEG into
// content/images/cards/. GIFs contribute only their first frame, so an
// animated 22MB GIF becomes a ~30KB still. Cards then point at the card
// thumb and only the post page itself loads the real GIF.
//
// Naming: {original stem}.jpg — e.g. images/posts/1234-abcd.gif becomes
// images/cards/1234-abcd.jpg. cardThumbSrc() in scripts/lib/render-tip.js
// does that same mapping at render time and falls back to the original when
// no card thumb exists, so the site still renders if this script hasn't run.
//
// Requires a local ffmpeg under .tools/ (same as scripts 15/16/23).
//
// Usage:
//   node scripts/24-build-card-thumbs.js
//   node scripts/24-build-card-thumbs.js --force   (regenerate existing)
//   node scripts/24-build-card-thumbs.js --prune   (also delete orphans)
//
// Then: node scripts/17-sync-images.js  (copies them into prototype/)

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { parseFrontMatter, extractImages } = require("./lib/render-tip");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const IMAGES_DIR = path.resolve(__dirname, "..", "content", "images", "posts");
const CARDS_DIR = path.resolve(__dirname, "..", "content", "images", "cards");
const TOOLS_DIR = path.resolve(__dirname, "..", ".tools");

// 400px wide covers the ~300px card slot on a 2x display without being a
// meaningful download. q:v 5 is a touch lighter than the q4 used for the
// full-size photos — at card size the difference is invisible.
const CARD_WIDTH = 400;
const CARD_JPEG_QUALITY = 5;

const args = process.argv.slice(2);
const force = args.includes("--force");
const prune = args.includes("--prune");

function findTool(exeName) {
  for (const entry of fs.readdirSync(TOOLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(TOOLS_DIR, entry.name, "bin", exeName);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`${exeName} not found under .tools/*/bin/.`);
}

/** The set of image basenames that actually appear as some post's thumbnail.
 *  Non-first images only ever show inside the post's own gallery, which
 *  loads the originals, so they need no card thumb. */
function collectThumbnailSources() {
  const wanted = new Set();
  for (const file of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { images } = extractImages(parseFrontMatter(raw).body);
    if (images.length === 0) continue;
    wanted.add(path.basename(images[0].src));
  }
  return wanted;
}

function cardNameFor(fileName) {
  return fileName.replace(/\.[^.]+$/, "") + ".jpg";
}

/** Scales to CARD_WIDTH but never upscales a source that is already smaller.
 *  "-frames:v 1" takes the first frame, which is what makes an animated GIF
 *  collapse to a tiny still. */
function encodeCard(ffmpeg, srcPath, outPath) {
  execFileSync(ffmpeg, [
    "-y",
    "-i", srcPath,
    "-frames:v", "1",
    "-vf", `scale='min(${CARD_WIDTH},iw)':-2:flags=lanczos`,
    "-q:v", String(CARD_JPEG_QUALITY),
    outPath,
    "-loglevel", "error",
  ]);
}

function main() {
  const ffmpeg = findTool("ffmpeg.exe");
  fs.mkdirSync(CARDS_DIR, { recursive: true });

  const wanted = collectThumbnailSources();
  const stats = { built: 0, skipped: 0, missing: [], failed: [], pruned: 0 };
  let srcBytes = 0;
  let outBytes = 0;

  for (const fileName of [...wanted].sort()) {
    const srcPath = path.join(IMAGES_DIR, fileName);
    if (!fs.existsSync(srcPath)) {
      stats.missing.push(fileName);
      continue;
    }
    const outPath = path.join(CARDS_DIR, cardNameFor(fileName));

    if (fs.existsSync(outPath) && !force) {
      stats.skipped++;
      continue;
    }
    try {
      encodeCard(ffmpeg, srcPath, outPath);
      srcBytes += fs.statSync(srcPath).size;
      outBytes += fs.statSync(outPath).size;
      stats.built++;
    } catch (e) {
      stats.failed.push({ fileName, reason: e.message.slice(0, 150) });
    }
  }

  if (prune) {
    const keep = new Set([...wanted].map(cardNameFor));
    for (const f of fs.readdirSync(CARDS_DIR)) {
      if (!keep.has(f)) {
        fs.unlinkSync(path.join(CARDS_DIR, f));
        stats.pruned++;
      }
    }
  }

  console.log("\nDone.");
  console.log(`  card thumbs built:   ${stats.built}`);
  console.log(`  already existed:     ${stats.skipped}`);
  if (stats.built) {
    console.log(
      `  size of those:       ${(srcBytes / 1e6).toFixed(1)}MB -> ${(outBytes / 1e6).toFixed(1)}MB`
    );
  }
  if (stats.pruned) console.log(`  orphans pruned:      ${stats.pruned}`);
  if (stats.missing.length) {
    console.log(`  source image missing (${stats.missing.length}):`);
    for (const f of stats.missing) console.log(`    - ${f}`);
  }
  if (stats.failed.length) {
    console.log(`  failed (${stats.failed.length}):`);
    for (const f of stats.failed) console.log(`    - ${f.fileName}: ${f.reason}`);
  }
  console.log(`\nNext: node scripts/17-sync-images.js, then rebuild pages (08/11/14/22).`);
}

main();
