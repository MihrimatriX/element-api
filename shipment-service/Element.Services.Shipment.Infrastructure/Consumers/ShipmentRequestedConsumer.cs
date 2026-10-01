using System;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Element.Services.Shipment.Infrastructure.Entities;
using Element.Services.Shipment.Infrastructure.Data;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

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
        _failQuantityGte = configuration.GetValue("Shipment:FailQuantityGte", 0m);
    }

    public async Task Consume(ConsumeContext<ShipmentRequestedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Processing shipment for Order {OrderId}", msg.OrderId);

        if (await RepublishExistingAsync(context))
            return;

        if (_failQuantityGte > 0 && msg.Quantity >= _failQuantityGte)
        {
            var reason = $"Shipment rejected: quantity {msg.Quantity}g exceeds carrier limit ({_failQuantityGte}g).";
            _context.Shipments.Add(new ShipmentRecord
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
            if (!await TrySaveAsync(context))
                return;
            _logger.LogWarning("Shipment failed for Order {OrderId}: {Reason}", msg.OrderId, reason);
            await context.Publish(new ShipmentFailedEvent(msg.OrderId, reason));
            return;
        }

        var shipment = new ShipmentRecord
        {
            Id = Guid.NewGuid(),
            OrderId = msg.OrderId,
            CustomerId = msg.CustomerId,
            ElementSymbol = msg.ElementSymbol,
            Quantity = msg.Quantity,
            Status = "Shipped",
            // 64 random bits: not guessable, and collisions stay negligible as the table grows.
            TrackingNumber = $"TRK-{Convert.ToHexString(RandomNumberGenerator.GetBytes(8))}",
            CreatedAt = DateTime.UtcNow,
            DispatchedAt = DateTime.UtcNow
        };

        _context.Shipments.Add(shipment);
        if (!await TrySaveAsync(context))
            return;

        _logger.LogInformation("Shipment dispatched. Tracking: {TrackingNumber}", shipment.TrackingNumber);
        await context.Publish(new ShipmentDispatchedEvent(msg.OrderId, shipment.TrackingNumber));
    }

    /// <summary>Redelivery: answer with the outcome already recorded for this order. False if none.</summary>
    private async Task<bool> RepublishExistingAsync(ConsumeContext<ShipmentRequestedEvent> context)
    {
        var orderId = context.Message.OrderId;
        var existing = await _context.Shipments.AsNoTracking().FirstOrDefaultAsync(s => s.OrderId == orderId);
        if (existing is null)
            return false;

        if (existing.Status == "Shipped" && !string.IsNullOrEmpty(existing.TrackingNumber))
        {
            _logger.LogInformation("Idempotent shipment for Order {OrderId}", orderId);
            await context.Publish(new ShipmentDispatchedEvent(orderId, existing.TrackingNumber!));
        }
        else if (existing.Status == "Failed")
        {
            await context.Publish(new ShipmentFailedEvent(orderId, "Shipment previously failed"));
        }
        return true;
    }

    /// <summary>
    /// Concurrent duplicate of the same request: the unique index on OrderId rejects our insert,
    /// so the other delivery's row stands and we answer as a redelivery. False if that happened.
    /// </summary>
    private async Task<bool> TrySaveAsync(ConsumeContext<ShipmentRequestedEvent> context)
    {
        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            _context.ChangeTracker.Clear();
            if (!await RepublishExistingAsync(context))
                throw;
            return false;
        }
    }
}
