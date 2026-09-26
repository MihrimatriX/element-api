# SMTP checklist (register / password reset)

Product decision: **e-postasız beta** is allowed — leave SMTP empty; recovery stays off.

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` / `SMTP_PORT` | Relay |
| `SMTP_USER` / `SMTP_PASS` | Auth (if any) |
| `SMTP_FROM` | From address |

## Checklist

- [x] Decide: **e-postasız beta** (product decision; Resend later when keys exist)
- [x] Beta: all `SMTP_*` empty in `docker/.env.public.prod` fill; recovery stays off
- [ ] If switching to live: host reachable from identity container; From domain allowed by provider
- [ ] Optional later: Resend API key (not wired as default — see LOCAL-VERIFICATION)

Do not commit real SMTP passwords. Prefer provider API keys in gitignored env only.
