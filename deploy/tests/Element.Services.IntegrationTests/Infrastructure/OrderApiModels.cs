namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>Body of POST /api/v1/orders as the order-service expects it.</summary>
public record CreateOrderRequest(string ElementSymbol, decimal Quantity);

/// <summary>The order fields the tests read back from the order-service API.</summary>
public record OrderApiResponse(
    Guid Id,
    Guid CustomerId,
    string ElementSymbol,
    decimal Quantity,
    decimal TotalPrice,
    string Status,
    DateTime CreatedAt);
