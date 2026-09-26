# Jenkins CI (path-based Multibranch)

Preference: **Jenkins**, not GitHub Actions. Root [`Jenkinsfile`](../Jenkinsfile) selects stages from `git diff` paths.

## Local / host controller (this repo)

```powershell
pwsh -NoProfile -File ./deploy/scripts/jenkins-up.ps1
# UI: http://127.0.0.1:8085
# Stop: pwsh -NoProfile -File ./deploy/scripts/jenkins-up.ps1 -Down
```

Compose file: [`docker-compose.jenkins.yml`](../docker-compose.jenkins.yml) (`jenkins/jenkins:lts-jdk21`). First boot prints `initialAdminPassword` from the script.

**Unlock one-liner** (setup wizard “Administrator password”):

```powershell
docker exec element-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

After the wizard (or API bootstrap), local admin credentials live in gitignored `docker/.jenkins-local-admin.txt` (never commit). Login: http://127.0.0.1:8085 — user `admin`.

**Limits of the stock image:** Node 22 / .NET 8 / JDK+Maven / `pwsh` are **not** bundled. Use this controller for job wiring; attach a Windows/Linux agent with those tools (or build a custom agent image) before expecting green Multibranch builds. First Multibranch builds will fail on missing tools until an agent is provisioned — that is expected.

Job DSL paste-ready files:

| File | Purpose |
|------|---------|
| [`deploy/jenkins/job-dsl-multibranch.groovy`](../deploy/jenkins/job-dsl-multibranch.groovy) | Multibranch `element-api` → root `Jenkinsfile` |
| [`deploy/jenkins/job-dsl-nightly.groovy`](../deploy/jenkins/job-dsl-nightly.groovy) | Cron nightly → `deploy/jenkins/Jenkinsfile.nightly` |

Repo: `https://github.com/MihrimatriX/element-api.git`

## Multibranch job setup (operator)

### A. UI (any Jenkins host)

1. Install plugins: **Pipeline**, **Git**, **GitHub Branch Source**, **Pipeline: Multibranch**, optionally **Job DSL**.
2. **Credentials** → add GitHub PAT (or GitHub App) id `github-element-api` (read repo + PR).
3. New Item → **Multibranch Pipeline** → name `element-api`.
4. Branch Sources → GitHub → owner `MihrimatriX` / repo `element-api` → credentials above.
5. Build configuration → **by Jenkinsfile** → Script Path: `Jenkinsfile` (repo root).
6. Scan Multibranch Pipeline Triggers → periodically (e.g. 1 day) or webhook.
7. Save → **Scan Repository Now**.

### B. Job DSL (faster on a prepared controller)

1. Install **Job DSL** plugin.
2. Create credentials id `github-element-api` (must match the Groovy) — **Username + PAT** (or GitHub App). Without it, public-repo branch indexing still works but hits GitHub’s **anonymous API rate limit** (scans can sleep for minutes). Nightly Job DSL still expects this id.
3. New Item → Freestyle `seed-element-api` → build step **Process Job DSLs** → look on filesystem → path to `deploy/jenkins/job-dsl-multibranch.groovy` (or paste file contents). On the compose controller the same files are mounted at `/var/jenkins_casc_hints/`.
4. Build seed → confirm folder job `element-api` → Scan Now.
5. Optionally also process `job-dsl-nightly.groovy`.

Script Console seed (controller already has Job DSL + mount):

```groovy
def script = new File('/var/jenkins_casc_hints/job-dsl-multibranch.groovy').text
def jm = new javaposse.jobdsl.plugin.JenkinsJobManagement(System.out, [:], new File('.'))
new javaposse.jobdsl.dsl.DslScriptLoader(jm).runScript(script)
```

### Merge gate

- GitHub: Settings → Branches → protect `main` → **Require status checks** → select the Jenkins check name (often `continuous-integration/jenkins/pr-merge` or the Multibranch job/branch name after first PR build).
- Equivalent: require the Multibranch PR build to be green before merge.

### Agents

Windows or Linux agents need: Node 22+, .NET 8 SDK, JDK 21 + Maven, PowerShell 7 (`pwsh`), Git. Playwright stage installs Chromium via `npx playwright install chromium`.

Optional compose smoke: set job env `RUN_COMPOSE_SMOKE=1` and Docker available on the agent (`deploy/scripts/jenkins-compose-smoke.ps1`).

## Path → stage matrix

| Path prefix | Stages |
|-------------|--------|
| `order-service/**` | `npm ci` + `npm run check` + `npm test` |
| `web-app/**` | lint + unit test (+ Playwright when e2e specs exist) |
| `*-service/**` (.NET) / `shared-lib/**` / `deploy/tests/**` | `deploy/scripts/test-unit.ps1` |
| `gateway-service/**` | same .NET unit suite (includes RateLimit / API key tests) |
| `wallet-service/**` | `mvn test` |
| `inventory-service/**` | `mvn test` |
| `docker/**`, compose, Caddy, deploy scripts | optional compose `/health` smoke if `RUN_COMPOSE_SMOKE=1` |
| `docs/**`, `TODO.md`, most `*.md` only | **skip** heavy builds (docs-only stage) |
| `Jenkinsfile`, `docs/CI-JENKINS.md` | light re-run of order + web |

Shared / compose / gateway changes also pull order when those prefixes match (see Jenkinsfile).

## Nightly full suite

Job DSL: `deploy/jenkins/job-dsl-nightly.groovy` (cron `H 2 * * 1-5`), or create manually:

```powershell
pwsh -NoProfile -File ./deploy/scripts/test-all.ps1 -Configuration Review -Integration
# Optional when stack is up:
# pwsh -NoProfile -File ./deploy/scripts/test-all.ps1 -Live -Browser -WebBase http://localhost:3000
```

Partial path CI can miss cross-service breaks — nightly catches those.

## Alignment with local scripts

| Local | Jenkins |
|-------|---------|
| `npm --prefix order-service run check` / `test` | order-service stage |
| `npm --prefix web-app run lint` / `test` | web-app stage |
| `./deploy/scripts/test-unit.ps1` | dotnet unit stage |
| `mvn test` in wallet/inventory | Java stages |
| `./deploy/scripts/test-all.ps1` | nightly job (not every PR) |
| `present-platform.ps1` | **not** CI — local/demo only |

## Empty e2e trap

Playwright configs exist under `web-app/`. Specs live in `e2e/`, `e2e-auth/`, `e2e-live/`. **Zero specs ≠ green product** — if a directory is empty, treat coverage as missing (see README). CI runs `test:e2e` only when `web-app/e2e` exists with specs.
