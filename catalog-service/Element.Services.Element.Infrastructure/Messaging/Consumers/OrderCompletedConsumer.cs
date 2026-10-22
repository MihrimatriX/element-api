using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Messaging.Consumers;

/// <summary>
/// Reacts to a completed order by nudging the element's last price up (buy pressure).
/// Price nudge only — stock fulfillment lives in inventory-service.
/// Runs inside MassTransit's EF Core inbox/outbox: one transaction holds the inbox row, the price change,
/// the marker, the history point and the outgoing event, and commits them together.
/// </summary>
public class OrderCompletedConsumer : IConsumer<OrderCompletedEvent>
{
    private readonly ElementDbContext _context;
    private readonly ILogger<OrderCompletedConsumer> _logger;

    public OrderCompletedConsumer(ElementDbContext context, ILogger<OrderCompletedConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>Moves the price up once per order, records history and publishes the new price.</summary>
    public async Task Consume(ConsumeContext<OrderCompletedEvent> context)
    {
        var message = context.Message;
        if (message.Quantity <= 0)
        {
            return;
        }

        // Element row first: a second delivery for the same order waits here, then sees the first one's marker.
        var element = await _context.LockElementAsync(message.ElementSymbol, context.CancellationToken);
        if (element is null)
        {
            _logger.LogWarning("Element {Symbol} not found for price nudge.", message.ElementSymbol);
            return;
        }

        var marker = await _context.StockReservations.FindAsync([message.OrderId], context.CancellationToken);
        if (marker is { IsPriced: true })
        {
            _logger.LogInformation("Idempotent price skip for Order {OrderId}", message.OrderId);
            return;
        }

        var now = DateTime.UtcNow;
        _context.PriceHistories.Add(element.RecordTrade(message.Quantity, buy: true, now));
        if (marker is null)
        {
            _context.StockReservations.Add(StockReservation.ForCompletedOrder(message.OrderId, element.Symbol, message.Quantity, now));
        }
        else
        {
            marker.MarkPriced();
        }

        await context.Publish(new ElementPriceChangedIntegrationEvent(element.Symbol, element.PricePerGram, now));
        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("Last nudged up after Order {OrderId}", message.OrderId);
    }
}
