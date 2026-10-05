import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const sourceDir = dirname(fileURLToPath(import.meta.url));

/** Name and version from package.json, reported by GET /info and GET /api/v1. */
export const packageJson = JSON.parse(
  readFileSync(join(sourceDir, "../package.json"), "utf8"),
) as { name: string; version: string };
