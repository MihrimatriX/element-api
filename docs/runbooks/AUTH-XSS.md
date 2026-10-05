# Auth XSS runbook — localStorage JWT / API key

## Risk

The web app stores session material in **`localStorage`**:

- `token` — JWT after login
- `apiKey` — user API key (`ele_live_…`)

Any XSS in the origin can read `localStorage` and exfiltrate credentials. HttpOnly cookies are **not** used today (see backlog below).

## Detection

- Unexpected API usage (orders, wallet) for a user who is idle
- User reports account takeover after clicking a link on the site
- CSP / browser console violations after a deploy

## Immediate response

1. **Contain:** Rotate identity secrets if you suspect mass leak (`JWT_SECRET` revoke-all sessions; regenerate user API keys via identity).
2. **User:** Force logout UI clears `token` + `apiKey` (`session.ts` / `api.ts`). Ask affected users to sign out everywhere and change password when SMTP exists.
3. **Patch XSS:** Identify injection (unsanitized HTML, markdown, open redirects). Prefer textContent/React escaping; avoid `dangerouslySetInnerHTML` on user input.
4. **CSP:** Production Caddy sends a stricter CSP (see `deploy/Caddyfile.elements-api`). Confirm headers on `https://…`.
5. **Postmortem:** Note vector, time window, whether API keys were used; revoke those keys in identity.

## Hardening already in place

- Caddy: `X-Content-Type-Options`, `X-Frame-Options DENY`, `Referrer-Policy`, `Permissions-Policy`, CSP (see Caddyfile)
- Gateway rate limits on auth
- Optional Turnstile on register/login

## Backlog (medium term)

**Target decision date: 2026-12-31** — migrate session to **httpOnly Secure SameSite cookie** (or short-lived access token + refresh cookie). Track in [AUTH-COOKIE-BACKLOG.md](./AUTH-COOKIE-BACKLOG.md). Until then treat XSS as credential theft.
