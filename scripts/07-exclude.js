#!/usr/bin/env node
// Excludes posts by their checklist number: moves the corresponding file
// (from content/posts/ or content/_triage/) into content/_archive/. Never
// deletes — matches the spec's "移動する、削除はしない" rule. If an item was
// never generated yet, writes a small stub into _archive/ so it's correctly
// skipped by future runs and shown as excluded in the checklist.
//
// Usage: node scripts/07-exclude.js <number> [number...]

const fs = require("fs");
const path = require("path");
const { buildChecklist } = require("./lib/checklist");

const REPORT_FILE = path.resolve(__dirname, "..", "_work", "triage-report.json");
const CONTENT_ROOT = path.resolve(__dirname, "..", "content");
const ARCHIVE_DIR = path.join(CONTENT_ROOT, "_archive");

function main() {
  const numbers = process.argv.slice(2).map(Number);
  if (numbers.length === 0) {
    console.error("Usage: node scripts/07-exclude.js <number> [number...]");
    process.exit(1);
  }
  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`Missing ${REPORT_FILE} — run scripts/02-triage.js first.`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_FILE, "utf8"));
  const rows = buildChecklist(report);
  const byNumber = new Map(rows.map((r) => [r.number, r]));
  const unitsById = new Map(report.units.map((u) => [u.id, u]));

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  for (const n of numbers) {
    const row = byNumber.get(n);
    if (!row) {
      console.warn(`⚠ #${n}: not found in checklist, skipping.`);
      continue;
    }
    if (row.state === "excluded") {
      console.log(`#${n}: already excluded.`);
      continue;
    }
    if (row.file) {
      const srcDir = row.state === "triage" ? "_triage" : "posts";
      const srcPath = path.join(CONTENT_ROOT, srcDir, row.file);
      const destPath = path.join(ARCHIVE_DIR, row.file);
      fs.renameSync(srcPath, destPath);
      console.log(`#${n}: moved ${srcDir}/${row.file} -> _archive/`);
    } else {
      const unit = unitsById.get(row.id);
      const fileName = `${row.date}_excluded-${row.id}.md`;
      const stub = [
        "---",
        `title: ""`,
        `date: ${row.date}`,
        `category: ""`,
        "tags: []",
        `source_url: ""`,
        `original_post: "${unit.originalPostUrl}"`,
        `summary: ""`,
        "status: excluded",
        "---",
        "",
        "（未生成のまま除外）",
        "",
      ].join("\n");
      fs.writeFileSync(path.join(ARCHIVE_DIR, fileName), stub, "utf8");
      console.log(`#${n}: never generated — wrote exclusion stub to _archive/${fileName}`);
    }
  }
}

main();
