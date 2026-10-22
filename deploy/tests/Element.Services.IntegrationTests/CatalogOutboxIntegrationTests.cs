using System.Text.Json;
using Element.Services.Element.API.Controllers;
using Element.Services.Element.Core.Domain;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Services.IntegrationTests.Infrastructure;
using Element.Shared.Events;
using MassTransit;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Element.Services.IntegrationTests;

/// <summary>
/// catalog-service against real Postgres and RabbitMQ (ADR 0003): concurrent price nudges never lose an update,
/// a price change and its event commit or roll back together, a redelivered message moves the price once,
/// the database rejects a non-positive price, and the outbox migration can run again on an existing database.
/// </summary>
[Trait("Category", "Integration")]
public class CatalogOutboxIntegrationTests : IClassFixture<IntegrationTestContainers>
{
    private const string PriceChanged = nameof(ElementPriceChangedIntegrationEvent);
    private const string PriceChangedUrn = "urn:message:Element.Shared.Events:ElementPriceChangedIntegrationEvent";
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(60);

    private readonly IntegrationTestContainers _containers;

    public CatalogOutboxIntegrationTests(IntegrationTestContainers containers)
    {
        _containers = containers;
    }

    [Fact]
    public async Task ConcurrentCompletedOrders_EachMoveThePriceOnce_WithoutLostUpdates()
    {
        await using var app = await StartCatalogAsync();
        await using var spy = await BrokerSpy.ListenAsync(_containers, PriceChanged);
        var (startPrice, stock) = await ReadElementAsync("Au");
        const int orders = 12;
        const decimal grams = 5m;
        var orderIds = Enumerable.Range(0, orders).Select(_ => Guid.NewGuid()).ToList();

        // Every order arrives twice under different message ids (the saga retried): 24 concurrent deliveries.
        await Task.WhenAll(orderIds.Concat(orderIds).Select(orderId => BrokerSpy.PublishAsync(_containers,
            nameof(OrderCompletedEvent), new { orderId, elementSymbol = "Au", quantity = grams }, Guid.NewGuid())));

        var events = new List<JsonElement>();
        await BrokerSpy.UntilAsync(async () =>
        {
            events.AddRange(await spy.DrainAsync());
            return events.Count >= orders;
        }, Timeout, $"{orders} price events");
        await Task.Delay(TimeSpan.FromSeconds(3));
        events.AddRange(await spy.DrainAsync());

        var expected = startPrice;
        for (var i = 0; i < orders; i++)
        {
            expected = MarketMaker.NextLast(expected, grams, Math.Max(stock, grams), buy: true);
        }

        Assert.Equal(expected, (await ReadElementAsync("Au")).Price);
        Assert.Equal(orders, await CountAsync("""SELECT count(*) FROM "StockReservations" WHERE "OrderId" = ANY(@ids)""", orderIds.ToArray()));
        Assert.Equal(orders, events.Count);
        Assert.All(events, AssertMassTransitEnvelope);
    }

    [Fact]
    public async Task RedeliveredSale_SameMessageId_MovesThePriceOnce()
    {
        await using var app = await StartCatalogAsync();
        await using var spy = await BrokerSpy.ListenAsync(_containers, PriceChanged);
        var (startPrice, stock) = await ReadElementAsync("Ag");
        var messageId = Guid.NewGuid();
        var sale = new { elementSymbol = "Ag", grams = 3m, customerId = Guid.NewGuid() };

        await BrokerSpy.PublishAsync(_containers, nameof(ElementSoldEvent), sale, messageId);
        await BrokerSpy.PublishAsync(_containers, nameof(ElementSoldEvent), sale, messageId);

        var events = new List<JsonElement>();
        await BrokerSpy.UntilAsync(async () =>
        {
            events.AddRange(await spy.DrainAsync());
            return events.Count >= 1;
        }, Timeout, "the price event of the sale");
        await Task.Delay(TimeSpan.FromSeconds(3));
        events.AddRange(await spy.DrainAsync());

        Assert.Single(events);
        Assert.Equal(MarketMaker.NextLast(startPrice, 3m, Math.Max(stock, 3m), buy: false), (await ReadElementAsync("Ag")).Price);
        Assert.Equal(1, await CountAsync("""SELECT count(*) FROM "InboxState" WHERE "MessageId" = @id""", messageId));
    }

    [Fact]
    public async Task PriceChangeAndItsEvent_RollBackTogether_AndCommitTogether()
    {
        await using var app = await StartCatalogAsync();
        await using var spy = await BrokerSpy.ListenAsync(_containers, PriceChanged);
        var (startPrice, _) = await ReadElementAsync("Cu");

        // Rolled back: neither the price nor the outbox row survives, so nothing reaches the broker.
        await NudgeCopperAsync(app, commit: false);
        await Task.Delay(TimeSpan.FromSeconds(3));
        Assert.Equal(startPrice, (await ReadElementAsync("Cu")).Price);
        Assert.Empty(await spy.DrainAsync());

        // Committed: the price changes and the delivery service then publishes exactly that price.
        var newPrice = await NudgeCopperAsync(app, commit: true);
        Assert.Equal(newPrice, (await ReadElementAsync("Cu")).Price);
        var events = new List<JsonElement>();
        await BrokerSpy.UntilAsync(async () =>
        {
            events.AddRange(await spy.DrainAsync());
            return events.Count >= 1;
        }, Timeout, "the committed price event");
        var priceEvent = Assert.Single(events);
        AssertMassTransitEnvelope(priceEvent);
        // MassTransit's serializer writes decimals as JSON strings (StringDecimalJsonConverter), outbox or not.
        Assert.Equal(newPrice, decimal.Parse(priceEvent.GetProperty("message").GetProperty("newPrice").GetString()!,
            System.Globalization.CultureInfo.InvariantCulture));
    }

    [Fact]
    public async Task Database_RejectsANonPositivePrice_AndTheOutboxMigrationCanRunAgain()
    {
        await using (await StartCatalogAsync())
        {
        }

        var violation = await Assert.ThrowsAsync<PostgresException>(() =>
            ExecuteAsync("""UPDATE "ChemicalElements" SET "PricePerGram" = 0 WHERE "Symbol" = 'Fe'"""));
        Assert.Equal(PostgresErrorCodes.CheckViolation, violation.SqlState);

        // Pretend the migration never ran on this (already migrated) database: startup must still succeed.
        await ExecuteAsync("""DELETE FROM "__EFMigrationsHistory" WHERE "MigrationId" LIKE '%_AddMassTransitOutbox'""");
        await using (await StartCatalogAsync())
        {
        }

        Assert.Equal(1, await CountAsync("""SELECT count(*) FROM "__EFMigrationsHistory" WHERE "MigrationId" LIKE '%_AddMassTransitOutbox'"""));
    }

    /// <summary>The PriceSimulator path: lock, move, publish through the bus outbox, save, then commit or roll back.</summary>
    private static async Task<decimal> NudgeCopperAsync(WebApplicationFactory<ElementsController> app, bool commit)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ElementDbContext>();
        var publish = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();

        await using var transaction = await db.Database.BeginTransactionAsync();
        var copper = (await db.LockElementAsync("Cu"))!;
        var point = copper.RecordTrade(10m, buy: true, DateTime.UtcNow);
        db.PriceHistories.Add(point);
        await publish.Publish(new ElementPriceChangedIntegrationEvent(copper.Symbol, point.Price, point.Timestamp));
        await db.SaveChangesAsync();

        if (commit)
        {
            await transaction.CommitAsync();
        }
        else
        {
            await transaction.RollbackAsync();
        }

        return point.Price;
    }

    /// <summary>What the Java and Node consumers read: messageId and the URN in messageType[0].</summary>
    private static void AssertMassTransitEnvelope(JsonElement envelope)
    {
        Assert.True(Guid.TryParse(envelope.GetProperty("messageId").GetString(), out _));
        Assert.Equal(PriceChangedUrn, envelope.GetProperty("messageType")[0].GetString());
    }

    private async Task<WebApplicationFactory<ElementsController>> StartCatalogAsync()
    {
        var factory = new WebApplicationFactory<ElementsController>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("ConnectionStrings:DefaultConnection", ConnectionString);
                builder.UseSetting("PriceSimulator:Enabled", "false");
                IntegrationTestSettings.RabbitMqSettings(_containers)(builder);
            });

        // Ready = Postgres reachable and the receive endpoints bound; publishing earlier could lose messages.
        var client = factory.CreateClient();
        await BrokerSpy.UntilAsync(async () => (await client.GetAsync("/health/ready")).IsSuccessStatusCode,
            Timeout, "catalog /health/ready");
        return factory;
    }

    private string ConnectionString => IntegrationTestSettings.BuildPostgresConnection(_containers, "element_market_db");

    private async Task<(decimal Price, decimal Stock)> ReadElementAsync(string symbol)
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """SELECT "PricePerGram", "StockWeightGrams" FROM "ChemicalElements" WHERE "Symbol" = @symbol""", connection);
        command.Parameters.AddWithValue("symbol", symbol);
        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();
        return (reader.GetDecimal(0), reader.GetDecimal(1));
    }

    private async Task<long> CountAsync(string sql, object? parameter = null)
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        if (parameter is not null)
        {
            command.Parameters.AddWithValue(parameter is Guid[] ? "ids" : "id", parameter);
        }

        return (long)(await command.ExecuteScalarAsync())!;
    }

    private async Task ExecuteAsync(string sql)
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }
}
