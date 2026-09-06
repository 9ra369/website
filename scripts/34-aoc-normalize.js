#!/usr/bin/env node
// Step 34: pulls @Suggybro's "Art of Composition" series out of a second
// person's X archive (_raw/twitter_from_friends/) and prepares it for the same
// post pipeline the owner's own archive goes through.
//
// Three things this has to do that scripts/01-02 don't:
//
//   1. Read an archive that is NOT the first folder under _raw/. findArchiveRoot()
//      picks that one by default, which is the site owner's own archive.
//   2. Recover the FULL text. These are long posts, so data/tweets.js only
//      stores a ~280-char prefix ending in "…"; the real body lives in
//      data/note-tweet.js, which is keyed by its own note id, not by tweet id.
//      The two records share an exact createdAt timestamp, so that's the join.
//      The note record also carries its own t.co → expanded URL table and its
//      own @mentions (the tweets.js entities only cover the truncated prefix).
//   3. Number the series. The author titled the first two posts just
//      "The art of Composition" with no day number, switched to "Day3", then to
//      "Learning the Art of Composition Day4"..."Day16" — and used "Day15"
//      twice. Day numbers are therefore assigned by position in time, and a
//      reused number becomes Day15-1 / Day15-2 (same convention the owner's
//      毎日作品分析 posts use).
//
// Media is copied out of the archive into content/images/posts/ here, so
// nothing downstream depends on _raw/ still being around.
//
// Usage:
//   node scripts/34-aoc-normalize.js
//   node scripts/34-aoc-normalize.js --dry-run
// Output: _work/aoc-units.json

const fs = require("fs");
const path = require("path");
const { loadYtd, loadOwnAccount } = require("./lib/archive");
const { copyPhotoMedia } = require("./lib/media");

const ROOT = path.resolve(__dirname, "..");
const ARCHIVE_DIR = "twitter_from_friends";
const OUT_FILE = path.join(ROOT, "_work", "aoc-units.json");
const IMAGES_DIR = path.join(ROOT, "content", "images", "posts");

// Matches every spelling the author used: "The art of Composition",
// "The art of Composition Day3", "Learning the Art of Composition Day4"...
const SERIES_RE = /art of composition/i;

const DRY_RUN = process.argv.includes("--dry-run");

/** Converts Twitter's "Sat Apr 11 23:20:52 +0000 2026" format to an ISO string. */
function toIso(createdAt) {
  return new Date(createdAt).toISOString();
}

/** Explicit day number in the post text, or null when the author omitted it. */
function statedDay(text) {
  const m = text.match(/composition\s*Day\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

/**
 * Assigns each unit a display day label. The stated number wins where the
 * author gave one; the unnumbered openers take the positions before the first
 * stated number. A number used twice gets -1 / -2 suffixes.
 */
function assignDayLabels(units) {
  const firstStated = units.findIndex((u) => u.statedDay !== null);
  units.forEach((u, i) => {
    // Before the first numbered post the author's own count is implicit:
    // the post at index i is day i+1, which lines up with "Day3" landing at
    // index 2. Assert that rather than assume it.
    u.day = u.statedDay !== null ? u.statedDay : i + 1;
  });
  if (firstStated >= 0 && units[firstStated].day !== firstStated + 1) {
    throw new Error(
      `Day numbering mismatch: post #${firstStated + 1} states Day${units[firstStated].day}. ` +
        `The implicit numbering of the unnumbered openers can no longer be trusted.`
    );
  }

  const seen = {};
  for (const u of units) seen[u.day] = (seen[u.day] || 0) + 1;
  const used = {};
  for (const u of units) {
    if (seen[u.day] > 1) {
      used[u.day] = (used[u.day] || 0) + 1;
      u.dayLabel = `${u.day}-${used[u.day]}`;
    } else {
      u.dayLabel = String(u.day);
    }
  }
}

function main() {
  const { accountId, username } = loadOwnAccount(ARCHIVE_DIR);
  const tweets = loadYtd("tweets", ARCHIVE_DIR);
  const notes = loadYtd("note-tweet", ARCHIVE_DIR);

  // note-tweet.js has no tweet id; createdAt is exact to the second on both
  // sides and no two posts in this archive share one.
  const noteByCreatedAt = new Map(notes.map((n) => [n.noteTweet.createdAt, n.noteTweet]));

  const units = [];
  for (const { tweet: t } of tweets) {
    const shortText = t.full_text || "";
    if (!SERIES_RE.test(shortText)) continue;
    if (shortText.startsWith("RT @")) continue;
    if (t.in_reply_to_user_id && t.in_reply_to_user_id !== accountId) continue;

    const createdAt = toIso(t.created_at);
    const note = noteByCreatedAt.get(createdAt);
    const fullText = note ? note.core.text : shortText;

    // Prefer the note's own entity tables: they cover the whole body, whereas
    // the tweets.js ones only describe the truncated prefix.
    const urls = (note ? note.core.urls : (t.entities.urls || []).map((u) => ({
      shortUrl: u.url,
      expandedUrl: u.expanded_url,
      displayUrl: u.display_url,
    }))).map((u) => ({ url: u.shortUrl, expandedUrl: u.expandedUrl, displayUrl: u.displayUrl }));

    const hashtags = note ? note.core.hashtags.map((h) => h.text) : (t.entities.hashtags || []).map((h) => h.text);
    const mentions = (note ? note.core.mentions : (t.entities.user_mentions || []).map((m) => ({ screenName: m.screen_name })))
      .map((m) => m.screenName)
      .filter((sn) => sn.toLowerCase() !== username.toLowerCase());

    const media = ((t.extended_entities && t.extended_entities.media) || []).map((m) => ({
      type: m.type,
      shortUrl: m.url,
      mediaUrlHttps: m.media_url_https,
      sourceTweetId: t.id_str,
    }));

    units.push({
      id: t.id_str,
      createdAt,
      date: createdAt.slice(0, 10),
      hasNoteText: !!note,
      statedDay: statedDay(fullText),
      fullText,
      urls,
      hashtags,
      mentions,
      media,
      originalPostUrl: `https://x.com/${username}/status/${t.id_str}`,
    });
  }

  units.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  assignDayLabels(units);

  let mediaStats = { copied: 0, missing: [], skippedNonPhoto: 0 };
  if (!DRY_RUN) {
    mediaStats = copyPhotoMedia(units, IMAGES_DIR, ARCHIVE_DIR);
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(
      OUT_FILE,
      JSON.stringify({ archive: ARCHIVE_DIR, handle: username, accountId, units }, null, 2),
      "utf8"
    );
  }

  console.log(`Archive: _raw/${ARCHIVE_DIR} (@${username})`);
  console.log(`Matched ${units.length} post(s) in the "Art of Composition" series:`);
  for (const u of units) {
    const first = u.fullText.split("\n")[0].slice(0, 46);
    console.log(
      `  Day${u.dayLabel.padEnd(4)} ${u.date}  ${u.media.length} img  ${u.hasNoteText ? "note" : "SHORT"}  ${first}`
    );
  }
  const withoutNote = units.filter((u) => !u.hasNoteText).length;
  if (withoutNote) console.log(`\n⚠ ${withoutNote} post(s) had no note-tweet record — body may be truncated.`);
  if (DRY_RUN) {
    console.log("\n--dry-run: no images copied, no _work/aoc-units.json written.");
    return;
  }
  console.log(`\nCopied ${mediaStats.copied} image(s) -> content/images/posts/`);
  if (mediaStats.missing.length) console.log(`  ⚠ missing from the archive: ${mediaStats.missing.length}`);
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)}`);
}

main();
