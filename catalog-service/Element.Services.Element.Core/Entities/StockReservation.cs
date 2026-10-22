namespace Element.Services.Element.Core.Entities;

/// <summary>
/// Per-order marker row keyed by order id (or, for a desk sale, the broker message id).
/// It makes a price nudge happen at most once per completed order or sale: a replayed message,
/// or the saga sending the same order again under a new message id, finds the marker and is ignored.
/// The name and the Reserved/Released/Fulfilled values date from when this service also held stock.
/// </summary>
public class StockReservation
{
    /// <summary>For EF Core; new markers come from <see cref="ForCompletedOrder"/> or <see cref="ForDeskSale"/>.</summary>
    private StockReservation()
    {
    }

    public Guid OrderId { get; private set; }
    public string ElementSymbol { get; private set; } = string.Empty;
    public decimal Quantity { get; private set; }

    /// <summary>One of the <see cref="StockReservationStatus"/> values.</summary>
    public string Status { get; private set; } = string.Empty;

    public DateTime CreatedAt { get; private set; }

    /// <summary>True once the price was moved for this order or sale (a legacy Fulfilled order counts too).</summary>
    public bool IsPriced => Status is StockReservationStatus.Priced
        or StockReservationStatus.SoldPriced
        or StockReservationStatus.Fulfilled;

    /// <summary>Marker for a completed order whose buy pressure has just moved the price.</summary>
    public static StockReservation ForCompletedOrder(Guid orderId, string symbol, decimal quantity, DateTime now) =>
        Create(orderId, symbol, quantity, StockReservationStatus.Priced, now);

    /// <summary>Marker for a desk sale whose sell pressure has just moved the price.</summary>
    public static StockReservation ForDeskSale(Guid saleId, string symbol, decimal grams, DateTime now) =>
        Create(saleId, symbol, grams, StockReservationStatus.SoldPriced, now);

    /// <summary>Marks a legacy (Reserved/Released) row as priced; a second nudge for the same order is a bug.</summary>
    public void MarkPriced()
    {
        if (IsPriced)
        {
            throw new InvalidOperationException($"The price was already moved for order {OrderId}.");
        }

        Status = StockReservationStatus.Priced;
    }

    private static StockReservation Create(Guid id, string symbol, decimal quantity, string status, DateTime now)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(quantity);
        return new StockReservation
        {
            OrderId = id,
            ElementSymbol = symbol,
            Quantity = quantity,
            Status = status,
            CreatedAt = now,
        };
    }
}

/// <summary>Status values stored in <see cref="StockReservation.Status"/> (the database keeps them as plain text).</summary>
public static class StockReservationStatus
{
    /// <summary>Legacy: grams were held for an open order.</summary>
    public const string Reserved = "Reserved";

    /// <summary>Legacy: the order was cancelled and the held grams were given back.</summary>
    public const string Released = "Released";

    /// <summary>Legacy: the order shipped and the grams left the stock.</summary>
    public const string Fulfilled = "Fulfilled";

    /// <summary>The price was already nudged up for this completed order.</summary>
    public const string Priced = "Priced";

    /// <summary>The price was already nudged down for this desk sale.</summary>
    public const string SoldPriced = "SoldPriced";
}
