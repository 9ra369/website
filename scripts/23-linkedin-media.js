#!/usr/bin/env node
// For posts sourced from LinkedIn, LinkedIn itself serves no usable og:image
// to a plain fetch (script 16 comes back empty for those URLs), so those posts
// were left with no thumbnail at all. This script resolves the post's real
// attached media through myfeedin.co's public free-tool endpoints — the two
// pages at /free-tools/linkedin-image-downloader and
// /free-tools/linkedin-video-downloader post to these same APIs — then:
//
//   * image posts  -> downloads the image, re-encodes it to the site's photo
//                     profile (<=1200px long edge, JPEG q4) as {id}-li.jpg
//   * video posts  -> downloads the highest-bitrate MP4 variant and converts
//                     the whole clip to a GIF ({id}-li.gif), at scripts/15's
//                     settings for short clips and a lighter profile for long
//                     ones (see GIF_SHORT / GIF_LONG below)
//
// When a post has BOTH an image and a video, the image is inserted first so it
// becomes the thumbnail (extractImages() in scripts/lib/render-tip.js always
// uses images[0]), and the GIF follows it in the gallery.
//
// Idempotent: skips media already on disk, and never inserts a markdown image
// line that the post already references.
//
// Requires a local ffmpeg/ffprobe under .tools/ (same as scripts 15/16).
//
// Usage:
//   node scripts/23-linkedin-media.js                     (LinkedIn posts with no image)
//   node scripts/23-linkedin-media.js --include-existing   (also posts that already have images)
//   node scripts/23-linkedin-media.js --force              (re-download / re-encode)
//   node scripts/23-linkedin-media.js --threshold=120      (max video length, seconds)
//   node scripts/23-linkedin-media.js --dry-run

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { parseFrontMatter, extractImages } = require("./lib/render-tip");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const IMAGES_DIR = path.resolve(__dirname, "..", "content", "images", "posts");
const TOOLS_DIR = path.resolve(__dirname, "..", ".tools");
const TMP_DIR = path.resolve(__dirname, "..", "_work", "linkedin-media");

const API_BASE = "https://myfeedin.co/api/linkedin";
const FETCH_TIMEOUT_MS = 60000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Photo profile — matches scripts/16-fetch-og-thumbnails.js.
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 4;

// GIF profiles. LinkedIn clips run much longer than the X-sourced ones script
// 15 handles (those are capped at 15s), so a single profile does not work: at
// script 15's settings a 57s clip encodes to ~54MB, several times the largest
// GIF already on the site (~23MB). Anything past LONG_CLIP_SEC therefore drops
// to half the width and fps so the whole clip still fits in the same size
// range as the existing GIFs rather than being truncated.
const LONG_CLIP_SEC = 20;
const GIF_SHORT = { width: 960, fps: 8, colors: 96 }; // same as scripts/15
const GIF_LONG = { width: 640, fps: 5, colors: 64 };

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const includeExisting = args.includes("--include-existing");
const thresholdArg = args.find((a) => a.startsWith("--threshold="));
const THRESHOLD_SEC = thresholdArg ? parseFloat(thresholdArg.split("=")[1]) : 90;

function findTool(exeName) {
  for (const entry of fs.readdirSync(TOOLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(TOOLS_DIR, entry.name, "bin", exeName);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`${exeName} not found under .tools/*/bin/.`);
}

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { "User-Agent": UA, ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

function callApi(endpoint, postUrl) {
  return fetchWithTimeout(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: postUrl }),
  });
}

/** A LinkedIn URL that points at a specific post/article — a bare /feed/ or a
 *  company/profile page carries no media we can resolve. */
function isResolvableLinkedInUrl(url) {
  if (!/linkedin\.com\//i.test(url)) return false;
  return /\/(posts|pulse)\//i.test(url) || /urn:li:activity:\d+/i.test(url);
}

/** myfeedin returns the <video> tag's data-sources JSON; pick the highest
 *  bitrate MP4. The key is "bitrate" on some responses and "data-bitrate" on
 *  others, depending on how LinkedIn rendered the post. */
function bestMp4FromVideoTag(payload) {
  const tag = payload.videoTag || "";
  const m = tag.match(/data-sources="([^"]+)"/);
  if (m) {
    const decoded = m[1]
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    try {
      const sources = JSON.parse(decoded).filter((s) => (s.type || "").includes("mp4"));
      sources.sort(
        (a, b) => (b.bitrate || b["data-bitrate"] || 0) - (a.bitrate || a["data-bitrate"] || 0)
      );
      if (sources[0]) return sources[0].src;
    } catch (e) {
      /* malformed data-sources — fall back to the plain videoUrl below */
    }
  }
  return payload.videoUrl || null;
}

async function download(url, destPath) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error(`response too small (${buf.length} bytes)`);
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

function encodePhoto(ffmpeg, srcPath, outPath) {
  execFileSync(ffmpeg, [
    "-y",
    "-i", srcPath,
    "-vf",
    `scale='min(${MAX_DIMENSION},iw)':'min(${MAX_DIMENSION},ih)':force_original_aspect_ratio=decrease`,
    "-q:v", String(JPEG_QUALITY),
    outPath,
    "-loglevel", "error",
  ]);
}

function probeDuration(ffprobe, filePath) {
  const out = execFileSync(
    ffprobe,
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", filePath],
    { encoding: "utf8" }
  );
  return parseFloat(out.trim());
}

function convertToGif(ffmpeg, srcPath, outPath, profile) {
  const paletteFile = outPath.replace(/\.gif$/, ".palette.png");
  const scaleFilter = `scale=${profile.width}:-1:flags=lanczos`;
  execFileSync(ffmpeg, [
    "-y",
    "-i", srcPath,
    "-vf", `fps=${profile.fps},${scaleFilter},palettegen=max_colors=${profile.colors}`,
    paletteFile,
    "-loglevel", "error",
  ]);
  execFileSync(ffmpeg, [
    "-y",
    "-i", srcPath,
    "-i", paletteFile,
    "-filter_complex", `fps=${profile.fps},${scaleFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
    outPath,
    "-loglevel", "error",
  ]);
  fs.unlinkSync(paletteFile);
}

/** Inserts the given image lines directly after the front matter, in order, so
 *  the first one becomes the post's thumbnail. */
function insertImageLines(mdPath, relPaths) {
  const raw = fs.readFileSync(mdPath, "utf8");
  const missing = relPaths.filter((p) => !raw.includes(p));
  if (missing.length === 0) return 0;
  const fmEnd = raw.indexOf("\n---\n");
  if (fmEnd === -1) return 0;
  const insertAt = fmEnd + "\n---\n".length;
  const block = missing.map((p) => `\n![](${p})`).join("") + "\n";
  fs.writeFileSync(mdPath, raw.slice(0, insertAt) + block + raw.slice(insertAt), "utf8");
  return missing.length;
}

async function processPost(file, ffmpeg, ffprobe, stats) {
  const mdPath = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(mdPath, "utf8");
  const { fm, body } = parseFrontMatter(raw);
  const sourceUrl = fm.source_url || "";
  if (!/linkedin\.com/i.test(sourceUrl)) return;

  const hasImages = extractImages(body).images.length > 0;
  if (hasImages && !includeExisting) return;

  if (!isResolvableLinkedInUrl(sourceUrl)) {
    stats.unresolvableUrl.push(file);
    return;
  }

  const idMatch = raw.match(/original_post:\s*"[^"]*\/status\/(\d+)"/);
  const id = idMatch ? idMatch[1] : file.replace(/\.md$/, "");
  const jpgPath = path.join(IMAGES_DIR, `${id}-li.jpg`);
  const gifPath = path.join(IMAGES_DIR, `${id}-li.gif`);
  const jpgRel = `images/posts/${id}-li.jpg`;
  const gifRel = `images/posts/${id}-li.gif`;

  const inserts = [];

  // ---- still image ----
  if (fs.existsSync(jpgPath) && !force) {
    inserts.push(jpgRel);
    stats.imageAlreadyHave++;
  } else {
    let payload = null;
    try {
      const res = await callApi("get-image", sourceUrl);
      if (res.ok) payload = await res.json();
    } catch (e) {
      stats.failed.push({ file, reason: `get-image: ${e.message}` });
    }
    if (payload && payload.imageUrl) {
      if (dryRun) {
        console.log(`[dry-run] ${file}: image ${payload.imageUrl}`);
        inserts.push(jpgRel);
      } else {
        const tmp = path.join(TMP_DIR, `${id}-li-src.img`);
        try {
          await download(payload.imageUrl, tmp);
          encodePhoto(ffmpeg, tmp, jpgPath);
          fs.unlinkSync(tmp);
          inserts.push(jpgRel);
          stats.images++;
          console.log(`IMG: ${file} -> ${path.basename(jpgPath)}`);
        } catch (e) {
          stats.failed.push({ file, reason: `image download/encode: ${e.message.slice(0, 150)}` });
        }
      }
    }
  }

  // ---- video -> gif ----
  if (fs.existsSync(gifPath) && !force) {
    inserts.push(gifRel);
    stats.gifAlreadyHave++;
  } else {
    let payload = null;
    try {
      const res = await callApi("get-video", sourceUrl);
      if (res.ok) payload = await res.json();
    } catch (e) {
      stats.failed.push({ file, reason: `get-video: ${e.message}` });
    }
    const mp4Url = payload ? bestMp4FromVideoTag(payload) : null;
    if (mp4Url) {
      if (dryRun) {
        console.log(`[dry-run] ${file}: video ${mp4Url}`);
        inserts.push(gifRel);
      } else {
        const tmp = path.join(TMP_DIR, `${id}-li.mp4`);
        try {
          // The MP4 stays in gitignored _work/ so a re-encode does not have to
          // re-download it (LinkedIn's signed URLs expire).
          const bytes = fs.existsSync(tmp) ? fs.statSync(tmp).size : await download(mp4Url, tmp);
          const duration = probeDuration(ffprobe, tmp);
          if (duration > THRESHOLD_SEC) {
            stats.tooLong.push({ file, duration });
          } else {
            const profile = duration > LONG_CLIP_SEC ? GIF_LONG : GIF_SHORT;
            convertToGif(ffmpeg, tmp, gifPath, profile);
            inserts.push(gifRel);
            stats.gifs++;
            const mb = (fs.statSync(gifPath).size / 1e6).toFixed(1);
            console.log(
              `GIF: ${file} (${duration.toFixed(1)}s, mp4 ${(bytes / 1e6).toFixed(1)}MB) -> ${path.basename(gifPath)} ${mb}MB @ ${profile.width}px/${profile.fps}fps`
            );
          }
        } catch (e) {
          stats.failed.push({ file, reason: `video download/convert: ${e.message.slice(0, 150)}` });
        }
      }
    }
  }

  if (inserts.length === 0) {
    stats.noMedia.push(file);
    return;
  }
  if (dryRun) return;
  // inserts is already ordered image-then-gif, so the still becomes the thumbnail.
  if (insertImageLines(mdPath, inserts) > 0) stats.mdUpdated++;
}

async function main() {
  const ffmpeg = findTool("ffmpeg.exe");
  const ffprobe = findTool("ffprobe.exe");
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const stats = {
    images: 0,
    gifs: 0,
    imageAlreadyHave: 0,
    gifAlreadyHave: 0,
    mdUpdated: 0,
    noMedia: [],
    unresolvableUrl: [],
    tooLong: [],
    failed: [],
  };

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  for (const file of files) await processPost(file, ffmpeg, ffprobe, stats);

  console.log("\nDone.");
  console.log(`  images fetched:   ${stats.images}`);
  console.log(`  gifs converted:   ${stats.gifs}`);
  console.log(`  already had jpg:  ${stats.imageAlreadyHave}`);
  console.log(`  already had gif:  ${stats.gifAlreadyHave}`);
  console.log(`  markdown updated: ${stats.mdUpdated}`);
  if (stats.noMedia.length) {
    console.log(`  no media found (${stats.noMedia.length}):`);
    for (const f of stats.noMedia) console.log(`    - ${f}`);
  }
  if (stats.unresolvableUrl.length) {
    console.log(`  LinkedIn URL not a specific post (${stats.unresolvableUrl.length}):`);
    for (const f of stats.unresolvableUrl) console.log(`    - ${f}`);
  }
  if (stats.tooLong.length) {
    console.log(`  video longer than ${THRESHOLD_SEC}s, skipped (${stats.tooLong.length}):`);
    for (const t of stats.tooLong) console.log(`    - ${t.file} (${t.duration.toFixed(1)}s)`);
  }
  if (stats.failed.length) {
    console.log(`  failed (${stats.failed.length}):`);
    for (const f of stats.failed) console.log(`    - ${f.file}: ${f.reason}`);
  }
  console.log(
    `\nNext: node scripts/08-build-tip-pages.js && node scripts/11-build-archive.js && node scripts/14-build-homepage.js`
  );
}

main();
