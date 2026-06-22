using System;
using System.Threading.Tasks;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Messaging.Consumers;

public class OrderCompletedConsumer : IConsumer<OrderCompletedEvent>
{
    private readonly ElementDbContext _context;
    private readonly ILogger<OrderCompletedConsumer> _logger;

    public OrderCompletedConsumer(ElementDbContext context, ILogger<OrderCompletedConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCompletedEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Confirming permanent stock deduction for Order: {OrderId}, Element: {Element}, Qty: {Quantity}",
            message.OrderId, message.ElementSymbol, message.Quantity);

        var reservation = await _context.StockReservations.FindAsync(message.OrderId);
        if (reservation is not null && reservation.Status == "Fulfilled")
        {
            _logger.LogInformation("Idempotent completion for Order {OrderId}", message.OrderId);
            return;
        }

        var element = await _context.ChemicalElements
            .FirstOrDefaultAsync(e => e.Symbol.ToLower() == message.ElementSymbol.ToLower());

        if (element != null)
        {
            element.StockWeightGrams = Math.Max(0, element.StockWeightGrams - message.Quantity);
            element.ReservedWeightGrams = Math.Max(0, element.ReservedWeightGrams - message.Quantity);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Stock permanently deducted for completed Order: {OrderId}", message.OrderId);
        }
        else
        {
            _logger.LogWarning("Element {Symbol} not found for permanent stock deduction.", message.ElementSymbol);
        }

        if (reservation is not null)
        {
            reservation.Status = "Fulfilled";
            await _context.SaveChangesAsync();
        }
    }
}
