using System;

namespace Element.Shared.Events;

public record ShipmentRequestedEvent(
    Guid OrderId,
    string CustomerId,
    string ElementSymbol,
    decimal Quantity
);

public record ShipmentDispatchedEvent(
    Guid OrderId,
    string TrackingNumber
);

public record ShipmentFailedEvent(
    Guid OrderId,
    string Reason
);
