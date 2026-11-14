using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Element.Gateway;

/// <summary>
/// Per-IP fixed-window quotas at the gateway edge (stock Caddy has no rate_limit plugin, so edge limiting lives here).
/// Keep these numbers and the documentation in sync:
///   POST /api/v1/auth/register, password/forgot, email/send-verification → 5 / min (sign-up spam, mail bombing)
///   other POST /api/v1/auth/*  → 15 / min  (login; identity also locks an account after 5 failures / 15 min)
///   everything else            → 60 / 10 s (anonymous traffic)
/// The per-API-key Redis TPS limit is separate (see ApiKeyValidator).
/// </summary>
public static class RateLimitPolicy
{
    private const string RegisterPath = "/api/v1/auth/register";
    private const string AuthPathPrefix = "/api/v1/auth";

    // Anonymous endpoints that create accounts or send mail share the tight "register" bucket.
    private static readonly string[] RegisterBucketPaths =
    [
        RegisterPath,
        "/api/v1/auth/password/forgot",
        "/api/v1/auth/email/send-verification",
    ];

    public const int RegisterPermitLimit = 5;
    public static readonly TimeSpan RegisterWindow = TimeSpan.FromMinutes(1);

    public const int AuthPermitLimit = 15;
    public static readonly TimeSpan AuthWindow = TimeSpan.FromMinutes(1);

    public const int PublicPermitLimit = 60;
    public static readonly TimeSpan PublicWindow = TimeSpan.FromSeconds(10);

    /// <summary>Picks the quota bucket (partition key, permit count, window) for a request based on its client IP, method and path.</summary>
    public static (string PartitionKey, int PermitLimit, TimeSpan Window) Resolve(HttpContext context)
    {
        var clientIp = ClientIp.Resolve(context);

        if (IsRegisterBucketRequest(context.Request))
            return ($"register:{clientIp}", RegisterPermitLimit, RegisterWindow);

        if (IsPost(context.Request) && context.Request.Path.StartsWithSegments(AuthPathPrefix))
            return ($"auth:{clientIp}", AuthPermitLimit, AuthWindow);

        return ($"public:{clientIp}", PublicPermitLimit, PublicWindow);
    }

    /// <summary>
    /// Writes the 429 answer: a JSON problem body (sign-up attempts get a friendlier message) and a
    /// Retry-After header, so a well-behaved client waits for the window instead of guessing and hammering.
    /// </summary>
    public static async ValueTask WriteRejectionAsync(OnRejectedContext rejection, CancellationToken cancellationToken)
    {
        var httpContext = rejection.HttpContext;
        if (rejection.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            var seconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
            httpContext.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
        }

        var detail = IsSignUpRequest(httpContext.Request)
            ? "Too many sign-up attempts from this address. Wait a minute and try again."
            : "Too many requests. Please try again later.";

        var problemDetails = new
        {
            Type = "https://httpstatuses.com/429",
            Title = "Rate Limit Exceeded",
            Status = StatusCodes.Status429TooManyRequests,
            Detail = detail,
            Instance = httpContext.Request.Path,
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
    }

    /// <summary>True for <c>POST /api/v1/auth/register</c> only; selects the friendlier sign-up 429 message.</summary>
    internal static bool IsSignUpRequest(HttpRequest request) =>
        IsPost(request) && request.Path.StartsWithSegments(RegisterPath);

    private static bool IsRegisterBucketRequest(HttpRequest request) =>
        IsPost(request) && RegisterBucketPaths.Any(path => request.Path.StartsWithSegments(path));

    private static bool IsPost(HttpRequest request) => HttpMethods.IsPost(request.Method);
}
