using System;
using System.Threading.Tasks;
using Element.Services.Element.Core.Domain;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Services.Element.Infrastructure.Services;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Element.Services.Element.Infrastructure.Messaging.Consumers;

public class ElementSoldConsumer : IConsumer<ElementSoldEvent>
{
    private readonly ElementDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<ElementSoldConsumer> _logger;

    public ElementSoldConsumer(
        ElementDbContext context,
        IPublishEndpoint publishEndpoint,
        IConnectionMultiplexer redis,
        ILogger<ElementSoldConsumer> logger)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
        _redis = redis;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ElementSoldEvent> context)
    {
        var message = context.Message;
        if (message.Grams <= 0 || context.MessageId is not { } saleId) return;
        await using var transaction = await StockTransaction.BeginAsync(_context, message.ElementSymbol);
        if (await _context.StockReservations.AnyAsync(r => r.OrderId == saleId)) return;
        _logger.LogInformation("Desk sell restock {Symbol} {Grams}g customer {Customer}",
            message.ElementSymbol, message.Grams, message.CustomerId);

        var element = await _context.ChemicalElements
            .FirstOrDefaultAsync(e => e.Symbol.ToLower() == message.ElementSymbol.ToLower());
        if (element == null)
        {
            _logger.LogWarning("Element {Symbol} not found for desk sell.", message.ElementSymbol);
            return;
        }

        var depth = Math.Max(element.StockWeightGrams, message.Grams);
        var newPrice = MarketMaker.NextLast(element.PricePerGram, message.Grams, depth, buy: false);
        element.StockWeightGrams += message.Grams;
        _context.StockReservations.Add(new StockReservation {
            OrderId = saleId, ElementSymbol = message.ElementSymbol, Quantity = message.Grams,
            Status = "Sold", CreatedAt = DateTime.UtcNow
        });
        element.PricePerGram = newPrice;
        _context.PriceHistories.Add(new ElementPriceHistory
        {
            Id = Guid.NewGuid(),
            ElementSymbol = element.Symbol,
            Price = newPrice,
            Timestamp = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        if (transaction != null) await transaction.CommitAsync();
        await CatalogCache.EvictElementAsync(_redis, element.Symbol);
        await _publishEndpoint.Publish(new ElementPriceChangedIntegrationEvent(
            element.Symbol, newPrice, DateTime.UtcNow));
    }
}
