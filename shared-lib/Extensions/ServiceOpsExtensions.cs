using System.Reflection;
using Element.Shared.Health;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;

namespace Element.Shared.Extensions;

public static class ServiceOpsExtensions
{
    /// <summary>
    /// Maps /health/live, /health/ready, /health (alias), and /info for microservice ops.
    /// Register health checks before calling this.
    /// </summary>
    public static WebApplication MapStandardOpsEndpoints(
        this WebApplication app,
        string serviceName,
        IReadOnlyDictionary<string, string>? links = null)
    {
        var version = Assembly.GetEntryAssembly()?.GetName().Version?.ToString(3) ?? "1.0.0";
        var env = app.Environment.EnvironmentName;

        app.MapGet("/info", () => Results.Ok(new
        {
            name = serviceName,
            version,
            environment = env,
            links = links ?? new Dictionary<string, string>()
        }))
        .WithName("ServiceInfo")
        .WithTags("Ops");

        var liveOptions = new HealthCheckOptions
        {
            Predicate = _ => false,
            ResponseWriter = HealthCheckResponseWriter.WriteJsonResponse
        };
        var readyOptions = new HealthCheckOptions
        {
            ResponseWriter = HealthCheckResponseWriter.WriteJsonResponse
        };

        app.MapHealthChecks("/health/live", liveOptions);
        app.MapHealthChecks("/health/ready", readyOptions);
        app.MapHealthChecks("/health", readyOptions);

        return app;
    }
}
