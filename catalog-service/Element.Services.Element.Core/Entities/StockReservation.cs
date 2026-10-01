namespace Element.Services.Element.Core.Entities;

/// <summary>
/// Per-order marker row keyed by order id. It records stock held for an order and also
/// serves as the idempotency marker for price nudges, so a replayed message is ignored.
/// </summary>
public class StockReservation
{
    public Guid OrderId { get; set; }
    public string ElementSymbol { get; set; } = string.Empty;
    public decimal Quantity { get; set; }

    /// <summary>One of the <see cref="StockReservationStatus"/> values.</summary>
    public string Status { get; set; } = StockReservationStatus.Reserved;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Status values stored in <see cref="StockReservation.Status"/> (the database keeps them as plain text).</summary>
public static class StockReservationStatus
{
    /// <summary>Grams are held for an open order.</summary>
    public const string Reserved = "Reserved";

    /// <summary>The order was cancelled and the held grams were given back.</summary>
    public const string Released = "Released";

    /// <summary>The order shipped and the grams left the stock.</summary>
    public const string Fulfilled = "Fulfilled";

    /// <summary>The price was already nudged up for this completed order.</summary>
    public const string Priced = "Priced";

    /// <summary>The price was already nudged down for this desk sale.</summary>
    public const string SoldPriced = "SoldPriced";
}
