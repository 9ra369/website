#!/usr/bin/env node
// Step 33: turns the plan from scripts/31 plus the authored fields in
// _work/yt-ai-fields.json into content/posts/*.md, then records what was
// written in _work/yt-processed.json so the next batch can diff against it.
//
// Two post shapes (§4.1 of the migration spec):
//   single  — one video: thumbnail as the body image, plain-string source_url,
//             exactly like every X-sourced post.
//   roundup — several videos from one channel: collage banner as the body
//             image, and source_url as an array of {url,label,image} so
//             render-tip.js lists each video with its own thumbnail.
//
// `append` units merge new videos into a post an earlier batch already wrote.
// They rewrite source_url, title and summary but never date, slug or id (§4.6).
//
// Usage:
//   node scripts/33-yt-write-posts.js --dry-run
//   node scripts/33-yt-write-posts.js

const fs = require("fs");
const path = require("path");
const { parseFrontMatter } = require("./lib/render-tip");
const { inferTaxonomy } = require("./lib/taxonomy");
const { fileNameFor } = require("./lib/markdown");

const ROOT = path.resolve(__dirname, "..");
const WORK_DIR = path.join(ROOT, "_work");
const UNITS_FILE = path.join(WORK_DIR, "yt-units.json");
const FIELDS_FILE = path.join(WORK_DIR, "yt-ai-fields.json");
const MANIFEST = path.join(WORK_DIR, "yt-processed.json");
const POSTS_DIR = path.join(ROOT, "content", "posts");

const X_HANDLE = "kuramaKageya"; // matches the synthetic ids already in use

const DRY_RUN = process.argv.includes("--dry-run");

function yamlString(value) {
  return JSON.stringify(value == null ? "" : value);
}

function yamlList(values) {
  if (!values || values.length === 0) return "[]";
  return `[${values.map(yamlString).join(", ")}]`;
}

/** Label for one video in a roundup's source list: title + running time. */
function videoLabel(video, overrides) {
  const custom = overrides && overrides[video.videoId];
  return custom || `${video.title}（${video.duration}）`;
}

/**
 * source_url must be a single line: parseFrontMatter() is a line-based JSON
 * reader, not a YAML parser, so a block-style array would be dropped (§4.4).
 */
function sourceUrlLine(unit, fields) {
  if (unit.kind === "single") return yamlString(unit.videos[0].url);
  const entries = unit.videos.map((v) => ({
    url: v.url,
    label: videoLabel(v, fields.videoLabels),
    image: v.image,
  }));
  return JSON.stringify(entries);
}

function buildFrontMatter(unit, fields, allVideos) {
  const { topics, tools, type } = inferTaxonomy({ category: fields.category, tags: fields.tags });
  const lines = [
    "---",
    `title: ${yamlString(fields.title)}`,
    `slug: ${yamlString(fields.slug)}`,
    `date: ${unit.date}`,
    `category: ${yamlString(fields.category)}`,
    `type: ${yamlString(type)}`,
    `tags: ${yamlList(fields.tags)}`,
    `topics: ${yamlList(topics)}`,
    `tools: ${yamlList(tools)}`,
  ];
  if (fields.mentions && fields.mentions.length) lines.push(`mentions: ${yamlList(fields.mentions)}`);
  lines.push(
    `source_url: ${sourceUrlLine({ ...unit, videos: allVideos }, fields)}`,
    `language: ${yamlString(fields.language || "英語")}`,
    `original_post: ${yamlString(`https://x.com/${X_HANDLE}/status/${unit.postId}`)}`,
    `summary: ${yamlString(fields.summary)}`,
    `source_type: "youtube-playlist"`,
    `playlists: ${yamlList(unit.playlists)}`,
    `ai_confidence: ${yamlString(fields.confidence || "high")}`,
    "status: draft",
    "---",
    ""
  );
  return lines.join("\n");
}

function buildBody(unit, fields) {
  const image = unit.kind === "roundup" ? unit.collage : unit.videos[0].image;
  return `![](${image})\n\n${fields.body.trim()}\n`;
}

function loadJson(file, what) {
  if (!fs.existsSync(file)) {
    console.error(`${path.relative(ROOT, file)} がありません（${what}）。`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) return { batches: [], videos: {}, channels: {} };
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

/** Locates the .md an earlier batch wrote for this post id. */
function findPostFile(postId) {
  for (const file of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    if (raw.includes(`/status/${postId}"`)) return file;
  }
  return null;
}

function writeCreate(unit, fields) {
  const file = fileNameFor({ createdAt: `${unit.date}T00:00:00` }, fields);
  const dest = path.join(POSTS_DIR, file);
  if (fs.existsSync(dest)) {
    return { status: "failed", reason: `既に同名のファイルがあります: ${file}` };
  }
  const content = buildFrontMatter(unit, fields, unit.videos) + "\n" + buildBody(unit, fields);
  if (!DRY_RUN) fs.writeFileSync(dest, content, "utf8");
  return { status: "created", file };
}

/**
 * Merges new videos into an existing post: source_url gains the new entries,
 * title and summary are replaced with the authored ones (they carry the new
 * "全N本" count). date/slug/original_post are left exactly as they were.
 */
function writeAppend(unit, fields) {
  const file = findPostFile(unit.postId);
  if (!file) return { status: "failed", reason: `postId ${unit.postId} のポストが見つかりません` };

  const fpath = path.join(POSTS_DIR, file);
  let raw = fs.readFileSync(fpath, "utf8");
  const { fm, body } = parseFrontMatter(raw);

  const existing = Array.isArray(fm.source_url)
    ? fm.source_url.map((e) => (typeof e === "string" ? { url: e, label: null, image: null } : e))
    : fm.source_url
      ? [{ url: fm.source_url, label: null, image: null }]
      : [];
  const known = new Set(existing.map((e) => e.url));
  const added = unit.videos
    .filter((v) => !known.has(v.url))
    .map((v) => ({ url: v.url, label: videoLabel(v, fields.videoLabels), image: v.image }));

  // A post that was a single before now needs a real label and thumbnail on
  // its original entry, otherwise the list renders one bare "URL" row.
  const merged = [...existing, ...added].map((e) =>
    e.label ? e : { ...e, label: fields.videoLabels?.[urlVideoId(e.url)] || e.label || "URL" }
  );

  raw = replaceLine(raw, "source_url", JSON.stringify(merged));
  raw = replaceLine(raw, "title", yamlString(fields.title));
  raw = replaceLine(raw, "summary", yamlString(fields.summary));

  // Swap the single thumbnail in the body for the regenerated collage banner.
  if (unit.collage && !body.includes(unit.collage)) {
    raw = raw.replace(/!\[\]\(images\/posts\/[^)]+\)/, `![](${unit.collage})`);
  }

  if (!DRY_RUN) fs.writeFileSync(fpath, raw, "utf8");
  return { status: "appended", file, added: added.length };
}

function urlVideoId(url) {
  const m = String(url).match(/[?&]v=([A-Za-z0-9_-]{6,})/) || String(url).match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function replaceLine(raw, key, value) {
  const re = new RegExp(`^${key}:.*$`, "m");
  if (!re.test(raw)) throw new Error(`frontmatter に ${key} 行がありません`);
  return raw.replace(re, `${key}: ${value}`);
}

function main() {
  const plan = loadJson(UNITS_FILE, "先に scripts/31 を実行してください");
  const fieldsById = loadJson(FIELDS_FILE, "title/summary/tags/body を用意してください");
  const manifest = loadManifest();

  const missing = plan.units.filter((u) => !fieldsById[u.postId]);
  if (missing.length) {
    console.error(`_work/yt-ai-fields.json に ${missing.length} 件ぶんの記述がありません:`);
    for (const u of missing) console.error(`  ${u.postId}  ${u.channel}`);
    process.exit(1);
  }

  const results = { created: 0, appended: 0, failed: [] };
  const written = [];

  for (const unit of plan.units) {
    const fields = fieldsById[unit.postId];
    if (!fields.slug) {
      results.failed.push(`${unit.postId}: slug がありません`);
      continue;
    }
    const r = unit.action === "append" ? writeAppend(unit, fields) : writeCreate(unit, fields);
    if (r.status === "failed") {
      results.failed.push(`${unit.postId}: ${r.reason}`);
      console.warn(`⚠ ${unit.postId}: ${r.reason}`);
      continue;
    }
    results[r.status === "created" ? "created" : "appended"]++;
    written.push({ unit, fields, file: r.file });
    const note = r.status === "appended" ? `（+${r.added}本）` : "";
    console.log(`${r.status === "created" ? "新規" : "追記"}  ${unit.date}  ${r.file}${note}`);
  }

  if (results.failed.length) {
    console.log(`\n失敗 ${results.failed.length} 件。マニフェストは更新しません。`);
    process.exitCode = 1;
    return;
  }

  // --- manifest -----------------------------------------------------------
  for (const { unit, fields, file } of written) {
    for (const v of unit.videos) {
      manifest.videos[v.videoId] = { batch: plan.batch, postId: unit.postId, date: unit.date };
    }
    manifest.channels[unit.channelKey] = {
      postId: unit.postId,
      slug: fields.slug,
      date: unit.date,
      file,
      videoCount: unit.totalVideos,
    };
  }
  manifest.batches.push({
    batch: plan.batch,
    runDate: plan.runDate,
    idPrefix: plan.idPrefix,
    seq: plan.seqRange,
    dateRange: plan.dateRange,
    counts: plan.counts,
  });

  if (DRY_RUN) {
    console.log(`\n[dry-run] 新規 ${results.created} / 追記 ${results.appended}。ファイルは書いていません。`);
    return;
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`\n新規 ${results.created} / 追記 ${results.appended}`);
  console.log(`✓ ${path.relative(ROOT, MANIFEST)} を更新しました。`);
  console.log("\n次: node scripts/24-build-card-thumbs.js → 17 → 08 → 11/14/20/21/26/27/22");
}

main();
