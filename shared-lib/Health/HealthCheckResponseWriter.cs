using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Element.Shared.Health;

/// <summary>Short, uniform JSON body for health endpoints.</summary>
public static class HealthCheckResponseWriter
{
    /// <summary>Writes <c>{ status, checks: [{ name, ok, ms }] }</c> so dashboards and scripts can parse every service the same way.</summary>
    public static Task WriteJsonResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsJsonAsync(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(entry => new
            {
                name = entry.Key,
                ok = entry.Value.Status == HealthStatus.Healthy,
                ms = Math.Round(entry.Value.Duration.TotalMilliseconds, 2),
            }),
        });
    }
}
