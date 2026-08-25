#!/usr/bin/env node
// Merges each post's original X hashtags into its `tags:` frontmatter field
// (spec: "tags: [] # AI生成 + 元ハッシュタグ" — this step adds the 元ハッシュタグ
// half, which the earlier batches skipped). Dedupes case-insensitively,
// keeping the AI-authored tag's casing when both exist and appending
// hashtags verbatim (as originally written on X) otherwise.
//
// Usage: node scripts/10-merge-hashtags.js

const fs = require("fs");
const path = require("path");
const { idFromFrontMatter } = require("./lib/checklist");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const REPORT_FILE = path.resolve(__dirname, "..", "_work", "triage-report.json");

function mergeTags(existing, hashtags) {
  const seen = new Map(); // lowercase -> chosen casing
  for (const t of existing) seen.set(t.toLowerCase(), t);
  const merged = [...existing];
  for (const h of hashtags) {
    const key = h.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, h);
      merged.push(h);
    }
  }
  return merged;
}

function main() {
  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`Missing ${REPORT_FILE} — run scripts/02-triage.js first.`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(REPORT_FILE, "utf8"));
  const hashtagsById = new Map(report.units.map((u) => [u.id, u.hashtags]));

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  let updated = 0;
  let unchanged = 0;

  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const id = idFromFrontMatter(raw);
    const hashtags = hashtagsById.get(id) || [];
    if (hashtags.length === 0) {
      unchanged++;
      continue;
    }

    const tagsLineMatch = raw.match(/^tags:\s*(\[.*\])\s*$/m);
    if (!tagsLineMatch) {
      console.warn(`⚠ ${file}: no tags line found, skipping.`);
      continue;
    }
    const existing = JSON.parse(tagsLineMatch[1]);
    const merged = mergeTags(existing, hashtags);

    if (merged.length === existing.length) {
      unchanged++;
      continue;
    }

    const newLine = `tags: [${merged.map((t) => JSON.stringify(t)).join(", ")}]`;
    const newRaw = raw.replace(/^tags:\s*\[.*\]\s*$/m, newLine);
    fs.writeFileSync(mdPath, newRaw, "utf8");
    updated++;
  }

  console.log(`Updated ${updated} file(s), ${unchanged} already had all hashtags (or had none).`);
}

main();
