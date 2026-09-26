/** Pure saga acceptance matrix — keep in sync with orchestrator switch. */
export type SagaStatus =
  | "Submitted"
  | "StockReserved"
  | "Shipping"
  | "Completed"
  | "Failed";

/** Whether the orchestrator applies a state-changing branch for this pair. */
export function sagaAccepts(status: string, eventType: string): boolean {
  switch (eventType) {
    case "StockReservedEvent":
      return status === "Submitted" || status === "Failed";
    case "StockReservationFailedEvent":
      return status === "Submitted";
    case "PaymentProcessedEvent":
    case "PaymentFailedEvent":
      return status === "StockReserved";
    case "ShipmentDispatchedEvent":
    case "ShipmentFailedEvent":
      return status === "Shipping";
    default:
      return false;
  }
}

/** Primary next status after a handled event (null = ignore / no transition). */
export function sagaNextStatus(
  status: string,
  eventType: string,
): SagaStatus | null {
  if (status === "Submitted" && eventType === "StockReservedEvent")
    return "StockReserved";
  if (status === "Submitted" && eventType === "StockReservationFailedEvent")
    return "Failed";
  if (status === "StockReserved" && eventType === "PaymentProcessedEvent")
    return "Shipping";
  if (status === "StockReserved" && eventType === "PaymentFailedEvent")
    return "Failed";
  if (status === "Shipping" && eventType === "ShipmentDispatchedEvent")
    return "Completed";
  if (status === "Shipping" && eventType === "ShipmentFailedEvent")
    return "Failed";
  return null;
}
