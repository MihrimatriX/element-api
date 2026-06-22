using System;
using System.Threading.Tasks;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Messaging.Consumers;

public class OrderStockReleaseConsumer : IConsumer<OrderStockReleaseEvent>
{
    private readonly ElementDbContext _context;
    private readonly ILogger<OrderStockReleaseConsumer> _logger;

    public OrderStockReleaseConsumer(ElementDbContext context, ILogger<OrderStockReleaseConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderStockReleaseEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Releasing reserved stock for Order: {OrderId}, Element: {Element}, Qty: {Quantity}",
            message.OrderId, message.ElementSymbol, message.Quantity);

        var reservation = await _context.StockReservations.FindAsync(message.OrderId);
        if (reservation is null)
        {
            _logger.LogWarning("No reservation found for Order {OrderId} — nothing to release.", message.OrderId);
            return;
        }

        if (reservation.Status == "Released")
        {
            _logger.LogInformation("Idempotent stock release for Order {OrderId}", message.OrderId);
            return;
        }

        var element = await _context.ChemicalElements
            .FirstOrDefaultAsync(e => e.Symbol.ToLower() == message.ElementSymbol.ToLower());

        if (element != null)
        {
            element.ReservedWeightGrams = Math.Max(0, element.ReservedWeightGrams - message.Quantity);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Stock released successfully for Order: {OrderId}", message.OrderId);
        }
        else
        {
            _logger.LogWarning("Element {Symbol} not found for stock release.", message.ElementSymbol);
        }

        reservation.Status = "Released";
        await _context.SaveChangesAsync();
    }
}
