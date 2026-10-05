namespace Element.Services.Shipment.Infrastructure.Entities;

/// <summary>
/// One simulated shipment for one order. Written by the shipment consumer and
/// returned as-is by the shipment API, so property names are part of the JSON contract.
/// </summary>
public class ShipmentRecord
{
    public Guid Id { get; set; }

    /// <summary>The order this shipment belongs to; unique, so an order has at most one shipment.</summary>
    public Guid OrderId { get; set; }

    public string CustomerId { get; set; } = null!;

    public string ElementSymbol { get; set; } = null!;

    /// <summary>Ordered amount in grams.</summary>
    public decimal Quantity { get; set; }

    /// <summary>"Shipped" or "Failed" once the consumer has handled the order.</summary>
    public string Status { get; set; } = "Pending";

    /// <summary>"TRK-" + 16 uppercase hex digits for shipped orders; null for failed ones.</summary>
    public string? TrackingNumber { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? DispatchedAt { get; set; }
}
