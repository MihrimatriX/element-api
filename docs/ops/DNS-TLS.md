# DNS / TLS checklist — elements-api.ahmetfuzunkaya.com

## Checklist

- [ ] Choose deploy host IP (machine that will run `element-prod` Caddy) — **not assumed**
- [ ] A (and AAAA if any) for `elements-api` → that host
- [ ] Firewall / SG: **80** and **443** open on that host
- [ ] `CADDY_SITE=elements-api.ahmetfuzunkaya.com` (not `http://:80`)
- [ ] `CADDY_HTTP_PORT=80` / `CADDY_HTTPS_PORT=443`
- [ ] Origins use `https://elements-api.ahmetfuzunkaya.com`
- [ ] `curl.exe -sI https://elements-api.ahmetfuzunkaya.com/` → HTTP/2 200 (or 301→https then 200)
- [ ] Certificate valid (browser padlock / `openssl s_client`)

## Discovered context (do not invent control)

**Date:** 2026-09-26 (Europe/Istanbul) — re-probe: `pwsh -File deploy/scripts/probe-dns.ps1`

| Check | Result |
|-------|--------|
| DNS `elements-api.ahmetfuzunkaya.com` | **NXDOMAIN** (name does not exist) |
| Apex `ahmetfuzunkaya.com` A | `145.14.158.207` |
| Apex NS | `ns1.dns-parking.com`, `ns2.dns-parking.com` (**Hostinger**) |
| Apex HTTPS | Personal Next.js site (openresty) — **not** this repo’s Caddy stack |
| This workstation public IPv4 | `81.214.166.202` (home/NAT — only use if you intentionally host here) |
| Cloudflare / registrar API keys in repo or shell env | **None** — cannot update DNS from this machine |

**Important:** Apex Hostinger hosting already serves a different site on `:80`/`:443`. Putting `elements-api` on the **same** shared-host IP without Docker+Caddy will not serve this stack. Prefer a **dedicated VPS** (or Hostinger VPS with Docker) and point the **subdomain A record only** at that VPS.

## Operator: create the record (Hostinger hPanel)

1. Log in → **Domains** → `ahmetfuzunkaya.com` → **DNS / DNS Zone**.
2. Add record:

| Type | Name / Host | Value / Points to | TTL |
|------|-------------|-------------------|-----|
| **A** | `elements-api` | `<DEPLOY_HOST_IPV4>` | 300 or Auto |
| **AAAA** (optional) | `elements-api` | `<DEPLOY_HOST_IPV6>` | 300 or Auto |

3. Do **not** change apex A unless you mean to move the personal site.
4. Wait for propagation (often minutes; up to TTL).
5. On the deploy host: fill `docker/.env.public.prod` with `-ServerTemplate` (see [PROD-ENV.md](./PROD-ENV.md)), open 80/443, then:

```powershell
./deploy/scripts/present-public.ps1 -Server
```

6. Re-probe:

```powershell
pwsh -NoProfile -File ./deploy/scripts/probe-dns.ps1
curl.exe -sI --max-time 20 https://elements-api.ahmetfuzunkaya.com/
```

Caddy finishes ACME once DNS points at the host. Until then TLS retries — expected.

## Optional later

After A/AAAA works: Cloudflare orange-cloud on `elements-api` for WAF (see [PUBLIC-HOST.md](../PUBLIC-HOST.md)). Not required for Let's Encrypt HTTP-01 if port 80 reaches Caddy directly.
