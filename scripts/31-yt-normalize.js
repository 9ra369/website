#!/usr/bin/env node
// Step 31: reads _raw/youtube_playlist/*.json, groups the videos by channel,
// and decides what to do with each one — see youtube-playlist-migration-spec.md.
//
// The pipeline keys every post on the numeric id in `original_post`, so posts
// that never came from X still need one (§4.2). The hand-made roundup posts
// already use a synthetic 2090…0NN block; YouTube-sourced posts get 2091….
//
// Re-running must not renumber or re-date posts that already exist, so this
// script diffs against data/yt-processed.json — that manifest lives in data/
// rather than _work/ because _work/ is gitignored intermediate output, and
// losing this file would cost every post its id, slug and date. It belongs
// with the other durable pipeline state (legacy-redirects, retired-slugs).
// Each video is classified as:
//   skip   — already written in an earlier batch
//   append — new video from a channel that already has a post (merge into it)
//   create — new channel (or a first-batch group)
// (§4.6). Nothing is written to content/ here; this only produces the plan.
//
// Usage:
//   node scripts/31-yt-normalize.js --dry-run   (print the plan, write nothing)
//   node scripts/31-yt-normalize.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "_raw", "youtube_playlist");
const POSTS_DIR = path.join(ROOT, "content", "posts");
const WORK_DIR = path.join(ROOT, "_work");
const MANIFEST = path.join(ROOT, "data", "yt-processed.json");
const OUT_FILE = path.join(WORK_DIR, "yt-units.json");

const ID_PREFIX = "2091";
const ID_WIDTH = 19; // matches the existing 2090000000000000005-style ids
const SEQ_WIDTH = ID_WIDTH - ID_PREFIX.length - 12;

const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------- utilities

/** Channel grouping key (§3.1): trim -> lowercase -> collapse whitespace. */
function channelKey(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function kebab(str) {
  return String(str)
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function synthId(seq) {
  return ID_PREFIX + "0".repeat(12) + String(seq).padStart(SEQ_WIDTH, "0");
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round(
    (new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** The video id, from `Video url` (?v=/youtu.be) or the /vi/{id}/ thumbnail path. */
function videoIdOf(v) {
  const url = v["Video url"] || "";
  let m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/) || url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = (v["Thumbnail url"] || "").match(/\/vi\/([A-Za-z0-9_-]{6,})\//);
  return m ? m[1] : null;
}

// Lines that carry no descriptive content: bare URLs, hashtag walls, self-promo,
// chapter timestamps, and `----- Links -----` style dividers (§4.4.1). Chapter
// lines are dropped from the prose but kept separately — they're a useful
// outline of what the video covers.
const NOISE_RE =
  /^(https?:\/\/\S+|[#＃][^\s#]+(\s+[#＃][^\s#]+)*|.{0,40}(patreon|buymeacoffee|ko-fi|instagram\.com|twitter\.com|x\.com|discord|gumroad|linktr\.ee|tiktok)\S*.{0,40})$/i;
const DIVIDER_RE = /^[-=~_*\s]*[-=~_*]{3,}[-=~_*\s]*$/;
const CHAPTER_RE = /^\d{1,2}:\d{2}(:\d{2})?\s+\S/;

function splitDescription(raw) {
  const lines = String(raw || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const chapters = [];
  const prose = [];
  for (const line of lines) {
    if (CHAPTER_RE.test(line)) {
      chapters.push(line);
      continue;
    }
    if (DIVIDER_RE.test(line) || NOISE_RE.test(line)) continue;
    // A line that is mostly a URL with a couple of words around it.
    const withoutUrls = line.replace(/https?:\/\/\S+/g, "").trim();
    if (withoutUrls.length < 25) continue;
    prose.push(withoutUrls);
  }
  return { prose: prose.join("\n"), chapters };
}

/** Description tier (§4.4.1) — drives ai_confidence and how much is invented. */
function proseTier(prose) {
  const n = prose.replace(/\s+/g, "").length;
  if (n === 0) return "none";
  if (n < 120) return "thin";
  if (n < 400) return "standard";
  return "rich";
}

/** Series position from titles like "Part 2/3", "- 02 -", "EP01" (§3.3). */
function seriesIndex(title) {
  let m = title.match(/part\s*(\d+)\s*\/\s*\d+/i) || title.match(/\bEP\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  m = title.match(/\s-\s(\d{1,2})\s-\s/);
  if (m) return parseInt(m[1], 10);
  return null;
}

// ------------------------------------------------------------------ loading

function loadRawVideos() {
  const videos = [];
  for (const file of fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".json"))) {
    const playlist = file.replace(/\.json$/, "");
    for (const v of JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), "utf8"))) {
      const id = videoIdOf(v);
      if (!id) {
        console.warn(`⚠ ${playlist}: no video id for "${v.Title}" — skipping.`);
        continue;
      }
      const { prose, chapters } = splitDescription(v.Description);
      videos.push({
        videoId: id,
        playlist,
        title: v.Title,
        url: v["Video url"],
        thumbUrl: v["Thumbnail url"],
        channel: v["Channel name"],
        channelKey: channelKey(v["Channel name"]),
        duration: v["Duration in timestamp"],
        durationSeconds: v["Duration in seconds"],
        uploaded: (v["Uploaded Time"] || "").slice(0, 10),
        descriptionProse: prose,
        descriptionTier: proseTier(prose),
        chapters,
        tagsHint: parseListField(v.Tags).concat(parseListField(v["Tags (in description)"])),
        seriesIndex: seriesIndex(v.Title),
      });
    }
  }
  return videos;
}

/** The JSON stores tag lists as the string "[#a, #b]" rather than an array. */
function parseListField(value) {
  if (Array.isArray(value)) return value;
  const s = String(value || "").trim();
  if (!s || s === "[]") return [];
  return s
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) return { batches: [], videos: {}, channels: {} };
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

/** Min/max `date:` across content/posts — the span batch 1 spreads over (§4.5). */
function archiveDateRange() {
  const dates = [];
  for (const file of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"))) {
    const m = fs.readFileSync(path.join(POSTS_DIR, file), "utf8").match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);
    if (m) dates.push(m[1]);
  }
  dates.sort();
  return { first: dates[0], last: dates[dates.length - 1] };
}

// ----------------------------------------------------------------- planning

function main() {
  const videos = loadRawVideos();
  const manifest = loadManifest();
  const runDate = todayISO();
  const batchNo = manifest.batches.length + 1;

  // --- classify -----------------------------------------------------------
  const skipped = [];
  const pending = [];
  for (const v of videos) {
    if (manifest.videos[v.videoId]) skipped.push(v);
    else pending.push(v);
  }

  // --- group by channel (§3.1) -------------------------------------------
  const byChannel = new Map();
  for (const v of pending) {
    if (!byChannel.has(v.channelKey)) byChannel.set(v.channelKey, []);
    byChannel.get(v.channelKey).push(v);
  }

  const creates = [];
  const appends = [];
  for (const [key, vids] of byChannel) {
    sortWithinGroup(vids);
    const existing = manifest.channels[key];
    if (existing) appends.push({ channelKey: key, existing, videos: vids });
    else creates.push({ channelKey: key, videos: vids });
  }

  // Oldest-video-first, so older material lands on older dates (§4.5).
  creates.sort((a, b) => (earliestUpload(a.videos) < earliestUpload(b.videos) ? -1 : 1));

  // --- assign dates -------------------------------------------------------
  const dates = assignDates(creates.length, manifest, runDate);

  // --- assign ids ---------------------------------------------------------
  let seq = manifest.batches.reduce((max, b) => Math.max(max, b.seq[1]), 0);

  const units = [];
  creates.forEach((group, i) => {
    const postId = synthId(++seq);
    units.push(buildUnit("create", group, postId, dates[i]));
  });
  for (const group of appends) {
    units.push(buildUnit("append", group, group.existing.postId, group.existing.date, group.existing));
  }

  const plan = {
    runDate,
    batch: batchNo,
    idPrefix: ID_PREFIX,
    seqRange: [manifest.batches.reduce((max, b) => Math.max(max, b.seq[1]), 0) + 1, seq],
    counts: {
      videosInRaw: videos.length,
      skip: skipped.length,
      create: creates.length,
      append: appends.length,
      createdVideos: creates.reduce((n, g) => n + g.videos.length, 0),
      appendedVideos: appends.reduce((n, g) => n + g.videos.length, 0),
    },
    dateRange: dates.length ? [dates[0], dates[dates.length - 1]] : null,
    units,
  };

  report(plan, skipped);

  if (DRY_RUN) {
    console.log("\n[dry-run] _work/yt-units.json は書き出していません。");
    return;
  }
  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(plan, null, 2) + "\n", "utf8");
  console.log(`\n✓ ${path.relative(ROOT, OUT_FILE)} を書き出しました。`);
  console.log("  次: node scripts/32-yt-fetch-thumbs.js");
}

function earliestUpload(videos) {
  return videos.map((v) => v.uploaded).sort()[0];
}

/** Series order when the titles are numbered, otherwise oldest-first (§3.3). */
function sortWithinGroup(videos) {
  const allNumbered = videos.length > 1 && videos.every((v) => v.seriesIndex !== null);
  if (allNumbered) videos.sort((a, b) => a.seriesIndex - b.seriesIndex);
  else videos.sort((a, b) => (a.uploaded < b.uploaded ? -1 : 1));
}

/**
 * Batch 1 spreads across the whole existing archive; later batches use the run
 * date, or spread from the previous run when the batch is large (§4.5/§4.6).
 * Never returns a future date.
 */
function assignDates(count, manifest, runDate) {
  if (count === 0) return [];

  if (manifest.batches.length === 0) {
    const { first, last } = archiveDateRange();
    const span = daysBetween(first, last);
    const step = Math.max(1, Math.floor(span / count));
    return Array.from({ length: count }, (_, i) => addDays(first, step * i));
  }

  if (count <= 6) return Array.from({ length: count }, () => runDate);

  const prevRun = manifest.batches[manifest.batches.length - 1].runDate;
  const span = daysBetween(prevRun, runDate);
  const step = Math.max(1, Math.floor(span / count));
  return Array.from({ length: count }, (_, i) => {
    const d = addDays(prevRun, step * (i + 1));
    return d > runDate ? runDate : d;
  });
}

function buildUnit(action, group, postId, date, existing) {
  const videos = group.videos.map((v) => ({
    ...v,
    image: `images/posts/${postId}-${v.videoId}.jpg`,
  }));
  const totalVideos = action === "append" ? existing.videoCount + videos.length : videos.length;
  const channel = videos[0].channel;

  return {
    action,
    postId,
    date,
    channel,
    channelKey: group.channelKey,
    slug: existing ? existing.slug : null,
    slugHint: existing ? existing.slug : kebab(channel),
    kind: totalVideos > 1 ? "roundup" : "single",
    totalVideos,
    playlists: [...new Set(videos.map((v) => v.playlist))],
    collage: totalVideos > 1 ? `images/posts/${postId}-collage-banner.jpg` : null,
    videos,
  };
}

function report(plan, skipped) {
  const c = plan.counts;
  console.log(`バッチ ${plan.batch}（実行日 ${plan.runDate}）`);
  console.log(`  _raw の動画: ${c.videosInRaw}本`);
  console.log(`  skip  : ${c.skip}本（処理済み）`);
  console.log(`  create: ${c.create}ポスト / ${c.createdVideos}本`);
  console.log(`  append: ${c.append}ポスト / ${c.appendedVideos}本`);
  if (plan.dateRange) console.log(`  日付   : ${plan.dateRange[0]} .. ${plan.dateRange[1]}`);
  console.log("");

  for (const u of plan.units) {
    const kind = u.kind === "roundup" ? `まとめ×${u.totalVideos}` : "単独";
    const mark = u.action === "append" ? "＋" : " ";
    console.log(`${mark} ${u.date}  ${u.postId}  [${kind}]  ${u.channel}`);
    for (const v of u.videos) {
      console.log(`      ${v.duration.padStart(8)}  ${v.descriptionTier.padEnd(8)}  ${v.title.slice(0, 60)}`);
    }
    if (u.action === "append") {
      console.log(`      → 既存ポスト ${u.slug} に追記（date/slug/id は変更しない）`);
    }
  }

  if (skipped.length) {
    console.log(`\n処理済みのためスキップ: ${skipped.length}本`);
  }
}

main();
