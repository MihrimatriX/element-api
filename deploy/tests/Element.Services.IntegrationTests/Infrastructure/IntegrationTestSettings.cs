using Npgsql;

namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>
/// Shared configuration helpers that point services under test at the Testcontainers instances.
/// </summary>
public static class IntegrationTestSettings
{
    /// <summary>Connection string for <paramref name="database"/> on the shared Postgres container.</summary>
    public static string BuildPostgresConnection(IntegrationTestContainers containers, string database)
    {
        var builder = new NpgsqlConnectionStringBuilder(containers.Postgres.GetConnectionString())
        {
            Database = database
        };
        return builder.ConnectionString;
    }

    /// <summary>Web host settings that connect a .NET service to the RabbitMQ container.</summary>
    public static Action<Microsoft.AspNetCore.Hosting.IWebHostBuilder> RabbitMqSettings(IntegrationTestContainers containers) => builder =>
    {
        builder.UseSetting("RabbitMQ:Host", containers.RabbitHost);
        builder.UseSetting("RabbitMQ:Port", containers.RabbitPort.ToString());
        builder.UseSetting("RabbitMQ:Username", "guest");
        builder.UseSetting("RabbitMQ:Password", "guest");
    };
}
