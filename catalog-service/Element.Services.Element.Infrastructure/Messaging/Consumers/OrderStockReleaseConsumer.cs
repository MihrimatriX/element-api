using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Messaging.Consumers;

/// <summary>
/// Legacy stock-release handler: gives reserved grams back when an order is cancelled.
/// Not registered in Program.cs — inventory-service owns stock now; kept as the counterpart
/// of <see cref="OrderSubmittedConsumer"/>.
/// </summary>
public class OrderStockReleaseConsumer : IConsumer<OrderStockReleaseEvent>
{
    private readonly ElementDbContext _context;
    private readonly ILogger<OrderStockReleaseConsumer> _logger;

    public OrderStockReleaseConsumer(ElementDbContext context, ILogger<OrderStockReleaseConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>Releases the order's reserved grams exactly once, under the per-symbol stock lock.</summary>
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
            _context.StockReservations.Add(new StockReservation
            {
                OrderId = message.OrderId,
                ElementSymbol = message.ElementSymbol,
                Quantity = message.Quantity,
                Status = StockReservationStatus.Released,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            await StockTransaction.CommitAsync(transaction);
            return;
        }

        if (reservation.Status != StockReservationStatus.Reserved)
        {
            _logger.LogInformation("Idempotent stock release for Order {OrderId}", message.OrderId);
            return;
        }

        var element = await _context.ChemicalElements
            .FirstOrDefaultAsync(e => e.Symbol.ToLower() == message.ElementSymbol.ToLower());

        if (element is null)
        {
            _logger.LogWarning("Element {Symbol} not found for stock release.", message.ElementSymbol);
        }
        else
        {
            element.ReservedWeightGrams = Math.Max(0, element.ReservedWeightGrams - message.Quantity);
            _logger.LogInformation("Stock released successfully for Order: {OrderId}", message.OrderId);
        }

        reservation.Status = StockReservationStatus.Released;
        await _context.SaveChangesAsync();
        await StockTransaction.CommitAsync(transaction);
    }
}
