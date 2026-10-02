namespace Element.Shared.Events;

// Message contracts shared by the .NET, Node (order-service) and Java (wallet/inventory) services.
// The type names and the "Element.Shared.Events" namespace form the MassTransit message URN:
// renaming a type or a property silently breaks the other languages.

/// <summary>Published by order-service when a new order is placed; starts the order saga.</summary>
public record OrderSubmittedEvent(
    Guid OrderId,
    Guid CustomerId,
    string ElementSymbol,
    decimal Quantity,
    decimal TotalPrice
);

/// <summary>Stock for the order was reserved successfully.</summary>
public record StockReservedEvent(
    Guid OrderId
);

/// <summary>Stock could not be reserved for the order (for example, not enough stock).</summary>
public record StockReservationFailedEvent(
    Guid OrderId,
    string Reason
);

/// <summary>Asks the wallet to debit credits once stock is reserved.</summary>
public record PaymentRequestedEvent(
    Guid OrderId,
    Guid CustomerId,
    decimal Amount,
    string ElementSymbol,
    decimal Quantity
);

/// <summary>The wallet debited the payment successfully.</summary>
public record PaymentProcessedEvent(
    Guid OrderId
);

/// <summary>The payment failed (for example, insufficient balance).</summary>
public record PaymentFailedEvent(
    Guid OrderId,
    string Reason
);

/// <summary>Refunds credits that were already debited after an order is cancelled or times out.</summary>
public record PaymentRefundRequestedEvent(
    Guid OrderId,
    Guid CustomerId,
    string? ElementSymbol = null,
    decimal? Quantity = null
);

/// <summary>Writes the purchased grams into the customer's holdings once the shipment is complete.</summary>
public record AssetsCreditedEvent(
    Guid OrderId,
    Guid CustomerId,
    string ElementSymbol,
    decimal Quantity,
    decimal TotalPrice,
    string CompoundSlug,
    string? ProductLabel = null
);

/// <summary>Releases reserved stock when an order is cancelled or fails.</summary>
public record OrderStockReleaseEvent(
    Guid OrderId,
    string ElementSymbol,
    decimal Quantity
);

/// <summary>Published when an element's market price changes.</summary>
public record ElementPriceChangedIntegrationEvent(
    string ElementSymbol,
    decimal NewPrice,
    DateTime ChangedAt
);

/// <summary>Permanently deducts the reserved stock once an order completes successfully.</summary>
public record OrderCompletedEvent(
    Guid OrderId,
    string ElementSymbol,
    decimal Quantity
);

/// <summary>Carries the saga's new order status (and optional error / tracking number) to listeners such as notification-service.</summary>
public record UpdateOrderStatusEvent(
    Guid OrderId,
    string Status,
    string? ErrorMessage = null,
    string? TrackingNumber = null,
    Guid? CustomerId = null
);

/// <summary>Desk sale: the vault is debited, the catalog returns the stock and the last price is pushed down.</summary>
public record ElementSoldEvent(
    string ElementSymbol,
    decimal Grams,
    Guid CustomerId
);
