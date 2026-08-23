// Builds a numbered checklist of every "posts"-bucket unit, cross-referenced
// against what's actually been written to content/posts/, content/_triage/,
// and content/_archive/, so progress can be tracked and items can be excluded
// by number without touching the underlying triage report.

const fs = require("fs");
const path = require("path");

const CONTENT_ROOT = path.resolve(__dirname, "..", "..", "content");

/** Extracts the tweet id from an `original_post: "https://x.com/.../status/ID"` line. */
function idFromFrontMatter(text) {
  const m = text.match(/original_post:\s*"[^"]*\/status\/(\d+)"/);
  return m ? m[1] : null;
}

function fieldFromFrontMatter(text, field) {
  const m = text.match(new RegExp(`${field}:\\s*"([^"]*)"`));
  return m ? m[1] : null;
}

/** Scans a content/ subfolder, returning Map<tweetId, {file, title, status}>. */
function scanFolder(subfolder) {
  const dir = path.join(CONTENT_ROOT, subfolder);
  const found = new Map();
  if (!fs.existsSync(dir)) return found;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    const id = idFromFrontMatter(text);
    if (!id) continue;
    found.set(id, {
      file,
      title: fieldFromFrontMatter(text, "title"),
      status: fieldFromFrontMatter(text, "status"),
    });
  }
  return found;
}

/** Builds the full checklist. Returns an array of row objects, numbered from 1. */
function buildChecklist(triageReport) {
  const units = triageReport.units
    .filter((u) => u.bucket === "posts")
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const inPosts = scanFolder("posts");
  const inTriage = scanFolder("_triage");
  const inArchive = scanFolder("_archive");

  return units.map((u, i) => {
    let state, label, file;
    if (inArchive.has(u.id)) {
      state = "excluded";
      label = "🗑 除外";
      file = inArchive.get(u.id).file;
    } else if (inPosts.has(u.id)) {
      const entry = inPosts.get(u.id);
      state = entry.status === "published" ? "published" : "draft";
      label = entry.status === "published" ? "🌐 公開済み" : "✅ 下書き作成済み";
      file = entry.file;
    } else if (inTriage.has(u.id)) {
      state = "triage";
      label = "📝 要判断（_triage）";
      file = inTriage.get(u.id).file;
    } else {
      state = "pending";
      label = "⬜ 未処理";
      file = null;
    }

    const generatedTitle = (inPosts.get(u.id) || inTriage.get(u.id) || {}).title;
    const preview = generatedTitle || `(未生成) ${u.effectiveText.slice(0, 28).replace(/\n/g, " ")}`;

    return {
      number: i + 1,
      id: u.id,
      date: u.createdAt.slice(0, 10),
      preview,
      state,
      label,
      file,
    };
  });
}

function renderMarkdown(rows) {
  const counts = rows.reduce((acc, r) => {
    acc[r.state] = (acc[r.state] || 0) + 1;
    return acc;
  }, {});

  const header = [
    "# Xポスト移行チェックシート",
    "",
    `全${rows.length}件 — 下書き ${counts.draft || 0} / 公開 ${counts.published || 0} / 要判断 ${counts.triage || 0} / 除外 ${counts.excluded || 0} / 未処理 ${counts.pending || 0}`,
    "",
    "番号を指定して「n番はいらない」と言えば `content/_archive/` へ移動できます（削除はしません）。",
    "",
    "| # | 日付 | 内容 | 状態 |",
    "|---|---|---|---|",
  ];
  const body = rows.map((r) => `| ${r.number} | ${r.date} | ${r.preview} | ${r.label} |`);
  return header.concat(body).join("\n") + "\n";
}

module.exports = { buildChecklist, renderMarkdown, idFromFrontMatter };
