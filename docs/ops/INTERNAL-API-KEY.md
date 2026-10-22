# INTERNAL_API_KEY — production audit

Shared secret for calls from the gateway to identity/order/wallet and from notification to identity. It is not a browser credential.

## Kill-switch consistency (2026-09-26)

| Surface | Prod detection | Rejects |
|---------|----------------|---------|
| `order-service` `config.ts` | `NODE_ENV === "production"` | length &lt; 32 or `element-internal-dev-key`; throws at import |
| .NET (`shared-lib` `ProductionConfiguration`) | `IsProduction()` | length &lt; 32, contains `ChangeMe`, or `element-internal-dev-key` when key present |
| `wallet-service` `ProductionSecretsGuard` | `ELEMENT_ENV=prod` or Spring profile `production` | same weak values; fails startup |
| Public compose | `${INTERNAL_API_KEY:?…}` required | empty env fails compose; `present-public.ps1 -Server` also guards |
| Local compose | default `element-internal-dev-key` | OK for localhost only |

Inventory-service does not read `INTERNAL_API_KEY` (message-driven stock), so it needs no guard.

Comparison: order-service uses `crypto.timingSafeEqual`; wallet uses `MessageDigest.isEqual` (constant-time). Prefer those over `==` / `.equals` for this header.

## Operator rule

Never commit real prod keys. Generate with `openssl rand -hex 32`. Keep only in gitignored `docker/.env.public.prod`.
