#!/usr/bin/env node
/**
 * Light secret / demo-credential scan of the working tree (and optional recent history).
 * Prints a JSON report. Exits 1 only on high-confidence hits (private keys, AWS keys, the old demo
 * password) outside docs/. Safe false positives may remain in the report.
 *
 * Run from the repository root: node deploy/scripts/secret-scan.mjs
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
/** Files at or above this size (generated data, binaries) are not read. */
const MAX_SCANNED_FILE_BYTES = 1_500_000;
const DEMO_PASSWORD = "MyStrongPassword123!";
/** Folder names that only hold dependencies or build output. */
const SKIP = new Set([
  "node_modules",
  ".git",
  "bin",
  "obj",
  "target",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
  "artifacts",
  ".nuget",
]);

const patterns = [
  { id: "private-key", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: "aws-key", re: /AKIA[0-9A-Z]{16}/ },
  { id: "generic-secret-assign", re: /(api[_-]?key|secret|password|token)\s*[=:]\s*['"][^'"]{12,}['"]/i },
  { id: "demo-strong-password", re: /MyStrongPassword123!/ },
  { id: "slack-token", re: /xox[baprs]-[0-9a-zA-Z-]{10,}/ },
];
/** Pattern ids that fail the scan (the rest are informational). */
const FATAL_PATTERN_IDS = new Set(["private-key", "aws-key", "demo-strong-password"]);

/** Binary assets, lockfiles, the scan docs and this script itself would only produce noise. */
const isAllowlistedPath = (path) =>
  /node_modules|\.lock$|\.png$|\.jpg$|\.webp$|\.svg$|\.woff|\.map$|package-lock|register_payload\.example|docs\/ops\/SECRET-SCAN|secret-scan\.mjs/i.test(
    path,
  );

const findings = [];

/** Recursively scans every readable text file under `dir` and records pattern hits in `findings`. */
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const fullPath = join(dir, name);
    let stats;
    try {
      stats = statSync(fullPath);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!stats.isFile() || stats.size >= MAX_SCANNED_FILE_BYTES) continue;

    const relativePath = relative(root, fullPath).replaceAll("\\", "/");
    if (isAllowlistedPath(relativePath)) continue;
    let text;
    try {
      text = readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }
    for (const { id, re } of patterns) {
      if (re.test(text)) findings.push({ file: relativePath, id });
    }
  }
}

walk(root);

// History check: the demo password once lived in commits; list where so it can be rotated/cleaned.
const history = [];
try {
  const log = execSync(
    `git log -S "${DEMO_PASSWORD}" --oneline --all`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
  if (log) history.push({ needle: DEMO_PASSWORD, commits: log.split("\n").slice(0, 8) });
} catch {
  /* no git */
}

const report = {
  scannedAt: new Date().toISOString(),
  workingTreeHits: findings,
  historyNotes: history,
  remediation: [
    "web-app/register_payload.json removed; use register_payload.example.json (gitignored real file).",
    "element-internal-dev-key is an intentional local default — blocked in production startup.",
    "Rotate any real key that ever lived in a committed .env (check gitignored docker/.env*).",
  ],
};

console.log(JSON.stringify(report, null, 2));
// High-confidence only: real key material or demo password still living in product paths.
const fatal = findings.filter((finding) => FATAL_PATTERN_IDS.has(finding.id) && !finding.file.startsWith("docs/"));
if (fatal.length) process.exit(1);
