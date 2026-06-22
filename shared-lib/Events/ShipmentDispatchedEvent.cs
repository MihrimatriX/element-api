using System;

namespace Element.Shared.Events;

public record ShipmentDispatchedEvent(
    Guid OrderId,
    string TrackingNumber
);
