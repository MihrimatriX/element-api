using System;

namespace Element.Services.Element.Core.Entities;

public class StockReservation
{
    public Guid OrderId { get; set; }
    public string ElementSymbol { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    /// <summary>Reserved, Released, Fulfilled</summary>
    public string Status { get; set; } = "Reserved";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
