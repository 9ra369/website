#!/usr/bin/env node
// Builds prototype/search-index.json: a flat list of every entry (curated +
// generated tips) that the header "⌘K" search modal (search.js) fetches and
// filters client-side. Static site, no server — this file is the entire
// "backend" for search.
//
// Usage: node scripts/20-build-search-index.js

const fs = require("fs");
const path = require("path");
const { loadAllEntries } = require("./lib/entries");
const { categories } = require("../data/categories.json");

const OUT_FILE = path.resolve(__dirname, "..", "prototype", "search-index.json");
const CATEGORY_LABELS = Object.fromEntries(categories.map((c) => [c.slug, c.label]));

function main() {
  const all = loadAllEntries();

  const index = all.map((e) => ({
    title: e.title,
    url: e.href,
    category: e.category,
    categoryLabel: CATEGORY_LABELS[e.category] || e.category,
    tags: e.tags,
    date: e.date,
  }));

  fs.writeFileSync(OUT_FILE, JSON.stringify(index), "utf8");
  console.log(`Wrote ${index.length} entries -> ${path.relative(process.cwd(), OUT_FILE)}`);
}

main();
