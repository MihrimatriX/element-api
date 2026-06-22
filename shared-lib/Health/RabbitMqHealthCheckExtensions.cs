using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using RabbitMQ.Client;

namespace Element.Shared.Health;

public static class RabbitMqHealthCheckExtensions
{
    public static IHealthChecksBuilder AddElementRabbitMqHealthCheck(
        this IHealthChecksBuilder builder,
        IConfiguration configuration,
        string name = "RabbitMQ")
    {
        var uri = Extensions.RabbitMqExtensions.GetRabbitMqConnectionUri(configuration);

        return builder.AddAsyncCheck(name, async cancellationToken =>
        {
            try
            {
                var factory = new ConnectionFactory { Uri = new Uri(uri) };
                await using var connection = await factory.CreateConnectionAsync(cancellationToken);
                return connection.IsOpen
                    ? HealthCheckResult.Healthy("RabbitMQ connection is open.")
                    : HealthCheckResult.Unhealthy("RabbitMQ connection is not open.");
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy("RabbitMQ is unreachable.", ex);
            }
        });
    }
}
