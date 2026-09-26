#!/usr/bin/env node
/**
 * Light secret / demo-credential scan of the working tree (and optional recent history).
 * Exit 1 on high-confidence hits in tracked-looking paths. Safe false positives may remain.
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
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

const allowPath = (p) =>
  /node_modules|\.lock$|\.png$|\.jpg$|\.webp$|\.svg$|\.woff|\.map$|package-lock|register_payload\.example|docs\/ops\/SECRET-SCAN|secret-scan\.mjs/i.test(
    p,
  );

const findings = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full);
    else if (st.isFile() && st.size < 1_500_000) {
      const rel = relative(root, full).replaceAll("\\", "/");
      if (allowPath(rel)) continue;
      let text;
      try {
        text = readFileSync(full, "utf8");
      } catch {
        continue;
      }
      for (const { id, re } of patterns) {
        if (re.test(text)) findings.push({ file: rel, id });
      }
    }
  }
}

walk(root);

let history = [];
try {
  const log = execSync(
    'git log -S "MyStrongPassword123!" --oneline --all',
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
  if (log) history.push({ needle: "MyStrongPassword123!", commits: log.split("\n").slice(0, 8) });
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
const fatal = findings.filter(
  (f) =>
    (f.id === "private-key" || f.id === "aws-key" || f.id === "demo-strong-password") &&
    !f.file.startsWith("docs/"),
);
if (fatal.length) process.exit(1);
