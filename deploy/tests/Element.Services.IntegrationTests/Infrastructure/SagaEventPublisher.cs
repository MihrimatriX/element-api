using System.Text;
using System.Text.Json;
using Element.Shared.Events;
using RabbitMQ.Client;

namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>
/// Publishes MassTransit-compatible integration events for saga integration tests.
/// </summary>
public static class SagaEventPublisher
{
    private const string Ns = "Element.Shared.Events:";

    public static async Task PublishAsync(IntegrationTestContainers containers, string typeName, object message)
    {
        var factory = new ConnectionFactory
        {
            HostName = containers.RabbitHost,
            Port = containers.RabbitPort,
            UserName = "guest",
            Password = "guest"
        };

        await using var connection = await factory.CreateConnectionAsync();
        await using var channel = await connection.CreateChannelAsync();

        var exchange = Ns + typeName;
        await channel.ExchangeDeclareAsync(exchange, ExchangeType.Fanout, durable: true);

        var envelope = new
        {
            messageId = Guid.NewGuid(),
            conversationId = Guid.NewGuid(),
            messageType = new[] { $"urn:message:{Ns}{typeName}" },
            message
        };

        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(envelope, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }));

        var props = new BasicProperties
        {
            Headers = new Dictionary<string, object?>
            {
                ["MT-Message-Type"] = $"urn:message:{Ns}{typeName}",
                ["Content-Type"] = "application/vnd.masstransit+json"
            },
            ContentType = "application/vnd.masstransit+json"
        };

        await channel.BasicPublishAsync(exchange, string.Empty, false, props, body);
    }

    public static Task PublishStockReservedAsync(IntegrationTestContainers containers, Guid orderId) =>
        PublishAsync(containers, nameof(StockReservedEvent), new { orderId });

    public static Task PublishPaymentProcessedAsync(IntegrationTestContainers containers, Guid orderId) =>
        PublishAsync(containers, nameof(PaymentProcessedEvent), new { orderId });

    public static Task PublishShipmentDispatchedAsync(IntegrationTestContainers containers, Guid orderId) =>
        PublishAsync(containers, nameof(ShipmentDispatchedEvent), new { orderId, trackingNumber = "INT-TEST-TRK" });
}
