using System.Reflection;
using Element.Shared.Health;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;

namespace Element.Shared.Extensions;

/// <summary>The ops endpoints (/info and /health*) that every .NET service exposes in the same shape.</summary>
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
        var environmentName = app.Environment.EnvironmentName;

        app.MapGet("/info", () => Results.Ok(new
        {
            name = serviceName,
            version,
            environment = environmentName,
            links = links ?? new Dictionary<string, string>(),
        }))
        .WithName("ServiceInfo")
        .WithTags("Ops");

        // Liveness runs no checks: it only proves the process answers HTTP.
        var livenessOptions = new HealthCheckOptions
        {
            Predicate = _ => false,
            ResponseWriter = HealthCheckResponseWriter.WriteJsonResponse,
        };
        // Readiness runs every registered check (database, Redis, RabbitMQ ...).
        var readinessOptions = new HealthCheckOptions
        {
            ResponseWriter = HealthCheckResponseWriter.WriteJsonResponse,
        };

        app.MapHealthChecks("/health/live", livenessOptions);
        app.MapHealthChecks("/health/ready", readinessOptions);
        app.MapHealthChecks("/health", readinessOptions);

        return app;
    }
}
