#!/usr/bin/env node
// Step 3 (x-archive-migration-spec.md §2/§4/§5): 振り分け・スレッド結合。
//
// Usage: node scripts/02-triage.js [threshold]
//   threshold: effective-text-length cutoff N (default 50, spec suggests 40-60)
// Output: _work/triage-report.json, plus a length histogram printed to help
// pick N (rerun with a different threshold as many times as needed).

const fs = require("fs");
const path = require("path");
const { triage, lengthHistogram } = require("./lib/triage");

const IN_FILE = path.resolve(__dirname, "..", "_work", "normalized-tweets.json");
const OUT_FILE = path.resolve(__dirname, "..", "_work", "triage-report.json");

function main() {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`Missing ${IN_FILE} — run scripts/01-normalize.js first.`);
    process.exit(1);
  }
  const threshold = Number(process.argv[2]) || 50;
  const { tweets } = JSON.parse(fs.readFileSync(IN_FILE, "utf8"));

  const results = triage(tweets, threshold);
  fs.writeFileSync(OUT_FILE, JSON.stringify({ threshold, units: results }, null, 2), "utf8");

  const byReason = {};
  for (const r of results) {
    byReason[r.reason] = (byReason[r.reason] || 0) + 1;
  }
  const threads = results.filter((r) => r.isThread);
  const branched = results.filter((r) => r.branched);

  console.log(`Threshold N = ${threshold}`);
  console.log(`Units after thread-merge: ${results.length} (from ${tweets.length} tweets)`);
  console.log(`  threads merged:  ${threads.length}`);
  if (branched.length) console.log(`  ⚠ branched threads (check by hand): ${branched.length}`);
  console.log(`  -> posts/:    ${results.filter((r) => r.bucket === "posts").length}`);
  console.log(`  -> _archive/: ${results.filter((r) => r.bucket === "_archive").length}`);
  console.log("  reasons:", byReason);
  console.log(`\nWrote ${path.relative(process.cwd(), OUT_FILE)}`);

  const hist = lengthHistogram(tweets);
  console.log(
    `\nEffective-length histogram for no-URL / non-RT / non-reply posts (n=${hist.total}) — this is the population threshold N actually filters:`
  );
  for (const [bucketStart, count] of hist.buckets) {
    const bar = "#".repeat(Math.min(count, 50));
    console.log(`  ${String(bucketStart).padStart(4)}-${bucketStart + 9}: ${bar} ${count}`);
  }
}

main();
