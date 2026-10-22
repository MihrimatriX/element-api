# Turnstile (public captcha) checklist

Controlled by env. With empty keys, captcha is off (local/dev OK).

| Key | Where | Required for prod captcha? |
|-----|--------|----------------------------|
| `CAPTCHA_SECRET_KEY` | identity compose env | Yes, if captcha on |
| `VITE_CAPTCHA_SITE_KEY` | web-app build arg | Yes; rebuild web after change |

## Checklist

- [ ] Cloudflare Turnstile widget created (hostname `elements-api.ahmetfuzunkaya.com` when DNS live; add `localhost` for local smoke)
- [ ] Site key pasted into `VITE_CAPTCHA_SITE_KEY` in `docker/.env.public.prod`
- [ ] Secret pasted into `CAPTCHA_SECRET_KEY`
- [ ] Web image rebuilt (`VITE_*` bake-time)
- [ ] `GET /api/v1/auth/capabilities` returns `captcha: true`
- [ ] Register + login show the widget; a missing token returns a clear Turkish error

2026-09-26: both keys are still empty in the local prod env, so captcha is off (allowed). Operator must paste from [Cloudflare Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile); no API token in this repo.

Leave both empty for e-postasız / captcha-off beta. Details: [PUBLIC-HOST.md](../PUBLIC-HOST.md).
