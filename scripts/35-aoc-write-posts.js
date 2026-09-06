#!/usr/bin/env node
// Step 35: turns _work/aoc-units.json (scripts/34) plus the authored fields in
// _work/aoc-ai-fields.json into content/posts/*.md, then records what was
// written in data/aoc-processed.json so a later batch can diff against it.
// The manifest lives in data/ rather than gitignored _work/ for the same
// reason data/yt-processed.json does: it is the only record of which X post
// became which slug.
//
// These posts are somebody else's writing (@Suggybro's "Art of Composition"
// series), so every one of them carries the attribution the site can show:
//   - mentions: ["Suggybro", ...]  -> the "Xアカウント" sidebar box
//   - the last source_url entry    -> a labelled link back to his original post
//   - author / author_x            -> recorded in frontmatter (not rendered)
//
// Body text is kept as a record only — render-tip.js shows the summary, the
// images and the source links, not the markdown body (same as every other post).
//
// Usage:
//   node scripts/35-aoc-write-posts.js --dry-run
//   node scripts/35-aoc-write-posts.js

const fs = require("fs");
const path = require("path");
const { inferTaxonomy } = require("./lib/taxonomy");
const { cleanBody, fileNameFor } = require("./lib/markdown");

const ROOT = path.resolve(__dirname, "..");
const UNITS_FILE = path.join(ROOT, "_work", "aoc-units.json");
const FIELDS_FILE = path.join(ROOT, "_work", "aoc-ai-fields.json");
const MANIFEST = path.join(ROOT, "data", "aoc-processed.json");
const POSTS_DIR = path.join(ROOT, "content", "posts");

const CATEGORY = "art-of-composition";
const AUTHOR = "Ryota Sugisaki";

const DRY_RUN = process.argv.includes("--dry-run");

function yamlString(value) {
  return JSON.stringify(value == null ? "" : value);
}

function yamlList(values) {
  if (!values || values.length === 0) return "[]";
  return `[${values.map(yamlString).join(", ")}]`;
}

/**
 * source_url must stay on ONE line: parseFrontMatter() in lib/render-tip.js is
 * a line-based JSON reader, not a YAML parser.
 *
 * The authored citations come first (the artwork or museum page being
 * analysed), then the link back to the original X post. render-tip.js draws a
 * divider before the first x.com entry, so the credit reads as separate from
 * the artwork citations rather than as one more of them.
 */
function sourceUrlLine(unit, fields) {
  const entries = [...(fields.sources || [])];
  entries.push({
    url: unit.originalPostUrl,
    label: `分析の全文は${AUTHOR}氏（@${unit.handle}）のXポストで確認`,
  });
  return JSON.stringify(entries);
}

function buildFrontMatter(unit, fields) {
  const { topics, tools, type } = inferTaxonomy({ category: CATEGORY, tags: fields.tags });
  const mentions = [unit.handle, ...(unit.mentions || [])];
  return [
    "---",
    `title: ${yamlString(fields.title)}`,
    `slug: ${yamlString(fields.slug)}`,
    `date: ${unit.date}`,
    `category: ${yamlString(CATEGORY)}`,
    `type: ${yamlString(type)}`,
    `tags: ${yamlList(fields.tags)}`,
    `topics: ${yamlList(topics)}`,
    `tools: ${yamlList(tools)}`,
    `mentions: ${yamlList(mentions)}`,
    `source_url: ${sourceUrlLine(unit, fields)}`,
    `language: ${yamlString(fields.language || "日本語")}`,
    `original_post: ${yamlString(unit.originalPostUrl)}`,
    `summary: ${yamlString(fields.summary)}`,
    `source_type: "x-guest"`,
    `author: ${yamlString(AUTHOR)}`,
    `author_x: ${yamlString(unit.handle)}`,
    `series: ${yamlString(`Art of Composition Day${unit.dayLabel}`)}`,
    `ai_confidence: ${yamlString(fields.confidence || "high")}`,
    "status: draft",
    "---",
    "",
  ].join("\n");
}

function loadJson(file, what) {
  if (!fs.existsSync(file)) {
    console.error(`${path.relative(ROOT, file)} がありません（${what}）。`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main() {
  const { handle, units } = loadJson(UNITS_FILE, "先に scripts/34-aoc-normalize.js を実行してください");
  const fieldsById = loadJson(FIELDS_FILE, "title/summary/tags を書いたファイル");

  const manifest = fs.existsSync(MANIFEST)
    ? JSON.parse(fs.readFileSync(MANIFEST, "utf8"))
    : { source: "x-guest:Suggybro", series: "Art of Composition", posts: {} };

  const results = [];
  for (const unit of units) {
    const fields = fieldsById[unit.id];
    if (!fields) {
      results.push({ id: unit.id, status: "skipped", reason: "aoc-ai-fields.json に項目がありません" });
      continue;
    }
    if (manifest.posts[unit.id]) {
      results.push({ id: unit.id, status: "skipped", reason: `処理済み (${manifest.posts[unit.id].slug})` });
      continue;
    }

    const file = fileNameFor({ createdAt: unit.createdAt }, fields);
    const dest = path.join(POSTS_DIR, file);
    if (fs.existsSync(dest)) {
      results.push({ id: unit.id, status: "failed", reason: `既に同名のファイルがあります: ${file}` });
      continue;
    }

    const content = buildFrontMatter({ ...unit, handle }, fields) + "\n" + cleanBody(unit) + "\n";
    if (!DRY_RUN) {
      fs.writeFileSync(dest, content, "utf8");
      manifest.posts[unit.id] = { slug: fields.slug, date: unit.date, day: unit.dayLabel, file };
    }
    results.push({ id: unit.id, status: "created", file, day: unit.dayLabel });
  }

  for (const r of results) {
    const tail = r.status === "created" ? r.file : r.reason;
    console.log(`  ${r.status.padEnd(8)} ${r.id}  ${tail}`);
  }
  const created = results.filter((r) => r.status === "created").length;
  const failed = results.filter((r) => r.status === "failed").length;
  console.log(`\ncreated ${created} / skipped ${results.length - created - failed} / failed ${failed}`);

  if (DRY_RUN) {
    console.log("--dry-run: 何も書き込んでいません。");
    return;
  }
  if (failed > 0) {
    console.error("失敗があるため data/aoc-processed.json は更新しません。");
    process.exit(1);
  }
  manifest.lastRun = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Updated ${path.relative(ROOT, MANIFEST)}`);
}

main();
