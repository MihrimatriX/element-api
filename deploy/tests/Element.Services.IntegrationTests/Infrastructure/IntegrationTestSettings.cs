using System.Text.Json;
using Npgsql;
using StackExchange.Redis;

namespace Element.Services.IntegrationTests.Infrastructure;

public static class IntegrationTestSettings
{
    public static string BuildPostgresConnection(IntegrationTestContainers containers, string database)
    {
        var builder = new NpgsqlConnectionStringBuilder(containers.Postgres.GetConnectionString())
        {
            Database = database
        };
        return builder.ConnectionString;
    }

    public static Action<Microsoft.AspNetCore.Hosting.IWebHostBuilder> RabbitMqSettings(IntegrationTestContainers containers) => builder =>
    {
        builder.UseSetting("RabbitMQ:Host", containers.RabbitHost);
        builder.UseSetting("RabbitMQ:Port", containers.RabbitPort.ToString());
        builder.UseSetting("RabbitMQ:Username", "guest");
        builder.UseSetting("RabbitMQ:Password", "guest");
    };

    public static Action<Microsoft.AspNetCore.Hosting.IWebHostBuilder> PaymentTestSettings(IntegrationTestContainers containers) => builder =>
    {
        RabbitMqSettings(containers)(builder);
        builder.UseSetting("Payment:DeterministicMode", "true");
        builder.UseSetting("Payment:SimulateDelaySeconds", "0");
    };

    /// <summary>
    /// Seeds Redis so Order can resolve catalog price via HTTP ticker.
    /// </summary>
    public static async Task SeedElementPriceCacheAsync(IntegrationTestContainers containers, string symbol, decimal pricePerGram)
    {
        var redis = await ConnectionMultiplexer.ConnectAsync(containers.RedisConnection);
        try
        {
            var payload = JsonSerializer.Serialize(new { pricePerGram });
            await redis.GetDatabase().StringSetAsync($"element:{symbol.ToLower()}", payload);
        }
        finally
        {
            await redis.CloseAsync();
            redis.Dispose();
        }
    }
}
