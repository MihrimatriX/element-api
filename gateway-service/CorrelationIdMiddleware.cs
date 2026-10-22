using Serilog.Context;

namespace Element.Gateway;

/// <summary>
/// Ensures every request has X-Request-Id (echo client value or mint one) and
/// propagates it downstream via the inbound request headers (YARP forwards them).
/// </summary>
public sealed class CorrelationIdMiddleware
{
    public const string HeaderName = "X-Request-Id";
    private const string LegacyHeaderName = "X-Correlation-Id";
    private const int MaxRequestIdLength = 128;

    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    /// <summary>Resolves the request id, writes it to the request and response headers and the log context, then calls the next middleware.</summary>
    public async Task InvokeAsync(HttpContext context)
    {
        var requestId = ResolveRequestId(context.Request);

        context.Request.Headers[HeaderName] = requestId;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[HeaderName] = requestId;
            return Task.CompletedTask;
        });

        using (LogContext.PushProperty("RequestId", requestId))
            await _next(context);
    }

    // Reuses the caller's id (trimmed and capped so a client cannot flood logs) or mints a new one.
    private static string ResolveRequestId(HttpRequest request)
    {
        var incomingId = request.Headers[HeaderName].FirstOrDefault()
            ?? request.Headers[LegacyHeaderName].FirstOrDefault();

        var requestId = string.IsNullOrWhiteSpace(incomingId)
            ? Guid.NewGuid().ToString("N")
            : incomingId.Trim();

        return requestId.Length > MaxRequestIdLength
            ? requestId[..MaxRequestIdLength]
            : requestId;
    }
}
