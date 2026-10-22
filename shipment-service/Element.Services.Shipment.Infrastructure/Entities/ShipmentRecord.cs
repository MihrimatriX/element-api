namespace Element.Services.Shipment.Infrastructure.Entities;

/// <summary>
/// One simulated shipment for one order (the aggregate of this service). It is created once by
/// <see cref="Open"/> in its final state, Shipped or Failed, and never changes afterwards; a redelivered
/// request only reads it back. Returned as-is by the shipment API, so property names are part of the JSON contract.
/// </summary>
public class ShipmentRecord
{
    public const string ShippedStatus = "Shipped";
    public const string FailedStatus = "Failed";

    /// <summary>For EF Core; new shipments come from <see cref="Open"/>.</summary>
    private ShipmentRecord()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The order this shipment belongs to; unique, so an order has at most one shipment.</summary>
    public Guid OrderId { get; private set; }

    public string CustomerId { get; private set; } = null!;

    public string ElementSymbol { get; private set; } = null!;

    /// <summary>Ordered amount in grams.</summary>
    public decimal Quantity { get; private set; }

    /// <summary><see cref="ShippedStatus"/> or <see cref="FailedStatus"/>.</summary>
    public string Status { get; private set; } = null!;

    /// <summary>"TRK-" + 16 uppercase hex digits for shipped orders; null for failed ones.</summary>
    public string? TrackingNumber { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? DispatchedAt { get; private set; }

    /// <summary>True when the order left the warehouse (and so has a tracking number).</summary>
    public bool IsShipped => Status == ShippedStatus;

    /// <summary>Carrier limit rule: orders of at least <paramref name="limitGrams"/> are refused; 0 or less means no limit.</summary>
    public static bool ExceedsCarrierLimit(decimal quantity, decimal limitGrams) =>
        limitGrams > 0 && quantity >= limitGrams;

    /// <summary>
    /// Opens the shipment for an order: Failed (no tracking number) when the carrier limit refuses it,
    /// otherwise Shipped with <paramref name="trackingNumber"/> and dispatched at <paramref name="now"/>.
    /// </summary>
    public static ShipmentRecord Open(
        Guid orderId,
        string customerId,
        string elementSymbol,
        decimal quantity,
        decimal carrierLimitGrams,
        string trackingNumber,
        DateTime now)
    {
        var shipment = new ShipmentRecord
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            CustomerId = customerId,
            ElementSymbol = elementSymbol,
            Quantity = quantity,
            CreatedAt = now,
        };

        if (ExceedsCarrierLimit(quantity, carrierLimitGrams))
        {
            shipment.Status = FailedStatus;
            return shipment;
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(trackingNumber);
        shipment.Status = ShippedStatus;
        shipment.TrackingNumber = trackingNumber;
        shipment.DispatchedAt = now;
        return shipment;
    }
}
