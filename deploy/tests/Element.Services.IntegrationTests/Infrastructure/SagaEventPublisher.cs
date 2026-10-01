using System.Text;
using System.Text.Json;
using Element.Shared.Events;
using RabbitMQ.Client;

namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>
/// Publishes MassTransit-compatible integration events for saga integration tests, so a test can
/// play the role of a service that is not running (for example the payment worker).
/// </summary>
public static class SagaEventPublisher
{
    /// <summary>MassTransit message-type namespace shared by every service (see shared-lib/Events).</summary>
    private const string EventNamespace = "Element.Shared.Events:";
    private const string MassTransitContentType = "application/vnd.masstransit+json";

    /// <summary>
    /// Publishes <paramref name="message"/> to the fanout exchange MassTransit uses for
    /// <paramref name="typeName"/>, wrapped in a MassTransit envelope.
    /// </summary>
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

        var exchange = EventNamespace + typeName;
        await channel.ExchangeDeclareAsync(exchange, ExchangeType.Fanout, durable: true);

        var messageTypeUrn = $"urn:message:{EventNamespace}{typeName}";
        var envelope = new
        {
            messageId = Guid.NewGuid(),
            conversationId = Guid.NewGuid(),
            messageType = new[] { messageTypeUrn },
            message
        };

        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(envelope, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }));

        var properties = new BasicProperties
        {
            Headers = new Dictionary<string, object?>
            {
                ["MT-Message-Type"] = messageTypeUrn,
                ["Content-Type"] = MassTransitContentType
            },
            ContentType = MassTransitContentType
        };

        await channel.BasicPublishAsync(exchange, string.Empty, false, properties, body);
    }

    /// <summary>Simulates the wallet/payment side confirming payment for an order.</summary>
    public static Task PublishPaymentProcessedAsync(IntegrationTestContainers containers, Guid orderId) =>
        PublishAsync(containers, nameof(PaymentProcessedEvent), new { orderId });
}
