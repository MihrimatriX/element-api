using System;

namespace Element.Shared.Events;

public record ShipmentFailedEvent(
    Guid OrderId,
    string Reason
);
