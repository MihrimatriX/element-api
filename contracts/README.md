# contracts

Diller arası entegrasyon sözleşmeleri (RabbitMQ + MassTransit uyumlu JSON).

## Message URN

| Tip | URN |
|-----|-----|
| OrderSubmittedEvent | `urn:message:Element.Shared.Events:OrderSubmittedEvent` |
| StockReservedEvent | `urn:message:Element.Shared.Events:StockReservedEvent` |
| StockReservationFailedEvent | `urn:message:Element.Shared.Events:StockReservationFailedEvent` |
| ProcessPaymentCommand | `urn:message:Element.Shared.Events:ProcessPaymentCommand` |
| PaymentProcessedEvent | `urn:message:Element.Shared.Events:PaymentProcessedEvent` |
| PaymentFailedEvent | `urn:message:Element.Shared.Events:PaymentFailedEvent` |
| ShipmentRequestedEvent | `urn:message:Element.Shared.Events:ShipmentRequestedEvent` |
| ShipmentDispatchedEvent | `urn:message:Element.Shared.Events:ShipmentDispatchedEvent` |
| ShipmentFailedEvent | `urn:message:Element.Shared.Events:ShipmentFailedEvent` |
| UpdateOrderStatusEvent | `urn:message:Element.Shared.Events:UpdateOrderStatusEvent` |
| OrderStockReleaseEvent | `urn:message:Element.Shared.Events:OrderStockReleaseEvent` |
| OrderCompletedEvent | `urn:message:Element.Shared.Events:OrderCompletedEvent` |

## Exchange (fanout)

`Element.Shared.Events:{MessageName}`

## Kuyruklar

| Kuyruk | Servis | Amaç |
|--------|--------|------|
| `payment-processing` | payment-service | Ödeme komutu |
| `order-service-saga` | order-service | Saga event’leri |

## Envelope örneği

```json
{
  "messageId": "uuid",
  "conversationId": "uuid",
  "messageType": ["urn:message:Element.Shared.Events:ProcessPaymentCommand"],
  "message": { "orderId": "...", "amount": 100.5 }
}
```

Örnek payload dosyaları: `messages/` klasörü

| Dosya | Mesaj |
|-------|-------|
| `process-payment-command.json` | ProcessPaymentCommand |
| `order-submitted-event.json` | OrderSubmittedEvent |
| `stock-reserved-event.json` | StockReservedEvent |
| `stock-reservation-failed-event.json` | StockReservationFailedEvent |
| `payment-processed-event.json` | PaymentProcessedEvent |
| `payment-failed-event.json` | PaymentFailedEvent |
| `update-order-status-event.json` | UpdateOrderStatusEvent |
| `order-completed-event.json` | OrderCompletedEvent |
| `order-stock-release-event.json` | OrderStockReleaseEvent |
| `shipment-requested-event.json` | ShipmentRequestedEvent |
| `shipment-dispatched-event.json` | ShipmentDispatchedEvent |
| `shipment-failed-event.json` | ShipmentFailedEvent |
| `element-price-changed-event.json` | ElementPriceChangedIntegrationEvent |

## .NET kaynak tipleri

`shared-lib/Events/` — tek kaynak gerçeği (.NET tarafı).
