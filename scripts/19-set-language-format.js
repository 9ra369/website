#!/usr/bin/env node
// Adds two per-post frontmatter fields used in the entry-meta-bar:
//   language: "日本語" | "英語"  — the language of the linked resource itself
//   (format is NOT stored in frontmatter — it's just the category label,
//   already available via data/categories.json, wired directly in render-tip.js)
//
// Language is inferred from source_url's domain against a small allowlist of
// known-Japanese platforms/authors, with a domain-based default otherwise.
// This is a first-pass heuristic, not perfect — spot-check individual posts
// and correct the `language:` field by hand where it's wrong.
//
// Usage:
//   node scripts/19-set-language-format.js            (dry run)
//   node scripts/19-set-language-format.js --apply

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.resolve(__dirname, "..", "content", "posts");

// Domains (or domain substrings) known to host Japanese-language content.
const JAPANESE_DOMAINS = [
  "cgworld.jp",
  "note.com",
  "houdinifx.jp",
  "polyphony.co.jp",
  "godofsuama.hatenablog.com",
  "fxnomemo.blogspot.com",
  "jp.eagle.cool",
  "hatenablog.com",
  "notion.so", // this account's own Japanese-language notes, per observed samples
];

// Domain heuristics can't tell Japanese-language talks/courses by Japanese
// speakers (e.g. a CEDEC lecture, an ILM generalist's own JP course) apart
// from English ones on the same platform (YouTube, Gnomon Workshop, etc.) —
// these were confirmed Japanese-language by reading the summary text.
const FORCE_JAPANESE_SUBSTRINGS = [
  "ILMのGeneralistである小山氏による講座",
  "安藤恵美氏によるUSD/Solarisについての講演動画",
  "手島孝人氏によるCEDEC講演",
];

function inferLanguage(sourceUrl) {
  if (!sourceUrl) return "日本語"; // no external link -> self-contained, written in Japanese
  let host;
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "日本語";
  }
  if (JAPANESE_DOMAINS.some((d) => host === d || host.endsWith("." + d))) return "日本語";
  return "英語"; // default: this archive skews toward international (mostly English) CG resources
}

function main() {
  const apply = process.argv.includes("--apply");
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const counts = { 日本語: 0, 英語: 0 };
  let changed = 0;

  for (const file of files) {
    const mdPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf8");
    const urlMatch = raw.match(/^source_url: "(.*)"$/m);
    const sourceUrl = urlMatch ? urlMatch[1] : "";
    const summaryMatch = raw.match(/^summary: "(.*)"$/m);
    const summary = summaryMatch ? summaryMatch[1] : "";
    const lang = FORCE_JAPANESE_SUBSTRINGS.some((s) => summary.includes(s))
      ? "日本語"
      : inferLanguage(sourceUrl);
    counts[lang]++;

    const hasField = /^language: ".*"$/m.test(raw);
    const currentLang = hasField ? raw.match(/^language: "(.*)"$/m)[1] : null;
    if (currentLang === lang) continue;
    changed++;

    if (apply) {
      let newRaw;
      if (hasField) {
        newRaw = raw.replace(/^language: ".*"$/m, `language: "${lang}"`);
      } else {
        // Insert right after source_url line (or after original_post if no source_url line found).
        newRaw = raw.replace(/^(source_url: ".*")$/m, `$1\nlanguage: "${lang}"`);
      }
      fs.writeFileSync(mdPath, newRaw, "utf8");
    }
  }

  console.log(apply ? "APPLIED" : "DRY RUN (pass --apply to write changes)");
  console.log(`${changed} / ${files.length} file(s) changed.`);
  console.log("Distribution:", counts);
}

main();
