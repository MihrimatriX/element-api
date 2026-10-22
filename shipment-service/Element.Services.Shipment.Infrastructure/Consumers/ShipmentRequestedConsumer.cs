using System.Security.Cryptography;
using Element.Services.Shipment.Infrastructure.Data;
using Element.Services.Shipment.Infrastructure.Entities;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Element.Services.Shipment.Infrastructure.Consumers;

/// <summary>
/// Simulated carrier: handles the order saga's ShipmentRequestedEvent by opening the order's shipment
/// (see <see cref="ShipmentRecord.Open"/>) and answering with ShipmentDispatchedEvent or ShipmentFailedEvent.
/// Runs inside MassTransit's EF Core inbox/outbox: the shipment row, the inbox row and the reply commit together.
/// </summary>
public class ShipmentRequestedConsumer : IConsumer<ShipmentRequestedEvent>
{
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
    /// Opens the order's shipment once and answers the saga. A repeated request (redelivery or a saga retry
    /// with a new message id) finds the stored shipment and gets the same answer again. Two copies racing
    /// each other: the unique index on OrderId rejects the loser's insert, its transaction (and reply) rolls
    /// back, and the message retry then takes the "already stored" path.
    /// </summary>
    public async Task Consume(ConsumeContext<ShipmentRequestedEvent> context)
    {
        var request = context.Message;
        _logger.LogInformation("Processing shipment for Order {OrderId}", request.OrderId);

        var shipment = await _context.Shipments.AsNoTracking()
            .FirstOrDefaultAsync(s => s.OrderId == request.OrderId, context.CancellationToken);
        var repeated = shipment is not null;
        if (shipment is null)
        {
            shipment = ShipmentRecord.Open(request.OrderId, request.CustomerId, request.ElementSymbol, request.Quantity,
                _failQuantityGte, GenerateTrackingNumber(), DateTime.UtcNow);
            _context.Shipments.Add(shipment);
            await _context.SaveChangesAsync(context.CancellationToken);
        }

        if (shipment.IsShipped)
        {
            _logger.LogInformation("Shipment for Order {OrderId} dispatched ({Repeated}). Tracking: {TrackingNumber}",
                request.OrderId, repeated ? "repeat" : "new", shipment.TrackingNumber);
            await context.Publish(new ShipmentDispatchedEvent(request.OrderId, shipment.TrackingNumber!));
            return;
        }

        var reason = repeated
            ? "Shipment previously failed"
            : $"Shipment rejected: quantity {request.Quantity}g exceeds carrier limit ({_failQuantityGte}g).";
        _logger.LogWarning("Shipment failed for Order {OrderId}: {Reason}", request.OrderId, reason);
        await context.Publish(new ShipmentFailedEvent(request.OrderId, reason));
    }

    /// <summary>Builds a tracking number such as "TRK-0123456789ABCDEF" (16 uppercase hex digits).</summary>
    private static string GenerateTrackingNumber()
    {
        var randomPart = Convert.ToHexString(RandomNumberGenerator.GetBytes(TrackingNumberRandomBytes));
        return TrackingNumberPrefix + randomPart;
    }
}
