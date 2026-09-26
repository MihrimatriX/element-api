# Secret scan report — 2026-09-26

Tool: `node deploy/scripts/secret-scan.mjs`

## Working tree

- **Removed:** `web-app/register_payload.json` (demo password `MyStrongPassword123!`). Replaced by gitignored pattern + `register_payload.example.json` (placeholder password).
- **Intentional local defaults:** `element-internal-dev-key` in compose/dev docs — blocked in production startup (order / .NET / wallet guard).
- No PEM private keys or `AKIA…` AWS keys found in scanned source paths.

## History (light)

- `git log -S "MyStrongPassword123!"` hits older commits that added `web-app/register_payload.json`. Treat as demo credential; rotate if that password was ever used on a real host.
- `element-internal-dev-key` appears in history as the documented local default.

## Operator follow-up

- Keep `docker/.env.public.prod` gitignored; never commit.
- If a real JWT/INTERNAL key was pasted into chat or a committed file, rotate on the server.
