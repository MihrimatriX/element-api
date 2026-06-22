using Element.Shared.Events;
using Element.Services.Notification.API.Hubs;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Element.Services.Notification.API.Consumers;

public class UpdateOrderStatusConsumer : IConsumer<UpdateOrderStatusEvent>
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<UpdateOrderStatusConsumer> _logger;

    public UpdateOrderStatusConsumer(IHubContext<NotificationHub> hubContext, ILogger<UpdateOrderStatusConsumer> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<UpdateOrderStatusEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Received order status update for Order {OrderId}: {Status}", message.OrderId, message.Status);

        // In a real system, you'd send this to the specific user. 
        // Here we broadcast for simplicity, or we can use groups (e.g. Group(userId))
        await _hubContext.Clients.All.SendAsync("OrderStatusUpdated", new
        {
            OrderId = message.OrderId,
            Status = message.Status,
            ErrorMessage = message.ErrorMessage
        });
    }
}
