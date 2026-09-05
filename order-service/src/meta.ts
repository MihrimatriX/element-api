import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
export const packageJson = JSON.parse(
  readFileSync(join(dir, '../package.json'), 'utf8')
) as { name: string; version: string };
