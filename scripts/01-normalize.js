#!/usr/bin/env node
// Step 2 (see x-archive-migration-spec.md §2): tweets.js → normalized JSON.
//
// Usage: node scripts/01-normalize.js
// Output: _work/normalized-tweets.json

const fs = require("fs");
const path = require("path");
const { normalizeTweets } = require("./lib/normalize");

const OUT_DIR = path.resolve(__dirname, "..", "_work");
const OUT_FILE = path.join(OUT_DIR, "normalized-tweets.json");

function main() {
  const result = normalizeTweets();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), "utf8");

  const total = result.tweets.length;
  const retweets = result.tweets.filter((t) => t.isRetweet).length;
  const repliesToOthers = result.tweets.filter((t) => t.isReplyToOthers).length;
  const selfReplies = result.tweets.filter((t) => t.isSelfReply).length;
  const withUrls = result.tweets.filter((t) => t.urls.length > 0).length;

  console.log(`Account: @${result.ownUsername} (${result.ownAccountId})`);
  console.log(`Normalized ${total} tweets -> ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log(`  retweets (RT @...):     ${retweets}`);
  console.log(`  replies to others:      ${repliesToOthers}`);
  console.log(`  self-replies (threads): ${selfReplies}`);
  console.log(`  contain a URL:          ${withUrls}`);
}

main();
