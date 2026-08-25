#!/usr/bin/env node
// For posts whose original X post had a short attached video (or animated_gif),
// converts that video to a GIF and inserts it as the FIRST image in the post's
// markdown body — making it the hero/thumbnail image (see extractImages() in
// scripts/lib/render-tip.js, which always uses images[0] as the thumbnail).
// Any pre-existing photos in the post (e.g. from a merged-thread tweet that
// also had photo attachments) are left in place and simply come after the
// GIF in the gallery.
//
// "Short" defaults to <=15 seconds (per user direction). Idempotent: skips
// videos whose GIF already exists, and skips inserting the image line if the
// post's body already references that GIF.
//
// Requires a local ffmpeg/ffprobe under .tools/ (gitignored; see
// docs/04_content-guide.md or ask — not auto-downloaded by this script).
//
// Usage:
//   node scripts/15-video-to-gif-thumbs.js               (threshold: 15s)
//   node scripts/15-video-to-gif-thumbs.js --threshold=20
//   node scripts/15-video-to-gif-thumbs.js --force        (regenerate existing GIFs)

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { loadYtd, findArchiveRoot } = require("./lib/archive");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const IMAGES_DIR = path.resolve(__dirname, "..", "content", "images", "posts");
const TOOLS_DIR = path.resolve(__dirname, "..", ".tools");

const args = process.argv.slice(2);
const force = args.includes("--force");
const thresholdArg = args.find((a) => a.startsWith("--threshold="));
const THRESHOLD_SEC = thresholdArg ? parseFloat(thresholdArg.split("=")[1]) : 15;

// GIF encode settings. Width bumped up to 960px per user direction (native
// resolution — up to 4K on some sources — produced 30-50MB single GIFs,
// impractical for a website; 960px keeps them noticeably sharper than the
// original 280px pass while staying in the ~10-15MB range).
const GIF_WIDTH = 960;
const GIF_FPS = 8;
const GIF_MAX_COLORS = 96;

function findTool(exeName) {
  if (!fs.existsSync(TOOLS_DIR)) {
    throw new Error(`.tools/ not found. ${exeName} is required — see the conversation for how it was obtained.`);
  }
  for (const entry of fs.readdirSync(TOOLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(TOOLS_DIR, entry.name, "bin", exeName);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`${exeName} not found under .tools/*/bin/.`);
}

function probeDuration(ffprobe, filePath) {
  const out = execFileSync(
    ffprobe,
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", filePath],
    { encoding: "utf8" }
  );
  return parseFloat(out.trim());
}

function convertToGif(ffmpeg, srcPath, outPath) {
  const paletteFile = outPath.replace(/\.gif$/, ".palette.png");
  const scaleFilter = `scale=${GIF_WIDTH}:-1:flags=lanczos`;
  execFileSync(ffmpeg, [
    "-y",
    "-i", srcPath,
    "-vf", `fps=${GIF_FPS},${scaleFilter},palettegen=max_colors=${GIF_MAX_COLORS}`,
    paletteFile,
    "-loglevel", "error",
  ]);
  execFileSync(ffmpeg, [
    "-y",
    "-i", srcPath,
    "-i", paletteFile,
    "-filter_complex", `fps=${GIF_FPS},${scaleFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
    outPath,
    "-loglevel", "error",
  ]);
  fs.unlinkSync(paletteFile);
}

function localVideoFileName(id, mediaUrlHttps) {
  const base = path.basename(new URL(mediaUrlHttps).pathname);
  return { fileName: `${id}-${base}`, base };
}

function bestMp4Variant(media) {
  const variants = ((media.video_info && media.video_info.variants) || []).filter(
    (v) => v.content_type === "video/mp4"
  );
  variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  return variants[0];
}

function main() {
  const ffmpeg = findTool("ffmpeg.exe");
  const ffprobe = findTool("ffprobe.exe");
  const mediaDir = path.join(findArchiveRoot(), "data", "tweets_media");

  const rawTweets = loadYtd("tweets");
  const tweetById = new Map(rawTweets.map((r) => [r.tweet.id_str, r.tweet]));

  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const stats = { converted: 0, alreadyGif: 0, tooLong: 0, noVideo: 0, missingSource: 0, mdUpdated: 0 };

  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const idMatch = raw.match(/original_post:\s*"[^"]*\/status\/(\d+)"/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const tweet = tweetById.get(id);
    if (!tweet) continue;

    const media = (tweet.extended_entities && tweet.extended_entities.media) || [];
    const videos = media.filter((m) => m.type === "video" || m.type === "animated_gif");
    if (videos.length === 0) {
      stats.noVideo++;
      continue;
    }

    for (const v of videos) {
      const best = bestMp4Variant(v);
      if (!best) continue;
      const { fileName, base } = localVideoFileName(id, best.url);
      const srcPath = path.join(mediaDir, fileName);
      if (!fs.existsSync(srcPath)) {
        stats.missingSource++;
        continue;
      }

      const gifName = `${id}-${base.replace(/\.[^.]+$/, "")}.gif`;
      const gifPath = path.join(IMAGES_DIR, gifName);
      const gifRelPath = `images/posts/${gifName}`;

      if (fs.existsSync(gifPath) && !force) {
        stats.alreadyGif++;
      } else {
        const duration = probeDuration(ffprobe, srcPath);
        if (duration > THRESHOLD_SEC) {
          stats.tooLong++;
          continue;
        }
        convertToGif(ffmpeg, srcPath, gifPath);
        console.log(`GIF: ${file} (${duration.toFixed(1)}s) -> ${gifName}`);
        stats.converted++;
      }

      // Insert as the FIRST image in the body so it becomes the thumbnail.
      const currentRaw = fs.readFileSync(mdPath, "utf8");
      if (currentRaw.includes(gifRelPath)) continue; // already referenced
      const fmEnd = currentRaw.indexOf("\n---\n");
      if (fmEnd === -1) continue;
      const insertAt = fmEnd + "\n---\n".length;
      const updated =
        currentRaw.slice(0, insertAt) +
        `\n![](${gifRelPath})\n` +
        currentRaw.slice(insertAt);
      fs.writeFileSync(mdPath, updated, "utf8");
      stats.mdUpdated++;
    }
  }

  console.log("\nDone.");
  console.log(`  converted:        ${stats.converted}`);
  console.log(`  already had GIF:  ${stats.alreadyGif}`);
  console.log(`  markdown updated: ${stats.mdUpdated}`);
  console.log(`  too long (>${THRESHOLD_SEC}s): ${stats.tooLong}`);
  console.log(`  no video attached: ${stats.noVideo}`);
  if (stats.missingSource) console.log(`  ⚠ missing source file: ${stats.missingSource}`);
  console.log(`\nNext: node scripts/08-build-tip-pages.js && node scripts/11-build-archive.js && node scripts/14-build-homepage.js`);
}

main();
