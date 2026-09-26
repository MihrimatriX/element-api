using Npgsql;
using Testcontainers.PostgreSql;
using Testcontainers.RabbitMq;
using Testcontainers.Redis;

namespace Element.Services.IntegrationTests.Infrastructure;

public sealed class IntegrationTestContainers : IAsyncLifetime
{
    public PostgreSqlContainer Postgres { get; } = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("element_test")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    public RedisContainer Redis { get; } = new RedisBuilder("redis:7-alpine").Build();

    public RabbitMqContainer RabbitMq { get; } = new RabbitMqBuilder("rabbitmq:3-management-alpine")
        .WithUsername("guest")
        .WithPassword("guest")
        .Build();

    public async Task InitializeAsync()
    {
        await Postgres.StartAsync();
        await Redis.StartAsync();
        await RabbitMq.StartAsync();
        await EnsureDatabasesExistAsync(
            "element_identity_db",
            "element_identity_gw",
            "element_order_db",
            "element_market_db",
            "element_shipment_db");
    }

    private async Task EnsureDatabasesExistAsync(params string[] databases)
    {
        var master = Postgres.GetConnectionString();
        await using var conn = new NpgsqlConnection(master);
        await conn.OpenAsync();

        foreach (var db in databases)
        {
            await using var cmd = new NpgsqlCommand($"CREATE DATABASE \"{db}\"", conn);
            try
            {
                await cmd.ExecuteNonQueryAsync();
            }
            catch (PostgresException ex) when (ex.SqlState == "42P04")
            {
                // already exists
            }
        }
    }

    public async Task DisposeAsync()
    {
        await Postgres.DisposeAsync();
        await Redis.DisposeAsync();
        await RabbitMq.DisposeAsync();
    }

    public string RedisConnection =>
        $"127.0.0.1:{Redis.GetMappedPublicPort(6379)},abortConnect=false";

    /// <summary>Reachable from the test host (mapped port), not the in-network container id.</summary>
    public string RabbitHost => "127.0.0.1";

    public ushort RabbitPort => RabbitMq.GetMappedPublicPort(5672);
}
