using System;

namespace Element.Shared.Events;

public record ShipmentRequestedEvent(
    Guid OrderId,
    string CustomerId,
    string ElementSymbol,
    decimal Quantity
);
