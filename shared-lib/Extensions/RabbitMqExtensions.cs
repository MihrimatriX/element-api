using MassTransit;
using Microsoft.Extensions.Configuration;

namespace Element.Shared.Extensions;

public static class RabbitMqExtensions
{
    public static void ConfigureRabbitMqHost(this IRabbitMqBusFactoryConfigurator cfg, IConfiguration configuration)
    {
        var host = configuration["RabbitMQ:Host"] ?? "localhost";
        var port = ushort.TryParse(configuration["RabbitMQ:Port"], out var parsed) ? parsed : (ushort)5672;
        var user = configuration["RabbitMQ:Username"] ?? "guest";
        var pass = configuration["RabbitMQ:Password"] ?? "guest";

        cfg.Host(host, port, "/", h =>
        {
            h.Username(user);
            h.Password(pass);
        });
    }

    public static string GetRabbitMqConnectionUri(IConfiguration configuration)
    {
        var host = configuration["RabbitMQ:Host"] ?? "localhost";
        var port = configuration["RabbitMQ:Port"] ?? "5672";
        var user = configuration["RabbitMQ:Username"] ?? "guest";
        var pass = configuration["RabbitMQ:Password"] ?? "guest";
        return $"amqp://{user}:{pass}@{host}:{port}/";
    }
}
