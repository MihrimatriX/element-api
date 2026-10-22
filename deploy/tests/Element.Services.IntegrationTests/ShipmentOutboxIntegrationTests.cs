using System.Text.Json;
using Element.Services.IntegrationTests.Infrastructure;
using Element.Services.Shipment.API;
using Element.Shared.Events;
using Microsoft.AspNetCore.Mvc.Testing;
using Npgsql;

namespace Element.Services.IntegrationTests;

/// <summary>
/// shipment-service against real Postgres and RabbitMQ (ADR 0003): concurrent and redelivered requests for one
/// order open exactly one shipment and every reply carries its tracking number; the database refuses a shipped
/// row without a tracking number.
/// </summary>
[Trait("Category", "Integration")]
public class ShipmentOutboxIntegrationTests : IClassFixture<IntegrationTestContainers>
{
    private const string DispatchedUrn = "urn:message:Element.Shared.Events:ShipmentDispatchedEvent";
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(90);

    private readonly IntegrationTestContainers _containers;

    public ShipmentOutboxIntegrationTests(IntegrationTestContainers containers)
    {
        _containers = containers;
    }

    [Fact]
    public async Task ConcurrentAndRedeliveredRequests_OpenOneShipment_AndEveryReplyHasItsTrackingNumber()
    {
        await using var app = await StartShipmentAsync();
        await using var spy = await BrokerSpy.ListenAsync(_containers, nameof(ShipmentDispatchedEvent));
        var orderId = Guid.NewGuid();
        var request = new { orderId, customerId = Guid.NewGuid().ToString(), elementSymbol = "Au", quantity = 2m };
        var messageIds = Enumerable.Range(0, 5).Select(_ => Guid.NewGuid()).ToList();

        // Five saga retries (new message ids) race each other, and the first one is also redelivered by the broker.
        await Task.WhenAll(messageIds.Append(messageIds[0]).Select(messageId =>
            BrokerSpy.PublishAsync(_containers, nameof(ShipmentRequestedEvent), request, messageId)));

        var replies = new List<JsonElement>();
        await BrokerSpy.UntilAsync(async () =>
        {
            replies.AddRange(await spy.DrainAsync());
            return replies.Count >= messageIds.Count;
        }, Timeout, "one reply per distinct request message");
        await Task.Delay(TimeSpan.FromSeconds(3));
        replies.AddRange(await spy.DrainAsync());

        var stored = await ReadTrackingNumbersAsync(orderId);
        var trackingNumber = Assert.Single(stored);
        Assert.Equal(messageIds.Count, replies.Count);
        Assert.All(replies, reply =>
        {
            Assert.Equal(DispatchedUrn, reply.GetProperty("messageType")[0].GetString());
            Assert.True(Guid.TryParse(reply.GetProperty("messageId").GetString(), out _));
            Assert.Equal(trackingNumber, reply.GetProperty("message").GetProperty("trackingNumber").GetString());
        });
    }

    [Fact]
    public async Task Database_RejectsAShippedRowWithoutTrackingNumber()
    {
        await using (await StartShipmentAsync())
        {
        }

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("""
            INSERT INTO "Shipments" ("Id", "OrderId", "CustomerId", "ElementSymbol", "Quantity", "Status", "CreatedAt")
            VALUES (gen_random_uuid(), gen_random_uuid(), 'c', 'Au', 1, 'Shipped', now())
            """, connection);

        var violation = await Assert.ThrowsAsync<PostgresException>(() => command.ExecuteNonQueryAsync());
        Assert.Equal(PostgresErrorCodes.CheckViolation, violation.SqlState);
    }

    private string ConnectionString => IntegrationTestSettings.BuildPostgresConnection(_containers, "element_shipment_db");

    private async Task<WebApplicationFactory<ShipmentApiMarker>> StartShipmentAsync()
    {
        var factory = new WebApplicationFactory<ShipmentApiMarker>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("ConnectionStrings:DefaultConnection", ConnectionString);
                IntegrationTestSettings.RabbitMqSettings(_containers)(builder);
            });

        var client = factory.CreateClient();
        await BrokerSpy.UntilAsync(async () => (await client.GetAsync("/health/ready")).IsSuccessStatusCode,
            Timeout, "shipment /health/ready");
        return factory;
    }

    private async Task<List<string>> ReadTrackingNumbersAsync(Guid orderId)
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """SELECT "TrackingNumber" FROM "Shipments" WHERE "OrderId" = @id""", connection);
        command.Parameters.AddWithValue("id", orderId);
        var numbers = new List<string>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            numbers.Add(reader.GetString(0));
        }

        return numbers;
    }
}
