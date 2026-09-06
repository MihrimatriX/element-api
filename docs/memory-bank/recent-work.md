# Recent work (ChatGPT → Cursor continuation)

Timeline context: conversation [Resume Atlas Lab work](288cf6e9-1d7b-4dc0-9110-6e9e098ada75). Commits on `main` are mostly placeholder messages (`aaa`); the real unfinished track lived as large **uncommitted** diffs.

## ChatGPT started

1. **Scientific catalog v2 + Atlas** — editorial Turkish copy, media schema, PubChem structures, Wikipedia links
2. **Laboratuvar UI** — `/lab` discovery game replacing the old observability “stack” marketing page
3. **Infra simplify** — remove ELK/Grafana/Prometheus/OpenTelemetry/HealthChecks.UI packages and compose services (`artifacts/simplify-infra.mjs` was the rewrite helper)
4. **Doc sync** — README / sitemap / platform tests pointed at `/lab` instead of `/stack`
5. **Fe photo gap** — Iron Commons sample is FAL-licensed; script initially rejected FAL → `media.photo` stayed null

## Cursor continuation finished (2026-09-06)

| Item | Status |
|------|--------|
| Accept FAL in `refresh-atlas.mjs` license regex | Done |
| Re-fetch Fe → `web-app/public/media/atlas/fe.jpg` + manifest + scientific JSON | Done |
| API returns Fe `media.photo.url=/media/atlas/fe.jpg` | Verified live |
| `/lab` live on Vite `:5173` | Verified |
| `/metrics` + `/health-ui` → 404 | Intentional; verified |
| `Stack.tsx` / `docker/observability` / `OpenTelemetryExtensions.cs` gone | Verified absent |
| Docs mention `/lab`, atlas refresh | In root README |
| web-app tests 5/5 + production build | Verified |
| catalog / gateway / compound `dotnet build` | Verified |

## Local stack re-verify (2026-09-07)

| Item | Status |
|------|--------|
| Fix `start-local.ps1` `.env` parse (TR locale dropped `RABBITMQ_*`) | Done |
| Order `:5003` + payment `:5005` + Rabbit `element` user | Up |
| `test-smoke.ps1` buy saga + desk sell | **20/20** |
| Fe atlas via gateway after refreshing Release `Data/` JSON | `media.photo` FAL `/media/atlas/fe.jpg` |
| `/`, `/lab`, `/piyasa`, `/magaza`, compounds, auth | Verified |

## Intentionally incomplete (not blockers for this track)

- Only **~40 / 118** elements have specimen photos (strict Commons filters). Rest stay `photo: null` with schema/Bohr fallback in UI.
- Large uncommitted working tree (JSON blobs, media, compose/docs) — **not committed** unless user asks.
- After atlas JSON edits, avoid relying on stale Release bin Data with `-NoBuild` (see `open-risks.md`).

## Key new / touched files

- `deploy/scripts/refresh-atlas.mjs`, `deploy/data/atlas-editorial.mjs`, `deploy/data/atlas-media.json`
- `web-app/src/pages/Laboratory.tsx`, `web-app/src/services/lab.ts`, `web-app/src/atlas.css`, `AtlasVisual.tsx`
- `web-app/public/media/atlas/*` (photos + `*-structure.png`)
- Compose / Program.cs / csproj / order observability strip across services
