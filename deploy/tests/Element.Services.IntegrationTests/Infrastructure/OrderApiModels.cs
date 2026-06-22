namespace Element.Services.IntegrationTests.Infrastructure;

public record CreateOrderRequest(string ElementSymbol, decimal Quantity);

public record OrderApiResponse(
    Guid Id,
    Guid CustomerId,
    string ElementSymbol,
    decimal Quantity,
    decimal TotalPrice,
    string Status,
    DateTime CreatedAt);
