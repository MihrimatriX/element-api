using System;

namespace Element.Shared.Events;

/// <summary>
/// Sipariş oluşturma talebi fırlatıldığında yayınlanan event.
/// </summary>
public record OrderSubmittedEvent(
    Guid OrderId,
    Guid CustomerId,
    string ElementSymbol,
    decimal Quantity,
    decimal TotalPrice
);

/// <summary>
/// Element servisinin stok ayırma işleminin başarılı olduğunu bildiren event.
/// </summary>
public record StockReservedEvent(
    Guid OrderId
);

/// <summary>
/// Element servisinin stok ayırma işleminin başarısız olduğunu (stok yetersiz vb.) bildiren event.
/// </summary>
public record StockReservationFailedEvent(
    Guid OrderId,
    string Reason
);

/// <summary>
/// Stok ayrıldıktan sonra cüzdanın KREDI düşmesi için yayınlanan istek.
/// </summary>
public record PaymentRequestedEvent(
    Guid OrderId,
    Guid CustomerId,
    decimal Amount,
    string ElementSymbol,
    decimal Quantity
);

/// <summary>
/// Ödeme servisinin ödemeyi başarıyla aldığını bildiren event.
/// </summary>
public record PaymentProcessedEvent(
    Guid OrderId
);

/// <summary>
/// Ödeme işleminin başarısız olduğunu (bakiye yetersiz vb.) bildiren event.
/// </summary>
public record PaymentFailedEvent(
    Guid OrderId,
    string Reason
);

/// <summary>
/// Sipariş iptal/timeout sonrası daha önce düşülmüş KREDI iadesi.
/// </summary>
public record PaymentRefundRequestedEvent(
    Guid OrderId,
    Guid CustomerId,
    string? ElementSymbol = null,
    decimal? Quantity = null
);

/// <summary>
/// Sevkiyat tamamlanınca holdings’e gram yazılması.
/// </summary>
public record AssetsCreditedEvent(
    Guid OrderId,
    Guid CustomerId,
    string ElementSymbol,
    decimal Quantity,
    decimal TotalPrice,
    string CompoundSlug,
    string? ProductLabel = null
);

/// <summary>
/// Sipariş iptal edildiğinde veya başarısız olduğunda ayrılan stoğun geri bırakılması için fırlatılan event.
/// </summary>
public record OrderStockReleaseEvent(
    Guid OrderId,
    string ElementSymbol,
    decimal Quantity
);

/// <summary>
/// Element piyasa fiyatı değiştiğinde yayınlanan entegrasyon event'i.
/// </summary>
public record ElementPriceChangedIntegrationEvent(
    string ElementSymbol,
    decimal NewPrice,
    DateTime ChangedAt
);

/// <summary>
/// Sipariş başarıyla tamamlandığında stoğu kalıcı olarak düşürmek için yayınlanan event.
/// </summary>
public record OrderCompletedEvent(
    Guid OrderId,
    string ElementSymbol,
    decimal Quantity
);

/// <summary>
/// Saga durum makinesinin Sipariş tablosundaki statüyü güncellemesi için yayınlanan event.
/// </summary>
public record UpdateOrderStatusEvent(
    Guid OrderId,
    string Status,
    string? ErrorMessage = null,
    string? TrackingNumber = null,
    Guid? CustomerId = null
);

/// <summary>
/// Desk satışı: kasa düşer, katalog stok iade eder, last aşağı iter.
/// </summary>
public record ElementSoldEvent(
    string ElementSymbol,
    decimal Grams,
    Guid CustomerId
);
