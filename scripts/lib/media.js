// Copies photo attachments referenced by triaged units from the X archive's
// local media dump into the site's own image storage, so posts don't depend
// on _raw/ (which is gitignored and not meant to be kept around forever).

const fs = require("fs");
const path = require("path");
const { findArchiveRoot } = require("./archive");

function mediaDir() {
  return path.join(findArchiveRoot(), "data", "tweets_media");
}

function localFileNameFor(sourceTweetId, mediaUrlHttps) {
  const base = path.basename(new URL(mediaUrlHttps).pathname);
  return `${sourceTweetId}-${base}`;
}

/**
 * Copies the photo media for the given units into destDir (created if needed).
 * Mutates each unit's media entries in place, adding:
 *   - localPath: path relative to the site's content root (e.g. "images/posts/...")
 *   - copied: true/false
 * Non-photo media (video, animated_gif) are left untouched (copied: false,
 * skipped: "non-photo") — out of scope per current instructions.
 */
function copyPhotoMedia(units, destDir) {
  const srcDir = mediaDir();
  fs.mkdirSync(destDir, { recursive: true });

  const stats = { copied: 0, missing: [], skippedNonPhoto: 0 };

  for (const unit of units) {
    for (const m of unit.media) {
      if (m.type !== "photo") {
        m.copied = false;
        m.skipped = "non-photo";
        stats.skippedNonPhoto++;
        continue;
      }
      const fileName = localFileNameFor(m.sourceTweetId, m.mediaUrlHttps);
      const srcPath = path.join(srcDir, fileName);
      if (!fs.existsSync(srcPath)) {
        m.copied = false;
        m.localPath = null;
        stats.missing.push({ unit: unit.id, fileName });
        continue;
      }
      const destPath = path.join(destDir, fileName);
      fs.copyFileSync(srcPath, destPath);
      m.copied = true;
      m.localPath = `images/posts/${fileName}`;
      stats.copied++;
    }
  }

  return stats;
}

module.exports = { copyPhotoMedia, localFileNameFor, mediaDir };
