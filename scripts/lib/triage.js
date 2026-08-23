// Step 3: 振り分け・スレッド結合 (x-archive-migration-spec.md §4, §5).

/**
 * Merges self-reply chains into single thread units.
 * A tweet is a "child" if it is a self-reply to another tweet present in the set.
 * If a tweet has more than one self-reply child (branching), the chain stops
 * there and each branch becomes its own thread — this case is flagged so it
 * can be checked by hand, since the spec doesn't define branching behavior.
 */
function mergeThreads(tweets) {
  const byId = new Map(tweets.map((t) => [t.id, t]));
  const childrenByParent = new Map(); // parentId -> [childId, ...]

  for (const t of tweets) {
    if (t.isSelfReply && t.inReplyToStatusId && byId.has(t.inReplyToStatusId)) {
      const list = childrenByParent.get(t.inReplyToStatusId) || [];
      list.push(t.id);
      childrenByParent.set(t.inReplyToStatusId, list);
    }
  }

  // Only chain through parents with exactly one self-reply child. A tweet is
  // "consumed" into its parent's thread only in that case — if a parent has
  // several self-reply children (branching), none of them are consumed: each
  // stays its own standalone unit instead of being silently dropped.
  const singleChild = new Map(); // parentId -> the one childId
  for (const [parentId, children] of childrenByParent) {
    if (children.length === 1) singleChild.set(parentId, children[0]);
  }

  const consumed = new Set(singleChild.values());
  const roots = tweets.filter((t) => !consumed.has(t.id)).sort((a, b) => (a.id < b.id ? -1 : 1));

  const threads = [];
  for (const root of roots) {
    const members = [root];
    let branched = false;
    let current = root;
    for (;;) {
      const nextId = singleChild.get(current.id);
      if (nextId) {
        current = byId.get(nextId);
        members.push(current);
        continue;
      }
      // Not chainable further: either no children, or multiple (branching).
      branched = (childrenByParent.get(current.id) || []).length > 1;
      break;
    }

    const fullText = members.map((m) => m.fullText).join("\n\n");
    const effectiveText = members.map((m) => m.effectiveText).join("\n\n").trim();
    const urls = members.flatMap((m) => m.urls);
    const media = members.flatMap((m) => m.media);
    const hashtags = [...new Set(members.flatMap((m) => m.hashtags))];

    threads.push({
      id: root.id,
      createdAt: root.createdAt,
      memberIds: members.map((m) => m.id),
      isThread: members.length > 1,
      branched, // true = a later self-reply had multiple children; only the first branch was followed
      fullText,
      effectiveText,
      effectiveTextLength: Array.from(effectiveText).length,
      isRetweet: root.isRetweet,
      isReplyToOthers: root.isReplyToOthers,
      urls,
      media,
      hashtags,
      originalPostUrl: root.originalPostUrl,
    });
  }

  return threads;
}

/** Priority 1-5 routing from spec §4. Returns { bucket, reason }. */
function classify(unit, threshold) {
  if (unit.isRetweet) return { bucket: "_archive", reason: "retweet" };
  if (unit.isReplyToOthers) return { bucket: "_archive", reason: "reply-to-other" };
  if (unit.urls.length > 0) return { bucket: "posts", reason: "has-url" };
  if (unit.effectiveTextLength < threshold) return { bucket: "_archive", reason: "short-text" };
  return { bucket: "posts", reason: "default" };
}

function triage(tweets, threshold) {
  const units = mergeThreads(tweets);
  return units.map((u) => ({ ...u, ...classify(u, threshold) }));
}

/** Effective-length histogram for units where length is the deciding factor
 *  (no URL, not a retweet, not a reply to someone else) — i.e. exactly the
 *  population priority 4 in §4 applies to. Used to pick threshold N. */
function lengthHistogram(tweets, bucketSize = 10) {
  const units = mergeThreads(tweets);
  const relevant = units.filter((u) => !u.isRetweet && !u.isReplyToOthers && u.urls.length === 0);
  const buckets = new Map();
  for (const u of relevant) {
    const key = Math.floor(u.effectiveTextLength / bucketSize) * bucketSize;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return { total: relevant.length, buckets: [...buckets.entries()].sort((a, b) => a[0] - b[0]) };
}

module.exports = { mergeThreads, classify, triage, lengthHistogram };
