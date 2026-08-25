#!/usr/bin/env node
// Adds a `mentions:` frontmatter field (other X accounts referenced in the
// original post) to existing content/posts/*.md drafts, sourced from the
// freshly re-normalized triage report. Skips files that already have a
// mentions line, and posts with no mentions.
//
// Usage: node scripts/12-add-mentions.js

const fs = require("fs");
const path = require("path");
const { idFromFrontMatter } = require("./lib/checklist");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const REPORT_FILE = path.resolve(__dirname, "..", "_work", "triage-report.json");
const OWN_SCREEN_NAME = "kuramaKageya";

function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_FILE, "utf8"));
  const mentionsById = new Map(report.units.map((u) => [u.id, u.mentions || []]));

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  let added = 0;
  let skippedNone = 0;
  let skippedExisting = 0;

  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    if (/^mentions:/m.test(raw)) {
      skippedExisting++;
      continue;
    }
    const id = idFromFrontMatter(raw);
    const mentions = (mentionsById.get(id) || [])
      .map((m) => m.screenName)
      .filter((sn) => sn.toLowerCase() !== OWN_SCREEN_NAME.toLowerCase());

    if (mentions.length === 0) {
      skippedNone++;
      continue;
    }

    const line = `mentions: [${mentions.map((sn) => JSON.stringify(sn)).join(", ")}]\n`;
    // Insert right after the tags line so related fields stay grouped.
    const newRaw = raw.replace(/^(tags:\s*\[.*\]\s*\n)/m, `$1${line}`);
    fs.writeFileSync(mdPath, newRaw, "utf8");
    added++;
  }

  console.log(`Added mentions to ${added} file(s). ${skippedNone} had none, ${skippedExisting} already had a mentions line.`);
}

main();
