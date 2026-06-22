using Element.Shared.Events;
using Element.Services.Notification.API.Hubs;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Element.Services.Notification.API.Consumers;

public class ElementPriceChangedConsumer : IConsumer<ElementPriceChangedIntegrationEvent>
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<ElementPriceChangedConsumer> _logger;

    public ElementPriceChangedConsumer(IHubContext<NotificationHub> hubContext, ILogger<ElementPriceChangedConsumer> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ElementPriceChangedIntegrationEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Received price change for {Symbol}: {Price}", message.ElementSymbol, message.NewPrice);

        // Broadcast to all clients
        await _hubContext.Clients.All.SendAsync("PriceUpdated", new
        {
            Symbol = message.ElementSymbol,
            Price = message.NewPrice,
            Timestamp = message.ChangedAt
        });
    }
}
