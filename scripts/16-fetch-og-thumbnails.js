#!/usr/bin/env node
// For posts with no image at all but a source_url (external tutorial/tool/
// article page), fetches that page's og:image (falling back to
// twitter:image), downloads it, and re-encodes it via ffmpeg to roughly match
// the size profile of the site's other photos (capped at 1200px on the long
// edge, JPEG, ~100-300KB typical) rather than whatever size the source site
// happens to serve. Posts that still end up with no image after this simply
// fall back to the category-color placeholder (see scripts/lib/render-tip.js).
//
// Usage:
//   node scripts/16-fetch-og-thumbnails.js
//   node scripts/16-fetch-og-thumbnails.js --force   (re-fetch even if already has an og-thumb)

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { parseFrontMatter, extractImages } = require("./lib/render-tip");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const IMAGES_DIR = path.resolve(__dirname, "..", "content", "images", "posts");
const TOOLS_DIR = path.resolve(__dirname, "..", ".tools");

const force = process.argv.includes("--force");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const FETCH_TIMEOUT_MS = 15000;
const MAX_DIMENSION = 1200; // matches the long edge of the site's existing X-sourced photos
const JPEG_QUALITY = 4; // ffmpeg -q:v scale (2=best..31=worst); ~4 lands near the site's ~100-300KB photos
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

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
    return await fetch(url, { ...opts, signal: controller.signal, headers: { "User-Agent": UA, ...(opts.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

// Known generic/app-shell placeholder og:images that some sites serve
// regardless of page content (not a real thumbnail for that specific URL).
const GENERIC_IMAGE_PATTERNS = [
  /notion\.(so|com)\/images\/meta\/default/i,
  /\/favicons?\//i,
  /favicon\.ico(\?|$)/i,
];

function isGenericPlaceholder(url) {
  return GENERIC_IMAGE_PATTERNS.some((re) => re.test(url));
}

function extractMetaImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

async function processPost(file, ffmpeg, stats) {
  const mdPath = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(mdPath, "utf8");
  const { fm, body } = parseFrontMatter(raw);
  const { images } = extractImages(body);
  if (images.length > 0) return; // already has a thumbnail
  if (!fm.source_url) {
    stats.noUrl++;
    return;
  }
  const idMatch = raw.match(/original_post:\s*"[^"]*\/status\/(\d+)"/);
  const id = idMatch ? idMatch[1] : file.replace(/\.md$/, "");
  const outPath = path.join(IMAGES_DIR, `${id}-og.jpg`);
  const outRel = `images/posts/${id}-og.jpg`;

  if (fs.existsSync(outPath) && !force) {
    // Ensure it's referenced even if a prior run converted it but the write failed.
    if (!raw.includes(outRel)) insertImageLine(mdPath, outRel);
    stats.alreadyHave++;
    return;
  }

  let pageRes;
  try {
    pageRes = await fetchWithTimeout(fm.source_url);
  } catch (e) {
    stats.failed.push({ file, reason: `page fetch error: ${e.message}` });
    return;
  }
  if (!pageRes.ok) {
    stats.failed.push({ file, reason: `page HTTP ${pageRes.status}` });
    return;
  }
  const html = await pageRes.text();
  const imgUrlRaw = extractMetaImage(html);
  if (!imgUrlRaw) {
    stats.failed.push({ file, reason: "no og:image/twitter:image found" });
    return;
  }
  let imgUrl;
  try {
    imgUrl = new URL(imgUrlRaw, pageRes.url).toString();
  } catch (e) {
    stats.failed.push({ file, reason: `bad image URL: ${imgUrlRaw}` });
    return;
  }
  if (isGenericPlaceholder(imgUrl)) {
    stats.failed.push({ file, reason: `generic placeholder image, skipped: ${imgUrl}` });
    return;
  }

  let imgRes;
  try {
    imgRes = await fetchWithTimeout(imgUrl);
  } catch (e) {
    stats.failed.push({ file, reason: `image fetch error: ${e.message}` });
    return;
  }
  if (!imgRes.ok || !(imgRes.headers.get("content-type") || "").startsWith("image/")) {
    stats.failed.push({ file, reason: `image fetch not ok (${imgRes.status}, ${imgRes.headers.get("content-type")})` });
    return;
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  if (buf.length < 2000) {
    stats.failed.push({ file, reason: `image too small (${buf.length} bytes, likely a tracking pixel/icon)` });
    return;
  }

  const tmpPath = path.join(IMAGES_DIR, `_tmp-${id}${path.extname(new URL(imgUrl).pathname) || ".img"}`);
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
    stats.failed.push({ file, reason: `ffmpeg convert error: ${e.message.slice(0, 150)}` });
    fs.unlinkSync(tmpPath);
    return;
  }
  fs.unlinkSync(tmpPath);

  insertImageLine(mdPath, outRel);
  stats.fetched++;
  console.log(`OK: ${file} <- ${imgUrl}`);
}

function insertImageLine(mdPath, relPath) {
  const currentRaw = fs.readFileSync(mdPath, "utf8");
  if (currentRaw.includes(relPath)) return;
  const fmEnd = currentRaw.indexOf("\n---\n");
  if (fmEnd === -1) return;
  const insertAt = fmEnd + "\n---\n".length;
  const updated = currentRaw.slice(0, insertAt) + `\n![](${relPath})\n` + currentRaw.slice(insertAt);
  fs.writeFileSync(mdPath, updated, "utf8");
}

async function main() {
  const ffmpeg = findTool("ffmpeg.exe");
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const stats = { fetched: 0, alreadyHave: 0, noUrl: 0, failed: [] };

  let attempted = 0;
  for (const file of files) {
    if (attempted >= LIMIT) break;
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { images } = extractImages(parseFrontMatter(raw).body);
    if (images.length > 0) continue; // doesn't count toward --limit
    attempted++;
    await processPost(file, ffmpeg, stats);
  }

  console.log("\nDone.");
  console.log(`  fetched:          ${stats.fetched}`);
  console.log(`  already had og-thumb: ${stats.alreadyHave}`);
  console.log(`  no source_url:    ${stats.noUrl}`);
  console.log(`  failed:           ${stats.failed.length}`);
  for (const f of stats.failed) console.log(`    - ${f.file}: ${f.reason}`);
  console.log(`\nNext: node scripts/08-build-tip-pages.js && node scripts/11-build-archive.js && node scripts/14-build-homepage.js`);
}

main();
