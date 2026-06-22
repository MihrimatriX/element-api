using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Npgsql;

namespace Element.Shared.Extensions;

public static class OpenTelemetryExtensions
{
    public static WebApplicationBuilder AddEnterpriseTracing(this WebApplicationBuilder builder, string serviceName)
    {
        var resourceBuilder = ResourceBuilder.CreateDefault().AddService(serviceName);

        builder.Services.AddOpenTelemetry()
            .WithTracing(tracerProviderBuilder =>
            {
                tracerProviderBuilder
                    .SetResourceBuilder(resourceBuilder)
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddNpgsql()
                    .AddSource("MassTransit");

                var endpoint = builder.Configuration["Otlp:Endpoint"];
                if (!string.IsNullOrWhiteSpace(endpoint))
                {
                    tracerProviderBuilder.AddOtlpExporter(opts =>
                        opts.Endpoint = new Uri(endpoint));
                }
            })
            .WithMetrics(metricsProviderBuilder =>
            {
                metricsProviderBuilder
                    .SetResourceBuilder(resourceBuilder)
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddPrometheusExporter();
            });

        return builder;
    }
}
