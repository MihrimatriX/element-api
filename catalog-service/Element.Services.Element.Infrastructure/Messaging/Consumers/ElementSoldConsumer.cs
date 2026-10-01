using Element.Services.Element.Core.Domain;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Messaging.Consumers;

/// <summary>
/// Reacts to a desk sale (a user selling grams back to the house) by nudging the element's
/// last price down. Price nudge only — restock lives in inventory-service.
/// </summary>
public class ElementSoldConsumer : IConsumer<ElementSoldEvent>
{
    private readonly ElementDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<ElementSoldConsumer> _logger;

    public ElementSoldConsumer(
        ElementDbContext context,
        IPublishEndpoint publishEndpoint,
        ILogger<ElementSoldConsumer> logger)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
    }

    /// <summary>Moves the price down once per sale message, records history and publishes the new price.</summary>
    public async Task Consume(ConsumeContext<ElementSoldEvent> context)
    {
        var message = context.Message;
        if (message.Grams <= 0)
        {
            return;
        }

        // The sale event has no id of its own, so the broker message id is the idempotency key.
        if (context.MessageId is not { } saleId)
        {
            return;
        }

        var alreadyPriced = await _context.StockReservations.AnyAsync(marker => marker.OrderId == saleId);
        if (alreadyPriced)
        {
            return;
        }

        var element = await _context.ChemicalElements
            .FirstOrDefaultAsync(e => e.Symbol.ToLower() == message.ElementSymbol.ToLower());
        if (element is null)
        {
            _logger.LogWarning("Element {Symbol} not found for desk-sell price nudge.", message.ElementSymbol);
            return;
        }

        var depth = Math.Max(element.StockWeightGrams, message.Grams);
        var newPrice = MarketMaker.NextLast(element.PricePerGram, message.Grams, depth, buy: false);
        element.PricePerGram = newPrice;

        _context.StockReservations.Add(new StockReservation
        {
            OrderId = saleId,
            ElementSymbol = message.ElementSymbol,
            Quantity = message.Grams,
            Status = StockReservationStatus.SoldPriced,
            CreatedAt = DateTime.UtcNow
        });
        _context.PriceHistories.Add(new ElementPriceHistory
        {
            Id = Guid.NewGuid(),
            ElementSymbol = element.Symbol,
            Price = newPrice,
            Timestamp = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        await _publishEndpoint.Publish(new ElementPriceChangedIntegrationEvent(element.Symbol, newPrice, DateTime.UtcNow));
        _logger.LogInformation("Last nudged down after desk sell {Symbol} {Grams}g", message.ElementSymbol, message.Grams);
    }
}
