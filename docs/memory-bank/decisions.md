# Decisions

## FAL (Free Art License) for element photos

**Decision:** Treat FAL / Free Art License as openly reusable, same bucket as CC BY / CC0 / Public domain.

**Why:** Alchemist-hp Commons element specimens (including Fe) are often FAL. Rejecting FAL left Iron without a photo despite a valid specimen image.

**Where:** `deploy/scripts/refresh-atlas.mjs` license regex.

## No observability stack in default platform

**Decision:** Remove Prometheus scraping endpoint, HealthChecks UI, Seq, ELK, Grafana, Loki, OTLP/OpenTelemetry packages and compose services. Delete helm/k8s deploy trees in the same simplification pass.

**Keep:** `/info`, `/health`, `/health/live`, `/health/ready` (+ payment actuator liveness/readiness).

**Why:** Daily local work overheated on full stacks; observability was not required for the scientific/Atlas product track.

## `/lab` replaces `/stack`

**Decision:** Product surface is the discovery laboratory. Old stack/ops page is deleted; `/stack` redirects to `/hakkinda`.

**Why:** Educational discovery is the user-facing story; infra dashboards are not.

## Atlas media pipeline shape

**Decision:** Curated editorial in `atlas-editorial.mjs` + durable manifest `atlas-media.json` + static files under `web-app/public/media/atlas/`. Script reapplies into scientific JSON so API remains source of truth for clients.

**Photo policy:** Prefer named element specimens; skip portraits, diagrams, discharge tubes, Bohr icons, etc. Compounds get PubChem 2D structure PNGs.

## Missing element photos are OK

**Decision:** Leave `media.photo = null` when Commons has no license/heuristic match. UI falls back to schematic visuals (`AtlasVisual`). Do not force low-quality or wrongly licensed images.

## Memory bank over a custom skill

**Decision:** Persist agent context as `docs/memory-bank/*` + alwaysApply Cursor rule. Do **not** also invent a project skill that duplicates the same content.

## KREDI currency; keep legacy ELX wire names

**Decision:** User-facing currency is **KREDI**. Do **not** rename wire/API fields or reason codes (`balanceElx`, `avgCostElx`, `proceedsElx`, `requiredElx`, `INSUFFICIENT_ELX`, DB `*_elx`) without an explicit breaking migration. Values are Kredi; clients should trust `currency: "KREDI"`.

**Why:** Renaming would break smoke/e2e, web-app types, and any external API-key clients for no product gain. UI copy already says “kredi”.

**Where documented:** root `README.md` § Bilimsel veri ve alışveriş sözleşmesi (canonical list).
