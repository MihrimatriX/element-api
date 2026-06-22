using System;
using System.Threading.Tasks;
using Element.Services.Shipment.Core.Entities;
using Element.Services.Shipment.Infrastructure.Data;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Element.Services.Shipment.Infrastructure.Consumers;

public class ShipmentRequestedConsumer : IConsumer<ShipmentRequestedEvent>
{
    private readonly ShipmentDbContext _context;
    private readonly ILogger<ShipmentRequestedConsumer> _logger;
    private readonly decimal _failQuantityGte;

    public ShipmentRequestedConsumer(
        ShipmentDbContext context,
        ILogger<ShipmentRequestedConsumer> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _failQuantityGte = configuration.GetValue("Shipment:FailQuantityGte", 100m);
    }

    public async Task Consume(ConsumeContext<ShipmentRequestedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Processing shipment for Order {OrderId}", msg.OrderId);

        var existing = await _context.Shipments.FirstOrDefaultAsync(s => s.OrderId == msg.OrderId);
        if (existing is not null)
        {
            if (existing.Status == "Shipped" && !string.IsNullOrEmpty(existing.TrackingNumber))
            {
                _logger.LogInformation("Idempotent shipment for Order {OrderId}", msg.OrderId);
                await context.Publish(new ShipmentDispatchedEvent(msg.OrderId, existing.TrackingNumber!));
            }
            else if (existing.Status == "Failed")
            {
                await context.Publish(new ShipmentFailedEvent(msg.OrderId, "Shipment previously failed"));
            }
            return;
        }

        if (msg.Quantity >= _failQuantityGte)
        {
            var reason = $"Shipment rejected: quantity {msg.Quantity}g exceeds carrier limit ({_failQuantityGte}g).";
            _context.Shipments.Add(new Core.Entities.Shipment
            {
                Id = Guid.NewGuid(),
                OrderId = msg.OrderId,
                CustomerId = msg.CustomerId,
                ElementSymbol = msg.ElementSymbol,
                Quantity = msg.Quantity,
                Status = "Failed",
                TrackingNumber = null,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            _logger.LogWarning("Shipment failed for Order {OrderId}: {Reason}", msg.OrderId, reason);
            await context.Publish(new ShipmentFailedEvent(msg.OrderId, reason));
            return;
        }

        var shipment = new Core.Entities.Shipment
        {
            Id = Guid.NewGuid(),
            OrderId = msg.OrderId,
            CustomerId = msg.CustomerId,
            ElementSymbol = msg.ElementSymbol,
            Quantity = msg.Quantity,
            Status = "Shipped",
            TrackingNumber = $"TRK-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            CreatedAt = DateTime.UtcNow,
            DispatchedAt = DateTime.UtcNow
        };

        _context.Shipments.Add(shipment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Shipment dispatched. Tracking: {TrackingNumber}", shipment.TrackingNumber);
        await context.Publish(new ShipmentDispatchedEvent(msg.OrderId, shipment.TrackingNumber));
    }
}
