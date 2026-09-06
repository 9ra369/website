#!/usr/bin/env node
// Step 32: downloads each planned video's YouTube thumbnail and, for roundup
// posts, composites the group's thumbnails into one collage banner.
//
// The playlist JSON already carries the exact i.ytimg.com URL that a thumbnail
// grabber site would hand back, so there is nothing to scrape — but the file is
// downloaded and re-encoded locally rather than hotlinked, matching how every
// other image on the site is handled (§5.2 of the migration spec).
//
// Collage geometry (§5.3): the card slot is `aspect-ratio: 16/9` with
// object-fit:cover, so the banner is rendered at 1200x675 and the tiles are
// laid out to fill it without the card having to crop anything. A 2x2 grid of
// 16:9 tiles is itself exactly 16:9; 2- and 3-video groups place their tiles
// inside that same grid and leave the remainder as card-coloured background.
//
// Requires a local ffmpeg under .tools/ (same as scripts 15/16/23/24).
//
// Usage:
//   node scripts/32-yt-fetch-thumbs.js
//   node scripts/32-yt-fetch-thumbs.js --force   (re-download / re-composite)

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const WORK_DIR = path.join(ROOT, "_work");
const UNITS_FILE = path.join(WORK_DIR, "yt-units.json");
const IMAGES_DIR = path.join(ROOT, "content", "images", "posts");
const TOOLS_DIR = path.join(ROOT, ".tools");

const MAX_DIMENSION = 1200; // same profile as scripts/16
const JPEG_QUALITY = 4;
const FETCH_TIMEOUT_MS = 15000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Collage canvas + the site's card surface colour (docs/03_spec.md §8).
const BANNER_W = 1200;
const BANNER_H = 675;
const BANNER_BG = "0x1A2128";
const GAP = 6;

const force = process.argv.includes("--force");

function findTool(exeName) {
  for (const entry of fs.readdirSync(TOOLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(TOOLS_DIR, entry.name, "bin", exeName);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`${exeName} not found under .tools/*/bin/.`);
}

const ffmpeg = findTool(process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, headers: { "User-Agent": UA } });
  } finally {
    clearTimeout(t);
  }
}

/** maxres isn't generated for every upload — fall back down the ladder (§5.2). */
function thumbCandidates(videoId, plannedUrl) {
  const ladder = ["maxresdefault", "sddefault", "hqdefault", "mqdefault"].map(
    (q) => `https://i.ytimg.com/vi/${videoId}/${q}.jpg`
  );
  return [...new Set([plannedUrl, ...ladder].filter(Boolean))];
}

async function downloadThumb(video) {
  const outPath = path.join(IMAGES_DIR, path.basename(video.image));
  if (fs.existsSync(outPath) && !force) return { status: "exists", outPath };

  let buf = null;
  let usedUrl = null;
  for (const url of thumbCandidates(video.videoId, video.thumbUrl)) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;
      const bytes = Buffer.from(await res.arrayBuffer());
      // YouTube answers some missing sizes with a tiny grey placeholder.
      if (bytes.length < 3000) continue;
      buf = bytes;
      usedUrl = url;
      break;
    } catch {
      /* try the next rung */
    }
  }
  if (!buf) return { status: "failed", reason: "no thumbnail URL responded" };

  const tmpPath = path.join(IMAGES_DIR, `_tmp-${video.videoId}.jpg`);
  fs.writeFileSync(tmpPath, buf);
  try {
    execFileSync(ffmpeg, [
      "-y",
      "-i", tmpPath,
      "-vf", `scale='min(${MAX_DIMENSION},iw)':'min(${MAX_DIMENSION},ih)':force_original_aspect_ratio=decrease`,
      "-q:v", String(JPEG_QUALITY),
      outPath,
      "-loglevel", "error",
    ]);
  } catch (e) {
    fs.unlinkSync(tmpPath);
    return { status: "failed", reason: `ffmpeg: ${e.message.slice(0, 120)}` };
  }
  fs.unlinkSync(tmpPath);
  return { status: "fetched", outPath, usedUrl };
}

/**
 * Tile rectangles inside the 1200x675 canvas. Cells are 16:9 so tiles are never
 * cropped; a 3-tile group centres its last tile on the bottom row rather than
 * leaving a hole in the corner, and a 2-tile group sits centred on one row.
 */
function layout(n) {
  const cell = (cols, rows) => ({
    w: Math.floor((BANNER_W - GAP * (cols - 1)) / cols),
    h: Math.floor((BANNER_H - GAP * (rows - 1)) / rows),
  });

  if (n <= 1) return [{ x: 0, y: 0, w: BANNER_W, h: BANNER_H }];

  // Side by side, letterboxed. Full-width rows would fill the canvas but have
  // to crop each 16:9 tile down to a 3.6:1 band, which decapitates the title
  // text YouTube thumbnails put at the top — the bars are the cheaper trade.
  if (n === 2) {
    const { w } = cell(2, 2);
    const h = Math.round((w * 9) / 16);
    const y = Math.round((BANNER_H - h) / 2);
    return [
      { x: 0, y, w, h },
      { x: w + GAP, y, w, h },
    ];
  }

  if (n === 3) {
    const { w, h } = cell(2, 2);
    return [
      { x: 0, y: 0, w, h },
      { x: w + GAP, y: 0, w, h },
      { x: Math.round((BANNER_W - w) / 2), y: h + GAP, w, h },
    ];
  }

  // Square grids of 16:9 tiles are themselves 16:9, so 2x2 and 3x3 both fill
  // the canvas exactly. Past 9 videos the tiles get too small to read, so the
  // banner shows the first 9 and the rest are still listed on the page.
  const cols = n <= 4 ? 2 : 3;
  const rows = n <= 6 ? 2 : 3;
  const { w, h } = cell(cols, rows);
  return Array.from({ length: Math.min(n, cols * rows) }, (_, i) => ({
    x: (i % cols) * (w + GAP),
    y: Math.floor(i / cols) * (h + GAP),
    w,
    h,
  }));
}

function buildCollage(unit) {
  const outPath = path.join(IMAGES_DIR, path.basename(unit.collage));
  // An append changes what the post contains, so its banner is always stale.
  const stale = unit.action === "append";
  if (fs.existsSync(outPath) && !force && !stale) return { status: "exists" };

  // collageImages covers the whole post (prior + new); unit.videos is only what
  // this batch adds, which would silently drop earlier videos from the banner.
  const all = unit.collageImages && unit.collageImages.length
    ? unit.collageImages
    : unit.videos.map((v) => v.image);
  const tiles = layout(all.length);
  const inputs = all.slice(0, tiles.length);
  const missing = inputs.filter((img) => !fs.existsSync(path.join(IMAGES_DIR, path.basename(img))));
  if (missing.length) return { status: "failed", reason: `missing tile: ${missing[0]}` };

  const args = ["-y"];
  for (const img of inputs) args.push("-i", path.join(IMAGES_DIR, path.basename(img)));

  const steps = [`color=c=${BANNER_BG}:s=${BANNER_W}x${BANNER_H}[bg]`];
  inputs.forEach((_, i) => {
    const t = tiles[i];
    steps.push(
      `[${i}:v]scale=${t.w}:${t.h}:force_original_aspect_ratio=increase,crop=${t.w}:${t.h}[t${i}]`
    );
  });
  let last = "bg";
  inputs.forEach((_, i) => {
    const t = tiles[i];
    const out = i === inputs.length - 1 ? "out" : `o${i}`;
    steps.push(`[${last}][t${i}]overlay=x=${t.x}:y=${t.y}[${out}]`);
    last = out;
  });

  args.push(
    "-filter_complex", steps.join(";"),
    "-map", "[out]",
    "-frames:v", "1",
    "-q:v", String(JPEG_QUALITY),
    outPath,
    "-loglevel", "error"
  );

  try {
    execFileSync(ffmpeg, args);
  } catch (e) {
    return { status: "failed", reason: `ffmpeg: ${e.message.slice(0, 200)}` };
  }
  return { status: "built" };
}

async function main() {
  if (!fs.existsSync(UNITS_FILE)) {
    console.error("_work/yt-units.json がありません。先に node scripts/31-yt-normalize.js を実行してください。");
    process.exit(1);
  }
  const plan = JSON.parse(fs.readFileSync(UNITS_FILE, "utf8"));
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const stats = { fetched: 0, exists: 0, failed: [], collages: 0 };

  for (const unit of plan.units) {
    for (const video of unit.videos) {
      const r = await downloadThumb(video);
      if (r.status === "fetched") {
        stats.fetched++;
        const note = r.usedUrl === video.thumbUrl ? "" : `  (fallback: ${r.usedUrl})`;
        console.log(`OK   ${path.basename(video.image)}${note}`);
      } else if (r.status === "exists") {
        stats.exists++;
      } else {
        stats.failed.push(`${video.videoId}: ${r.reason}`);
        console.warn(`⚠ ${video.videoId}: ${r.reason}`);
      }
    }
  }

  for (const unit of plan.units) {
    if (!unit.collage) continue;
    const r = buildCollage(unit);
    if (r.status === "built") {
      stats.collages++;
      const n = (unit.collageImages || unit.videos).length;
      console.log(`OK   ${path.basename(unit.collage)}  (${n}枚合成 — ${unit.channel})`);
    } else if (r.status === "failed") {
      stats.failed.push(`${unit.postId} collage: ${r.reason}`);
      console.warn(`⚠ ${unit.postId} collage: ${r.reason}`);
    }
  }

  console.log(
    `\nサムネイル: 取得 ${stats.fetched} / 既存 ${stats.exists} / 失敗 ${stats.failed.length}` +
      `　コラージュ: ${stats.collages}`
  );
  if (stats.failed.length) {
    console.log("\n失敗:");
    for (const f of stats.failed) console.log("  " + f);
    process.exitCode = 1;
  } else {
    console.log("\n次: node scripts/33-yt-write-posts.js");
  }
}

main();
