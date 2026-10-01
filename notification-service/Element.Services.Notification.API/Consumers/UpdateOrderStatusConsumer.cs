using Element.Services.Notification.API.Webhooks;
using Element.Shared.Events;
using MassTransit;

namespace Element.Services.Notification.API.Consumers;

/// <summary>
/// Turns every order status change from the order saga into an "order.updated" webhook
/// delivered only to the webhooks registered by the order's own customer.
/// </summary>
public class UpdateOrderStatusConsumer : IConsumer<UpdateOrderStatusEvent>
{
    private const string OrderUpdatedEventName = "order.updated";

    private readonly WebhookFanout _webhooks;
    private readonly ILogger<UpdateOrderStatusConsumer> _logger;

    /// <summary>Creates the consumer with the webhook sender and a logger.</summary>
    public UpdateOrderStatusConsumer(
        WebhookFanout webhooks,
        ILogger<UpdateOrderStatusConsumer> logger)
    {
        _webhooks = webhooks;
        _logger = logger;
    }

    /// <summary>Sends the new order status to the customer's "order.updated" webhooks; skips events without a customer.</summary>
    public async Task Consume(ConsumeContext<UpdateOrderStatusEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation(
            "Received order status update for Order {OrderId}: {Status}",
            message.OrderId,
            message.Status);

        // Order details are private: without a known owner there is nobody we may send them to.
        // The web app polls its authenticated order endpoint instead.
        var customerId = message.CustomerId ?? Guid.Empty;
        if (customerId == Guid.Empty)
        {
            return;
        }

        var payload = new
        {
            OrderId = message.OrderId,
            Status = message.Status,
            ErrorMessage = message.ErrorMessage,
            TrackingNumber = message.TrackingNumber,
            // Inside the signed body (unix seconds): receivers reject stale/replayed deliveries.
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
        };

        await _webhooks.PublishAsync(OrderUpdatedEventName, payload, context.CancellationToken, customerId);
    }
}
