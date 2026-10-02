/**
 * The saga transition matrix as pure functions, used by tests to pin down the rules.
 * Keep in sync with the switch in orchestrator.ts.
 */
export type SagaStatus =
  | "Submitted"
  | "StockReserved"
  | "Shipping"
  | "Completed"
  | "Failed";

/** Whether the orchestrator does anything for this (status, event) pair; every other pair is ignored. */
export function sagaAccepts(status: string, eventType: string): boolean {
  switch (eventType) {
    case "StockReservedEvent":
      // From Failed, a late reservation is answered with a stock release.
      return status === "Submitted" || status === "Failed";
    case "StockReservationFailedEvent":
      return status === "Submitted";
    case "PaymentProcessedEvent":
      // Failed: late debit → compensating refund (no status change).
      return status === "StockReserved" || status === "Failed";
    case "PaymentFailedEvent":
      return status === "StockReserved";
    case "ShipmentDispatchedEvent":
    case "ShipmentFailedEvent":
      return status === "Shipping";
    default:
      return false;
  }
}

/** Main next status after an event, or null when the event causes no transition. */
export function sagaNextStatus(
  status: string,
  eventType: string,
): SagaStatus | null {
  if (status === "Submitted" && eventType === "StockReservedEvent") {
    return "StockReserved";
  }
  if (status === "Submitted" && eventType === "StockReservationFailedEvent") {
    return "Failed";
  }
  if (status === "StockReserved" && eventType === "PaymentProcessedEvent") {
    return "Shipping";
  }
  if (status === "StockReserved" && eventType === "PaymentFailedEvent") {
    return "Failed";
  }
  if (status === "Shipping" && eventType === "ShipmentDispatchedEvent") {
    return "Completed";
  }
  if (status === "Shipping" && eventType === "ShipmentFailedEvent") {
    return "Failed";
  }
  return null;
}
