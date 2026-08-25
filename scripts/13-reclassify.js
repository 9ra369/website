#!/usr/bin/env node
// Re-categorizes every content/posts/*.md by content, per explicit rules:
//   tutorial content            -> category: tutorial
//   written article/blog/paper  -> category: article
//   introducing an artist's own body of work/portfolio -> category: showreel
//   introducing a tool/plugin/HDA -> category: pipeline
//   background/environment topic -> always add an "Environment" tag
//     (Environment is no longer a category by itself)
//   anything else (short notes, questions, comments) -> stays category: tips
//
// Usage:
//   node scripts/13-reclassify.js            (dry run, prints a report)
//   node scripts/13-reclassify.js --apply     (writes the changes)

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");

const PLUGIN_RE = /プラグイン|アドオン|addon|plugin|HDA|ギズモ|gizmo|変換アプリ|カラースペース変換アプリ/i;
const PLUGIN_TITLE_ONLY_RE = /ツール|アプリ/i; // weaker/generic nouns: title only, avoids matching summary boilerplate

const STRONG_TUTORIAL_RE = /チュートリアル|tutorial|講座|コース|course|レッスン|lesson|入門|ゼロから|zero to hero|講演|ウェビナー|webinar/i;
const ARTICLE_RE = /記事|article|コラム|note記事|ブログ|論文|journal/i;
const WEAK_TUTORIAL_TITLE_ONLY_RE = /解説動画|手法解説|使い方|クイックスタート|解説/;

// "(氏|さん)の...作品" requires a person-name honorific right before "の…作品"
// so this doesn't false-positive on self-referential phrasing like "自身の作品".
const SHOWREEL_RE = /artstation|デモリール|demo\s*reel|showreel|ファンアート最新作|youtubeチャンネル|スタジオサイト|(氏|さん)の.{0,4}作品/i;

const ENVIRONMENT_RE = /背景|environment|地形|terrain|植生|vegetation|環境/i;

function classify(title, summary) {
  const combined = `${title} ${summary}`;
  const isDailyAnalysis = title.startsWith("毎日作品分析");

  if (isDailyAnalysis) return "daily-analysis";
  if (PLUGIN_RE.test(combined) || PLUGIN_TITLE_ONLY_RE.test(title)) return "pipeline";
  if (STRONG_TUTORIAL_RE.test(combined)) return "tutorial";
  if (ARTICLE_RE.test(combined)) return "article";
  if (WEAK_TUTORIAL_TITLE_ONLY_RE.test(title)) return "tutorial";
  if (SHOWREEL_RE.test(combined)) return "showreel";
  return "tips";
}

function main() {
  const apply = process.argv.includes("--apply");
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  const counts = {};
  const changes = [];

  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const title = (raw.match(/^title:\s*"([\s\S]*?)"\s*$/m) || [])[1] || "";
    const summary = (raw.match(/^summary:\s*"([\s\S]*?)"\s*$/m) || [])[1] || "";
    const currentCategory = (raw.match(/^category:\s*"(.*)"$/m) || [])[1] || "";
    const tagsMatch = raw.match(/^tags:\s*(\[.*\])\s*$/m);
    const tags = tagsMatch ? JSON.parse(tagsMatch[1]) : [];

    const newCategory = classify(title, summary);
    const needsEnvTag = ENVIRONMENT_RE.test(`${title} ${summary}`) && !tags.some((t) => t.toLowerCase() === "environment");
    const needsSeriesTag = newCategory === "daily-analysis" && !tags.some((t) => t === "毎日作品分析");
    const newTags = [...tags, ...(needsEnvTag ? ["Environment"] : []), ...(needsSeriesTag ? ["毎日作品分析"] : [])];

    counts[newCategory] = (counts[newCategory] || 0) + 1;

    const categoryChanged = newCategory !== currentCategory;
    const tagsChanged = needsEnvTag || needsSeriesTag;
    if (categoryChanged || tagsChanged) {
      changes.push({ file, title, from: currentCategory, to: newCategory, addedEnvTag: needsEnvTag, addedSeriesTag: needsSeriesTag });
    }

    if (apply && (categoryChanged || tagsChanged)) {
      let newRaw = raw;
      if (categoryChanged) {
        newRaw = newRaw.replace(/^category:\s*".*"$/m, `category: "${newCategory}"`);
      }
      if (tagsChanged) {
        const newLine = `tags: [${newTags.map((t) => JSON.stringify(t)).join(", ")}]`;
        newRaw = newRaw.replace(/^tags:\s*\[.*\]\s*$/m, newLine);
      }
      fs.writeFileSync(mdPath, newRaw, "utf8");
    }
  }

  console.log(apply ? "APPLIED" : "DRY RUN (pass --apply to write changes)");
  console.log("New category distribution:", counts);
  console.log(`\n${changes.length} file(s) changed:`);
  for (const c of changes) {
    console.log(`  [${c.from} -> ${c.to}]${c.addedEnvTag ? " +Environment tag" : ""}  ${c.title}`);
  }
}

main();
