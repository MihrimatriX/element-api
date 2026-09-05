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

public class OrderCompletedConsumer : IConsumer<OrderCompletedEvent>
{
    private readonly ElementDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<OrderCompletedConsumer> _logger;

    public OrderCompletedConsumer(
        ElementDbContext context,
        IPublishEndpoint publishEndpoint,
        IConnectionMultiplexer redis,
        ILogger<OrderCompletedConsumer> logger)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
        _redis = redis;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCompletedEvent> context)
    {
        var message = context.Message;
        await using var transaction = await StockTransaction.BeginAsync(_context, message.ElementSymbol);
        _logger.LogInformation("Confirming permanent stock deduction for Order: {OrderId}, Element: {Element}, Qty: {Quantity}",
            message.OrderId, message.ElementSymbol, message.Quantity);

        var reservation = await _context.StockReservations.FindAsync(message.OrderId);
        if (reservation is null || reservation.Status != "Reserved")
        {
            _logger.LogInformation("Idempotent completion for Order {OrderId}", message.OrderId);
            return;
        }

        var element = await _context.ChemicalElements
            .FirstOrDefaultAsync(e => e.Symbol.ToLower() == message.ElementSymbol.ToLower());

        if (element != null)
        {
            reservation.Status = "Fulfilled";
            var depth = Math.Max(element.StockWeightGrams, message.Quantity);
            var newPrice = MarketMaker.NextLast(element.PricePerGram, message.Quantity, depth, buy: true);
            element.StockWeightGrams = Math.Max(0, element.StockWeightGrams - message.Quantity);
            element.ReservedWeightGrams = Math.Max(0, element.ReservedWeightGrams - message.Quantity);
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
            _logger.LogInformation("Stock permanently deducted and last nudged up for Order: {OrderId}", message.OrderId);
        }
        else
        {
            _logger.LogWarning("Element {Symbol} not found for permanent stock deduction.", message.ElementSymbol);
        }

    }
}
