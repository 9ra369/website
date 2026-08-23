#!/usr/bin/env node
// Step 5 (x-archive-migration-spec.md §2/§6): Markdown書き出し。
//
// Usage: node scripts/05-write-markdown.js <ai-fields.json>
//   <ai-fields.json>: { [tweetId]: { title, summary, tags, category, confidence } }
//   Only units present as keys in this file are written (lets you run a small
//   test batch before doing the full set).
// Output: content/posts/*.md (or content/_triage/*.md for low-confidence ones)

const fs = require("fs");
const path = require("path");
const { writeMarkdownFile } = require("./lib/markdown");

const REPORT_FILE = path.resolve(__dirname, "..", "_work", "triage-report.json");
const CONTENT_ROOT = path.resolve(__dirname, "..", "content");

function main() {
  const aiFieldsPath = process.argv[2];
  if (!aiFieldsPath) {
    console.error("Usage: node scripts/05-write-markdown.js <ai-fields.json>");
    process.exit(1);
  }
  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`Missing ${REPORT_FILE} — run scripts/02-triage.js first.`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_FILE, "utf8"));
  const aiFields = JSON.parse(fs.readFileSync(path.resolve(aiFieldsPath), "utf8"));
  const unitsById = new Map(report.units.map((u) => [u.id, u]));

  let written = 0;
  const counts = { posts: 0, _triage: 0 };
  for (const [id, fields] of Object.entries(aiFields)) {
    const unit = unitsById.get(id);
    if (!unit) {
      console.warn(`⚠ id ${id} not found in triage report, skipping.`);
      continue;
    }
    if (unit.bucket !== "posts") {
      console.warn(`⚠ id ${id} is classified as ${unit.bucket}, not posts/ — skipping.`);
      continue;
    }
    const result = writeMarkdownFile(unit, fields, CONTENT_ROOT);
    counts[result.dir]++;
    written++;
    console.log(`  ${result.dir}/${result.fileName}`);
  }

  console.log(`\nWrote ${written} file(s): ${counts.posts} -> content/posts/, ${counts._triage} -> content/_triage/`);
}

main();
