using Microsoft.AspNetCore.Http;

namespace Element.Gateway;

/// <summary>
/// Per-IP fixed-window quotas at the gateway edge.
/// Numbers (document + change together):
///   POST /api/v1/auth/register → 5 / min  (signup spam)
///   other POST /api/v1/auth/*  → 15 / min (login; identity also locks 5 fails / 15 min)
///   everything else            → 60 / 10s (anonymous scrape; was 100/10s)
/// API-key Redis TPS is separate (ApiKeyValidator).
/// Stock Caddy has no rate_limit plugin — edge RL lives here.
/// </summary>
public static class RateLimitPolicy
{
    public const int RegisterPermitLimit = 5;
    public static readonly TimeSpan RegisterWindow = TimeSpan.FromMinutes(1);

    public const int AuthPermitLimit = 15;
    public static readonly TimeSpan AuthWindow = TimeSpan.FromMinutes(1);

    public const int PublicPermitLimit = 60;
    public static readonly TimeSpan PublicWindow = TimeSpan.FromSeconds(10);

    public static (string PartitionKey, int PermitLimit, TimeSpan Window) Resolve(HttpContext context)
    {
        var ip = ClientIp.Resolve(context);
        var path = context.Request.Path;
        var post = HttpMethods.IsPost(context.Request.Method);

        if (post && path.StartsWithSegments("/api/v1/auth/register"))
            return ($"register:{ip}", RegisterPermitLimit, RegisterWindow);

        if (post && path.StartsWithSegments("/api/v1/auth"))
            return ($"auth:{ip}", AuthPermitLimit, AuthWindow);

        return ($"public:{ip}", PublicPermitLimit, PublicWindow);
    }
}
