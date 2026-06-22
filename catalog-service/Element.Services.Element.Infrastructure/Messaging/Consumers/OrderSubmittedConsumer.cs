using System;
using System.Threading.Tasks;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Messaging.Consumers;

public class OrderSubmittedConsumer : IConsumer<OrderSubmittedEvent>
{
    private readonly ElementDbContext _context;
    private readonly ILogger<OrderSubmittedConsumer> _logger;

    public OrderSubmittedConsumer(ElementDbContext context, ILogger<OrderSubmittedConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderSubmittedEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Processing stock reservation for Order: {OrderId}, Element: {Element}, Qty: {Quantity}",
            message.OrderId, message.ElementSymbol, message.Quantity);

        var existing = await _context.StockReservations.FindAsync(message.OrderId);
        if (existing is not null)
        {
            if (existing.Status == "Reserved")
            {
                _logger.LogInformation("Idempotent replay for Order {OrderId} — republishing StockReservedEvent", message.OrderId);
                await context.Publish(new StockReservedEvent(message.OrderId));
            }
            return;
        }

        var element = await _context.ChemicalElements
            .FirstOrDefaultAsync(e => e.Symbol.ToLower() == message.ElementSymbol.ToLower());

        if (element == null)
        {
            _logger.LogWarning("Element {Symbol} not found. Stock reservation failed.", message.ElementSymbol);
            await context.Publish(new StockReservationFailedEvent(message.OrderId, $"Element '{message.ElementSymbol}' not found."));
            return;
        }

        if (element.AvailableStock < message.Quantity)
        {
            _logger.LogWarning("Insufficient stock for {Symbol}. Available: {Avail}, Requested: {Req}",
                message.ElementSymbol, element.AvailableStock, message.Quantity);
            await context.Publish(new StockReservationFailedEvent(message.OrderId, $"Insufficient stock. Available: {element.AvailableStock}g."));
            return;
        }

        element.ReservedWeightGrams += message.Quantity;
        _context.StockReservations.Add(new StockReservation
        {
            OrderId = message.OrderId,
            ElementSymbol = message.ElementSymbol,
            Quantity = message.Quantity,
            Status = "Reserved",
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        _logger.LogInformation("Stock reserved successfully for Order: {OrderId}", message.OrderId);
        await context.Publish(new StockReservedEvent(message.OrderId));
    }
}
