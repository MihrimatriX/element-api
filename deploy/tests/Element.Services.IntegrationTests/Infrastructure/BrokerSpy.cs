using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>
/// Raw RabbitMQ access for outbox tests: captures what a .NET service published exactly as the Java and Node
/// consumers receive it (the MassTransit JSON envelope), and publishes envelopes with a chosen message id so a
/// test can play a broker redelivery.
/// </summary>
public sealed class BrokerSpy : IAsyncDisposable
{
    private const string EventNamespace = "Element.Shared.Events:";
    private const string MassTransitContentType = "application/vnd.masstransit+json";

    private readonly IConnection _connection;
    private readonly IChannel _channel;
    private readonly string _queue;

    private BrokerSpy(IConnection connection, IChannel channel, string queue)
    {
        _connection = connection;
        _channel = channel;
        _queue = queue;
    }

    /// <summary>Binds a private queue to the fanout exchange of <paramref name="typeName"/>; bind before the service publishes.</summary>
    public static async Task<BrokerSpy> ListenAsync(IntegrationTestContainers containers, string typeName)
    {
        var connection = await CreateFactory(containers).CreateConnectionAsync();
        var channel = await connection.CreateChannelAsync();
        var exchange = EventNamespace + typeName;
        await channel.ExchangeDeclareAsync(exchange, ExchangeType.Fanout, durable: true);
        var queue = await channel.QueueDeclareAsync();
        await channel.QueueBindAsync(queue.QueueName, exchange, string.Empty);
        return new BrokerSpy(connection, channel, queue.QueueName);
    }

    /// <summary>Takes every message waiting in the spy queue, parsed as MassTransit envelopes.</summary>
    public async Task<List<JsonElement>> DrainAsync()
    {
        var envelopes = new List<JsonElement>();
        while (await _channel.BasicGetAsync(_queue, autoAck: true) is { } delivery)
        {
            envelopes.Add(JsonDocument.Parse(delivery.Body).RootElement.Clone());
        }

        return envelopes;
    }

    /// <summary>Publishes <paramref name="message"/> in a MassTransit envelope that carries <paramref name="messageId"/>.</summary>
    public static async Task PublishAsync(IntegrationTestContainers containers, string typeName, object message, Guid messageId)
    {
        await using var connection = await CreateFactory(containers).CreateConnectionAsync();
        await using var channel = await connection.CreateChannelAsync();
        var exchange = EventNamespace + typeName;
        await channel.ExchangeDeclareAsync(exchange, ExchangeType.Fanout, durable: true);

        var messageTypeUrn = $"urn:message:{EventNamespace}{typeName}";
        var envelope = new { messageId, conversationId = Guid.NewGuid(), messageType = new[] { messageTypeUrn }, message };
        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(envelope, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }));
        var properties = new BasicProperties
        {
            MessageId = messageId.ToString(),
            ContentType = MassTransitContentType,
            Headers = new Dictionary<string, object?> { ["MT-Message-Type"] = messageTypeUrn },
        };

        await channel.BasicPublishAsync(exchange, string.Empty, false, properties, body);
    }

    /// <summary>Polls <paramref name="condition"/> every 250 ms until it holds; fails the test with <paramref name="what"/> on timeout.</summary>
    public static async Task UntilAsync(Func<Task<bool>> condition, TimeSpan timeout, string what)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            if (await condition())
            {
                return;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(250));
        }

        Assert.Fail($"Timed out after {timeout.TotalSeconds}s waiting for: {what}");
    }

    public async ValueTask DisposeAsync()
    {
        await _channel.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private static ConnectionFactory CreateFactory(IntegrationTestContainers containers) => new()
    {
        HostName = containers.RabbitHost,
        Port = containers.RabbitPort,
        UserName = "guest",
        Password = "guest",
    };
}
