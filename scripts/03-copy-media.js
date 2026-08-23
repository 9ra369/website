#!/usr/bin/env node
// Copies photo attachments for triaged posts/ units from _raw/ into
// content/images/posts/, and records the local path back into the report.
//
// Usage: node scripts/03-copy-media.js
// Reads:  _work/triage-report.json (from scripts/02-triage.js)
// Writes: content/images/posts/*, _work/triage-report.json (updated in place)

const fs = require("fs");
const path = require("path");
const { copyPhotoMedia } = require("./lib/media");

const REPORT_FILE = path.resolve(__dirname, "..", "_work", "triage-report.json");
const DEST_DIR = path.resolve(__dirname, "..", "content", "images", "posts");

function main() {
  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`Missing ${REPORT_FILE} — run scripts/02-triage.js first.`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(REPORT_FILE, "utf8"));
  const postsUnits = report.units.filter((u) => u.bucket === "posts");

  const stats = copyPhotoMedia(postsUnits, DEST_DIR);

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");

  console.log(`Checked photo media for ${postsUnits.length} posts/ units.`);
  console.log(`  copied:            ${stats.copied} -> ${path.relative(process.cwd(), DEST_DIR)}`);
  console.log(`  skipped (video/gif): ${stats.skippedNonPhoto}`);
  if (stats.missing.length) {
    console.log(`  ⚠ missing (not found in archive): ${stats.missing.length}`);
    for (const m of stats.missing.slice(0, 10)) {
      console.log(`    unit ${m.unit}: ${m.fileName}`);
    }
    if (stats.missing.length > 10) console.log(`    ...and ${stats.missing.length - 10} more`);
  }
  console.log(`\nUpdated ${path.relative(process.cwd(), REPORT_FILE)} with media localPath.`);
}

main();
