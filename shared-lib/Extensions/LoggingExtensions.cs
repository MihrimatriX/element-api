using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;

namespace Element.Shared.Extensions;

public static class LoggingExtensions
{
    public static WebApplicationBuilder AddEnterpriseLogging(this WebApplicationBuilder builder, string applicationName)
    {
        var loggerConfig = new LoggerConfiguration()
            .MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
            .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
            .MinimumLevel.Override("System", LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Application", applicationName)
            .Enrich.WithProperty("service", applicationName)
            .Enrich.WithEnvironmentName()
            .WriteTo.Console(new CompactJsonFormatter());

        var seqUrl = builder.Configuration["Seq:Url"];
        if (!string.IsNullOrWhiteSpace(seqUrl))
            loggerConfig.WriteTo.Seq(seqUrl);

        var logstashUrl = builder.Configuration["Logstash:Url"];
        if (!string.IsNullOrWhiteSpace(logstashUrl))
        {
            loggerConfig.WriteTo.Http(
                requestUri: logstashUrl,
                queueLimitBytes: null,
                textFormatter: new CompactJsonFormatter());
        }

        Log.Logger = loggerConfig.CreateLogger();

        builder.Host.UseSerilog();

        return builder;
    }

    public static WebApplication UseEnterpriseLogging(this WebApplication app)
    {
        app.UseSerilogRequestLogging(options =>
        {
            options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        });

        return app;
    }
}
