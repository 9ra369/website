// Step 2: tweets.js → normalized JSON.
// See x-archive-migration-spec.md §3 for the source field list.

const { loadYtd, loadOwnAccount } = require("./archive");

/**
 * Computes the "effective text length" per the spec:
 * full_text minus URLs, mentions, hashtags, and surrounding whitespace.
 * Uses entity `indices` (character offsets into full_text) rather than string
 * replacement, so it's correct even when the same substring appears twice.
 */
function effectiveText(tweet) {
  const text = tweet.full_text || "";
  const ranges = [];

  const pushIndices = (entities) => {
    for (const e of entities || []) {
      if (!e.indices) continue;
      const [start, end] = e.indices.map(Number);
      ranges.push([start, end]);
    }
  };

  const entities = tweet.entities || {};
  pushIndices(entities.urls);
  pushIndices(entities.hashtags);
  pushIndices(entities.user_mentions);
  pushIndices(entities.symbols);
  // extended_entities.media indices overlap with an entities.urls entry for the
  // same t.co link in practice, but include them defensively in case they don't.
  if (tweet.extended_entities) pushIndices(tweet.extended_entities.media);

  // Indices from the archive are UTF-16 code unit offsets, matching JS string
  // indexing, but full_text can contain astral characters (e.g. emoji) that
  // shift offsets. We operate directly on the UTF-16 string to stay consistent
  // with how Twitter computed the indices.
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  let kept = "";
  let cursor = 0;
  for (const [start, end] of merged) {
    kept += text.slice(cursor, start);
    cursor = end;
  }
  kept += text.slice(cursor);

  // Collapse the whitespace left behind by removed entities, then trim.
  const collapsed = kept.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
  return collapsed;
}

/** Converts Twitter's "Sun Aug 09 12:28:23 +0000 2026" format to an ISO string. */
function toIso(createdAt) {
  return new Date(createdAt).toISOString();
}

function normalizeOne(raw, ownAccountId) {
  const t = raw.tweet;
  const entities = t.entities || {};

  const urls = (entities.urls || []).map((u) => ({
    url: u.url,
    expandedUrl: u.expanded_url,
    displayUrl: u.display_url,
  }));

  const media = (t.extended_entities && t.extended_entities.media) || [];
  const mediaOut = media.map((m) => ({
    type: m.type,
    shortUrl: m.url,
    mediaUrlHttps: m.media_url_https,
    expandedUrl: m.expanded_url,
    // The archive stores media files locally as "{sourceTweetId}-{basename(mediaUrlHttps)}"
    // under data/tweets_media/. Keep the owning tweet id so that file can be found later.
    sourceTweetId: t.id_str,
  }));

  const hashtags = (entities.hashtags || []).map((h) => h.text);

  const inReplyToUserId = t.in_reply_to_user_id || null;
  const text = t.full_text || "";
  const effText = effectiveText(t);

  return {
    id: t.id_str,
    createdAt: toIso(t.created_at),
    fullText: text,
    effectiveText: effText,
    effectiveTextLength: Array.from(effText).length,
    inReplyToStatusId: t.in_reply_to_status_id || null,
    inReplyToUserId,
    isSelfReply: inReplyToUserId === ownAccountId,
    isReplyToOthers: !!inReplyToUserId && inReplyToUserId !== ownAccountId,
    isRetweet: text.startsWith("RT @"),
    urls,
    hashtags,
    media: mediaOut,
    originalPostUrl: `https://x.com/${raw.__ownUsername || "i"}/status/${t.id_str}`,
  };
}

/** Loads tweets.js and returns normalized records, sorted oldest-first by id. */
function normalizeTweets() {
  const { accountId, username } = loadOwnAccount();
  const raw = loadYtd("tweets");
  const normalized = raw.map((r) => normalizeOne({ ...r, __ownUsername: username }, accountId));
  normalized.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { ownAccountId: accountId, ownUsername: username, tweets: normalized };
}

module.exports = { normalizeTweets, effectiveText };
