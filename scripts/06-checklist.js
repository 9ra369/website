#!/usr/bin/env node
// Generates content/_checklist.md — a numbered progress checklist over every
// posts/ bucket unit, re-derived each run from content/posts, content/_triage,
// content/_archive. Safe to re-run any time; it never writes into those
// folders itself.
//
// Usage: node scripts/06-checklist.js

const fs = require("fs");
const path = require("path");
const { buildChecklist, renderMarkdown } = require("./lib/checklist");

const REPORT_FILE = path.resolve(__dirname, "..", "_work", "triage-report.json");
const OUT_FILE = path.resolve(__dirname, "..", "content", "_checklist.md");

function main() {
  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`Missing ${REPORT_FILE} — run scripts/02-triage.js first.`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(REPORT_FILE, "utf8"));
  const rows = buildChecklist(report);
  fs.writeFileSync(OUT_FILE, renderMarkdown(rows), "utf8");
  console.log(`Wrote ${rows.length} rows -> ${path.relative(process.cwd(), OUT_FILE)}`);
}

main();
