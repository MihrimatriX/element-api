namespace Element.Shared.Events;

/// <summary>Asks shipment-service to dispatch a paid order.</summary>
public record ShipmentRequestedEvent(
    Guid OrderId,
    string CustomerId,
    string ElementSymbol,
    decimal Quantity
);

/// <summary>The order left the warehouse; carries the tracking number.</summary>
public record ShipmentDispatchedEvent(
    Guid OrderId,
    string TrackingNumber
);

/// <summary>The shipment could not be created; the saga compensates the order.</summary>
public record ShipmentFailedEvent(
    Guid OrderId,
    string Reason
);
