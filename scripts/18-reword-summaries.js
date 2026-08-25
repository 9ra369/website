#!/usr/bin/env node
// Rewords AI-generated summaries away from "an X post that introduces Y"
// framing (e.g. "...を紹介した投稿。") toward directly describing the linked
// website/tutorial/tool itself, per user direction: this site isn't
// showcasing X posts, it's showcasing the websites/tutorials/tools those
// posts pointed to.
//
// Only applies mechanically SAFE transforms:
//   - "を紹介した投稿。" -> "。"   (turns the noun phrase into a 体言止め
//     sentence — idiomatic, catalog-style Japanese; verified safe since the
//     clause before it is already a complete noun phrase in every sample)
//   - "とのこと。" -> "。" and sentence-final "という。" -> "。" (both are
//     hearsay/reported-speech suffixes attached after an already-complete
//     plain-form clause ending, so stripping them always leaves a valid
//     sentence — this also addresses the "とのこと" reporting-style tone)
// Mid-sentence "という" (e.g. "「X」というツール") is left untouched since
// it's load-bearing there, not a hearsay marker.
//
// Usage:
//   node scripts/18-reword-summaries.js            (dry run, prints a diff)
//   node scripts/18-reword-summaries.js --apply     (writes the changes)

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");

function reword(summary) {
  let s = summary;
  s = s.replace(/を紹介した投稿。/g, "。");
  // "(こと)?を[verb]た投稿。" -> "。": the preceding clause (often ending in
  // a plain-form verb via the "こと" nominalizer, or already a noun phrase)
  // is grammatically complete on its own once "投稿" is dropped. Keeps a
  // trailing parenthetical (e.g. "（毎日作品分析Day2）") if present.
  s = s.replace(
    /(こと)?を(伝えた|語った|補足した|宣言した|共有した|比較検証した|まとめた|試した|報告した|分析した)投稿([（(][^）)]*[）)])?。/g,
    "$3。"
  );
  s = s.replace(/とのこと。/g, "。");
  s = s.replace(/という。/g, "。");
  // "Xについて分析した投稿。" -> "Xについての分析。" (keeps the "about X"
  // framing but turns the sentence into a direct noun-phrase description).
  s = s.replace(
    /(.+?)について(分析した|考察した)投稿([（(][^）)]*[）)])?。/g,
    (_, x, v, paren) => `${x}についての${v === "分析した" ? "分析" : "考察"}${paren || ""}。`
  );
  return s;
}

function main() {
  const apply = process.argv.includes("--apply");
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  let changed = 0;
  const samples = [];

  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const m = raw.match(/^summary: "(.*)"$/m);
    if (!m) continue;
    const before = m[1];
    const after = reword(before);
    if (before === after) continue;

    changed++;
    if (samples.length < 10) samples.push({ file, before, after });

    if (apply) {
      const newRaw = raw.replace(/^summary: ".*"$/m, `summary: ${JSON.stringify(after)}`);
      fs.writeFileSync(mdPath, newRaw, "utf8");
    }
  }

  console.log(apply ? "APPLIED" : "DRY RUN (pass --apply to write changes)");
  console.log(`${changed} / ${files.length} summaries changed by the safe mechanical rules.`);
  console.log("\nSample changes:");
  for (const s of samples) {
    console.log(`\n[${s.file}]`);
    console.log(`  BEFORE: ${s.before}`);
    console.log(`  AFTER:  ${s.after}`);
  }
}

main();
