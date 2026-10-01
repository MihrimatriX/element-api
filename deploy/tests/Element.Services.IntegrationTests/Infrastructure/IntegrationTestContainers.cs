using Npgsql;
using Testcontainers.PostgreSql;
using Testcontainers.RabbitMq;
using Testcontainers.Redis;

namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>
/// xUnit class fixture that starts throwaway Postgres, Redis and RabbitMQ containers (same images as
/// docker-compose.yml) and creates the service databases the tests use.
/// </summary>
public sealed class IntegrationTestContainers : IAsyncLifetime
{
    /// <summary>Postgres error code for "database already exists".</summary>
    private const string DuplicateDatabaseSqlState = "42P04";

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

    /// <summary>Starts the containers and creates the databases before the first test of the class runs.</summary>
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
        await using var connection = new NpgsqlConnection(Postgres.GetConnectionString());
        await connection.OpenAsync();

        foreach (var database in databases)
        {
            await using var command = new NpgsqlCommand($"CREATE DATABASE \"{database}\"", connection);
            try
            {
                await command.ExecuteNonQueryAsync();
            }
            catch (PostgresException ex) when (ex.SqlState == DuplicateDatabaseSqlState)
            {
                // Already there; creating databases is idempotent on purpose.
            }
        }
    }

    /// <summary>Stops and removes the containers after the test class finishes.</summary>
    public async Task DisposeAsync()
    {
        await Postgres.DisposeAsync();
        await Redis.DisposeAsync();
        await RabbitMq.DisposeAsync();
    }

    /// <summary>StackExchange.Redis connection string for the mapped Redis port.</summary>
    public string RedisConnection =>
        $"127.0.0.1:{Redis.GetMappedPublicPort(6379)},abortConnect=false";

    /// <summary>Reachable from the test host (mapped port), not the in-network container id.</summary>
    public string RabbitHost => "127.0.0.1";

    /// <summary>Host port mapped to RabbitMQ's AMQP port 5672.</summary>
    public ushort RabbitPort => RabbitMq.GetMappedPublicPort(5672);
}
