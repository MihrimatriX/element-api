# Backlog — httpOnly cookie / short-lived token + refresh

| Field | Value |
|-------|--------|
| Status | Deferred (conscious) |
| Decision recorded | 2026-09-26 |
| Target revisit | **2026-12-31** |
| Owner | solo maintainer |

## Decision

Keep JWT + API key in `localStorage` for the current demo/beta. Plan migration to:

1. Short-lived access token (memory or short cookie)
2. Refresh token in **httpOnly** + `Secure` + `SameSite=Lax|Strict` cookie
3. CSRF strategy if cookie auth is used for state-changing POSTs

## Why wait

- SPA already wired to `Authorization` / `X-API-Key` headers via gateway
- E-postasız beta and Turnstile land first; cookie auth needs identity + web + CORS/credentials pass together
- XSS runbook documents interim risk ([AUTH-XSS.md](./AUTH-XSS.md))

## Exit criteria

- [ ] Identity issues refresh cookie; access token ≤15–30 min
- [ ] Web stops persisting long-lived JWT in `localStorage`
- [ ] Playwright auth smoke updated
- [ ] Runbook updated; this backlog marked done
