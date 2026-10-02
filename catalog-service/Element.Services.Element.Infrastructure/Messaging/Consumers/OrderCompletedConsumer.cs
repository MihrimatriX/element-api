using Element.Services.Element.Core.Domain;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Messaging.Consumers;

/// <summary>
/// Reacts to a completed order by nudging the element's last price up (buy pressure).
/// Price nudge only — stock fulfillment lives in inventory-service.
/// </summary>
public class OrderCompletedConsumer : IConsumer<OrderCompletedEvent>
{
    private readonly ElementDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<OrderCompletedConsumer> _logger;

    public OrderCompletedConsumer(
        ElementDbContext context,
        IPublishEndpoint publishEndpoint,
        ILogger<OrderCompletedConsumer> logger)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
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

        var marker = await _context.StockReservations.FindAsync(message.OrderId);
        var alreadyPriced = marker is not null
            && marker.Status is StockReservationStatus.Priced or StockReservationStatus.Fulfilled;
        if (alreadyPriced)
        {
            _logger.LogInformation("Idempotent price skip for Order {OrderId}", message.OrderId);
            return;
        }

        var element = await _context.ChemicalElements
            .FirstOrDefaultAsync(e => e.Symbol.ToLower() == message.ElementSymbol.ToLower());
        if (element is null)
        {
            _logger.LogWarning("Element {Symbol} not found for price nudge.", message.ElementSymbol);
            return;
        }

        var depth = Math.Max(element.StockWeightGrams, message.Quantity);
        var newPrice = MarketMaker.NextLast(element.PricePerGram, message.Quantity, depth, buy: true);
        element.PricePerGram = newPrice;

        if (marker is null)
        {
            _context.StockReservations.Add(new StockReservation
            {
                OrderId = message.OrderId,
                ElementSymbol = message.ElementSymbol,
                Quantity = message.Quantity,
                Status = StockReservationStatus.Priced,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            marker.Status = StockReservationStatus.Priced;
        }

        _context.PriceHistories.Add(new ElementPriceHistory
        {
            Id = Guid.NewGuid(),
            ElementSymbol = element.Symbol,
            Price = newPrice,
            Timestamp = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        await _publishEndpoint.Publish(new ElementPriceChangedIntegrationEvent(element.Symbol, newPrice, DateTime.UtcNow));
        _logger.LogInformation("Last nudged up after Order {OrderId}", message.OrderId);
    }
}
