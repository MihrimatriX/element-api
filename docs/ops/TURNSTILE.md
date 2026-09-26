# Turnstile (public captcha) checklist

Env-gated. Empty keys = captcha **off** (local/dev OK).

| Key | Where | Required for prod captcha? |
|-----|--------|----------------------------|
| `CAPTCHA_SECRET_KEY` | identity compose env | Yes, if captcha on |
| `VITE_CAPTCHA_SITE_KEY` | web-app **build arg** | Yes; rebuild web after change |

## Checklist

- [ ] Cloudflare Turnstile widget created (hostname `elements-api.ahmetfuzunkaya.com` when DNS live; add `localhost` for local smoke)
- [ ] Site key pasted into `VITE_CAPTCHA_SITE_KEY` in `docker/.env.public.prod`
- [ ] Secret pasted into `CAPTCHA_SECRET_KEY`
- [ ] Web image rebuilt (`VITE_*` bake-time)
- [ ] `GET /api/v1/auth/capabilities` → `captcha: true`
- [ ] Register + login show widget; missing token returns honest Turkish error

**2026-09-26:** both keys still empty in local prod env — captcha **off** (allowed). Operator must paste from [Cloudflare Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile); no API token in this repo.

Leave both empty for e-postasız / captcha-off beta. Details: [PUBLIC-HOST.md](../PUBLIC-HOST.md).
