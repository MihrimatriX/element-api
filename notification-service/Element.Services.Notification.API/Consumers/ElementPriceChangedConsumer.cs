using Element.Shared.Events;
using Element.Services.Notification.API.Hubs;
using Element.Services.Notification.API.Webhooks;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Element.Services.Notification.API.Consumers;

public class ElementPriceChangedConsumer : IConsumer<ElementPriceChangedIntegrationEvent>
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly WebhookFanout _webhooks;
    private readonly ILogger<ElementPriceChangedConsumer> _logger;

    public ElementPriceChangedConsumer(
        IHubContext<NotificationHub> hubContext,
        WebhookFanout webhooks,
        ILogger<ElementPriceChangedConsumer> logger)
    {
        _hubContext = hubContext;
        _webhooks = webhooks;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ElementPriceChangedIntegrationEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Received price change for {Symbol}: {Price}", message.ElementSymbol, message.NewPrice);

        var payload = new
        {
            Symbol = message.ElementSymbol,
            Price = message.NewPrice,
            Timestamp = message.ChangedAt
        };
        await _hubContext.Clients.All.SendAsync("PriceUpdated", payload);
        await _webhooks.PublishAsync("price.updated", payload, context.CancellationToken);
    }
}
