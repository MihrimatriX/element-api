using MassTransit;
using Microsoft.Extensions.Configuration;

namespace Element.Shared.Extensions;

/// <summary>Reads the <c>RabbitMQ:*</c> settings the same way for every MassTransit bus.</summary>
public static class RabbitMqExtensions
{
    private const string DefaultHost = "localhost";
    private const ushort DefaultPort = 5672;
    private const string DefaultCredential = "guest";

    /// <summary>Points a MassTransit RabbitMQ bus at the configured host, port and credentials (defaults: localhost:5672, guest/guest).</summary>
    public static void ConfigureRabbitMqHost(this IRabbitMqBusFactoryConfigurator cfg, IConfiguration configuration)
    {
        var host = configuration["RabbitMQ:Host"] ?? DefaultHost;
        var port = ushort.TryParse(configuration["RabbitMQ:Port"], out var parsedPort) ? parsedPort : DefaultPort;
        var username = configuration["RabbitMQ:Username"] ?? DefaultCredential;
        var password = configuration["RabbitMQ:Password"] ?? DefaultCredential;

        cfg.Host(host, port, "/", hostConfigurator =>
        {
            hostConfigurator.Username(username);
            hostConfigurator.Password(password);
        });
    }
}
