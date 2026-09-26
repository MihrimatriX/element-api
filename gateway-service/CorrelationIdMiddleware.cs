using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace Element.Gateway;

/// <summary>
/// Ensures every request has X-Request-Id (echo client value or mint one) and
/// propagates it downstream via the inbound request headers (YARP forwards them).
/// </summary>
public sealed class CorrelationIdMiddleware
{
    public const string HeaderName = "X-Request-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var incoming = context.Request.Headers[HeaderName].FirstOrDefault()
            ?? context.Request.Headers["X-Correlation-Id"].FirstOrDefault();
        var id = string.IsNullOrWhiteSpace(incoming)
            ? Guid.NewGuid().ToString("N")
            : incoming.Trim();
        if (id.Length > 128) id = id[..128];

        context.Request.Headers[HeaderName] = id;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[HeaderName] = id;
            return Task.CompletedTask;
        });

        using (LogContext.PushProperty("RequestId", id))
            await _next(context);
    }
}
