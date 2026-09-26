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
        await using var transaction = await StockTransaction.BeginAsync(_context, message.ElementSymbol);
        _logger.LogInformation("Releasing reserved stock for Order: {OrderId}, Element: {Element}, Qty: {Quantity}",
            message.OrderId, message.ElementSymbol, message.Quantity);

        var reservation = await _context.StockReservations.FindAsync(message.OrderId);
        if (reservation is null)
        {
            // A release can arrive before a delayed reservation. Keep a cancellation marker.
            _context.StockReservations.Add(new Core.Entities.StockReservation {
                OrderId = message.OrderId, ElementSymbol = message.ElementSymbol,
                Quantity = message.Quantity, Status = "Released", CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();
            return;
        }

        if (reservation.Status != "Reserved")
        {
            _logger.LogInformation("Idempotent stock release for Order {OrderId}", message.OrderId);
            return;
        }

        var element = await _context.ChemicalElements
            .FirstOrDefaultAsync(e => e.Symbol.ToLower() == message.ElementSymbol.ToLower());

        if (element != null)
        {
            element.ReservedWeightGrams = Math.Max(0, element.ReservedWeightGrams - message.Quantity);
            _logger.LogInformation("Stock released successfully for Order: {OrderId}", message.OrderId);
        }
        else
        {
            _logger.LogWarning("Element {Symbol} not found for stock release.", message.ElementSymbol);
        }

        reservation.Status = "Released";
        await _context.SaveChangesAsync();
        if (transaction != null) await transaction.CommitAsync();
    }
}
