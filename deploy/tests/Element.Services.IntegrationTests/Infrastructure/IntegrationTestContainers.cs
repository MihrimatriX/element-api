using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Networks;
using Npgsql;
using Testcontainers.PostgreSql;
using Testcontainers.RabbitMq;
using Testcontainers.Redis;

namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>
/// xUnit class fixture that starts throwaway Postgres, Redis and RabbitMQ containers (same images as
/// docker-compose.yml) and creates the service databases the tests use. Postgres and RabbitMQ also join
/// a private <see cref="Network"/>, so a containerised service under test reaches them by their compose
/// host names.
/// </summary>
public sealed class IntegrationTestContainers : IAsyncLifetime
{
    /// <summary>Postgres error code for "database already exists".</summary>
    private const string DuplicateDatabaseSqlState = "42P04";

    /// <summary>Host name of Postgres on <see cref="Network"/> (same as in docker-compose.yml).</summary>
    public const string PostgresAlias = "postgres";

    /// <summary>Host name of RabbitMQ on <see cref="Network"/> (same as in docker-compose.yml).</summary>
    public const string RabbitMqAlias = "rabbitmq";

    public IntegrationTestContainers()
    {
        Postgres = new PostgreSqlBuilder("postgres:16-alpine")
            .WithNetwork(Network)
            .WithNetworkAliases(PostgresAlias)
            .WithDatabase("element_test")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();

        RabbitMq = new RabbitMqBuilder("rabbitmq:3-management-alpine")
            .WithNetwork(Network)
            .WithNetworkAliases(RabbitMqAlias)
            .WithUsername("guest")
            .WithPassword("guest")
            .Build();
    }

    /// <summary>Docker network shared by Postgres, RabbitMQ and any service container a test starts.</summary>
    public INetwork Network { get; } = new NetworkBuilder().Build();

    public PostgreSqlContainer Postgres { get; }

    public RedisContainer Redis { get; } = new RedisBuilder("redis:7-alpine").Build();

    public RabbitMqContainer RabbitMq { get; }

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
            "element_shipment_db",
            "element_wallet_db");
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

    /// <summary>Stops and removes the containers and their network after the test class finishes.</summary>
    public async Task DisposeAsync()
    {
        await Postgres.DisposeAsync();
        await Redis.DisposeAsync();
        await RabbitMq.DisposeAsync();
        await Network.DisposeAsync();
    }

    /// <summary>StackExchange.Redis connection string for the mapped Redis port.</summary>
    public string RedisConnection =>
        $"127.0.0.1:{Redis.GetMappedPublicPort(6379)},abortConnect=false";

    /// <summary>Reachable from the test host (mapped port), not the in-network container id.</summary>
    public string RabbitHost => "127.0.0.1";

    /// <summary>Host port mapped to RabbitMQ's AMQP port 5672.</summary>
    public ushort RabbitPort => RabbitMq.GetMappedPublicPort(5672);
}
