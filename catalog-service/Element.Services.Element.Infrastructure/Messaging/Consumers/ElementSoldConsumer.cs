using System;
using System.Threading.Tasks;
using Element.Services.Element.Core.Domain;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Messaging.Consumers;

/// <summary>Price nudge only — restock lives in inventory-service.</summary>
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

    public async Task Consume(ConsumeContext<ElementSoldEvent> context)
    {
        var message = context.Message;
        if (message.Grams <= 0 || context.MessageId is not { } saleId) return;
        if (await _context.StockReservations.AnyAsync(r => r.OrderId == saleId)) return;

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
            Status = "SoldPriced",
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
        await _publishEndpoint.Publish(new ElementPriceChangedIntegrationEvent(
            element.Symbol, newPrice, DateTime.UtcNow));
        _logger.LogInformation("Last nudged down after desk sell {Symbol} {Grams}g", message.ElementSymbol, message.Grams);
    }
}
