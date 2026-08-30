#!/usr/bin/env node
// Phase 1 of the topic/tool/type taxonomy rollout (see
// C:\Users\kuram\.claude\plans\modular-discovering-kahan.md): adds
// `topics`/`tools`/`type` frontmatter fields to every content/posts/*.md,
// inferred from the existing `category`+`tags` via scripts/lib/taxonomy.js.
// Additive only — does not touch `category` or `tags`, does not rename files.
//
// Usage: node scripts/25-tag-taxonomy.js [--dry-run]

const fs = require("fs");
const path = require("path");
const { parseFrontMatter } = require("./lib/render-tip");
const { inferTaxonomy } = require("./lib/taxonomy");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");
const DRY_RUN = process.argv.includes("--dry-run");

function main() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  let updated = 0;
  let skipped = 0;
  const topicCounts = {};
  const toolCounts = {};
  const typeCounts = {};

  for (const file of files) {
    const fpath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(fpath, "utf8");
    const { fm } = parseFrontMatter(raw);

    if (fm.topics) {
      skipped++;
      continue; // already migrated
    }

    const { topics, tools, type } = inferTaxonomy({ category: fm.category, tags: fm.tags });
    topics.forEach((t) => (topicCounts[t] = (topicCounts[t] || 0) + 1));
    tools.forEach((t) => (toolCounts[t] = (toolCounts[t] || 0) + 1));
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    const topicsLine = `topics: ${JSON.stringify(topics)}`;
    const toolsLine = `tools: ${JSON.stringify(tools)}`;
    const typeLine = `type: ${JSON.stringify(type)}`;

    let out = raw;
    // type goes right after category (both classify the post)
    out = out.replace(/^(category:.*)$/m, `$1\n${typeLine}`);
    // topics/tools go right after tags (both are tag-like axes)
    out = out.replace(/^(tags:.*)$/m, `$1\n${topicsLine}\n${toolsLine}`);

    if (out === raw) {
      console.warn(`⚠ ${file}: category/tags line not matched, skipping.`);
      continue;
    }

    if (!DRY_RUN) fs.writeFileSync(fpath, out, "utf8");
    updated++;
  }

  console.log(`${DRY_RUN ? "[dry-run] " : ""}Updated ${updated} post(s), skipped ${skipped} (already migrated).`);
  console.log("topics:", topicCounts);
  console.log("tools:", toolCounts);
  console.log("type:", typeCounts);
}

main();
