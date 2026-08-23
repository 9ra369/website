// Locates the extracted X archive under _raw/ and loads its raw .js data files.
// X archive data files are JS files that assign to `window.YTD.<name>.partN`.
// Stripping that prefix leaves valid JSON.

const fs = require("fs");
const path = require("path");

const RAW_DIR = path.resolve(__dirname, "..", "..", "_raw");

/** Finds the single extracted archive directory under _raw/. */
function findArchiveRoot() {
  if (!fs.existsSync(RAW_DIR)) {
    throw new Error(`_raw/ not found at ${RAW_DIR}. Extract the X archive there first.`);
  }
  const entries = fs.readdirSync(RAW_DIR, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (entries.length === 0) {
    throw new Error(`No archive folder found under ${RAW_DIR}.`);
  }
  if (entries.length > 1) {
    console.warn(
      `Warning: multiple folders under _raw/, using the first: ${entries[0].name}`
    );
  }
  return path.join(RAW_DIR, entries[0].name);
}

/**
 * Loads a YTD data file (e.g. "tweets", "account") and returns the parsed value.
 * Handles files split into multiple parts (partN) by concatenating their arrays.
 */
function loadYtd(dataDirName) {
  const archiveRoot = findArchiveRoot();
  const dataDir = path.join(archiveRoot, "data");
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f === `${dataDirName}.js` || f.startsWith(`${dataDirName}-part`));

  if (files.length === 0) {
    throw new Error(`No data file matching "${dataDirName}" found in ${dataDir}`);
  }

  let combined = [];
  for (const file of files.sort()) {
    const raw = fs.readFileSync(path.join(dataDir, file), "utf8");
    const jsonStr = raw.replace(/^window\.YTD\.[a-zA-Z0-9_]+\.part\d+\s*=\s*/, "");
    const parsed = JSON.parse(jsonStr);
    combined = combined.concat(parsed);
  }
  return combined;
}

/** Returns the account id/username of the archive owner, from data/account.js. */
function loadOwnAccount() {
  const [{ account }] = loadYtd("account");
  return { accountId: account.accountId, username: account.username };
}

module.exports = { RAW_DIR, findArchiveRoot, loadYtd, loadOwnAccount };
