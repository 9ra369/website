// Step 5: Markdown書き出し (x-archive-migration-spec.md §6).

const fs = require("fs");
const path = require("path");

/** YYYY-MM-DD from an ISO timestamp. */
function toDateOnly(isoString) {
  return isoString.slice(0, 10);
}

/** Filename-safe title: strips characters Windows/macOS disallow in filenames. */
function sanitizeForFilename(str) {
  return str.replace(/[\\/:*?"<>|]/g, "");
}

/** First 30 characters of the (sanitized) title, per spec §6 file naming rule. */
function titleSlice30(title) {
  return Array.from(sanitizeForFilename(title)).slice(0, 30).join("");
}

function fileNameFor(unit, aiFields) {
  return `${toDateOnly(unit.createdAt)}_${titleSlice30(aiFields.title)}.md`;
}

/** Replaces t.co links with their expanded URLs, and strips media t.co links
 *  entirely (their images are appended separately as markdown image refs). */
function cleanBody(unit) {
  let text = unit.fullText;

  for (const u of unit.urls) {
    text = text.split(u.url).join(u.expandedUrl);
  }
  for (const m of unit.media) {
    if (m.shortUrl) text = text.split(m.shortUrl).join("");
  }

  // Collapse whitespace left behind by stripped media links.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const images = unit.media
    .filter((m) => m.type === "photo" && m.copied && m.localPath)
    .map((m) => `![](${m.localPath})`)
    .join("\n");

  return images ? `${text}\n\n${images}` : text;
}

function yamlString(value) {
  if (value == null) return '""';
  // Simple, safe YAML scalar quoting (handles quotes/colons/newlines in source text).
  return JSON.stringify(value);
}

function yamlList(values) {
  if (!values || values.length === 0) return "[]";
  return `[${values.map(yamlString).join(", ")}]`;
}

function frontMatter(unit, aiFields) {
  const sourceUrl = unit.urls.length > 0 ? unit.urls[0].expandedUrl : "";
  const lines = [
    "---",
    `title: ${yamlString(aiFields.title || "")}`,
    `date: ${toDateOnly(unit.createdAt)}`,
    `category: ${yamlString(aiFields.category || "")}`,
    `tags: ${yamlList(aiFields.tags)}`,
    `source_url: ${yamlString(sourceUrl)}`,
    `original_post: ${yamlString(unit.originalPostUrl)}`,
    `summary: ${yamlString(aiFields.summary || "")}`,
    `ai_confidence: ${yamlString(aiFields.confidence || "")}`,
    "status: draft",
    "---",
    "",
  ];
  return lines.join("\n");
}

/**
 * Writes one markdown file for `unit` using `aiFields` ({title, summary, tags,
 * category, confidence}). Files with confidence "low" go to _triage/ instead
 * of posts/, per the spec's "低いものだけを精読対象とする" rule (§7).
 */
function writeMarkdownFile(unit, aiFields, contentRoot) {
  const dir = aiFields.confidence === "low" ? "_triage" : "posts";
  const destDir = path.join(contentRoot, dir);
  fs.mkdirSync(destDir, { recursive: true });

  const fileName = fileNameFor(unit, aiFields);
  const destPath = path.join(destDir, fileName);
  const content = frontMatter(unit, aiFields) + "\n" + cleanBody(unit) + "\n";
  fs.writeFileSync(destPath, content, "utf8");
  return { dir, fileName, destPath };
}

module.exports = { writeMarkdownFile, cleanBody, frontMatter, fileNameFor, toDateOnly };
