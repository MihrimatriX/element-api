using Element.Shared.Events;
using Element.Services.Notification.API.Webhooks;
using MassTransit;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Element.Services.Notification.API.Consumers;

public class UpdateOrderStatusConsumer : IConsumer<UpdateOrderStatusEvent>
{
    private readonly WebhookFanout _webhooks;
    private readonly ILogger<UpdateOrderStatusConsumer> _logger;

    public UpdateOrderStatusConsumer(
        WebhookFanout webhooks,
        ILogger<UpdateOrderStatusConsumer> logger)
    {
        _webhooks = webhooks;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<UpdateOrderStatusEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Received order status update for Order {OrderId}: {Status}", message.OrderId, message.Status);

        var payload = new
        {
            OrderId = message.OrderId,
            Status = message.Status,
            ErrorMessage = message.ErrorMessage,
            TrackingNumber = message.TrackingNumber
        };
        // Order details are private. The web app polls its authenticated order endpoint.
        if (message.CustomerId is { } customerId && customerId != System.Guid.Empty)
            await _webhooks.PublishAsync("order.updated", payload, context.CancellationToken, customerId);
    }
}
