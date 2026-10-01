using System.Security.Cryptography;
using Element.Services.Shipment.Infrastructure.Data;
using Element.Services.Shipment.Infrastructure.Entities;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Element.Services.Shipment.Infrastructure.Consumers;

/// <summary>
/// Simulated carrier: handles the order saga's ShipmentRequestedEvent by storing a shipment record
/// and answering with ShipmentDispatchedEvent (tracking number) or ShipmentFailedEvent (carrier limit).
/// </summary>
public class ShipmentRequestedConsumer : IConsumer<ShipmentRequestedEvent>
{
    private const string ShippedStatus = "Shipped";
    private const string FailedStatus = "Failed";
    private const string TrackingNumberPrefix = "TRK-";

    /// <summary>64 random bits: not guessable, and collisions stay negligible as the table grows.</summary>
    private const int TrackingNumberRandomBytes = 8;

    private readonly ShipmentDbContext _context;
    private readonly ILogger<ShipmentRequestedConsumer> _logger;

    /// <summary>Orders with at least this many grams are rejected; 0 (the default) disables the limit.</summary>
    private readonly decimal _failQuantityGte;

    /// <summary>Creates the consumer and reads the optional carrier limit from "Shipment:FailQuantityGte".</summary>
    public ShipmentRequestedConsumer(
        ShipmentDbContext context,
        ILogger<ShipmentRequestedConsumer> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _failQuantityGte = configuration.GetValue("Shipment:FailQuantityGte", 0m);
    }

    /// <summary>
    /// Ships the order once: a redelivered (or concurrently duplicated) request republishes the stored outcome,
    /// an over-limit request is stored and reported as failed, anything else is dispatched.
    /// </summary>
    public async Task Consume(ConsumeContext<ShipmentRequestedEvent> context)
    {
        var request = context.Message;
        _logger.LogInformation("Processing shipment for Order {OrderId}", request.OrderId);

        if (await RepublishExistingAsync(context))
        {
            return;
        }

        if (ExceedsCarrierLimit(request.Quantity))
        {
            await RejectShipmentAsync(context);
            return;
        }

        await DispatchShipmentAsync(context);
    }

    /// <summary>
    /// Redelivery: answers with the outcome already recorded for this order, so the saga still gets its reply.
    /// Returns false when no record exists yet.
    /// </summary>
    private async Task<bool> RepublishExistingAsync(ConsumeContext<ShipmentRequestedEvent> context)
    {
        var orderId = context.Message.OrderId;
        var existingShipment = await _context.Shipments.AsNoTracking().FirstOrDefaultAsync(s => s.OrderId == orderId);
        if (existingShipment is null)
        {
            return false;
        }

        if (existingShipment.Status == ShippedStatus && !string.IsNullOrEmpty(existingShipment.TrackingNumber))
        {
            _logger.LogInformation("Idempotent shipment for Order {OrderId}", orderId);
            await context.Publish(new ShipmentDispatchedEvent(orderId, existingShipment.TrackingNumber));
        }
        else if (existingShipment.Status == FailedStatus)
        {
            await context.Publish(new ShipmentFailedEvent(orderId, "Shipment previously failed"));
        }

        return true;
    }

    private bool ExceedsCarrierLimit(decimal quantity)
    {
        var limitEnabled = _failQuantityGte > 0;
        return limitEnabled && quantity >= _failQuantityGte;
    }

    /// <summary>Stores a failed shipment (no tracking number) and tells the saga why it failed.</summary>
    private async Task RejectShipmentAsync(ConsumeContext<ShipmentRequestedEvent> context)
    {
        var request = context.Message;
        var reason = $"Shipment rejected: quantity {request.Quantity}g exceeds carrier limit ({_failQuantityGte}g).";

        _context.Shipments.Add(CreateShipmentRecord(request, FailedStatus));
        if (!await TrySaveAsync(context))
        {
            return;
        }

        _logger.LogWarning("Shipment failed for Order {OrderId}: {Reason}", request.OrderId, reason);
        await context.Publish(new ShipmentFailedEvent(request.OrderId, reason));
    }

    /// <summary>Stores a shipped record with a fresh tracking number and tells the saga it was dispatched.</summary>
    private async Task DispatchShipmentAsync(ConsumeContext<ShipmentRequestedEvent> context)
    {
        var request = context.Message;
        var trackingNumber = GenerateTrackingNumber();

        var shipment = CreateShipmentRecord(request, ShippedStatus);
        shipment.TrackingNumber = trackingNumber;
        shipment.DispatchedAt = shipment.CreatedAt;

        _context.Shipments.Add(shipment);
        if (!await TrySaveAsync(context))
        {
            return;
        }

        _logger.LogInformation("Shipment dispatched. Tracking: {TrackingNumber}", trackingNumber);
        await context.Publish(new ShipmentDispatchedEvent(request.OrderId, trackingNumber));
    }

    /// <summary>
    /// Saves the new record. A concurrent duplicate of the same request makes the unique index on OrderId
    /// reject our insert: the other delivery's row stands and we answer as a redelivery.
    /// Returns false if that happened (the caller must not publish again).
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
            {
                throw;
            }

            return false;
        }
    }

    private static ShipmentRecord CreateShipmentRecord(ShipmentRequestedEvent request, string status)
    {
        return new ShipmentRecord
        {
            Id = Guid.NewGuid(),
            OrderId = request.OrderId,
            CustomerId = request.CustomerId,
            ElementSymbol = request.ElementSymbol,
            Quantity = request.Quantity,
            Status = status,
            TrackingNumber = null,
            CreatedAt = DateTime.UtcNow,
        };
    }

    /// <summary>Builds a tracking number such as "TRK-0123456789ABCDEF" (16 uppercase hex digits).</summary>
    private static string GenerateTrackingNumber()
    {
        var randomPart = Convert.ToHexString(RandomNumberGenerator.GetBytes(TrackingNumberRandomBytes));
        return TrackingNumberPrefix + randomPart;
    }
}
