using System;

namespace Element.Services.Element.Core.Entities;

public class ElementPriceHistory
{
    public Guid Id { get; set; }
    public string ElementSymbol { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime Timestamp { get; set; }
}
