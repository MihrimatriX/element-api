using Microsoft.AspNetCore.Builder;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;

namespace Element.Shared.Extensions;

/// <summary>Uniform JSON console logging so every .NET service produces the same log shape.</summary>
public static class LoggingExtensions
{
    /// <summary>
    /// Validates production secrets, then replaces the default logger with Serilog writing compact JSON to the console,
    /// tagged with the application name and environment.
    /// </summary>
    public static WebApplicationBuilder AddConsoleLogging(this WebApplicationBuilder builder, string applicationName)
    {
        builder.ValidateProductionConfiguration();

        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
            .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
            .MinimumLevel.Override("System", LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Application", applicationName)
            .Enrich.WithProperty("service", applicationName)
            .Enrich.WithEnvironmentName()
            .WriteTo.Console(new CompactJsonFormatter())
            .CreateLogger();

        builder.Host.UseSerilog();

        return builder;
    }

    /// <summary>Logs one summary line per HTTP request (method, path, status, duration).</summary>
    public static WebApplication UseRequestLogging(this WebApplication app)
    {
        app.UseSerilogRequestLogging(options =>
        {
            options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        });

        return app;
    }
}
