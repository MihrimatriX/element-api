# Contributing

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(web): polish lab void chrome
fix(order): timing-safe INTERNAL_API_KEY compare
docs(ci): Jenkins path matrix
chore: add MIT LICENSE
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `perf`. Scope optional (service or area).

## How to present / test (single list)

| Intent | Command |
|--------|---------|
| **present** full platform | `./deploy/scripts/present-platform.ps1` → http://localhost:3000 |
| **present** atlas-only | `./deploy/scripts/present-local.ps1` → http://127.0.0.1:5080 |
| **present** public env | `./deploy/scripts/present-public.ps1 -Environment Dev` |
| **up** (compose alias) | `docker compose --env-file docker/.env up -d --build` |
| **test** (root) | `./deploy/scripts/test.ps1` or `pwsh ./scripts/test.ps1` |
| **lint** (root) | `./deploy/scripts/lint.ps1` |
| **test-all** | `./deploy/scripts/test-all.ps1` (+ `-Integration` / `-Live` / `-Browser`) |
| order unit | `npm --prefix order-service test` |
| web unit | `npm --prefix web-app test` |
| web e2e | `npm --prefix web-app run test:e2e` (needs specs; empty ≠ product green) |
| Java | `mvn -f wallet-service test` / `mvn -f inventory-service test` |
| gateway unit | `dotnet test deploy/tests/Element.Gateway.Tests` |
| secret scan | `node deploy/scripts/secret-scan.mjs` |

Root convenience wrappers (same as above): `scripts/test.ps1`, `scripts/lint.ps1`, `scripts/up.ps1`, `scripts/present.ps1`.

CI is **Jenkins** path-based Multibranch — see [docs/CI-JENKINS.md](./docs/CI-JENKINS.md). Do not add GitHub Actions as the primary gate.

Do not commit secrets (`.env*`, real `register_payload.json`). Prefer `register_payload.example.json`.
