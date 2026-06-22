using System;

namespace Element.Services.Shipment.Core.Entities;

public class Shipment
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string CustomerId { get; set; } = null!;
    public string ElementSymbol { get; set; } = null!;
    public decimal Quantity { get; set; }
    public string Status { get; set; } = "Pending";
    public string? TrackingNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DispatchedAt { get; set; }
}
